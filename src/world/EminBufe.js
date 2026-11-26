import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  pushColoredBox,
  pushColoredCylinder,
  pushColoredSphere,
  pushGlassBox,
  pushSignPlane
} from './MeshBuilder.js';

const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _axisY = new THREE.Vector3(0, 1, 0);
const _tmpColor = new THREE.Color();

/**
 * Full 3D low-poly modeled twin-bay Z13 Emin Büfe (zero flat photo textures).
 * Cashier (Kasa) is positioned accurately directly behind the Pastry Vitrine along the center divider
 * facing the Gum/Lollipop/Chocolate counter and Sofra Bezi island stand, matching all 5 reference photos.
 */
export class EminBufe {
  constructor(scene, textures, colliders) {
    this.scene = scene;
    this.textures = textures;
    this.colliders = colliders;

    // Beverage fridge stock system (48 instanced 3D bottles/cans across Didi & Pepsi fridges)
    this.totalDrinks = 48;
    this.drinksFilled = 48;
    this.drinkSlots = [];
    this.drinksInstanced = null;

    // Interactive Sofra Bezi system (8 cloths on top of stand <-> scattered on floor)
    this.clothCount = 8;
    this.clothItems = [];
    this.clothInstanced = null;
    this.clothMarkerInstanced = null;
    this.clothScattered = false;
    this.clothsCollected = 0;

    // Accurate spatial anchors
    this.cratePos = new THREE.Vector3(4.5, 0, -5.85);
    this.didiFridgePos = new THREE.Vector3(4.55, 0, -1.65);
    this.pepsiFridgePos = new THREE.Vector3(4.55, 0, -3.05);
    this.wifiNotePos = new THREE.Vector3(0.21, 1.46, -1.9);
    this.sofraStandPos = new THREE.Vector3(3.0, 0, -3.75);
    this.counterFrontPos = new THREE.Vector3(2.45, 0, -0.35);

    this._markerPulse = 0;
    this._build();
  }

  _build() {
    const opaque = [];
    const emissive = [];
    const glass = [];
    const signPanels = [];

    // 1. Interior Floor (cream tiles) & Threshold (dark charcoal)
    pushColoredBox(opaque, 10.8, 0.02, 7.3, 0, 0.01, -3.65, 0xe2dfd7);
    pushColoredBox(opaque, 11.0, 0.025, 1.2, 0, 0.012, 0.5, 0x383c42);

    // 2. Drop Ceiling & Interior Walls
    pushColoredBox(opaque, 11.0, 0.25, 7.5, 0, 3.25, -3.7, 0xfafbfd);
    for (const lx of [-3.3, -1.7, 1.7, 3.3]) {
      for (const lz of [-1.8, -4.6]) {
        pushColoredBox(emissive, 0.72, 0.04, 0.72, lx, 3.11, lz, 0xffffff);
      }
    }
    pushColoredBox(opaque, 0.25, 3.2, 7.5, -5.35, 1.6, -3.7, 0xf5f7fa);
    pushColoredBox(opaque, 0.25, 3.2, 7.5, 5.35, 1.6, -3.7, 0xf5f7fa);
    pushColoredBox(opaque, 11.0, 3.2, 0.25, 0, 1.6, -7.25, 0xf5f7fa);

    // Center dividing marble pillar + internal dividing partition (separating Bay 1 & Bay 2 cleanly)
    // Open back passage at Z in [-7.1, -5.65] lets player walk smoothly between both bays!
    pushColoredBox(opaque, 0.22, 3.2, 4.4, 0.0, 1.6, -3.35, 0xf3f4f6);
    this.colliders.addBox(-0.18, -5.6, 0.18, -0.25, 'center_partition');

    // 3. Exterior Twin-Bay Facade (Z = 0)
    for (const cx of [-5.2, 0.0, 5.2]) {
      pushColoredBox(opaque, 0.44, 3.2, 0.46, cx, 1.6, 0, 0x262121);
      // Veined gold-grey marble accent lines
      pushColoredBox(opaque, 0.45, 0.03, 0.47, cx, 1.2, 0, 0x574c45);
      pushColoredBox(opaque, 0.45, 0.03, 0.47, cx, 2.3, 0, 0x574c45);
      this.colliders.addCenteredBox(cx, 0, 0.52, 0.52, 'marble_column');
    }
    // Brushed aluminum shutter boxes + LED under-strip
    pushColoredBox(opaque, 10.9, 0.58, 0.5, 0, 2.95, 0.02, 0xb8bdc2);
    pushColoredBox(emissive, 4.7, 0.05, 0.08, -2.6, 2.65, 0.14, 0xffffff);
    pushColoredBox(emissive, 4.7, 0.05, 0.08, 2.6, 2.65, 0.14, 0xffffff);

    // Z13 Blue Door Plaque & Illuminated EMİN BÜFE Signboard
    pushSignPlane(signPanels, 0.28, 0.16, 0, 2.05, 0.24, 0, 4, 0, {
      u0: 0.04,
      u1: 0.96,
      v0: 0.54,
      v1: 0.96
    });
    pushColoredBox(opaque, 5.6, 1.05, 0.22, 0, 3.72, 0.12, 0x181b22);
    pushSignPlane(signPanels, 5.4, 0.96, 0, 3.72, 0.24, 0, 0);

    // ==================== RIGHT BAY (MAIN GAMEPLAY ZONE) ====================

    // 4. Heated Pastry & Zile Pekmezi Vitrine (X = +1.05, Z = -0.82, facing +Z front)
    this._buildPastryVitrine(opaque, emissive, glass, signPanels);

    // 5. REAL KASA POSITION (Behind Pastry Vitrine along center partition X = +0.18..+1.58!)
    this._buildRealCashierArea(opaque, emissive, signPanels);

    // 6. Phone Accessories Pegboard & Tokat Souvenirs along center divider wall (behind Kasa) + Back Wall
    this._buildPhonePegboardAndSouvenirs(opaque, emissive);

    // 7. Sofra Bezi & Yazma Island Stand (X = +2.95, Z = -3.55, across from Kasa & Gum counter!)
    this._buildSofraBeziStand(opaque);

    // 8. Didi & Pepsi Open-Front Fridges + Kuruyemiş Rack + Water 6-Packs + Back Restock Crate
    this._buildFridgesAndSnacks(opaque, emissive, glass, signPanels);

    // ==================== LEFT BAY (PATOS, TOILETRIES, TOYS, JEWELRY, PHOTOCOPIER) ====================
    this._buildLeftBay(opaque, emissive, glass, signPanels);

    // Merge all static shop buckets into 4 total draw calls!
    this.scene.add(
      new THREE.Mesh(
        mergeGeometries(opaque, false),
        new THREE.MeshLambertMaterial({ vertexColors: true })
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
        new THREE.MeshLambertMaterial({
          color: 0xe0f2fe,
          transparent: true,
          opacity: 0.26,
          depthWrite: false
        })
      )
    );
    this.scene.add(
      new THREE.Mesh(
        mergeGeometries(signPanels, false),
        new THREE.MeshLambertMaterial({
          map: this.textures.signAtlas,
          emissiveMap: this.textures.signAtlas,
          emissive: 0x353535
        })
      )
    );

    // Instanced dynamic gameplay meshes (drinks + interactive cloths)
    this._buildInstancedDrinks();
    this._buildInstancedSofraCloths();
  }

