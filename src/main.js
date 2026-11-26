import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { CollisionWorld } from './core/CollisionWorld.js';
import { InputManager } from './core/InputManager.js';
import { SoundEngine } from './audio/SoundEngine.js';
import { UIManager } from './ui/UIManager.js';
import { TextureFactory } from './world/TextureFactory.js';
import { TerminalWorld } from './world/TerminalWorld.js';
import { EminBufe } from './world/EminBufe.js';
import { InteractiveObjects } from './world/InteractiveObjects.js';
import { ViewmodelStick } from './world/ViewmodelStick.js';
import { NpcFactory } from './npcs/NpcFactory.js';
import { NpcManager } from './npcs/NpcManager.js';
import { QuestState, QuestStateMachine } from './quests/QuestStateMachine.js';
import { StoryEvents } from './quests/StoryEvents.js';

// Pre-allocated Zero-GC temporaries for requestAnimationFrame loop
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _lookForward = new THREE.Vector3();
const _lookDelta = { x: 0, y: 0 };

async function bootstrap() {
  const ui = new UIManager();
  const sound = new SoundEngine();

  const canvas = document.getElementById('game-canvas');
  const input = new InputManager(() => engine.canvas, ui);
  const engine = new Engine(canvas, input.effectiveMobile());

  // Load & downscale ./gorseller/ reference photos into mipmapped CanvasTextures
  const textures = new TextureFactory();
  await textures.init();

  const colliders = new CollisionWorld();
  const terminal = new TerminalWorld(engine.scene, textures, colliders);
  const bufe = new EminBufe(engine.scene, textures, colliders);
  const interactables = new InteractiveObjects(bufe);
  const viewmodel = new ViewmodelStick(engine.camera);

  const npcFactory = new NpcFactory(engine.scene, textures, 6);
  const npcManager = new NpcManager(npcFactory, bufe, sound, colliders);

  const qsm = new QuestStateMachine();
  const story = new StoryEvents(qsm, bufe, npcManager, viewmodel, engine, ui, input, sound);

  npcManager.startRegularBuyerCycle(() => story.onRegularDrinkSold());

  // Player spawns right inside the accurate Kasa nook behind the pastry vitrine,
  // facing diagonally out across the monitor, Sofra stand, Didi fridge, and terminal hall
  const playerPos = new THREE.Vector3(0.76, 0, -2.92);
  engine.setLook(-Math.PI * 0.78, -0.05);
  engine.applyCamera(playerPos.x, playerPos.z, 0, 0, false);

  let started = false;
  let lastTime = performance.now();
  let boardUpdateAccum = 0;
  let debugUpdateAccum = 0;
  let frameCount = 0;
  let fpsAvg = 60;

  // UI Event Bindings
  ui.setReady();

  ui.btnStart.addEventListener('click', () => {
    sound.init();
    sound.playUiClick();
    started = true;
    input.setActive(true);
    ui.showGameHUD(input.effectiveMobile());
    input.requestLockIfPC();
    ui.showToast('Hoş geldin usta! Kasa başındasın — Wi-Fi notun duvar köşesinde, müşteriler önde!', 4200);
  });

  ui.btnToggleMode.addEventListener('click', () => {
    input.cycleMode();
  });

  ui.btnSound.addEventListener('click', (e) => {
    e.stopPropagation();
    sound.init();
    const muted = sound.toggleMute();
    ui.setMutedUI(muted);
  });

  ui.btnAaToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const aa = engine.toggleAntialias();
    ui.showToast(`Antialiasing: ${aa ? 'Açık' : 'Kapalı'}`, 1600);
  });

  input.onToggleDebug = () => ui.toggleDebug();

  // Main Zero-GC Animation Loop
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) * 0.001));
    lastTime = now;

    // Update FPS counters
    frameCount++;
    debugUpdateAccum += dt;
    if (debugUpdateAccum >= 0.25) {
      fpsAvg = fpsAvg * 0.6 + (frameCount / debugUpdateAccum) * 0.4;
      const stats = engine.getRenderStats();
      ui.updateDebug(fpsAvg, stats.calls, stats.triangles, engine.getDpr(), engine.antialiasEnabled);
      frameCount = 0;
      debugUpdateAccum = 0;
    }

    // Update live departure board every 140ms (keeps CanvasTexture upload super cheap)
    boardUpdateAccum += dt;
    if (boardUpdateAccum >= 0.14) {
      textures.updateDepartureBoard(boardUpdateAccum);
      boardUpdateAccum = 0;
    }

    terminal.update(dt);
    bufe.update(dt);

    if (!started) {
      engine.render();
      return;
    }

    // Look & Movement
    input.updateKeyboardMovement();
    input.consumeLook(_lookDelta);
    if (_lookDelta.x !== 0 || _lookDelta.y !== 0) {
      engine.setLook(engine.yaw + _lookDelta.x, engine.pitch + _lookDelta.y);
    }

    let moveRatio = 0;
    if (!input.dialogueOpen) {
      const mx = input.moveX;
      const my = input.moveY;
      const mag = Math.hypot(mx, my);
      if (mag > 0.05) {
        const clampedMag = Math.min(1, mag);
        moveRatio = clampedMag;
        const speed = input.sprint ? 8.3 : 4.5;
        engine.getHorizontalForward(_forward);
        engine.getHorizontalRight(_right);

        const nx = mx / mag;
        const ny = my / mag;
        const step = speed * clampedMag * dt;
        playerPos.x += (_forward.x * ny + _right.x * nx) * step;
        playerPos.z += (_forward.z * ny + _right.z * nx) * step;
        colliders.resolve(playerPos, 0.3);
      }
    }

    engine.applyCamera(playerPos.x, playerPos.z, dt, moveRatio, input.sprint);
    viewmodel.update(dt, moveRatio, input.sprint);
    sound.update(dt, moveRatio > 0.1, input.sprint);
    ui.setSprintIndicator(input.sprint && moveRatio > 0.1 && !input.dialogueOpen);

    // NPCs & Quest State Machine
    npcManager.update(dt, playerPos, {
      onStoryNpcArrived: (t) => story.onStoryNpcArrived(t),
      onSabotageStart: () => story.onSabotageStart(),
      onSabotageScattered: () => story.onSabotageScattered(),
      onSofraTaunt: () => story.onSofraTaunt(),
      onChaseEscapedExit: () => story.onChaseEscapedExit()
    });

    engine.getCameraForward(_lookForward);
    const target = interactables.findNearest(playerPos, _lookForward, npcManager, qsm);
    const isChase =
      qsm.state === QuestState.EVENT_ICECREAM_CHASE ||
      qsm.state === QuestState.EVENT_SOFRABEZI_CHASE;
    const inHitRange = isChase && npcManager.isStoryNpcInHitRange(playerPos, _lookForward, 2.65);
    ui.setCrosshairHot(inHitRange);

    if (input.dialogueOpen) {
      ui.setInteractPrompt(false);
    } else if (isChase) {
      if (inHitRange) {
        ui.setInteractPrompt(true, 'SOPAYLA VUR!', input.effectiveMobile(), 'Tık/E');
      } else if (qsm.state === QuestState.EVENT_SOFRABEZI_CHASE) {
        ui.setInteractPrompt(
          true,
          input.sprint ? 'Yaklaş & Vur!' : 'Koş & Yakala!',
          input.effectiveMobile(),
          input.sprint ? 'Tık/E' : 'Shift+Tık'
        );
      } else {
        ui.setInteractPrompt(true, 'Sopa Salla!', input.effectiveMobile(), 'Tık/E');
      }
    } else if (target.type !== 'none') {
      ui.setInteractPrompt(true, target.label, input.effectiveMobile(), target.keyLabel);
    } else {
      ui.setInteractPrompt(false);
    }

    if (input.consumeInteractPress() && !input.dialogueOpen) {
      if (isChase) {
        story.onStickSwing(playerPos, _lookForward);
      } else {
        story.handleInteraction(target);
      }
    }

    story.update(dt, target, input.interactHeld);
    engine.render();
  }

  requestAnimationFrame(animate);
}

bootstrap();
