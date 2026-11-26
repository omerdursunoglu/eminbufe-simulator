import * as THREE from 'three';

/**
 * 100% Procedural High-Detail Vector & Material Texture Generator.
 * Includes crisp signage, marble veining, POS monitor UI, porcelain tiles,
 * traditional Tokat yazması floral fabric patterns, and diegetic Wi-Fi note.
 */
export class TextureFactory {
  constructor() {
    this.signAtlas = null;
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
    this._buildSignAtlas();
    this._buildClothAtlas();
    this._buildWifiNoteTexture();
    this._buildDepartureBoardTexture();
    this._buildFloorTileTexture();
    this._buildBlobShadowTexture();
  }

  /**
   * 4x3 grid (each cell 256x256 in a 1024x768? Let's stick to power-of-two 1024x1024 4x4 grid!).
   */
  static getSignUV(index) {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const pad = 0.004;
    const u0 = col * 0.25 + pad;
    const u1 = (col + 1) * 0.25 - pad;
    const v1 = 1.0 - row * 0.25 - pad;
    const v0 = 1.0 - (row + 1) * 0.25 + pad;
    return { u0, v0, u1, v1 };
  }

  _buildSignAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const cell = 256;
    const pos = (idx) => [(idx % 4) * cell, Math.floor(idx / 4) * cell];

