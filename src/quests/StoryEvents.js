import { QuestState } from './QuestStateMachine.js';

/**
 * Orchestrates continuous fridge stock loop + the 3 scripted comedy events:
 * 1. Dondurma Vakası (Dialog + Sopa Viewmodel + Terminal Chase)
 * 2. Efsane Wi-Fi Şifresi (Dialog + Diegetic Kasa Note Joke)
 * 3. Sofra Bezi Sabotajı (Rage Vignette + 8 Interactive Cloth Pickup)
 */
export class StoryEvents {
  constructor(qsm, bufe, npcManager, viewmodel, engine, ui, input, sound) {
    this.qsm = qsm;
    this.bufe = bufe;
    this.npcs = npcManager;
    this.viewmodel = viewmodel;
    this.engine = engine;
    this.ui = ui;
    this.input = input;
    this.sound = sound;

    this.eventQueue = ['icecream', 'wifi', 'sofra'];
    this.nextEventTimer = 7.5;
    this.shiftCompleteShown = false;
    this.stickHideTimer = 0;
    this.hitToasts = [
      'PAT! — Sabotajcı: "AH! Dur usta elim kaydı!"',
      'KÜT! — Sabotajcı: "OF! Vallahi bir daha dağıtmam!"',
      'BAM! — Sabotajcı: "ABİ YETER BELİM KIRILDI!"',
      'GÜM! — Sabotajcı: "TAMAM TESLİM OLUYORUM VURMA!"'
    ];

    // Start fridges slightly used (34/48 ≈ 71%) so stock depletion engages cleanly during play
    this.bufe.consumeDrink(14);
    this._syncHudStats();
    this._syncQuestHud();
  }

  _syncHudStats() {
    this.ui.setStats(
      this.qsm.cash,
      this.bufe.getFridgeFillPercent(),
      this.qsm.eventsCompleted,
      3
    );
  }

  _syncQuestHud() {
    switch (this.qsm.state) {
      case QuestState.IDLE_NORMAL:
        if (this.npcs.isThiefSpottedAlert()) {
          const t = this.npcs.thiefNpc;
          this.ui.setQuest(
            `Sinsi Hırsız Yakalandı! (${t.hp}/${t.maxHp} Can)`,
            'Shift / KOŞ ile yetiş, Sol Tık / E / F ile ÇAT ÇUT yere yatır!',
            true
          );
        } else if (this.qsm.needsRestock) {
          this.ui.setQuest(
            'Buzdolapları Boşaldı — Stokları Doldur!',
            this.qsm.carryingCrate
              ? 'Didi veya Pepsi dolabına yaklaşıp E (veya Etkileş) tuşuna basılı tut.'
              : 'Arka depodaki mavi içecek kasasından stok al.',
            true
          );
        } else if (this.qsm.eventsCompleted >= 3) {
          this.ui.setQuest(
            'Vardiya Tamamlandı — Büfeyi İşletmeye Devam Et!',
            'Müşterilere servis yap, stokları dolu tut ve sinsi hırsızlara göz açtırma.',
            false
          );
        } else {
          this.ui.setQuest(
            'Emin Büfe Nöbeti — Müşterileri Karşıla',
            'Kasa başında veya büfe içinde gezin; gelen müşterilerle ilgilen.',
            false
          );
        }
        break;
      case QuestState.RESTOCK_FRIDGE:
        if (this.npcs.isThiefSpottedAlert()) {
          const t = this.npcs.thiefNpc;
          this.ui.setQuest(
            `Sinsi Hırsız Yakalandı! (${t.hp}/${t.maxHp} Can)`,
            'Shift / KOŞ ile yetiş, Sol Tık / E / F ile ÇAT ÇUT yere yatır!',
            true
          );
        } else {
          this.ui.setQuest(
            'Buzdolapları Boşaldı — Stokları Doldur!',
            this.qsm.carryingCrate
              ? 'Didi veya Pepsi dolabına gidip basılı tutarak rafları doldur!'
              : 'Arka köşedeki içecek kasasını al.',
            true
          );
        }
        break;
      case QuestState.EVENT_ICECREAM_APPROACH:
      case QuestState.EVENT_ICECREAM_DIALOG:
        this.ui.setQuest(
          'Özel Müşteri Geldi — Tezgâha Bak',
          'Müşteriye yaklaşıp [E] ile konuş.',
          false
        );
        break;
      case QuestState.EVENT_ICECREAM_CHASE:
        this.ui.setQuest(
          'Müşteriyi Sopayla Terminalden Kovala!',
          'Shift / KOŞ ile hızlan, müşteriyi yeşil ÇIKIŞ kapısına kadar kovala!',
          true
        );
        break;
      case QuestState.EVENT_WIFI_APPROACH:
      case QuestState.EVENT_WIFI_DIALOG:
        this.ui.setQuest(
          'Wi-Fi Soran Müşteri Bekliyor',
          'Kasa yanındaki Wi-Fi notuna göz atabilir veya [E] ile konuşabilirsin.',
          false
        );
        break;
      case QuestState.EVENT_SOFRABEZI_APPROACH:
        this.ui.setQuest(
          'Büfede Hareketlilik Var...',
          'Bir müşteri sofra bezi standına doğru gidiyor!',
          false
        );
        break;
      case QuestState.EVENT_SOFRABEZI_CHASE: {
        const s = this.npcs.storyNpc;
        this.ui.setQuest(
          `Sofra Bezini Dağıtanı Sopayla Döv! (${s.hp}/${s.maxHp} Can)`,
          'Shift / KOŞ ile hızlı koş, yaklaşıp Sol Tık / E ile sopayı indir!',
          true
        );
        break;
      }
      case QuestState.EVENT_SOFRABEZI_CLEANUP:
        this.ui.setQuest(
          `Dağılan Sofra Bezlerini Topla ve Düzenle (${this.bufe.clothsCollected}/${this.bufe.clothCount})`,
          'Yerde parlayan tüm sofra bezlerini topla!',
          true
        );
        break;
    }
  }

