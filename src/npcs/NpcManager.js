// Waypoint navigation & behavior controller for terminal travelers, fridge customers, and 3 story NPCs

const SOFRA_EXIT_PATH = [
  { x: 2.35, z: -1.5 },
  { x: 2.75, z: 1.8 },
  { x: 1.8, z: 4.4 }
];

const SOFRA_PANIC_LOOP = [
  { x: 0.0, z: 10.8 },
  { x: 13.0, z: 10.8 },
  { x: 13.0, z: 18.2 },
  { x: 0.0, z: 19.5 },
  { x: -13.0, z: 18.2 },
  { x: -13.0, z: 10.8 },
  { x: -2.2, z: 10.8 },
  { x: -2.2, z: 4.4 },
  { x: 2.0, z: 4.4 }
];

export class NpcManager {
  constructor(factory, bufe, sound, colliders = null) {
    this.factory = factory;
    this.bufe = bufe;
    this.sound = sound;
    this.colliders = colliders;

    this.npcs = [];
    this.storyNpc = null;
    this._ringPulse = 0;
    this._hitRes = { hit: false, type: null, knockedOut: false, hp: 0, maxHp: 0, hitCount: 0 };

    // Key waypoints across Tokat Terminal & Emin Bufe (conflict-free paths)
    this.points = {
      westHall: { x: -15.0, z: 11.5 },
      eastHall: { x: 15.0, z: 11.5 },
      centerHall: { x: 0.0, z: 11.0 },
      exitDoor: { x: 0.0, z: 22.0 },
      shopApproach: { x: 2.75, z: 2.5 },
      counterWait: { x: 1.4, z: 0.35 },
      fridgeSpot: { x: 3.35, z: -1.7 },
      sofraSabotageApproach: { x: 3.0, z: 0.6 },
      sofraStandSpot: { x: 2.4, z: -4.2 }
    };

    this._spawnAmbientTravelers();
  }

  _spawnAmbientTravelers() {
    const presets = [
      {
        slot: 0,
        path: [
          { x: -16, z: 10 },
          { x: -4, z: 10 },
          { x: 4, z: 17 },
          { x: 16, z: 16 },
          { x: 15, z: 4 }
        ],
        skin: 0xf1c27d,
        jacket: 0x3b82f6,
        pants: 0x1e293b,
        hair: 0x271c19,
        speed: 1.55
      },
      {
        slot: 1,
        path: [
          { x: 17, z: 18 },
          { x: 4, z: 18 },
          { x: -2, z: 5 },
          { x: -14, z: 5 },
          { x: -15, z: 18 }
        ],
        skin: 0xe0ac69,
        jacket: 0x10b981,
        pants: 0x334155,
        hair: 0x4a3525,
        speed: 1.4
      },
      {
        slot: 2,
        path: [
          { x: -12, z: 4 },
          { x: 0, z: 4.5 },
          { x: 12, z: 4 },
          { x: 11, z: 19 },
          { x: -11, z: 19 }
        ],
        skin: 0xffdbac,
        jacket: 0x8b5cf6,
        pants: 0x0f172a,
        hair: 0x111827,
        speed: 1.65
      }
    ];

    for (let i = 0; i < presets.length; i++) {
      const p = presets[i];
      this.factory.setNpcColors(p.slot, p.skin, p.jacket, p.pants, p.hair);
      this.npcs.push({
        slot: p.slot,
        kind: 'ambient',
        x: p.path[0].x,
        z: p.path[0].z,
        ry: 0,
        speed: p.speed,
        walkCycle: i * 1.4,
        waypoints: p.path,
        wpIndex: 1,
        loop: true,
        state: 'walk',
        waitTimer: 0,
        panic: false,
        gestureArm: 0,
        active: true
      });
    }

    // Slot 3: Regular Drink Buyer Customer (buys drinks periodically to deplete fridge stock!)
    this.factory.setNpcColors(3, 0xe8b88a, 0xd97706, 0x1e293b, 0x1f1916);
    this.regularCustomer = {
      slot: 3,
      kind: 'regular',
      x: -14,
      z: 3,
      ry: 0,
      speed: 2.1,
      walkCycle: 0,
      waypoints: [],
      wpIndex: 0,
      loop: false,
      state: 'idle_off',
      waitTimer: 4.0,
      panic: false,
      gestureArm: 0,
      active: false,
      onBuyDrink: null
    };
    this.npcs.push(this.regularCustomer);

    // Slot 4: Scripted Story Event NPC (reused cleanly by State Machine so zero overlap!)
    this.storyNpc = {
      slot: 4,
      kind: 'story',
      eventType: null, // 'icecream' | 'wifi' | 'sofra'
      x: 15,
      z: 5,
      ry: 0,
      speed: 2.35,
      walkCycle: 0,
      waypoints: [],
      wpIndex: 0,
      loop: false,
      state: 'inactive', // 'walking_in' | 'waiting_talk' | 'chased' | 'sabotage_throw' | 'sofra_flee' | 'knocked_down' | 'leaving' | 'inactive'
      waitTimer: 0,
      panic: false,
      gestureArm: 0,
      active: false,
      onReachGoal: null,
      colors: { skin: 0xe0ac69, jacket: 0xbe123c, pants: 0x111827, hair: 0x09090b },
      hp: 5,
      maxHp: 5,
      hitCount: 0,
      hitFlashTimer: 0,
      flashing: false,
      staggerTimer: 0,
      knockdownTimer: 0,
      fleeBurstTimer: 0,
      sofraPhase: 'exit',
      tauntTimer: 0,
      taunted: false
    };
    this.npcs.push(this.storyNpc);
  }

