/**
 * ============================================================================
 * APP.JSX - Composant racine de l'application MTG Commander
 * ============================================================================
 * 
 * Ce fichier est le point d'entrée principal de l'application.
 * Il gère :
 * - L'authentification (redirection vers Auth si non connecté)
 * - La navigation entre Collection et Decks
 * - L'état global des modals (ajout/édition de cartes et decks)
 * - La barre de synchronisation hors-ligne
 * - Le filtrage des cartes de la collection
 * 
 * Flux de données :
 * App → Header (navigation)
 * App → CardTable (affichage collection filtrée)
 * App → DeckList → DeckView (gestion des decks)
 * App → Modals (ajout/édition)
 */

import React, { useState } from 'react';
import { Search, Plus, RefreshCw, WifiOff, Cloud, Camera } from 'lucide-react';
import 'mana-font/css/mana.css'; // Bibliothèque pour les symboles de mana MTG

// Import des composants UI
import { 
  Auth, Header, CardTable, AddCardModal, EditCardModal, 
  DeckList, AddDeckModal, DeckView, CardScanner
} from './components';
import CollectionStats from './components/CollectionStats';

// Import des hooks personnalisés pour la logique métier
import { useAuth, useCards, useDecks, useExtensions } from './hooks';

// ============================================================================
// STYLES RÉUTILISABLES
// ============================================================================
// Utilisation de styles inline pour éviter les problèmes de cache CSS
// et garantir un affichage cohérent sur tous les navigateurs

const buttonStyles = {
  primary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  success: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  secondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: '#374151',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  paddingLeft: '34px',
  backgroundColor: '#374151',
  border: '1px solid #4b5563',
  borderRadius: '8px',
  fontSize: '13px',
  color: '#fff',
  outline: 'none'
};

const selectStyle = {
  padding: '8px 10px',
  backgroundColor: '#374151',
  border: '1px solid #4b5563',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#fff',
  outline: 'none',
  cursor: 'pointer',
  maxWidth: '140px'
};

/**
 * Composant principal de l'application
 * Gère l'état global et orchestre tous les autres composants
 */
