/**
 * ============================================================================
 * USE_DECKS.JS - Hook de gestion des decks (API maison)
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { decks as decksApi, deckCards as deckCardsApi } from '../services/api';
import { getFrenchName } from '../services/cardNameService';

export const useDecks = (userId) => {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDecks = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const data = await decksApi.getAll();
      setDecks(data || []);
    } catch (error) {
      console.error('Erreur chargement decks:', error);
      setDecks([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDecks();
  }, [userId]);

  const addDeck = async (deckData, commanderCardData = null) => {
    try {
      // Créer le deck
      const newDeck = await decksApi.add({
        nom: deckData.nom,
        commander: deckData.commander,
        couleurs: deckData.couleurs
      });
      
      // Ajouter le commandant comme première carte du deck
      if (newDeck && deckData.commander) {
        try {
          // Récupérer les infos du commandant si pas déjà fourni
          let cardData = commanderCardData;
          if (!cardData) {
            const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(deckData.commander)}`);
            if (res.ok) cardData = await res.json();
          }
          
          if (cardData) {
            // Récupérer le nom français
            const nom_fr = await getFrenchName(cardData.name, cardData.set);
            
            await deckCardsApi.add(newDeck.id, {
              card_name: cardData.name,
              card_name_fr: nom_fr || null,
              card_data: {
                name: cardData.name,
                nom_fr: nom_fr || null,
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
              statut: 'a_acheter',
              is_commander: true,
              categorie: 'commander'
            });
          }
        } catch (e) {
          console.error('Erreur ajout commandant:', e);
        }
      }
      
      await loadDecks();
      return true;
    } catch (error) {
      console.error('Erreur création deck:', error);
      return false;
    }
  };

  const deleteDeck = async (deckId) => {
    try {
      await decksApi.delete(deckId);
      await loadDecks();
      return true;
    } catch (error) {
      console.error('Erreur suppression deck:', error);
      return false;
    }
  };

  return {
    decks,
    loading,
    addDeck,
    deleteDeck,
    reload: loadDecks
  };
};

export default useDecks;