  startRegularBuyerCycle(onBuyDrink) {
    this.regularCustomer.onBuyDrink = onBuyDrink;
    this.regularCustomer.waitTimer = 3.5;
  }

  spawnRegularBuyer() {
    const rc = this.regularCustomer;
    if (rc.active) return;
    rc.active = true;
    rc.x = Math.random() > 0.5 ? -13 : 13;
    rc.z = 3.2;
    rc.state = 'going_fridge';
    rc.waypoints = [
      { x: 2.9, z: 1.6 },
      { x: 3.35, z: -1.7 }
    ];
    rc.wpIndex = 0;
  }

  spawnStoryNpc(eventType) {
    const s = this.storyNpc;
    s.eventType = eventType;
    s.active = true;
    s.panic = false;
    s.gestureArm = 0;
    s.hitCount = 0;
    s.hitFlashTimer = 0;
    s.flashing = false;
    s.staggerTimer = 0;
    s.knockdownTimer = 0;
    s.fleeBurstTimer = 0;
    s.taunted = false;

    if (eventType === 'icecream') {
      s.colors = { skin: 0xf1c27d, jacket: 0xef4444, pants: 0x1e293b, hair: 0x292524 };
      this.factory.setNpcColors(s.slot, s.colors.skin, s.colors.jacket, s.colors.pants, s.colors.hair);
      s.x = -11.0;
      s.z = 5.5;
      s.speed = 2.5;
      s.hp = 3;
      s.maxHp = 3;
      s.state = 'walking_in';
      s.waypoints = [
        { x: 2.55, z: 2.2 },
        { x: 2.55, z: -0.35 }
      ];
      s.wpIndex = 0;
    } else if (eventType === 'wifi') {
      s.colors = { skin: 0xffdbac, jacket: 0x0ea5e9, pants: 0x334155, hair: 0x451a03 };
      this.factory.setNpcColors(s.slot, s.colors.skin, s.colors.jacket, s.colors.pants, s.colors.hair);
      s.x = 12.0;
      s.z = 6.0;
      s.speed = 2.4;
      s.hp = 1;
      s.maxHp = 1;
      s.state = 'walking_in';
      s.waypoints = [
        { x: 2.75, z: 2.2 },
        { x: 2.55, z: -0.35 }
      ];
      s.wpIndex = 0;
    } else if (eventType === 'sofra') {
      s.colors = { skin: 0xe0ac69, jacket: 0xbe123c, pants: 0x111827, hair: 0x09090b };
      this.factory.setNpcColors(s.slot, s.colors.skin, s.colors.jacket, s.colors.pants, s.colors.hair);
      s.x = 10.5;
      s.z = 4.2;
      s.speed = 2.85;
      s.hp = 5;
      s.maxHp = 5;
      s.state = 'walking_in';
      s.waypoints = [
        { x: 2.6, z: 1.6 },
        { x: 2.35, z: -1.6 },
        { x: 2.25, z: -3.6 }
      ];
      s.wpIndex = 0;
    }
  }

  startIcecreamChase() {
    const s = this.storyNpc;
    s.state = 'chased';
    s.panic = true;
    s.speed = 5.9;
    s.waypoints = [
      { x: 1.6, z: 3.5 },
      { x: 0.4, z: 11.0 },
      { x: 0.0, z: 22.0 }
    ];
    s.wpIndex = 0;
  }

