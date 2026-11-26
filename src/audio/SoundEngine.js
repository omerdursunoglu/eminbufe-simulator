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

  playStickHit(combo = 1) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Punchy wooden body thud
    const thud = this.ctx.createOscillator();
    const tGain = this.ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(175, now);
    thud.frequency.exponentialRampToValueAtTime(48, now + 0.12);
    tGain.gain.setValueAtTime(0.32, now);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    thud.connect(tGain);
    tGain.connect(this.master);
    thud.start(now);
    thud.stop(now + 0.15);

    // 2. Sharp wooden slap crack
    const crack = this.ctx.createOscillator();
    const cGain = this.ctx.createGain();
    crack.type = 'square';
    crack.frequency.setValueAtTime(520, now);
    crack.frequency.exponentialRampToValueAtTime(135, now + 0.065);
    cGain.gain.setValueAtTime(0.18, now);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    crack.connect(cGain);
    cGain.connect(this.master);
    crack.start(now);
    crack.stop(now + 0.08);

    // 3. Comical rising "BOINK/OUCH" tone
    const yelp = this.ctx.createOscillator();
    const yGain = this.ctx.createGain();
    yelp.type = 'sine';
    const base = 360 + Math.min(5, combo) * 48;
    yelp.frequency.setValueAtTime(base, now + 0.02);
    yelp.frequency.exponentialRampToValueAtTime(base * 0.62, now + 0.14);
    yGain.gain.setValueAtTime(0.16, now + 0.02);
    yGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    yelp.connect(yGain);
    yGain.connect(this.master);
    yelp.start(now + 0.02);
    yelp.stop(now + 0.17);
  }

  playKnockout() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Heavy KO thwack
    const thud = this.ctx.createOscillator();
    const tGain = this.ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(210, now);
    thud.frequency.exponentialRampToValueAtTime(36, now + 0.24);
    tGain.gain.setValueAtTime(0.36, now);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    thud.connect(tGain);
    tGain.connect(this.master);
    thud.start(now);
    thud.stop(now + 0.28);

    // Descending cartoon dizzy slide
    const slide = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    slide.type = 'sine';
    slide.frequency.setValueAtTime(680, now + 0.05);
    slide.frequency.exponentialRampToValueAtTime(140, now + 0.45);
    sGain.gain.setValueAtTime(0.18, now + 0.05);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    slide.connect(sGain);
    sGain.connect(this.master);
    slide.start(now + 0.05);
    slide.stop(now + 0.5);
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

  playPunchHit(comboIdx = 0, isFinisher = false) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    // 1. Crisp "ÇAT / ÇUT" slap transient (short bandpass noise burst)
    const dur = isFinisher ? 0.14 : 0.085;
    const bufLen = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.28));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = isFinisher ? 950 : comboIdx % 2 === 0 ? 1550 : 1120;
    filter.Q.value = 1.4;

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(isFinisher ? 0.52 : 0.36, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.master);
    noise.start(now);

    // 2. Heavy "KÜT" body punch thump
    const thump = this.ctx.createOscillator();
    const tGain = this.ctx.createGain();
    thump.type = isFinisher ? 'sawtooth' : 'triangle';
    const startFreq = isFinisher ? 150 : comboIdx % 2 === 0 ? 195 : 165;
    thump.frequency.setValueAtTime(startFreq, now);
    thump.frequency.exponentialRampToValueAtTime(isFinisher ? 34 : 46, now + (isFinisher ? 0.24 : 0.11));
    tGain.gain.setValueAtTime(isFinisher ? 0.42 : 0.26, now);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + (isFinisher ? 0.26 : 0.12));
    thump.connect(tGain);
    tGain.connect(this.master);
    thump.start(now);
    thump.stop(now + (isFinisher ? 0.28 : 0.13));

    // 3. Finisher floor slam + comic star ring
    if (isFinisher) {
      const slamT = now + 0.16;
      const slam = this.ctx.createOscillator();
      const sGain = this.ctx.createGain();
      slam.type = 'sine';
      slam.frequency.setValueAtTime(95, slamT);
      slam.frequency.exponentialRampToValueAtTime(28, slamT + 0.22);
      sGain.gain.setValueAtTime(0.32, slamT);
      sGain.gain.exponentialRampToValueAtTime(0.001, slamT + 0.24);
      slam.connect(sGain);
      sGain.connect(this.master);
      slam.start(slamT);
      slam.stop(slamT + 0.25);
    }
  }

  playThiefSpotted() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [330, 293.66, 246.94];
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.09;
      osc.frequency.setValueAtTime(notes[i], t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  playThiefStole() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(175, now + 0.24);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.27);
  }
}
