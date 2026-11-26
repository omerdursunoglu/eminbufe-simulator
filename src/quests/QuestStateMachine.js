export const QuestState = Object.freeze({
  IDLE_NORMAL: 'IDLE_NORMAL',
  RESTOCK_FRIDGE: 'RESTOCK_FRIDGE',
  EVENT_ICECREAM_APPROACH: 'EVENT_ICECREAM_APPROACH',
  EVENT_ICECREAM_DIALOG: 'EVENT_ICECREAM_DIALOG',
  EVENT_ICECREAM_CHASE: 'EVENT_ICECREAM_CHASE',
  EVENT_WIFI_APPROACH: 'EVENT_WIFI_APPROACH',
  EVENT_WIFI_DIALOG: 'EVENT_WIFI_DIALOG',
  EVENT_SOFRABEZI_APPROACH: 'EVENT_SOFRABEZI_APPROACH',
  EVENT_SOFRABEZI_CLEANUP: 'EVENT_SOFRABEZI_CLEANUP'
});

/**
 * Strict Event/Quest State Machine preventing overlapping story events & restock locks.
 */
export class QuestStateMachine {
  constructor() {
    this.state = QuestState.IDLE_NORMAL;
    this.needsRestock = false;
    this.carryingCrate = false;
    this.restockProgress = 0;

    this.cash = 150;
    this.eventsCompleted = 0;
    this.completedFlags = {
      icecream: false,
      wifi: false,
      sofra: false
    };
  }

  canStartNewEvent() {
    return this.state === QuestState.IDLE_NORMAL;
  }

  transition(nextState) {
    this.state = nextState;
  }

  markEventDone(key) {
    if (!this.completedFlags[key]) {
      this.completedFlags[key] = true;
      this.eventsCompleted++;
    }
  }
}
