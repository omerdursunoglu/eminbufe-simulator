import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pushColoredBox, pushGlassBox } from './MeshBuilder.js';

/**
 * Tokat Otobüs Terminali (2026 Modern Yenilenmiş Konsept)
 * Uses merged static geometries + InstancedMesh for benches, pillars, and exterior buses.
 */
export class TerminalWorld {
  constructor(scene, textures, colliders) {
    this.scene = scene;
    this.textures = textures;
    this.colliders = colliders;
    this.exitPosition = new THREE.Vector3(0, 0, 22.0);
    this.busAnimData = [];
    this.busesMesh = null;
    this.busGlassMesh = null;
    this.busWheelsMesh = null;
    this._mat = new THREE.Matrix4();
    this._pos = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._scale = new THREE.Vector3(1, 1, 1);

    this._build();
  }

  _build() {
    const opaque = [];
    const emissive = [];
    const glass = [];

    // 1. Concourse porcelain tiled floor (1 draw call)
    const floorGeo = new THREE.PlaneGeometry(48, 34);
    floorGeo.rotateX(-Math.PI * 0.5);
    const floorMat = new THREE.MeshLambertMaterial({ map: this.textures.floorTexture });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, 0, 9.0);
    this.scene.add(floorMesh);

    // Exterior asphalt bus apron beyond north glass wall (Z = 24..46)
    pushColoredBox(opaque, 62, 0.1, 24, 0, -0.06, 35.5, 0x363b42);
    // Exterior concrete platform curb & painted bay strips
    pushColoredBox(opaque, 56, 0.22, 2.2, 0, 0.06, 25.1, 0x94a3b8);
    for (let x = -18; x <= 18; x += 9) {
      pushColoredBox(opaque, 0.25, 0.03, 9.5, x, 0.01, 31.5, 0xfacc15);
    }

    // 2. Modern High Terminal Roof & Steel Trusses (Y = 9.2m)
    pushColoredBox(opaque, 48, 0.35, 34, 0, 9.45, 9.0, 0xd8dee6);
    for (let z = -4; z <= 22; z += 6.5) {
      pushColoredBox(opaque, 48, 0.32, 0.28, 0, 9.05, z, 0x2c3542);
      // Skylight / modern linear LED ceiling luminaire
      pushColoredBox(emissive, 20, 0.08, 0.36, 0, 9.22, z + 3.2, 0xf4f9ff);
    }
    for (let x = -18; x <= 18; x += 12) {
      pushColoredBox(opaque, 0.22, 0.28, 34, x, 9.05, 9.0, 0x334155);
    }

    // 3. Side Terminal Walls (X = -23.5 and +23.5) & South Back Wall behind shop
    pushColoredBox(opaque, 0.6, 9.5, 34, -23.8, 4.75, 9.0, 0xcbd5e1);
    pushColoredBox(opaque, 0.6, 9.5, 34, 23.8, 4.75, 9.0, 0xcbd5e1);
    // Warm wood-slat accent bands along side walls & above Emin Bufe
    for (let z = -4; z <= 20; z += 4.8) {
      pushColoredBox(opaque, 0.16, 7.0, 2.2, -23.4, 3.5, z, 0x5c4033);
      pushColoredBox(opaque, 0.16, 7.0, 2.2, 23.4, 3.5, z, 0x5c4033);
    }
    // South terminal wall behind Emin Bufe (leaving corridor wings on left & right)
    pushColoredBox(opaque, 48, 9.5, 0.6, 0, 4.75, -7.8, 0xdbe2ea);
    // Warm walnut slat facade rising above Emin Bufe (Photo 2 upper backdrop)
    for (let x = -5.4; x <= 5.4; x += 0.6) {
      pushColoredBox(opaque, 0.28, 5.4, 0.25, x, 6.65, -0.05, 0x4b3629);
    }
    pushColoredBox(opaque, 11.4, 5.4, 0.3, 0, 6.65, -0.25, 0x3b2a20);