  startSofraChase() {
    const s = this.storyNpc;
    s.state = 'sofra_flee';
    s.panic = true;
    s.gestureArm = 0;
    s.speed = 5.8;
    s.hp = s.maxHp;
    s.hitCount = 0;
    s.fleeBurstTimer = 0.8;
    s.tauntTimer = 6.5;
    s.taunted = false;
    s.sofraPhase = 'exit';
    s.waypoints = SOFRA_EXIT_PATH;
    s.wpIndex = 0;
  }

  isStoryNpcInHitRange(playerPos, lookForward, maxRange = 2.65) {
    const s = this.storyNpc;
    if (!s.active || (s.state !== 'sofra_flee' && s.state !== 'chased')) return false;
    // Prevent hitting through the solid center shop divider wall
    if (playerPos.z < -0.2 && s.z < -0.2 && playerPos.x * s.x < -0.04) return false;

    const dx = s.x - playerPos.x;
    const dz = s.z - playerPos.z;
    const distSq = dx * dx + dz * dz;
    if (distSq > maxRange * maxRange) return false;

    const dist = Math.sqrt(distSq);
    if (dist <= 1.2) return true;

    const fLen = Math.hypot(lookForward.x, lookForward.z);
    if (fLen < 0.001) return true;
    const dot = ((dx / dist) * lookForward.x + (dz / dist) * lookForward.z) / fLen;
    return dot >= 0.24;
  }

  tryHitStoryNpc(playerPos, lookForward, maxRange = 2.65) {
    const res = this._hitRes;
    res.hit = false;
    res.type = null;
    res.knockedOut = false;

    if (!this.isStoryNpcInHitRange(playerPos, lookForward, maxRange)) {
      return res;
    }

    const s = this.storyNpc;
    res.hit = true;
    res.type = s.eventType;
    s.hitCount++;

    // Knockback away from player (with +Z bias if still inside shop so NPC gets knocked toward terminal hall)
    let dx = s.x - playerPos.x;
    let dz = s.z - playerPos.z;
    if (s.z < 0.25) dz += 0.65;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;

    const knockDist = s.state === 'sofra_flee' ? 1.05 : 1.15;
    s.x += dx * knockDist;
    s.z += dz * knockDist;
    this.colliders?.resolve(s, 0.3);

    s.hitFlashTimer = 0.22;
    s.staggerTimer = 0.34;
    s.fleeBurstTimer = 1.25;
    this.factory.spawnImpactBurst(s.x, 1.32, s.z);

    if (s.state === 'sofra_flee') {
      s.hp = Math.max(0, s.hp - 1);
      res.hp = s.hp;
      res.maxHp = s.maxHp;
      res.hitCount = s.hitCount;

      if (s.hp <= 0) {
        s.state = 'knocked_down';
        s.knockdownTimer = 3.2;
        s.panic = false;
        s.gestureArm = 0;
        s.speed = 0;
        res.knockedOut = true;
      }
    } else {
      res.hp = s.hp;
      res.maxHp = s.maxHp;
      res.hitCount = s.hitCount;
    }
    return res;
  }

  dismissStoryNpc() {
    const s = this.storyNpc;
    s.panic = false;
    s.gestureArm = 0;
    s.state = 'leaving';
    s.speed = 2.5;
    s.waypoints = [
      { x: 2.8, z: 2.2 },
      { x: s.x > 0 ? 15.0 : -15.0, z: 8.5 }
    ];
    s.wpIndex = 0;
  }

  getWaitingStoryNpc() {
    const s = this.storyNpc;
    if (s.active && s.state === 'waiting_talk') return s;
    return null;
  }