export default function App() {
  // ========================================
  // HOOKS - Récupération des données
  // ========================================
  
  // Authentification : vérifie si l'utilisateur est connecté
  const { user, loading: authLoading, signOut } = useAuth();
  
  // State pour forcer le re-render après login
  const [loggedInUser, setLoggedInUser] = useState(null);
  const currentUser = user || loggedInUser;
  
  // Collection de cartes : CRUD + gestion hors-ligne
  const { 
    cards,              // Liste des cartes de l'utilisateur
    addCard,            // Fonction pour ajouter une carte
    updateCard,         // Fonction pour modifier une carte
    deleteCard,         // Fonction pour supprimer une carte
    isOnline,           // État de la connexion internet
    syncing,            // True si synchronisation en cours
    pendingCount,       // Nombre d'actions en attente de sync
    syncPendingChanges  // Fonction pour forcer la synchronisation
  } = useCards(currentUser?.id);
  
  // Decks Commander : liste et CRUD
  const { decks, addDeck, deleteDeck } = useDecks(currentUser?.id);
  
  // Liste des extensions MTG (pour les dropdowns)
  const { extensions } = useExtensions();
  
  // ========================================
  // ÉTATS LOCAUX - Navigation et UI
  // ========================================
  
  const [view, setView] = useState('collection');     // Vue active : 'collection' ou 'decks'
  const [searchQuery, setSearchQuery] = useState(''); // Texte de recherche
  const [filterColor, setFilterColor] = useState(''); // Filtre par couleur/identité
  const [sortBy, setSortBy] = useState('name');       // Tri : 'name', 'cmc', 'type', 'color', 'extension'
  const [selectedDeck, setSelectedDeck] = useState(null); // Deck ouvert (ou null)
  
  // États des modals
  const [showAddCard, setShowAddCard] = useState(false);   // Modal ajout carte
  const [showEditCard, setShowEditCard] = useState(false); // Modal édition carte
  const [showAddDeck, setShowAddDeck] = useState(false);   // Modal création deck
  const [showScanner, setShowScanner] = useState(false);   // Scanner de cartes
  const [editingCard, setEditingCard] = useState(null);    // Carte en cours d'édition

  // ========================================
  // FILTRAGE ET TRI DE LA COLLECTION
  // ========================================
  
  // Fonction pour calculer le CMC à partir du coût de mana
  const getCMC = (manaCost) => {
    if (!manaCost) return 0;
    let cmc = 0;
    const matches = manaCost.match(/\{([^}]+)\}/g) || [];
    matches.forEach(m => {
      const value = m.replace(/[{}]/g, '');
      if (/^\d+$/.test(value)) cmc += parseInt(value);
      else if (value !== 'X') cmc += 1;
    });
    return cmc;
  };

  // Fonction pour obtenir le type principal
  const getMainType = (type) => {
    if (!type) return 'other';
    const t = type.toLowerCase();
    if (t.includes('creature')) return 'creature';
    if (t.includes('planeswalker')) return 'planeswalker';
    if (t.includes('instant')) return 'instant';
    if (t.includes('sorcery')) return 'sorcery';
    if (t.includes('artifact')) return 'artifact';
    if (t.includes('enchantment')) return 'enchantment';
    if (t.includes('land')) return 'land';
    return 'other';
  };

  // Ordre des types pour le tri
  const typeOrder = { creature: 1, planeswalker: 2, instant: 3, sorcery: 4, artifact: 5, enchantment: 6, land: 7, other: 8 };

  // Filtrage
  const filteredCards = cards.filter(card => {
    const query = searchQuery.toLowerCase();
    
    // Recherche dans nom, nom_fr, type, couleur et extension
    const matchesSearch = !searchQuery || 
      card.nom?.toLowerCase().includes(query) ||
      card.nom_fr?.toLowerCase().includes(query) ||
      card.type?.toLowerCase().includes(query) ||
      card.couleur?.toLowerCase().includes(query) ||
      card.extension?.toLowerCase().includes(query);
    
    // Filtre par couleur amélioré (gère mono, multi, et incolore)
    let matchesColor = true;
    if (filterColor) {
      const cardColors = card.couleur || '';
      if (filterColor === 'C') {
        // Incolore = pas de couleur
        matchesColor = !cardColors || cardColors === 'C';
      } else if (filterColor === 'MULTI') {
        // Multicolore = plus d'une couleur
        matchesColor = cardColors.length > 1 && cardColors !== 'C';
      } else if (filterColor.length === 1) {
        // Mono couleur exacte (ex: que du blanc)
        matchesColor = cardColors === filterColor;
      } else {
        // Identité de couleur (ex: WU = contient W et U)
        matchesColor = filterColor.split('').every(c => cardColors.includes(c));
      }
    }
    
    return matchesSearch && matchesColor;
  });

  // Tri
  const sortedCards = [...filteredCards].sort((a, b) => {
    switch (sortBy) {
      case 'cmc':
        return getCMC(a.cout_mana) - getCMC(b.cout_mana);
      case 'type':
        return typeOrder[getMainType(a.type)] - typeOrder[getMainType(b.type)];
      case 'color':
        // Mono d'abord (1 couleur), puis multi (plusieurs couleurs), puis incolore
        const aColors = a.couleur || '';
        const bColors = b.couleur || '';
        const aIsMono = aColors.length === 1 && aColors !== 'C';
        const bIsMono = bColors.length === 1 && bColors !== 'C';
        const aIsMulti = aColors.length > 1;
        const bIsMulti = bColors.length > 1;
        const aIsColorless = !aColors || aColors === 'C';
        const bIsColorless = !bColors || bColors === 'C';
        
        // Ordre : Mono -> Multi -> Incolore
        if (aIsMono && !bIsMono) return -1;
        if (!aIsMono && bIsMono) return 1;
        if (aIsMulti && bIsColorless) return -1;
        if (aIsColorless && bIsMulti) return 1;
        
        // Dans la même catégorie, trier par couleur alphabétique
        return aColors.localeCompare(bColors);
      case 'extension':
        return (a.extension || '').localeCompare(b.extension || '');
      case 'price_asc':
        return (a.prix_eur || 0) - (b.prix_eur || 0);
      case 'price_desc':
        return (b.prix_eur || 0) - (a.prix_eur || 0);
      case 'name':
      default:
        return (a.nom_fr || a.nom || '').localeCompare(b.nom_fr || b.nom || '');
    }
  });

  // ========================================
  // HANDLERS - Gestion des actions
  // ========================================

  /**
   * Ajoute une nouvelle carte à la collection
   * Ferme le modal en cas de succès
   */
  const handleAddCard = async (cardData) => {
    const success = await addCard(cardData);
    if (success) setShowAddCard(false);
  };

  /**
   * Ouvre le modal d'édition avec les données de la carte
   */
  const handleEditCard = (card) => {
    setEditingCard(card);
    setShowEditCard(true);
  };

  /**
   * Sauvegarde les modifications d'une carte
   * Utilise _tempId si la carte n'a pas encore d'ID (créée hors-ligne)
   */
  const handleSaveCard = async (card) => {
    const success = await updateCard(card._tempId || card.id, {
      extension: card.extension,
      exemplaires: card.exemplaires,
      foil: card.foil,
      langue: card.langue
    });
    if (success) {
      setShowEditCard(false);
      setEditingCard(null);
    }
  };

  /**
   * Supprime une carte après confirmation
   */
  const handleDeleteCard = async (cardId) => {
    if (confirm('Supprimer cette carte ?')) {
      await deleteCard(cardId);
    }
  };

  /**
   * Crée un nouveau deck Commander
   */
  const handleAddDeck = async (deckData) => {
    const success = await addDeck(deckData);
    if (success) setShowAddDeck(false);
  };

  /**
   * Supprime un deck après confirmation
   */
  const handleDeleteDeck = async (deckId) => {
    if (confirm('Supprimer ce deck ?')) {
      await deleteDeck(deckId);
    }
  };

  // ========================================
  // RENDU CONDITIONNEL
  // ========================================

  // Écran de chargement pendant la vérification d'authentification
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Si non connecté, afficher la page d'authentification
  if (!currentUser) return <Auth onLogin={(u) => setLoggedInUser(u)} />;

  // ========================================
  // RENDU PRINCIPAL
  // ========================================
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f14' }}>
      {/* 
        HEADER - Navigation principale
        Permet de basculer entre Collection et Decks
        Affiche l'état de connexion
      */}
      <Header view={view} setView={(v) => { setView(v); setSelectedDeck(null); }} isOnline={isOnline} />

      {/* 
        BARRE DE SYNCHRONISATION
        Affichée uniquement si :
        - Des actions sont en attente de synchronisation
        - L'utilisateur est hors-ligne
      */}
      {(pendingCount > 0 || !isOnline) && (
        <div style={{
          position: 'sticky',
          top: '56px',
          zIndex: 30,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isOnline ? 'rgba(120, 53, 15, 0.5)' : 'rgba(127, 29, 29, 0.5)',
          borderBottom: `1px solid ${isOnline ? '#92400e' : '#991b1b'}`,
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isOnline ? (
              <><WifiOff size={14} style={{ color: '#fca5a5' }} /><span style={{ color: '#fca5a5' }}>Hors-ligne</span></>
            ) : (
              <><Cloud size={14} style={{ color: '#fcd34d' }} /><span style={{ color: '#fcd34d' }}>{pendingCount} en attente</span></>
            )}
          </div>
          {isOnline && pendingCount > 0 && (
            <button
              onClick={syncPendingChanges}
              disabled={syncing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#d97706',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: syncing ? 'wait' : 'pointer',
                opacity: syncing ? 0.7 : 1
              }}
            >
              <RefreshCw size={12} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing ? 'Sync...' : 'Synchroniser'}
            </button>
          )}
        </div>
      )}

      <main style={{ maxWidth: '1024px', margin: '0 auto', padding: '16px 12px' }}>
        {/* Collection */}
        {view === 'collection' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Filters */}
            <div style={{
              backgroundColor: '#1f2937',
              borderRadius: '10px',
              border: '1px solid #374151',
              padding: '12px'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '150px', position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <select
                  value={filterColor}
                  onChange={(e) => setFilterColor(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Toutes couleurs</option>
                  <optgroup label="Mono-couleur">
                    <option value="W">⬜ Blanc uniquement</option>
                    <option value="U">🔵 Bleu uniquement</option>
                    <option value="B">⚫ Noir uniquement</option>
                    <option value="R">🔴 Rouge uniquement</option>
                    <option value="G">🟢 Vert uniquement</option>
                  </optgroup>
                  <optgroup label="Multi-couleurs">
                    <option value="MULTI">🌈 Toutes multicolores</option>
                    <option value="WU">⬜🔵 Azorius (WU)</option>
                    <option value="UB">🔵⚫ Dimir (UB)</option>
                    <option value="BR">⚫🔴 Rakdos (BR)</option>
                    <option value="RG">🔴🟢 Gruul (RG)</option>
                    <option value="GW">🟢⬜ Selesnya (GW)</option>
                    <option value="WB">⬜⚫ Orzhov (WB)</option>
                    <option value="UR">🔵🔴 Izzet (UR)</option>
                    <option value="BG">⚫🟢 Golgari (BG)</option>
                    <option value="RW">🔴⬜ Boros (RW)</option>
                    <option value="GU">🟢🔵 Simic (GU)</option>
                  </optgroup>
                  <optgroup label="Autre">
                    <option value="C">◇ Incolore</option>
                  </optgroup>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={selectStyle}
                >
                  <option value="name">Trier par nom</option>
                  <option value="cmc">Trier par CMC</option>
                  <option value="type">Trier par type</option>
                  <option value="color">Trier par couleur</option>
                  <option value="extension">Trier par extension</option>
                  <option value="price_asc">Prix ↑ (croissant)</option>
                  <option value="price_desc">Prix ↓ (décroissant)</option>
                </select>
                <button 
                  onClick={() => setShowAddCard(true)} 
                  style={buttonStyles.success}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#047857'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#059669'}
                >
                  <Plus size={16} /> Ajouter
                </button>
                <button 
                  onClick={() => setShowScanner(true)} 
                  style={buttonStyles.primary}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#6d28d9'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#7c3aed'}
                >
                  <Camera size={16} /> Scanner
                </button>
              </div>
              {filterColor && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Filtre actif :</span>
                  <button onClick={() => setFilterColor('')} style={{ padding: '4px 8px', backgroundColor: '#374151', color: '#d1d5db', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Couleur: {filterColor === 'MULTI' ? 'Multicolores' : filterColor} ×
                  </button>
                </div>
              )}
            </div>

            {/* Stats avec cercle coloré */}
            <CollectionStats cards={sortedCards} />

            <CardTable 
              cards={sortedCards}
              extensions={extensions}
              onEdit={handleEditCard}
              onDelete={handleDeleteCard}
            />

            <div style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
              {sortedCards.length} / {cards.length} carte(s)
              {pendingCount > 0 && <span style={{ color: '#f59e0b', marginLeft: '8px' }}>• {pendingCount} en attente</span>}
            </div>
          </div>
        )}

        {/* Decks */}
        {view === 'decks' && !selectedDeck && (
          <DeckList 
            decks={decks}
            onAdd={() => setShowAddDeck(true)}
            onDelete={handleDeleteDeck}
            onOpen={setSelectedDeck}
          />
        )}

        {/* Deck View */}
        {view === 'decks' && selectedDeck && (
          <DeckView 
            deck={selectedDeck}
            cards={cards}
            onBack={() => setSelectedDeck(null)}
            isOnline={isOnline}
            onAddToCollection={handleAddCard}
          />
        )}
      </main>

      <AddCardModal 
        show={showAddCard}
        onClose={() => setShowAddCard(false)}
        onAdd={handleAddCard}
        extensions={extensions}
        isOnline={isOnline}
      />
      <EditCardModal 
        show={showEditCard}
        card={editingCard}
        onClose={() => { setShowEditCard(false); setEditingCard(null); }}
        onSave={handleSaveCard}
        extensions={extensions}
        isOnline={isOnline}
      />
      <AddDeckModal 
        show={showAddDeck}
        onClose={() => setShowAddDeck(false)}
        onAdd={handleAddDeck}
        isOnline={isOnline}
      />
      {showScanner && (
        <CardScanner
          onClose={() => setShowScanner(false)}
          onCardScanned={async (scryfallCard) => {
            // Convertir les données Scryfall au format de notre collection
            const cardData = {
              nom: scryfallCard.name,
              nom_fr: scryfallCard.printed_name || null,
              couleur: scryfallCard.colors?.join('') || 'C',
              type: scryfallCard.type_line,
              cout_mana: scryfallCard.mana_cost,
              extension: scryfallCard.set.toUpperCase(),
              foil: false,
              exemplaires: 1,
              langue: 'en',
              scryfall_id: scryfallCard.id,
              prix_eur: scryfallCard.prices?.eur ? parseFloat(scryfallCard.prices.eur) : null
            };
            await addCard(cardData);
          }}
        />
      )}
    </div>
  );
}
