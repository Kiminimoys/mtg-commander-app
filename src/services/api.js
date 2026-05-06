/**
 * ============================================================================
 * API.JS - Service de communication avec le serveur maison
 * ============================================================================
 * 
 * Remplace Supabase par des appels HTTP vers notre API Node.js
 * URL du serveur : http://mtg-commander-toolkit.duckdns.org:3000
 */

//const API_URL = '/api';
const API_URL = 'https://mtg-commander-toolkit.duckdns.org/api';

/**
 * Récupère le token JWT stocké dans localStorage
 */
const getToken = () => localStorage.getItem('mtg_token');

/**
 * Stocke le token JWT dans localStorage
 */
const setToken = (token) => localStorage.setItem('mtg_token', token);

/**
 * Supprime le token JWT
 */
const removeToken = () => localStorage.removeItem('mtg_token');

/**
 * Effectue une requête HTTP vers l'API
 * Ajoute automatiquement le token d'authentification
 */
const request = async (endpoint, options = {}) => {
  const token = getToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erreur API');
  }

  return data;
};

/**
 * ============================================================================
 * AUTH - Authentification
 * ============================================================================
 */
export const auth = {
  /**
   * Inscription d'un nouvel utilisateur
   */
  register: async (email, password) => {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  /**
   * Connexion d'un utilisateur existant
   */
  login: async (email, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  /**
   * Déconnexion
   */
  logout: () => {
    removeToken();
  },

  /**
   * Vérifie si l'utilisateur est connecté (token valide)
   */
  getUser: () => {
    const token = getToken();
    if (!token) return null;
    
    try {
      // Décode le JWT pour récupérer l'ID utilisateur
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { id: payload.id };
    } catch {
      removeToken();
      return null;
    }
  },

  /**
   * Vérifie si un token existe
   */
  isAuthenticated: () => !!getToken(),
};

/**
 * ============================================================================
 * CARDS - Gestion de la collection
 * ============================================================================
 */
export const cards = {
  /**
   * Récupère toutes les cartes de l'utilisateur
   */
  getAll: async () => {
    return request('/cards');
  },

  /**
   * Ajoute une carte à la collection
   */
  add: async (cardData) => {
    return request('/cards', {
      method: 'POST',
      body: JSON.stringify(cardData),
    });
  },

  /**
   * Modifie une carte existante
   */
  update: async (cardId, updates) => {
    return request(`/cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Supprime une carte
   */
  delete: async (cardId) => {
    return request(`/cards/${cardId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * ============================================================================
 * DECKS - Gestion des decks Commander
 * ============================================================================
 */
export const decks = {
  /**
   * Récupère tous les decks de l'utilisateur
   */
  getAll: async () => {
    return request('/decks');
  },

  /**
   * Crée un nouveau deck
   */
  add: async (deckData) => {
    return request('/decks', {
      method: 'POST',
      body: JSON.stringify(deckData),
    });
  },

  /**
   * Modifie un deck (renommer, etc.)
   */
  update: async (deckId, updates) => {
    return request(`/decks/${deckId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Supprime un deck
   */
  delete: async (deckId) => {
    return request(`/decks/${deckId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Duplique un deck
   */
  duplicate: async (deckId) => {
    return request(`/decks/${deckId}/duplicate`, {
      method: 'POST',
    });
  },
};

/**
 * ============================================================================
 * DECK_CARDS - Cartes dans les decks
 * ============================================================================
 */
export const deckCards = {
  /**
   * Récupère les cartes d'un deck
   */
  getAll: async (deckId) => {
    return request(`/decks/${deckId}/cards`);
  },

  /**
   * Ajoute une carte à un deck
   */
  add: async (deckId, cardData) => {
    return request(`/decks/${deckId}/cards`, {
      method: 'POST',
      body: JSON.stringify(cardData),
    });
  },

  /**
   * Modifie une carte dans un deck
   */
  update: async (deckId, cardId, updates) => {
    return request(`/decks/${deckId}/cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Supprime une carte d'un deck
   */
  delete: async (deckId, cardId) => {
    return request(`/decks/${deckId}/cards/${cardId}`, {
      method: 'DELETE',
    });
  },
};

export default { auth, cards, decks, deckCards, API_URL };