  _buildPastryVitrine(opaque, emissive, glass, signPanels) {
    const vx = 1.05;
    const vz = -0.82;
    // Lower white base & marble top
    pushColoredBox(opaque, 1.48, 0.34, 0.78, vx, 0.17, vz, 0xd8dee6);
    pushColoredBox(opaque, 1.52, 0.06, 0.82, vx, 1.24, vz, 0xf8fafc); // white marble top
    // Frame pillars
    for (const dx of [-0.7, 0.7]) {
      for (const dz of [-0.36, 0.36]) {
        pushColoredBox(opaque, 0.05, 0.88, 0.05, vx + dx, 0.78, vz + dz, 0x94a3b8);
      }
    }
    // Warm amber interior LED glow strip under top
    pushColoredBox(emissive, 1.32, 0.03, 0.12, vx, 1.18, vz, 0xffd27d);
    // 2 Interior glass/metal shelf trays
    pushColoredBox(opaque, 1.36, 0.02, 0.66, vx, 0.66, vz, 0xe2e8f0);
    pushColoredBox(opaque, 1.36, 0.02, 0.66, vx, 0.94, vz, 0xe2e8f0);

    // Modeled 3D Pastries on top & middle shelves (Poğaça, Simit, Tokat Pidesi)
    for (let i = 0; i < 6; i++) {
      const px = vx - 0.52 + i * 0.21;
      // Top shelf: poğaça & börek
      pushColoredSphere(opaque, 0.07, 8, 6, px, 0.99, vz + 0.08, 0xeab308, 0.55);
      pushColoredBox(opaque, 0.14, 0.035, 0.12, px, 0.98, vz - 0.14, 0xd97706);
      // Middle shelf: golden Tokat pidesi ovals
      pushColoredBox(opaque, 0.18, 0.03, 0.28, px, 0.69, vz, 0xca8a04, 0, 0.08);
    }
    // Bottom shelf: stacked Zile Pekmezi tubs (white tubs with yellow lids)
    for (let i = 0; i < 6; i++) {
      const tx = vx - 0.54 + i * 0.21;
      pushColoredCylinder(opaque, 0.075, 0.065, 0.11, 10, tx, 0.4, vz + 0.12, 0xfef9c3);
      pushColoredCylinder(opaque, 0.078, 0.078, 0.025, 10, tx, 0.46, vz + 0.12, 0xfacc15);
      pushColoredCylinder(opaque, 0.075, 0.065, 0.11, 10, tx, 0.4, vz - 0.14, 0xfef9c3);
      pushColoredCylinder(opaque, 0.078, 0.078, 0.025, 10, tx, 0.46, vz - 0.14, 0xd97706);
    }

    // Transparent vitrine glass enclosure
    pushGlassBox(glass, 1.44, 0.86, 0.74, vx, 0.78, vz);

    // On top of marble vitrine: Silver Semaver + Toaster + Napkin Stack
    pushColoredCylinder(opaque, 0.13, 0.14, 0.38, 12, vx - 0.44, 1.46, vz, 0xd8dee6); // semaver drum
    pushColoredCylinder(opaque, 0.09, 0.12, 0.07, 12, vx - 0.44, 1.68, vz, 0x1e293b); // lid
    pushColoredBox(opaque, 0.04, 0.12, 0.04, vx - 0.29, 1.5, vz, 0x111827); // handle
    pushColoredBox(emissive, 0.025, 0.025, 0.025, vx - 0.44, 1.38, vz + 0.14, 0xef4444); // power LED
    // Toaster
    pushColoredBox(opaque, 0.34, 0.12, 0.28, vx + 0.32, 1.33, vz, 0x94a3b8);
    pushColoredBox(opaque, 0.08, 0.04, 0.18, vx + 0.32, 1.4, vz + 0.15, 0x111827); // handle
    // Price list papers on center partition beside vitrine
    pushSignPlane(signPanels, 0.38, 0.48, 0.13, 1.58, -0.82, Math.PI * 0.5, 6);

    // Side white shelf with green Tokat Yaprağı glass jars (X = +1.92)
    pushColoredBox(opaque, 0.32, 0.82, 0.68, 1.92, 0.41, -0.86, 0xe2e8f0);
    for (let j = 0; j < 4; j++) {
      const jz = -1.06 + j * 0.16;
      pushColoredCylinder(opaque, 0.06, 0.06, 0.16, 10, 1.92, 0.91, jz, 0x4d7c0f);
      pushColoredCylinder(opaque, 0.052, 0.052, 0.03, 10, 1.92, 1.0, jz, 0xfacc15);
    }

    this.colliders.addBox(0.32, -1.24, 2.1, -0.4, 'vitrine');
  }

