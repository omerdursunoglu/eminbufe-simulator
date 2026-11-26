// Waypoint navigation & behavior controller for terminal travelers, fridge customers, and 3 story NPCs

export class NpcManager {
  constructor(factory, bufe, sound) {
    this.factory = factory;
    this.bufe = bufe;
    this.sound = sound;

    this.npcs = [];
    this.storyNpc = null;

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
      state: 'inactive', // 'walking_in' | 'waiting_talk' | 'chased' | 'sabotage_throw' | 'leaving' | 'inactive'
      waitTimer: 0,
      panic: false,
      gestureArm: 0,
      active: false,
      onReachGoal: null
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

    if (eventType === 'icecream') {
      this.factory.setNpcColors(s.slot, 0xf1c27d, 0xef4444, 0x1e293b, 0x292524);
      s.x = -11.0;
      s.z = 5.5;
      s.speed = 2.5;
      s.state = 'walking_in';
      s.waypoints = [
        { x: 2.55, z: 2.2 },
        { x: 2.55, z: -0.35 }
      ];
      s.wpIndex = 0;
    } else if (eventType === 'wifi') {
      this.factory.setNpcColors(s.slot, 0xffdbac, 0x0ea5e9, 0x334155, 0x451a03);
      s.x = 12.0;
      s.z = 6.0;
      s.speed = 2.4;
      s.state = 'walking_in';
      s.waypoints = [
        { x: 2.75, z: 2.2 },
        { x: 2.55, z: -0.35 }
      ];
      s.wpIndex = 0;
    } else if (eventType === 'sofra') {
      this.factory.setNpcColors(s.slot, 0xe0ac69, 0xbe123c, 0x111827, 0x09090b);
      s.x = 10.5;
      s.z = 4.2;
      s.speed = 2.85;
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
    if (s.active) {
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
          const chaseSpeed = distPlayer < 3.2 ? 7.7 : distPlayer < 6.5 ? 6.2 : 4.2;
          if (this._stepTowards(s, target.x, target.z, chaseSpeed, dt)) {
            s.wpIndex++;
            if (s.wpIndex >= s.waypoints.length) {
              s.active = false;
              s.state = 'inactive';
              storyCallbacks.onChaseEscapedExit?.();
            }
          }
        }
      } else if (s.state === 'sabotage_throw') {
        s.waitTimer -= dt;
        s.gestureArm = 1.8 + Math.sin(s.waitTimer * 18) * 0.8;
        if (s.waitTimer <= 0) {
          s.gestureArm = 0;
          storyCallbacks.onSabotageScattered?.();
          s.state = 'leaving';
          s.speed = 3.2;
          s.waypoints = [
            { x: 2.9, z: 1.5 },
            { x: -14.5, z: 6.5 }
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
        n.state === 'chased';
      this.factory.updateNpcPose(
        n.slot,
        n.x,
        n.z,
        n.ry,
        n.walkCycle,
        moving ? n.speed : 0,
        n.panic,
        n.gestureArm
      );
    }
    this.factory.flush();
  }
}
