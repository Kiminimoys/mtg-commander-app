/**
 * EditCardModal - Modal de modification d'une carte
 * Permet de changer l'extension, la langue, la quantité et le statut foil
 */
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const EditCardModal = ({ show, card, onClose, onSave, extensions, isOnline = true }) => {
  const [editingCard, setEditingCard] = useState(null);
  const [cardImage, setCardImage] = useState(null);
  const [availablePrints, setAvailablePrints] = useState([]);

  useEffect(() => {
    if (card) {
      setEditingCard({ ...card });
      loadAvailablePrints(card.nom);
      fetchCardImage(card.nom, card.extension);
    }
  }, [card]);

  const loadAvailablePrints = async (cardName) => {
    if (!isOnline) return;
    try {
      const response = await fetch(`https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(cardName)}"&unique=prints`);
      const data = await response.json();
      if (data.data) {
        setAvailablePrints(data.data);
      }
    } catch (error) {
      console.error('Erreur chargement impressions:', error);
      setAvailablePrints([]);
    }
  };

  const fetchCardImage = async (cardName, setCode) => {
    if (!isOnline) {
      setCardImage(null);
      return;
    }
    try {
      const url = setCode 
        ? `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}&set=${setCode}`
        : `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCardImage(data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || null);
      } else {
        setCardImage(null);
      }
    } catch (error) {
      console.error('Erreur chargement image:', error);
      setCardImage(null);
    }
  };

  const handleSave = () => {
    if (!editingCard) return;
    onSave(editingCard);
  };

  const handleClose = () => {
    setEditingCard(null);
    setCardImage(null);
    setAvailablePrints([]);
    onClose();
  };

  if (!show || !editingCard) return null;

  // Styles
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
        maxWidth: '400px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid #374151'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#a78bfa' }}>
            {editingCard.nom}
          </h2>
          <button 
            onClick={handleClose}
            style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Card Image */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          {cardImage ? (
            <img 
              src={cardImage} 
              alt={editingCard.nom}
              style={{ width: '180px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
            />
          ) : (
            <div style={{
              width: '180px',
              height: '252px',
              backgroundColor: '#374151',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280'
            }}>
              Pas d'image
            </div>
          )}
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Extension */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>Extension</label>
            <select
              value={editingCard.extension || ''}
              onChange={(e) => {
                setEditingCard({ ...editingCard, extension: e.target.value });
                fetchCardImage(editingCard.nom, e.target.value);
              }}
              style={inputStyle}
            >
              <option value="">Sélectionner une extension</option>
              {availablePrints.length > 0 ? (
                availablePrints.map(print => (
                  <option key={print.id} value={print.set}>
                    {print.set_name} ({print.set.toUpperCase()})
                  </option>
                ))
              ) : (
                extensions.map(ext => (
                  <option key={ext.code} value={ext.code}>
                    {ext.name} ({ext.code.toUpperCase()})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Langue */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>Langue</label>
            <select
              value={editingCard.langue || 'FR'}
              onChange={(e) => setEditingCard({ ...editingCard, langue: e.target.value })}
              style={inputStyle}
            >
              <option value="FR">🇫🇷 Français</option>
              <option value="EN">🇬🇧 English</option>
              <option value="DE">🇩🇪 Deutsch</option>
              <option value="ES">🇪🇸 Español</option>
              <option value="IT">🇮🇹 Italiano</option>
              <option value="PT">🇵🇹 Português</option>
              <option value="JA">🇯🇵 日本語</option>
              <option value="KO">🇰🇷 한국어</option>
              <option value="RU">🇷🇺 Русский</option>
              <option value="ZH">🇨🇳 中文</option>
            </select>
          </div>

          {/* Quantité */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>Quantité</label>
            <input
              type="number"
              min="1"
              value={editingCard.exemplaires || 1}
              onChange={(e) => setEditingCard({ ...editingCard, exemplaires: parseInt(e.target.value) || 1 })}
              style={{ ...inputStyle, textAlign: 'center' }}
            />
          </div>

          {/* Foil */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editingCard.foil || false}
                onChange={(e) => setEditingCard({ ...editingCard, foil: e.target.checked })}
                style={{ width: '20px', height: '20px', accentColor: '#7c3aed' }}
              />
              <span style={{ fontSize: '15px', color: '#fff' }}>✨ Version Foil</span>
            </label>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={handleClose}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#374151',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCardModal;
