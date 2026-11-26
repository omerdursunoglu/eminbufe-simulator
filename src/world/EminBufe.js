import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  pushColoredBox,
  pushColoredCylinder,
  pushColoredSphere,
  pushColoredTorus,
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
 * Studio-grade 3D low-poly modeled twin-bay Z13 Emin Büfe:
 * PBR matte/metallic separation, baked vertex Ambient Occlusion, Calacatta & Emperador marble,
 * sculpted hero Semaver/Toaster/Pastries/Bottles/Teddy Bears/Toys/Photocopier, and accurate Kasa placement.
 */
export class EminBufe {
  constructor(scene, textures, colliders) {
    this.scene = scene;
    this.textures = textures;
    this.colliders = colliders;

    this.totalDrinks = 48;
    this.drinksFilled = 48;
    this.drinkSlots = [];
    this.drinksInstanced = null;

    this.clothCount = 8;
    this.clothItems = [];
    this.clothInstanced = null;
    this.clothMarkerInstanced = null;
    this.clothScattered = false;
    this.clothsCollected = 0;

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
    const matte = [];
    const metallic = [];
    const emissive = [];
    const glass = [];
    const signPanels = [];

    // 1. Interior Floor (cream tiles) & Threshold (dark charcoal)
    pushColoredBox(matte, 10.8, 0.02, 7.3, 0, 0.01, -3.65, 0xe2dfd7);
    pushColoredBox(matte, 11.0, 0.025, 1.2, 0, 0.012, 0.5, 0x383c42);

    // 2. Drop Ceiling & Interior Walls (with subtle bottom AO)
    pushColoredBox(matte, 11.0, 0.25, 7.5, 0, 3.25, -3.7, 0xfafbfd);
    for (const lx of [-3.3, -1.7, 1.7, 3.3]) {
      for (const lz of [-1.8, -4.6]) {
        pushColoredBox(emissive, 0.72, 0.04, 0.72, lx, 3.11, lz, 0xffffff);
      }
    }
    pushColoredBox(matte, 0.25, 3.2, 7.5, -5.35, 1.6, -3.7, 0xf5f7fa, 0, 0, 0, 0.78);
    pushColoredBox(matte, 0.25, 3.2, 7.5, 5.35, 1.6, -3.7, 0xf5f7fa, 0, 0, 0, 0.78);
    pushColoredBox(matte, 11.0, 3.2, 0.25, 0, 1.6, -7.25, 0xf5f7fa, 0, 0, 0, 0.78);

    // Center dividing partition between Left Bay & Right Bay (open back aisle Z < -5.6)
    pushColoredBox(matte, 0.22, 3.2, 4.4, 0.0, 1.6, -3.35, 0xf3f4f6, 0, 0, 0, 0.78);
    this.colliders.addBox(-0.18, -5.6, 0.18, -0.25, 'center_partition');

    // 3. Exterior Twin-Bay Facade with Dark Emperador Marble Columns & Brushed Aluminum Shutter Boxes
    for (const cx of [-5.2, 0.0, 5.2]) {
      pushColoredBox(matte, 0.44, 3.2, 0.46, cx, 1.6, 0, 0x231f20, 0, 0, 0, 0.75);
      // Veined marble fronts via signAtlas tile 9
      pushSignPlane(signPanels, 0.44, 3.18, cx, 1.6, 0.235, 0, 9);
      pushSignPlane(signPanels, 0.44, 3.18, cx - 0.225, 1.6, 0, -Math.PI * 0.5, 9);
      pushSignPlane(signPanels, 0.44, 3.18, cx + 0.225, 1.6, 0, Math.PI * 0.5, 9);
      this.colliders.addCenteredBox(cx, 0, 0.52, 0.52, 'marble_column');
    }

    // Metallic brushed aluminum shutter boxes + LED under-strip
    pushColoredBox(metallic, 10.9, 0.58, 0.5, 0, 2.95, 0.02, 0xc4c9cf);
    pushColoredBox(emissive, 4.7, 0.05, 0.08, -2.6, 2.65, 0.14, 0xffffff);
    pushColoredBox(emissive, 4.7, 0.05, 0.08, 2.6, 2.65, 0.14, 0xffffff);

    // Z13 Blue Plaque + EMİN BÜFE Illuminated Fascia Sign
    pushSignPlane(signPanels, 0.28, 0.16, 0, 2.05, 0.242, 0, 4, 0, {
      u0: 0.04,
      u1: 0.96,
      v0: 0.54,
      v1: 0.96
    });
    pushColoredBox(metallic, 5.65, 1.08, 0.24, 0, 3.72, 0.12, 0x1e293b);
    pushSignPlane(signPanels, 5.4, 0.96, 0, 3.72, 0.245, 0, 0);

    // ==================== RIGHT BAY (MAIN GAMEPLAY ZONE) ====================
    this._buildPastryVitrine(matte, metallic, emissive, glass, signPanels);
    this._buildRealCashierArea(matte, metallic, emissive, glass, signPanels);
    this._buildPhonePegboardAndSouvenirs(matte, metallic, glass, signPanels);
    this._buildSofraBeziStand(matte, metallic);
    this._buildFridgesAndSnacks(matte, metallic, emissive, glass, signPanels);

    // ==================== LEFT BAY ====================
    this._buildLeftBay(matte, metallic, emissive, glass, signPanels);

    // Merge static shop geometry buckets
    this.scene.add(
      new THREE.Mesh(
        mergeGeometries(matte, false),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.05 })
      )
    );
    this.scene.add(
      new THREE.Mesh(
        mergeGeometries(metallic, false),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.24, metalness: 0.84 })
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
          color: 0xe0f2fe,
          transparent: true,
          opacity: 0.24,
          roughness: 0.06,
          metalness: 0.18,
          depthWrite: false
        })
      )
    );
    this.scene.add(
      new THREE.Mesh(
        mergeGeometries(signPanels, false),
        new THREE.MeshStandardMaterial({
          map: this.textures.signAtlas,
          emissiveMap: this.textures.signAtlas,
          emissive: 0x262626,
          roughness: 0.35,
          metalness: 0.08
        })
      )
    );

    this._buildInstancedDrinks();
    this._buildInstancedSofraCloths();
  }

  _buildPastryVitrine(matte, metallic, emissive, glass, signPanels) {
    const vx = 1.05;
    const vz = -0.82;
    // Stainless base & Calacatta marble top
    pushColoredBox(metallic, 1.48, 0.34, 0.78, vx, 0.17, vz, 0xd8dee6, 0, 0, 0, 0.72);
    pushColoredBox(matte, 1.52, 0.06, 0.82, vx, 1.24, vz, 0xf8fafc);
    pushSignPlane(signPanels, 1.5, 0.8, vx, 1.272, vz, 0, 10, -Math.PI * 0.5); // Calacatta marble top!

    for (const dx of [-0.7, 0.7]) {
      for (const dz of [-0.36, 0.36]) {
        pushColoredBox(metallic, 0.05, 0.88, 0.05, vx + dx, 0.78, vz + dz, 0xb8c2cc);
      }
    }
    pushColoredBox(emissive, 1.32, 0.03, 0.12, vx, 1.18, vz, 0xffd27d);
    pushColoredBox(metallic, 1.36, 0.02, 0.66, vx, 0.66, vz, 0xe2e8f0);
    pushColoredBox(metallic, 1.36, 0.02, 0.66, vx, 0.94, vz, 0xe2e8f0);

    // Sculpted 3D Pastries (Sesame Simits, Scored Tokat Pidesi, Poğaça)
    for (let i = 0; i < 6; i++) {
      const px = vx - 0.52 + i * 0.21;
      // Top shelf: crispy ring Simits & golden Poğaça
      pushColoredTorus(matte, 0.058, 0.022, 6, 12, px, 0.975, vz + 0.14, 0xd97706, Math.PI * 0.42);
      pushColoredSphere(matte, 0.062, 8, 6, px, 0.985, vz - 0.12, 0xeab308, 0.58);
      // Middle shelf: Tokat Pidesi (golden crust + cheese/sucuk center)
      pushColoredBox(matte, 0.17, 0.026, 0.32, px, 0.685, vz, 0xb45309, 0, 0.06);
      pushColoredBox(matte, 0.11, 0.014, 0.22, px, 0.702, vz, 0xfef08a, 0, 0.06);
    }

    // Bottom shelf: Zile Pekmezi tubs with gold label bands
    for (let i = 0; i < 6; i++) {
      const tx = vx - 0.54 + i * 0.21;
      for (const tz of [vz + 0.14, vz - 0.14]) {
        pushColoredCylinder(matte, 0.074, 0.064, 0.11, 10, tx, 0.4, tz, 0xfefce8);
        pushColoredCylinder(matte, 0.076, 0.076, 0.04, 10, tx, 0.4, tz, 0xd97706); // band
        pushColoredCylinder(matte, 0.078, 0.078, 0.024, 10, tx, 0.46, tz, 0xfacc15); // lid
      }
    }

    pushGlassBox(glass, 1.44, 0.86, 0.74, vx, 0.78, vz);

    // HERO SEMAVER / ÇAY MAKİNESİ (pedestal, brushed steel urn, curved tap, side handles, glass demlik!)
    const sx = vx - 0.44;
    pushColoredCylinder(metallic, 0.15, 0.16, 0.05, 14, sx, 1.295, vz, 0x334155); // base
    pushColoredCylinder(metallic, 0.13, 0.14, 0.36, 16, sx, 1.5, vz, 0xe2e8f0); // stainless urn
    pushColoredCylinder(metallic, 0.135, 0.135, 0.03, 16, sx, 1.68, vz, 0x94a3b8); // top collar
    // Tap spigot + lever
    pushColoredCylinder(metallic, 0.015, 0.015, 0.08, 8, sx, 1.39, vz + 0.16, 0xcbd5e1, Math.PI * 0.5);
    pushColoredBox(matte, 0.025, 0.05, 0.025, sx, 1.42, vz + 0.19, 0x111827);
    // Side handles
    pushColoredTorus(matte, 0.045, 0.012, 6, 10, sx - 0.14, 1.54, vz, 0x1e293b, 0, Math.PI * 0.5);
    pushColoredTorus(matte, 0.045, 0.012, 6, 10, sx + 0.14, 1.54, vz, 0x1e293b, 0, Math.PI * 0.5);
    // Top glass teapot (demlik) with dark tea inside
    pushColoredCylinder(matte, 0.075, 0.09, 0.09, 12, sx, 1.74, vz, 0x7f1d1d);
    pushGlassBox(glass, 0.19, 0.14, 0.19, sx, 1.76, vz);
    pushColoredCylinder(metallic, 0.06, 0.08, 0.03, 10, sx, 1.84, vz, 0x1e293b);
    pushColoredBox(emissive, 0.025, 0.025, 0.025, sx, 1.38, vz + 0.142, 0xef4444);

    // HERO TOST MAKİNESİ (ribbed stainless upper/lower plates + handle + thermostat knob)
    const tx = vx + 0.34;
    pushColoredBox(metallic, 0.36, 0.08, 0.3, tx, 1.31, vz, 0xcbd5e1); // lower unit
    pushColoredBox(metallic, 0.34, 0.06, 0.28, tx, 1.39, vz, 0xe2e8f0, -0.05); // upper lid
    pushColoredBox(matte, 0.26, 0.025, 0.035, tx, 1.39, vz + 0.18, 0x111827); // front handle bar
    pushColoredCylinder(matte, 0.022, 0.022, 0.02, 8, tx + 0.12, 1.31, vz + 0.16, 0x1e293b, Math.PI * 0.5); // knob

    // Taped Wall Price List beside vitrine
    pushSignPlane(signPanels, 0.38, 0.48, 0.13, 1.58, -0.82, Math.PI * 0.5, 6);

    // Side Tokat Yaprağı shelf with green glass jars + yellow screw caps
    pushColoredBox(matte, 0.32, 0.82, 0.68, 1.92, 0.41, -0.86, 0xf1f5f9, 0, 0, 0, 0.78);
    for (let j = 0; j < 4; j++) {
      const jz = -1.06 + j * 0.16;
      pushColoredCylinder(matte, 0.058, 0.058, 0.15, 10, 1.92, 0.91, jz, 0x4d7c0f);
      pushColoredCylinder(matte, 0.052, 0.052, 0.03, 10, 1.92, 1.0, jz, 0xfacc15);
    }

    this.colliders.addBox(0.32, -1.24, 2.1, -0.4, 'vitrine');
  }

  _buildRealCashierArea(matte, metallic, emissive, glass, signPanels) {
    // Accurate Kasa behind Pastry Vitrine along center wall (X = +0.18..+1.72, Z = -1.65..-4.05)
    pushColoredBox(matte, 1.25, 0.9, 0.48, 0.88, 0.45, -1.72, 0xf1f5f9, 0, 0, 0, 0.78);
    pushColoredBox(matte, 0.5, 0.9, 2.15, 1.44, 0.45, -2.95, 0xf1f5f9, 0, 0, 0, 0.78);
    // Calacatta veined marble countertops & corner backsplash
    pushSignPlane(signPanels, 1.25, 0.48, 0.88, 0.903, -1.72, 0, 10, -Math.PI * 0.5);
    pushSignPlane(signPanels, 2.15, 0.5, 1.44, 0.903, -2.95, Math.PI * 0.5, 10, -Math.PI * 0.5);
    pushColoredBox(matte, 0.06, 1.45, 0.95, 0.14, 0.72, -1.9, 0xf8fafc);
    pushSignPlane(signPanels, 0.95, 1.45, 0.175, 0.72, -1.9, Math.PI * 0.5, 10);

    // Diegetic Wi-Fi Password Note (ONLY clearly visible from inside Kasa nook)
    const noteGeo = new THREE.PlaneGeometry(0.4, 0.4);
    const noteMat = new THREE.MeshBasicMaterial({ map: this.textures.wifiNoteTexture });
    const noteMesh = new THREE.Mesh(noteGeo, noteMat);
    noteMesh.position.copy(this.wifiNotePos);
    noteMesh.rotation.y = Math.PI * 0.5;
    this.scene.add(noteMesh);

    // Ergonomic Black Office Chair (chrome star base + cylinder + seat + backrest + headrest)
    pushColoredCylinder(metallic, 0.24, 0.28, 0.04, 10, 0.72, 0.08, -2.28, 0x94a3b8);
    pushColoredCylinder(metallic, 0.035, 0.035, 0.36, 8, 0.72, 0.28, -2.28, 0x64748b);
    pushColoredBox(matte, 0.44, 0.08, 0.44, 0.72, 0.5, -2.28, 0x111827);
    pushColoredBox(matte, 0.1, 0.62, 0.42, 0.52, 0.85, -2.28, 0x111827);
    pushColoredBox(matte, 0.08, 0.18, 0.24, 0.52, 1.26, -2.28, 0x111827);

    // Cashier POS Monitor with Crisp "EMİN BÜFE POS v2.6" UI Screen!
    pushColoredBox(matte, 0.05, 0.36, 0.52, 1.32, 1.15, -2.25, 0x111827);
    pushSignPlane(signPanels, 0.46, 0.3, 1.292, 1.15, -2.25, -Math.PI * 0.5, 8);
    pushColoredBox(metallic, 0.12, 0.18, 0.12, 1.32, 0.96, -2.25, 0x334155);

    // Detailed POS Card Terminal with white paper receipt & keypad
    pushColoredBox(matte, 0.18, 0.08, 0.12, 1.36, 0.94, -1.85, 0x0f172a);
    pushColoredBox(emissive, 0.05, 0.015, 0.08, 1.32, 0.99, -1.85, 0x38bdf8);
    pushColoredBox(matte, 0.02, 0.06, 0.07, 1.43, 1.0, -1.85, 0xf8fafc); // white receipt paper

    // White Falım & Lighter Cubby Box + Glossy Metallic-Cap Lighters
    pushColoredBox(matte, 0.36, 0.44, 0.42, 1.44, 1.12, -2.72, 0xf8fafc);
    const colors = [0xef4444, 0x3b82f6, 0x22c55e, 0xfacc15, 0xa855f7, 0xf97316];
    for (let i = 0; i < 6; i++) {
      pushColoredBox(matte, 0.06, 0.08, 0.036, 1.56, 1.05, -2.86 + i * 0.055, colors[i]);
      pushColoredBox(metallic, 0.06, 0.025, 0.036, 1.56, 1.1, -2.86 + i * 0.055, 0xe2e8f0);
      pushColoredBox(matte, 0.08, 0.05, 0.05, 1.56, 1.24, -2.86 + i * 0.055, colors[(i + 2) % 6]);
    }

    // Clear Glass Lollipop Jar & Glass Candy Bowl (balls & sticks visible inside!)
    pushGlassBox(glass, 0.2, 0.24, 0.2, 1.46, 1.03, -3.1);
    pushColoredCylinder(matte, 0.09, 0.09, 0.02, 10, 1.46, 0.92, -3.1, 0xfacc15);
    pushColoredCylinder(matte, 0.095, 0.095, 0.03, 10, 1.46, 1.15, -3.1, 0xfacc15);
    for (let l = 0; l < 8; l++) {
      const a = (l / 8) * Math.PI * 2;
      const lx = 1.46 + Math.cos(a) * 0.055;
      const lz = -3.1 + Math.sin(a) * 0.055;
      pushColoredCylinder(matte, 0.007, 0.007, 0.14, 6, lx, 1.18, lz, 0xffffff);
      pushColoredSphere(matte, 0.026, 8, 6, lx, 1.26, lz, colors[l % colors.length]);
    }

    // Candy Bowl (X = 1.46, Z = -3.35)
    pushGlassBox(glass, 0.18, 0.12, 0.18, 1.46, 0.97, -3.35);
    for (let c = 0; c < 6; c++) {
      const a = (c / 6) * Math.PI * 2;
      pushColoredSphere(
        matte,
        0.025,
        6,
        6,
        1.46 + Math.cos(a) * 0.04,
        0.96 + (c % 2) * 0.03,
        -3.35 + Math.sin(a) * 0.04,
        colors[c]
      );
    }

    // Multi-tier Gum Rack + Chocolate Boxes
    for (let tier = 0; tier < 3; tier++) {
      const ty = 0.96 + tier * 0.11;
      const tx = 1.4 - tier * 0.06;
      pushColoredBox(metallic, 0.14, 0.03, 0.66, tx, ty, -3.72, 0x334155);
      for (let g = 0; g < 6; g++) {
        pushColoredBox(matte, 0.08, 0.06, 0.085, tx + 0.03, ty + 0.045, -3.96 + g * 0.1, colors[(g + tier) % 6]);
      }
    }
    for (let row = 0; row < 2; row++) {
      for (let b = 0; b < 5; b++) {
        pushColoredBox(matte, 0.14, 0.16, 0.26, 1.64, 0.28 + row * 0.3, -2.45 - b * 0.34, colors[(b + row * 2) % 6]);
      }
    }

    this.colliders.addBox(1.18, -4.08, 1.72, -1.52, 'kasa_counter');
    this.colliders.addBox(0.14, -1.96, 1.25, -1.46, 'kasa_rear');
    void emissive;
  }

  _buildPhonePegboardAndSouvenirs(matte, metallic, glass, signPanels) {
    // White Pegboard behind Kasa (X = +0.15, Z = -2.35..-4.15)
    pushColoredBox(matte, 0.06, 1.45, 1.8, 0.15, 1.85, -3.25, 0xf1f5f9);
    // Orange headphones box + Turkish flag plaques + hanging white charger/cable packages
    pushColoredBox(matte, 0.06, 0.24, 0.2, 0.2, 2.32, -2.55, 0xf97316);
    pushSignPlane(signPanels, 0.18, 0.13, 0.19, 2.58, -3.05, Math.PI * 0.5, 11);
    pushSignPlane(signPanels, 0.18, 0.13, 0.19, 2.58, -3.45, Math.PI * 0.5, 11);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        const pz = -2.55 - c * 0.26;
        const py = 2.08 - r * 0.28;
        pushColoredBox(matte, 0.04, 0.2, 0.15, 0.2, py, pz, 0xffffff);
        pushColoredBox(matte, 0.045, 0.04, 0.12, 0.21, py + 0.06, pz, c % 2 === 0 ? 0x2563eb : 0x16a34a);
      }
    }

    // Tokat Souvenirs Wall Shelves (Divider + Back Wall) with mugs, glass snow globes & wooden Tokat decor
    pushColoredBox(matte, 0.24, 2.2, 1.3, 0.22, 1.35, -4.9, 0xe2e8f0, 0, 0, 0, 0.78);
    for (const sy of [1.1, 1.55, 2.0]) {
      pushColoredBox(matte, 0.26, 0.04, 1.32, 0.23, sy, -4.9, sy > 1.8 ? 0xdc2626 : 0x2563eb);
      for (let s = 0; s < 4; s++) {
        const sz = -4.45 - s * 0.28;
        if (s % 2 === 0) {
          pushColoredCylinder(matte, 0.045, 0.05, 0.06, 10, 0.24, sy + 0.05, sz, 0x1e293b);
          pushGlassBox(glass, 0.1, 0.1, 0.1, 0.24, sy + 0.13, sz);
          pushColoredSphere(matte, 0.032, 6, 6, 0.24, sy + 0.12, sz, 0xf8fafc); // snow inside globe!
        } else {
          pushColoredBox(matte, 0.1, 0.18, 0.16, 0.24, sy + 0.12, sz, 0x92400e);
        }
      }
    }

    pushColoredBox(matte, 3.2, 2.3, 0.36, 2.1, 1.3, -6.98, 0xe2e8f0, 0, 0, 0, 0.78);
    for (const sy of [0.85, 1.4, 1.95]) {
      pushColoredBox(matte, 3.2, 0.04, 0.38, 2.1, sy, -6.96, sy > 1.6 ? 0xdc2626 : 0x2563eb);
      for (let x = 0.75; x <= 3.45; x += 0.38) {
        pushColoredBox(matte, 0.22, 0.24, 0.16, x, sy + 0.15, -6.92, x > 2.2 ? 0x92400e : 0x3b82f6);
      }
    }
    void metallic;
  }

  _buildSofraBeziStand(matte, metallic) {
    const sx = 3.0;
    const sz = -3.75;
    pushColoredBox(matte, 0.78, 0.92, 1.65, sx, 0.46, sz, 0xf8fafc, 0, 0, 0, 0.76);
    const biscuitColors = [0xd97706, 0x111827, 0x16a34a, 0xfacc15, 0xb91c1c, 0x2563eb];
    for (let tier = 0; tier < 3; tier++) {
      const ty = 0.18 + tier * 0.24;
      pushColoredBox(matte, 0.82, 0.03, 1.62, sx, ty, sz, 0xe2e8f0);
      for (let b = 0; b < 7; b++) {
        const bz = sz - 0.68 + b * 0.22;
        const c = biscuitColors[(b + tier) % biscuitColors.length];
        pushColoredBox(matte, 0.14, 0.14, 0.18, sx - 0.35, ty + 0.09, bz, c);
        pushColoredBox(matte, 0.03, 0.06, 0.16, sx - 0.41, ty + 0.09, bz, 0xfef9c3); // label band
        pushColoredBox(matte, 0.14, 0.14, 0.18, sx + 0.35, ty + 0.09, bz, c);
        pushColoredBox(matte, 0.03, 0.06, 0.16, sx + 0.41, ty + 0.09, bz, 0xfef9c3);
      }
    }

    // Hanging Tesbih Bead Loops with Metallic Tassels
    pushColoredBox(matte, 0.72, 0.76, 0.04, sx, 0.5, sz + 0.84, 0xd6cfc2);
    const beadColors = [0x111827, 0x78350f, 0xd97706, 0x475569, 0x1e3a8a];
    for (let col = 0; col < 7; col++) {
      const bx = sx - 0.27 + col * 0.09;
      pushColoredBox(matte, 0.022, 0.44, 0.022, bx, 0.54, sz + 0.87, beadColors[col % beadColors.length]);
      pushColoredCylinder(metallic, 0.015, 0.022, 0.05, 6, bx, 0.29, sz + 0.87, 0x94a3b8);
    }

    this.colliders.addCenteredBox(sx, sz, 0.84, 1.72, 'sofra_stand');
  }

  _buildFridgesAndSnacks(matte, metallic, emissive, glass, signPanels) {
    const buildOpenFridge = (fz, frameColor, innerColor) => {
      pushColoredBox(matte, 0.08, 2.08, 0.78, 4.98, 1.04, fz, frameColor, 0, 0, 0, 0.75);
      pushColoredBox(matte, 0.78, 2.08, 0.06, 4.63, 1.04, fz - 0.36, frameColor, 0, 0, 0, 0.75);
      pushColoredBox(matte, 0.78, 2.08, 0.06, 4.63, 1.04, fz + 0.36, frameColor, 0, 0, 0, 0.75);
      pushColoredBox(matte, 0.78, 0.26, 0.78, 4.63, 0.13, fz, frameColor, 0, 0, 0, 0.72);
      pushColoredBox(matte, 0.78, 0.44, 0.78, 4.63, 1.86, fz, frameColor);
      // Metallic vertical fridge door handle + aluminum trim
      pushColoredCylinder(metallic, 0.014, 0.014, 0.72, 8, 4.2, 1.05, fz + 0.28, 0xe2e8f0);
      pushColoredBox(emissive, 0.04, 1.4, 0.56, 4.92, 0.96, fz, innerColor);
      for (const sy of [0.27, 0.61, 0.95, 1.29]) {
        pushColoredBox(metallic, 0.56, 0.025, 0.64, 4.59, sy, fz, 0xe2e8f0);
      }
    };

    buildOpenFridge(-1.65, 0x1565c0, 0x1e3a5f);
    pushSignPlane(signPanels, 0.72, 0.34, 4.23, 1.86, -1.65, -Math.PI * 0.5, 1);
    pushGlassBox(glass, 0.03, 1.4, 0.66, 4.24, 0.96, -1.65);

    // 3D Modeled Fridge Magnets & Evil-Eye Nazar Boncuğu on Didi fridge front-facing +Z side!
    const magColors = [0xef4444, 0xfacc15, 0x22c55e, 0xf8fafc, 0x38bdf8, 0xf97316];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        const mx = 4.35 + c * 0.13;
        const my = 1.52 - r * 0.18;
        if ((r + c) % 3 === 0) {
          pushColoredCylinder(matte, 0.045, 0.045, 0.02, 10, mx, my, -1.25, 0x1d4ed8, Math.PI * 0.5);
          pushColoredCylinder(matte, 0.022, 0.022, 0.024, 8, mx, my, -1.248, 0xf8fafc, Math.PI * 0.5);
        } else {
          pushColoredBox(matte, 0.08, 0.1, 0.025, mx, my, -1.25, magColors[(r * 3 + c) % 6]);
        }
      }
    }

    buildOpenFridge(-3.05, 0x111827, 0x1f2937);
    pushSignPlane(signPanels, 0.72, 0.34, 4.23, 1.86, -3.05, -Math.PI * 0.5, 2);
    pushGlassBox(glass, 0.03, 1.4, 0.66, 4.24, 0.96, -3.05);

    this.colliders.addBox(4.18, -3.5, 5.1, -1.2, 'fridges');

    // Modeled 0.5L Water 6-Pack Bottles beside Didi fridge
    for (let wx = 0; wx < 3; wx++) {
      for (let wz = 0; wz < 4; wz++) {
        const bx = 3.85 + wx * 0.095;
        const bz = -0.95 + wz * 0.095;
        pushColoredCylinder(matte, 0.036, 0.038, 0.18, 8, bx, 0.1, bz, 0xe0f2fe);
        pushColoredCylinder(matte, 0.02, 0.036, 0.05, 8, bx, 0.21, bz, 0xe0f2fe);
        pushColoredCylinder(matte, 0.02, 0.02, 0.025, 8, bx, 0.245, bz, 0xdc2626);
      }
    }

    // Red Kuruyemiş Wire Rack
    pushColoredBox(metallic, 0.44, 1.62, 0.04, 4.8, 0.81, -0.78, 0xb91c1c);
    pushColoredBox(metallic, 0.44, 1.62, 0.04, 4.8, 0.81, -0.32, 0xb91c1c);
    for (let tier = 0; tier < 4; tier++) {
      const ty = 0.36 + tier * 0.34;
      pushColoredBox(metallic, 0.38, 0.025, 0.46, 4.8, ty, -0.55, 0xdc2626);
      for (let k = 0; k < 3; k++) {
        pushColoredBox(matte, 0.08, 0.19, 0.11, 4.65, ty + 0.12, -0.68 + k * 0.13, magColors[(tier + k) % 6]);
      }
    }
    this.colliders.addCenteredBox(4.8, -0.55, 0.5, 0.56, 'nuts_rack');

    // Back Depot / İçecek Kasası + TENO carton
    pushColoredBox(matte, 0.7, 0.42, 0.54, 4.5, 0.21, -5.85, 0x1d4ed8, 0, 0, 0, 0.75);
    for (let cx = 0; cx < 4; cx++) {
      for (let cz = 0; cz < 3; cz++) {
        pushColoredCylinder(
          matte,
          0.038,
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
    pushColoredBox(matte, 0.72, 0.52, 0.52, 4.5, 0.26, -6.5, 0xb48a5a, 0, 0, 0, 0.78);
    pushSignPlane(signPanels, 0.66, 0.34, 4.5, 0.32, -6.23, 0, 7, 0, {
      u0: 0.05,
      u1: 0.95,
      v0: 0.04,
      v1: 0.46
    });
    this.colliders.addCenteredBox(4.5, -6.1, 0.85, 1.25, 'restock_crate');
  }

  _buildLeftBay(matte, metallic, emissive, glass, signPanels) {
    // 1. Red Patos Rack
    pushColoredBox(metallic, 0.56, 1.66, 0.44, -4.45, 0.83, -0.35, 0xb91c1c, 0, 0, 0, 0.78);
    pushSignPlane(signPanels, 0.54, 0.4, -4.45, 1.54, -0.11, 0, 3);
    const chipColors = [0x16a34a, 0xdc2626, 0xfacc15, 0x2563eb];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        pushColoredBox(matte, 0.13, 0.22, 0.08, -4.6 + c * 0.15, 0.45 + r * 0.32, -0.13, chipColors[(r + c) % 4]);
      }
    }

    // 2. Yellow Yupo Stand
    pushColoredBox(matte, 0.48, 1.38, 0.42, -3.72, 0.69, -0.38, 0xeab308, 0, 0, 0, 0.78);
    pushSignPlane(signPanels, 0.44, 0.28, -3.72, 1.25, -0.16, 0, 4, 0, {
      u0: 0.05,
      u1: 0.95,
      v0: 0.04,
      v1: 0.46
    });
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        pushColoredBox(matte, 0.11, 0.16, 0.07, -3.84 + c * 0.12, 0.38 + r * 0.26, -0.16, chipColors[(r + c + 1) % 4]);
      }
    }
    this.colliders.addBox(-4.78, -0.66, -3.4, -0.05, 'patos_yupo');

    // 3. Chrome Keychain Spinner
    pushColoredCylinder(metallic, 0.025, 0.025, 1.48, 8, -3.05, 0.74, -0.45, 0xcbd5e1);
    pushColoredBox(metallic, 0.34, 0.04, 0.34, -3.05, 0.02, -0.45, 0x64748b);
    for (let h = 0; h < 2; h++) {
      pushColoredCylinder(metallic, 0.16, 0.16, 0.02, 10, -3.05, 1.05 + h * 0.32, -0.45, 0x94a3b8);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        pushColoredBox(
          matte,
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

    // 4. White Pusula Display Pillar
    pushColoredBox(matte, 0.46, 1.5, 0.48, -0.68, 0.75, -0.65, 0xf8fafc, 0, 0, 0, 0.78);
    pushSignPlane(signPanels, 0.44, 0.48, -0.68, 1.22, -0.4, 0, 5);
    this.colliders.addCenteredBox(-0.68, -0.65, 0.52, 0.54, 'pusula');

    // 5. Left Wall Shelves with Blue/Red Trim, 3 Detailed Plush Bears, Neck Pillows & Wheeled Toy Trucks!
    pushColoredBox(matte, 0.46, 2.55, 4.4, -4.96, 1.28, -3.35, 0xf1f5f9, 0, 0, 0, 0.78);
    for (let sy = 0; sy < 4; sy++) {
      const y = 0.58 + sy * 0.48;
      pushColoredBox(matte, 0.48, 0.04, 1.65, -4.94, y, -1.95, 0x2563eb);
      pushColoredBox(matte, 0.48, 0.04, 2.55, -4.94, y, -4.15, 0xdc2626);
      for (let pz = -1.25; pz >= -2.6; pz -= 0.24) {
        pushColoredCylinder(
          matte,
          0.038,
          0.044,
          0.22,
          8,
          -4.82,
          y + 0.13,
          pz,
          sy === 0 ? 0xf97316 : sy === 1 ? 0x16a34a : 0x38bdf8
        );
      }
      for (let tz = -3.05; tz >= -5.2; tz -= 0.48) {
        if (sy === 2) {
          // Travel neck pillows (TorusGeometry!)
          pushColoredTorus(matte, 0.11, 0.045, 6, 10, -4.82, y + 0.1, tz, tz < -4.2 ? 0x334155 : 0x991b1b, Math.PI * 0.5);
        } else {
          // Boxed toy dump trucks with black wheels!
          pushColoredBox(matte, 0.2, 0.16, 0.34, -4.82, y + 0.12, tz, tz < -4.2 ? 0xfacc15 : 0x3b82f6);
          pushColoredCylinder(matte, 0.04, 0.04, 0.24, 8, -4.82, y + 0.06, tz - 0.1, 0x111827, 0, 0, Math.PI * 0.5);
          pushColoredCylinder(matte, 0.04, 0.04, 0.24, 8, -4.82, y + 0.06, tz + 0.1, 0x111827, 0, 0, Math.PI * 0.5);
        }
      }
    }

    // 3 Detailed Plush Teddy Bears (head, ears, pale snout, belly, arms!)
    const bearColors = [0x27272a, 0x3f3f46, 0x1e3a8a];
    for (let b = 0; b < 3; b++) {
      const bz = -1.45 - b * 0.46;
      pushColoredSphere(matte, 0.16, 10, 8, -4.84, 2.74, bz, bearColors[b]);
      pushColoredSphere(matte, 0.1, 8, 6, -4.72, 2.74, bz, 0xe5d3b3); // tummy patch
      pushColoredSphere(matte, 0.12, 10, 8, -4.84, 2.98, bz, bearColors[b]);
      pushColoredSphere(matte, 0.055, 8, 6, -4.72, 2.95, bz, 0xe5d3b3); // muzzle
      pushColoredSphere(matte, 0.045, 6, 6, -4.84, 3.09, bz - 0.09, bearColors[b]);
      pushColoredSphere(matte, 0.045, 6, 6, -4.84, 3.09, bz + 0.09, bearColors[b]);
    }
    pushColoredBox(matte, 0.42, 0.38, 0.66, -4.86, 2.76, -4.35, 0xb48a5a);
    this.colliders.addBox(-5.2, -5.65, -4.55, -1.1, 'left_shelves');

    // 6. Glass Watch/Jewelry Showcase + Lokum Boxes + Yaprak Jars
    pushColoredBox(matte, 0.7, 0.72, 2.2, -3.35, 0.36, -2.65, 0xf8fafc, 0, 0, 0, 0.78);
    pushGlassBox(glass, 0.68, 0.24, 2.16, -3.35, 0.84, -2.65);
    for (let wz = -3.45; wz <= -1.85; wz += 0.38) {
      pushColoredBox(matte, 0.48, 0.03, 0.28, -3.35, 0.74, wz, 0x1e293b);
      pushColoredCylinder(metallic, 0.035, 0.035, 0.02, 10, -3.35, 0.77, wz, 0xfacc15); // watch bezel
    }
    for (let lz = -3.4; lz <= -1.9; lz += 0.42) {
      pushColoredBox(matte, 0.4, 0.14, 0.3, -3.16, 0.44, lz, lz < -2.7 ? 0xdc2626 : 0xfacc15);
      pushColoredCylinder(matte, 0.07, 0.07, 0.18, 10, -2.92, 0.1, lz, 0x4d7c0f);
    }

    // 7. Hero Photocopier Machine
    pushColoredBox(matte, 0.76, 0.62, 0.76, -3.35, 0.31, -4.55, 0xf1f5f9, 0, 0, 0, 0.78);
    pushColoredBox(matte, 0.72, 0.46, 0.72, -3.35, 0.85, -4.55, 0xe7e2d6);
    pushColoredBox(matte, 0.68, 0.08, 0.68, -3.35, 1.12, -4.55, 0xd6d1c4);
    pushColoredBox(matte, 0.28, 0.03, 0.22, -2.96, 0.92, -4.55, 0xffffff); // paper output stack!
    pushColoredBox(emissive, 0.08, 0.03, 0.18, -2.98, 1.04, -4.35, 0x38bdf8);
    pushSignPlane(signPanels, 0.38, 0.22, -2.98, 0.86, -4.55, Math.PI * 0.5, 7, 0, {
      u0: 0.04,
      u1: 0.96,
      v0: 0.54,
      v1: 0.96
    });
    this.colliders.addBox(-3.78, -5.0, -2.92, -1.5, 'jewelry_copier');
  }

  _buildInstancedDrinks() {
    // Sculpted 3D bottle silhouette prototype (body + tapered neck + cap) in 1 draw call!
    const bottleParts = [];
    const body = new THREE.CylinderGeometry(0.036, 0.038, 0.12, 10).toNonIndexed();
    body.deleteAttribute('uv');
    bottleParts.push(body);

    const neck = new THREE.CylinderGeometry(0.017, 0.036, 0.045, 10).toNonIndexed();
    neck.deleteAttribute('uv');
    neck.translate(0, 0.082, 0);
    bottleParts.push(neck);

    const cap = new THREE.CylinderGeometry(0.019, 0.019, 0.022, 8).toNonIndexed();
    cap.deleteAttribute('uv');
    cap.translate(0, 0.114, 0);
    bottleParts.push(cap);

    const geo = mergeGeometries(bottleParts, false);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.18
    });
    this.drinksInstanced = new THREE.InstancedMesh(geo, mat, this.totalDrinks);

    const palette = [0x1d4ed8, 0xf97316, 0x38bdf8, 0x16a34a, 0xdc2626, 0xe0f2fe];
    const fridgeZs = [-1.65, -3.05];
    const shelfYs = [0.34, 0.68, 1.02, 1.36];
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
    const clothMat = new THREE.MeshStandardMaterial({
      map: this.textures.clothAtlas,
      roughness: 0.88,
      metalness: 0.02
    });
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
