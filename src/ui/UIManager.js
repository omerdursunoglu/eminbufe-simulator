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

  openDialogue(speaker, badge, text, options, onChoose) {
    this.interactPrompt.classList.add('hidden');
    this.toastBox.classList.add('hidden');
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
