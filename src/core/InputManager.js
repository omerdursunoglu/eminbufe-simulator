// Unified PC (WASD + PointerLock + Shift + E/Click) & Mobile (Virtual Joystick + Touch-Look + Buttons)

export class InputManager {
  constructor(canvasProvider, ui) {
    this.getCanvas = canvasProvider;
    this.ui = ui;

    this.isMobile = this.detectMobile();
    this.manualMode = 'auto'; // 'auto' | 'pc' | 'mobile'
    this.active = false;
    this.dialogueOpen = false;
    this.pointerLocked = false;

    // Movement vector (-1..1)
    this.moveX = 0;
    this.moveY = 0;
    this.sprint = false;
    this.mobileSprintToggle = false;

    // Look deltas consumed each frame
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;

    // Interaction triggers
    this.interactJustPressed = false;
    this.interactHeld = false;
    this._eKeyDown = false;
    this._mouseHeld = false;
    this._mobileInteractHeld = false;

    // Keyboard state
    this.keys = Object.create(null);

    // Mobile multi-touch IDs
    this._joyTouchId = null;
    this._joyCenterX = 0;
    this._joyCenterY = 0;
    this._joyMaxR = 44;

    this._lookTouchId = null;
    this._lookLastX = 0;
    this._lookLastY = 0;

    this.onToggleDebug = null;
    this._bindEvents();
    this._syncControlUI();
  }

