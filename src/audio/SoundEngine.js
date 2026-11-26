// 100% Procedural Web Audio API synthesizer — zero external audio files required

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._ambientStarted = false;
    this._ambientGain = null;

    this._footstepTimer = 0;
    this._restockTickTimer = 0;
    this._chasePlaying = false;
    this._chaseTimer = null;
    this._chaseStep = 0;
    this._paTimer = 9;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.48;
    this.master.connect(this.ctx.destination);

    this._startTerminalAmbience();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.48, this.ctx.currentTime, 0.04);
    }
    return this.muted;
  }

  _startTerminalAmbience() {
    if (!this.ctx || this._ambientStarted) return;
    this._ambientStarted = true;

    // Subtle terminal HVAC + distant bus idle hum (filtered pink-ish noise + low sine)
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.03 * white) / 1.03;
      data[i] = last * 1.8;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;

    this._ambientGain = this.ctx.createGain();
    this._ambientGain.gain.value = 0.08;

    noise.connect(filter);
    filter.connect(this._ambientGain);
    this._ambientGain.connect(this.master);
    noise.start();
  }

  update(dt, isMoving, isSprinting) {
    if (!this.ctx || this.muted) return;

    // Footsteps
    if (isMoving) {
      const interval = isSprinting ? 0.25 : 0.42;
      this._footstepTimer += dt;
      if (this._footstepTimer >= interval) {
        this._footstepTimer = 0;
        this.playFootstep(isSprinting);
      }
    } else {
      this._footstepTimer = 0.2;
    }

    // Occasional terminal announcement chime
    this._paTimer -= dt;
    if (this._paTimer <= 0) {
      this._paTimer = 22 + Math.random() * 14;
      if (!this._chasePlaying) this.playTerminalChime();
    }
  }

  playFootstep(sprint) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const pitch = (sprint ? 115 : 88) + Math.random() * 18;
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.055);
    gain.gain.setValueAtTime(sprint ? 0.14 : 0.085, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  playTerminalChime() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.22;
      osc.frequency.setValueAtTime(notes[i], t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.09, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + 0.58);
    }
  }

  playCashRegister() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Metallic "Çing!"
    const freqs = [1480, 2240, 2960];
    for (let i = 0; i < freqs.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      const t = now + (i === 0 ? 0 : 0.055);
      osc.frequency.setValueAtTime(freqs[i], t);
      gain.gain.setValueAtTime(0.14 / (i + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + 0.38);
    }
  }

  playUiClick() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  playFridgeOpen() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.11);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playRestockTick(dt, progress) {
    if (!this.ctx) return;
    this._restockTickTimer += dt;
    if (this._restockTickTimer < 0.16) return;
    this._restockTickTimer = 0;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380 + progress * 460, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playClothPickup(countRatio = 0.5) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360 + countRatio * 340, now);
    osc.frequency.exponentialRampToValueAtTime(640 + countRatio * 340, now + 0.08);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playStickSwing() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.13);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playRageSting() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [110, 116.5, 155.5];
    for (let i = 0; i < freqs.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freqs[i], now);
      osc.frequency.linearRampToValueAtTime(freqs[i] * 0.88, now + 0.45);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 650;
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.58);
    }
  }

  playQuestSuccess() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const melody = [523.25, 659.25, 783.99, 1046.5];
    for (let i = 0; i < melody.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.085;
      osc.frequency.setValueAtTime(melody[i], t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + 0.28);
    }
  }

  startChaseMusic() {
    if (!this.ctx || this._chasePlaying) return;
    this._chasePlaying = true;
    this._chaseStep = 0;

    // Comical upbeat Turkish-arcade chase rhythm (~158 BPM 8th notes = 190ms)
    const bassSeq = [146.83, 220, 146.83, 261.63, 164.81, 220, 174.61, 220];
    const leadSeq = [587.33, 0, 698.46, 659.25, 587.33, 523.25, 440, 523.25];

    this._chaseTimer = window.setInterval(() => {
      if (!this.ctx || !this._chasePlaying) return;
      const now = this.ctx.currentTime;
      const idx = this._chaseStep % bassSeq.length;
      this._chaseStep++;

      // Bouncy bass
      const bass = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bass.type = 'square';
      bass.frequency.setValueAtTime(bassSeq[idx], now);
      bGain.gain.setValueAtTime(0.085, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      bass.connect(bGain);
      bGain.connect(this.master);
      bass.start(now);
      bass.stop(now + 0.15);

      // Comical lead
      const leadFreq = leadSeq[idx];
      if (leadFreq > 0) {
        const lead = this.ctx.createOscillator();
        const lGain = this.ctx.createGain();
        lead.type = 'triangle';
        lead.frequency.setValueAtTime(leadFreq, now);
        lGain.gain.setValueAtTime(0.11, now);
        lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        lead.connect(lGain);
        lGain.connect(this.master);
        lead.start(now);
        lead.stop(now + 0.14);
      }
    }, 185);
  }

  stopChaseMusic() {
    this._chasePlaying = false;
    if (this._chaseTimer !== null) {
      clearInterval(this._chaseTimer);
      this._chaseTimer = null;
    }
  }
}