  onRegularDrinkSold() {
    this.qsm.cash += 45;
    this.sound.playCashRegister();
    const pct = this.bufe.consumeDrink(6);
    this.ui.showToast('Müşteri soğuk içecek aldı (+45 ₺)', 2200);

    if (pct <= 20 && !this.qsm.needsRestock) {
      this.qsm.needsRestock = true;
      if (this.qsm.canStartNewEvent()) {
        this.qsm.transition(QuestState.RESTOCK_FRIDGE);
      }
      this.ui.showToast('Buzdolapları %20 altına düştü! Arka depodan kasa alıp doldur.', 3600, true);
      this._syncQuestHud();
    }
    this._syncHudStats();
  }

  onStoryNpcArrived(eventType) {
    if (eventType === 'icecream') {
      this.qsm.transition(QuestState.EVENT_ICECREAM_DIALOG);
      this.ui.showToast('Tezgâhta müşteri sesleniyor: "Usta, dondurma var mı?"', 2800);
    } else if (eventType === 'wifi') {
      this.qsm.transition(QuestState.EVENT_WIFI_DIALOG);
      this.ui.showToast('Müşteri yaklaştı: "Kolay gelsin, büfenin Wi-Fi\'si var mı?"', 2800);
    }
    this._syncQuestHud();
  }

  onSabotageStart() {
    this.ui.showToast('Müşteri sofra bezlerini karıştırıyor...', 1400);
  }

  onSabotageScattered() {
    this.bufe.scatterSofraCloths();
    this.qsm.transition(QuestState.EVENT_SOFRABEZI_CHASE);
    this.stickHideTimer = 0;
    this.viewmodel.setActive(true);
    this.engine.setShake(0.011);
    this.sound.playRageSting();
    this.sound.startChaseMusic();
    this.npcs.startSofraChase();
    this.ui.triggerRageVignette(2400);
    this.ui.setNpcHealth(
      true,
      'SOFRABEZİ SABOTAJCISI',
      this.npcs.storyNpc.hp,
      this.npcs.storyNpc.maxHp
    );
    this.ui.showToast(
      'Yine dağıttı gitti, sabır ya! Hızlı Koş (Shift/KOŞ) ile kovala, sopayla döv!',
      4400,
      true
    );
    this._syncQuestHud();
  }

