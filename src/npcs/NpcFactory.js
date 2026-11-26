import * as THREE from 'three';

const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _euler = new THREE.Euler();
const _tmpColor = new THREE.Color();

/**
 * Renders ALL NPCs + blob shadows using only 5 InstancedMesh draw calls total,
 * keeping scene draw calls ultra-low even with many terminal travelers & customers.
 */
export class NpcFactory {
  constructor(scene, textures, maxNpcs = 10) {
    this.scene = scene;
    this.maxNpcs = maxNpcs;

    // 1. Heads (sphere/capsule feel)
    const headGeo = new THREE.BoxGeometry(0.32, 0.34, 0.32);
    const stdMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.headInst = new THREE.InstancedMesh(headGeo, stdMat, maxNpcs);

    // 2. Torsos
    const torsoGeo = new THREE.BoxGeometry(0.46, 0.62, 0.26);
    this.torsoInst = new THREE.InstancedMesh(torsoGeo, stdMat, maxNpcs);

    // 3. Hair / Beanie / Cap
    const hairGeo = new THREE.BoxGeometry(0.35, 0.14, 0.35);
    this.hairInst = new THREE.InstancedMesh(hairGeo, stdMat, maxNpcs);

    // 4. Limbs (2 arms + 2 legs per NPC = maxNpcs * 4), pivoted at top joint (shoulder/hip)!
    const limbGeo = new THREE.BoxGeometry(0.14, 0.56, 0.14);
    limbGeo.translate(0, -0.24, 0);
    this.limbInst = new THREE.InstancedMesh(limbGeo, stdMat, maxNpcs * 4);

    // 5. Blob Shadows (1 draw call for all NPC shadows)
    const shadowGeo = new THREE.PlaneGeometry(0.85, 0.85);
    shadowGeo.rotateX(-Math.PI * 0.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: textures.blobShadowTexture,
      transparent: true,
      depthWrite: false
    });
    this.shadowInst = new THREE.InstancedMesh(shadowGeo, shadowMat, maxNpcs);

    // Initialize all instances off-screen
    this.headInst.frustumCulled = false;
    this.torsoInst.frustumCulled = false;
    this.hairInst.frustumCulled = false;
    this.limbInst.frustumCulled = false;
    this.shadowInst.frustumCulled = false;

    for (let i = 0; i < maxNpcs; i++) {
      this._hideSlot(i);
    }
    this.flush();

