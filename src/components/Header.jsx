/**
 * Header - Barre de navigation principale
 * Contient le logo MTG, la navigation Collection/Decks et le statut de connexion
 */
import React from 'react';
import { Library, Layers, LogOut, Wifi, WifiOff } from 'lucide-react';
import { auth } from '../services/api';

// Logo MTG Planeswalker en SVG
const MTGLogo = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="mtgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="50%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>
    </defs>
    {/* Planeswalker symbol - 5 pointed flame shape */}
    <path 
      d="M50 95 
         C50 95 20 60 20 40 
         C20 25 35 15 50 5 
         C50 5 45 25 50 35
         C55 25 50 5 50 5
         C65 15 80 25 80 40
         C80 60 50 95 50 95Z"
      fill="url(#mtgGrad)"
      stroke="#fcd34d"
      strokeWidth="1"
    />
    {/* Inner flames */}
    <path d="M50 85 C50 85 30 55 35 40 C40 50 50 35 50 35 C50 35 60 50 65 40 C70 55 50 85 50 85Z" fill="#fef3c7" opacity="0.3"/>
    {/* Top spikes */}
    <path d="M35 35 L30 15 L40 30 Z" fill="url(#mtgGrad)" stroke="#fcd34d" strokeWidth="0.5"/>
    <path d="M50 25 L50 2 L50 25 Z" fill="url(#mtgGrad)" stroke="#fcd34d" strokeWidth="0.5"/>
    <path d="M65 35 L70 15 L60 30 Z" fill="url(#mtgGrad)" stroke="#fcd34d" strokeWidth="0.5"/>
    <path d="M25 45 L12 30 L28 40 Z" fill="url(#mtgGrad)" stroke="#fcd34d" strokeWidth="0.5"/>
    <path d="M75 45 L88 30 L72 40 Z" fill="url(#mtgGrad)" stroke="#fcd34d" strokeWidth="0.5"/>
  </svg>
);

const Header = ({ view, setView, isOnline }) => {
  const handleLogout = async () => {
    await auth.logout();
  };

  const navButtonStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: isActive ? '#7c3aed' : 'transparent',
    color: isActive ? '#fff' : '#9ca3af'
  });

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #1f2937'
    }}>
      <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MTGLogo size={36} />
            <div>
              <h1 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', margin: 0 }}>MTG Commander</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#1f2937', borderRadius: '10px', padding: '4px' }}>
            <button
              onClick={() => setView('collection')}
              style={navButtonStyle(view === 'collection')}
            >
              <Library size={16} />
              <span>Collection</span>
            </button>
            <button
              onClick={() => setView('decks')}
              style={navButtonStyle(view === 'decks')}
            >
              <Layers size={16} />
              <span>Decks</span>
            </button>
          </nav>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: isOnline ? '#34d399' : '#fbbf24' }}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{isOnline ? 'En ligne' : 'Hors-ligne'}</span>
            </div>
            
            <button
              onClick={handleLogout}
              title="Déconnexion"
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#9ca3af',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