  onSofraTaunt() {
    if (this.qsm.state !== QuestState.EVENT_SOFRABEZI_CHASE) return;
    this.ui.showToast(
      'Sabotajcı: "Hızlı koşsan bile yakalayamazsın haha!" (Shift / KOŞ bas!)',
      3200,
      true
    );
  }

  onStickSwing(playerPos, lookForward) {
    if (!this.viewmodel.canSwing()) return;
    this.viewmodel.triggerSwing();
    this.sound.playStickSwing();

    const res = this.npcs.tryHitStoryNpc(playerPos, lookForward, 2.65);
    if (!res.hit) {
      if (this.npcs.isThiefInHitRange(playerPos, lookForward, 3.05)) {
        this._resolveThiefHit(playerPos, lookForward, 2);
      }
      return;
    }

    this.viewmodel.triggerHitBounce();
    this.engine.pulseHitShake(res.knockedOut ? 0.068 : 0.044);
    const sn = this.npcs.storyNpc;
    const popText = res.knockedOut ? 'NAKAVT!' : ['PAT!', 'KÜT!', 'BAM!', 'GÜM!'][(res.hitCount - 1) % 4];
    this.ui.spawnHitPopup(sn.x, 1.65, sn.z, this.engine.camera, popText, res.knockedOut);

    if (res.type === 'sofra') {
      this.ui.setNpcHealth(true, 'SOFRABEZİ SABOTAJCISI', res.hp, res.maxHp);
      if (res.knockedOut) {
        this.sound.playKnockout();
        this.sound.stopChaseMusic();
        this.engine.setShake(0);
        this.stickHideTimer = 0.42;
        this.qsm.cash += 100;
        this.sound.playCashRegister();
        this.qsm.transition(QuestState.EVENT_SOFRABEZI_CLEANUP);
        this.ui.setNpcHealth(false);
        this.ui.showToast(
          'TAM İSABET! Sabotajcıyı sopayla benzettin (+100 ₺)! Şimdi sofra bezlerini topla!',
          4600
        );
        this._syncHudStats();
        this._syncQuestHud();
      } else {
        this.sound.playStickHit(res.hitCount);
        const msg = this.hitToasts[(res.hitCount - 1) % this.hitToasts.length];
        this.ui.showToast(msg, 2400, true);
        this._syncQuestHud();
      }
    } else if (res.type === 'icecream') {
      this.sound.playStickHit(res.hitCount);
      if (res.hitCount === 1) {
        this.qsm.cash += 20;
        this._syncHudStats();
        this.ui.showToast('PAT! Müşteri: "ANAM VURMA ABİ KAÇIYORUM!" (+20 ₺)', 2400);
      } else {
        this.ui.showToast('KÜT! Müşteri: "KOŞUYORUM İŞTE ABİ!"', 1800);
      }
    }
  }

  onChaseEscapedExit() {
    this.sound.stopChaseMusic();
    this.viewmodel.setActive(false);
    this.engine.setShake(0);
    this.sound.playQuestSuccess();
    this.qsm.markEventDone('icecream');
    this.qsm.cash += 60;
    this.qsm.transition(
      this.qsm.needsRestock ? QuestState.RESTOCK_FRIDGE : QuestState.IDLE_NORMAL
    );
    this.nextEventTimer = 9.0;
    this.ui.showToast('Müşteri: "BİR DAHA DONDURMA SORARSAM!" (+60 ₺ Moral Bonusu)', 4000);
    this._syncHudStats();
    this._syncQuestHud();
    this._checkAllEventsDone();
  }

  onThiefSpotted() {
    this.sound.playThiefSpotted();
    this.ui.showToast(
      'Şşşt! Maskeli hırsız çaktırmadan süzülüyor — koşarak döv ve yere yatır!',
      3800,
      true
    );
    this._syncQuestHud();
  }

  onThiefStealing() {
    this.ui.showToast('Hırsız mallara uzanıyor! Koş yetiş, ÇAT ÇUT patakla!', 2800, true);
    this._syncQuestHud();
  }

