import * as THREE from 'three';

/**
 * First-person viewmodel wooden stick ("sopa") attached to the camera during Event 1 chase.
 * Zero-GC animation updates.
 */
export class ViewmodelStick {
  constructor(camera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.swingTimer = 0;
    this.swayTime = 0;
    this.active = false;

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

    this.camera.add(this.group);
    this.camera.add(this.crateMesh);
  }

  setCarryingCrate(carrying) {
    this.crateMesh.visible = carrying;
  }

  setActive(active) {
    this.active = active;
    this.group.visible = active;
    if (active) {
      this.swingTimer = 0.25;
    }
  }

  triggerSwing() {
    if (!this.active) return;
    this.swingTimer = 0.34;
  }

  update(dt, moveSpeedRatio) {
    if (!this.active) return;

    this.swayTime += dt * (4 + moveSpeedRatio * 10);
    const swayY = Math.sin(this.swayTime) * (0.012 + moveSpeedRatio * 0.03);
    const swayX = Math.cos(this.swayTime * 0.5) * (0.008 + moveSpeedRatio * 0.02);

    let swingAngle = 0;
    let thrustZ = 0;
    if (this.swingTimer > 0) {
      this.swingTimer = Math.max(0, this.swingTimer - dt);
      const t = 1 - this.swingTimer / 0.34;
      swingAngle = Math.sin(t * Math.PI) * 1.15;
      thrustZ = -Math.sin(t * Math.PI) * 0.2;
    }

    this.group.position.set(0.38 + swayX, -0.34 + swayY, -0.58 + thrustZ);
    this.group.rotation.set(-0.45 - swingAngle, -0.15 + swingAngle * 0.35, 0.22 + swingAngle * 0.3);
  }
}
