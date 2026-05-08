/**
 * DeckView - Vue détaillée d'un deck Commander
 */
import React, { useState, useEffect } from 'react';
import { 
  X, Search, Plus, Trash2, ShoppingCart, Check, Crown,
  BarChart3, Lightbulb, ChevronDown, ChevronUp, Loader, WifiOff,
  AlertTriangle, ArrowLeft, ExternalLink, RefreshCw, Lock,
  Download, Upload, Copy
} from 'lucide-react';

import { useDeckCards } from '../hooks/useDeckCards';
import { edhrecService } from '../services/edhrecService';
import { getFrenchName } from '../services/cardNameService';
import ManaCost from './ManaCost';

// Catégories par TYPE
const TYPE_CATEGORIES = {
  commander: { label: '👑 Commandant', order: 0 },
  creature: { label: '👤 Créatures', order: 1 },
  planeswalker: { label: '✨ Planeswalkers', order: 2 },
  instant: { label: '⚡ Éphémères', order: 3 },
  sorcery: { label: '📜 Rituels', order: 4 },
  artifact: { label: '⚙️ Artefacts', order: 5 },
  enchantment: { label: '🔮 Enchantements', order: 6 },
  land: { label: '🏔️ Terrains', order: 7 },
  other: { label: '📦 Autres', order: 8 }
};

// Catégories par FONCTION
const FUNCTION_CATEGORIES = {
  commander: { label: '👑 Commandant', order: 0 },
  ramp: { label: '🌱 Ramp', order: 1 },
  draw: { label: '📚 Pioche', order: 2 },
  removal: { label: '💀 Removal', order: 3 },
  boardwipe: { label: '💥 Board Wipe', order: 4 },
  protection: { label: '🛡️ Protection', order: 5 },
  wincon: { label: '🏆 Win Condition', order: 6 },
  creature: { label: '👤 Créatures', order: 7 },
  utility: { label: '🔧 Utilitaire', order: 8 },
  land: { label: '🏔️ Terrains', order: 9 }
};

const BRACKET_COLORS = { 1: '#34d399', 2: '#38bdf8', 3: '#fbbf24', 4: '#fb923c', 5: '#f87171' };
const BRACKET_NAMES = { 1: 'Exhibition', 2: 'Core', 3: 'Upgraded', 4: 'Optimized', 5: 'cEDH' };
const BASIC_LANDS = ['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes'];
const isBasicLand = (name) => BASIC_LANDS.includes((name || '').toLowerCase().split(' ').pop());

const cardStyle = { backgroundColor: '#1f2937', borderRadius: '12px', border: '1px solid #374151', padding: '20px' };
const inputStyle = { width: '100%', padding: '12px', backgroundColor: '#374151', border: '1px solid #4b5563', borderRadius: '10px', fontSize: '14px', color: '#fff', outline: 'none' };

