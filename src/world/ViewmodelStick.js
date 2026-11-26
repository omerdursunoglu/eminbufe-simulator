import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pushColoredBox } from './MeshBuilder.js';

/**
 * First-person viewmodels attached to the camera:
 * - Wooden stick ("sopa") for Event 1 / Event 3 chases
 * - Left/right fighting fists ("yumruk") for beating up sneaky thieves ÇAT ÇUT
 * - Carried drink crate for restocking fridges
 * Zero-GC animation updates.
 */
export class ViewmodelStick {
  constructor(camera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.swingTimer = 0;
    this.hitBounce = 0;
    this.swingDir = 1;
    this.swayTime = 0;
    this.active = false;
    this.carryingCrate = false;

    const stickGeo = new THREE.CylinderGeometry(0.024, 0.032, 0.92, 8);
    const stickMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const shaft = new THREE.Mesh(stickGeo, stickMat);

    const wrapGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.22, 8);
    const wrapMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const wrap = new THREE.Mesh(wrapGeo, wrapMat);
    wrap.position.y = -0.34;

    this.group.add(shaft);
    this.group.add(wrap);

    this.group.position.set(0.38, -0.34, -0.58);
    this.group.rotation.set(-0.45, -0.15, 0.22);
    this.group.visible = false;

    // Optional carried drink crate viewmodel (shown only while carrying restock crate)
    const crateGeo = new THREE.BoxGeometry(0.32, 0.22, 0.26);
    const crateMat = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 });
    this.crateMesh = new THREE.Mesh(crateGeo, crateMat);
    this.crateMesh.position.set(-0.34, -0.34, -0.54);
    this.crateMesh.rotation.set(0.15, 0.28, 0);
    this.crateMesh.visible = false;

    // Stylized low-poly Left & Right Fighting Fists (2 merged draw calls when visible)
    const buildFistMesh = (isRight) => {
      const parts = [];
      const side = isRight ? 1 : -1;
      // Forearm sleeve
      pushColoredBox(parts, 0.095, 0.095, 0.24, 0, 0, 0.14, 0x1e293b);
      // Wrist cuff
      pushColoredBox(parts, 0.102, 0.102, 0.04, 0, 0, 0.01, 0x334155);
      // Clenched fist / knuckles
      pushColoredBox(parts, 0.115, 0.105, 0.115, 0, 0.008, -0.06, 0xe8b88a);
      // Thumb tucked inward
      pushColoredBox(parts, 0.042, 0.05, 0.068, -side * 0.058, 0.025, -0.045, 0xdfb082);
      return new THREE.Mesh(
        mergeGeometries(parts, false),
        new THREE.MeshLambertMaterial({ vertexColors: true })
      );
    };

    this.leftFist = buildFistMesh(false);
    this.rightFist = buildFistMesh(true);
    this.leftFist.visible = false;
    this.rightFist.visible = false;

    this.fistReady = false;
    this.fistRaise = 0;
    this.fistHoldTimer = 0;
    this.leftPunchTimer = 0;
    this.rightPunchTimer = 0;
    this.punchCooldown = 0;
    this._nextPunchSide = 1; // start with right hook, alternate L/R!

    this.camera.add(this.group);
    this.camera.add(this.crateMesh);
    this.camera.add(this.leftFist);
    this.camera.add(this.rightFist);
  }

  setCarryingCrate(carrying) {
    this.carryingCrate = carrying;
    this.crateMesh.visible = carrying;
  }

  setActive(active) {
    this.active = active;
    this.group.visible = active;
    if (active) {
      this.swingTimer = 0.22;
      this.hitBounce = 0;
    }
  }

  setCombatReady(ready) {
    this.fistReady = ready;
  }

  canSwing() {
    return this.active && this.swingTimer <= 0.08;
  }

  canPunch() {
    return this.punchCooldown <= 0;
  }

  triggerSwing() {
    if (!this.active) return;
    this.swingTimer = 0.3;
    this.swingDir = -this.swingDir;
  }

  triggerPunch() {
    if (this.active) {
      this.triggerSwing();
      return;
    }
    this.fistHoldTimer = 1.15;
    this.punchCooldown = 0.18;

    // If holding drink crate in left hand, punch strictly with right fist!
    const useRight = this.carryingCrate || this._nextPunchSide === 1;
    if (useRight) {
      this.rightPunchTimer = 0.24;
    } else {
      this.leftPunchTimer = 0.24;
    }
    this._nextPunchSide = 1 - this._nextPunchSide;
  }

  triggerHitBounce() {
    if (!this.active) return;
    this.hitBounce = 0.18;
  }

  update(dt, moveSpeedRatio, isSprinting = false) {
    const speedMult = isSprinting ? 14 : 10;
    this.swayTime += dt * (4 + moveSpeedRatio * speedMult);
    const swayAmp = isSprinting ? 1.35 : 1.0;
    const swayY = Math.sin(this.swayTime) * (0.012 + moveSpeedRatio * 0.03 * swayAmp);
    const swayX = Math.cos(this.swayTime * 0.5) * (0.008 + moveSpeedRatio * 0.02 * swayAmp);
    const sprintTilt = isSprinting && moveSpeedRatio > 0.1 ? -0.18 : 0;

    if (this.punchCooldown > 0) this.punchCooldown = Math.max(0, this.punchCooldown - dt);
    if (this.fistHoldTimer > 0) this.fistHoldTimer = Math.max(0, this.fistHoldTimer - dt);

    // 1. Update Wooden Stick if active
    if (this.active) {
      let swingAngle = 0;
      let swingRoll = 0;
      let thrustZ = 0;
      if (this.swingTimer > 0) {
        this.swingTimer = Math.max(0, this.swingTimer - dt);
        const t = 1 - this.swingTimer / 0.3;
        const arc = Math.sin(t * Math.PI);
        swingAngle = arc * 1.28;
        swingRoll = arc * 0.52 * this.swingDir;
        thrustZ = -arc * 0.24;
      }

      if (this.hitBounce > 0) {
        this.hitBounce = Math.max(0, this.hitBounce - dt);
        const b = Math.sin((this.hitBounce / 0.18) * Math.PI);
        swingAngle -= b * 0.38;
        thrustZ += b * 0.08;
      }

      this.group.position.set(0.38 + swayX - swingRoll * 0.18, -0.34 + swayY, -0.58 + thrustZ);
      this.group.rotation.set(
        -0.45 + sprintTilt - swingAngle,
        -0.15 + swingAngle * 0.35 + swingRoll * 0.4,
        0.22 + swingRoll
      );
    }

    // 2. Update First-Person Fists
    const showFistsTarget = !this.active && (this.fistReady || this.fistHoldTimer > 0) ? 1 : 0;
    this.fistRaise += (showFistsTarget - this.fistRaise) * Math.min(1, dt * 14);

    if (this.fistRaise > 0.03) {
      const hideDrop = (1 - this.fistRaise) * -0.36;
      const guardBob = Math.sin(this.swayTime * 1.1) * 0.012;

      // Left fist
      this.leftFist.visible = !this.carryingCrate;
      if (this.leftPunchTimer > 0) this.leftPunchTimer = Math.max(0, this.leftPunchTimer - dt);
      const lArc = this.leftPunchTimer > 0 ? Math.sin((1 - this.leftPunchTimer / 0.24) * Math.PI) : 0;
      this.leftFist.position.set(
        -0.29 + swayX * 0.7 + lArc * 0.21,
        -0.28 + swayY + guardBob + hideDrop + lArc * 0.1,
        -0.44 - lArc * 0.34
      );
      this.leftFist.rotation.set(
        0.18 - lArc * 0.35 + sprintTilt * 0.5,
        0.25 - lArc * 0.42,
        -0.18 - lArc * 0.45
      );

      // Right fist
      this.rightFist.visible = true;
      if (this.rightPunchTimer > 0) this.rightPunchTimer = Math.max(0, this.rightPunchTimer - dt);
      const rArc = this.rightPunchTimer > 0 ? Math.sin((1 - this.rightPunchTimer / 0.24) * Math.PI) : 0;
      this.rightFist.position.set(
        0.29 + swayX * 0.7 - rArc * 0.21,
        -0.28 + swayY - guardBob + hideDrop + rArc * 0.1,
        -0.44 - rArc * 0.34
      );
      this.rightFist.rotation.set(
        0.18 - rArc * 0.35 + sprintTilt * 0.5,
        -0.25 + rArc * 0.42,
        0.18 + rArc * 0.45
      );
    } else {
      this.leftFist.visible = false;
      this.rightFist.visible = false;
    }
  }
}
