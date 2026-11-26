import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  pushColoredBox,
  pushColoredCylinder,
  pushColoredSphere,
  pushColoredTorus,
  pushGlassBox
} from './MeshBuilder.js';

/**
 * Tokat Otobüs Terminali (2026 Modern Yenilenmiş Konsept)
 * Studio-grade architectural detailing: reflective porcelain floor, steel+timber trusses,
 * indoor potted trees, recycling bins, sleek 2026 intercity tour coaches, and tactile exit guide.
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
    this._mat = new THREE.Matrix4();
    this._pos = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._scale = new THREE.Vector3(1, 1, 1);

    this._build();
  }

  _build() {
    const matte = [];
    const metallic = [];
    const emissive = [];
    const glass = [];

    // 1. Polished Porcelain Terminal Floor (subtle RoomEnvironment reflections!)
    const floorGeo = new THREE.PlaneGeometry(48, 34);
    floorGeo.rotateX(-Math.PI * 0.5);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.textures.floorTexture,
      roughness: 0.22,
      metalness: 0.1
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, 0, 9.0);
    this.scene.add(floorMesh);

    // Subtle yellow tactile guiding strip from Emin Bufe toward Exit Doors
    pushColoredBox(matte, 0.34, 0.012, 20.5, 2.55, 0.008, 11.2, 0xfacc15);
    pushColoredBox(matte, 2.7, 0.012, 0.34, 1.35, 0.008, 21.4, 0xfacc15);

    // Exterior asphalt bus apron + platform curb + bay yellow stripes
    pushColoredBox(matte, 64, 0.1, 24, 0, -0.06, 35.5, 0x333840);
    pushColoredBox(matte, 56, 0.22, 2.4, 0, 0.06, 25.1, 0x94a3b8, 0, 0, 0, 0.78);
    for (let x = -18; x <= 18; x += 9) {
      pushColoredBox(matte, 0.24, 0.03, 9.5, x, 0.01, 31.5, 0xfacc15);
      // Platform canopy support columns outside
      pushColoredCylinder(metallic, 0.14, 0.16, 4.4, 8, x, 2.2, 26.0, 0x64748b);
    }
    pushColoredBox(metallic, 46, 0.25, 4.2, 0, 4.45, 26.8, 0x475569);

    // 2. Modern High Terminal Roof: Steel Trusses + Warm Oak Acoustic Baffles + Skylights
    pushColoredBox(matte, 48, 0.35, 34, 0, 9.5, 9.0, 0xd8dee6);
    for (let z = -4; z <= 22; z += 6.5) {
      pushColoredBox(metallic, 48, 0.34, 0.28, 0, 9.05, z, 0x334155);
      pushColoredBox(emissive, 22, 0.08, 0.38, 0, 9.25, z + 3.2, 0xf4f9ff);
    }
    // Warm timber acoustic ribs running longitudinally
    for (let x = -18; x <= 18; x += 4.5) {
      pushColoredBox(matte, 0.16, 0.26, 34, x, 9.15, 9.0, 0x7c5338);
    }

    // 3. Side Terminal Walls & Ticket Booths (X = -23.5 / +23.5)
    pushColoredBox(matte, 0.6, 9.5, 34, -23.8, 4.75, 9.0, 0xcbd5e1, 0, 0, 0, 0.72);
    pushColoredBox(matte, 0.6, 9.5, 34, 23.8, 4.75, 9.0, 0xcbd5e1, 0, 0, 0, 0.72);
    for (let z = -4; z <= 20; z += 4.8) {
      pushColoredBox(matte, 0.16, 7.2, 2.2, -23.4, 3.6, z, 0x5c4033, 0, 0, 0, 0.74);
      pushColoredBox(matte, 0.16, 7.2, 2.2, 23.4, 3.6, z, 0x5c4033, 0, 0, 0, 0.74);
    }
    pushColoredBox(matte, 48, 9.5, 0.6, 0, 4.75, -7.8, 0xdbe2ea, 0, 0, 0, 0.74);

    // Warm walnut vertical architectural fins rising above Emin Bufe
    for (let x = -5.4; x <= 5.4; x += 0.55) {
      pushColoredBox(matte, 0.24, 5.4, 0.22, x, 6.65, -0.04, 0x4f3829);
    }
    pushColoredBox(matte, 11.4, 5.4, 0.3, 0, 6.65, -0.25, 0x3b2a20);

    // Modern Ticket Offices along Left & Right Terminal Wings
    pushColoredBox(matte, 2.2, 2.8, 12, -22.2, 1.4, 10, 0x1e293b, 0, 0, 0, 0.75);
    pushColoredBox(matte, 0.4, 1.05, 12, -20.9, 0.52, 10, 0xf1f5f9, 0, 0, 0, 0.78);
    pushColoredBox(emissive, 0.12, 0.55, 10, -21.05, 2.45, 10, 0x38bdf8);

    pushColoredBox(matte, 2.2, 2.8, 12, 22.2, 1.4, 10, 0x1e293b, 0, 0, 0, 0.75);
    pushColoredBox(matte, 0.4, 1.05, 12, 20.9, 0.52, 10, 0xf1f5f9, 0, 0, 0, 0.78);
    pushColoredBox(emissive, 0.12, 0.55, 10, 21.05, 2.45, 10, 0xf59e0b);

    // 4. North Glass Curtain Wall (Z = 23.4) with Brushed Aluminum Mullions
    for (let x = -22; x <= 22; x += 4.4) {
      pushColoredBox(metallic, 0.16, 9.2, 0.24, x, 4.6, 23.4, 0x475569);
    }
    pushColoredBox(metallic, 47, 0.16, 0.22, 0, 3.4, 23.4, 0x475569);
    pushColoredBox(metallic, 47, 0.16, 0.22, 0, 6.4, 23.4, 0x475569);
    pushGlassBox(glass, 20.5, 9.0, 0.06, -12.6, 4.5, 23.4);
    pushGlassBox(glass, 20.5, 9.0, 0.06, 12.6, 4.5, 23.4);
    pushGlassBox(glass, 4.4, 5.8, 0.06, 0, 6.3, 23.4);
    // Automatic sliding glass exit doors + brushed steel portal frame
    pushColoredBox(metallic, 0.14, 3.35, 0.28, -2.25, 1.67, 23.35, 0x94a3b8);
    pushColoredBox(metallic, 0.14, 3.35, 0.28, 2.25, 1.67, 23.35, 0x94a3b8);
    pushGlassBox(glass, 1.35, 3.2, 0.06, -1.7, 1.6, 23.25);
    pushGlassBox(glass, 1.35, 3.2, 0.06, 1.7, 1.6, 23.25);

    // Glowing "ÇIKIŞ • PERONLAR ↑" Portal Sign
    pushColoredBox(metallic, 3.85, 0.78, 0.24, 0, 3.55, 23.1, 0x064e3b);
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

    this.colliders.addBox(-23.5, -7.5, -20.6, 23.5, 'west_ticket');
    this.colliders.addBox(20.6, -7.5, 23.5, 23.5, 'east_ticket');

    // Merge static terminal buckets
    this.scene.add(
      new THREE.Mesh(
        mergeGeometries(matte, false),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.04 })
      )
    );
    this.scene.add(
      new THREE.Mesh(
        mergeGeometries(metallic, false),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.82 })
      )
    );
    this.scene.add(
      new THREE.Mesh(
        mergeGeometries(emissive, false),
        new THREE.MeshBasicMaterial({ vertexColors: true })
      )
    );
    this.scene.add(
      new THREE.Mesh(
        mergeGeometries(glass, false),
        new THREE.MeshStandardMaterial({
          color: 0xa5d8ff,
          transparent: true,
          opacity: 0.26,
          roughness: 0.08,
          metalness: 0.15,
          depthWrite: false
        })
      )
    );

    this._buildDepartureBoard();
    this._buildInstancedPillars();
    this._buildInstancedBenches();
    this._buildInstancedTreesAndBins();
    this._buildInstancedBuses();
  }

  _buildDepartureBoard() {
    const frameGeo = new THREE.BoxGeometry(6.9, 3.3, 0.34);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.32,
      metalness: 0.65
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 5.8, 13.5);
    this.scene.add(frame);

    const scrGeo = new THREE.PlaneGeometry(6.4, 2.9);
    const scrMat = new THREE.MeshBasicMaterial({ map: this.textures.departureTexture });
    const scrFront = new THREE.Mesh(scrGeo, scrMat);
    scrFront.position.set(0, 5.8, 13.31);
    scrFront.rotation.y = Math.PI;
    this.scene.add(scrFront);
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
    // Stepped architectural column with stainless collar base
    const parts = [];
    pushColoredCylinder(parts, 0.42, 0.44, 0.45, 12, 0, 0.22, 0, 0x334155, 0, 0, 0, 0.72);
    pushColoredCylinder(parts, 0.31, 0.33, 8.8, 12, 0, 4.8, 0, 0x475569);
    const geo = mergeGeometries(parts, false);
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.32,
      metalness: 0.75
    });
    const inst = new THREE.InstancedMesh(geo, mat, coords.length);

    for (let i = 0; i < coords.length; i++) {
      const [x, z] = coords[i];
      this._pos.set(x, 0, z);
      this._mat.compose(this._pos, this._quat, this._scale);
      inst.setMatrixAt(i, this._mat);
      this.colliders.addCenteredBox(x, z, 0.85, 0.85, 'pillar');
    }
    inst.instanceMatrix.needsUpdate = true;
    this.scene.add(inst);
  }

  _buildInstancedBenches() {
    // Sleek airport/terminal steel-and-cushion bench (1 draw call)
    const parts = [];
    pushColoredBox(parts, 2.65, 0.07, 0.54, 0, 0.41, 0, 0x94a3b8); // brushed steel beam
    pushColoredCylinder(parts, 0.06, 0.08, 0.4, 8, -1.08, 0.2, 0, 0x64748b, 0, 0, 0, 0.72);
    pushColoredCylinder(parts, 0.06, 0.08, 0.4, 8, 1.08, 0.2, 0, 0x64748b, 0, 0, 0, 0.72);
    pushColoredBox(parts, 0.06, 0.14, 0.48, -1.26, 0.55, 0, 0xcbd5e1); // armrest L
    pushColoredBox(parts, 0.06, 0.14, 0.48, 1.26, 0.55, 0, 0xcbd5e1); // armrest R
    for (let s = -0.9; s <= 0.91; s += 0.6) {
      pushColoredBox(parts, 0.5, 0.08, 0.48, s, 0.48, 0.04, 0x1e3a8a);
      pushColoredBox(parts, 0.5, 0.48, 0.07, s, 0.74, -0.21, 0x1d4ed8, -0.08);
    }

    const benchGeo = mergeGeometries(parts, false);
    const benchMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.42,
      metalness: 0.35
    });

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
        this.colliders.addCenteredBox(x, z, 2.7, 0.66, 'bench');
      } else {
        this.colliders.addCenteredBox(x, z, 0.66, 2.7, 'bench');
      }
    }
    inst.instanceMatrix.needsUpdate = true;
    this.scene.add(inst);
  }

  _buildInstancedTreesAndBins() {
    // 1. Potted Terminal Ficus Trees (1 draw call!)
    const treeParts = [];
    pushColoredCylinder(treeParts, 0.46, 0.38, 0.62, 10, 0, 0.31, 0, 0x334155, 0, 0, 0, 0.72); // charcoal planter
    pushColoredCylinder(treeParts, 0.42, 0.42, 0.04, 10, 0, 0.61, 0, 0x3f2e21); // soil
    pushColoredCylinder(treeParts, 0.06, 0.08, 1.35, 8, 0, 1.25, 0, 0x5c4033); // trunk
    pushColoredSphere(treeParts, 0.58, 9, 8, 0, 2.05, 0, 0x15803d); // center canopy
    pushColoredSphere(treeParts, 0.42, 8, 7, -0.35, 1.85, 0.25, 0x16a34a);
    pushColoredSphere(treeParts, 0.42, 8, 7, 0.35, 1.9, -0.22, 0x22c55e);

    const treeGeo = mergeGeometries(treeParts, false);
    const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 });
    const treeCoords = [
      [-6.8, 3.2],
      [6.8, 3.2],
      [-6.8, 19.8],
      [6.8, 19.8]
    ];
    const treeInst = new THREE.InstancedMesh(treeGeo, treeMat, treeCoords.length);
    this._quat.identity();
    for (let i = 0; i < treeCoords.length; i++) {
      const [x, z] = treeCoords[i];
      this._pos.set(x, 0, z);
      this._mat.compose(this._pos, this._quat, this._scale);
      treeInst.setMatrixAt(i, this._mat);
      this.colliders.addCenteredBox(x, z, 0.9, 0.9, 'planter');
    }
    treeInst.instanceMatrix.needsUpdate = true;
    this.scene.add(treeInst);

    // 2. Modern Stainless Terminal Recycling Bins (1 draw call!)
    const binParts = [];
    pushColoredBox(binParts, 0.9, 0.85, 0.42, 0, 0.42, 0, 0x94a3b8, 0, 0, 0, 0.75);
    pushColoredBox(binParts, 0.26, 0.06, 0.32, -0.28, 0.86, 0, 0x2563eb);
    pushColoredBox(binParts, 0.26, 0.06, 0.32, 0, 0.86, 0, 0x16a34a);
    pushColoredBox(binParts, 0.26, 0.06, 0.32, 0.28, 0.86, 0, 0xfacc15);

    const binGeo = mergeGeometries(binParts, false);
    const binMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.3,
      metalness: 0.65
    });
    const binCoords = [
      [-12.2, 10.5, Math.PI * 0.5],
      [12.2, 10.5, -Math.PI * 0.5],
      [-3.5, 21.8, 0],
      [3.5, 21.8, 0]
    ];
    const binInst = new THREE.InstancedMesh(binGeo, binMat, binCoords.length);
    for (let i = 0; i < binCoords.length; i++) {
      const [x, z, ry] = binCoords[i];
      this._pos.set(x, 0, z);
      this._quat.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, ry);
      this._mat.compose(this._pos, this._quat, this._scale);
      binInst.setMatrixAt(i, this._mat);
      this.colliders.addCenteredBox(x, z, 0.92, 0.55, 'bin');
    }
    binInst.instanceMatrix.needsUpdate = true;
    this.scene.add(binInst);
  }

  _buildInstancedBuses() {
    // Sleek 2026 Intercity Tour Coaches outside glass facade (with wheels, rims, AC roof pods & lights!)
    const bodyParts = [];
    pushColoredBox(bodyParts, 11.4, 2.55, 2.6, 0, 1.82, 0, 0xf8fafc); // main upper hull
    pushColoredBox(bodyParts, 11.2, 0.55, 2.54, 0, 0.72, 0, 0xe2e8f0); // lower skirt
    pushColoredBox(bodyParts, 11.44, 0.28, 2.64, 0, 1.08, 0, 0x0284c7); // teal accent livery
    pushColoredBox(bodyParts, 11.44, 0.1, 2.64, 0, 0.88, 0, 0xdc2626); // red trim stripe
    // Roof AC pods
    pushColoredBox(bodyParts, 2.2, 0.26, 1.8, -1.8, 3.22, 0, 0xe2e8f0);
    pushColoredBox(bodyParts, 2.2, 0.26, 1.8, 1.8, 3.22, 0, 0xe2e8f0);
    // Warm headlights & red taillights
    pushColoredBox(bodyParts, 0.14, 0.26, 0.52, -5.68, 0.92, -0.88, 0xfef08a);
    pushColoredBox(bodyParts, 0.14, 0.26, 0.52, -5.68, 0.92, 0.88, 0xfef08a);
    pushColoredBox(bodyParts, 0.14, 0.45, 0.34, 5.68, 1.05, -0.96, 0xef4444);
    pushColoredBox(bodyParts, 0.14, 0.45, 0.34, 5.68, 1.05, 0.96, 0xef4444);
    // 6 Wheels (black rubber tires + silver alloy rims!)
    for (const wx of [-3.8, 2.6, 4.1]) {
      for (const wz of [-1.22, 1.22]) {
        pushColoredCylinder(bodyParts, 0.52, 0.52, 0.24, 12, wx, 0.52, wz, 0x111827, Math.PI * 0.5);
        pushColoredCylinder(
          bodyParts,
          0.28,
          0.28,
          0.26,
          10,
          wx,
          0.52,
          wz,
          0xcbd5e1,
          Math.PI * 0.5
        );
      }
    }

    const bodyGeo = mergeGeometries(bodyParts, false);
    const bodyMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.32,
      metalness: 0.28
    });
    this.busesMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, 4);

    const winGeo = new THREE.BoxGeometry(10.8, 1.08, 2.66);
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.08,
      metalness: 0.6
    });
    this.busGlassMesh = new THREE.InstancedMesh(winGeo, winMat, 4);

    const busColors = [0xffffff, 0xfef3c7, 0xe0f2fe, 0xf1f5f9];
    const baseConfigs = [
      { x: -14, z: 29.5, speed: 0.0, dir: 1 },
      { x: -2.5, z: 33.5, speed: 0.0, dir: 1 },
      { x: 10.5, z: 29.5, speed: 0.0, dir: -1 },
      { x: -26, z: 38.5, speed: 4.8, dir: 1 }
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

      this._pos.set(cfg.x, 2.32, cfg.z);
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
    const bus = this.busAnimData[3];
    if (bus && this.busesMesh && this.busGlassMesh) {
      bus.x += bus.speed * dt;
      if (bus.x > 34) bus.x = -34;

      this._quat.identity();
      this._pos.set(bus.x, 0, bus.z);
      this._mat.compose(this._pos, this._quat, this._scale);
      this.busesMesh.setMatrixAt(3, this._mat);

      this._pos.set(bus.x, 2.32, bus.z);
      this._mat.compose(this._pos, this._quat, this._scale);
      this.busGlassMesh.setMatrixAt(3, this._mat);

      this.busesMesh.instanceMatrix.needsUpdate = true;
      this.busGlassMesh.instanceMatrix.needsUpdate = true;
    }
  }
}
