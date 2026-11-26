import { QuestState } from '../quests/QuestStateMachine.js';

// Zero-GC interaction finder checking NPC talk prompts, scattered sofra bezleri, fridges, crate, and Wi-Fi note

export class InteractiveObjects {
  constructor(bufe) {
    this.bufe = bufe;
    this.result = {
      type: 'none', // 'npc' | 'cloth' | 'crate' | 'fridge' | 'wifi_note' | 'none'
      label: '',
      keyLabel: 'E',
      index: -1,
      holdable: false
    };
  }

  /**
   * Finds the highest-priority interactive target near playerPos (zero GC).
   */
  findNearest(playerPos, lookForward, npcManager, questState) {
    const res = this.result;
    res.type = 'none';
    res.label = '';
    res.keyLabel = 'E';
    res.index = -1;
    res.holdable = false;

    // 0. Sneaky Thief NPC in melee beatdown range (highest priority!)
    if (npcManager.isThiefInHitRange(playerPos, lookForward, 3.0)) {
      const t = npcManager.thiefNpc;
      res.type = 'thief';
      res.label = `Hırsızı Döv! ÇAT ÇUT (${t.hp}/${t.maxHp})`;
      res.keyLabel = 'Tık/E';
      return res;
    }

    // 1. Scattered Sofra Bezleri (during Event 3 cleanup after beating saboteur)
    if (this.bufe.clothScattered && questState.state !== QuestState.EVENT_SOFRABEZI_CHASE) {
      let bestDistSq = 2.65 * 2.65;
      let bestIdx = -1;
      const items = this.bufe.clothItems;
      for (let i = 0; i < items.length; i++) {
        const c = items[i];
        if (c.collected) continue;
        const dx = c.scatterX - playerPos.x;
        const dz = c.scatterZ - playerPos.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = i;
        }
      }
      if (bestIdx !== -1) {
        res.type = 'cloth';
        res.label = `Sofra Bezini Topla (${this.bufe.clothsCollected + 1}/${this.bufe.clothCount})`;
        res.index = bestIdx;
        return res;
      }
    }

    // 2. Active Story NPC waiting to talk at counter
    const talkingNpc = npcManager.getWaitingStoryNpc();
    if (talkingNpc) {
      const dx = talkingNpc.x - playerPos.x;
      const dz = talkingNpc.z - playerPos.z;
      if (dx * dx + dz * dz < 4.6 * 4.6) {
        res.type = 'npc';
        res.label = 'Müşteriyle Konuş';
        return res;
      }
    }

    // 3. Restock Crate (if player needs restock & doesn't have crate yet)
    if (questState.needsRestock && !questState.carryingCrate) {
      const dx = this.bufe.cratePos.x - playerPos.x;
      const dz = this.bufe.cratePos.z - playerPos.z;
      if (dx * dx + dz * dz < 2.6 * 2.6) {
        res.type = 'crate';
        res.label = 'İçecek Kasası Al';
        return res;
      }
    }

    // 4. Fridges (Didi or Pepsi) when carrying stock crate (or anytime to check/top-up if below 80%)
    const dDidi =
      (this.bufe.didiFridgePos.x - playerPos.x) ** 2 +
      (this.bufe.didiFridgePos.z - playerPos.z) ** 2;
    const dPepsi =
      (this.bufe.pepsiFridgePos.x - playerPos.x) ** 2 +
      (this.bufe.pepsiFridgePos.z - playerPos.z) ** 2;
    const nearFridge = dDidi < 2.35 * 2.35 || dPepsi < 2.35 * 2.35;

    if (nearFridge && (questState.carryingCrate || this.bufe.getFridgeFillPercent() <= 25)) {
      res.type = 'fridge';
      if (questState.carryingCrate) {
        res.label = 'Dolabı Doldur (Basılı Tut)';
        res.keyLabel = 'E (Tut)';
        res.holdable = true;
      } else {
        res.label = 'Önce Arka Depodan Kasa Al!';
      }
      return res;
    }

    // 5. Diegetic Wi-Fi Password Note beside register
    const wx = this.bufe.wifiNotePos.x - playerPos.x;
    const wz = this.bufe.wifiNotePos.z - playerPos.z;
    const wDistSq = wx * wx + wz * wz;
    if (wDistSq < 2.2 * 2.2) {
      const inv = 1 / Math.max(0.001, Math.sqrt(wDistSq));
      const dot = (wx * lookForward.x + wz * lookForward.z) * inv;
      if (dot > 0.72) {
        res.type = 'wifi_note';
        res.label = 'Wi-Fi Notunu Oku';
        return res;
      }
    }

    return res;
  }
}