  _buildRealCashierArea(opaque, emissive, signPanels) {
    // Accurate Kasa placement from Photos 1, 3, 4:
    // Tucked immediately behind the pastry vitrine (Z = -1.65 to -3.95) along center wall (X = +0.15..+1.55)
    // White Calacatta marble L-corner desk at Z = -1.65, returning along X = +1.35!
    pushColoredBox(opaque, 1.25, 0.9, 0.48, 0.88, 0.45, -1.72, 0xf1f5f9); // rear of vitrine desk
    pushColoredBox(opaque, 0.5, 0.9, 2.15, 1.44, 0.45, -2.95, 0xf1f5f9); // main counter facing +X aisle
    // White marble L-corner decorative backsplash wall
    pushColoredBox(opaque, 0.06, 1.45, 0.95, 0.14, 0.72, -1.9, 0xf8fafc);

    // Diegetic Wi-Fi Password Note (ONLY clearly visible from inside the Kasa nook!)
    const noteGeo = new THREE.PlaneGeometry(0.4, 0.4);
    const noteMat = new THREE.MeshBasicMaterial({ map: this.textures.wifiNoteTexture });
    const noteMesh = new THREE.Mesh(noteGeo, noteMat);
    noteMesh.position.copy(this.wifiNotePos);
    noteMesh.rotation.y = Math.PI * 0.5;
    this.scene.add(noteMesh);

    // Black ergonomic office chair behind the desk (X = +0.72, Z = -2.28)
    pushColoredCylinder(opaque, 0.22, 0.26, 0.06, 8, 0.72, 0.12, -2.28, 0x1e293b);
    pushColoredCylinder(opaque, 0.035, 0.035, 0.36, 8, 0.72, 0.3, -2.28, 0x475569);
    pushColoredBox(opaque, 0.44, 0.08, 0.44, 0.72, 0.5, -2.28, 0x111827);
    pushColoredBox(opaque, 0.1, 0.62, 0.42, 0.52, 0.85, -2.28, 0x111827);
    pushColoredBox(opaque, 0.08, 0.18, 0.24, 0.52, 1.26, -2.28, 0x111827); // headrest

    // Cashier Monitor (facing -X toward cashier chair!) + POS Terminal
    pushColoredBox(opaque, 0.05, 0.34, 0.5, 1.32, 1.15, -2.25, 0x111827);
    pushColoredBox(emissive, 0.02, 0.28, 0.44, 1.29, 1.15, -2.25, 0x38bdf8); // lit monitor screen
    pushColoredBox(opaque, 0.12, 0.18, 0.12, 1.32, 0.96, -2.25, 0x1f2937);
    // POS Card Terminal
    pushColoredBox(opaque, 0.18, 0.09, 0.12, 1.36, 0.95, -1.85, 0x0f172a);
    pushColoredBox(emissive, 0.06, 0.02, 0.07, 1.34, 1.0, -1.85, 0x22c55e);

    // White Falım gum & lighter cubby box (Photo 4 left of monitor)
    pushColoredBox(opaque, 0.36, 0.44, 0.42, 1.44, 1.12, -2.72, 0xf8fafc);
    const lighterColors = [0xef4444, 0x3b82f6, 0x22c55e, 0xfacc15, 0xa855f7, 0xf97316];
    for (let i = 0; i < 6; i++) {
      // Tiny colorful lighters & gum packs
      pushColoredBox(opaque, 0.06, 0.09, 0.04, 1.56, 1.06, -2.86 + i * 0.055, lighterColors[i]);
      pushColoredBox(opaque, 0.08, 0.05, 0.05, 1.56, 1.24, -2.86 + i * 0.055, lighterColors[(i + 2) % 6]);
    }

    // Lollipop Jar + Glass Candy Bowl + Multi-tier First/Oneo Gum Rack + Chocolate boxes (Photo 4)
    // Yellow lollipop jar with 9 colorful spherical lollipops
    pushColoredCylinder(opaque, 0.1, 0.1, 0.22, 10, 1.46, 1.02, -3.1, 0xfacc15);
    for (let l = 0; l < 7; l++) {
      const a = (l / 7) * Math.PI * 2;
      const lx = 1.46 + Math.cos(a) * 0.05;
      const lz = -3.1 + Math.sin(a) * 0.05;
      pushColoredCylinder(opaque, 0.008, 0.008, 0.12, 6, lx, 1.18, lz, 0xffffff);
      pushColoredSphere(opaque, 0.026, 6, 6, lx, 1.25, lz, lighterColors[l % lighterColors.length]);
    }
    // Multi-tier gum & mint rack (First, Oneo, Vivident)
    for (let tier = 0; tier < 3; tier++) {
      const ty = 0.96 + tier * 0.11;
      const tx = 1.4 - tier * 0.06;
      pushColoredBox(opaque, 0.14, 0.03, 0.72, tx, ty, -3.58, 0x1e293b);
      for (let g = 0; g < 6; g++) {
        pushColoredBox(
          opaque,
          0.08,
          0.06,
          0.09,
          tx + 0.03,
          ty + 0.045,
          -3.86 + g * 0.11,
          lighterColors[(g + tier) % lighterColors.length]
        );
      }
    }
    // Lower counter shelves packed with colorful chocolate display boxes (Ülker, Browni, Albeni, Canga)
    for (let row = 0; row < 2; row++) {
      for (let b = 0; b < 5; b++) {
        pushColoredBox(
          opaque,
          0.14,
          0.16,
          0.26,
          1.64,
          0.28 + row * 0.3,
          -2.45 - b * 0.34,
          lighterColors[(b + row * 2) % lighterColors.length]
        );
      }
    }

    // Walkable Kasa corridor collider:
    // Leaving X in [0.18, 1.18] (1.0m wide!) from Z = -2.0 down to -7.0 completely walkable!
    this.colliders.addBox(1.18, -4.08, 1.72, -1.52, 'kasa_counter');
    this.colliders.addBox(0.14, -1.96, 1.25, -1.46, 'kasa_rear');
    void signPanels;
  }

