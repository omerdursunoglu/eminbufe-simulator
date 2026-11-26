import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pushColoredBox, pushGlassBox, pushAtlasPlane } from './MeshBuilder.js';

const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _axisY = new THREE.Vector3(0, 1, 0);
const _axisX = new THREE.Vector3(1, 0, 0);
const _tmpColor = new THREE.Color();

/**
 * Builds the authentic twin-bay Z13 Emin Büfe faithfully from the 5 ./gorseller/ photos.
 * Also manages interactive instanced fridge drinks & interactive Sofra Bezi cloths.
 */
export class EminBufe {
  constructor(scene, textures, colliders) {
    this.scene = scene;
    this.textures = textures;
    this.colliders = colliders;

    // Beverage fridge stock system (48 visual bottles across Didi + Pepsi fridges)
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

    // Restock crate visual & key anchors
    this.cratePos = new THREE.Vector3(4.3, 0, -5.8);
    this.didiFridgePos = new THREE.Vector3(4.35, 0, -1.65);
    this.pepsiFridgePos = new THREE.Vector3(4.35, 0, -3.05);
    this.wifiNotePos = new THREE.Vector3(0.56, 1.44, -2.55);
    this.sofraStandPos = new THREE.Vector3(3.05, 0, -4.55);
    this.counterFrontPos = new THREE.Vector3(1.5, 0, 0.35);

    this._markerPulse = 0;
    this._build();
  }

