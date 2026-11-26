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
        if (this.qsm.needsRestock) {
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
            'Müşterilere servis yap, stokları dolu tut ve terminalin tadını çıkar.',
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
        this.ui.setQuest(
          'Buzdolapları Boşaldı — Stokları Doldur!',
          this.qsm.carryingCrate
            ? 'Didi veya Pepsi dolabına gidip basılı tutarak rafları doldur!'
            : 'Arka köşedeki içecek kasasını al.',
          true
        );
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
    this.qsm.transition(QuestState.EVENT_SOFRABEZI_CLEANUP);
    this.sound.playRageSting();
    this.ui.triggerRageVignette(2400);
    this.ui.showToast('Yine dağıttı gitti, sabır ya!', 3800, true);
    this._syncQuestHud();
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

    // Trigger next scripted event cleanly when idle
    if (this.qsm.canStartNewEvent() && !this.qsm.needsRestock) {
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