    scene.add(this.headInst);
    scene.add(this.torsoInst);
    scene.add(this.hairInst);
    scene.add(this.limbInst);
    scene.add(this.shadowInst);
  }

  _hideSlot(i) {
    _pos.set(0, -30, 0);
    _quat.identity();
    _scale.set(0.0001, 0.0001, 0.0001);
    _mat.compose(_pos, _quat, _scale);
    this.headInst.setMatrixAt(i, _mat);
    this.torsoInst.setMatrixAt(i, _mat);
    this.hairInst.setMatrixAt(i, _mat);
    this.shadowInst.setMatrixAt(i, _mat);
    for (let k = 0; k < 4; k++) {
      this.limbInst.setMatrixAt(i * 4 + k, _mat);
    }
  }

  setNpcColors(slot, skinHex, jacketHex, pantsHex, hairHex) {
    _tmpColor.setHex(skinHex);
    this.headInst.setColorAt(slot, _tmpColor);
    _tmpColor.setHex(jacketHex);
    this.torsoInst.setColorAt(slot, _tmpColor);
    // Arms match jacket, legs match pants
    this.limbInst.setColorAt(slot * 4 + 0, _tmpColor);
    this.limbInst.setColorAt(slot * 4 + 1, _tmpColor);
    _tmpColor.setHex(pantsHex);
    this.limbInst.setColorAt(slot * 4 + 2, _tmpColor);
    this.limbInst.setColorAt(slot * 4 + 3, _tmpColor);
    _tmpColor.setHex(hairHex);
    this.hairInst.setColorAt(slot, _tmpColor);

    this.headInst.instanceColor.needsUpdate = true;
    this.torsoInst.instanceColor.needsUpdate = true;
    this.limbInst.instanceColor.needsUpdate = true;
    this.hairInst.instanceColor.needsUpdate = true;
  }

  updateNpcPose(slot, x, z, ry, walkCycle, speed, panicMode = false, gestureArm = 0) {
    const stride = speed > 0.1 ? Math.sin(walkCycle) * 0.55 : 0;
    const bounce = speed > 0.1 ? Math.abs(Math.cos(walkCycle)) * 0.04 : 0;
    const cosY = Math.cos(ry);
    const sinY = Math.sin(ry);

    // Torso
    _pos.set(x, 0.94 + bounce, z);
    _euler.set(panicMode ? 0.14 : 0, ry, 0, 'YXZ');
    _quat.setFromEuler(_euler);
    _scale.set(1, 1, 1);
    _mat.compose(_pos, _quat, _scale);
    this.torsoInst.setMatrixAt(slot, _mat);

    // Head
    _pos.set(x, 1.44 + bounce, z);
    _euler.set(panicMode ? -0.1 : 0, ry, 0, 'YXZ');
    _quat.setFromEuler(_euler);
    _mat.compose(_pos, _quat, _scale);
    this.headInst.setMatrixAt(slot, _mat);

    // Hair / Hat
    _pos.set(x, 1.62 + bounce, z);
    _mat.compose(_pos, _quat, _scale);
    this.hairInst.setMatrixAt(slot, _mat);

    // Shadow
    _pos.set(x, 0.025, z);
    _quat.identity();
    _scale.set(1, 1, 1);
    _mat.compose(_pos, _quat, _scale);
    this.shadowInst.setMatrixAt(slot, _mat);

    // Limbs pivoted from shoulder/hip: 0=armL, 1=armR, 2=legL, 3=legR
    const armOffsetX = 0.31;
    const legOffsetX = 0.13;

    // Left Arm (shoulder at Y=1.20)
    const armLPitch = panicMode ? -2.45 + Math.sin(walkCycle * 1.4) * 0.6 : -stride;
    _pos.set(x + cosY * -armOffsetX, 1.2 + bounce, z - sinY * -armOffsetX);
    _euler.set(armLPitch, ry, panicMode ? 0.25 : 0, 'YXZ');
    _quat.setFromEuler(_euler);
    _mat.compose(_pos, _quat, _scale);
    this.limbInst.setMatrixAt(slot * 4 + 0, _mat);

    // Right Arm (shoulder at Y=1.20)
    const armRPitch = panicMode
      ? -2.45 - Math.sin(walkCycle * 1.4) * 0.6
      : gestureArm !== 0
      ? -gestureArm
      : stride;
    _pos.set(x + cosY * armOffsetX, 1.2 + bounce, z - sinY * armOffsetX);
    _euler.set(armRPitch, ry, panicMode ? -0.25 : 0, 'YXZ');
    _quat.setFromEuler(_euler);
    _mat.compose(_pos, _quat, _scale);
    this.limbInst.setMatrixAt(slot * 4 + 1, _mat);

    // Left Leg (hip at Y=0.63)
    _pos.set(x + cosY * -legOffsetX, 0.63 + bounce * 0.4, z - sinY * -legOffsetX);
    _euler.set(stride, ry, 0, 'YXZ');
    _quat.setFromEuler(_euler);
    _mat.compose(_pos, _quat, _scale);
    this.limbInst.setMatrixAt(slot * 4 + 2, _mat);

    // Right Leg (hip at Y=0.63)
    _pos.set(x + cosY * legOffsetX, 0.63 + bounce * 0.4, z - sinY * legOffsetX);
    _euler.set(-stride, ry, 0, 'YXZ');
    _quat.setFromEuler(_euler);
    _mat.compose(_pos, _quat, _scale);
    this.limbInst.setMatrixAt(slot * 4 + 3, _mat);
  }

  hideNpc(slot) {
    this._hideSlot(slot);
  }

  flush() {
    this.headInst.instanceMatrix.needsUpdate = true;
    this.torsoInst.instanceMatrix.needsUpdate = true;
    this.hairInst.instanceMatrix.needsUpdate = true;
    this.limbInst.instanceMatrix.needsUpdate = true;
    this.shadowInst.instanceMatrix.needsUpdate = true;
  }
}
