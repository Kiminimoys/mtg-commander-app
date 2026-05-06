/**
 * EDHREC Service - Suggestions et Game Changers
 * Récupère les recommandations EDHREC et calcule le bracket du deck
 */

// Cache pour les game changers
let gameChangersCache = null;

export const edhrecService = {
  
  // ============ GAME CHANGERS ============
  
  /**
   * Récupère la liste des Game Changers depuis Scryfall
   */
  fetchGameChangers: async () => {
    if (gameChangersCache) return gameChangersCache;
    
    try {
      const response = await fetch('https://api.scryfall.com/cards/search?q=is:game-changer&order=name');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      const allCards = data.data || [];
      
      // Pagination
      let nextPage = data.next_page;
      while (nextPage) {
        const nextResponse = await fetch(nextPage);
        const nextData = await nextResponse.json();
        allCards.push(...(nextData.data || []));
        nextPage = nextData.next_page;
      }
      
      gameChangersCache = allCards.map(card => card.name.toLowerCase());
      return gameChangersCache;
    } catch (error) {
      console.error('Erreur Game Changers:', error);
      return getFallbackGameChangers();
    }
  },
  
  /**
   * Compte les Game Changers dans un deck
   */
  countGameChangers: async (deckCards) => {
    const gameChangers = await edhrecService.fetchGameChangers();
    let count = 0;
    const foundCards = [];
    
    deckCards.forEach(card => {
      const cardName = (card.card_name || card.name || '').toLowerCase();
      if (gameChangers.includes(cardName)) {
        count += card.quantite || 1;
        foundCards.push(card.card_name || card.name);
      }
    });
    
    return { count, cards: foundCards };
  },
  
  /**
   * Calcule le bracket selon le nombre de Game Changers
   */
  calculateBracket: (gameChangerCount) => {
    if (gameChangerCount === 0) return 2;
    if (gameChangerCount <= 3) return 3;
    return 4;
  },
  
  // ============ EDHREC RECOMMENDATIONS ============
  
  /**
   * Récupère les recommandations EDHREC pour un commandant
   */
  getRecommendations: async (commanderName) => {
    if (!commanderName) return null;
    
    try {
      // Format le nom pour l'URL
      const formattedName = commanderName
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      console.log('EDHREC: Fetching for', formattedName);
      
      // Essayer plusieurs formats d'URL
      const urls = [
        `https://json.edhrec.com/pages/commanders/${formattedName}.json`,
        `https://edhrec.com/api/commanders/${formattedName}`
      ];
      
      for (const url of urls) {
        try {
          const response = await fetch(url, {
            headers: { 'Accept': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('EDHREC: Got data', data);
            const parsed = edhrecService.parseRecommendations(data);
            if (parsed && (parsed.topCards.length > 0 || parsed.highSynergy.length > 0)) {
              return parsed;
            }
          }
        } catch (e) {
          console.log('EDHREC: URL failed', url, e.message);
        }
      }
      
      // Si EDHREC échoue, utiliser Scryfall pour des suggestions basiques
      console.log('EDHREC: Falling back to Scryfall suggestions');
      return await edhrecService.getScryfallSuggestions(commanderName);
      
    } catch (error) {
      console.error('EDHREC Error:', error);
      return await edhrecService.getScryfallSuggestions(commanderName);
    }
  },
  
  /**
   * Suggestions de secours via Scryfall
   */
  getScryfallSuggestions: async (commanderName) => {
    try {
      // Récupérer les infos du commandant
      const cmdResponse = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(commanderName)}`);
      if (!cmdResponse.ok) return null;
      
      const commander = await cmdResponse.json();
      const colors = commander.color_identity?.join('') || '';
      
      // Chercher des cartes populaires dans ces couleurs
      const queries = [
        `commander:${colors} type:creature cmc<=4 usd>5`,
        `commander:${colors} type:instant`,
        `commander:${colors} type:sorcery`,
        `commander:${colors} type:artifact`,
        `commander:${colors} type:enchantment`
      ];
      
      const suggestions = [];
      
      for (const q of queries.slice(0, 2)) { // Limite pour pas trop de requêtes
        try {
          const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&order=edhrec`);
          if (res.ok) {
            const data = await res.json();
            if (data.data) {
              suggestions.push(...data.data.slice(0, 5).map(c => ({
                name: c.name,
                inclusion: 50, // Estimation
                synergy: 0.3
              })));
            }
          }
        } catch (e) {
          console.log('Scryfall search failed:', e.message);
        }
      }
      
      return {
        topCards: suggestions.slice(0, 10),
        highSynergy: suggestions.slice(10, 20),
        newCards: [],
        numDecks: 0,
        link: `https://edhrec.com/commanders/${commanderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      };
      
    } catch (error) {
      console.error('Scryfall suggestions error:', error);
      return null;
    }
  },
  
  /**
   * Parse les données EDHREC
   */
  parseRecommendations: (data) => {
    if (!data) return null;
    
    const result = {
      topCards: [],
      highSynergy: [],
      newCards: [],
      numDecks: 0,
      link: ''
    };
    
    try {
      result.numDecks = data.container?.json_dict?.num_decks || data.num_decks || 0;
      
      if (data.container?.json_dict?.url) {
        result.link = `https://edhrec.com${data.container.json_dict.url}`;
      }
      
      // Parse cardlists
      const cardlists = data.cardlists || data.card_lists || [];
      
      if (Array.isArray(cardlists)) {
        cardlists.forEach(list => {
          const cards = (list.cardviews || list.cards || []).map(card => ({
            name: card.name,
            inclusion: card.inclusion || card.num_decks_percent || card.percentage || 0,
            synergy: card.synergy_score || card.synergy || 0,
            salt: card.salt_score || 0,
            price: card.prices?.usd || card.price || null
          }));
          
          const tag = list.tag || list.header || '';
          
          if (tag.includes('top') || tag.includes('Top')) {
            result.topCards = cards.slice(0, 25);
          } else if (tag.includes('synergy') || tag.includes('Synergy')) {
            result.highSynergy = cards.slice(0, 20);
          } else if (tag.includes('new') || tag.includes('New')) {
            result.newCards = cards.slice(0, 10);
          }
        });
      }
      
      // Fallback si pas de tags
      if (result.topCards.length === 0 && cardlists.length > 0) {
        const firstList = cardlists[0];
        const cards = firstList.cardviews || firstList.cards || [];
        result.topCards = cards.slice(0, 25).map(card => ({
          name: card.name,
          inclusion: card.inclusion || card.num_decks_percent || 50,
          synergy: card.synergy_score || 0.2
        }));
      }
      
    } catch (error) {
      console.error('Parse error:', error);
    }
    
    return result;
  },
  
  /**
   * Analyse un deck par rapport aux recommandations
   */
  analyzeDeck: (deckCards, recommendations) => {
    if (!recommendations) return { missing: [], toConsider: [] };
    
    const deckCardNames = deckCards.map(c => (c.card_name || '').toLowerCase());
    
    const analysis = {
      missing: [],
      toConsider: []
    };
    
    // Staples manquantes (>40% inclusion)
    recommendations.topCards
      .filter(c => c.inclusion >= 40 && !deckCardNames.includes(c.name.toLowerCase()))
      .forEach(c => analysis.missing.push(c));
    
    // Haute synergie
    recommendations.highSynergy
      .filter(c => c.synergy > 0.2 && !deckCardNames.includes(c.name.toLowerCase()))
      .forEach(c => {
        if (!analysis.missing.find(m => m.name.toLowerCase() === c.name.toLowerCase())) {
          analysis.toConsider.push(c);
        }
      });
    
    return analysis;
  }
};

// Liste de secours des Game Changers
const getFallbackGameChangers = () => [
  'ad nauseam', 'ancient tomb', 'aura shards', 'craterhoof behemoth',
  'cyclonic rift', 'demonic consultation', 'demonic tutor', 'dockside extortionist',
  'drannith magistrate', 'enlightened tutor', 'esper sentinel', "gaea's cradle",
  'grand abolisher', 'grave pact', 'imperial seal', "jeska's will",
  'mana crypt', 'mana drain', 'mana vault', 'mystical tutor',
  'narset, parter of veils', 'necropotence', 'notion thief', 'opposition agent',
  'orcish bowmasters', 'rhystic study', "serra's sanctum", 'smothering tithe',
  'sol ring', 'survival of the fittest', 'sylvan library', 'tainted pact',
  "thassa's oracle", 'the one ring', 'underworld breach', 'vampiric tutor', 'worldly tutor'
];

export default edhrecService;
