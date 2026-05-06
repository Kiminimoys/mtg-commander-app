import React from 'react';
import { Edit2, Trash2, CloudOff } from 'lucide-react';
import ManaCost from './ManaCost';
import FlagIcon from './FlagIcon';

// Vérifier si c'est un terrain de base
const isBasicLand = (cardName) => {
  const basics = ['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes',
    'plaine', 'île', 'marais', 'montagne', 'forêt', 'lande'];
  return basics.some(b => cardName?.toLowerCase().includes(b));
};

const CardTable = ({ cards, extensions, onEdit, onDelete }) => {
  if (cards.length === 0) {
    return (
      <div style={{
        backgroundColor: '#1f2937',
        borderRadius: '12px',
        padding: '48px',
        textAlign: 'center',
        border: '1px solid #374151'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#d1d5db', marginBottom: '8px' }}>Collection vide</h3>
        <p style={{ color: '#6b7280' }}>Commence par ajouter des cartes à ta collection !</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#1f2937',
      borderRadius: '12px',
      border: '1px solid #374151',
      overflow: 'hidden'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#111827', borderBottom: '1px solid #374151' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nom</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Coût</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Langue</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Qté</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Foil</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Prix</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card, index) => (
              <CardRow
                key={card.id || card._tempId || index}
                card={card}
                extensions={extensions}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CardRow = ({ card, extensions, onEdit, onDelete }) => {
  const isPending = card._pendingSync;
  
  // Affiche le nom FR si disponible, sinon nom EN
  const hasFrenchName = card.nom_fr && card.nom_fr !== card.nom;
  const displayName = hasFrenchName ? card.nom_fr : card.nom;
  
  // Prix - pas pour les terrains de base
  const isBasic = isBasicLand(card.nom);
  const price = isBasic ? null : card.prix_eur;
  const totalPrice = price ? (price * (card.exemplaires || 1)) : null;
  
  // Calcul disponibilité
  const total = card.exemplaires || 1;
  const used = card.usedInDecks || 0;
  const available = total - used;
  const hasUsed = used > 0;
  
  return (
    <tr style={{ borderBottom: '1px solid #374151' }}>
      {/* Nom */}
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isPending && <CloudOff size={12} style={{ color: '#f59e0b', flexShrink: 0 }} title="En attente" />}
          <div>
            <span style={{ fontWeight: '500', color: '#fff', fontSize: '14px' }}>{displayName}</span>
            {hasFrenchName && (
              <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>{card.nom}</div>
            )}
          </div>
        </div>
      </td>
      
      {/* Coût de mana */}
      <td style={{ padding: '12px' }}>
        <ManaCost cost={card.cout_mana} />
      </td>
      
      {/* Langue */}
      <td style={{ padding: '12px', textAlign: 'center' }}>
        <FlagIcon lang={card.langue || 'FR'} size={18} />
      </td>
      
      {/* Quantité - affiche dispo/total si certains sont dans des decks */}
      <td style={{ padding: '12px', textAlign: 'center' }}>
        <span 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '28px',
            height: '28px',
            padding: '0 8px',
            backgroundColor: hasUsed ? (available > 0 ? '#374151' : '#7f1d1d') : '#374151',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            color: hasUsed ? (available > 0 ? '#fff' : '#fca5a5') : '#fff'
          }}
          title={hasUsed ? `${available} disponible(s), ${used} dans des decks` : `${total} disponible(s)`}
        >
          {hasUsed ? `${available}/${total}` : total}
        </span>
      </td>
      
      {/* Foil */}
      <td style={{ padding: '12px', textAlign: 'center' }}>
        {card.foil ? (
          <span title="Foil" style={{ fontSize: '16px' }}>✨</span>
        ) : (
          <span style={{ color: '#4b5563' }}>—</span>
        )}
      </td>
      
      {/* Prix */}
      <td style={{ padding: '12px', textAlign: 'right' }}>
        {totalPrice !== null ? (
          <span style={{ color: '#34d399', fontSize: '13px', fontWeight: '500' }}>
            {totalPrice.toFixed(2)}€
          </span>
        ) : (
          <span style={{ color: '#4b5563', fontSize: '12px' }}>—</span>
        )}
      </td>
      
      {/* Actions */}
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
          <button
            onClick={() => onEdit(card)}
            title="Modifier"
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => { e.target.style.backgroundColor = '#7c3aed20'; e.target.style.color = '#a78bfa'; }}
            onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#9ca3af'; }}
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(card._tempId || card.id)}
            title="Supprimer"
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => { e.target.style.backgroundColor = '#ef444420'; e.target.style.color = '#f87171'; }}
            onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#9ca3af'; }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default CardTable;