  _buildPhonePegboardAndSouvenirs(opaque, emissive) {
    // Along center partition X = +0.15 (facing +X directly behind Kasa, Photo 4!)
    // White pegboard (Z = -2.35..-4.15)
    pushColoredBox(opaque, 0.06, 1.45, 1.8, 0.15, 1.85, -3.25, 0xf1f5f9);
    // Orange headphones box at top-left + Turkish flag plaques + white charger/cable blister packs!
    pushColoredBox(opaque, 0.06, 0.24, 0.2, 0.2, 2.32, -2.55, 0xf97316);
    pushColoredBox(opaque, 0.04, 0.22, 0.16, 0.19, 2.58, -3.05, 0xdc2626);
    pushColoredBox(opaque, 0.04, 0.22, 0.16, 0.19, 2.58, -3.45, 0xdc2626);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        const pz = -2.55 - c * 0.26;
        const py = 2.08 - r * 0.28;
        pushColoredBox(opaque, 0.04, 0.2, 0.15, 0.2, py, pz, 0xffffff);
        pushColoredBox(opaque, 0.045, 0.04, 0.12, 0.21, py + 0.06, pz, c % 2 === 0 ? 0x2563eb : 0x16a34a);
      }
    }

    // Red & Blue Trimmed Tokat Souvenirs Wall Shelves (Z = -4.25..-5.55 on divider + Back wall Z = -6.9)
    pushColoredBox(opaque, 0.24, 2.2, 1.3, 0.22, 1.35, -4.9, 0xe2e8f0);
    for (const sy of [1.1, 1.55, 2.0]) {
      pushColoredBox(opaque, 0.26, 0.04, 1.32, 0.23, sy, -4.9, sy > 1.8 ? 0xdc2626 : 0x2563eb);
      for (let s = 0; s < 4; s++) {
        // Mugs, snow globes, wooden Tokat plaques
        const sz = -4.45 - s * 0.28;
        if (s % 2 === 0) {
          pushColoredCylinder(opaque, 0.055, 0.055, 0.12, 10, 0.24, sy + 0.09, sz, 0xf8fafc);
          pushColoredSphere(opaque, 0.06, 8, 6, 0.24, sy + 0.16, sz, 0x93c5fd);
        } else {
          pushColoredBox(opaque, 0.1, 0.18, 0.16, 0.24, sy + 0.12, sz, 0x92400e);
        }
      }
    }

    // Back wall shelves (Z = -6.95, X = +0.5..+3.8)
    pushColoredBox(opaque, 3.2, 2.3, 0.36, 2.1, 1.3, -6.98, 0xe2e8f0);
    for (const sy of [0.85, 1.4, 1.95]) {
      pushColoredBox(opaque, 3.2, 0.04, 0.38, 2.1, sy, -6.96, sy > 1.6 ? 0xdc2626 : 0x2563eb);
      for (let x = 0.75; x <= 3.45; x += 0.38) {
        pushColoredBox(opaque, 0.22, 0.24, 0.16, x, sy + 0.15, -6.92, x > 2.2 ? 0x92400e : 0x3b82f6);
      }
    }
    void emissive;
  }

  _buildSofraBeziStand(opaque) {
    // Center-right island stand (X = +3.0, Z = -3.75) — Photo 3
    const sx = 3.0;
    const sz = -3.75;
    pushColoredBox(opaque, 0.78, 0.92, 1.65, sx, 0.46, sz, 0xf8fafc);
    // Horizontal shelves recessed along sides with dozens of Eti/Ülker biscuit packages
    const biscuitColors = [0xd97706, 0x111827, 0x16a34a, 0xfacc15, 0xb91c1c, 0x2563eb];
    for (let tier = 0; tier < 3; tier++) {
      const ty = 0.18 + tier * 0.24;
      pushColoredBox(opaque, 0.82, 0.03, 1.62, sx, ty, sz, 0xe2e8f0);
      for (let b = 0; b < 7; b++) {
        const bz = sz - 0.68 + b * 0.22;
        const c = biscuitColors[(b + tier) % biscuitColors.length];
        pushColoredBox(opaque, 0.14, 0.14, 0.18, sx - 0.35, ty + 0.09, bz, c);
        pushColoredBox(opaque, 0.14, 0.14, 0.18, sx + 0.35, ty + 0.09, bz, c);
      }
    }

    // Hanging Tesbih Bead Board on front end (+Z side of stand, Photo 3 right side!)
    pushColoredBox(opaque, 0.72, 0.76, 0.04, sx, 0.5, sz + 0.84, 0xd6cfc2);
    const beadColors = [0x111827, 0x78350f, 0xd97706, 0x475569, 0x1e3a8a];
    for (let col = 0; col < 7; col++) {
      const bx = sx - 0.27 + col * 0.09;
      pushColoredBox(opaque, 0.025, 0.44, 0.025, bx, 0.54, sz + 0.87, beadColors[col % beadColors.length]);
      pushColoredSphere(opaque, 0.022, 6, 6, bx, 0.3, sz + 0.87, 0x94a3b8); // tassel
    }

    this.colliders.addCenteredBox(sx, sz, 0.84, 1.72, 'sofra_stand');
  }

  _buildFridgesAndSnacks(opaque, emissive, glass, signPanels) {
    // Open-front cabinets so the 48 instanced 3D drinks inside are completely visible!
    const buildOpenFridge = (fz, frameColor, innerColor) => {
      pushColoredBox(opaque, 0.08, 2.08, 0.78, 4.98, 1.04, fz, frameColor);
      pushColoredBox(opaque, 0.78, 2.08, 0.06, 4.63, 1.04, fz - 0.36, frameColor);
      pushColoredBox(opaque, 0.78, 2.08, 0.06, 4.63, 1.04, fz + 0.36, frameColor);
      pushColoredBox(opaque, 0.78, 0.26, 0.78, 4.63, 0.13, fz, frameColor);
      pushColoredBox(opaque, 0.78, 0.44, 0.78, 4.63, 1.86, fz, frameColor);
      pushColoredBox(emissive, 0.04, 1.4, 0.56, 4.92, 0.96, fz, innerColor);
      for (const sy of [0.27, 0.61, 0.95, 1.29]) {
        pushColoredBox(opaque, 0.56, 0.025, 0.64, 4.59, sy, fz, 0xe2e8f0);
      }
    };

    // Didi Fridge (X = +4.63, Z = -1.65)
    buildOpenFridge(-1.65, 0x1565c0, 0x1e3a5f);
    pushSignPlane(signPanels, 0.72, 0.34, 4.23, 1.86, -1.65, -Math.PI * 0.5, 1);
    pushGlassBox(glass, 0.03, 1.4, 0.66, 4.24, 0.96, -1.65);

    // 3D Modeled Magnets & Keychains covering Didi fridge's front-facing +Z side! (Photo 1)
    const magColors = [0xef4444, 0xfacc15, 0x22c55e, 0xf8fafc, 0x38bdf8, 0xf97316];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        pushColoredBox(
          opaque,
          0.08,
          0.11,
          0.025,
          4.35 + c * 0.13,
          1.52 - r * 0.18,
          -1.25,
          magColors[(r * 3 + c) % magColors.length]
        );
      }
    }

    // Pepsi Fridge (X = +4.63, Z = -3.05)
    buildOpenFridge(-3.05, 0x111827, 0x1f2937);
    pushSignPlane(signPanels, 0.72, 0.34, 4.23, 1.86, -3.05, -Math.PI * 0.5, 2);
    pushGlassBox(glass, 0.03, 1.4, 0.66, 4.24, 0.96, -3.05);

    this.colliders.addBox(4.18, -3.5, 5.1, -1.2, 'fridges');

    // Modeled 0.5L Water 6-Pack Bottles beside Didi fridge (Photo 1)
    for (let wx = 0; wx < 3; wx++) {
      for (let wz = 0; wz < 4; wz++) {
        const bx = 3.85 + wx * 0.095;
        const bz = -0.95 + wz * 0.095;
        pushColoredCylinder(opaque, 0.036, 0.038, 0.22, 8, bx, 0.12, bz, 0xe0f2fe);
        pushColoredCylinder(opaque, 0.02, 0.02, 0.03, 8, bx, 0.24, bz, 0xdc2626); // red cap
      }
    }

    // Red Kuruyemiş Wire Rack (X = +4.8, Z = -0.55) with 12 colorful nut bags!
    pushColoredBox(opaque, 0.44, 1.62, 0.04, 4.8, 0.81, -0.78, 0xb91c1c);
    pushColoredBox(opaque, 0.44, 1.62, 0.04, 4.8, 0.81, -0.32, 0xb91c1c);
    for (let tier = 0; tier < 4; tier++) {
      const ty = 0.36 + tier * 0.34;
      pushColoredBox(opaque, 0.38, 0.025, 0.46, 4.8, ty, -0.55, 0xdc2626);
      for (let k = 0; k < 3; k++) {
        pushColoredBox(
          opaque,
          0.08,
          0.19,
          0.11,
          4.65,
          ty + 0.12,
          -0.68 + k * 0.13,
          magColors[(tier + k) % magColors.length]
        );
      }
    }
    this.colliders.addCenteredBox(4.8, -0.55, 0.5, 0.56, 'nuts_rack');

    // Back Depot / İçecek Kasası + TENO carton (X = +4.5, Z = -5.85)
    pushColoredBox(opaque, 0.7, 0.42, 0.54, 4.5, 0.21, -5.85, 0x1d4ed8);
    for (let cx = 0; cx < 4; cx++) {
      for (let cz = 0; cz < 3; cz++) {
        pushColoredCylinder(
          opaque,
          0.04,
          0.04,
          0.22,
          8,
          4.28 + cx * 0.14,
          0.46,
          -5.98 + cz * 0.13,
          (cx + cz) % 2 === 0 ? 0x38bdf8 : 0x16a34a
        );
      }
    }
    pushColoredBox(opaque, 0.72, 0.52, 0.52, 4.5, 0.26, -6.5, 0xb48a5a);
    pushSignPlane(signPanels, 0.66, 0.34, 4.5, 0.32, -6.23, 0, 7, 0, {
      u0: 0.05,
      u1: 0.95,
      v0: 0.04,
      v1: 0.46
    });
    this.colliders.addCenteredBox(4.5, -6.1, 0.85, 1.25, 'restock_crate');
  }

  _buildLeftBay(opaque, emissive, glass, signPanels) {
    // 1. Red Patos Chips Stand (X = -4.45, Z = -0.35)
    pushColoredBox(opaque, 0.56, 1.66, 0.44, -4.45, 0.83, -0.35, 0xb91c1c);
    pushSignPlane(signPanels, 0.54, 0.4, -4.45, 1.54, -0.11, 0, 3);
    const chipColors = [0x16a34a, 0xdc2626, 0xfacc15, 0x2563eb];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        pushColoredBox(opaque, 0.13, 0.22, 0.08, -4.6 + c * 0.15, 0.45 + r * 0.32, -0.13, chipColors[(r + c) % 4]);
      }
    }

    // 2. Yellow Yupo Candy Stand (X = -3.72, Z = -0.38)
    pushColoredBox(opaque, 0.48, 1.38, 0.42, -3.72, 0.69, -0.38, 0xeab308);
    pushSignPlane(signPanels, 0.44, 0.28, -3.72, 1.25, -0.16, 0, 4, 0, {
      u0: 0.05,
      u1: 0.95,
      v0: 0.04,
      v1: 0.46
    });
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        pushColoredBox(opaque, 0.11, 0.16, 0.07, -3.84 + c * 0.12, 0.38 + r * 0.26, -0.16, chipColors[(r + c + 1) % 4]);
      }
    }
    this.colliders.addBox(-4.78, -0.66, -3.4, -0.05, 'patos_yupo');

    // 3. Chrome Keychain Spinner (X = -3.05, Z = -0.45)
    pushColoredCylinder(opaque, 0.025, 0.025, 1.48, 8, -3.05, 0.74, -0.45, 0xcbd5e1);
    pushColoredBox(opaque, 0.34, 0.04, 0.34, -3.05, 0.02, -0.45, 0x64748b);
    for (let h = 0; h < 2; h++) {
      pushColoredCylinder(opaque, 0.16, 0.16, 0.02, 10, -3.05, 1.05 + h * 0.32, -0.45, 0x94a3b8);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        pushColoredBox(
          opaque,
          0.03,
          0.12,
          0.03,
          -3.05 + Math.cos(a) * 0.14,
          0.96 + h * 0.32,
          -0.45 + Math.sin(a) * 0.14,
          chipColors[k % 4]
        );
      }
    }

    // 4. White Pusula Display Pillar (X = -0.68, Z = -0.65)
    pushColoredBox(opaque, 0.46, 1.5, 0.48, -0.68, 0.75, -0.65, 0xf8fafc);
    pushSignPlane(signPanels, 0.44, 0.48, -0.68, 1.22, -0.4, 0, 5);
    this.colliders.addCenteredBox(-0.68, -0.65, 0.52, 0.54, 'pusula');

    // 5. Left Wall Shelves with Blue/Red Trim, 3 Plush Bears, Toiletries & Toys (Photo 5)
    pushColoredBox(opaque, 0.46, 2.55, 4.4, -4.96, 1.28, -3.35, 0xf1f5f9);
    for (let sy = 0; sy < 4; sy++) {
      const y = 0.58 + sy * 0.48;
      // Left section blue trim, right section red trim!
      pushColoredBox(opaque, 0.48, 0.04, 1.65, -4.94, y, -1.95, 0x2563eb);
      pushColoredBox(opaque, 0.48, 0.04, 2.55, -4.94, y, -4.15, 0xdc2626);
      // Toiletries (Elidor shampoos, Teno packs, Colgate)
      for (let pz = -1.25; pz >= -2.6; pz -= 0.24) {
        pushColoredCylinder(
          opaque,
          0.04,
          0.045,
          0.22,
          8,
          -4.82,
          y + 0.13,
          pz,
          sy === 0 ? 0xf97316 : sy === 1 ? 0x16a34a : 0x38bdf8
        );
      }
      // Boxed kids toys (yellow sports cars, trucks, dolls)
      for (let tz = -3.05; tz >= -5.2; tz -= 0.42) {
        pushColoredBox(opaque, 0.22, 0.24, 0.34, -4.82, y + 0.14, tz, tz < -4.2 ? 0xfacc15 : 0x3b82f6);
      }
    }
    // 3 Modeled Plush Teddy Bears on very top shelf (Photo 5 top-left!)
    const bearColors = [0x27272a, 0x3f3f46, 0x1e3a8a];
    for (let b = 0; b < 3; b++) {
      const bz = -1.45 - b * 0.45;
      pushColoredSphere(opaque, 0.16, 8, 8, -4.84, 2.74, bz, bearColors[b]); // torso
      pushColoredSphere(opaque, 0.12, 8, 8, -4.84, 2.98, bz, bearColors[b]); // head
      pushColoredSphere(opaque, 0.045, 6, 6, -4.84, 3.09, bz - 0.09, bearColors[b]); // ear L
      pushColoredSphere(opaque, 0.045, 6, 6, -4.84, 3.09, bz + 0.09, bearColors[b]); // ear R
    }
    // Teno cardboard box top right
    pushColoredBox(opaque, 0.42, 0.38, 0.66, -4.86, 2.76, -4.35, 0xb48a5a);
    this.colliders.addBox(-5.2, -5.65, -4.55, -1.1, 'left_shelves');

    // 6. Glass Jewelry/Watch Counter + Lokum Boxes + Yaprak Jars (X = -3.35, Z = -2.65)
    pushColoredBox(opaque, 0.7, 0.72, 2.2, -3.35, 0.36, -2.65, 0xf8fafc);
    pushGlassBox(glass, 0.68, 0.24, 2.16, -3.35, 0.84, -2.65);
    // Watches/Wallets display trays inside glass top
    for (let wz = -3.45; wz <= -1.85; wz += 0.38) {
      pushColoredBox(opaque, 0.48, 0.03, 0.28, -3.35, 0.74, wz, 0x1e293b);
      pushColoredCylinder(opaque, 0.035, 0.035, 0.02, 8, -3.35, 0.77, wz, 0xfacc15);
    }
    // Lower Lokum boxes & green Tokat Yaprağı jars along floor
    for (let lz = -3.4; lz <= -1.9; lz += 0.42) {
      pushColoredBox(opaque, 0.4, 0.14, 0.3, -3.16, 0.44, lz, lz < -2.7 ? 0xdc2626 : 0xfacc15);
      pushColoredCylinder(opaque, 0.07, 0.07, 0.18, 8, -2.92, 0.1, lz, 0x4d7c0f);
    }

    // 7. Photocopier Machine (X = -3.35, Z = -4.55) with 10₺ / 20₺ price sign
    pushColoredBox(opaque, 0.76, 0.62, 0.76, -3.35, 0.31, -4.55, 0xf1f5f9); // cabinet stand
    pushColoredBox(opaque, 0.72, 0.46, 0.72, -3.35, 0.85, -4.55, 0xe7e2d6); // copier body
    pushColoredBox(opaque, 0.68, 0.08, 0.68, -3.35, 1.12, -4.55, 0xd6d1c4); // scanner lid
    pushColoredBox(emissive, 0.08, 0.03, 0.18, -2.98, 1.04, -4.35, 0x38bdf8); // LCD panel
    pushSignPlane(signPanels, 0.38, 0.22, -2.98, 0.86, -4.55, Math.PI * 0.5, 7, 0, {
      u0: 0.04,
      u1: 0.96,
      v0: 0.54,
      v1: 0.96
    });
    this.colliders.addBox(-3.78, -5.0, -2.92, -1.5, 'jewelry_copier');
  }

  _buildInstancedDrinks() {
    const geo = new THREE.CylinderGeometry(0.036, 0.038, 0.16, 8);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.drinksInstanced = new THREE.InstancedMesh(geo, mat, this.totalDrinks);

    const palette = [0x1d4ed8, 0xf97316, 0x38bdf8, 0x16a34a, 0xdc2626, 0xe0f2fe];
    const fridgeZs = [-1.65, -3.05];
    const shelfYs = [0.36, 0.7, 1.04, 1.38];
    let idx = 0;

    for (let f = 0; f < 2; f++) {
      const fz = fridgeZs[f];
      for (let sy = 0; sy < shelfYs.length; sy++) {
        const y = shelfYs[sy];
        for (let row = 0; row < 2; row++) {
          const x = 4.36 + row * 0.14;
          for (let col = 0; col < 3; col++) {
            const z = fz - 0.18 + col * 0.18;
            this.drinkSlots.push({ x, y, z, filled: true });
            _tmpColor.setHex(palette[(sy * 2 + col + f) % palette.length]);
            this.drinksInstanced.setColorAt(idx, _tmpColor);
            idx++;
          }
        }
      }
    }
    this.drinksInstanced.instanceColor.needsUpdate = true;
    this._syncDrinkMatrices();
    this.scene.add(this.drinksInstanced);
  }

  _syncDrinkMatrices() {
    _quat.identity();
    for (let i = 0; i < this.drinkSlots.length; i++) {
      const d = this.drinkSlots[i];
      _pos.set(d.x, d.y, d.z);
      if (d.filled) _scale.set(1, 1, 1);
      else _scale.set(0.0001, 0.0001, 0.0001);
      _mat.compose(_pos, _quat, _scale);
      this.drinksInstanced.setMatrixAt(i, _mat);
    }
    this.drinksInstanced.instanceMatrix.needsUpdate = true;
  }

  consumeDrink(amount = 1) {
    let removed = 0;
    for (let i = this.drinkSlots.length - 1; i >= 0 && removed < amount; i--) {
      if (this.drinkSlots[i].filled) {
        this.drinkSlots[i].filled = false;
        this.drinksFilled--;
        removed++;
      }
    }
    if (removed > 0) this._syncDrinkMatrices();
    return this.getFridgeFillPercent();
  }

  refillAllDrinks() {
    for (let i = 0; i < this.drinkSlots.length; i++) {
      this.drinkSlots[i].filled = true;
    }
    this.drinksFilled = this.totalDrinks;
    this._syncDrinkMatrices();
  }

  getFridgeFillPercent() {
    return (this.drinksFilled / this.totalDrinks) * 100;
  }

  _buildInstancedSofraCloths() {
    const clothGeo = new THREE.BoxGeometry(0.36, 0.075, 0.34);
    const clothMat = new THREE.MeshLambertMaterial({ map: this.textures.clothAtlas });
    this.clothInstanced = new THREE.InstancedMesh(clothGeo, clothMat, this.clothCount);

    const markerGeo = new THREE.RingGeometry(0.24, 0.32, 20);
    markerGeo.rotateX(-Math.PI * 0.5);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    this.clothMarkerInstanced = new THREE.InstancedMesh(markerGeo, markerMat, this.clothCount);

    // Folded neatly on top of Sofra Stand (X = +3.0, Z = -3.75)
    const homeSlots = [
      [2.8, 0.96, -4.25, 0.05],
      [2.8, 1.04, -4.25, -0.04],
      [3.2, 0.96, -4.25, -0.03],
      [3.2, 1.04, -4.25, 0.06],
      [2.8, 0.96, -3.3, 0.02],
      [2.8, 1.04, -3.3, -0.05],
      [3.2, 0.96, -3.3, -0.02],
      [3.2, 1.04, -3.3, 0.04]
    ];

    // Scattered across walkable Right Bay & front floor
    const scatterSlots = [
      [2.3, 0.05, -2.4, 0.6],
      [3.4, 0.05, -1.7, 1.4],
      [2.6, 0.05, -0.2, 2.2],
      [3.6, 0.05, 0.7, -0.7],
      [1.3, 0.05, 1.1, 0.9],
      [-0.4, 0.05, 0.8, 1.8],
      [-1.7, 0.05, -1.1, -1.1],
      [2.1, 0.05, -5.3, 0.3]
    ];

    const tintPalette = [
      0xffffff,
      0xfef08a,
      0xe9d5ff,
      0x93c5fd,
      0xfca5a5,
      0xd9f99d,
      0xfde68a,
      0xf5d0fe
    ];

    for (let i = 0; i < this.clothCount; i++) {
      this.clothItems.push({
        homeX: homeSlots[i][0],
        homeY: homeSlots[i][1],
        homeZ: homeSlots[i][2],
        homeRy: homeSlots[i][3],
        scatterX: scatterSlots[i][0],
        scatterY: scatterSlots[i][1],
        scatterZ: scatterSlots[i][2],
        scatterRy: scatterSlots[i][3],
        collected: true
      });
      _tmpColor.setHex(tintPalette[i % tintPalette.length]);
      this.clothInstanced.setColorAt(i, _tmpColor);
    }
    this.clothInstanced.instanceColor.needsUpdate = true;
    this._syncClothMatrices();

    this.scene.add(this.clothInstanced);
    this.scene.add(this.clothMarkerInstanced);
  }

  scatterSofraCloths() {
    this.clothScattered = true;
    this.clothsCollected = 0;
    for (let i = 0; i < this.clothItems.length; i++) {
      this.clothItems[i].collected = false;
    }
    this._syncClothMatrices();
  }

  collectCloth(index) {
    const item = this.clothItems[index];
    if (!item || item.collected) return false;
    item.collected = true;
    this.clothsCollected++;
    if (this.clothsCollected >= this.clothCount) {
      this.clothScattered = false;
    }
    this._syncClothMatrices();
    return true;
  }

  _syncClothMatrices() {
    for (let i = 0; i < this.clothItems.length; i++) {
      const c = this.clothItems[i];
      if (c.collected) {
        _pos.set(c.homeX, c.homeY, c.homeZ);
        _quat.setFromAxisAngle(_axisY, c.homeRy);
        _scale.set(1, 1, 1);
        _mat.compose(_pos, _quat, _scale);
        this.clothInstanced.setMatrixAt(i, _mat);

        _pos.set(0, -10, 0);
        _scale.set(0.0001, 0.0001, 0.0001);
        _mat.compose(_pos, _quat, _scale);
        this.clothMarkerInstanced.setMatrixAt(i, _mat);
      } else {
        _pos.set(c.scatterX, c.scatterY, c.scatterZ);
        _quat.setFromAxisAngle(_axisY, c.scatterRy);
        _scale.set(1.12, 0.9, 1.12);
        _mat.compose(_pos, _quat, _scale);
        this.clothInstanced.setMatrixAt(i, _mat);
      }
    }
    this.clothInstanced.instanceMatrix.needsUpdate = true;
    this.clothMarkerInstanced.instanceMatrix.needsUpdate = true;
  }

  update(dt) {
    if (!this.clothScattered) return;
    this._markerPulse += dt * 4.5;
    const s = 1.0 + Math.sin(this._markerPulse) * 0.16;

    for (let i = 0; i < this.clothItems.length; i++) {
      const c = this.clothItems[i];
      if (c.collected) continue;
      _pos.set(c.scatterX, 0.035, c.scatterZ);
      _quat.identity();
      _scale.set(s, 1, s);
      _mat.compose(_pos, _quat, _scale);
      this.clothMarkerInstanced.setMatrixAt(i, _mat);
    }
    this.clothMarkerInstanced.instanceMatrix.needsUpdate = true;
  }
}