  _stepTowards(npc, tx, tz, speed, dt) {
    const dx = tx - npc.x;
    const dz = tz - npc.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.22) return true;
    const step = Math.min(dist, speed * dt);
    npc.x += (dx / dist) * step;
    npc.z += (dz / dist) * step;
    npc.ry = Math.atan2(dx, dz);
    npc.walkCycle += dt * speed * 3.8;
    return false;
  }

  update(dt, playerPos, storyCallbacks) {
    // 1. Regular drink-buyer cycle
    const rc = this.regularCustomer;
    if (!rc.active) {
      rc.waitTimer -= dt;
      if (rc.waitTimer <= 0) {
        this.spawnRegularBuyer();
      }
    } else if (rc.state === 'going_fridge') {
      const target = rc.waypoints[rc.wpIndex];
      if (this._stepTowards(rc, target.x, target.z, rc.speed, dt)) {
        rc.wpIndex++;
        if (rc.wpIndex >= rc.waypoints.length) {
          rc.state = 'buying';
          rc.waitTimer = 1.2;
          rc.ry = Math.PI * 0.5;
          rc.gestureArm = 1.2;
        }
      }
    } else if (rc.state === 'buying') {
      rc.waitTimer -= dt;
      if (rc.waitTimer <= 0) {
        rc.gestureArm = 0;
        rc.onBuyDrink?.();
        rc.state = 'leaving';
        rc.waypoints = [
          { x: 2.8, z: 2.0 },
          { x: 14, z: 6.5 }
        ];
        rc.wpIndex = 0;
      }
    } else if (rc.state === 'leaving') {
      const target = rc.waypoints[rc.wpIndex];
      if (this._stepTowards(rc, target.x, target.z, rc.speed, dt)) {
        rc.wpIndex++;
        if (rc.wpIndex >= rc.waypoints.length) {
          rc.active = false;
          rc.waitTimer = 5.5 + Math.random() * 4.5;
        }
      }
    }

    // 2. Ambient travelers
    for (let i = 0; i < this.npcs.length; i++) {
      const n = this.npcs[i];
      if (n.kind !== 'ambient' || !n.active) continue;
      const target = n.waypoints[n.wpIndex];
      if (this._stepTowards(n, target.x, target.z, n.speed, dt)) {
        n.wpIndex = (n.wpIndex + 1) % n.waypoints.length;
      }
    }

    // 3. Story NPC
    const s = this.storyNpc;
    let showTargetRing = false;
    if (s.active) {
      if (s.hitFlashTimer > 0) {
        s.hitFlashTimer = Math.max(0, s.hitFlashTimer - dt);
        if (!s.flashing) {
          this.factory.setNpcHitFlash(s.slot);
          s.flashing = true;
        }
      } else if (s.flashing) {
        this.factory.setNpcColors(s.slot, s.colors.skin, s.colors.jacket, s.colors.pants, s.colors.hair);
        s.flashing = false;
      }

      if (s.staggerTimer > 0) s.staggerTimer = Math.max(0, s.staggerTimer - dt);
      if (s.fleeBurstTimer > 0) s.fleeBurstTimer = Math.max(0, s.fleeBurstTimer - dt);

      if (s.state === 'walking_in') {
        const target = s.waypoints[s.wpIndex];
        if (this._stepTowards(s, target.x, target.z, s.speed, dt)) {
          s.wpIndex++;
          if (s.wpIndex >= s.waypoints.length) {
            if (s.eventType === 'sofra') {
              s.state = 'sabotage_throw';
              s.waitTimer = 1.05;
              s.ry = Math.PI * 0.5;
              s.gestureArm = 2.0;
              storyCallbacks.onSabotageStart?.();
            } else {
              s.state = 'waiting_talk';
              // Face toward cashier inside shop (-Z)
              s.ry = Math.PI;
              storyCallbacks.onStoryNpcArrived?.(s.eventType);
            }
          }
        }
      } else if (s.state === 'waiting_talk') {
        // Face player gently
        const dx = playerPos.x - s.x;
        const dz = playerPos.z - s.z;
        s.ry = Math.atan2(dx, dz);
      } else if (s.state === 'chased') {
        // Adaptive speed so the chase naturally goes from Emin Bufe all the way to Terminal Exit!
        const distPlayer = Math.hypot(playerPos.x - s.x, playerPos.z - s.z);
        const isLastWp = s.wpIndex === s.waypoints.length - 1;
        const target = s.waypoints[s.wpIndex];
        const distToExit = Math.hypot(target.x - s.x, target.z - s.z);

        // Wait near exit if player is still far back in the shop, so player truly chases them out
        if (isLastWp && distToExit < 2.2 && distPlayer > 8.5) {
          s.ry = Math.atan2(playerPos.x - s.x, playerPos.z - s.z);
          s.walkCycle += dt * 4.0;
        } else {
          const chaseSpeed =
            s.staggerTimer > 0.18 ? 1.5 : distPlayer < 3.2 ? 7.7 : distPlayer < 6.5 ? 6.2 : 4.2;
          if (this._stepTowards(s, target.x, target.z, chaseSpeed, dt)) {
            s.wpIndex++;
            if (s.wpIndex >= s.waypoints.length) {
              s.active = false;
              s.state = 'inactive';
              storyCallbacks.onChaseEscapedExit?.();
            }
          }
          this.colliders?.resolve(s, 0.3);
        }
      } else if (s.state === 'sabotage_throw') {
        s.waitTimer -= dt;
        s.gestureArm = 1.8 + Math.sin(s.waitTimer * 18) * 0.8;
        if (s.waitTimer <= 0) {
          s.gestureArm = 0;
          storyCallbacks.onSabotageScattered?.();
        }
      } else if (s.state === 'sofra_flee') {
        showTargetRing = true;
        this._ringPulse += dt * 6.0;
        const distPlayer = Math.hypot(playerPos.x - s.x, playerPos.z - s.z);

        // Prompt hint if player hasn't caught up yet
        if (!s.taunted && s.hitCount === 0) {
          s.tauntTimer -= dt;
          if (s.tauntTimer <= 0 && distPlayer > 4.5) {
            s.taunted = true;
            storyCallbacks.onSofraTaunt?.();
          }
        }

        // If out in the terminal hall and player blocks the current waypoint, skip ahead to evade!
        if (s.sofraPhase === 'loop' && distPlayer < 3.6) {
          const curTarget = s.waypoints[s.wpIndex];
          const tx = curTarget.x - s.x;
          const tz = curTarget.z - s.z;
          const px = playerPos.x - s.x;
          const pz = playerPos.z - s.z;
          const tLen = Math.hypot(tx, tz) || 1;
          const pLen = Math.hypot(px, pz) || 1;
          if ((tx * px + tz * pz) / (tLen * pLen) > 0.35) {
            s.wpIndex = (s.wpIndex + 3) % s.waypoints.length;
          }
        }

        const target = s.waypoints[s.wpIndex];
        let fleeSpeed;
        if (s.staggerTimer > 0.18) {
          fleeSpeed = 1.4; // brief hitstun when struck
        } else if (s.sofraPhase === 'exit') {
          fleeSpeed = 6.0;
        } else if (s.fleeBurstTimer > 0) {
          fleeSpeed = 6.3; // panicked burst right after hit (sprint speed 8.3 still overtakes!)
        } else if (distPlayer > 11.5) {
          fleeSpeed = 3.6; // catch breath when far ahead so player can close distance
        } else {
          fleeSpeed = 5.35; // faster than walk (4.5), easily caught with Hızlı Koş (8.3)
        }
        s.speed = fleeSpeed;

        if (this._stepTowards(s, target.x, target.z, fleeSpeed, dt)) {
          s.wpIndex++;
          if (s.sofraPhase === 'exit') {
            if (s.wpIndex >= s.waypoints.length) {
              s.sofraPhase = 'loop';
              s.waypoints = SOFRA_PANIC_LOOP;
              s.wpIndex = 0;
            }
          } else {
            s.wpIndex %= s.waypoints.length;
          }
        }
        this.colliders?.resolve(s, 0.3);
      } else if (s.state === 'knocked_down') {
        s.knockdownTimer -= dt;
        s.walkCycle += dt * 4.0;
        if (s.knockdownTimer <= 0) {
          s.state = 'leaving';
          s.speed = 1.65;
          s.panic = false;
          s.gestureArm = 0;
          s.waypoints = [
            { x: s.x >= 0 ? 15.0 : -15.0, z: Math.max(4.5, s.z) },
            { x: s.x >= 0 ? 18.0 : -18.0, z: 12.0 }
          ];
          s.wpIndex = 0;
        }
      } else if (s.state === 'leaving') {
        const target = s.waypoints[s.wpIndex];
        if (this._stepTowards(s, target.x, target.z, s.speed, dt)) {
          s.wpIndex++;
          if (s.wpIndex >= s.waypoints.length) {
            s.active = false;
            s.state = 'inactive';
          }
        }
      }
    }

    this.factory.setTargetRing(showTargetRing, s.x, s.z, this._ringPulse);

    // 4. Sync ALL NPCs into the 5 InstancedMeshes
    for (let i = 0; i < this.npcs.length; i++) {
      const n = this.npcs[i];
      if (!n.active) {
        this.factory.hideNpc(n.slot);
        continue;
      }
      const moving =
        n.state === 'walk' ||
        n.state === 'going_fridge' ||
        n.state === 'leaving' ||
        n.state === 'walking_in' ||
        n.state === 'chased' ||
        n.state === 'sofra_flee';
      const staggerAmt = n.staggerTimer ? Math.min(1, n.staggerTimer / 0.34) : 0;
      const knockdownAmt = n.state === 'knocked_down' ? 1 : 0;
      this.factory.updateNpcPose(
        n.slot,
        n.x,
        n.z,
        n.ry,
        n.walkCycle,
        moving ? n.speed : 0,
        n.panic,
        n.gestureArm,
        staggerAmt,
        knockdownAmt
      );
    }
    this.factory.updateEffects(dt);
    this.factory.flush();
  }
}
