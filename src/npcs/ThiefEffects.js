import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pushColoredBox } from '../world/MeshBuilder.js';

const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _sackScale = new THREE.Vector3(1.25, 1.25, 1.25);
const _euler = new THREE.Euler();
const _headPos = new THREE.Vector3();
const _tmpColor = new THREE.Color();

/**
 * Renders the thief's bandit eye-mask, burlap loot sack, and orbiting dizzy stars
 * during knockdown (3 lightweight draw calls max, zero-GC).
 */
export class ThiefEffects {
  constructor(scene) {
    this.scene = scene;

    // 1. Bandit eye mask + white eyes (sized cleanly for rounded Sphere head)
    const maskParts = [];
    pushColoredBox(maskParts, 0.36, 0.1, 0.365, 0, 0.02, 0, 0x09090b);
    pushColoredBox(maskParts, 0.068, 0.035, 0.025, -0.072, 0.024, 0.188, 0xf8fafc, 0, 0, -0.18);
    pushColoredBox(maskParts, 0.068, 0.035, 0.025, 0.072, 0.024, 0.188, 0xf8fafc, 0, 0, 0.18);
    this.maskMesh = new THREE.Mesh(
      mergeGeometries(maskParts, false),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 })
    );
    this.maskMesh.matrixAutoUpdate = false;
    this.maskMesh.visible = false;
    this.scene.add(this.maskMesh);

    // 2. Burlap loot sack on back (glued directly to thief torso matrix)
    const sackParts = [];
    pushColoredBox(sackParts, 0.3, 0.36, 0.2, 0, -0.04, -0.22, 0x92400e);
    pushColoredBox(sackParts, 0.12, 0.08, 0.1, 0, 0.18, -0.22, 0xfacc15);
    pushColoredBox(sackParts, 0.12, 0.12, 0.03, 0, -0.04, -0.33, 0xfacc15);
    this.sackMesh = new THREE.Mesh(
      mergeGeometries(sackParts, false),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })
    );
    this.sackMesh.matrixAutoUpdate = false;
    this.sackMesh.visible = false;
    this.scene.add(this.sackMesh);

    // 3. Orbiting KO dizzy stars (1 InstancedMesh of 4 stars)
    this.starCount = 4;
    const starGeo = new THREE.OctahedronGeometry(0.065, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.starsInst = new THREE.InstancedMesh(starGeo, starMat, this.starCount);
    this.starsInst.frustumCulled = false;

    for (let s = 0; s < this.starCount; s++) {
      _tmpColor.setHex(s % 2 === 0 ? 0xfacc15 : 0x38bdf8);
      this.starsInst.setColorAt(s, _tmpColor);
    }
    this.starsInst.instanceColor.needsUpdate = true;
    this._hideStars();
    this._hadStars = false;
    this.scene.add(this.starsInst);
  }

  _hideStars() {
    _pos.set(0, -30, 0);
    _quat.identity();
    _scale.set(0.0001, 0.0001, 0.0001);
    _mat.compose(_pos, _quat, _scale);
    for (let s = 0; s < this.starCount; s++) {
      this.starsInst.setMatrixAt(s, _mat);
    }
    this.starsInst.instanceMatrix.needsUpdate = true;
  }

  update(thief, npcFactory) {
    if (!thief || !thief.active) {
      this.maskMesh.visible = false;
      this.sackMesh.visible = false;
    } else {
      this.maskMesh.visible = true;
      npcFactory.getHeadMatrix(thief.slot, this.maskMesh.matrix);
      this.maskMesh.matrixWorldNeedsUpdate = true;

      this.sackMesh.visible = true;
      npcFactory.getTorsoMatrix(thief.slot, this.sackMesh.matrix);
      if (thief.stolenAmount > 0) {
        this.sackMesh.matrix.scale(_sackScale);
      }
      this.sackMesh.matrixWorldNeedsUpdate = true;
    }

    const showStars = Boolean(thief && thief.active && thief.state === 'knocked_out');
    if (showStars) {
      _headPos.setFromMatrixPosition(this.maskMesh.matrix);
      for (let s = 0; s < this.starCount; s++) {
        const ang = thief.dizzyTime * 4.8 + (s / this.starCount) * Math.PI * 2;
        const r = 0.34;
        _pos.set(
          _headPos.x + Math.cos(ang) * r,
          _headPos.y + 0.28 + Math.sin(ang * 2) * 0.04,
          _headPos.z + Math.sin(ang) * r
        );
        _euler.set(ang, ang * 1.4, 0);
        _quat.setFromEuler(_euler);
        _scale.set(1, 1, 1);
        _mat.compose(_pos, _quat, _scale);
        this.starsInst.setMatrixAt(s, _mat);
      }
      this.starsInst.instanceMatrix.needsUpdate = true;
    } else if (this._hadStars) {
      this._hideStars();
    }
    this._hadStars = showStars;
  }
}
