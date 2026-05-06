/**
 * ============================================================================
 * USE_AUTH.JS - Hook d'authentification (API maison)
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { auth } from '../services/api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Vérifie si l'utilisateur est connecté au chargement
  useEffect(() => {
    const currentUser = auth.getUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  /**
   * Connexion
   */
  const signIn = useCallback(async (email, password) => {
    try {
      const data = await auth.login(email, password);
      setUser(data.user);
      return { error: null };
    } catch (error) {
      return { error: { message: error.message } };
    }
  }, []);

  /**
   * Inscription
   */
  const signUp = useCallback(async (email, password) => {
    try {
      const data = await auth.register(email, password);
      setUser(data.user);
      return { error: null };
    } catch (error) {
      return { error: { message: error.message } };
    }
  }, []);

  /**
   * Déconnexion
   */
  const signOut = useCallback(async () => {
    auth.logout();
    setUser(null);
  }, []);

  return { 
    user, 
    loading,
    signIn,
    signUp,
    signOut
  };
};

export default useAuth;
