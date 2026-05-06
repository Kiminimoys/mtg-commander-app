/**
 * AddCardModal - Modal d'ajout de carte à la collection
 * Recherche unifiée FR/EN sans scanner
 */
import React, { useState, useEffect } from 'react';
import { X, Search, WifiOff, Loader, Check } from 'lucide-react';
import { getFrenchName } from '../services/cardNameService';
import ManaCost from './ManaCost';

const AddCardModal = ({ show, onClose, onAdd, extensions, isOnline = true }) => {
  const [newCard, setNewCard] = useState({
    nom: '', nom_fr: '', couleur: '', type: '', cout_mana: '', extension: '', foil: false, exemplaires: 1, langue: 'FR', scryfall_id: '', prix_eur: null
  });
  const [scryfallResults, setScryfallResults] = useState([]);
  const [scryfallQuery, setScryfallQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [cardImage, setCardImage] = useState(null);
  const [availablePrints, setAvailablePrints] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!show) {
      resetForm();
    }
  }, [show]);

  const resetForm = () => {
    setNewCard({
      nom: '', nom_fr: '', couleur: '', type: '', cout_mana: '', extension: '', foil: false, exemplaires: 1, langue: 'FR', scryfall_id: '', prix_eur: null
    });
    setScryfallResults([]);
    setScryfallQuery('');
    setSelectedCard(null);
    setCardImage(null);
    setAvailablePrints([]);
  };

  // Recherche Scryfall améliorée (recherche FR + EN en parallèle)
  useEffect(() => {
    if (!isOnline) return;
    const timer = setTimeout(() => {
      if (scryfallQuery.length >= 2) {
        searchScryfall(scryfallQuery);
      } else {
        setScryfallResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [scryfallQuery, isOnline]);

  const searchScryfall = async (query) => {
    setSearching(true);
    try {
      const lowerQuery = query.toLowerCase();
      
      // Lancer 3 recherches en parallèle pour maximiser les chances
      const [searchGlobal, searchFR, autocomplete] = await Promise.all([
        // 1. Search global (trouve EN et parfois FR)
        fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=cards`)
          .then(r => r.ok ? r.json() : { data: [] })
          .catch(() => ({ data: [] })),
        // 2. Search spécifique FR (cherche dans printed_name)
        fetch(`https://api.scryfall.com/cards/search?q=lang:fr+${encodeURIComponent(query)}&unique=cards`)
          .then(r => r.ok ? r.json() : { data: [] })
          .catch(() => ({ data: [] })),
        // 3. Autocomplete EN (très rapide)
        fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`)
          .then(r => r.ok ? r.json() : { data: [] })
          .catch(() => ({ data: [] }))
      ]);
      
      // Combiner les résultats sans doublons
      const seenNames = new Set();
      let results = [];
      
      // Ajouter les résultats FR d'abord (priorité)
      if (searchFR.data) {
        for (const card of searchFR.data) {
          if (!seenNames.has(card.name) && results.length < 15) {
            seenNames.add(card.name);
            results.push(card);
          }
        }
      }
      
      // Ajouter les résultats globaux
      if (searchGlobal.data) {
        for (const card of searchGlobal.data) {
          if (!seenNames.has(card.name) && results.length < 15) {
            seenNames.add(card.name);
            results.push(card);
          }
        }
      }
      
      // Trier par pertinence
      results.sort((a, b) => {
        const aFr = (a.printed_name || '').toLowerCase();
        const aEn = (a.name || '').toLowerCase();
        const bFr = (b.printed_name || '').toLowerCase();
        const bEn = (b.name || '').toLowerCase();
        
        // Contient la query dans le nom FR ?
        const aMatchFr = aFr.includes(lowerQuery);
        const bMatchFr = bFr.includes(lowerQuery);
        if (aMatchFr && !bMatchFr) return -1;
        if (bMatchFr && !aMatchFr) return 1;
        
        // Match exact FR
        if (aFr === lowerQuery && bFr !== lowerQuery) return -1;
        if (bFr === lowerQuery && aFr !== lowerQuery) return 1;
        // Match exact EN
        if (aEn === lowerQuery && bEn !== lowerQuery) return -1;
        if (bEn === lowerQuery && aEn !== lowerQuery) return 1;
        // Starts with FR
        if (aFr.startsWith(lowerQuery) && !bFr.startsWith(lowerQuery)) return -1;
        if (bFr.startsWith(lowerQuery) && !aFr.startsWith(lowerQuery)) return 1;
        // Starts with EN
        if (aEn.startsWith(lowerQuery) && !bEn.startsWith(lowerQuery)) return -1;
        if (bEn.startsWith(lowerQuery) && !aEn.startsWith(lowerQuery)) return 1;
        
        return aEn.localeCompare(bEn);
      });
      
      setScryfallResults(results.slice(0, 12));
    } catch (error) {
      console.error('Erreur recherche:', error);
      setScryfallResults([]);
    }
    setSearching(false);
  };

  const selectScryfallCard = async (card) => {
    const colors = card.colors ? card.colors.join('') : (card.color_identity?.join('') || 'C');
    setSelectedCard(card);
    
    // Récupérer le nom français
    let frenchName = card.printed_name || null;
    if (!frenchName && isOnline) {
      try {
        frenchName = await getFrenchName(card.name, card.set);
      } catch {}
    }
    
    const prix = card.prices?.eur ? parseFloat(card.prices.eur) : null;
    const prixFoil = card.prices?.eur_foil ? parseFloat(card.prices.eur_foil) : null;
    
    setNewCard({
      ...newCard,
      nom: card.name,
      nom_fr: frenchName || '',
      couleur: colors,
      type: card.type_line,
      cout_mana: card.mana_cost || '',
      extension: card.set,
      scryfall_id: card.id,
      prix_eur: prix,
      prix_eur_foil: prixFoil
    });
    
    setCardImage(card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null);
    
    // Charger les autres éditions
    if (isOnline) {
      try {
        const response = await fetch(`https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(card.name)}"&unique=prints`);
        const data = await response.json();
        if (data.data) setAvailablePrints(data.data);
      } catch {}
    }
    
    setScryfallResults([]);
    setScryfallQuery('');
  };

  const handleExtensionChange = async (setCode) => {
    setNewCard({ ...newCard, extension: setCode });
    
    if (selectedCard && isOnline) {
      try {
        const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(selectedCard.name)}&set=${setCode}`);
        if (response.ok) {
          const data = await response.json();
          setCardImage(data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || null);
          const prix = data.prices?.eur ? parseFloat(data.prices.eur) : null;
          const prixFoil = data.prices?.eur_foil ? parseFloat(data.prices.eur_foil) : null;
          setNewCard(prev => ({ ...prev, prix_eur: prix, prix_eur_foil: prixFoil }));
        }
      } catch {}
    }
  };

  const handleAdd = () => {
    if (!newCard.nom) return;
    const finalCard = {
      ...newCard,
      prix_eur: newCard.foil ? (newCard.prix_eur_foil || newCard.prix_eur) : newCard.prix_eur
    };
    delete finalCard.prix_eur_foil;
    onAdd(finalCard);
    resetForm();
  };

  if (!show) return null;

  const inputStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#374151',
    border: '1px solid #4b5563',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#fff',
    outline: 'none'
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#1f2937',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '450px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid #374151'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#fff' }}>
            Ajouter une carte
          </h2>
          <button onClick={onClose} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
            <X size={20} />
          </button>
        </div>

        {!selectedCard ? (
          /* ========== MODE RECHERCHE ========== */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Search input */}
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
              <input
                type="text"
                value={scryfallQuery}
                onChange={(e) => setScryfallQuery(e.target.value)}
                placeholder="Rechercher une carte (FR ou EN)..."
                style={{ ...inputStyle, paddingLeft: '40px', fontSize: '16px' }}
                disabled={!isOnline}
                autoFocus
              />
              {searching && (
                <Loader size={18} style={{ 
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  color: '#a78bfa', animation: 'spin 1s linear infinite'
                }} />
              )}
            </div>
            
            {/* Aide */}
            {scryfallQuery.length === 0 && (
              <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px', margin: 0 }}>
                💡 Tape le nom en français ou en anglais
              </p>
            )}
            
            {/* Results avec images */}
            {scryfallResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto' }}>
                {scryfallResults.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => selectScryfallCard(card)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px',
                      backgroundColor: '#374151',
                      border: '2px solid transparent',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#7c3aed'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                  >
                    {/* Mini image */}
                    <img 
                      src={card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small}
                      alt=""
                      style={{ 
                        width: '40px', 
                        height: '56px', 
                        borderRadius: '4px',
                        objectFit: 'cover',
                        flexShrink: 0
                      }}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#fff', 
                        fontSize: '14px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {card.printed_name || card.name}
                      </div>
                      {card.printed_name && card.printed_name !== card.name && (
                        <div style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
                          {card.name}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        {card.set_name}
                      </div>
                    </div>
                    <ManaCost cost={card.mana_cost} />
                  </button>
                ))}
              </div>
            )}
            
            {/* No results */}
            {scryfallQuery.length >= 2 && scryfallResults.length === 0 && !searching && (
              <p style={{ textAlign: 'center', color: '#f87171', fontSize: '13px', margin: 0 }}>
                Aucune carte trouvée pour "{scryfallQuery}"
              </p>
            )}
            
            {!isOnline && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: '#78350f30', borderRadius: '8px' }}>
                <WifiOff size={18} style={{ color: '#fbbf24' }} />
                <span style={{ color: '#fbbf24', fontSize: '13px' }}>Mode hors-ligne - recherche indisponible</span>
              </div>
            )}
          </div>
        ) : (
          /* ========== MODE ÉDITION ========== */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Card preview */}
            <div style={{ display: 'flex', gap: '16px' }}>
              {cardImage && (
                <img src={cardImage} alt={newCard.nom} style={{ width: '120px', borderRadius: '8px' }} />
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '600', color: '#fff' }}>
                  {newCard.nom_fr || newCard.nom}
                </h3>
                {newCard.nom_fr && newCard.nom_fr !== newCard.nom && (
                  <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                    {newCard.nom}
                  </p>
                )}
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>{newCard.type}</p>
                <div style={{ marginTop: '8px' }}>
                  <ManaCost cost={newCard.cout_mana} />
                </div>
                {newCard.prix_eur && (
                  <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#34d399', fontWeight: '600' }}>
                    {newCard.prix_eur.toFixed(2)}€
                  </p>
                )}
              </div>
            </div>
            
            {/* Extension selector */}
            {availablePrints.length > 1 && (
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#9ca3af' }}>Extension</label>
                <select
                  value={newCard.extension}
                  onChange={(e) => handleExtensionChange(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {availablePrints.map((print) => (
                    <option key={print.id} value={print.set}>
                      {print.set_name} ({print.set.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#9ca3af' }}>Langue carte</label>
                <select
                  value={newCard.langue}
                  onChange={(e) => setNewCard({ ...newCard, langue: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="FR">🇫🇷 Français</option>
                  <option value="EN">🇬🇧 English</option>
                  <option value="DE">🇩🇪 Deutsch</option>
                  <option value="ES">🇪🇸 Español</option>
                  <option value="IT">🇮🇹 Italiano</option>
                  <option value="JP">🇯🇵 日本語</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#9ca3af' }}>Exemplaires</label>
                <input
                  type="number"
                  min="1"
                  value={newCard.exemplaires}
                  onChange={(e) => setNewCard({ ...newCard, exemplaires: parseInt(e.target.value) || 1 })}
                  style={{ ...inputStyle, textAlign: 'center' }}
                />
              </div>
            </div>
            
            {/* Foil toggle */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              backgroundColor: newCard.foil ? '#7c3aed20' : '#374151',
              borderRadius: '10px',
              cursor: 'pointer',
              border: newCard.foil ? '1px solid #7c3aed' : '1px solid transparent'
            }}>
              <input
                type="checkbox"
                checked={newCard.foil}
                onChange={(e) => setNewCard({ ...newCard, foil: e.target.checked })}
                style={{ display: 'none' }}
              />
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                backgroundColor: newCard.foil ? '#7c3aed' : '#4b5563',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {newCard.foil && <Check size={14} style={{ color: '#fff' }} />}
              </div>
              <span style={{ color: '#fff', fontSize: '14px' }}>✨ Version Foil</span>
            </label>
            
            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={() => { setSelectedCard(null); setCardImage(null); setAvailablePrints([]); }}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: '#374151',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ← Retour
              </button>
              <button
                onClick={handleAdd}
                style={{
                  flex: 2,
                  padding: '14px',
                  backgroundColor: '#059669',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Ajouter à la collection
              </button>
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AddCardModal;
