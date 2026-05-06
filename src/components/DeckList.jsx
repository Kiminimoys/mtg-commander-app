/**
 * DeckList - Grille de decks avec cartes visuelles
 * Affiche l'image du commandant en fond et un menu d'options
 */
import React, { useState, useEffect } from 'react';
import { Plus, MoreVertical, Trash2, Copy, FileText, Edit3, ShoppingCart, X, Check, Download } from 'lucide-react';
import { decks as decksApi, deckCards as deckCardsApi } from '../services/api';

const DeckList = ({ decks, onAdd, onDelete, onOpen, onReload }) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [modal, setModal] = useState({ type: null, deck: null });

  // Ferme le menu quand on clique ailleurs
  useEffect(() => {
    const handleClick = () => setActiveMenu(null);
    if (activeMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [activeMenu]);

  // Dupliquer un deck via l'API
  const handleDuplicate = async (deck) => {
    setActiveMenu(null);
    try {
      await decksApi.duplicate(deck.id);
      alert('Deck dupliqué !');
      if (onReload) onReload();
      else window.location.reload();
    } catch (error) {
      console.error('Erreur duplication:', error);
      alert('Erreur lors de la duplication');
    }
  };

  const handleDelete = (deckId) => {
    setActiveMenu(null);
    if (confirm('Supprimer ce deck ?')) {
      onDelete(deckId);
    }
  };

  const openModal = (type, deck) => {
    setActiveMenu(null);
    setModal({ type, deck });
  };

  const closeModal = () => {
    setModal({ type: null, deck: null });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#fff' }}>Mes Decks Commander</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>{decks.length} deck(s) créé(s)</p>
        </div>
        <button 
          onClick={onAdd}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '12px 20px', backgroundColor: '#059669', color: '#fff',
            border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
          }}
        >
          <Plus size={18} /> Nouveau Deck
        </button>
      </div>

      {/* Grille */}
      {decks.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {decks.map(deck => (
            <DeckCard 
              key={deck.id} 
              deck={deck} 
              isMenuOpen={activeMenu === deck.id}
              onOpenDeck={() => onOpen(deck)}
              onToggleMenu={(e) => { 
                e.stopPropagation(); 
                setActiveMenu(prev => prev === deck.id ? null : deck.id); 
              }}
              onShowMissing={() => openModal('missing', deck)}
              onRename={() => openModal('rename', deck)}
              onDuplicate={() => handleDuplicate(deck)}
              onExport={() => openModal('export', deck)}
              onDelete={() => handleDelete(deck.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState onAdd={onAdd} />
      )}

      {/* Modals */}
      {modal.type === 'rename' && (
        <RenameModal 
          deck={modal.deck} 
          onClose={closeModal} 
          onReload={onReload}
        />
      )}
      {modal.type === 'missing' && (
        <MissingCardsModal 
          deck={modal.deck} 
          onClose={closeModal} 
          onOpenDeck={() => { closeModal(); onOpen(modal.deck); }} 
        />
      )}
      {modal.type === 'export' && (
        <ExportModal deck={modal.deck} onClose={closeModal} />
      )}
    </div>
  );
};

const DeckCard = ({ deck, isMenuOpen, onOpenDeck, onToggleMenu, onShowMissing, onRename, onDuplicate, onExport, onDelete }) => {
  const commanderImageUrl = deck.commander 
    ? `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(deck.commander)}&format=image&version=art_crop`
    : null;
  const colors = deck.couleurs ? deck.couleurs.split('') : [];

  return (
    <div 
      onClick={onOpenDeck}
      style={{
        position: 'relative', 
        borderRadius: '16px', 
        cursor: 'pointer', 
        height: '200px',
        background: '#1f2937', 
        border: '2px solid #374151'
      }}
    >
      {/* Image container */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '14px', overflow: 'hidden' }}>
        {commanderImageUrl && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${commanderImageUrl})`,
            backgroundSize: 'cover', backgroundPosition: 'center top', opacity: 0.5
          }} />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 100%)'
        }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', height: '100%', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 1 }}>
        
        {/* Bracket */}
        {deck.bracket && (
          <div style={{
            position: 'absolute', top: '12px', left: '12px',
            padding: '4px 10px', backgroundColor: 'rgba(124, 58, 237, 0.9)',
            borderRadius: '6px', fontSize: '11px', fontWeight: '600', color: '#fff'
          }}>
            Bracket {deck.bracket}
          </div>
        )}

        {/* Menu button */}
        <button
          onClick={onToggleMenu}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            padding: '8px', backgroundColor: 'rgba(0,0,0,0.6)',
            border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
          }}
        >
          <MoreVertical size={18} />
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: '52px', right: '12px',
              backgroundColor: '#1f2937', border: '1px solid #374151',
              borderRadius: '12px', minWidth: '180px', zIndex: 100,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)', overflow: 'hidden'
            }}
          >
            <MenuButton icon={<ShoppingCart size={16} />} label="Cartes manquantes" onClick={onShowMissing} />
            <MenuButton icon={<Edit3 size={16} />} label="Renommer" onClick={onRename} />
            <MenuButton icon={<Copy size={16} />} label="Dupliquer" onClick={onDuplicate} />
            <MenuButton icon={<FileText size={16} />} label="Exporter" onClick={onExport} />
            <div style={{ height: '1px', backgroundColor: '#374151', margin: '4px 0' }} />
            <MenuButton icon={<Trash2 size={16} />} label="Supprimer" onClick={onDelete} danger />
          </div>
        )}

        {/* Colors */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          {colors.map((c, i) => {
            const colorBg = { W: '#fef3c7', U: '#3b82f6', B: '#1f2937', R: '#ef4444', G: '#22c55e' };
            return (
              <span key={i} style={{
                width: '16px', height: '16px', borderRadius: '50%',
                backgroundColor: colorBg[c] || '#6b7280',
                border: c === 'B' ? '1px solid #4b5563' : '1px solid rgba(255,255,255,0.3)'
              }} />
            );
          })}
        </div>

        {/* Deck name */}
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
          {deck.nom}
        </h3>

        {/* Commander */}
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#a78bfa', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
          {deck.commander}
        </p>
      </div>
    </div>
  );
};

// Bouton de menu
const MenuButton = ({ icon, label, onClick, danger }) => (
  <button
    onClick={(e) => { 
      e.preventDefault();
      e.stopPropagation(); 
      onClick(); 
    }}
    style={{
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px',
      width: '100%', 
      padding: '12px 16px',
      backgroundColor: 'transparent',
      border: 'none', 
      cursor: 'pointer',
      color: danger ? '#f87171' : '#d1d5db',
      fontSize: '14px', 
      textAlign: 'left'
    }}
    onMouseOver={(e) => e.currentTarget.style.backgroundColor = danger ? '#7f1d1d40' : '#374151'}
    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
  >
    {icon}
    {label}
  </button>
);

// ============ MODALS ============

const RenameModal = ({ deck, onClose, onReload }) => {
  const [newName, setNewName] = useState(deck.nom);
  const [loading, setLoading] = useState(false);

  const handleRename = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await decksApi.update(deck.id, { nom: newName.trim() });
      if (onReload) onReload();
      else window.location.reload();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du renommage');
      setLoading(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose} title="Renommer le deck">
      <input
        type="text"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        placeholder="Nouveau nom..."
        autoFocus
        style={{
          width: '100%', padding: '12px', backgroundColor: '#374151',
          border: '1px solid #4b5563', borderRadius: '10px',
          fontSize: '14px', color: '#fff', outline: 'none', marginBottom: '16px',
          boxSizing: 'border-box'
        }}
        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
      />
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#374151', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
          Annuler
        </button>
        <button onClick={handleRename} disabled={loading || !newName.trim()} style={{ padding: '10px 20px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Enregistrement...' : 'Renommer'}
        </button>
      </div>
    </ModalWrapper>
  );
};

const MissingCardsModal = ({ deck, onClose, onOpenDeck }) => {
  const [missingCards, setMissingCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const allCards = await deckCardsApi.getAll(deck.id);
        const missing = allCards.filter(c => c.statut === 'a_acheter');
        setMissingCards(missing);
      } catch (error) {
        console.error('Erreur:', error);
      }
      setLoading(false);
    };
    load();
  }, [deck.id]);

  const copyList = () => {
    const text = missingCards.map(c => `${c.quantite}x ${c.card_name}`).join('\n');
    navigator.clipboard.writeText(text);
    alert('Liste copiée !');
  };

  return (
    <ModalWrapper onClose={onClose} title="Cartes manquantes">
      {loading ? (
        <p style={{ textAlign: 'center', color: '#6b7280', padding: '32px' }}>Chargement...</p>
      ) : missingCards.length > 0 ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button onClick={copyList} style={{ padding: '6px 12px', backgroundColor: '#374151', color: '#d1d5db', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Copy size={14} /> Copier la liste
            </button>
          </div>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {missingCards.map((card, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: '#374151', borderRadius: '8px', marginBottom: '6px' }}>
                <span style={{ color: '#f59e0b', fontWeight: '600', fontSize: '13px' }}>{card.quantite}x</span>
                <span style={{ color: '#fff', fontSize: '14px' }}>{card.card_name}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
            {missingCards.length} carte(s) à acheter
          </p>
        </>
      ) : (
        <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#374151', borderRadius: '12px' }}>
          <Check size={40} style={{ color: '#34d399', marginBottom: '12px' }} />
          <p style={{ margin: 0, color: '#34d399', fontWeight: '600' }}>Deck complet !</p>
        </div>
      )}
      <button onClick={onOpenDeck} style={{ width: '100%', marginTop: '16px', padding: '12px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
        Ouvrir le deck
      </button>
    </ModalWrapper>
  );
};

const ExportModal = ({ deck, onClose }) => {
  const [deckCardsData, setDeckCardsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await deckCardsApi.getAll(deck.id);
        setDeckCardsData(data || []);
      } catch (error) {
        console.error('Erreur:', error);
      }
      setLoading(false);
    };
    load();
  }, [deck.id]);

  const generateText = (format) => {
    let text = '';
    if (format === 'moxfield') {
      const commander = deckCardsData.find(c => c.is_commander);
      const others = deckCardsData.filter(c => !c.is_commander);
      if (commander) text += `// Commander\n1 ${commander.card_name}\n\n// Deck\n`;
      others.forEach(c => { text += `${c.quantite} ${c.card_name}\n`; });
    } else {
      deckCardsData.forEach(c => { text += `${c.quantite}x ${c.card_name}\n`; });
    }
    return text.trim();
  };

  const copyText = (format) => {
    navigator.clipboard.writeText(generateText(format));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadText = (format) => {
    const blob = new Blob([generateText(format)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.nom.replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ModalWrapper onClose={onClose} title={`Exporter "${deck.nom}"`}>
      {loading ? (
        <p style={{ textAlign: 'center', color: '#6b7280', padding: '32px' }}>Chargement...</p>
      ) : (
        <>
          <p style={{ margin: '0 0 16px', color: '#9ca3af', fontSize: '13px' }}>{deckCardsData.length} carte(s)</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <ExportOption 
              label="Format Moxfield / Archidekt" 
              desc="Compatible avec les principaux sites"
              onCopy={() => copyText('moxfield')}
              onDownload={() => downloadText('moxfield')}
              copied={copied}
            />
            <ExportOption 
              label="Liste simple" 
              desc="Format texte basique"
              onCopy={() => copyText('simple')}
              onDownload={() => downloadText('simple')}
              copied={copied}
            />
          </div>
        </>
      )}
    </ModalWrapper>
  );
};

const ExportOption = ({ label, desc, onCopy, onDownload, copied }) => (
  <div style={{ backgroundColor: '#374151', borderRadius: '10px', padding: '14px' }}>
    <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>{label}</div>
    <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '10px' }}>{desc}</div>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button onClick={onCopy} style={{ flex: 1, padding: '8px', backgroundColor: '#4b5563', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copié !' : 'Copier'}
      </button>
      <button onClick={onDownload} style={{ flex: 1, padding: '8px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
        <Download size={14} /> Télécharger
      </button>
    </div>
  </div>
);

const ModalWrapper = ({ children, onClose, title }) => (
  <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
    <div style={{ backgroundColor: '#1f2937', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '450px', maxHeight: '80vh', overflowY: 'auto', border: '1px solid #374151' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#fff' }}>{title}</h3>
        <button onClick={onClose} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
          <X size={20} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const EmptyState = ({ onAdd }) => (
  <div style={{ backgroundColor: '#1f2937', borderRadius: '16px', border: '1px solid #374151', padding: '64px 32px', textAlign: 'center' }}>
    <div style={{ width: '80px', height: '80px', backgroundColor: '#374151', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '36px' }}>🎴</div>
    <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '600', color: '#d1d5db' }}>Aucun deck créé</h3>
    <p style={{ margin: '0 0 24px', color: '#6b7280' }}>Crée ton premier deck Commander !</p>
    <button onClick={onAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 24px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
      <Plus size={20} /> Créer mon premier deck
    </button>
  </div>
);

export default DeckList;
