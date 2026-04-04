import { useState } from 'react';
import { motion } from 'framer-motion';
import { auth, googleProvider } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { initializeNewUser } from '../utils/firebaseOperations';

export default function LoginModal({ onClose, onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (mode === 'signup' && !name) {
      setError('Please provide your username');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        await initializeNewUser(userCredential.user.uid, {
          name: name,
          email: userCredential.user.email,
        });
        
        onLoginSuccess({
          uid: userCredential.user.uid,
          name: name,
          email: userCredential.user.email,
          college: 'Tech Fest 2026',
        });
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        await initializeNewUser(userCredential.user.uid, {
          name: userCredential.user.displayName || email.split('@')[0],
          email: userCredential.user.email,
        });
        
        onLoginSuccess({
          uid: userCredential.user.uid,
          name: userCredential.user.displayName || email.split('@')[0],
          email: userCredential.user.email,
          college: 'Tech Fest 2026',
        });
      }
    } catch (err) {
      let errorMsg = err.message.replace('Firebase: ', '');
      if (err.code === 'auth/invalid-credential') errorMsg = 'Invalid email or password.';
      if (err.code === 'auth/email-already-in-use') errorMsg = 'An account with this email already exists.';
      if (err.code === 'auth/weak-password') errorMsg = 'Password should be at least 6 characters.';
      setError(errorMsg);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      await initializeNewUser(result.user.uid, {
        name: result.user.displayName,
        email: result.user.email,
      });
      
      onLoginSuccess({
        uid: result.user.uid,
        name: result.user.displayName,
        email: result.user.email,
        college: 'Tech Fest 2026',
      });
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="login-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <motion.div
        className="login-modal-card"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95), rgba(25, 25, 35, 0.95))',
          border: '1px solid rgba(100, 100, 150, 0.3)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '420px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '8px',
          }}
        >
          ✕
        </button>

        {/* Title */}
        <motion.div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
            {mode === 'login' ? 'Welcome Back' : 'Join the Community'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {mode === 'login' 
              ? 'Sign in to submit reports and earn karma' 
              : 'Create an account to start reporting'}
          </p>
        </motion.div>

        {/* Mode Toggle */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          background: 'rgba(100, 100, 150, 0.1)',
          padding: '4px',
          borderRadius: '8px',
        }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: mode === 'login' ? '#3B82F6' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: mode === 'login' ? '#FFF' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: mode === 'signup' ? '#3B82F6' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: mode === 'signup' ? '#FFF' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Name field (signup only) */}
          {mode === 'signup' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Username
              </label>
              <input
                type="text"
                placeholder="Your username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'rgba(100, 100, 150, 0.1)',
                  border: '1px solid rgba(100, 100, 150, 0.2)',
                  borderRadius: '6px',
                  color: '#FFF',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </motion.div>
          )}

          {/* Email */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="you@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(100, 100, 150, 0.1)',
                border: '1px solid rgba(100, 100, 150, 0.2)',
                borderRadius: '6px',
                color: '#FFF',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(100, 100, 150, 0.1)',
                border: '1px solid rgba(100, 100, 150, 0.2)',
                borderRadius: '6px',
                color: '#FFF',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px',
              background: 'rgba(255, 45, 85, 0.1)',
              border: '1px solid rgba(255, 45, 85, 0.3)',
              borderRadius: '6px',
              color: '#FF2D55',
              fontSize: '12px',
            }}>
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '10px',
              background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
              border: 'none',
              borderRadius: '6px',
              color: '#FFF',
              fontWeight: '600',
              fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '⏳ Please wait...' : (mode === 'login' ? 'Log In' : 'Create Account')}
          </motion.button>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '12px 0',
            color: 'var(--text-tertiary)',
            fontSize: '12px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(100, 100, 150, 0.2)' }} />
            <span>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(100, 100, 150, 0.2)' }} />
          </div>

          {/* Google Sign In */}
          <motion.button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '10px',
              background: 'rgba(100, 100, 150, 0.1)',
              border: '1px solid rgba(100, 100, 150, 0.3)',
              borderRadius: '6px',
              color: '#FFF',
              fontWeight: '600',
              fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}