  onThiefStole(amount) {
    const taken = Math.min(amount, this.qsm.cash);
    this.qsm.cash -= taken;
    this.npcs.thiefNpc.stolenAmount = taken;
    this.sound.playThiefStole();
    this.ui.triggerRageVignette(1800);
    this.ui.showToast(
      taken > 0
        ? `Hırsız ${taken} ₺ kaptı kaçıyor! Peşinden koş, ÇAT ÇUT yere yatır!`
        : 'Hırsız tezgâhı karıştırdı kaçıyor! Koş döv!',
      3600,
      true
    );
    this._syncHudStats();
    this._syncQuestHud();
  }

  onThiefEscaped(stolen) {
    if (this.qsm.state !== QuestState.EVENT_SOFRABEZI_CHASE) {
      this.ui.setNpcHealth(false);
    }
    this.ui.showToast(
      stolen > 0
        ? `Hırsız ${stolen} ₺ ile terminal kapısından sıvıştı!`
        : 'Hırsız yakalanmadan terminal kapısından sıvıştı!',
      3200
    );
    this._syncQuestHud();
  }

  onThiefStrike(playerPos, lookForward) {
    if (this.viewmodel.active) {
      if (!this.viewmodel.canSwing()) return false;
      this.viewmodel.triggerSwing();
    } else {
      if (!this.viewmodel.canPunch()) return false;
      this.viewmodel.triggerPunch();
    }

    const dmg = this.viewmodel.active ? 2 : 1;
    const hit = this._resolveThiefHit(playerPos, lookForward, dmg);
    if (!hit) {
      this.sound.playStickSwing();
    }
    return hit;
  }

  _resolveThiefHit(playerPos, lookForward, dmg) {
    const res = this.npcs.tryHitThief(playerPos, lookForward, dmg, 3.05);
    if (!res.hit) return false;

    if (this.viewmodel.active) this.viewmodel.triggerHitBounce();
    this.engine.pulseHitShake(res.knockedOut ? 0.068 : 0.038);
    this.sound.playPunchHit(res.hitCount - 1, res.knockedOut);

    const popText = res.knockedOut
      ? 'NAKAVT!'
      : ['ÇAT!', 'ÇUT!', 'PAT!', 'GÜM!'][(res.hitCount - 1) % 4];
    this.ui.spawnHitPopup(res.x, res.y + 0.25, res.z, this.engine.camera, popText, res.knockedOut);

    if (res.knockedOut) {
      this.sound.playKnockout();
      this.qsm.thievesCaught++;
      const bounty = 100;
      const recovered = res.stolenRecovered || 0;
      this.qsm.cash += bounty + recovered;
      setTimeout(() => this.sound.playCashRegister(), 180);
      if (this.qsm.state !== QuestState.EVENT_SOFRABEZI_CHASE) {
        this.ui.setNpcHealth(false);
      }
      this.ui.showToast(
        recovered > 0
          ? `ÇAT ÇUT YERE SERİLDİ! Çalınan ${recovered} ₺ kurtarıldı + ${bounty} ₺ Ödül!`
          : `ÇAT ÇUT YERE SERİLDİ! Hırsız nakavt oldu (+${bounty} ₺ Ödül)`,
        4200
      );
      this._syncHudStats();
      this._syncQuestHud();
    } else {
      if (this.qsm.state !== QuestState.EVENT_SOFRABEZI_CHASE) {
        this.ui.setNpcHealth(true, 'SİNSİ HIRSIZ', res.hp, res.maxHp);
      }
      const reactions = [
        'ÇAT! — Hırsız: "AHH! Dur usta öylesine bakıyordum!"',
        'ÇUT! — Hırsız: "Vurma abi bir daha yapmam!"',
        'PAT! — Hırsız: "AYY BELİM GİTTİ!"'
      ];
      this.ui.showToast(reactions[(res.hitCount - 1) % reactions.length], 2200, true);
      this._syncQuestHud();
    }
    return true;
  }