const DeckView = ({ deck, cards: collectionCards, onBack, isOnline, onAddToCollection }) => {
  const { deckCards, loading, stats, addCardToDeck, removeCardFromDeck, updateQuantity, reload } = useDeckCards(deck.id);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [categoryMode, setCategoryMode] = useState('type');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [viewMode, setViewMode] = useState('category');
  const [gameChangerInfo, setGameChangerInfo] = useState({ count: 0, cards: [] });
  const [calculatedBracket, setCalculatedBracket] = useState(2);
  const [suggestions, setSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  
  // Recharger les deck_cards quand la collection change (pour voir les liaisons)
  const collectionLength = collectionCards?.length || 0;
  useEffect(() => {
    if (collectionLength > 0) {
      reload();
    }
  }, [collectionLength]);

  const commanderColors = deck.couleurs ? deck.couleurs.split('') : [];
  const commanderCard = deckCards.find(c => c.is_commander);

  useEffect(() => {
    const check = async () => {
      if (deckCards.length > 0) {
        const info = await edhrecService.countGameChangers(deckCards);
        setGameChangerInfo(info);
        setCalculatedBracket(edhrecService.calculateBracket(info.count));
      }
    };
    check();
  }, [deckCards]);

  const loadSuggestions = async () => {
    if (!deck.commander || !isOnline) return;
    setLoadingSuggestions(true);
    try {
      const recs = await edhrecService.getRecommendations(deck.commander);
      setSuggestions(recs);
      if (recs) setAnalysis(edhrecService.analyzeDeck(deckCards, recs));
    } catch (e) { console.error(e); }
    setLoadingSuggestions(false);
  };

  const getTypeCategory = (card) => {
    const t = (card.card_data?.type_line || '').toLowerCase();
    if (t.includes('creature')) return 'creature';
    if (t.includes('planeswalker')) return 'planeswalker';
    if (t.includes('instant')) return 'instant';
    if (t.includes('sorcery')) return 'sorcery';
    if (t.includes('artifact')) return 'artifact';
    if (t.includes('enchantment')) return 'enchantment';
    if (t.includes('land')) return 'land';
    return 'other';
  };

  const getFunctionCategory = (card) => {
    const text = (card.card_data?.oracle_text || '').toLowerCase();
    const t = (card.card_data?.type_line || '').toLowerCase();
    if (t.includes('land')) return 'land';
    if (text.includes('add') && text.includes('mana')) return 'ramp';
    if (text.includes('search your library') && text.includes('land')) return 'ramp';
    if (text.includes('draw') && text.includes('card')) return 'draw';
    if (text.includes('destroy all') || text.includes('exile all')) return 'boardwipe';
    if (text.includes('destroy target') || text.includes('exile target')) return 'removal';
    if (text.includes('counter target') || text.includes('hexproof')) return 'protection';
    if (text.includes('you win the game')) return 'wincon';
    if (t.includes('creature')) return 'creature';
    return 'utility';
  };

  const getCardsByCategory = () => {
    const grouped = {};
    deckCards.forEach(card => {
      const cat = card.is_commander ? 'commander' : (categoryMode === 'type' ? getTypeCategory(card) : (card.categorie || getFunctionCategory(card)));
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(card);
    });
    return grouped;
  };

  const cardsByCategory = getCardsByCategory();
  const categories = categoryMode === 'type' ? TYPE_CATEGORIES : FUNCTION_CATEGORIES;
  const sortedCategories = Object.entries(categories).sort((a, b) => a[1].order - b[1].order);
  const bracketColor = BRACKET_COLORS[calculatedBracket];

  // Calculer le prix total du deck (hors terrains de base)
  const deckTotalPrice = deckCards.reduce((total, card) => {
    if (isBasicLand(card.card_name)) return total;
    const price = card.card_data?.prix_eur || 0;
    return total + (price * (card.quantite || 1));
  }, 0);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><RefreshCw size={32} style={{ color: '#7c3aed', animation: 'spin 1s linear infinite' }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
            <button onClick={onBack} style={{ padding: '8px', backgroundColor: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#9ca3af' }}><ArrowLeft size={18} /></button>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#fff' }}>{deck.nom}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#a78bfa' }}>{deck.commander}</p>
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                {commanderColors.map((c, i) => <span key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: { W: '#fef3c7', U: '#3b82f6', B: '#1f2937', R: '#ef4444', G: '#22c55e' }[c], border: '1px solid #4b5563' }} />)}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 20px', borderRadius: '12px', backgroundColor: `${bracketColor}15`, border: `1px solid ${bracketColor}50` }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: bracketColor }}>{calculatedBracket}</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: bracketColor }}>{BRACKET_NAMES[calculatedBracket]}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{gameChangerInfo.count} GC</div>
          </div>
        </div>

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '20px' }}>
            {[
              { label: 'Cartes', value: stats.totalCards, sub: '/100' }, 
              { label: 'CMC moyen', value: stats.averageCMC }, 
              { label: 'Valeur', value: `${deckTotalPrice.toFixed(0)}€`, color: '#34d399' }
            ].map((s, i) => (
              <div key={i} style={{ backgroundColor: '#374151', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', color: s.color || '#fff' }}>{s.value}{s.sub && <span style={{ fontSize: '12px', color: '#6b7280' }}>{s.sub}</span>}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowAddCard(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}><Plus size={16} /> Ajouter</button>
          <button onClick={() => { setShowSuggestions(true); loadSuggestions(); }} disabled={!isOnline} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: isOnline ? 1 : 0.5 }}><Lightbulb size={16} /> EDHREC</button>
          <button onClick={() => setShowImport(true)} disabled={!isOnline} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#374151', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: isOnline ? 1 : 0.5 }}><Upload size={16} /> Import</button>
          <button onClick={() => setShowExport(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#374151', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}><Download size={16} /> Export</button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', backgroundColor: '#374151', borderRadius: '8px', padding: '3px' }}>
            {['type', 'function'].map(m => <button key={m} onClick={() => setCategoryMode(m)} style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', backgroundColor: categoryMode === m ? '#7c3aed' : 'transparent', color: categoryMode === m ? '#fff' : '#9ca3af' }}>{m === 'type' ? 'Par type' : 'Par fonction'}</button>)}
          </div>
          <div style={{ display: 'flex', backgroundColor: '#374151', borderRadius: '8px', padding: '3px' }}>
            {['category', 'list', 'stats'].map(m => <button key={m} onClick={() => setViewMode(m)} style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', backgroundColor: viewMode === m ? '#7c3aed' : 'transparent', color: viewMode === m ? '#fff' : '#9ca3af' }}>{m === 'category' ? 'Catégories' : m === 'list' ? 'Liste' : 'Stats'}</button>)}
          </div>
        </div>
      </div>

      {/* Commander Card */}
      {commanderCard && (
        <div style={{ ...cardStyle, borderColor: '#fbbf24', borderWidth: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Crown size={20} style={{ color: '#fbbf24' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#fbbf24' }}>Commandant</h3>
            <Lock size={14} style={{ color: '#6b7280', marginLeft: 'auto' }} title="Ne peut pas être retiré" />
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {commanderCard.card_data?.image_uris?.small && <img src={commanderCard.card_data.image_uris.small} alt="" style={{ width: '80px', borderRadius: '8px' }} />}
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>{commanderCard.card_name_fr || commanderCard.card_data?.nom_fr || commanderCard.card_name}</div>
              {(commanderCard.card_name_fr || commanderCard.card_data?.nom_fr) && <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>{commanderCard.card_name}</div>}
              <ManaCost cost={commanderCard.card_data?.mana_cost} />
              <div style={{ marginTop: '8px' }}>{commanderCard.statut === 'en_collection' ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#34d399' }}><Check size={14} /> En collection</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#f59e0b' }}><ShoppingCart size={14} /> À acheter</span>}</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats View */}
      {viewMode === 'stats' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '600', color: '#fff' }}><BarChart3 size={18} style={{ color: '#a78bfa', marginRight: '8px' }} />Courbe de Mana</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '140px', gap: '8px' }}>
              {Object.entries(stats.manaCurve).map(([cost, count]) => {
                const max = Math.max(...Object.values(stats.manaCurve), 1);
                return (
                  <div key={cost} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>{count}</span>
                    <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div style={{ width: '100%', height: `${(count / max) * 100}%`, minHeight: count > 0 ? '4px' : '0', background: 'linear-gradient(to top, #7c3aed, #a78bfa)', borderRadius: '4px 4px 0 0' }} />
                    </div>
                    <div style={{ marginTop: '8px', width: '24px', height: '24px', backgroundColor: '#374151', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#d1d5db' }}>{cost}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '600', color: '#fff' }}>Répartition par Type</h3>
            {Object.entries(stats.typeDistribution).filter(([,c]) => c > 0).sort((a,b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '80px', fontSize: '12px', color: '#d1d5db', textTransform: 'capitalize' }}>{type}</span>
                <div style={{ flex: 1, height: '8px', backgroundColor: '#374151', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / stats.totalCards) * 100}%`, backgroundColor: { creature: '#22c55e', instant: '#3b82f6', sorcery: '#ef4444', artifact: '#9ca3af', enchantment: '#a855f7', planeswalker: '#f59e0b', land: '#10b981' }[type] || '#6b7280', borderRadius: '4px' }} />
                </div>
                <span style={{ width: '24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#fff' }}>{count}</span>
              </div>
            ))}
          </div>
          <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '600', color: '#fff' }}><AlertTriangle size={18} style={{ color: '#fbbf24', marginRight: '8px' }} />Game Changers</h3>
            {gameChangerInfo.cards.length > 0 ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{gameChangerInfo.cards.map(n => <span key={n} style={{ padding: '6px 12px', backgroundColor: '#fbbf2420', color: '#fcd34d', borderRadius: '6px', fontSize: '12px', border: '1px solid #fbbf2440' }}>{n}</span>)}</div> : <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>Aucun Game Changer</p>}
          </div>
        </div>
      )}

      {/* Category View */}
      {viewMode === 'category' && sortedCategories.filter(([cat]) => cat !== 'commander' && cardsByCategory[cat]?.length > 0).map(([cat, info]) => (
        <div key={cat} style={{ backgroundColor: '#1f2937', borderRadius: '10px', border: '1px solid #374151', overflow: 'hidden' }}>
          <button onClick={() => setExpandedCategories(p => ({ ...p, [cat]: !p[cat] }))} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '14px', fontWeight: '500' }}>
            <span>{info.label} <span style={{ color: '#6b7280' }}>({cardsByCategory[cat].length})</span></span>
            {expandedCategories[cat] ? <ChevronUp size={16} style={{ color: '#6b7280' }} /> : <ChevronDown size={16} style={{ color: '#6b7280' }} />}
          </button>
          {expandedCategories[cat] && <div style={{ padding: '0 16px 12px' }}>{cardsByCategory[cat].map(card => <CardRow key={card.id} card={card} onRemove={() => removeCardFromDeck(card.id)} onUpdateQty={(q) => updateQuantity(card.id, q)} canRemove={!card.is_commander} />)}</div>}
        </div>
      ))}

      {/* List View */}
      {viewMode === 'list' && <div style={cardStyle}>{deckCards.filter(c => !c.is_commander).sort((a,b) => a.card_name.localeCompare(b.card_name)).map(card => <CardRow key={card.id} card={card} onRemove={() => removeCardFromDeck(card.id)} onUpdateQty={(q) => updateQuantity(card.id, q)} compact canRemove />)}</div>}

      {/* Modals */}
      {showAddCard && <AddToDeckModal deck={deck} collectionCards={collectionCards} deckCards={deckCards} isOnline={isOnline} onClose={() => setShowAddCard(false)} onAddCard={addCardToDeck} onAddToCollection={onAddToCollection} onReload={reload} />}
      {showSuggestions && <SuggestionsModal suggestions={suggestions} analysis={analysis} loading={loadingSuggestions} collectionCards={collectionCards} deckCards={deckCards} onClose={() => setShowSuggestions(false)} onAddCard={(card) => addCardToDeck(card, collectionCards)} onReload={loadSuggestions} />}
      {showExport && <ExportModal deckCards={deckCards} deckName={deck.nom} onClose={() => setShowExport(false)} />}
      {showImport && <ImportModal deck={deck} collectionCards={collectionCards} isOnline={isOnline} onClose={() => setShowImport(false)} onAddCard={addCardToDeck} onReload={reload} />}
      
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const CardRow = ({ card, onRemove, onUpdateQty, compact, canRemove = true }) => {
  const isBasic = isBasicLand(card.card_name);
  const canChangeQty = isBasic;
  const displayName = card.card_name_fr || card.card_data?.nom_fr || card.card_name;
  // Ne pas afficher "à acheter" pour les terrains de base
  const showToBuy = card.statut === 'a_acheter' && !isBasic;
  const showInCollection = card.statut === 'en_collection' && !isBasic;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', borderLeft: showToBuy ? '2px solid #f59e0b' : 'none' }}>
      {canChangeQty ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button onClick={() => onUpdateQty(card.quantite - 1)} style={{ width: '20px', height: '20px', backgroundColor: '#4b5563', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>-</button>
          <span style={{ width: '20px', textAlign: 'center', fontSize: '12px', color: '#fff' }}>{card.quantite}</span>
          <button onClick={() => onUpdateQty(card.quantite + 1)} style={{ width: '20px', height: '20px', backgroundColor: '#4b5563', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>+</button>
        </div>
      ) : <span style={{ width: '54px', textAlign: 'center', color: '#6b7280', fontSize: '11px' }}>1x</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '13px', fontWeight: '500', color: '#fff', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
        {displayName !== card.card_name && <span style={{ fontSize: '10px', color: '#6b7280', fontStyle: 'italic' }}>{card.card_name}</span>}
      </div>
      {!compact && <ManaCost cost={card.card_data?.mana_cost} />}
      {showToBuy && <ShoppingCart size={12} style={{ color: '#f59e0b' }} />}
      {showInCollection && <Check size={12} style={{ color: '#34d399' }} />}
      {canRemove ? <button onClick={onRemove} style={{ padding: '4px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Trash2 size={14} /></button> : <Lock size={14} style={{ color: '#4b5563' }} />}
    </div>
  );
};

const AddToDeckModal = ({ deck, collectionCards, deckCards, isOnline, onClose, onAddCard, onAddToCollection, onReload }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const colors = deck.couleurs ? deck.couleurs.split('') : [];

  // Recherche Scryfall (même logique que AddCardModal)
  useEffect(() => {
    if (!isOnline || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        // Filtre par couleurs du commandant
        const colorFilter = colors.length > 0 ? `+commander:${colors.join('')}` : '';
        const lowerQuery = query.toLowerCase();
        
        // 3 recherches en parallèle
        const [searchGlobal, searchFR] = await Promise.all([
          fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}${colorFilter}&unique=cards`)
            .then(r => r.ok ? r.json() : { data: [] })
            .catch(() => ({ data: [] })),
          fetch(`https://api.scryfall.com/cards/search?q=lang:fr+${encodeURIComponent(query)}${colorFilter}&unique=cards`)
            .then(r => r.ok ? r.json() : { data: [] })
            .catch(() => ({ data: [] }))
        ]);
        
        // Combiner les résultats
        const seenNames = new Set();
        let combined = [];
        
        // Ajouter FR d'abord
        if (searchFR.data) {
          for (const card of searchFR.data) {
            if (!seenNames.has(card.name) && combined.length < 15) {
              seenNames.add(card.name);
              combined.push(card);
            }
          }
        }
        
        // Puis global
        if (searchGlobal.data) {
          for (const card of searchGlobal.data) {
            if (!seenNames.has(card.name) && combined.length < 15) {
              seenNames.add(card.name);
              combined.push(card);
            }
          }
        }
        
        // Filtrer celles déjà dans le deck (sauf terrains de base)
        const deckNames = deckCards.map(c => c.card_name.toLowerCase());
        combined = combined.filter(c => isBasicLand(c.name) || !deckNames.includes(c.name.toLowerCase()));
        
        // Trier par pertinence
        combined.sort((a, b) => {
          const aFr = (a.printed_name || '').toLowerCase();
          const aEn = (a.name || '').toLowerCase();
          const bFr = (b.printed_name || '').toLowerCase();
          const bEn = (b.name || '').toLowerCase();
          
          // Match FR
          if (aFr.includes(lowerQuery) && !bFr.includes(lowerQuery)) return -1;
          if (bFr.includes(lowerQuery) && !aFr.includes(lowerQuery)) return 1;
          // Exact
          if (aFr === lowerQuery || aEn === lowerQuery) return -1;
          if (bFr === lowerQuery || bEn === lowerQuery) return 1;
          // Starts with
          if (aFr.startsWith(lowerQuery) && !bFr.startsWith(lowerQuery)) return -1;
          if (bFr.startsWith(lowerQuery) && !aFr.startsWith(lowerQuery)) return 1;
          
          return aEn.localeCompare(bEn);
        });
        
        setResults(combined.slice(0, 12));
      } catch (e) { 
        console.error(e); 
        setResults([]);
      }
      setSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, isOnline, colors, deckCards]);

  const handleAdd = async (card, addToCol = false) => {
    const inCol = collectionCards.find(c => c.nom.toLowerCase() === card.name.toLowerCase());
    if (addToCol && !inCol && onAddToCollection) {
      const fr = await getFrenchName(card.name, card.set);
      const prix = card.prices?.eur ? parseFloat(card.prices.eur) : null;
      await onAddToCollection({ 
        nom: card.name, 
        nom_fr: fr || '', 
        couleur: card.colors?.join('') || card.color_identity?.join('') || 'C', 
        type: card.type_line, 
        cout_mana: card.mana_cost || '', 
        extension: card.set, 
        foil: false, 
        exemplaires: 1, 
        langue: 'FR', 
        scryfall_id: card.id,
        prix_eur: prix
      });
      // Recharger les deck_cards pour voir la liaison
      if (onReload) {
        setTimeout(() => onReload(), 500);
      }
    }
    await onAddCard(card, collectionCards);
    setQuery('');
    setResults([]);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
      <div style={{ backgroundColor: '#1f2937', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '450px', maxHeight: '85vh', overflowY: 'auto', border: '1px solid #374151' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#fff' }}>Ajouter au deck</h3>
          <button onClick={onClose} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Recherche */}
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input 
              type="text" 
              placeholder="Rechercher une carte (FR ou EN)..." 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              autoFocus 
              style={{ width: '100%', padding: '14px 14px 14px 42px', backgroundColor: '#374151', border: '1px solid #4b5563', borderRadius: '10px', fontSize: '15px', color: '#fff', outline: 'none' }} 
            />
            {searching && <Loader size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a78bfa', animation: 'spin 1s linear infinite' }} />}
          </div>
          
          {/* Aide */}
          {query.length === 0 && (
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px', margin: 0 }}>
              💡 Tape le nom en français ou en anglais
            </p>
          )}
          
          {/* Résultats avec miniatures */}
          {results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto' }}>
              {results.map(card => {
                const inCol = collectionCards.find(c => c.nom.toLowerCase() === card.name.toLowerCase());
                return (
                  <button
                    key={card.id}
                    onClick={() => handleAdd(card, !inCol)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px',
                      backgroundColor: inCol ? '#05966920' : '#374151',
                      border: inCol ? '1px solid #05966950' : '2px solid transparent',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s'
                    }}
                    onMouseEnter={(e) => { if (!inCol) e.currentTarget.style.borderColor = '#7c3aed'; }}
                    onMouseLeave={(e) => { if (!inCol) e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    {/* Mini image */}
                    <img 
                      src={card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small}
                      alt=""
                      style={{ width: '40px', height: '56px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', color: '#fff', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {card.printed_name || card.name}
                      </div>
                      {card.printed_name && card.printed_name !== card.name && (
                        <div style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>{card.name}</div>
                      )}
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{card.set_name}</div>
                    </div>
                    <ManaCost cost={card.mana_cost} />
                    {inCol && <Check size={16} style={{ color: '#34d399', flexShrink: 0 }} title="En collection" />}
                  </button>
                );
              })}
            </div>
          )}
          
          {/* Pas de résultats */}
          {query.length >= 2 && results.length === 0 && !searching && (
            <p style={{ textAlign: 'center', color: '#f87171', fontSize: '13px', margin: 0 }}>
              Aucune carte trouvée pour "{query}"
            </p>
          )}
          
          {/* Info couleurs */}
          <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>
            Couleurs du deck : <strong style={{ color: '#a78bfa' }}>{deck.couleurs || 'C'}</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

const SuggestionsModal = ({ suggestions, analysis, loading, collectionCards, deckCards, onClose, onAddCard, onReload }) => {
  const [adding, setAdding] = useState({});
  
  const handleAdd = async (cardName) => {
    setAdding(p => ({ ...p, [cardName]: true }));
    try {
      const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`);
      if (res.ok) await onAddCard(await res.json());
    } catch (e) { console.error(e); }
    setAdding(p => ({ ...p, [cardName]: false }));
  };

  const isInCollection = (name) => collectionCards.some(c => c.nom.toLowerCase() === name.toLowerCase());
  const isInDeck = (name) => deckCards.some(c => c.card_name.toLowerCase() === name.toLowerCase());

  // Trier : collection d'abord
  const sortByCollection = (cards) => [...cards].sort((a, b) => {
    const aCol = isInCollection(a.name);
    const bCol = isInCollection(b.name);
    if (aCol && !bCol) return -1;
    if (!aCol && bCol) return 1;
    return (b.inclusion || 0) - (a.inclusion || 0);
  });

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
      <div style={{ backgroundColor: '#1f2937', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', border: '1px solid #374151' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#fff' }}>Suggestions EDHREC</h3>
          <button onClick={onClose} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px' }}><RefreshCw size={24} style={{ color: '#7c3aed', animation: 'spin 1s linear infinite' }} /><p style={{ color: '#6b7280', marginTop: '8px' }}>Chargement...</p></div>
        ) : suggestions ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {suggestions.link && <a href={suggestions.link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a78bfa', fontSize: '12px' }}><ExternalLink size={12} /> Voir sur EDHREC</a>}
            
            {analysis?.missing?.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#fbbf24' }}>⚠️ Staples manquantes</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {sortByCollection(analysis.missing).slice(0, 8).filter(c => !isInDeck(c.name)).map(c => <SuggestionCard key={c.name} card={c} onAdd={() => handleAdd(c.name)} adding={adding[c.name]} inCollection={isInCollection(c.name)} />)}
                </div>
              </div>
            )}
            
            {analysis?.toConsider?.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#a78bfa' }}>💡 Haute synergie</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {sortByCollection(analysis.toConsider).slice(0, 6).filter(c => !isInDeck(c.name)).map(c => <SuggestionCard key={c.name} card={c} onAdd={() => handleAdd(c.name)} adding={adding[c.name]} inCollection={isInCollection(c.name)} />)}
                </div>
              </div>
            )}
            
            {suggestions.topCards?.length > 0 && !analysis?.missing?.length && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#34d399' }}>🔥 Cartes populaires</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {sortByCollection(suggestions.topCards).slice(0, 8).filter(c => !isInDeck(c.name)).map(c => <SuggestionCard key={c.name} card={c} onAdd={() => handleAdd(c.name)} adding={adding[c.name]} inCollection={isInCollection(c.name)} />)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <p style={{ color: '#6b7280' }}>Impossible de charger les suggestions.</p>
            <button onClick={onReload} style={{ marginTop: '12px', padding: '10px 16px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer' }}><RefreshCw size={14} /> Réessayer</button>
          </div>
        )}
      </div>
    </div>
  );
};

const SuggestionCard = ({ card, onAdd, adding, inCollection }) => {
  const [imageUrl, setImageUrl] = useState(null);
  
  useEffect(() => {
    fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=json`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setImageUrl(d?.image_uris?.small || d?.card_faces?.[0]?.image_uris?.small))
      .catch(() => {});
  }, [card.name]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: inCollection ? '#05966920' : '#374151', borderRadius: '8px', border: inCollection ? '1px solid #05966950' : 'none' }}>
      {imageUrl ? <img src={imageUrl} alt="" style={{ width: '40px', height: '56px', borderRadius: '4px', objectFit: 'cover' }} /> : <div style={{ width: '40px', height: '56px', backgroundColor: '#4b5563', borderRadius: '4px' }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
          {card.inclusion ? `${Math.round(card.inclusion)}%` : ''} {card.synergy > 0 && `• Syn ${Math.round(card.synergy * 100)}%`}
        </div>
        {inCollection && <div style={{ fontSize: '10px', color: '#34d399' }}>✓ En collection</div>}
      </div>
      <button onClick={onAdd} disabled={adding} style={{ padding: '6px', backgroundColor: adding ? '#4b5563' : '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
        {adding ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
      </button>
    </div>
  );
};

// ============ EXPORT MODAL ============
const ExportModal = ({ deckCards, deckName, onClose }) => {
  const [exportType, setExportType] = useState('all'); // 'all' ou 'missing'
  const [copied, setCopied] = useState(false);
  
  const generateExportList = () => {
    let cards = deckCards;
    
    if (exportType === 'missing') {
      // Seulement les cartes à acheter (hors terrains de base)
      cards = deckCards.filter(c => c.statut === 'a_acheter' && !isBasicLand(c.card_name));
    }
    
    // Format: "1 Card Name" ou "2 Card Name" pour les terrains
    return cards
      .map(c => `${c.quantite || 1} ${c.card_name}`)
      .sort()
      .join('\n');
  };
  
  const exportList = generateExportList();
  const cardCount = exportList.split('\n').filter(l => l.trim()).length;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportList);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const downloadFile = () => {
    const blob = new Blob([exportList], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deckName.replace(/[^a-z0-9]/gi, '_')}_${exportType === 'missing' ? 'manquantes' : 'complet'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
      <div style={{ backgroundColor: '#1f2937', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid #374151' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#fff' }}>📤 Exporter le deck</h2>
          <button onClick={onClose} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
        </div>
        
        {/* Type d'export */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setExportType('all')}
            style={{
              flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer',
              backgroundColor: exportType === 'all' ? '#7c3aed' : '#374151',
              color: exportType === 'all' ? '#fff' : '#9ca3af',
              fontSize: '13px', fontWeight: '500'
            }}
          >
            📋 Liste complète
          </button>
          <button
            onClick={() => setExportType('missing')}
            style={{
              flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer',
              backgroundColor: exportType === 'missing' ? '#f59e0b' : '#374151',
              color: exportType === 'missing' ? '#fff' : '#9ca3af',
              fontSize: '13px', fontWeight: '500'
            }}
          >
            🛒 Cartes manquantes
          </button>
        </div>
        
        {/* Aperçu */}
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
          {cardCount} carte(s) {exportType === 'missing' ? 'à acheter' : 'au total'}
        </div>
        
        <textarea
          readOnly
          value={exportList}
          style={{
            flex: 1, minHeight: '200px', padding: '12px', backgroundColor: '#374151', border: '1px solid #4b5563',
            borderRadius: '10px', fontSize: '13px', color: '#fff', resize: 'none', fontFamily: 'monospace'
          }}
        />
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button
            onClick={copyToClipboard}
            style={{
              flex: 1, padding: '12px', backgroundColor: copied ? '#059669' : '#374151', color: '#fff',
              border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {copied ? <><Check size={16} /> Copié !</> : <><Copy size={16} /> Copier</>}
          </button>
          <button
            onClick={downloadFile}
            style={{
              flex: 1, padding: '12px', backgroundColor: '#7c3aed', color: '#fff',
              border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <Download size={16} /> Télécharger
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ IMPORT MODAL ============
const ImportModal = ({ deck, collectionCards, isOnline, onClose, onAddCard, onReload }) => {
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  
  const parseList = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  const cards = [];
  
  for (const line of lines) {
    const match = line.trim().match(/^(\d+)?x?\s*(.+)$/i);
    if (match) {
      const qty = parseInt(match[1]) || 1;
      let name = match[2].trim();
      
      // Supprimer les annotations entre parenthèses (Commander), (Partner), etc.
      name = name.replace(/\s*\([^)]*\)\s*/g, '').trim();
      
      // Garder seulement la première face pour les double-faces
      name = name.split('//')[0].trim();
      
      if (name) {
        cards.push({ name, qty });
      }
    }
  }
  
  return cards;
};
  
const handleImport = async () => {
  const cards = parseList(importText);
  if (cards.length === 0) return;

  const existingNames = deck.cards?.map(c => c.card_name?.toLowerCase()) || [];
  const newCards = cards.filter(c => !existingNames.includes(c.name.toLowerCase()));

  if (newCards.length === 0) return;

  setImporting(true);
  setResults({ total: newCards.length, success: 0, failed: [] });

  // Étape 1 : récupérer toutes les données Scryfall en batch
  const allFound = [];
  const allFailed = [];

  const batchSize = 75;
  for (let i = 0; i < newCards.length; i += batchSize) {
    const batch = newCards.slice(i, i + batchSize);
    const response = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: batch.map(c => ({ name: c.name })) })
    });

    if (response.ok) {
      const data = await response.json();
      for (const cardData of data.data) {
        const card = batch.find(c => c.name.toLowerCase() === cardData.name.toLowerCase())
          || batch.find(c => cardData.name.toLowerCase().includes(c.name.toLowerCase()));
        allFound.push({ cardData, qty: card?.qty || 1 });
      }
      for (const nf of data.not_found) {
        allFailed.push(nf.name);
      }
    }

    // Petit délai entre les batch Scryfall
    if (i + batchSize < newCards.length) {
      await new Promise(r => setTimeout(r, 200));
    }
    console.log(`Batch ${i/batchSize + 1}: cartes ${i+1} à ${Math.min(i+batchSize, newCards.length)}`);
    const batch = newCards.slice(i, i + batchSize);
  }

  // Étape 2 : insérer en base
  for (const { cardData, qty } of allFound) {
    await onAddCard({
      name: cardData.name,
      mana_cost: cardData.mana_cost,
      cmc: cardData.cmc,
      type_line: cardData.type_line,
      colors: cardData.colors,
      color_identity: cardData.color_identity,
      oracle_text: cardData.oracle_text,
      image_uris: cardData.image_uris,
      set: cardData.set,
      set_name: cardData.set_name
    }, collectionCards, qty);
    setResults(r => ({ ...r, success: r.success + 1 }));
  }

  setResults(r => ({ ...r, failed: allFailed }));
  setImporting(false);
  onReload();
};
  
  const cardCount = parseList(importText).length;
  
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
      <div style={{ backgroundColor: '#1f2937', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid #374151' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#fff' }}>📥 Importer des cartes</h2>
          <button onClick={onClose} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
        </div>
        
        {!results ? (
          <>
            <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 12px' }}>
              Colle ta liste de cartes (format: "1 Sol Ring" ou "1x Sol Ring")
            </p>
            
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"1 Sol Ring\n1 Arcane Signet\n1 Command Tower\n..."}
              style={{
                flex: 1, minHeight: '200px', padding: '12px', backgroundColor: '#374151', border: '1px solid #4b5563',
                borderRadius: '10px', fontSize: '13px', color: '#fff', resize: 'none', fontFamily: 'monospace'
              }}
            />
            
            <div style={{ fontSize: '12px', color: '#6b7280', margin: '8px 0' }}>
              {cardCount} carte(s) détectée(s)
            </div>
            
            <button
              onClick={handleImport}
              disabled={cardCount === 0 || importing}
              style={{
                padding: '14px', backgroundColor: cardCount > 0 ? '#059669' : '#374151', color: '#fff',
                border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: cardCount > 0 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                opacity: cardCount > 0 ? 1 : 0.5
              }}
            >
              {importing ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Import en cours...</> : <><Upload size={16} /> Importer {cardCount} carte(s)</>}
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              {importing ? (
                <>
                  <RefreshCw size={40} style={{ color: '#7c3aed', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                  <p style={{ color: '#fff', fontSize: '16px', margin: 0 }}>Import en cours...</p>
                  <p style={{ color: '#9ca3af', fontSize: '14px', margin: '8px 0 0' }}>{results.success} / {results.total}</p>
                </>
              ) : (
                <>
                  <Check size={40} style={{ color: '#34d399', marginBottom: '16px' }} />
                  <p style={{ color: '#fff', fontSize: '16px', margin: 0 }}>Import terminé !</p>
                  <p style={{ color: '#34d399', fontSize: '14px', margin: '8px 0 0' }}>{results.success} carte(s) ajoutée(s)</p>
                  {results.failed.length > 0 && (
                    <div style={{ marginTop: '16px', textAlign: 'left' }}>
                      <p style={{ color: '#f87171', fontSize: '13px', margin: '0 0 8px' }}>❌ {results.failed.length} carte(s) non trouvée(s) :</p>
                      <div style={{ backgroundColor: '#374151', borderRadius: '8px', padding: '10px', maxHeight: '100px', overflowY: 'auto' }}>
                        {results.failed.map((name, i) => (
                          <div key={i} style={{ color: '#9ca3af', fontSize: '12px' }}>{name}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {!importing && (
              <button
                onClick={onClose}
                style={{
                  padding: '14px', backgroundColor: '#7c3aed', color: '#fff',
                  border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Fermer
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DeckView;
