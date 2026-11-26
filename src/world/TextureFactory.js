import * as THREE from 'three';

import imgInsideUrl from '../../gorseller/WhatsApp Image 2026-11-26 at 21.19.51.jpeg';
import imgFacadeUrl from '../../gorseller/WhatsApp Image 2026-11-26 at 21.19.51 (1).jpeg';
import imgSofraUrl from '../../gorseller/WhatsApp Image 2026-11-26 at 21.19.51 (2).jpeg';
import imgCashierUrl from '../../gorseller/WhatsApp Image 2026-11-26 at 21.19.51 (3).jpeg';
import imgLeftWallUrl from '../../gorseller/WhatsApp Image 2026-11-26 at 21.19.52.jpeg';

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawCroppedTile(ctx, img, sx, sy, sw, sh, tx, ty, tileSize, fallbackColor) {
  ctx.save();
  ctx.fillStyle = fallbackColor;
  ctx.fillRect(tx, ty, tileSize, tileSize);
  if (img && img.naturalWidth > 0) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    // Draw slightly padded border to prevent mipmap edge bleeding
    ctx.drawImage(
      img,
      sx * iw,
      sy * ih,
      sw * iw,
      sh * ih,
      tx,
      ty,
      tileSize,
      tileSize
    );
  }
  ctx.restore();
}

/**
 * Loads all 5 reference photos from ./gorseller/, slices & downscales them into
 * <= 1024x1024 mipmapped CanvasTextures so total GPU memory and draw calls stay minimal.
 */
export class TextureFactory {
  constructor() {
    this.shopAtlas = null;
    this.clothAtlas = null;
    this.wifiNoteTexture = null;
    this.departureTexture = null;
    this.departureCanvas = null;
    this.departureCtx = null;
    this.floorTexture = null;
    this.blobShadowTexture = null;
    this._boardPhase = 0;
  }

  async init() {
    const [imgInside, imgFacade, imgSofra, imgCashier, imgLeftWall] = await Promise.all([
      loadImage(imgInsideUrl),
      loadImage(imgFacadeUrl),
      loadImage(imgSofraUrl),
      loadImage(imgCashierUrl),
      loadImage(imgLeftWallUrl)
    ]);

    this._buildShopAtlas({ imgInside, imgFacade, imgSofra, imgCashier, imgLeftWall });
    this._buildClothAtlas(imgSofra);
    this._buildWifiNoteTexture();
    this._buildDepartureBoardTexture();
    this._buildFloorTileTexture();
    this._buildBlobShadowTexture();
  }

  /**
   * 4x4 grid (each cell 256x256 in a 1024x1024 texture).
   * Returns normalized UV rect [u0, v0, u1, v1] inset slightly to prevent mip bleeding.
   */
  static getAtlasUV(index) {
    const col = index % 4;
    const row = Math.floor(index / 4);
    // In Three.js CanvasTexture (flipY=true), row 0 (top of canvas) is v = [0.75..1.0]
    const pad = 0.005;
    const u0 = col * 0.25 + pad;
    const u1 = (col + 1) * 0.25 - pad;
    const v1 = 1.0 - row * 0.25 - pad;
    const v0 = 1.0 - (row + 1) * 0.25 + pad;
    return { u0, v0, u1, v1 };
  }

