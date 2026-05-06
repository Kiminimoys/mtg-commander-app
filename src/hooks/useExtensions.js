import { useState, useEffect } from 'react';

export const useExtensions = () => {
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadExtensions = async () => {
      try {
        const response = await fetch('https://api.scryfall.com/sets');
        const data = await response.json();
        setExtensions(data.data || []);
      } catch (error) {
        console.error('Erreur chargement extensions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadExtensions();
  }, []);

  return { extensions, loading };
};

export default useExtensions;
