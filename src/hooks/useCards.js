/**
 * ============================================================================
 * USE_CARDS.JS - Hook de gestion de la collection (API maison)
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { cards as cardsApi } from '../services/api';
import offlineService from '../services/offlineService';

export const useCards = (userId) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Détection online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingChanges();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userId]);

  const updatePendingCount = useCallback(() => {
    setPendingCount(offlineService.getPendingSyncCount());
  }, []);

  // Chargement des cartes
  const loadCards = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);

    if (isOnline) {
      try {
        const data = await cardsApi.getAll();
        
        // Met en cache pour utilisation hors-ligne
        offlineService.setCachedCards(data);
        
        // Récupère les actions en attente
        const pendingCards = offlineService.getPendingCards();
        const pendingDeletes = offlineService.getPendingDeletes();
        
        // Fusionne : cartes serveur - supprimées + nouvelles locales
        let mergedCards = data.filter(c => !pendingDeletes.includes(c.id));
        mergedCards = [...mergedCards, ...pendingCards];
        
        // Applique les modifications en attente
        const pendingUpdates = offlineService.getPendingUpdates();
        mergedCards = mergedCards.map(card => {
          const update = pendingUpdates.find(u => u.cardId === card.id);
          if (update) {
            return { ...card, ...update.updates, _pendingSync: true };
          }
          return card;
        });
        
        setCards(mergedCards);
      } catch (error) {
        console.error('Erreur chargement cartes:', error);
        // En cas d'erreur réseau, utilise le cache
        const cached = offlineService.getCachedCards();
        setCards(cached);
      }
    } else {
      // MODE HORS-LIGNE : utilise le cache local
      const cached = offlineService.getCachedCards();
      const pendingCards = offlineService.getPendingCards();
      const pendingDeletes = offlineService.getPendingDeletes();
      
      let mergedCards = cached.filter(c => !pendingDeletes.includes(c.id));
      mergedCards = [...mergedCards, ...pendingCards];
      
      const pendingUpdates = offlineService.getPendingUpdates();
      mergedCards = mergedCards.map(card => {
        const update = pendingUpdates.find(u => u.cardId === card.id);
        if (update) {
          return { ...card, ...update.updates, _pendingSync: true };
        }
        return card;
      });
      
      setCards(mergedCards);
    }
    
    updatePendingCount();
    setLoading(false);
  }, [userId, isOnline, updatePendingCount]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Synchronisation
  const syncPendingChanges = useCallback(async () => {
    if (!userId || !navigator.onLine) return;
    
    setSyncing(true);
    let hasErrors = false;

    try {
      // 1. Synchronise les ajouts
      const pendingCards = offlineService.getPendingCards();
      for (const card of pendingCards) {
        const { _tempId, _pendingSync, _createdAt, ...cardData } = card;
        try {
          await cardsApi.add(cardData);
          offlineService.removePendingCard(_tempId);
        } catch (error) {
          console.error('Erreur sync ajout:', error);
          hasErrors = true;
        }
      }

      // 2. Synchronise les modifications
      const pendingUpdates = offlineService.getPendingUpdates();
      for (const { cardId, updates } of pendingUpdates) {
        try {
          await cardsApi.update(cardId, updates);
          offlineService.removePendingUpdate(cardId);
        } catch (error) {
          console.error('Erreur sync update:', error);
          hasErrors = true;
        }
      }

      // 3. Synchronise les suppressions
      const pendingDeletes = offlineService.getPendingDeletes();
      for (const cardId of pendingDeletes) {
        try {
          await cardsApi.delete(cardId);
          offlineService.removePendingDelete(cardId);
        } catch (error) {
          console.error('Erreur sync delete:', error);
          hasErrors = true;
        }
      }

      await loadCards();
      
    } catch (error) {
      console.error('Erreur synchronisation:', error);
      hasErrors = true;
    }

    setSyncing(false);
    updatePendingCount();
    
    return !hasErrors;
  }, [userId, loadCards, updatePendingCount]);

  // Ajout de carte
  const addCard = useCallback(async (cardData) => {
    if (isOnline) {
      try {
        await cardsApi.add(cardData);
        await loadCards();
        return true;
      } catch (error) {
        console.error('Erreur ajout carte:', error);
      }
      
      // Si échec en ligne, sauvegarde hors-ligne
      const pendingCard = offlineService.addPendingCard({ ...cardData, user_id: userId });
      setCards(prev => [...prev, pendingCard]);
      updatePendingCount();
      return true;
    } else {
      const pendingCard = offlineService.addPendingCard({ ...cardData, user_id: userId });
      setCards(prev => [...prev, pendingCard]);
      updatePendingCount();
      return true;
    }
  }, [userId, isOnline, loadCards, updatePendingCount]);

  // Modification de carte
  const updateCard = useCallback(async (cardId, updates) => {
    if (cardId.toString().startsWith('temp_')) {
      const pending = offlineService.getPendingCards();
      const updated = pending.map(c => 
        c._tempId === cardId ? { ...c, ...updates } : c
      );
      localStorage.setItem('mtg_pending_cards', JSON.stringify(updated));
      setCards(prev => prev.map(c => 
        c._tempId === cardId ? { ...c, ...updates } : c
      ));
      return true;
    }

    if (isOnline) {
      try {
        await cardsApi.update(cardId, updates);
        await loadCards();
        return true;
      } catch (error) {
        console.error('Erreur update carte:', error);
      }
      
      offlineService.addPendingUpdate(cardId, updates);
      setCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, ...updates, _pendingSync: true } : c
      ));
      updatePendingCount();
      return true;
    } else {
      offlineService.addPendingUpdate(cardId, updates);
      setCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, ...updates, _pendingSync: true } : c
      ));
      updatePendingCount();
      return true;
    }
  }, [isOnline, loadCards, updatePendingCount]);

  // Suppression de carte
  const deleteCard = useCallback(async (cardId) => {
    if (cardId.toString().startsWith('temp_')) {
      offlineService.removePendingCard(cardId);
      setCards(prev => prev.filter(c => c._tempId !== cardId));
      updatePendingCount();
      return true;
    }

    if (isOnline) {
      try {
        await cardsApi.delete(cardId);
        await loadCards();
        return true;
      } catch (error) {
        console.error('Erreur delete carte:', error);
      }
      
      offlineService.addPendingDelete(cardId);
      setCards(prev => prev.filter(c => c.id !== cardId));
      updatePendingCount();
      return true;
    } else {
      offlineService.addPendingDelete(cardId);
      setCards(prev => prev.filter(c => c.id !== cardId));
      updatePendingCount();
      return true;
    }
  }, [isOnline, loadCards, updatePendingCount]);

  return {
    cards,
    loading,
    isOnline,
    syncing,
    pendingCount,
    addCard,
    updateCard,
    deleteCard,
    syncPendingChanges,
    reload: loadCards
  };
};

export default useCards;