    // Stylized Ticket Offices on Left & Right Terminal Wings ("TOKAT SEYAHAT / HUZUR")
    pushColoredBox(opaque, 2.2, 2.8, 12, -22.2, 1.4, 10, 0x1e293b);
    pushColoredBox(emissive, 0.12, 0.6, 10, -21.05, 2.45, 10, 0x38bdf8);
    pushColoredBox(opaque, 2.2, 2.8, 12, 22.2, 1.4, 10, 0x1e293b);
    pushColoredBox(emissive, 0.12, 0.6, 10, 21.05, 2.45, 10, 0xf59e0b);

    // 4. North Glass Curtain Wall (Z = 23.4) looking out to Bus Perons!
    // Aluminum vertical mullions
    for (let x = -22; x <= 22; x += 4.4) {
      pushColoredBox(opaque, 0.16, 9.2, 0.24, x, 4.6, 23.4, 0x334155);
    }
    // Horizontal transoms
    pushColoredBox(opaque, 47, 0.16, 0.22, 0, 3.4, 23.4, 0x334155);
    pushColoredBox(opaque, 47, 0.16, 0.22, 0, 6.4, 23.4, 0x334155);
    // Left & right glass panels (leaving center exit doors at X in [-2.2, 2.2], Y < 3.4 open-framed)
    pushGlassBox(glass, 20.5, 9.0, 0.06, -12.6, 4.5, 23.4);
    pushGlassBox(glass, 20.5, 9.0, 0.06, 12.6, 4.5, 23.4);
    pushGlassBox(glass, 4.4, 5.8, 0.06, 0, 6.3, 23.4);
    // Sliding glass exit doors (slightly parted so player sees clear exit goal)
    pushGlassBox(glass, 1.4, 3.2, 0.06, -1.7, 1.6, 23.3);
    pushGlassBox(glass, 1.4, 3.2, 0.06, 1.7, 1.6, 23.3);
    // Bright Green Glowing "ÇIKIŞ / PERONLAR" Exit Portal Sign with readable CanvasTexture
    pushColoredBox(opaque, 3.8, 0.76, 0.24, 0, 3.55, 23.1, 0x064e3b);
    const exitCanvas = document.createElement('canvas');
    exitCanvas.width = 512;
    exitCanvas.height = 128;
    const eCtx = exitCanvas.getContext('2d');
    eCtx.fillStyle = '#059669';
    eCtx.fillRect(0, 0, 512, 128);
    eCtx.strokeStyle = '#6ee7b7';
    eCtx.lineWidth = 8;
    eCtx.strokeRect(6, 6, 500, 116);
    eCtx.fillStyle = '#ffffff';
    eCtx.font = '900 44px sans-serif';
    eCtx.textAlign = 'center';
    eCtx.fillText('ÇIKIŞ • PERONLAR ↑', 256, 80);
    const exitTex = new THREE.CanvasTexture(exitCanvas);
    exitTex.colorSpace = THREE.SRGBColorSpace;
    const exitSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.55, 0.58),
      new THREE.MeshBasicMaterial({ map: exitTex })
    );
    exitSign.position.set(0, 3.55, 22.96);
    exitSign.rotation.y = Math.PI;
    this.scene.add(exitSign);

    // Colliders for Terminal Outer Pillars / Ticket Booths / Glass Facade
    this.colliders.addBox(-23.5, -7.5, -20.8, 23.5, 'west_ticket');
    this.colliders.addBox(20.8, -7.5, 23.5, 23.5, 'east_ticket');

    // Merge static terminal buckets
    const opaqueMesh = new THREE.Mesh(
      mergeGeometries(opaque, false),
      new THREE.MeshLambertMaterial({ vertexColors: true })
    );
    this.scene.add(opaqueMesh);

    const emissiveMesh = new THREE.Mesh(
      mergeGeometries(emissive, false),
      new THREE.MeshBasicMaterial({ vertexColors: true })
    );
    this.scene.add(emissiveMesh);

    const glassMesh = new THREE.Mesh(
      mergeGeometries(glass, false),
      new THREE.MeshLambertMaterial({
        color: 0xa5d8ff,
        transparent: true,
        opacity: 0.28,
        depthWrite: false
      })
    );
    this.scene.add(glassMesh);

    // 5. Digital Departure Board (Dijital Sefer Panosu) suspended in center hall
    this._buildDepartureBoard();

    // 6. Instanced Terminal Structural Columns
    this._buildInstancedPillars();

    // 7. Instanced Waiting Benches (Left & Right concourse islands)
    this._buildInstancedBenches();

    // 8. Instanced Stylized Intercity Buses outside glass facade
    this._buildInstancedBuses();
  }

  _buildDepartureBoard() {
    const frameGeo = new THREE.BoxGeometry(6.8, 3.2, 0.32);
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 5.8, 13.5);
    this.scene.add(frame);

    // Front screen facing Emin Bufe (-Z)
    const scrGeo = new THREE.PlaneGeometry(6.3, 2.85);
    const scrMat = new THREE.MeshBasicMaterial({ map: this.textures.departureTexture });
    const scrFront = new THREE.Mesh(scrGeo, scrMat);
    scrFront.position.set(0, 5.8, 13.32);
    scrFront.rotation.y = Math.PI;
    this.scene.add(scrFront);

    // Back screen facing exit (+Z) sharing same geometry/material via 2nd plane? Let's omit back screen or keep 1 draw call!
    // One front-facing board (visible from Emin Bufe & center hall) keeps it at just 2 draw calls total!
  }

  _buildInstancedPillars() {
    const coords = [
      [-11.5, 4.5],
      [11.5, 4.5],
      [-11.5, 13.5],
      [11.5, 13.5],
      [-11.5, 22.0],
      [11.5, 22.0]
    ];
    const geo = new THREE.CylinderGeometry(0.32, 0.36, 9.2, 10);
    const mat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const inst = new THREE.InstancedMesh(geo, mat, coords.length);

    for (let i = 0; i < coords.length; i++) {
      const [x, z] = coords[i];
      this._pos.set(x, 4.6, z);
      this._mat.compose(this._pos, this._quat, this._scale);
      inst.setMatrixAt(i, this._mat);
      this.colliders.addCenteredBox(x, z, 0.72, 0.72, 'pillar');
    }
    inst.instanceMatrix.needsUpdate = true;
    this.scene.add(inst);
  }

  _buildInstancedBenches() {
    // Merge 1 bench unit (steel beam + 4 seats) then instance it 12 times = 1 draw call!
    const parts = [];
    pushColoredBox(parts, 2.6, 0.08, 0.55, 0, 0.42, 0, 0x334155); // seat rail
    pushColoredBox(parts, 0.1, 0.42, 0.48, -1.05, 0.21, 0, 0x64748b); // leg L
    pushColoredBox(parts, 0.1, 0.42, 0.48, 1.05, 0.21, 0, 0x64748b); // leg R
    for (let s = -0.9; s <= 0.91; s += 0.6) {
      pushColoredBox(parts, 0.5, 0.08, 0.48, s, 0.48, 0.04, 0x1e3a8a); // seat pad
      pushColoredBox(parts, 0.5, 0.48, 0.08, s, 0.74, -0.22, 0x1e40af); // backrest
    }

    const benchGeo = mergeGeometries(parts, false);
    const benchMat = new THREE.MeshLambertMaterial({ vertexColors: true });

    const placements = [
      [-10.0, 7.2, 0],
      [-6.5, 7.2, 0],
      [6.5, 7.2, 0],
      [10.0, 7.2, 0],
      [-10.0, 14.5, Math.PI],
      [-6.5, 14.5, Math.PI],
      [6.5, 14.5, Math.PI],
      [10.0, 14.5, Math.PI],
      [-15.5, 10.8, Math.PI * 0.5],
      [15.5, 10.8, -Math.PI * 0.5]
    ];

    const inst = new THREE.InstancedMesh(benchGeo, benchMat, placements.length);
    for (let i = 0; i < placements.length; i++) {
      const [x, z, ry] = placements[i];
      this._pos.set(x, 0, z);
      this._quat.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, ry);
      this._mat.compose(this._pos, this._quat, this._scale);
      inst.setMatrixAt(i, this._mat);

      if (Math.abs(ry) < 0.2 || Math.abs(ry - Math.PI) < 0.2) {
        this.colliders.addCenteredBox(x, z, 2.65, 0.65, 'bench');
      } else {
        this.colliders.addCenteredBox(x, z, 0.65, 2.65, 'bench');
      }
    }
    inst.instanceMatrix.needsUpdate = true;
    this.scene.add(inst);
  }

  _buildInstancedBuses() {
    // 4 modern Tokat intercity coaches outside the glass facade (1 draw call for bodies, 1 for windows)
    const bodyParts = [];
    pushColoredBox(bodyParts, 11.2, 2.75, 2.6, 0, 1.75, 0, 0xf8fafc); // coach body
    pushColoredBox(bodyParts, 11.25, 0.35, 2.64, 0, 0.9, 0, 0x0ea5e9); // stripe
    pushColoredBox(bodyParts, 0.25, 0.32, 0.55, -5.62, 0.85, -0.85, 0xfef08a); // headlight L
    pushColoredBox(bodyParts, 0.25, 0.32, 0.55, -5.62, 0.85, 0.85, 0xfef08a); // headlight R

    const bodyGeo = mergeGeometries(bodyParts, false);
    const bodyMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.busesMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, 4);

    const winGeo = new THREE.BoxGeometry(10.6, 1.12, 2.66);
    const winMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    this.busGlassMesh = new THREE.InstancedMesh(winGeo, winMat, 4);

    const busColors = [0xffffff, 0xfef3c7, 0xe0f2fe, 0xf1f5f9];
    const baseConfigs = [
      { x: -14, z: 29.0, speed: 0.0, dir: 1 },
      { x: -3, z: 33.0, speed: 0.0, dir: 1 },
      { x: 10, z: 29.0, speed: 0.0, dir: -1 },
      { x: -26, z: 38.0, speed: 4.5, dir: 1 } // cruising background bus!
    ];

    this._quat.identity();
    const tmpColor = new THREE.Color();
    for (let i = 0; i < 4; i++) {
      const cfg = baseConfigs[i];
      this.busAnimData.push({ ...cfg });
      this._pos.set(cfg.x, 0, cfg.z);
      this._mat.compose(this._pos, this._quat, this._scale);
      this.busesMesh.setMatrixAt(i, this._mat);
      tmpColor.setHex(busColors[i]);
      this.busesMesh.setColorAt(i, tmpColor);

      this._pos.set(cfg.x, 2.25, cfg.z);
      this._mat.compose(this._pos, this._quat, this._scale);
      this.busGlassMesh.setMatrixAt(i, this._mat);
    }
    this.busesMesh.instanceMatrix.needsUpdate = true;
    this.busesMesh.instanceColor.needsUpdate = true;
    this.busGlassMesh.instanceMatrix.needsUpdate = true;

    this.scene.add(this.busesMesh);
    this.scene.add(this.busGlassMesh);
  }

  update(dt) {
    // Animate cruising bus #4 slowly across the exterior apron (zero GC!)
    const bus = this.busAnimData[3];
    if (bus && this.busesMesh && this.busGlassMesh) {
      bus.x += bus.speed * dt;
      if (bus.x > 34) bus.x = -34;

      this._quat.identity();
      this._pos.set(bus.x, 0, bus.z);
      this._mat.compose(this._pos, this._quat, this._scale);
      this.busesMesh.setMatrixAt(3, this._mat);

      this._pos.set(bus.x, 2.25, bus.z);
      this._mat.compose(this._pos, this._quat, this._scale);
      this.busGlassMesh.setMatrixAt(3, this._mat);

      this.busesMesh.instanceMatrix.needsUpdate = true;
      this.busGlassMesh.instanceMatrix.needsUpdate = true;
    }
  }
}