  _build() {
    const opaque = [];
    const emissive = [];
    const glass = [];
    const atlasPanels = [];

    // 1. Interior Floor (cream tiles) & Threshold (dark charcoal) — Photos 1 & 2
    pushColoredBox(opaque, 10.6, 0.02, 7.2, 0, 0.01, -3.6, 0xe2dfd7);
    pushColoredBox(opaque, 10.8, 0.025, 1.2, 0, 0.012, 0.5, 0x383c42);

    // 2. Interior Walls & Acoustic Drop Ceiling (Y = 3.15m)
    pushColoredBox(opaque, 10.8, 0.25, 7.4, 0, 3.25, -3.7, 0xf8fafc);
    // 6 flush square LED panels on drop ceiling (Photo 1)
    for (const lx of [-3.2, -1.6, 1.6, 3.2]) {
      for (const lz of [-1.8, -4.6]) {
        pushColoredBox(emissive, 0.72, 0.04, 0.72, lx, 3.11, lz, 0xffffff);
      }
    }
    // Side and back interior walls
    pushColoredBox(opaque, 0.25, 3.2, 7.4, -5.3, 1.6, -3.7, 0xf8fafc);
    pushColoredBox(opaque, 0.25, 3.2, 7.4, 5.3, 1.6, -3.7, 0xf8fafc);
    pushColoredBox(opaque, 10.8, 3.2, 0.25, 0, 1.6, -7.25, 0xf8fafc);

    // 3. Exterior Twin-Bay Facade (Z = 0) — Photo 2
    // Three dark veined marble columns (left, center, right)
    for (const cx of [-5.15, 0.0, 5.15]) {
      pushColoredBox(opaque, 0.42, 3.2, 0.45, cx, 1.6, 0, 0x262121);
      pushAtlasPlane(atlasPanels, 0.43, 3.1, cx, 1.55, 0.23, 0, 4);
      this.colliders.addCenteredBox(cx, 0, 0.52, 0.52, 'marble_column');
    }
    // Grey brushed aluminum shutter boxes (kepenk kutusu) + LED strip underneath
    pushColoredBox(opaque, 10.8, 0.58, 0.48, 0, 2.95, 0.02, 0xb8bdc2);
    pushColoredBox(emissive, 4.6, 0.05, 0.08, -2.55, 2.65, 0.14, 0xffffff);
    pushColoredBox(emissive, 4.6, 0.05, 0.08, 2.55, 2.65, 0.14, 0xffffff);

    // Blue Z13 door plaque on center marble column
    pushAtlasPlane(atlasPanels, 0.26, 0.18, 0, 2.05, 0.24, 0, 15, 0, {
      u0: 0.04,
      u1: 0.47,
      v0: 0.04,
      v1: 0.26
    });

    // Illuminated EMİN BÜFE Signboard above center fascia
    pushColoredBox(opaque, 5.6, 1.05, 0.22, 0, 3.72, 0.12, 0x181b22);
    pushAtlasPlane(atlasPanels, 5.4, 0.96, 0, 3.72, 0.24, 0, 15, 0, {
      u0: 0.03,
      u1: 0.97,
      v0: 0.29,
      v1: 0.97
    });

    // ==================== RIGHT BAY (MAIN GAMEPLAY ZONE) ====================

    // 4. Heated Pastry & Zile Pekmezi Vitrine (Photo 1 & 2) at X = +1.15, Z = -0.82
    pushColoredBox(opaque, 1.38, 1.28, 0.78, 1.15, 0.64, -0.82, 0xe2e8f0);
    // Warm amber interior backlight & photo texture front
    pushColoredBox(emissive, 1.26, 0.82, 0.04, 1.15, 0.72, -0.44, 0xffd27d);
    pushAtlasPlane(atlasPanels, 1.32, 0.98, 1.15, 0.68, -0.41, 0, 0);
    pushAtlasPlane(atlasPanels, 1.32, 0.98, 1.15, 0.68, -1.23, Math.PI, 0);
    pushGlassBox(glass, 1.36, 0.95, 0.76, 1.15, 0.75, -0.82);
    // Silver Semaver / Tea maker (cylindrical look) & Toaster on top of vitrine
    const semaverGeo = new THREE.CylinderGeometry(0.14, 0.15, 0.42, 12).toNonIndexed();
    semaverGeo.deleteAttribute('uv');
    semaverGeo.translate(0.76, 1.49, -0.82);
    const sCount = semaverGeo.attributes.position.count;
    const sCol = new Float32Array(sCount * 3);
    _tmpColor.setHex(0xd8dee6);
    for (let i = 0; i < sCount; i++) {
      sCol[i * 3] = _tmpColor.r;
      sCol[i * 3 + 1] = _tmpColor.g;
      sCol[i * 3 + 2] = _tmpColor.b;
    }
    semaverGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
    opaque.push(semaverGeo);
    pushColoredBox(opaque, 0.18, 0.08, 0.18, 0.76, 1.72, -0.82, 0x1e293b);
    pushColoredBox(opaque, 0.36, 0.14, 0.3, 1.48, 1.35, -0.82, 0x94a3b8);
    // Side Tokat Yapragi shelf beside vitrine
    pushColoredBox(opaque, 0.32, 0.85, 0.68, 2.0, 0.43, -0.86, 0xdbe2ea);
    this.colliders.addBox(0.45, -1.24, 2.16, -0.4, 'vitrine');

    // 5. Cashier L-Desk Corner (Photo 4) at X = +0.48..+1.88, Z = -2.15..-3.38
    // Side white marble backdrop partition
    pushColoredBox(opaque, 0.14, 1.65, 1.45, 0.48, 0.82, -2.65, 0xf1f5f9);
    // Cashier desk front counter (with gum/chocolate display facing +Z)
    pushColoredBox(opaque, 1.35, 0.92, 0.56, 1.2, 0.46, -2.28, 0xe8edf2);
    pushAtlasPlane(atlasPanels, 1.28, 0.78, 1.2, 0.56, -1.99, 0, 11);
    // Monitor & POS card terminal on desk
    pushColoredBox(opaque, 0.48, 0.34, 0.05, 0.88, 1.16, -2.28, 0x111827);
    pushColoredBox(opaque, 0.12, 0.2, 0.12, 0.88, 0.98, -2.28, 0x1f2937);
    pushColoredBox(opaque, 0.14, 0.1, 0.22, 1.35, 0.97, -2.26, 0x0f172a);
    // Black ergonomic office chair tucked beside desk
    pushColoredBox(opaque, 0.46, 0.08, 0.46, 0.86, 0.48, -3.22, 0x111827);
    pushColoredBox(opaque, 0.44, 0.68, 0.1, 0.86, 0.86, -3.44, 0x111827);
    pushColoredBox(opaque, 0.24, 0.18, 0.08, 0.86, 1.3, -3.44, 0x111827);
    // Collide only desk front & side marble wall so cashier nook (X:0.7..1.9, Z:-3.3..-2.65) is walkable!
    this.colliders.addBox(0.4, -2.58, 1.9, -1.96, 'cashier_desk_front');
    this.colliders.addBox(0.38, -3.45, 0.58, -1.92, 'cashier_side_wall');

    // Diegetic Wi-Fi Password Note (ONLY clearly visible from cashier side!)
    const noteGeo = new THREE.PlaneGeometry(0.44, 0.44);
    const noteMat = new THREE.MeshBasicMaterial({ map: this.textures.wifiNoteTexture });
    const noteMesh = new THREE.Mesh(noteGeo, noteMat);
    noteMesh.position.copy(this.wifiNotePos);
    noteMesh.rotation.y = Math.PI * 0.5;
    this.scene.add(noteMesh);

    // 6. Sofra Bezi & Yazma Island Stand (Photo 3) at X = +3.05, Z = -4.55
    pushColoredBox(opaque, 0.78, 0.92, 1.6, 3.05, 0.46, -4.55, 0xf8fafc);
    // Biscuit shelves underneath (left & right faces)
    pushAtlasPlane(atlasPanels, 1.52, 0.72, 2.65, 0.42, -4.55, -Math.PI * 0.5, 7);
    pushAtlasPlane(atlasPanels, 1.52, 0.72, 3.45, 0.42, -4.55, Math.PI * 0.5, 7);
    // Hanging Tesbih pegboard on the front/south end of the stand
    pushAtlasPlane(atlasPanels, 0.74, 0.78, 3.05, 0.48, -3.74, 0, 8);
    this.colliders.addCenteredBox(3.05, -4.55, 0.82, 1.64, 'sofra_stand');

    // 7. Mavi Didi Fridge (X = +4.48, Z = -1.65) & Pepsi Fridge (X = +4.48, Z = -3.05)
    // Open-front cabinets so the 48 instanced bottles inside are clearly visible behind glass!
    const buildOpenFridge = (fz, frameColor, innerColor) => {
      pushColoredBox(opaque, 0.08, 2.08, 0.78, 4.83, 1.04, fz, frameColor); // back wall
      pushColoredBox(opaque, 0.78, 2.08, 0.06, 4.48, 1.04, fz - 0.36, frameColor); // side -Z
      pushColoredBox(opaque, 0.78, 2.08, 0.06, 4.48, 1.04, fz + 0.36, frameColor); // side +Z
      pushColoredBox(opaque, 0.78, 0.26, 0.78, 4.48, 0.13, fz, frameColor); // bottom base
      pushColoredBox(opaque, 0.78, 0.44, 0.78, 4.48, 1.86, fz, frameColor); // top header box
      // Dark interior liner + bright white interior vertical backlight + 4 shelf trays
      pushColoredBox(emissive, 0.04, 1.4, 0.56, 4.77, 0.96, fz, innerColor);
      for (const sy of [0.27, 0.61, 0.95, 1.29]) {
        pushColoredBox(opaque, 0.56, 0.025, 0.64, 4.44, sy, fz, 0xe2e8f0);
      }
    };

    // Didi Fridge (blue cabinet, Didi banner top, magnet art on +Z side facing terminal!)
    buildOpenFridge(-1.65, 0x1565c0, 0x1e3a5f);
    pushAtlasPlane(atlasPanels, 0.72, 0.34, 4.08, 1.86, -1.65, -Math.PI * 0.5, 2);
    pushAtlasPlane(atlasPanels, 0.72, 1.68, 4.48, 1.02, -1.24, 0, 1); // side magnet art!
    pushGlassBox(glass, 0.03, 1.4, 0.66, 4.09, 0.96, -1.65);

    // Pepsi Fridge (dark navy/black cabinet, Pepsi top banner)
    buildOpenFridge(-3.05, 0x111827, 0x1f2937);
    pushAtlasPlane(atlasPanels, 0.72, 0.34, 4.08, 1.86, -3.05, -Math.PI * 0.5, 6);
    pushGlassBox(glass, 0.03, 1.4, 0.66, 4.09, 0.96, -3.05);

    this.colliders.addBox(4.02, -3.5, 4.95, -1.2, 'fridges');

    // Red Kuruyemiş Wire Rack beside Didi fridge (Photo 1 right edge)
    pushColoredBox(opaque, 0.45, 1.65, 0.52, 4.55, 0.82, -0.58, 0xb91c1c);
    pushAtlasPlane(atlasPanels, 0.48, 1.52, 4.31, 0.84, -0.58, -Math.PI * 0.5, 3);
    // Shrink-wrapped water bottle packs at floor beside Didi fridge (detailed blue/clear pack)
    pushColoredBox(opaque, 0.42, 0.28, 0.62, 3.84, 0.14, -0.78, 0x93c5fd);
    pushColoredBox(opaque, 0.38, 0.04, 0.56, 3.84, 0.29, -0.78, 0xdc2626);
    this.colliders.addCenteredBox(4.55, -0.58, 0.52, 0.58, 'nuts_rack');

    // 8. Back Wall Shelves (Phone Pegboard + Tokat Souvenirs + Restock Crate Corner)
    // Phone accessories pegboard (Photo 4 back left)
    pushColoredBox(opaque, 1.95, 2.15, 0.25, 1.55, 1.4, -6.95, 0xf1f5f9);
    pushAtlasPlane(atlasPanels, 1.85, 1.95, 1.55, 1.45, -6.81, 0, 9);
    // Tokat souvenirs shelves with red & blue trim (Photo 4 back right)
    pushColoredBox(opaque, 2.3, 2.15, 0.42, 3.7, 1.25, -6.88, 0xe2e8f0);
    pushColoredBox(opaque, 2.3, 0.05, 0.44, 3.7, 1.9, -6.87, 0xdc2626);
    pushColoredBox(opaque, 2.3, 0.05, 0.44, 3.7, 1.25, -6.87, 0x2563eb);
    pushAtlasPlane(atlasPanels, 2.2, 2.0, 3.7, 1.35, -6.65, 0, 10);

    // Back Depot / İçecek Kasası (Restock Crate at X = +4.3, Z = -5.6)
    pushColoredBox(opaque, 0.72, 0.46, 0.58, 4.3, 0.23, -5.6, 0x1d4ed8);
    pushColoredBox(opaque, 0.68, 0.55, 0.52, 4.3, 0.73, -5.95, 0xa87c4f); // Teno cardboard carton
    this.colliders.addCenteredBox(4.3, -5.65, 0.85, 0.9, 'restock_crate');

    // ==================== LEFT BAY (PATOS, TOILETRIES, TOYS, PHOTOCOPIER) ====================

    // 9. Entrance Snacks (Photo 2 left bay front)
    // Patos red chips stand
    pushColoredBox(opaque, 0.58, 1.68, 0.48, -4.38, 0.84, -0.35, 0xc62828);
    pushAtlasPlane(atlasPanels, 0.56, 1.55, -4.38, 0.86, -0.09, 0, 5);
    // Yellow Yupo / Keychain stand
    pushColoredBox(opaque, 0.5, 1.38, 0.44, -3.65, 0.69, -0.4, 0xeab308);
    pushAtlasPlane(atlasPanels, 0.48, 1.28, -3.65, 0.72, -0.16, 0, 5);
    // Pusula stand near center column
    pushColoredBox(opaque, 0.48, 1.52, 0.52, -0.68, 0.76, -0.65, 0xf8fafc);
    pushAtlasPlane(atlasPanels, 0.48, 1.3, -0.68, 0.78, -0.38, 0, 15, 0, {
      u0: 0.5,
      u1: 0.96,
      v0: 0.04,
      v1: 0.26
    });
    this.colliders.addBox(-4.72, -0.68, -3.3, -0.05, 'patos_yupo');
    this.colliders.addCenteredBox(-0.68, -0.65, 0.54, 0.58, 'pusula');

    // 10. Left Wall Blue & Red Shelving (Photo 5)
    pushColoredBox(opaque, 0.48, 2.55, 4.4, -4.92, 1.35, -3.4, 0xe8edf2);
    // Blue & Red edge strips
    pushColoredBox(opaque, 0.04, 0.05, 1.6, -4.66, 1.8, -2.0, 0x2563eb);
    pushColoredBox(opaque, 0.04, 0.05, 2.6, -4.66, 1.8, -4.2, 0xdc2626);
    pushAtlasPlane(atlasPanels, 4.2, 2.35, -4.66, 1.38, -3.4, Math.PI * 0.5, 12);

    // Low Glass Jewelry/Watch Counter & Lokum/Pekmez (Photo 5 foreground)
    pushColoredBox(opaque, 0.72, 0.88, 2.35, -3.45, 0.44, -2.8, 0xf1f5f9);
    pushAtlasPlane(atlasPanels, 2.25, 0.78, -3.07, 0.48, -2.8, Math.PI * 0.5, 13);
    pushGlassBox(glass, 0.7, 0.24, 2.32, -3.45, 0.98, -2.8);
    // Photocopier Machine (Photo 5 right foreground)
    pushColoredBox(opaque, 0.78, 1.18, 0.78, -3.45, 0.59, -4.55, 0xdcd7cb);
    pushAtlasPlane(atlasPanels, 0.74, 1.08, -3.04, 0.62, -4.55, Math.PI * 0.5, 14);
    this.colliders.addBox(-5.15, -5.65, -4.55, -1.1, 'left_shelves');
    this.colliders.addBox(-3.88, -5.0, -3.0, -1.55, 'jewelry_copier');

    // Merge all static shop buckets!
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
          opacity: 0.3,
          depthWrite: false
        })
      )
    );
    this.scene.add(
      new THREE.Mesh(
        mergeGeometries(atlasPanels, false),
        new THREE.MeshLambertMaterial({
          map: this.textures.shopAtlas,
          emissiveMap: this.textures.shopAtlas,
          emissive: 0x363636
        })
      )
    );

    // 11. Build Instanced Fridge Drinks (48 bottles/cans across Didi & Pepsi fridges)
    this._buildInstancedDrinks();

    // 12. Build Instanced Sofra Bezi Cloths & Glowing Markers (8 interactive cloths)
    this._buildInstancedSofraCloths();
  }

  _buildInstancedDrinks() {
    const geo = new THREE.CylinderGeometry(0.036, 0.038, 0.16, 8);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.drinksInstanced = new THREE.InstancedMesh(geo, mat, this.totalDrinks);

    const palette = [
      0x1d4ed8, // Pepsi blue
      0xf97316, // Fanta orange
      0x38bdf8, // Didi / water light blue
      0x16a34a, // Beypazari / green soda
      0xdc2626, // Red soda/cola
      0xe0f2fe  // 0.5L Water
    ];

    const fridgeZs = [-1.65, -3.05];
    const shelfYs = [0.36, 0.7, 1.04, 1.38];
    let idx = 0;

    for (let f = 0; f < 2; f++) {
      const fz = fridgeZs[f];
      for (let sy = 0; sy < shelfYs.length; sy++) {
        const y = shelfYs[sy];
        for (let row = 0; row < 2; row++) {
          const x = 4.2 + row * 0.14;
          for (let col = 0; col < 3; col++) {
            const z = fz - 0.18 + col * 0.18;
            const colorHex = palette[(sy * 2 + col + f) % palette.length];
            this.drinkSlots.push({ x, y, z, filled: true });
            _tmpColor.setHex(colorHex);
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
    // 8 folded rectangular cloths sharing clothAtlas (each uses UV slice or vertex UV? InstancedMesh shares 1 UV set,
    // so let's give each folded cloth its own UV offset OR color tint? Wait: we want real floral cloth texture from Photo 3!
    // Solution: Give the base BoxGeometry a full tile of clothAtlas or keep 1 clothAtlas texture & vertex color tint, OR
    // merge 1 base BoxGeometry mapped cleanly to the rich floral cloth section of clothAtlas!)
    const clothGeo = new THREE.BoxGeometry(0.38, 0.075, 0.34);
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

    // Neatly stacked home positions on top of Sofra Stand (X=3.05, Y=0.95, Z=-4.55)
    const homeSlots = [
      [2.85, 0.96, -4.98, 0.05],
      [2.85, 1.04, -4.98, -0.04],
      [3.25, 0.96, -4.98, -0.03],
      [3.25, 1.04, -4.98, 0.06],
      [2.85, 0.96, -4.12, 0.02],
      [2.85, 1.04, -4.12, -0.05],
      [3.25, 0.96, -4.12, -0.02],
      [3.25, 1.04, -4.12, 0.04]
    ];

    // Floor scatter positions (inside right bay + shop front floor, walkable!)
    const scatterSlots = [
      [2.6, 0.05, -2.5, 0.6],
      [3.4, 0.05, -1.7, 1.4],
      [2.3, 0.05, -0.2, 2.2],
      [3.6, 0.05, 0.6, -0.7],
      [1.2, 0.05, 1.1, 0.9],
      [-0.4, 0.05, 0.7, 1.8],
      [-1.8, 0.05, -1.1, -1.1],
      [2.2, 0.05, -5.2, 0.3]
    ];

    const tintPalette = [0xffffff, 0xfef08a, 0xe9d5ff, 0xbfdbfe, 0xfecaca, 0xd9f99d, 0xfde68a, 0xffffff];

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

        // Hide glowing floor marker
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
      _quat.setFromAxisAngle(_axisX, 0);
      _scale.set(s, 1, s);
      _mat.compose(_pos, _quat, _scale);
      this.clothMarkerInstanced.setMatrixAt(i, _mat);
    }
    this.clothMarkerInstanced.instanceMatrix.needsUpdate = true;
  }
}
