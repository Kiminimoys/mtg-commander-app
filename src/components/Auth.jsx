import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { auth } from '../services/api';

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const data = await auth.login(email, password);
        if (onLogin) onLogin(data.user);
      } else {
        const data = await auth.register(email, password);
        if (onLogin) onLogin(data.user);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f0f14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo et titre */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 10px 40px rgba(124, 58, 237, 0.3)'
          }}>
            <span style={{ fontSize: '40px' }}>⚔️</span>
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#fff',
            margin: '0 0 8px'
          }}>Commander Toolkit</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>
            Gère ta collection et tes decks
          </p>
          <p style={{ color: '#059669', margin: '8px 0 0', fontSize: '11px' }}>
            🏠 Serveur maison
          </p>
        </div>

        {/* Card de connexion */}
        <div style={{
          backgroundColor: '#1f2937',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid #374151'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: '24px',
            color: '#fff'
          }}>
            {isLogin ? 'Connexion' : 'Créer un compte'}
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: '#9ca3af',
                marginBottom: '8px'
              }}>
                Adresse email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280'
                }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  required
                  style={{
                    width: '100%',
                    padding: '14px 14px 14px 44px',
                    backgroundColor: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: '#fff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: '#9ca3af',
                marginBottom: '8px'
              }}>
                Mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280'
                }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '14px 14px 14px 44px',
                    backgroundColor: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: '#fff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: '10px',
                fontSize: '13px',
                marginBottom: '20px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: loading ? 0.7 : 1,
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#6d28d9')}
              onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#7c3aed')}
            >
              {loading ? (
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : isLogin ? (
                <>
                  <LogIn size={18} /> Se connecter
                </>
              ) : (
                <>
                  <UserPlus size={18} /> Créer le compte
                </>
              )}
            </button>
          </form>

          {/* Toggle login/signup */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#a78bfa',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '8px'
              }}
            >
              {isLogin ? "Pas de compte ? Inscris-toi" : "Déjà un compte ? Connecte-toi"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          color: '#4b5563',
          fontSize: '11px',
          marginTop: '24px'
        }}>
          Collection Manager pour Magic: The Gathering Commander
        </p>
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Auth;
