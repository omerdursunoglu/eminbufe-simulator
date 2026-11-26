import * as THREE from 'three';

const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _euler = new THREE.Euler();
const _tmpColor = new THREE.Color();
const _rootQuat = new THREE.Quaternion();
const _rootEuler = new THREE.Euler();
const _localPos = new THREE.Vector3();
const _localQuat = new THREE.Quaternion();
const _partPos = new THREE.Vector3();
const _partQuat = new THREE.Quaternion();
const _headWorld = new THREE.Vector3();
const _hairOffset = new THREE.Vector3();
const _headQuat = new THREE.Quaternion();

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

    // 6. Comic Impact Sparks (1 draw call for all stick-hit burst particles)
    this.maxSparks = 16;
    this.sparks = [];
    const sparkGeo = new THREE.OctahedronGeometry(0.085, 0);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.sparkInst = new THREE.InstancedMesh(sparkGeo, sparkMat, this.maxSparks);
    this.sparkInst.frustumCulled = false;
    const sparkPalette = [0xfacc15, 0xf97316, 0xef4444, 0xffffff];
    for (let i = 0; i < this.maxSparks; i++) {
      this.sparks.push({
        active: false,
        x: 0,
        y: -30,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
        rot: i * 0.7
      });
      _tmpColor.setHex(sparkPalette[i % sparkPalette.length]);
      this.sparkInst.setColorAt(i, _tmpColor);
      _pos.set(0, -30, 0);
      _quat.identity();
      _scale.set(0.0001, 0.0001, 0.0001);
      _mat.compose(_pos, _quat, _scale);
      this.sparkInst.setMatrixAt(i, _mat);
    }
    this.sparkInst.instanceColor.needsUpdate = true;
    this.sparkInst.instanceMatrix.needsUpdate = true;

    // 7. Pulsing red target ring under fleeing sabotaging NPC (hidden when inactive)
    const ringGeo = new THREE.RingGeometry(0.46, 0.62, 24);
    ringGeo.rotateX(-Math.PI * 0.5);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88
    });
    this.targetRing = new THREE.Mesh(ringGeo, ringMat);
    this.targetRing.position.set(0, 0.04, 0);
    this.targetRing.visible = false;

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
    scene.add(this.sparkInst);
    scene.add(this.targetRing);
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

  setNpcHitFlash(slot) {
    _tmpColor.setHex(0xff3b3b);
    this.torsoInst.setColorAt(slot, _tmpColor);
    this.limbInst.setColorAt(slot * 4 + 0, _tmpColor);
    this.limbInst.setColorAt(slot * 4 + 1, _tmpColor);
    _tmpColor.setHex(0xffffff);
    this.headInst.setColorAt(slot, _tmpColor);

    this.headInst.instanceColor.needsUpdate = true;
    this.torsoInst.instanceColor.needsUpdate = true;
    this.limbInst.instanceColor.needsUpdate = true;
  }

  spawnImpactBurst(x, y, z) {
    for (let i = 0; i < this.maxSparks; i++) {
      const p = this.sparks[i];
      const angle = (i / this.maxSparks) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 2.4 + Math.random() * 3.0;
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z;
      p.vx = Math.cos(angle) * spd;
      p.vy = 1.6 + Math.random() * 2.8;
      p.vz = Math.sin(angle) * spd;
      p.maxLife = 0.34 + Math.random() * 0.18;
      p.life = p.maxLife;
      p.rot = Math.random() * Math.PI;
    }
  }

  setTargetRing(visible, x = 0, z = 0, pulsePhase = 0) {
    this.targetRing.visible = visible;
    if (visible) {
      const s = 1.0 + Math.sin(pulsePhase) * 0.18;
      this.targetRing.position.set(x, 0.04, z);
      this.targetRing.scale.set(s, 1, s);
    }
  }

  updateEffects(dt) {
    let anyChanged = false;
    for (let i = 0; i < this.maxSparks; i++) {
      const p = this.sparks[i];
      if (!p.active) continue;
      anyChanged = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _pos.set(0, -30, 0);
        _quat.identity();
        _scale.set(0.0001, 0.0001, 0.0001);
        _mat.compose(_pos, _quat, _scale);
        this.sparkInst.setMatrixAt(i, _mat);
        continue;
      }
      p.vy -= 9.8 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rot += dt * 14;
      const ratio = p.life / p.maxLife;
      const sc = 0.55 + ratio * 0.9;
      _pos.set(p.x, Math.max(0.06, p.y), p.z);
      _euler.set(p.rot, p.rot * 0.7, 0);
      _quat.setFromEuler(_euler);
      _scale.set(sc, sc, sc);
      _mat.compose(_pos, _quat, _scale);
      this.sparkInst.setMatrixAt(i, _mat);
    }
    if (anyChanged) {
      this.sparkInst.instanceMatrix.needsUpdate = true;
    }
  }

  updateNpcPose(
    slot,
    x,
    z,
    ry,
    walkCycle,
    speed,
    panicMode = false,
    gestureArm = 0,
    staggerAmt = 0,
    knockdownAmt = 0,
    sneakAmt = 0,
    sneakLook = 0
  ) {
    const strideAmp = sneakAmt > 0 ? 0.36 : 0.55;
    const stride = speed > 0.1 ? Math.sin(walkCycle) * strideAmp : 0;
    const bounceAmp = sneakAmt > 0 ? 0.018 : 0.04;
    const bounce = speed > 0.1 ? Math.abs(Math.cos(walkCycle)) * bounceAmp : 0;
    const cosY = Math.cos(ry);
    const sinY = Math.sin(ry);
    const armOffsetX = 0.31;
    const legOffsetX = 0.13;

    if (knockdownAmt > 0.05) {
      // Knocked down flat on the terminal floor (lying backward along local -Z)
      const tilt = -knockdownAmt * 1.48;
      const twitch = Math.sin(walkCycle * 3.0) * 0.08 * knockdownAmt;
      const sinT = Math.sin(tilt);
      const cosT = Math.cos(tilt);
      const baseY = 0.65 - knockdownAmt * 0.45;

      // Helper offset rotated around hip/center (0, 0.65, 0) in NPC local space -> world space
      const setFallenPart = (inst, instIdx, lx, ly, lz, rx, ryLocal, rz) => {
        const yOff = ly - 0.65;
        const rLocalY = yOff * cosT - lz * sinT;
        const rLocalZ = yOff * sinT + lz * cosT;
        const wx = x + cosY * lx + sinY * rLocalZ;
        const wz = z - sinY * lx + cosY * rLocalZ;
        const wy = baseY + Math.max(-0.04, rLocalY);
        _pos.set(wx, wy, wz);
        _euler.set(tilt + rx, ry + ryLocal, rz, 'YXZ');
        _quat.setFromEuler(_euler);
        _scale.set(1, 1, 1);
        _mat.compose(_pos, _quat, _scale);
        inst.setMatrixAt(instIdx, _mat);
      };

      setFallenPart(this.torsoInst, slot, 0, 0.94, 0, 0, 0, 0);
      setFallenPart(this.headInst, slot, 0, 1.44, 0, twitch, twitch * 1.5, 0);
      setFallenPart(this.hairInst, slot, 0, 1.62, 0, twitch, twitch * 1.5, 0);
      setFallenPart(this.limbInst, slot * 4 + 0, -armOffsetX, 1.18, 0, -0.35 + twitch, 0, 0.55);
      setFallenPart(this.limbInst, slot * 4 + 1, armOffsetX, 1.18, 0, -0.25 - twitch, 0, -0.62);
      setFallenPart(this.limbInst, slot * 4 + 2, -legOffsetX, 0.63, 0, 0.12, 0, 0.16);
      setFallenPart(this.limbInst, slot * 4 + 3, legOffsetX, 0.63, 0, -0.08, 0, -0.18);

      _pos.set(x - sinY * 0.55 * knockdownAmt, 0.025, z - cosY * 0.55 * knockdownAmt);
      _euler.set(0, ry, 0, 'YXZ');
      _quat.setFromEuler(_euler);
      _scale.set(1.25, 1, 1.35 + knockdownAmt * 0.45);
      _mat.compose(_pos, _quat, _scale);
      this.shadowInst.setMatrixAt(slot, _mat);
      return;
    }

    const crouchY = -0.14 * sneakAmt;
    const sneakTorsoPitch = 0.36 * sneakAmt;
    const sneakHeadPitch = -0.2 * sneakAmt;
    const staggerPitch = staggerAmt > 0 ? -staggerAmt * 0.46 : 0;
    const staggerRoll = staggerAmt > 0 ? Math.sin(staggerAmt * 16) * 0.2 : 0;

    // Torso
    _pos.set(x, 0.94 + bounce + crouchY, z);
    _euler.set((panicMode ? 0.14 : 0) + sneakTorsoPitch + staggerPitch, ry, staggerRoll, 'YXZ');
    _quat.setFromEuler(_euler);
    _scale.set(1, 1, 1);
    _mat.compose(_pos, _quat, _scale);
    this.torsoInst.setMatrixAt(slot, _mat);

    // Head (with furtive left/right sneak glance)
    const headYaw = ry + sneakLook * sneakAmt;
    _pos.set(
      x + sinY * (0.14 * sneakAmt),
      1.44 + bounce + crouchY * 1.15,
      z + cosY * (0.14 * sneakAmt)
    );
    _euler.set(
      (panicMode ? -0.1 : 0) + sneakHeadPitch + staggerPitch * 1.35,
      headYaw,
      staggerRoll,
      'YXZ'
    );
    _quat.setFromEuler(_euler);
    _mat.compose(_pos, _quat, _scale);
    this.headInst.setMatrixAt(slot, _mat);

    // Hair / Hat
    _pos.y += 0.18;
    _mat.compose(_pos, _quat, _scale);
    this.hairInst.setMatrixAt(slot, _mat);

    // Shadow
    _pos.set(x, 0.025, z);
    _quat.identity();
    _scale.set(1, 1, 1);
    _mat.compose(_pos, _quat, _scale);
    this.shadowInst.setMatrixAt(slot, _mat);

    // Limbs pivoted from shoulder/hip: 0=armL, 1=armR, 2=legL, 3=legR
    // Left Arm (shoulder at Y=1.20)
    const armLPitch =
      staggerAmt > 0
        ? -2.85
        : panicMode
        ? -2.45 + Math.sin(walkCycle * 1.4) * 0.6
        : sneakAmt > 0
        ? (-0.75 + stride * 0.4) * sneakAmt - stride * (1 - sneakAmt)
        : -stride;
    _pos.set(
      x + cosY * -armOffsetX + sinY * (0.08 * sneakAmt),
      1.2 + bounce + crouchY,
      z - sinY * -armOffsetX + cosY * (0.08 * sneakAmt)
    );
    _euler.set(
      armLPitch,
      ry,
      panicMode || staggerAmt > 0 ? 0.35 : sneakAmt > 0 ? 0.14 * sneakAmt : 0,
      'YXZ'
    );
    _quat.setFromEuler(_euler);
    _mat.compose(_pos, _quat, _scale);
    this.limbInst.setMatrixAt(slot * 4 + 0, _mat);

    // Right Arm (shoulder at Y=1.20)
    const armRPitch =
      staggerAmt > 0
        ? -2.75
        : panicMode
        ? -2.45 - Math.sin(walkCycle * 1.4) * 0.6
        : gestureArm !== 0
        ? -gestureArm
        : sneakAmt > 0
        ? (-0.75 - stride * 0.4) * sneakAmt + stride * (1 - sneakAmt)
        : stride;
    _pos.set(
      x + cosY * armOffsetX + sinY * (0.08 * sneakAmt),
      1.2 + bounce + crouchY,
      z - sinY * armOffsetX + cosY * (0.08 * sneakAmt)
    );
    _euler.set(
      armRPitch,
      ry,
      panicMode || staggerAmt > 0 ? -0.35 : sneakAmt > 0 ? -0.14 * sneakAmt : 0,
      'YXZ'
    );
    _quat.setFromEuler(_euler);
    _mat.compose(_pos, _quat, _scale);
    this.limbInst.setMatrixAt(slot * 4 + 1, _mat);

    // Left Leg (hip at Y=0.63)
    _pos.set(x + cosY * -legOffsetX, 0.63 + bounce * 0.4 + crouchY * 0.65, z - sinY * -legOffsetX);
    _euler.set(stride - 0.18 * sneakAmt, ry, 0, 'YXZ');
    _quat.setFromEuler(_euler);
    _mat.compose(_pos, _quat, _scale);
    this.limbInst.setMatrixAt(slot * 4 + 2, _mat);

    // Right Leg (hip at Y=0.63)
    _pos.set(x + cosY * legOffsetX, 0.63 + bounce * 0.4 + crouchY * 0.65, z - sinY * legOffsetX);
    _euler.set(-stride + 0.12 * sneakAmt, ry, 0, 'YXZ');
    _quat.setFromEuler(_euler);
    _mat.compose(_pos, _quat, _scale);
    this.limbInst.setMatrixAt(slot * 4 + 3, _mat);
  }

  getHeadMatrix(slot, outMatrix) {
    this.headInst.getMatrixAt(slot, outMatrix);
  }

  getTorsoMatrix(slot, outMatrix) {
    this.torsoInst.getMatrixAt(slot, outMatrix);
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