  _buildShopAtlas({ imgInside, imgFacade, imgSofra, imgCashier, imgLeftWall }) {
    const size = 1024;
    const cell = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const tilePos = (idx) => [(idx % 4) * cell, Math.floor(idx / 4) * cell];

    // 0: Warm lit pastry & Zile pekmezi vitrine (from 21.19.51.jpeg)
    {
      const [x, y] = tilePos(0);
      drawCroppedTile(ctx, imgInside, 0.01, 0.56, 0.38, 0.35, x, y, cell, '#d4943a');
    }
    // 1: Didi blue fridge header + side magnet/souvenir panel (21.19.51.jpeg)
    {
      const [x, y] = tilePos(1);
      drawCroppedTile(ctx, imgInside, 0.64, 0.34, 0.10, 0.42, x, y, cell, '#1565c0');
    }
    // 2: Didi top banner + red wire kuruyemis rack (top half Didi header, bottom half kuruyemis)
    {
      const [x, y] = tilePos(2);
      drawCroppedTile(ctx, imgInside, 0.72, 0.32, 0.13, 0.08, x, y, cell, '#1565c0');
    }
    // 3: Red kuruyemis snack rack (21.19.51.jpeg)
    {
      const [x, y] = tilePos(3);
      drawCroppedTile(ctx, imgInside, 0.84, 0.45, 0.15, 0.40, x, y, cell, '#a91e22');
    }
    // 4: Dark veined marble pillar (21.19.51 (1).jpeg)
    {
      const [x, y] = tilePos(4);
      drawCroppedTile(ctx, imgFacade, 0.005, 0.14, 0.055, 0.65, x, y, cell, '#262121');
    }
    // 5: Red Patos & Yellow Yupo entrance snack stands (21.19.51 (1).jpeg)
    {
      const [x, y] = tilePos(5);
      drawCroppedTile(ctx, imgFacade, 0.06, 0.28, 0.16, 0.46, x, y, cell, '#c62828');
    }
    // 6: Pepsi fridge top header + Pusula stand (top half Pepsi, bottom half Pusula)
    {
      const [x, y] = tilePos(6);
      drawCroppedTile(ctx, imgFacade, 0.875, 0.315, 0.115, 0.065, x, y, cell, '#0c1f4a');
    }
    // 7: Eti Burcak / Nero / Gong biscuit shelves under sofra stand (21.19.51 (2).jpeg)
    {
      const [x, y] = tilePos(7);
      drawCroppedTile(ctx, imgSofra, 0.24, 0.55, 0.52, 0.36, x, y, cell, '#e2e8f0');
    }
    // 8: Hanging Tesbih display board (21.19.51 (2).jpeg)
    {
      const [x, y] = tilePos(8);
      drawCroppedTile(ctx, imgSofra, 0.75, 0.34, 0.14, 0.54, x, y, cell, '#d6cfc2');
    }
    // 9: Phone accessories pegboard (21.19.51 (3).jpeg)
    {
      const [x, y] = tilePos(9);
      drawCroppedTile(ctx, imgCashier, 0.32, 0.04, 0.26, 0.44, x, y, cell, '#e8edf2');
    }
    // 10: Tokat souvenirs shelves with red/blue trim (21.19.51 (3).jpeg)
    {
      const [x, y] = tilePos(10);
      drawCroppedTile(ctx, imgCashier, 0.57, 0.01, 0.42, 0.45, x, y, cell, '#cbd5e1');
    }
    // 11: Gum / lollipop / chocolate cashier display (21.19.51 (3).jpeg)
    {
      const [x, y] = tilePos(11);
      drawCroppedTile(ctx, imgCashier, 0.33, 0.45, 0.50, 0.36, x, y, cell, '#f1f5f9');
    }
    // 12: Left wall blue/red shelves - toiletries & toys (21.19.52.jpeg)
    {
      const [x, y] = tilePos(12);
      drawCroppedTile(ctx, imgLeftWall, 0.22, 0.05, 0.64, 0.60, x, y, cell, '#e2e8f0');
    }
    // 13: Glass jewelry vitrine + lokum/pekmez lower shelves (21.19.52.jpeg)
    {
      const [x, y] = tilePos(13);
      drawCroppedTile(ctx, imgLeftWall, 0.0, 0.62, 0.54, 0.37, x, y, cell, '#cbd5e1');
    }
    // 14: Photocopier front + "Fotokopi 10 TL / Bilgisayar Çıktı 20 TL" + Price sheets
    {
      const [x, y] = tilePos(14);
      drawCroppedTile(ctx, imgLeftWall, 0.56, 0.58, 0.26, 0.41, x, y, cell, '#dcd7cb');
      // Crisp readable price badge accent
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 92, y + 72, 74, 42);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 92, y + 72, 74, 42);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('Fotokopi: 10₺', x + 96, y + 89);
      ctx.fillText('Çıktı: 20₺', x + 96, y + 106);
    }
    // 15: EMİN BÜFE Illuminated Signboard + Z13 Badge (21.19.51 (1).jpeg matching style)
    {
      const [x, y] = tilePos(15);
      // Top 75%: Main Sign
      const grad = ctx.createLinearGradient(x, y, x + cell, y + cell);
      grad.addColorStop(0, '#181b22');
      grad.addColorStop(1, '#272c38');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, cell, cell);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 6;
      ctx.strokeRect(x + 8, y + 8, cell - 16, 172);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '900 38px sans-serif';
      ctx.fillText('EMİN BÜFE', x + cell * 0.5, y + 86);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('TOKAT TERMİNALİ • Z13', x + cell * 0.5, y + 124);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 12px sans-serif';
      ctx.fillText('GIDA • HEDİYELİK • SOFRA BEZİ', x + cell * 0.5, y + 152);

      // Bottom 25%: Blue Z13 plaque + Pusula stripe
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(x + 10, y + 190, 110, 56);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 30px sans-serif';
      ctx.fillText('Z13', x + 65, y + 229);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x + 128, y + 190, 118, 56);
      ctx.fillStyle = '#1e293b';
      ctx.font = '900 22px sans-serif';
      ctx.fillText('PUSULA', x + 187, y + 226);
      ctx.textAlign = 'left';
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    this.shopAtlas = tex;
  }

  _buildClothAtlas(imgSofra) {
    // 512x512 atlas: 3x2 grid of 6 real sofra bezi patterns from 21.19.51 (2).jpeg
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const crops = [
      { sx: 0.51, sy: 0.21, sw: 0.18, sh: 0.20, fb: '#4a154b' }, // 0: Plum floral yazma
      { sx: 0.46, sy: 0.40, sw: 0.19, sh: 0.21, fb: '#1e1b24' }, // 1: Black floral gold-coin oyali
      { sx: 0.37, sy: 0.23, sw: 0.14, sh: 0.17, fb: '#eab308' }, // 2: Bright yellow Tokat yazma
      { sx: 0.22, sy: 0.26, sw: 0.14, sh: 0.14, fb: '#60a5fa' }, // 3: Sky blue floral cloth
      { sx: 0.15, sy: 0.38, sw: 0.16, sh: 0.12, fb: '#dc2626' }, // 4: Red-white striped cloth
      { sx: 0.03, sy: 0.41, sw: 0.13, sh: 0.15, fb: '#bef264' }  // 5: Lime green/yellow cloth
    ];

    const w = 170;
    const h = 256;
    for (let i = 0; i < crops.length; i++) {
      const c = crops[i];
      const tx = (i % 3) * w;
      const ty = Math.floor(i / 3) * h;
      ctx.save();
      ctx.fillStyle = c.fb;
      ctx.fillRect(tx, ty, w, h);
      if (imgSofra && imgSofra.naturalWidth > 0) {
        const iw = imgSofra.naturalWidth;
        const ih = imgSofra.naturalHeight;
        ctx.drawImage(imgSofra, c.sx * iw, c.sy * ih, c.sw * iw, c.sh * ih, tx, ty, w, h);
      }
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    this.clothAtlas = tex;
  }

  _buildWifiNoteTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Slight cream A5 paper
    ctx.fillStyle = '#fdfbf3';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle paper border & ruled lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 2;
    for (let y = 110; y < 470; y += 54) {
      ctx.beginPath();
      ctx.moveTo(32, y);
      ctx.lineTo(480, y);
      ctx.stroke();
    }

    // Masking tape strips at top-left and top-right corners
    ctx.fillStyle = 'rgba(245, 222, 160, 0.85)';
    ctx.save();
    ctx.translate(78, 36);
    ctx.rotate(-0.26);
    ctx.fillRect(-52, -16, 104, 32);
    ctx.restore();

    ctx.save();
    ctx.translate(432, 36);
    ctx.rotate(0.24);
    ctx.fillRect(-52, -16, 104, 32);
    ctx.restore();

    // Title & exact legend password
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.font = '900 44px "Marker Felt", "Comic Sans MS", sans-serif';
    ctx.fillText('Wi-Fi Şifresi:', 256, 148);

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(106, 166);
    ctx.lineTo(406, 166);
    ctx.stroke();

    // Password lines clearly legible from cashier view
    ctx.fillStyle = '#1e3a8a';
    ctx.font = '900 50px "Courier New", monospace';
    ctx.fillText('2 33 444', 256, 250);
    ctx.fillText('5555 66666', 256, 325);
    ctx.fillText('777777', 256, 400);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('(Sadece Kasiyer Görür)', 256, 466);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    this.wifiNoteTexture = tex;
  }

  _buildDepartureBoardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    this.departureCanvas = canvas;
    this.departureCtx = canvas.getContext('2d');

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    this.departureTexture = tex;

    this.updateDepartureBoard(0);
  }

  updateDepartureBoard(dt) {
    const ctx = this.departureCtx;
    if (!ctx) return;
    this._boardPhase += dt;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 1024, 512);

    // Header bar
    ctx.fillStyle = '#142038';
    ctx.fillRect(0, 0, 1024, 78);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 32px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TOKAT OTOBÜS TERMİNALİ • SEFERLER (2026)', 28, 50);

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${hh}:${mm}`, 992, 50);

    const rows = [
      ['14:30', 'TOKAT → İSTANBUL (ESENLER)', 'PERON 3', 'PERONDA', '#34d399'],
      ['14:45', 'TOKAT → ANKARA (AŞTİ)', 'PERON 1', 'YOLCU ALIYOR', '#fbbf24'],
      ['15:15', 'TOKAT → İZMİR (OTOGAR)', 'PERON 5', 'HAZIRLANIYOR', '#60a5fa'],
      ['15:40', 'TOKAT → SAMSUN', 'PERON 2', 'ZAMANINDA', '#94a3b8'],
      ['16:00', 'TOKAT → TRABZON', 'PERON 4', 'ZAMANINDA', '#94a3b8']
    ];

    ctx.textAlign = 'left';
    for (let i = 0; i < rows.length; i++) {
      const [time, route, peron, status, color] = rows[i];
      const y = 135 + i * 62;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(30, 41, 59, 0.45)' : 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(20, y - 40, 984, 52);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 26px monospace';
      ctx.fillText(time, 36, y - 5);

      ctx.font = '800 26px sans-serif';
      ctx.fillText(route, 150, y - 5);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(peron, 640, y - 5);

      ctx.fillStyle = color;
      ctx.fillText(status, 795, y - 5);
    }

    // Bottom scrolling ticker
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 450, 1024, 62);
    const tickerText =
      '★ EMİN BÜFE (Z13) HİZMETİNİZDE: SICAK BÖREK, ZİLE PEKMEZİ, TOKAT YAPRAĞI, SOFRA BEZİ, SOĞUK İÇECEKLER VE EFSANE Wİ-Fİ! ★   ';
    const speed = 90;
    const offset = (this._boardPhase * speed) % 1500;
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(tickerText + tickerText, 1024 - offset, 490);

    this.departureTexture.needsUpdate = true;
  }

  _buildFloorTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#cfd5dd';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle porcelain tile sheen variations
    for (let gx = 0; gx < 4; gx++) {
      for (let gy = 0; gy < 4; gy++) {
        const shade = (gx + gy) % 2 === 0 ? '#d8dde4' : '#ced4dc';
        ctx.fillStyle = shade;
        ctx.fillRect(gx * 128 + 3, gy * 128 + 3, 122, 122);
      }
    }

    ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      const p = i * 128;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(512, p);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 12);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    this.floorTexture = tex;
  }

  _buildBlobShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    grad.addColorStop(0, 'rgba(10, 15, 25, 0.52)');
    grad.addColorStop(0.65, 'rgba(10, 15, 25, 0.22)');
    grad.addColorStop(1, 'rgba(10, 15, 25, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    this.blobShadowTexture = tex;
  }
}