  handleInteraction(target) {
    if (!target || target.type === 'none') return;

    if (target.type === 'npc') {
      this.sound.playUiClick();
      if (this.qsm.state === QuestState.EVENT_ICECREAM_DIALOG) {
        this._openIcecreamDialogue();
      } else if (this.qsm.state === QuestState.EVENT_WIFI_DIALOG) {
        this._openWifiDialogue();
      }
      return;
    }

    if (target.type === 'cloth') {
      if (this.bufe.collectCloth(target.index)) {
        const ratio = this.bufe.clothsCollected / this.bufe.clothCount;
        this.sound.playClothPickup(ratio);
        this._syncQuestHud();

        if (!this.bufe.clothScattered) {
          this.sound.playQuestSuccess();
          this.qsm.markEventDone('sofra');
          this.qsm.cash += 75;
          this.qsm.transition(
            this.qsm.needsRestock ? QuestState.RESTOCK_FRIDGE : QuestState.IDLE_NORMAL
          );
          this.nextEventTimer = 10.0;
          this.ui.showToast('Tüm sofra bezleri tertemiz katlandı! Sinirin geçti (+75 ₺)', 3800);
          this._syncHudStats();
          this._syncQuestHud();
          this._checkAllEventsDone();
        }
      }
      return;
    }

    if (target.type === 'crate') {
      this.qsm.carryingCrate = true;
      this.viewmodel.setCarryingCrate(true);
      this.sound.playUiClick();
      this.ui.showToast('İçecek kasası alındı! Didi veya Pepsi dolabına götür.', 2800);
      this._syncQuestHud();
      return;
    }

    if (target.type === 'fridge' && !this.qsm.carryingCrate) {
      this.ui.showToast('Önce arka köşedeki mavi içecek kasasından stok al!', 2600);
      return;
    }

    if (target.type === 'wifi_note') {
      this.sound.playUiClick();
      this.ui.showToast('Kasa Notu: "Wi-Fi Şifresi: 2 33 444 5555 66666 777777"', 3600);
    }
  }

  _openIcecreamDialogue() {
    this.input.setDialogueOpen(true);
    this.ui.openDialogue(
      'Aceleci Yolcu',
      'OLAY 1 • DONDURMA VAKASI',
      '“Usta, dondurma var mı? Otobüs kalkacak!”',
      [
        {
          id: 'no',
          label: 'Seçenek A: “Maalesef kalmadı abi.” (Nazik Ret)',
          highlight: false
        },
        {
          id: 'stick',
          label: 'Seçenek B: “Tabii var!” (Sopayı Kap & Kovala!)',
          highlight: true
        }
      ],
      (choice) => {
        this.input.setDialogueOpen(false);
        this.input.requestLockIfPC();
        this.sound.playUiClick();

        if (choice === 'no') {
          this.npcs.dismissStoryNpc();
          this.qsm.markEventDone('icecream');
          this.qsm.transition(
            this.qsm.needsRestock ? QuestState.RESTOCK_FRIDGE : QuestState.IDLE_NORMAL
          );
          this.nextEventTimer = 8.5;
          this.ui.showToast('Yolcu: “Sağlık olsun usta, hayırlı işler.”', 3000);
          this._syncHudStats();
          this._syncQuestHud();
          this._checkAllEventsDone();
        } else {
          // Action Chase Mode!
          this.qsm.transition(QuestState.EVENT_ICECREAM_CHASE);
          this.viewmodel.setActive(true);
          this.engine.setShake(0.014);
          this.sound.startChaseMusic();
          this.npcs.startIcecreamChase();
          this.ui.showToast('Müşteri: “ANAM!!” — Sopayla çıkış kapısına kadar kovala!', 3800, true);
          this._syncQuestHud();
        }
      }
    );
  }

  _openWifiDialogue() {
    this.input.setDialogueOpen(true);
    this.ui.openDialogue(
      'Genç Öğrenci Yolcu',
      'OLAY 2 • EFSANE Wİ-Fİ ŞİFRESİ',
      '“Kolay gelsin usta, büfenin Wi-Fi\'si var mı? Bilet indireceğim.”',
      [
        {
          id: 'no',
          label: 'Seçenek A: “Maalesef çekmiyor / yok kardeşim.” (Nazik Ret)',
          highlight: false
        },
        {
          id: 'legend',
          label:
            'Seçenek B: “Yaz bakalım: Bir iki, iki üç, üç dört, dört beş, beş altı, altı yedi.”',
          highlight: true
        }
      ],
      (choice) => {
        this.input.setDialogueOpen(false);
        this.input.requestLockIfPC();
        this.sound.playUiClick();

        if (choice === 'no') {
          this.npcs.dismissStoryNpc();
          this.qsm.markEventDone('wifi');
          this.qsm.transition(
            this.qsm.needsRestock ? QuestState.RESTOCK_FRIDGE : QuestState.IDLE_NORMAL
          );
          this.nextEventTimer = 8.5;
          this.ui.showToast('Yolcu: “Tamamdır abi, kolay gelsin.”', 2800);
        } else {
          this.npcs.dismissStoryNpc();
          this.qsm.markEventDone('wifi');
          this.qsm.cash += 30;
          this.sound.playCashRegister();
          this.qsm.transition(
            this.qsm.needsRestock ? QuestState.RESTOCK_FRIDGE : QuestState.IDLE_NORMAL
          );
          this.nextEventTimer = 9.0;
          this.ui.showToast(
            'Yolcu (şaşkın ama mutlu): “Eyvallah usta, çok sağ ol!” (Kasa notu: 2 33 444 5555 66666 777777)',
            4600
          );
        }
        this._syncHudStats();
        this._syncQuestHud();
        this._checkAllEventsDone();
      }
    );
  }

