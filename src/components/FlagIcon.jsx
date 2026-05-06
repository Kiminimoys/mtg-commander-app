import React from 'react';

const FlagIcon = ({ code, lang, size = 18 }) => {
  // Accepte code ou lang
  const langCode = code || lang || 'FR';
  
  const flags = {
    'FR': (
      <svg width={size} height={size * 0.67} viewBox="0 0 3 2">
        <rect width="1" height="2" fill="#002395"/>
        <rect width="1" height="2" x="1" fill="#fff"/>
        <rect width="1" height="2" x="2" fill="#ED2939"/>
      </svg>
    ),
    'EN': (
      <svg width={size} height={size * 0.6} viewBox="0 0 60 30">
        <rect width="60" height="30" fill="#012169"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2"/>
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
      </svg>
    ),
    'DE': (
      <svg width={size} height={size * 0.6} viewBox="0 0 5 3">
        <rect width="5" height="1" fill="#000"/>
        <rect width="5" height="1" y="1" fill="#D00"/>
        <rect width="5" height="1" y="2" fill="#FFCE00"/>
      </svg>
    ),
    'ES': (
      <svg width={size} height={size * 0.67} viewBox="0 0 750 500">
        <rect width="750" height="500" fill="#c60b1e"/>
        <rect width="750" height="250" y="125" fill="#ffc400"/>
      </svg>
    ),
    'IT': (
      <svg width={size} height={size * 0.67} viewBox="0 0 3 2">
        <rect width="1" height="2" fill="#009246"/>
        <rect width="1" height="2" x="1" fill="#fff"/>
        <rect width="1" height="2" x="2" fill="#ce2b37"/>
      </svg>
    ),
    'PT': (
      <svg width={size} height={size * 0.67} viewBox="0 0 3 2">
        <rect width="3" height="2" fill="#006600"/>
        <rect width="1.8" height="2" x="1.2" fill="#ff0000"/>
      </svg>
    ),
    'JA': (
      <svg width={size} height={size * 0.67} viewBox="0 0 3 2">
        <rect width="3" height="2" fill="#fff"/>
        <circle cx="1.5" cy="1" r="0.6" fill="#bc002d"/>
      </svg>
    ),
    'KO': (
      <svg width={size} height={size * 0.67} viewBox="0 0 3 2">
        <rect width="3" height="2" fill="#fff"/>
        <circle cx="1.5" cy="1" r="0.5" fill="#c60c30"/>
      </svg>
    ),
    'RU': (
      <svg width={size} height={size * 0.67} viewBox="0 0 9 6">
        <rect width="9" height="2" fill="#fff"/>
        <rect width="9" height="2" y="2" fill="#0039A6"/>
        <rect width="9" height="2" y="4" fill="#D52B1E"/>
      </svg>
    ),
    'ZH': (
      <svg width={size} height={size * 0.67} viewBox="0 0 3 2">
        <rect width="3" height="2" fill="#de2910"/>
        <polygon fill="#ffde00" points="0.5,0.3 0.6,0.6 0.3,0.45 0.7,0.45 0.4,0.6" transform="scale(0.8)"/>
      </svg>
    )
  };
  
  return (
    <span title={langCode} style={{ display: 'inline-flex', alignItems: 'center' }}>
      {flags[langCode] || <span style={{ fontSize: '12px' }}>🏳️</span>}
    </span>
  );
};

export default FlagIcon;