    // 0: EMİN BÜFE Illuminated Fascia Sign
    {
      const [x, y] = pos(0);
      const grad = ctx.createLinearGradient(x, y, x + cell, y + cell);
      grad.addColorStop(0, '#12151d');
      grad.addColorStop(1, '#262d3d');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 7;
      ctx.strokeRect(x + 10, y + 12, cell - 20, cell - 24);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 18, y + 20, cell - 36, cell - 40);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '900 40px sans-serif';
      ctx.fillText('EMİN BÜFE', x + 128, y + 110);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText('TOKAT TERMİNALİ • Z13', x + 128, y + 150);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '700 13px sans-serif';
      ctx.fillText('GIDA • SOFRA BEZİ • HEDİYELİK', x + 128, y + 188);
    }

    // 1: Didi Soğuk Çay Fridge Header
    {
      const [x, y] = pos(1);
      const grad = ctx.createLinearGradient(x, y, x, y + cell);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, cell, cell);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(x + 48, y + 190, 36, 0, Math.PI * 2);
      ctx.arc(x + 210, y + 180, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 72px sans-serif';
      ctx.fillText('di di', x + 128, y + 132);
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('SOĞUK ÇAY', x + 128, y + 180);
    }

    // 2: Pepsi Fridge Header
    {
      const [x, y] = pos(2);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, y, cell, cell);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(x + 62, y + 128, 36, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(x + 62, y + 128, 36, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 26, y + 118, 72, 20);
      ctx.font = '900 44px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('pepsi', x + 112, y + 144);
      ctx.textAlign = 'center';
    }

    // 3: Patos Header
    {
      const [x, y] = pos(3);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(x, y, cell, cell);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(x + 16, y + 20, cell - 32, cell - 40);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x + 24, y + 28, cell - 48, cell - 56);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 58px sans-serif';
      ctx.fillText('Patos', x + 128, y + 135);
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('ÇITIR LEZZETLER', x + 128, y + 178);
    }

    // 4: Z13 Plaque (top) + Yupo Header (bottom)
    {
      const [x, y] = pos(4);
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(x, y, cell, 128);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.strokeRect(x + 12, y + 12, cell - 24, 104);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 66px sans-serif';
      ctx.fillText('Z13', x + 128, y + 86);

      ctx.fillStyle = '#facc15';
      ctx.fillRect(x, y + 128, cell, 128);
      ctx.fillStyle = '#dc2626';
      ctx.font = '900 54px sans-serif';
      ctx.fillText('YUPO', x + 128, y + 214);
    }

    // 5: PUSULA Stand Header
    {
      const [x, y] = pos(5);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x, y, cell, cell);
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(x, y, cell, 36);
      ctx.fillRect(x, y + cell - 36, cell, 36);
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 46px sans-serif';
      ctx.fillText('PUSULA', x + 128, y + 132);
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('TOKAT ÖZEL', x + 128, y + 172);
    }

    // 6: Taped Wall Price List
    {
      const [x, y] = pos(6);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 8, y + 8, cell - 16, cell - 16);
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 26px sans-serif';
      ctx.fillText('FİYAT LİSTESİ', x + 128, y + 48);
      ctx.textAlign = 'left';
      const items = [
        ['Poğaça / Simit', '20 ₺'],
        ['Tokat Pidesi', '45 ₺'],
        ['Kaşarlı Tost', '65 ₺'],
        ['Sıcak Çay', '15 ₺'],
        ['Zile Pekmezi', '160 ₺'],
        ['Tokat Yaprağı', '180 ₺']
      ];
      ctx.font = 'bold 19px sans-serif';
      for (let i = 0; i < items.length; i++) {
        const ry = y + 86 + i * 27;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(x + 190, ry - 17, 48, 22);
        ctx.fillStyle = '#1e293b';
        ctx.fillText(items[i][0], x + 20, ry);
        ctx.fillText(items[i][1], x + 194, ry);
      }
      ctx.textAlign = 'center';
    }

    // 7: Photocopier Price Note (top) + TENO Carton Logo (bottom)
    {
      const [x, y] = pos(7);
      ctx.fillStyle = '#fffef7';
      ctx.fillRect(x, y, cell, 128);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 8, y + 8, cell - 16, 112);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('Fotokopi : 10 ₺', x + 128, y + 54);
      ctx.fillText('Bilg. Çıktı : 20 ₺', x + 128, y + 96);

      ctx.fillStyle = '#b48a5a';
      ctx.fillRect(x, y + 128, cell, 128);
      ctx.fillStyle = '#1e3a8a';
      ctx.font = '900 54px sans-serif';
      ctx.fillText('Teno', x + 128, y + 206);
    }

    // 8: Cashier POS Monitor UI Screen
    {
      const [x, y] = pos(8);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, y, cell, cell);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(x + 8, y + 10, cell - 16, 44);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('EMİN BÜFE POS v2.6', x + 128, y + 39);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(x + 14, y + 66, cell - 28, 74);
      ctx.fillStyle = '#064e3b';
      ctx.font = '900 32px monospace';
      ctx.fillText('KASA HAZIR', x + 128, y + 114);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x + 14, y + 154, 108, 84);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x + 134, y + 154, 108, 84);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('NAKİT', x + 68, y + 202);
      ctx.fillText('KART', x + 188, y + 202);
    }

    // 9: Dark Veined Emperador Marble (Exterior Columns!)
    {
      const [x, y] = pos(9);
      ctx.fillStyle = '#231f20';
      ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = 'rgba(226, 214, 195, 0.42)';
      ctx.lineWidth = 2.5;
      for (let v = 0; v < 9; v++) {
        ctx.beginPath();
        ctx.moveTo(x + (v * 33) % 256, y);
        ctx.bezierCurveTo(
          x + ((v * 67 + 40) % 256),
          y + 85,
          x + ((v * 91 + 120) % 256),
          y + 170,
          x + ((v * 47 + 200) % 256),
          y + 256
        );
        ctx.stroke();
      }
    }

    // 10: White Calacatta Veined Marble (Kasa & Vitrine Countertops!)
    {
      const [x, y] = pos(10);
      ctx.fillStyle = '#f3f5f8';
      ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.42)';
      ctx.lineWidth = 2;
      for (let v = 0; v < 7; v++) {
        ctx.beginPath();
        ctx.moveTo(x, y + v * 38);
        ctx.bezierCurveTo(x + 85, y + v * 38 + 22, x + 170, y + v * 38 - 18, x + 256, y + v * 38 + 14);
        ctx.stroke();
      }
    }

    // 11: Turkish Flag Plaque & Nazar Magnet Accent
    {
      const [x, y] = pos(11);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x, y, cell, cell);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + 112, y + 128, 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(x + 126, y + 128, 43, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + 178, y + 128, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = 'left';
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    this.signAtlas = tex;
  }

  _buildClothAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#311238';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle linen weave texture
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 512; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    const drawFlower = (cx, cy, r) => {
      const petals = ['#ef4444', '#facc15', '#38bdf8', '#f8fafc', '#22c55e'];
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2;
        ctx.fillStyle = petals[p % petals.length];
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    };

    for (let gx = 48; gx < 512; gx += 96) {
      for (let gy = 48; gy < 512; gy += 96) {
        drawFlower(gx, gy, 30);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(gx - 28, gy + 28);
        ctx.lineTo(gx + 28, gy - 28);
        ctx.stroke();
      }
    }

    // Gold coin / pul (oya) borders
    ctx.fillStyle = '#facc15';
    for (let i = 16; i < 512; i += 22) {
      ctx.beginPath();
      ctx.arc(i, 12, 7, 0, Math.PI * 2);
      ctx.arc(i, 500, 7, 0, Math.PI * 2);
      ctx.arc(12, i, 7, 0, Math.PI * 2);
      ctx.arc(500, i, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    this.clothAtlas = tex;
  }

  _buildWifiNoteTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#fdfbf3';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 2;
    for (let y = 110; y < 470; y += 54) {
      ctx.beginPath();
      ctx.moveTo(32, y);
      ctx.lineTo(480, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(245, 222, 160, 0.9)';
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

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 450, 1024, 62);
    const tickerText =
      '★ EMİN BÜFE (Z13) HİZMETİNİZDE: SICAK BÖREK, ZİLE PEKMEZİ, TOKAT YAPRAĞI, SOFRA BEZİ, SOĞUK İÇECEKLER VE EFSANE Wİ-Fİ! ★   ';
    const offset = (this._boardPhase * 90) % 1500;
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

    ctx.fillStyle = '#cfd5de';
    ctx.fillRect(0, 0, 512, 512);

    for (let gx = 0; gx < 4; gx++) {
      for (let gy = 0; gy < 4; gy++) {
        ctx.fillStyle = (gx + gy) % 2 === 0 ? '#dce1e8' : '#d2d8e0';
        ctx.fillRect(gx * 128 + 2, gy * 128 + 2, 124, 124);
        // Subtle porcelain marbling
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gx * 128 + 14, gy * 128 + 24);
        ctx.lineTo(gx * 128 + 112, gy * 128 + 98);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = 'rgba(100, 116, 139, 0.42)';
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
