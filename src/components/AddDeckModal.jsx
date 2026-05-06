/**
 * AddDeckModal - Création d'un nouveau deck Commander
 * Le commandant est automatiquement ajouté au deck à la création
 */
import React, { useState, useEffect } from 'react';
import { X, Search, Loader } from 'lucide-react';
import ManaCost from './ManaCost';

const AddDeckModal = ({ show, onClose, onAdd, isOnline = true }) => {
  const [newDeck, setNewDeck] = useState({ nom: '', commander: '', couleurs: '' });
  const [commanderQuery, setCommanderQuery] = useState('');
  const [commanderResults, setCommanderResults] = useState([]);
  const [selectedCommander, setSelectedCommander] = useState(null);
  const [commanderImage, setCommanderImage] = useState(null);
  const [searchLang, setSearchLang] = useState('fr');
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!show) resetForm();
  }, [show]);

  const resetForm = () => {
    setNewDeck({ nom: '', commander: '', couleurs: '' });
    setCommanderQuery('');
    setCommanderResults([]);
    setSelectedCommander(null);
    setCommanderImage(null);
    setCreating(false);
  };

  useEffect(() => {
    if (!isOnline || commanderQuery.length < 2) { setCommanderResults([]); return; }
    const timer = setTimeout(() => searchCommanders(), 500);
    return () => clearTimeout(timer);
  }, [commanderQuery, searchLang, isOnline]);

  const searchCommanders = async () => {
    setSearching(true);
    try {
      let searchQuery;
      if (searchLang === 'fr') {
        searchQuery = `(name:${encodeURIComponent(commanderQuery)} OR printed_name:${encodeURIComponent(commanderQuery)})+is:commander+lang:fr`;
      } else {
        searchQuery = `name:${encodeURIComponent(commanderQuery)}+is:commander+lang:en`;
      }
      
      const response = await fetch(`https://api.scryfall.com/cards/search?q=${searchQuery}&order=name&unique=cards`);
      const data = await response.json();
      
      if (data.data) {
        const normalizedQuery = commanderQuery.toLowerCase();
        const sorted = data.data.sort((a, b) => {
          const aName = (a.printed_name || a.name).toLowerCase();
          const bName = (b.printed_name || b.name).toLowerCase();
          if (aName.startsWith(normalizedQuery) && !bName.startsWith(normalizedQuery)) return -1;
          if (!aName.startsWith(normalizedQuery) && bName.startsWith(normalizedQuery)) return 1;
          return aName.localeCompare(bName);
        });
        setCommanderResults(sorted.slice(0, 10));
      }
    } catch (e) { console.error(e); }
    setSearching(false);
  };

  const selectCommander = (card) => {
    setSelectedCommander(card);
    const colors = card.color_identity ? card.color_identity.join('') : 'C';
    setNewDeck({ ...newDeck, commander: card.name, couleurs: colors });
    setCommanderImage(card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null);
    setCommanderResults([]);
    setCommanderQuery('');
  };

  const handleAdd = async () => {
    if (!newDeck.nom || !newDeck.commander) return;
    setCreating(true);
    await onAdd(newDeck, selectedCommander);
    resetForm();
  };

  if (!show) return null;

  const inputStyle = { width: '100%', padding: '12px', backgroundColor: '#374151', border: '1px solid #4b5563', borderRadius: '10px', fontSize: '14px', color: '#fff', outline: 'none' };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
      <div style={{ backgroundColor: '#1f2937', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #374151' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#fff' }}>Nouveau Deck Commander</h2>
          <button onClick={() => { resetForm(); onClose(); }} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Deck name */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>Nom du deck</label>
            <input type="text" placeholder="Ex: Dragon Tribal, Elfball..." value={newDeck.nom} onChange={(e) => setNewDeck({ ...newDeck, nom: e.target.value })} style={inputStyle} />
          </div>

          {/* Commander search */}
          {!selectedCommander ? (
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>
                Rechercher un Commander
                {!isOnline && <span style={{ color: '#fbbf24', marginLeft: '8px' }}>(hors-ligne)</span>}
              </label>
              
              {/* Language selector */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {[{ v: 'fr', l: '🇫🇷 Français' }, { v: 'en', l: '🇬🇧 English' }].map(o => (
                  <button key={o.v} onClick={() => setSearchLang(o.v)} style={{
                    flex: 1, padding: '10px', backgroundColor: searchLang === o.v ? '#7c3aed' : '#374151',
                    color: searchLang === o.v ? '#fff' : '#9ca3af', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
                  }}>{o.l}</button>
                ))}
              </div>
              
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                <input type="text" placeholder={isOnline ? "Nom du commander..." : "Saisir le nom"} value={commanderQuery} onChange={(e) => setCommanderQuery(e.target.value)} disabled={!isOnline} style={{ ...inputStyle, paddingLeft: '38px', opacity: isOnline ? 1 : 0.5 }} />
                {searching && <Loader size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a78bfa', animation: 'spin 1s linear infinite' }} />}
              </div>
              
              {/* Results */}
              {commanderResults.length > 0 && (
                <div style={{ backgroundColor: '#374151', borderRadius: '10px', maxHeight: '250px', overflowY: 'auto', marginTop: '8px', border: '1px solid #4b5563' }}>
                  {commanderResults.map(card => (
                    <button key={card.id} onClick={() => selectCommander(card)} style={{
                      width: '100%', padding: '10px 12px', backgroundColor: 'transparent', border: 'none',
                      borderBottom: '1px solid #4b5563', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left'
                    }}>
                      {card.image_uris?.small && <img src={card.image_uris.small} alt="" style={{ width: '36px', height: '50px', borderRadius: '4px', objectFit: 'cover' }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>{card.printed_name || card.name}</div>
                        {card.printed_name && card.printed_name !== card.name && <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>{card.name}</div>}
                        <div style={{ fontSize: '11px', color: '#a78bfa' }}>Couleurs: {card.color_identity?.join('') || 'C'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Manual entry */}
              {!isOnline && (
                <input type="text" placeholder="Nom du commander" value={newDeck.commander} onChange={(e) => setNewDeck({ ...newDeck, commander: e.target.value })} style={{ ...inputStyle, marginTop: '8px' }} />
              )}
            </div>
          ) : (
            /* Selected commander */
            <div style={{ backgroundColor: '#374151', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                {commanderImage && <img src={commanderImage} alt="" style={{ width: '100px', borderRadius: '8px' }} />}
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#a78bfa' }}>{selectedCommander.printed_name || selectedCommander.name}</h3>
                  {selectedCommander.printed_name && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>{selectedCommander.name}</p>}
                  <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#9ca3af' }}>{selectedCommander.type_line}</p>
                  <div style={{ marginTop: '8px' }}><ManaCost cost={selectedCommander.mana_cost} /></div>
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#d1d5db' }}>Couleurs: <strong>{newDeck.couleurs || 'C'}</strong></p>
                  <button onClick={() => { setSelectedCommander(null); setCommanderImage(null); setNewDeck({ ...newDeck, commander: '', couleurs: '' }); }}
                    style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#4b5563', color: '#d1d5db', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    Changer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Colors */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>
              Identité de couleur <span style={{ color: '#6b7280' }}>(auto)</span>
            </label>
            <input type="text" placeholder="WUBRG" value={newDeck.couleurs} onChange={(e) => setNewDeck({ ...newDeck, couleurs: e.target.value.toUpperCase() })} style={inputStyle} />
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6b7280' }}>W=Blanc, U=Bleu, B=Noir, R=Rouge, G=Vert</p>
          </div>

          {/* Create button */}
          <button onClick={handleAdd} disabled={!newDeck.nom || !newDeck.commander || creating} style={{
            width: '100%', padding: '14px', backgroundColor: '#059669', color: '#fff',
            border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
            opacity: (!newDeck.nom || !newDeck.commander || creating) ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}>
            {creating ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Création...</> : 'Créer le deck'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AddDeckModal;
