import * as THREE from 'three';

const _projVec = new THREE.Vector3();

export class UIManager {
  constructor() {
    this.hud = document.getElementById('hud');
    this.startOverlay = document.getElementById('start-overlay');
    this.btnStart = document.getElementById('btn-start');
    this.btnToggleMode = document.getElementById('btn-toggle-mode');
    this.controlsGuide = document.getElementById('controls-guide');

    this.cashValue = document.getElementById('cash-value');
    this.fridgeValue = document.getElementById('fridge-value');
    this.eventsValue = document.getElementById('events-value');

    this.questBox = document.getElementById('quest-box');
    this.questTitle = document.getElementById('quest-title');
    this.questSub = document.getElementById('quest-sub');

    this.npcHpWrap = document.getElementById('npc-hp-wrap');
    this.npcHpName = document.getElementById('npc-hp-name');
    this.npcHpCount = document.getElementById('npc-hp-count');
    this.npcHpFill = document.getElementById('npc-hp-fill');
    this.sprintPill = document.getElementById('sprint-pill');

    this.crosshair = document.getElementById('crosshair');
    this.interactPrompt = document.getElementById('interact-prompt');
    this.interactKey = document.getElementById('interact-key');
    this.interactText = document.getElementById('interact-text');

    this.progressWrap = document.getElementById('progress-wrap');
    this.progressLabel = document.getElementById('progress-label');
    this.progressFill = document.getElementById('progress-fill');

    this.toastBox = document.getElementById('toast-box');
    this.rageVignette = document.getElementById('rage-vignette');

    this.dialogueOverlay = document.getElementById('dialogue-overlay');
    this.dlgSpeaker = document.getElementById('dlg-speaker');
    this.dlgBadge = document.getElementById('dlg-badge');
    this.dlgText = document.getElementById('dlg-text');
    this.dlgOptions = document.getElementById('dlg-options');

    this.mobileControls = document.getElementById('mobile-controls');
    this.joystickKnob = document.getElementById('joystick-knob');
    this.btnMobileInteract = document.getElementById('btn-mobile-interact');
    this.mobileInteractLabel = document.getElementById('mobile-interact-label');

    this.btnSound = document.getElementById('btn-sound');
    this.btnDebugToggle = document.getElementById('btn-debug-toggle');
    this.debugPanel = document.getElementById('debug-panel');
    this.dbgFps = document.getElementById('dbg-fps');
    this.dbgCalls = document.getElementById('dbg-calls');
    this.dbgTris = document.getElementById('dbg-tris');
    this.dbgDpr = document.getElementById('dbg-dpr');
    this.btnAaToggle = document.getElementById('btn-aa-toggle');

    this._toastTimer = null;
    this._rageTimer = null;
    this.debugOpen = false;

    // Pre-allocated DOM pool of comic impact popups ("ÇAT!", "ÇUT!", "NAKAVT!")
    this.hitPopLayer = document.getElementById('hit-pop-layer');
    this._hitPops = [];
    this._hitPopIndex = 0;
    if (this.hitPopLayer) {
      for (let i = 0; i < 6; i++) {
        const el = document.createElement('div');
        el.className = 'hit-pop hidden';
        this.hitPopLayer.appendChild(el);
        this._hitPops.push({ el, timer: null });
      }
    }

    this.btnDebugToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDebug();
    });
  }

  setReady() {
    this.btnStart.disabled = false;
    this.btnStart.textContent = 'Vardiyayı Başlat';
  }

  showGameHUD(isMobile) {
    this.startOverlay.classList.add('hidden');
    this.hud.classList.remove('hidden');
    this.crosshair.classList.toggle('hidden', isMobile);
  }

  updateControlsGuide(isMobile, modeLabel) {
    this.btnToggleMode.textContent = modeLabel;
    if (isMobile) {
      this.controlsGuide.innerHTML =
        '<strong>Mobil Dokunmatik:</strong> Sol alt sanal joystick ile yürü • Sağ yarıda sürükleyerek bak • Sağ alttaki <strong>ETKİLEŞ</strong> ve <strong>KOŞ</strong> tuşlarını kullan.';
    } else {
      this.controlsGuide.innerHTML =
        '<strong>PC Kontrolleri:</strong> <code>W A S D</code> yürü • <code>Fare</code> etrafa bak • <code>Shift</code> koş • <code>E</code> veya <code>Sol Tık</code> etkileşim • <code>F3</code> performans.';
    }
    if (!this.startOverlay.classList.contains('hidden')) {
      this.crosshair.classList.add('hidden');
    } else {
      this.crosshair.classList.toggle('hidden', isMobile);
    }
  }

  setMobileControlsVisible(visible) {
    this.mobileControls.classList.toggle('hidden', !visible);
  }

  setJoystickKnob(dx, dy) {
    this.joystickKnob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
  }

  setStats(cash, fridgePct, eventsDone, eventsTotal = 3) {
    this.cashValue.textContent = `${cash} ₺`;
    const pct = Math.round(fridgePct);
    this.fridgeValue.textContent = `${pct}%`;
    this.fridgeValue.classList.toggle('warn', pct <= 20);
    this.eventsValue.textContent = `${eventsDone}/${eventsTotal}`;
  }

  setQuest(title, sub, urgent = false) {
    this.questTitle.textContent = title;
    this.questSub.textContent = sub;
    this.questBox.classList.toggle('urgent', urgent);
  }

  setNpcHealth(visible, name = 'SOFRABEZİ SABOTAJCISI', hp = 0, maxHp = 5) {
    this.npcHpWrap.classList.toggle('hidden', !visible);
    if (visible) {
      this.npcHpName.textContent = name;
      this.npcHpCount.textContent = `${hp}/${maxHp}`;
      const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
      this.npcHpFill.style.width = `${pct.toFixed(1)}%`;
    }
  }

  setSprintIndicator(active) {
    this.sprintPill.classList.toggle('hidden', !active);
  }

  setCrosshairHot(hot) {
    this.crosshair.classList.toggle('hot', hot);
  }

  setInteractPrompt(visible, text = '', isMobile = false, keyLabel = 'E') {
    if (!visible) {
      this.interactPrompt.classList.add('hidden');
      this.btnMobileInteract.classList.remove('active');
      this.mobileInteractLabel.textContent = 'ETKİLEŞ';
      return;
    }
    this.interactKey.textContent = isMobile ? '✋' : keyLabel;
    this.interactText.textContent = text;
    this.interactPrompt.classList.remove('hidden');
    this.btnMobileInteract.classList.add('active');
    this.mobileInteractLabel.textContent = text.length > 14 ? 'ETKİLEŞ' : text.toUpperCase();
  }

  setProgress(visible, ratio = 0, label = '') {
    this.progressWrap.classList.toggle('hidden', !visible);
    if (visible) {
      this.progressLabel.textContent = label;
      this.progressFill.style.width = `${Math.max(0, Math.min(100, ratio * 100)).toFixed(1)}%`;
    }
  }

  showToast(message, durationMs = 3400, isRage = false) {
    this.toastBox.textContent = message;
    this.toastBox.classList.toggle('rage', isRage);
    this.toastBox.classList.remove('hidden');
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toastBox.classList.add('hidden');
    }, durationMs);
  }

  triggerRageVignette(durationMs = 2400) {
    this.rageVignette.classList.remove('hidden');
    if (this._rageTimer) clearTimeout(this._rageTimer);
    this._rageTimer = setTimeout(() => {
      this.rageVignette.classList.add('hidden');
    }, durationMs);
  }

  spawnHitPopup(worldX, worldY, worldZ, camera, label, isFinisher = false) {
    if (!this._hitPops.length) return;
    const slot = this._hitPops[this._hitPopIndex];
    this._hitPopIndex = (this._hitPopIndex + 1) % this._hitPops.length;
    if (slot.timer) clearTimeout(slot.timer);

    _projVec.set(worldX, worldY, worldZ).project(camera);
    let sx = window.innerWidth * 0.5;
    let sy = window.innerHeight * 0.44;
    if (_projVec.z <= 1) {
      sx = (_projVec.x * 0.5 + 0.5) * window.innerWidth + (Math.random() - 0.5) * 42;
      sy = (-_projVec.y * 0.5 + 0.5) * window.innerHeight + (Math.random() - 0.5) * 24;
    }
    sx = Math.max(80, Math.min(window.innerWidth - 80, sx));
    sy = Math.max(80, Math.min(window.innerHeight - 80, sy));

    const el = slot.el;
    el.textContent = label;
    el.style.left = `${sx.toFixed(0)}px`;
    el.style.top = `${sy.toFixed(0)}px`;
    el.className = 'hit-pop' + (isFinisher ? ' finisher' : '');
    void el.offsetWidth;
    el.classList.add('active');
    slot.timer = setTimeout(() => {
      el.className = 'hit-pop hidden';
    }, 650);
  }

  openDialogue(speaker, badge, text, options, onChoose) {
    this.interactPrompt.classList.add('hidden');
    this.toastBox.classList.add('hidden');
    this.sprintPill.classList.add('hidden');
    this.crosshair.classList.remove('hot');
    this.dlgSpeaker.textContent = speaker;
    this.dlgBadge.textContent = badge;
    this.dlgText.textContent = text;
    this.dlgOptions.innerHTML = '';

    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dlg-option-btn' + (opt.highlight ? ' highlight' : '');
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        this.closeDialogue();
        onChoose(opt.id);
      });
      this.dlgOptions.appendChild(btn);
    });

    this.dialogueOverlay.classList.remove('hidden');
  }

  closeDialogue() {
    this.dialogueOverlay.classList.add('hidden');
  }

  setMutedUI(muted) {
    this.btnSound.textContent = muted ? '🔇' : '🔊';
  }

  toggleDebug() {
    this.debugOpen = !this.debugOpen;
    this.debugPanel.classList.toggle('hidden', !this.debugOpen);
  }

  updateDebug(fps, calls, tris, dpr, aaEnabled) {
    if (!this.debugOpen) return;
    this.dbgFps.textContent = Math.round(fps);
    this.dbgCalls.textContent = calls;
    this.dbgCalls.style.color = calls < 70 ? '#34d399' : '#f87171';
    this.dbgTris.textContent = tris.toLocaleString('tr-TR');
    this.dbgDpr.textContent = dpr.toFixed(2);
    this.btnAaToggle.textContent = `AA: ${aaEnabled ? 'Açık' : 'Kapalı'}`;
  }
}
