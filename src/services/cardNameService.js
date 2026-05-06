/**
 * cardNameService.js - Service de gestion des noms de cartes multilingues
 * 
 * Scryfall stocke les noms traduits dans printed_name pour les langues non-anglaises.
 * Ce service récupère le nom français d'une carte via l'API Scryfall.
 */

// Cache pour éviter les requêtes répétées
const nameCache = new Map();

/**
 * Récupère le nom français d'une carte depuis Scryfall
 * @param {string} englishName - Nom anglais de la carte
 * @param {string} setCode - Code de l'extension (optionnel)
 * @returns {Promise<string|null>} - Nom français ou null si non trouvé
 */
export const getFrenchName = async (englishName, setCode = null) => {
  if (!englishName) return null;
  
  const cacheKey = `${englishName}|${setCode || ''}`;
  if (nameCache.has(cacheKey)) {
    return nameCache.get(cacheKey);
  }
  
  try {
    // Cherche la version française de la carte
    const baseUrl = 'https://api.scryfall.com/cards/named';
    const params = new URLSearchParams({
      exact: englishName,
      ...(setCode && { set: setCode })
    });
    
    // D'abord récupérer l'ID de la carte anglaise
    const enResponse = await fetch(`${baseUrl}?${params}`);
    if (!enResponse.ok) return null;
    
    const enData = await enResponse.json();
    
    // Chercher la version française via prints
    const printsUrl = enData.prints_search_uri;
    if (printsUrl) {
      const printsResponse = await fetch(`${printsUrl}&include_multilingual=true`);
      if (printsResponse.ok) {
        const printsData = await printsResponse.json();
        
        // Cherche une version française
        const frenchCard = printsData.data?.find(card => card.lang === 'fr');
        if (frenchCard?.printed_name) {
          nameCache.set(cacheKey, frenchCard.printed_name);
          return frenchCard.printed_name;
        }
      }
    }
    
    // Alternative : recherche directe en français
    const frSearchUrl = `https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(englishName)}"+lang:fr&unique=prints`;
    const frResponse = await fetch(frSearchUrl);
    
    if (frResponse.ok) {
      const frData = await frResponse.json();
      if (frData.data?.[0]?.printed_name) {
        const frName = frData.data[0].printed_name;
        nameCache.set(cacheKey, frName);
        return frName;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erreur récupération nom FR:', error);
    return null;
  }
};

/**
 * Récupère les noms français pour plusieurs cartes en batch
 * @param {Array} cards - Tableau de cartes avec {nom, extension}
 * @returns {Promise<Map>} - Map nom_en -> nom_fr
 */
export const getFrenchNames = async (cards) => {
  const results = new Map();
  
  // Traite par lots de 5 pour éviter de surcharger l'API
  const batchSize = 5;
  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    
    const promises = batch.map(async (card) => {
      const frName = await getFrenchName(card.nom, card.extension);
      if (frName) {
        results.set(card.nom, frName);
      }
    });
    
    await Promise.all(promises);
    
    // Petit délai entre les batches pour respecter les rate limits
    if (i + batchSize < cards.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
};

/**
 * Récupère le nom affiché selon la langue de la carte
 * @param {Object} card - Carte avec nom, nom_fr, langue
 * @returns {string} - Nom à afficher
 */
export const getDisplayName = (card) => {
  if (!card) return '';
  
  // Si la carte est en français et qu'on a le nom FR, l'utiliser
  if (card.langue === 'FR' && card.nom_fr) {
    return card.nom_fr;
  }
  
  // Sinon utiliser le nom anglais
  return card.nom || card.card_name || card.name || '';
};

/**
 * Récupère les infos complètes d'une carte avec nom FR
 * @param {string} cardName - Nom de la carte
 * @param {string} setCode - Code extension
 * @returns {Promise<Object>} - Données carte avec nom_fr
 */
export const getCardWithFrenchName = async (cardName, setCode = null) => {
  try {
    const params = setCode 
      ? `exact=${encodeURIComponent(cardName)}&set=${setCode}`
      : `exact=${encodeURIComponent(cardName)}`;
    
    const response = await fetch(`https://api.scryfall.com/cards/named?${params}`);
    if (!response.ok) return null;
    
    const card = await response.json();
    
    // Récupérer le nom français
    const nom_fr = await getFrenchName(cardName, setCode);
    
    return {
      ...card,
      nom_fr
    };
  } catch (error) {
    console.error('Erreur getCardWithFrenchName:', error);
    return null;
  }
};

export default {
  getFrenchName,
  getFrenchNames,
  getDisplayName,
  getCardWithFrenchName
};
