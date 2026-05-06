// Service de gestion du mode hors-ligne
const PENDING_CARDS_KEY = 'mtg_pending_cards';
const PENDING_DELETES_KEY = 'mtg_pending_deletes';
const PENDING_UPDATES_KEY = 'mtg_pending_updates';
const CACHED_CARDS_KEY = 'mtg_cached_cards';

export const offlineService = {
  // Check if online
  isOnline: () => navigator.onLine,

  // ============ PENDING CARDS (to add) ============
  getPendingCards: () => {
    const data = localStorage.getItem(PENDING_CARDS_KEY);
    return data ? JSON.parse(data) : [];
  },

  addPendingCard: (card) => {
    const pending = offlineService.getPendingCards();
    const cardWithId = { 
      ...card, 
      _tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      _pendingSync: true,
      _createdAt: new Date().toISOString()
    };
    pending.push(cardWithId);
    localStorage.setItem(PENDING_CARDS_KEY, JSON.stringify(pending));
    return cardWithId;
  },

  removePendingCard: (tempId) => {
    const pending = offlineService.getPendingCards();
    const filtered = pending.filter(c => c._tempId !== tempId);
    localStorage.setItem(PENDING_CARDS_KEY, JSON.stringify(filtered));
  },

  clearPendingCards: () => {
    localStorage.setItem(PENDING_CARDS_KEY, JSON.stringify([]));
  },

  // ============ PENDING DELETES ============
  getPendingDeletes: () => {
    const data = localStorage.getItem(PENDING_DELETES_KEY);
    return data ? JSON.parse(data) : [];
  },

  addPendingDelete: (cardId) => {
    const pending = offlineService.getPendingDeletes();
    if (!pending.includes(cardId)) {
      pending.push(cardId);
      localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(pending));
    }
  },

  removePendingDelete: (cardId) => {
    const pending = offlineService.getPendingDeletes();
    const filtered = pending.filter(id => id !== cardId);
    localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(filtered));
  },

  clearPendingDeletes: () => {
    localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify([]));
  },

  // ============ PENDING UPDATES ============
  getPendingUpdates: () => {
    const data = localStorage.getItem(PENDING_UPDATES_KEY);
    return data ? JSON.parse(data) : [];
  },

  addPendingUpdate: (cardId, updates) => {
    const pending = offlineService.getPendingUpdates();
    // Replace if already exists
    const index = pending.findIndex(u => u.cardId === cardId);
    if (index >= 0) {
      pending[index] = { cardId, updates, _updatedAt: new Date().toISOString() };
    } else {
      pending.push({ cardId, updates, _updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify(pending));
  },

  removePendingUpdate: (cardId) => {
    const pending = offlineService.getPendingUpdates();
    const filtered = pending.filter(u => u.cardId !== cardId);
    localStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify(filtered));
  },

  clearPendingUpdates: () => {
    localStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify([]));
  },

  // ============ CACHED CARDS (for offline display) ============
  getCachedCards: () => {
    const data = localStorage.getItem(CACHED_CARDS_KEY);
    return data ? JSON.parse(data) : [];
  },

  setCachedCards: (cards) => {
    localStorage.setItem(CACHED_CARDS_KEY, JSON.stringify(cards));
  },

  // ============ SYNC STATUS ============
  hasPendingSync: () => {
    return offlineService.getPendingCards().length > 0 ||
           offlineService.getPendingDeletes().length > 0 ||
           offlineService.getPendingUpdates().length > 0;
  },

  getPendingSyncCount: () => {
    return offlineService.getPendingCards().length +
           offlineService.getPendingDeletes().length +
           offlineService.getPendingUpdates().length;
  }
};

export default offlineService;
