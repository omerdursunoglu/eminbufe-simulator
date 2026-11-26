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

const THIEF_ROUTES = [
  {
    name: 'kasa',
    spawn: { x: 8.8, z: 6.2 },
    sneak: [
      { x: 5.2, z: 3.5 },
      { x: 2.75, z: 1.5 },
      { x: 2.15, z: -0.6 },
      { x: 2.02, z: -2.2 }
    ],
    stealFace: -Math.PI * 0.5
  },
  {
    name: 'fridge',
    spawn: { x: -5.8, z: 9.6 },
    sneak: [
      { x: -1.4, z: 5.5 },
      { x: 3.0, z: 2.0 },
      { x: 3.45, z: -1.65 }
    ],
    stealFace: Math.PI * 0.5
  },
  {
    name: 'left_bay',
    spawn: { x: -11.4, z: 5.4 },
    sneak: [
      { x: -5.6, z: 3.2 },
      { x: -2.05, z: 1.5 },
      { x: -2.2, z: -2.35 }
    ],
    stealFace: -Math.PI * 0.5
  }
];

export class NpcManager {
  constructor(factory, bufe, sound, colliders = null) {
    this.factory = factory;
    this.bufe = bufe;
    this.sound = sound;
    this.colliders = colliders;

    this.npcs = [];
    this.storyNpc = null;
    this.thiefNpc = null;
    this._ringPulse = 0;
    this._hitRes = { hit: false, type: null, knockedOut: false, hp: 0, maxHp: 0, hitCount: 0 };
    this._thiefHitRes = {
      hit: false,
      knockedOut: false,
      hp: 0,
      maxHp: 0,
      hitCount: 0,
      stolenRecovered: 0,
      x: 0,
      y: 1.4,
      z: 0
    };
    this._thiefEscapeWps = [
      { x: 0, z: 0 },
      { x: 0, z: 0 },
      { x: 0, z: 0 }
    ];

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
      fallProgress: 0,
      fleeBurstTimer: 0,
      sofraPhase: 'exit',
      tauntTimer: 0,
      taunted: false
    };
    this.npcs.push(this.storyNpc);

    // Slot 5: Sneaky Thief NPC (creeps silently into shop, beaten down ÇAT ÇUT to KO!)
    this.thiefNpc = {
      slot: 5,
      kind: 'thief',
      x: 9.0,
      z: 6.0,
      ry: 0,
      speed: 0.88,
      walkCycle: 0,
      waypoints: [],
      wpIndex: 0,
      wpCount: 0,
      state: 'inactive', // 'inactive' | 'sneaking_in' | 'peeking' | 'stealing' | 'hit_stun' | 'escaping' | 'knocked_out' | 'limping_away'
      spawnTimer: 4.2,
      routeIndex: 0,
      stealFace: 0,
      waitTimer: 0,
      peekDone: false,
      sneakLookPhase: 0,
      sneakLook: 0,
      spotted: false,
      stolenAmount: 0,
      panic: false,
      gestureArm: 0,
      active: false,
      colors: { skin: 0xdfb38c, jacket: 0x18181b, pants: 0x09090b, hair: 0x111827 },
      hp: 4,
      maxHp: 4,
      hitCount: 0,
      hitFlashTimer: 0,
      flashing: false,
      staggerTimer: 0,
      kbVx: 0,
      kbVz: 0,
      kbTimer: 0,
      knockdownTimer: 0,
      fallProgress: 0,
      dizzyTime: 0
    };
    this.factory.setNpcColors(
      5,
      this.thiefNpc.colors.skin,
      this.thiefNpc.colors.jacket,
      this.thiefNpc.colors.pants,
      this.thiefNpc.colors.hair
    );
    this.npcs.push(this.thiefNpc);
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

  _isNpcInHitRange(npc, playerPos, lookForward, maxRange = 2.65, minDot = 0.24) {
    if (!npc || !npc.active) return false;
    // Prevent hitting through the solid center shop divider wall
    if (playerPos.z < -0.2 && npc.z < -0.2 && playerPos.x * npc.x < -0.04) return false;

    const dx = npc.x - playerPos.x;
    const dz = npc.z - playerPos.z;
    const distSq = dx * dx + dz * dz;
    if (distSq > maxRange * maxRange) return false;

    const dist = Math.sqrt(distSq);
    if (dist <= 1.35) return true;

    const fLen = Math.hypot(lookForward.x, lookForward.z);
    if (fLen < 0.001) return true;
    const dot = ((dx / dist) * lookForward.x + (dz / dist) * lookForward.z) / fLen;
    return dot >= minDot;
  }