  detectMobile() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const narrow = window.innerWidth <= 900;
    return coarse || (touch && narrow);
  }

  effectiveMobile() {
    if (this.manualMode === 'mobile') return true;
    if (this.manualMode === 'pc') return false;
    return this.isMobile;
  }

  cycleMode() {
    if (this.manualMode === 'auto') this.manualMode = this.isMobile ? 'pc' : 'mobile';
    else if (this.manualMode === 'mobile') this.manualMode = 'pc';
    else this.manualMode = 'auto';
    this._syncControlUI();
    return this.manualMode;
  }

  getModeLabel() {
    if (this.manualMode === 'auto') {
      return `Kontrol Modu: Otomatik (${this.effectiveMobile() ? 'Mobil' : 'PC'})`;
    }
    return `Kontrol Modu: ${this.manualMode === 'mobile' ? 'Mobil Dokunmatik' : 'PC Klavye+Fare'}`;
  }

  _syncControlUI() {
    const mobile = this.effectiveMobile();
    this.ui.setMobileControlsVisible(mobile && this.active && !this.dialogueOpen);
    this.ui.updateControlsGuide(mobile, this.getModeLabel());
  }

  setActive(active) {
    this.active = active;
    this._syncControlUI();
  }

  setDialogueOpen(open) {
    this.dialogueOpen = open;
    if (open && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    if (open) {
      this._eKeyDown = false;
      this._mouseHeld = false;
      this._mobileInteractHeld = false;
      this.interactHeld = false;
      this.moveX = 0;
      this.moveY = 0;
      this._resetJoystick();
    }
    this._syncControlUI();
  }

  requestLockIfPC() {
    if (this.effectiveMobile() || this.dialogueOpen) return;
    const canvas = this.getCanvas();
    if (canvas && document.pointerLockElement !== canvas) {
      try {
        const res = canvas.requestPointerLock?.();
        if (res && typeof res.catch === 'function') res.catch(() => {});
      } catch {
        // Ignore browser gesture rejections
      }
    }
  }

  consumeLook(out) {
    out.x = this.lookDeltaX;
    out.y = this.lookDeltaY;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
  }

  consumeInteractPress() {
    const v = this.interactJustPressed;
    this.interactJustPressed = false;
    return v;
  }

  updateKeyboardMovement() {
    if (this.effectiveMobile() || !this.active || this.dialogueOpen) {
      if (!this.effectiveMobile()) {
        this.moveX = 0;
        this.moveY = 0;
        this.sprint = false;
      }
      this.interactHeld = this._mobileInteractHeld;
      return;
    }

    let x = 0;
    let y = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) y += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) y -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;

    if (x !== 0 && y !== 0) {
      const inv = 0.70710678;
      x *= inv;
      y *= inv;
    }
    this.moveX = x;
    this.moveY = y;
    this.sprint = Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    this.interactHeld = this._eKeyDown || this._mouseHeld;
  }

  _resetJoystick() {
    this._joyTouchId = null;
    if (!this.effectiveMobile()) return;
    this.moveX = 0;
    this.moveY = 0;
    this.ui.setJoystickKnob(0, 0);
  }

  _bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.onToggleDebug?.();
        return;
      }
      if (!this.active || this.dialogueOpen) return;
      this.keys[e.code] = true;
      if (e.code === 'KeyE' && !e.repeat) {
        this._eKeyDown = true;
        this.interactJustPressed = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'KeyE') {
        this._eKeyDown = false;
      }
    });

    window.addEventListener('blur', () => {
      for (const k in this.keys) this.keys[k] = false;
      this._eKeyDown = false;
      this._mouseHeld = false;
      this.moveX = 0;
      this.moveY = 0;
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.getCanvas();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.active || this.dialogueOpen || this.effectiveMobile()) return;
      if (!this.pointerLocked) return;
      const sens = 0.0021;
      this.lookDeltaX -= e.movementX * sens;
      this.lookDeltaY -= e.movementY * sens;
    });

    window.addEventListener('mousedown', (e) => {
      if (!this.active || this.dialogueOpen || this.effectiveMobile()) return;
      if (e.target !== this.getCanvas()) return;
      if (!this.pointerLocked) {
        this.requestLockIfPC();
        return;
      }
      if (e.button === 0) {
        this._mouseHeld = true;
        this.interactJustPressed = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this._mouseHeld = false;
      }
    });

    // Touch controls: Joystick
    const joyZone = document.getElementById('joystick-zone');
    const joyBase = document.getElementById('joystick-base');

    joyZone.addEventListener('touchstart', (e) => {
      if (!this.active || this.dialogueOpen) return;
      e.preventDefault();
      if (this._joyTouchId !== null) return;
      const t = e.changedTouches[0];
      this._joyTouchId = t.identifier;
      const rect = joyBase.getBoundingClientRect();
      this._joyCenterX = rect.left + rect.width * 0.5;
      this._joyCenterY = rect.top + rect.height * 0.5;
      this._updateJoystickFromTouch(t);
    }, { passive: false });

    joyZone.addEventListener('touchmove', (e) => {
      if (this._joyTouchId === null) return;
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this._joyTouchId) {
          this._updateJoystickFromTouch(t);
          break;
        }
      }
    }, { passive: false });

    const endJoy = (e) => {
      if (this._joyTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this._joyTouchId) {
          this._resetJoystick();
          break;
        }
      }
    };
    joyZone.addEventListener('touchend', endJoy);
    joyZone.addEventListener('touchcancel', endJoy);

    // Touch controls: Right-half camera drag
    const lookZone = document.getElementById('touch-look-zone');
    lookZone.addEventListener('touchstart', (e) => {
      if (!this.active || this.dialogueOpen) return;
      e.preventDefault();
      if (this._lookTouchId !== null) return;
      const t = e.changedTouches[0];
      this._lookTouchId = t.identifier;
      this._lookLastX = t.clientX;
      this._lookLastY = t.clientY;
    }, { passive: false });

    lookZone.addEventListener('touchmove', (e) => {
      if (this._lookTouchId === null) return;
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this._lookTouchId) {
          const dx = t.clientX - this._lookLastX;
          const dy = t.clientY - this._lookLastY;
          this._lookLastX = t.clientX;
          this._lookLastY = t.clientY;
          const sens = 0.0042;
          this.lookDeltaX -= dx * sens;
          this.lookDeltaY -= dy * sens;
          break;
        }
      }
    }, { passive: false });

    const endLook = (e) => {
      if (this._lookTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this._lookTouchId) {
          this._lookTouchId = null;
          break;
        }
      }
    };
    lookZone.addEventListener('touchend', endLook);
    lookZone.addEventListener('touchcancel', endLook);

    // Mobile buttons: Interact & Sprint
    const btnInteract = document.getElementById('btn-mobile-interact');
    const onInteractStart = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._mobileInteractHeld = true;
      this.interactHeld = true;
      this.interactJustPressed = true;
    };
    const onInteractEnd = (e) => {
      e.preventDefault();
      this._mobileInteractHeld = false;
      this.interactHeld = false;
    };
    btnInteract.addEventListener('touchstart', onInteractStart, { passive: false });
    btnInteract.addEventListener('touchend', onInteractEnd, { passive: false });
    btnInteract.addEventListener('touchcancel', onInteractEnd, { passive: false });
    btnInteract.addEventListener('click', (e) => {
      // Fallback for desktop testing in mobile mode
      e.stopPropagation();
      if (!this._mobileInteractHeld) this.interactJustPressed = true;
    });

    const btnSprint = document.getElementById('btn-mobile-sprint');
    const toggleMobileSprint = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.mobileSprintToggle = !this.mobileSprintToggle;
      this.sprint = this.mobileSprintToggle;
      btnSprint.classList.toggle('active', this.mobileSprintToggle);
    };
    btnSprint.addEventListener('touchstart', toggleMobileSprint, { passive: false });
    btnSprint.addEventListener('click', (e) => {
      // Only handle mouse clicks in mobile simulation
      if (e.pointerType !== 'touch') toggleMobileSprint(e);
    });
  }

  _updateJoystickFromTouch(t) {
    let dx = t.clientX - this._joyCenterX;
    let dy = t.clientY - this._joyCenterY;
    const dist = Math.hypot(dx, dy);
    if (dist > this._joyMaxR) {
      const s = this._joyMaxR / dist;
      dx *= s;
      dy *= s;
    }
    this.moveX = dx / this._joyMaxR;
    this.moveY = -dy / this._joyMaxR;
    this.sprint = this.mobileSprintToggle;
    this.ui.setJoystickKnob(dx, dy);
  }
}
