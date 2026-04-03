import { useState } from 'react';
import { motion } from 'framer-motion';

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'login' && !email) return;
    if (mode === 'signup' && (!name || !email)) return;
    setLoading(true);
    setTimeout(() => {
      onLogin({
        name: name || email.split('@')[0],
        email,
        college: 'Tech Fest 2026',
      });
    }, 1200);
  };

  return (
    <div className="login-screen">
      {/* Animated background effects */}
      <div className="login-bg-grid" />
      <div className="login-bg-glow login-bg-glow-1" />
      <div className="login-bg-glow login-bg-glow-2" />
      <div className="login-bg-glow login-bg-glow-3" />

      <motion.div
        className="login-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <motion.div
          className="login-logo"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        >
          <div className="login-logo-icon">⚡</div>
          <h1 className="login-logo-text">Queue-Jump</h1>
          <p className="login-tagline">Skip the queue. Save your time.</p>
        </motion.div>

        {/* Form Card */}
        <motion.form
          className="login-card glass-strong"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Mode Toggle */}
          <div className="login-toggle">
            <button
              type="button"
              className={`login-toggle-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >
              Log In
            </button>
            <button
              type="button"
              className={`login-toggle-btn ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
          </div>

          {/* Name field (signup only) */}
          {mode === 'signup' && (
            <motion.div
              className="login-field"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label>Full Name</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">👤</span>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </motion.div>
          )}

          {/* Email */}
          <div className="login-field">
            <label>Email</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">✉️</span>
              <input
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label>Password</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">🔒</span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>
          </div>

          {/* Submit */}
          <motion.button
            className="login-submit"
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : mode === 'login' ? (
              'Log In →'
            ) : (
              'Create Account →'
            )}
          </motion.button>

          {/* Divider */}
          <div className="login-divider">
            <span>or continue with</span>
          </div>

          {/* Social Login */}
          <div className="login-social">
            <button
              type="button"
              className="login-social-btn"
              onClick={() => {
                setLoading(true);
                setTimeout(() => onLogin({ name: 'Demo User', email: 'demo@techfest.edu', college: 'Tech Fest 2026' }), 800);
              }}
            >
              <span style={{ fontSize: '18px', marginRight: '8px' }}>🎪</span>
              Guest Demo
            </button>
          </div>
        </motion.form>

        {/* Footer */}
        <motion.p
          className="login-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Built for Tech Fest 2026 ⚡
        </motion.p>
      </motion.div>
    </div>
  );
}
