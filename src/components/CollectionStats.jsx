import React, { useMemo } from 'react';

// Vérifier si c'est un terrain de base
const isBasicLand = (cardName) => {
  const basics = ['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes',
    'plaine', 'île', 'marais', 'montagne', 'forêt', 'lande'];
  return basics.some(b => cardName?.toLowerCase().includes(b));
};

// Couleurs MTG (sans multicolore)
const COLOR_MAP = {
  W: { color: '#f9fafb', name: 'Blanc' },
  U: { color: '#3b82f6', name: 'Bleu' },
  B: { color: '#1f2937', name: 'Noir' },
  R: { color: '#ef4444', name: 'Rouge' },
  G: { color: '#22c55e', name: 'Vert' },
  C: { color: '#9ca3af', name: 'Incolore' }
};

const CollectionStats = ({ cards }) => {
  const stats = useMemo(() => {
    let totalCards = 0;
    let totalPrice = 0;
    const colorCounts = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };

    cards.forEach(card => {
      const qty = card.exemplaires || 1;
      totalCards += qty;

      // Prix (hors terrains de base)
      if (!isBasicLand(card.nom) && card.prix_eur) {
        totalPrice += card.prix_eur * qty;
      }

      // Couleur - répartir les multicolores par couleur présente
      const colors = card.couleur || 'C';
      
      if (colors === 'C' || !colors || colors.length === 0) {
        // Incolore
        colorCounts.C += qty;
      } else {
        // Pour chaque couleur présente (mono ou multi), compter
        for (const c of colors) {
          if (colorCounts[c] !== undefined) {
            colorCounts[c] += qty;
          }
        }
      }
    });

    return { totalCards, totalPrice, colorCounts };
  }, [cards]);

  // Générer les segments du cercle
  const segments = useMemo(() => {
    // Total = somme des couleurs (les multicolores comptent plusieurs fois)
    const total = Object.values(stats.colorCounts).reduce((a, b) => a + b, 0) || 1;
    const result = [];
    let currentAngle = -90; // Commencer en haut

    const colorOrder = ['W', 'U', 'B', 'R', 'G', 'C'];
    
    colorOrder.forEach(color => {
      const count = stats.colorCounts[color];
      if (count > 0) {
        const percentage = count / total;
        const angle = percentage * 360;
        result.push({
          color: COLOR_MAP[color].color,
          name: COLOR_MAP[color].name,
          count,
          percentage,
          startAngle: currentAngle,
          endAngle: currentAngle + angle
        });
        currentAngle += angle;
      }
    });

    return result;
  }, [stats]);

  // Créer le path SVG pour un segment de cercle
  const createArcPath = (startAngle, endAngle, radius, innerRadius) => {
    const start = polarToCartesian(100, 100, radius, endAngle);
    const end = polarToCartesian(100, 100, radius, startAngle);
    const innerStart = polarToCartesian(100, 100, innerRadius, endAngle);
    const innerEnd = polarToCartesian(100, 100, innerRadius, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArc, 0, end.x, end.y,
      'L', innerEnd.x, innerEnd.y,
      'A', innerRadius, innerRadius, 0, largeArc, 1, innerStart.x, innerStart.y,
      'Z'
    ].join(' ');
  };

  const polarToCartesian = (cx, cy, r, angle) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  };

  return (
    <div style={{
      backgroundColor: '#1f2937',
      borderRadius: '12px',
      border: '1px solid #374151',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap',
      justifyContent: 'center'
    }}>
      {/* Cercle SVG - plus petit */}
      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
        <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
          {/* Fond gris si pas de cartes */}
          {segments.length === 0 && (
            <circle cx="100" cy="100" r="80" fill="none" stroke="#374151" strokeWidth="24" />
          )}
          
          {/* Segments colorés */}
          {segments.map((seg, i) => (
            <path
              key={i}
              d={createArcPath(seg.startAngle, seg.endAngle, 92, 68)}
              fill={seg.color}
              stroke="#1f2937"
              strokeWidth="2"
            >
              <title>{seg.name}: {seg.count} ({(seg.percentage * 100).toFixed(0)}%)</title>
            </path>
          ))}
        </svg>
        
        {/* Centre avec stats */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>
            {stats.totalCards}
          </div>
          <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>
            cartes
          </div>
        </div>
      </div>

      {/* Prix total - plus compact */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '22px', fontWeight: '700', color: '#34d399' }}>
          {stats.totalPrice.toFixed(2)}€
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>
          Valeur totale
        </div>
      </div>
    </div>
  );
};

export default CollectionStats;
