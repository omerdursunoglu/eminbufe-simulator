import * as THREE from 'three';

const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();

export class Engine {
  constructor(canvas, isMobile) {
    this.canvas = canvas;
    this.isMobile = isMobile;
    this.antialiasEnabled = !isMobile;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdbe4ee);
    this.scene.fog = new THREE.Fog(0xdbe4ee, 28, 72);

    this.camera = new THREE.PerspectiveCamera(
      68,
      window.innerWidth / window.innerHeight,
      0.1,
      95
    );
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.yaw = 0;
    this.pitch = 0;
    this.baseEyeHeight = 1.66;
    this.bobPhase = 0;
    this.shakeIntensity = 0;
    this.shakeTime = 0;

    this.renderer = this._createRenderer(canvas, this.antialiasEnabled);
    this._setupLighting();

    this._onResize = this.resize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  _createRenderer(canvas, antialias) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias,
      powerPreference: 'high-performance',
      stencil: false
    });
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = false;
    return renderer;
  }

  _setupLighting() {
    // Hard budget: strictly 1 HemisphereLight + 1 DirectionalLight, zero shadow maps
    const hemi = new THREE.HemisphereLight(0xffffff, 0xc2bcb2, 1.58);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xfff8ed, 0.92);
    dir.position.set(6, 18, 16);
    this.scene.add(dir);
  }

  toggleAntialias() {
    this.antialiasEnabled = !this.antialiasEnabled;
    const oldCanvas = this.canvas;
    const newCanvas = oldCanvas.cloneNode(false);
    oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
    this.renderer.dispose();
    this.canvas = newCanvas;
    this.renderer = this._createRenderer(newCanvas, this.antialiasEnabled);
    return this.antialiasEnabled;
  }

  getDpr() {
    return this.renderer.getPixelRatio();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(w, h, false);
  }

  setLook(yaw, pitch) {
    this.yaw = yaw;
    this.pitch = Math.max(-1.38, Math.min(1.38, pitch));
  }

  setShake(intensity) {
    this.shakeIntensity = intensity;
  }

  applyCamera(posX, posZ, dt, moveSpeedRatio, isSprinting) {
    if (moveSpeedRatio > 0.05) {
      const freq = isSprinting ? 14.5 : 9.5;
      this.bobPhase += dt * freq * moveSpeedRatio;
    } else {
      this.bobPhase *= Math.max(0, 1 - dt * 8);
    }

    const bobY = Math.sin(this.bobPhase) * (isSprinting ? 0.055 : 0.028) * moveSpeedRatio;
    const bobX = Math.cos(this.bobPhase * 0.5) * 0.018 * moveSpeedRatio;

    let shakeX = 0;
    let shakeY = 0;
    let shakeRoll = 0;
    if (this.shakeIntensity > 0.0001) {
      this.shakeTime += dt * 42;
      shakeX = Math.sin(this.shakeTime * 1.13) * this.shakeIntensity;
      shakeY = Math.cos(this.shakeTime * 1.47) * this.shakeIntensity * 0.85;
      shakeRoll = Math.sin(this.shakeTime * 0.8) * this.shakeIntensity * 1.4;
    }

    this.camera.position.set(
      posX + bobX + shakeX,
      this.baseEyeHeight + bobY + shakeY,
      posZ
    );
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = shakeRoll;
  }

  /**
   * Returns pre-allocated horizontal forward direction (zero GC).
   */
  getHorizontalForward(out) {
    out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    return out;
  }

  getHorizontalRight(out) {
    _camForward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    out.set(-_camForward.z, 0, _camForward.x).normalize();
    return out;
  }

  getCameraForward(out) {
    this.camera.getWorldDirection(out);
    return out;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  getRenderStats() {
    return {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures
    };
  }
}

export { _camForward, _camRight };