  isStoryNpcInHitRange(playerPos, lookForward, maxRange = 2.65) {
    const s = this.storyNpc;
    if (!s.active || (s.state !== 'sofra_flee' && s.state !== 'chased')) return false;
    return this._isNpcInHitRange(s, playerPos, lookForward, maxRange, 0.24);
  }

  isThiefBeatable() {
    const t = this.thiefNpc;
    return (
      t.active &&
      (t.state === 'sneaking_in' ||
        t.state === 'peeking' ||
        t.state === 'stealing' ||
        t.state === 'hit_stun' ||
        t.state === 'escaping')
    );
  }

  isThiefInHitRange(playerPos, lookForward, maxRange = 3.05) {
    if (!this.isThiefBeatable()) return false;
    return this._isNpcInHitRange(this.thiefNpc, playerPos, lookForward, maxRange, 0.16);
  }

  isThiefSpottedAlert() {
    const t = this.thiefNpc;
    return this.isThiefBeatable() && t.spotted;
  }

  isThiefEngaged() {
    const t = this.thiefNpc;
    if (!t.active) return false;
    return (
      t.state === 'stealing' ||
      t.state === 'hit_stun' ||
      t.state === 'knocked_out' ||
      (t.state === 'sneaking_in' && t.z < 2.6)
    );
  }

  applyPlayerThiefSeparation(playerPos) {
    const t = this.thiefNpc;
    if (!t.active || t.state === 'inactive' || t.state === 'knocked_out') return;
    const dx = playerPos.x - t.x;
    const dz = playerPos.z - t.z;
    const distSq = dx * dx + dz * dz;
    const minDist = 0.72;
    if (distSq < minDist * minDist && distSq > 1e-6) {
      const dist = Math.sqrt(distSq);
      const push = minDist - dist;
      playerPos.x += (dx / dist) * push;
      playerPos.z += (dz / dist) * push;
      this.colliders?.resolve(playerPos, 0.3);
    }
  }

  spawnThief() {
    const t = this.thiefNpc;
    const route = THIEF_ROUTES[t.routeIndex % THIEF_ROUTES.length];
    t.routeIndex = (t.routeIndex + 1) % THIEF_ROUTES.length;

    t.active = true;
    t.x = route.spawn.x;
    t.z = route.spawn.z;
    t.ry = Math.PI;
    t.speed = 0.88;
    t.walkCycle = 0;
    t.waypoints = route.sneak;
    t.wpIndex = 0;
    t.wpCount = route.sneak.length;
    t.stealFace = route.stealFace;
    t.state = 'sneaking_in';
    t.waitTimer = 0;
    t.peekDone = false;
    t.sneakLookPhase = 0;
    t.sneakLook = 0;
    t.spotted = false;
    t.stolenAmount = 0;
    t.panic = false;
    t.gestureArm = 0;
    t.hp = t.maxHp;
    t.hitCount = 0;
    t.hitFlashTimer = 0;
    t.flashing = false;
    t.staggerTimer = 0;
    t.kbVx = 0;
    t.kbVz = 0;
    t.kbTimer = 0;
    t.knockdownTimer = 0;
    t.fallProgress = 0;
    t.dizzyTime = 0;
    this.factory.setNpcColors(t.slot, t.colors.skin, t.colors.jacket, t.colors.pants, t.colors.hair);
  }

  _assignThiefEscapePath(t) {
    if (t.z < 1.2) {
      t._escapeMode = true;
      this._thiefEscapeWps[0].x = t.x >= 0 ? 2.75 : -2.05;
      this._thiefEscapeWps[0].z = 1.6;
      this._thiefEscapeWps[1].x = t.x >= 0 ? 4.2 : -4.2;
      this._thiefEscapeWps[1].z = 9.5;
      this._thiefEscapeWps[2].x = 0.0;
      this._thiefEscapeWps[2].z = 22.0;
      t.wpCount = 3;
    } else {
      t._escapeMode = true;
      this._thiefEscapeWps[0].x = 0.0;
      this._thiefEscapeWps[0].z = Math.max(t.z + 3.0, 11.0);
      this._thiefEscapeWps[1].x = 0.0;
      this._thiefEscapeWps[1].z = 22.0;
      t.wpCount = 2;
    }
    t.waypoints = this._thiefEscapeWps;
    t.wpIndex = 0;
  }

