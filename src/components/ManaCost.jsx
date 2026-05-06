import React from 'react';

const ManaCost = ({ cost }) => {
  if (!cost) return null;
  
  const symbols = cost.match(/\{[^}]+\}/g) || [];
  
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', height: '20px' }}>
      {symbols.map((symbol, idx) => {
        const s = symbol.replace(/[{}]/g, '').toLowerCase().replace('/', '');
        const isHybrid = symbol.includes('/');
        return (
          <i 
            key={idx} 
            className={`ms ms-${s} ms-cost`} 
            style={{ 
              fontSize: '15px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              lineHeight: isHybrid ? '15px' : '14px'
            }}
          />
        );
      })}
    </div>
  );
};

export default ManaCost;