  _checkAllEventsDone() {
    if (this.qsm.eventsCompleted >= 3 && !this.shiftCompleteShown) {
      this.shiftCompleteShown = true;
      setTimeout(() => {
        this.ui.showToast(
          'Tebrikler! Emin Büfe efsane olaylarının tümünü tamamladın — vardiya açık devam ediyor!',
          5000
        );
      }, 2200);
    }
  }

  update(dt, target, interactHeld) {
    if (this.stickHideTimer > 0) {
      this.stickHideTimer -= dt;
      if (this.stickHideTimer <= 0) {
        this.stickHideTimer = 0;
        if (
          this.qsm.state !== QuestState.EVENT_ICECREAM_CHASE &&
          this.qsm.state !== QuestState.EVENT_SOFRABEZI_CHASE
        ) {
          this.viewmodel.setActive(false);
        }
      }
    }

    // Handle fridge hold-to-restock progress bar
    if (target.type === 'fridge' && this.qsm.carryingCrate && interactHeld) {
      if (this.qsm.restockProgress === 0) {
        this.sound.playFridgeOpen();
      }
      this.qsm.restockProgress += dt / 1.5;
      this.sound.playRestockTick(dt, this.qsm.restockProgress);
      this.ui.setProgress(true, this.qsm.restockProgress, 'Dolaplar Dolduruluyor...');

      if (this.qsm.restockProgress >= 1) {
        this.qsm.restockProgress = 0;
        this.qsm.carryingCrate = false;
        this.qsm.needsRestock = false;
        this.viewmodel.setCarryingCrate(false);
        this.bufe.refillAllDrinks();
        this.qsm.cash += 50;
        this.sound.playQuestSuccess();
        this.ui.setProgress(false);
        this.ui.showToast('Buzdolapları ağzına kadar doldu! (+50 ₺ Düzen Bonusu)', 3200);
        if (this.qsm.state === QuestState.RESTOCK_FRIDGE) {
          this.qsm.transition(QuestState.IDLE_NORMAL);
        }
        this._syncHudStats();
        this._syncQuestHud();
      }
    } else {
      if (this.qsm.restockProgress > 0) {
        this.qsm.restockProgress = 0;
        this.ui.setProgress(false);
      }
    }

    // Trigger next scripted event cleanly when idle (pause countdown during active thief combat)
    if (this.qsm.canStartNewEvent() && !this.qsm.needsRestock && !this.npcs.isThiefEngaged()) {
      this.nextEventTimer -= dt;
      if (this.nextEventTimer <= 0) {
        if (this.eventQueue.length === 0) {
          // Endless replay queue after all 3 events complete!
          this.eventQueue.push('icecream', 'wifi', 'sofra');
        }
        const nextType = this.eventQueue.shift();
        this.nextEventTimer = 11.0;

        if (nextType === 'icecream') {
          this.qsm.transition(QuestState.EVENT_ICECREAM_APPROACH);
        } else if (nextType === 'wifi') {
          this.qsm.transition(QuestState.EVENT_WIFI_APPROACH);
        } else {
          this.qsm.transition(QuestState.EVENT_SOFRABEZI_APPROACH);
        }
        this.npcs.spawnStoryNpc(nextType);
        this._syncQuestHud();
      }
    }
  }
}