  tryHitThief(playerPos, lookForward, damage = 1, maxRange = 3.05) {
    const res = this._thiefHitRes;
    res.hit = false;
    res.knockedOut = false;

    if (!this.isThiefInHitRange(playerPos, lookForward, maxRange)) {
      return res;
    }

    const t = this.thiefNpc;
    t.spotted = true;
    t.hitCount++;
    t.hp = Math.max(0, t.hp - damage);

    // Compute away vector & turn thief toward player
    let dx = t.x - playerPos.x;
    let dz = t.z - playerPos.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    t.ry = Math.atan2(-dx, -dz);

    const isKo = t.hp <= 0;
    const kbSpeed = isKo ? 5.2 : 3.2;
    t.kbVx = dx * kbSpeed;
    t.kbVz = dz * kbSpeed;
    t.kbTimer = isKo ? 0.24 : 0.2;

    t.hitFlashTimer = 0.24;
    t.gestureArm = 0;
    this.factory.spawnImpactBurst(t.x, 1.32, t.z);

    res.hit = true;
    res.knockedOut = isKo;
    res.hp = t.hp;
    res.maxHp = t.maxHp;
    res.hitCount = t.hitCount;
    res.x = t.x;
    res.y = 1.45;
    res.z = t.z;

    if (isKo) {
      t.state = 'knocked_out';
      t.knockdownTimer = 5.5;
      t.fallProgress = 0;
      t.dizzyTime = 0;
      t.panic = false;
      t.speed = 0;
      res.stolenRecovered = t.stolenAmount;
      t.stolenAmount = 0;
    } else {
      t.state = 'hit_stun';
      t.staggerTimer = 0.56;
      t.panic = false;
      t.speed = 0;
      res.stolenRecovered = 0;
    }
    return res;
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
        s.fallProgress = 0;
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

  update(dt, playerPos, storyCallbacks, lookForward = null, dialogueOpen = false) {
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
        s.fallProgress = Math.min(1, s.fallProgress + dt / 0.22);
        s.walkCycle += dt * 4.0;
        if (s.knockdownTimer <= 0) {
          s.fallProgress = 0;
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

    // 3B. Sneaky Thief NPC (paused smoothly if dialogue overlay is open)
    const t = this.thiefNpc;
    let ringTargetX = s.x;
    let ringTargetZ = s.z;
    if (!dialogueOpen) {
      if (!t.active) {
        t.spawnTimer -= dt;
        if (t.spawnTimer <= 0) {
          this.spawnThief();
        }
      } else {
        // Hit flash & knockback damping
        if (t.hitFlashTimer > 0) {
          t.hitFlashTimer = Math.max(0, t.hitFlashTimer - dt);
          if (!t.flashing) {
            this.factory.setNpcHitFlash(t.slot);
            t.flashing = true;
          }
        } else if (t.flashing) {
          this.factory.setNpcColors(t.slot, t.colors.skin, t.colors.jacket, t.colors.pants, t.colors.hair);
          t.flashing = false;
        }

        if (t.kbTimer > 0) {
          t.kbTimer = Math.max(0, t.kbTimer - dt);
          t.x += t.kbVx * dt;
          t.z += t.kbVz * dt;
          t.kbVx *= Math.max(0, 1 - dt * 8);
          t.kbVz *= Math.max(0, 1 - dt * 8);
          this.colliders?.resolve(t, 0.3);
        }

        if (t.state === 'sneaking_in') {
          t.sneakLookPhase += dt * 2.4;
          t.sneakLook = Math.sin(t.sneakLookPhase) * 0.45;
          const target = t.waypoints[t.wpIndex];
          if (this._stepTowards(t, target.x, target.z, t.speed, dt)) {
            t.wpIndex++;
            if (!t.peekDone && t.wpIndex === 1) {
              t.peekDone = true;
              t.state = 'peeking';
              t.waitTimer = 0.7;
            } else if (t.wpIndex >= t.wpCount) {
              t.state = 'stealing';
              t.waitTimer = 2.3;
              t.ry = t.stealFace;
              t.spotted = true;
              storyCallbacks.onThiefStealing?.();
            }
          }
          // Check if player spotted the sneaking thief or thief crossed shop threshold
          if (!t.spotted) {
            const dx = t.x - playerPos.x;
            const dz = t.z - playerPos.z;
            const dist = Math.hypot(dx, dz);
            let lookedAt = false;
            if (lookForward && dist < 12.5 && dist > 0.1) {
              const fLen = Math.hypot(lookForward.x, lookForward.z) || 1;
              const dot = ((dx / dist) * lookForward.x + (dz / dist) * lookForward.z) / fLen;
              lookedAt = dot > 0.72;
            }
            if (t.z <= 2.3 || (lookedAt && dist < 11.0)) {
              t.spotted = true;
              storyCallbacks.onThiefSpotted?.();
            }
          }
        } else if (t.state === 'peeking') {
          t.waitTimer -= dt;
          t.sneakLookPhase += dt * 6.5;
          t.sneakLook = Math.sin(t.sneakLookPhase) * 0.65;
          if (t.waitTimer <= 0) {
            t.state = 'sneaking_in';
          }
        } else if (t.state === 'stealing') {
          t.waitTimer -= dt;
          t.sneakLook = Math.sin(t.waitTimer * 9) * 0.42;
          t.gestureArm = 1.45 + Math.sin(t.waitTimer * 12) * 0.55;
          if (t.waitTimer <= 0) {
            t.gestureArm = 0;
            storyCallbacks.onThiefStole?.(50);
            t.state = 'escaping';
            t.speed = 1.6;
            this._assignThiefEscapePath(t);
          }
        } else if (t.state === 'hit_stun') {
          t.staggerTimer = Math.max(0, t.staggerTimer - dt);
          if (t.staggerTimer <= 0) {
            t.state = 'escaping';
            t.panic = true;
            t.speed = 3.1; // slow enough for player to run & finish beating them down!
            this._assignThiefEscapePath(t);
          }
        } else if (t.state === 'escaping') {
          if (t.spotted && !showTargetRing) {
            showTargetRing = true;
            ringTargetX = t.x;
            ringTargetZ = t.z;
            this._ringPulse += dt * 6.0;
          }
          const target = t.waypoints[t.wpIndex];
          if (this._stepTowards(t, target.x, target.z, t.speed, dt)) {
            t.wpIndex++;
            if (t.wpIndex >= t.wpCount) {
              const stolen = t.stolenAmount;
              t.active = false;
              t.state = 'inactive';
              t.spawnTimer = 22 + Math.random() * 10;
              storyCallbacks.onThiefEscaped?.(stolen);
            }
          }
          this.colliders?.resolve(t, 0.3);
        } else if (t.state === 'knocked_out') {
          t.knockdownTimer -= dt;
          t.dizzyTime += dt;
          t.fallProgress = Math.min(1, t.fallProgress + dt / 0.24);
          t.walkCycle += dt * 3.5;
          if (t.knockdownTimer <= 0) {
            t.state = 'limping_away';
            t.speed = 2.45;
            this._assignThiefEscapePath(t);
          }
        } else if (t.state === 'limping_away') {
          if (t.fallProgress > 0) {
            t.fallProgress = Math.max(0, t.fallProgress - dt / 0.35);
          } else {
            const target = t.waypoints[t.wpIndex];
            if (this._stepTowards(t, target.x, target.z, t.speed, dt)) {
              t.wpIndex++;
              if (t.wpIndex >= t.wpCount) {
                t.active = false;
                t.state = 'inactive';
                t.spawnTimer = 24 + Math.random() * 10;
              }
            }
            this.colliders?.resolve(t, 0.3);
          }
        }
      }
    }

    this.factory.setTargetRing(showTargetRing, ringTargetX, ringTargetZ, this._ringPulse);

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
        n.state === 'sofra_flee' ||
        n.state === 'sneaking_in' ||
        n.state === 'escaping' ||
        (n.state === 'limping_away' && n.fallProgress <= 0.05);
      const staggerAmt = n.staggerTimer ? Math.min(1, n.staggerTimer / (n.kind === 'thief' ? 0.56 : 0.34)) : 0;
      const knockdownAmt =
        n.state === 'knocked_down' || n.state === 'knocked_out' || n.state === 'limping_away'
          ? n.fallProgress ?? 1
          : 0;
      let sneakAmt = 0;
      if (n.kind === 'thief') {
        if (n.state === 'sneaking_in') sneakAmt = 1.0;
        else if (n.state === 'peeking') sneakAmt = 0.85;
        else if (n.state === 'stealing') sneakAmt = 0.72;
        else if (n.state === 'escaping' && n.hitCount === 0) sneakAmt = 0.6;
        else if (n.state === 'limping_away' && n.fallProgress <= 0.05) sneakAmt = 0.65;
      }
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
        knockdownAmt,
        sneakAmt,
        n.sneakLook || 0
      );
    }
    this.factory.updateEffects(dt);
    this.factory.flush();
  }
}
