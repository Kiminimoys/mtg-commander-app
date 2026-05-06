/**
 * ============================================================================
 * USE_DECK_CARDS.JS - Hook de gestion des cartes d'un deck (API maison)
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { deckCards as deckCardsApi } from '../services/api';
import { getFrenchName } from '../services/cardNameService';

export const useDeckCards = (deckId) => {
  const [deckCards, setDeckCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Calculate deck statistics
  const calculateStats = useCallback((cards) => {
    if (!cards || cards.length === 0) {
      return {
        totalCards: 0,
        manaCurve: {},
        typeDistribution: {},
        colorDistribution: {},
        averageCMC: 0,
        gameChangerCount: 0,
        bracket: 1,
        completionStatus: { inCollection: 0, toBuy: 0, total: 0 }
      };
    }

    const manaCurve = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, '7+': 0 };
    const typeDistribution = {
      creature: 0,
      instant: 0,
      sorcery: 0,
      artifact: 0,
      enchantment: 0,
      planeswalker: 0,
      land: 0,
      other: 0
    };
    const colorDistribution = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    
    let totalCMC = 0;
    let nonLandCount = 0;
    let gameChangerCount = 0;
    let inCollection = 0;
    let toBuy = 0;

    cards.forEach(card => {
      const cardData = card.card_data || {};
      const qty = card.quantite || 1;

      // Mana curve (exclude lands)
      if (cardData.type_line && !cardData.type_line.toLowerCase().includes('land')) {
        const cmc = cardData.cmc || 0;
        if (cmc >= 7) {
          manaCurve['7+'] += qty;
        } else {
          manaCurve[Math.floor(cmc)] = (manaCurve[Math.floor(cmc)] || 0) + qty;
        }
        totalCMC += cmc * qty;
        nonLandCount += qty;
      }

      // Type distribution
      const typeLine = (cardData.type_line || '').toLowerCase();
      if (typeLine.includes('creature')) typeDistribution.creature += qty;
      else if (typeLine.includes('instant')) typeDistribution.instant += qty;
      else if (typeLine.includes('sorcery')) typeDistribution.sorcery += qty;
      else if (typeLine.includes('artifact')) typeDistribution.artifact += qty;
      else if (typeLine.includes('enchantment')) typeDistribution.enchantment += qty;
      else if (typeLine.includes('planeswalker')) typeDistribution.planeswalker += qty;
      else if (typeLine.includes('land')) typeDistribution.land += qty;
      else typeDistribution.other += qty;

      // Color distribution
      const colors = cardData.colors || [];
      if (colors.length === 0 && !typeLine.includes('land')) {
        colorDistribution.C += qty;
      } else {
        colors.forEach(c => {
          colorDistribution[c] = (colorDistribution[c] || 0) + qty;
        });
      }

      // Game changers
      if (card.is_game_changer) {
        gameChangerCount += qty;
      }

      // Collection status
      if (card.statut === 'en_collection' || card.statut === 'dans_deck') {
        inCollection += qty;
      } else {
        toBuy += qty;
      }
    });

    let bracket = 1;
    if (gameChangerCount >= 11) bracket = 4;
    else if (gameChangerCount >= 6) bracket = 3;
    else if (gameChangerCount >= 3) bracket = 2;

    return {
      totalCards: cards.reduce((sum, c) => sum + (c.quantite || 1), 0),
      manaCurve,
      typeDistribution,
      colorDistribution,
      averageCMC: nonLandCount > 0 ? (totalCMC / nonLandCount).toFixed(2) : 0,
      gameChangerCount,
      bracket,
      completionStatus: {
        inCollection,
        toBuy,
        total: inCollection + toBuy
      }
    };
  }, []);

  // Load deck cards
  const loadDeckCards = useCallback(async () => {
    if (!deckId) return;
    
    setLoading(true);
    try {
      const data = await deckCardsApi.getAll(deckId);
      setDeckCards(data || []);
      setStats(calculateStats(data || []));
    } catch (error) {
      console.error('Erreur chargement cartes du deck:', error);
      setDeckCards([]);
    }
    setLoading(false);
  }, [deckId, calculateStats]);

  useEffect(() => {
    loadDeckCards();
  }, [loadDeckCards]);

  // Add card to deck
  const addCardToDeck = async (cardData, collectionCards = []) => {
    if (!deckId) return false;

    // Check if card exists in collection
    const collectionCard = collectionCards.find(
      c => c.nom.toLowerCase() === cardData.name.toLowerCase()
    );

    // Récupérer le nom français
    let nom_fr = null;
    try {
      nom_fr = await getFrenchName(cardData.name, cardData.set);
    } catch (e) {
      console.log('Nom FR non récupéré:', e);
    }

    const newDeckCard = {
      card_name: cardData.name,
      card_name_fr: nom_fr || collectionCard?.nom_fr || null,
      card_data: {
        name: cardData.name,
        nom_fr: nom_fr || collectionCard?.nom_fr || null,
        mana_cost: cardData.mana_cost,
        cmc: cardData.cmc,
        type_line: cardData.type_line,
        colors: cardData.colors,
        color_identity: cardData.color_identity,
        oracle_text: cardData.oracle_text,
        image_uris: cardData.image_uris,
        set: cardData.set,
        set_name: cardData.set_name
      },
      quantite: 1,
      statut: collectionCard ? 'en_collection' : 'a_acheter',
      is_commander: false,
      categorie: detectCategory(cardData)
    };

    try {
      await deckCardsApi.add(deckId, newDeckCard);
      await loadDeckCards();
      return true;
    } catch (error) {
      console.error('Erreur ajout carte au deck:', error);
      return false;
    }
  };

  // Update card in deck
  const updateDeckCard = async (deckCardId, updates) => {
    try {
      await deckCardsApi.update(deckId, deckCardId, updates);
      await loadDeckCards();
      return true;
    } catch (error) {
      console.error('Erreur update carte deck:', error);
      return false;
    }
  };

  // Remove card from deck
  const removeCardFromDeck = async (deckCardId) => {
    try {
      await deckCardsApi.delete(deckId, deckCardId);
      await loadDeckCards();
      return true;
    } catch (error) {
      console.error('Erreur suppression carte deck:', error);
      return false;
    }
  };

  // Toggle game changer status
  const toggleGameChanger = async (deckCardId) => {
    const card = deckCards.find(c => c.id === deckCardId);
    if (!card) return false;
    
    return await updateDeckCard(deckCardId, { 
      is_game_changer: !card.is_game_changer 
    });
  };

  // Update card quantity
  const updateQuantity = async (deckCardId, quantity) => {
    if (quantity < 1) {
      return await removeCardFromDeck(deckCardId);
    }
    return await updateDeckCard(deckCardId, { quantite: quantity });
  };

  return {
    deckCards,
    loading,
    stats,
    addCardToDeck,
    updateDeckCard,
    removeCardFromDeck,
    toggleGameChanger,
    updateQuantity,
    reload: loadDeckCards
  };
};

// Helper function to detect card category
const detectCategory = (cardData) => {
  const text = (cardData.oracle_text || '').toLowerCase();
  const typeLine = (cardData.type_line || '').toLowerCase();
  const name = (cardData.name || '').toLowerCase();

  // Ramp
  if (text.includes('add') && (text.includes('mana') || text.includes('{')) && !typeLine.includes('land')) {
    return 'ramp';
  }
  if (text.includes('search your library') && text.includes('land')) {
    return 'ramp';
  }
  if (name.includes('sol ring') || name.includes('mana crypt') || name.includes('signet')) {
    return 'ramp';
  }

  // Card draw
  if (text.includes('draw') && text.includes('card')) {
    return 'draw';
  }

  // Removal
  if (text.includes('destroy') || text.includes('exile') || text.includes('sacrifice')) {
    if (text.includes('target') || text.includes('all') || text.includes('each')) {
      return 'removal';
    }
  }

  // Board wipe
  if (text.includes('destroy all') || text.includes('exile all') || 
      (text.includes('all creatures') && (text.includes('destroy') || text.includes('exile')))) {
    return 'boardwipe';
  }

  // Protection
  if (text.includes('hexproof') || text.includes('indestructible') || 
      text.includes('protection from') || text.includes('counter target')) {
    return 'protection';
  }

  // Win condition
  if (text.includes('you win the game') || text.includes('opponent loses the game')) {
    return 'wincon';
  }

  // By type
  if (typeLine.includes('creature')) return 'creature';
  if (typeLine.includes('land')) return 'land';
  if (typeLine.includes('planeswalker')) return 'planeswalker';
  if (typeLine.includes('artifact')) return 'artifact';
  if (typeLine.includes('enchantment')) return 'enchantment';

  return 'other';
};

export default useDeckCards;
