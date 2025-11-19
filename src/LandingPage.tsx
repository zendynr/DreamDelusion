import { useState } from 'react';
import { signUp, signIn } from './auth';
import Logo from './Logo';

type AuthMode = 'login' | 'signup';

export default function LandingPage({ onAuthSuccess, onSkip, theme = 'dark' }: { onAuthSuccess: () => void; onSkip: () => void; theme?: 'dark' | 'light' }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (mode === 'signup') {
        result = await signUp(email, password, name);
      } else {
        result = await signIn(email, password);
      }

      if (result.success && result.user) {
        onAuthSuccess();
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-content">
        <div className="landing-header">
          <Logo variant={theme} />
          <h1 className="landing-title">DreamDelusion</h1>
          <p className="landing-subtitle">Capture your thoughts, explore your mind</p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setMode('signup');
                setError('');
              }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={mode === 'signup' ? 6 : undefined}
              />
            </div>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
        </div>

        <div className="landing-footer">
          <p className="landing-description">
            A minimal space for capturing your thoughts through voice transcription.
            <br />
            No distractions, just you and your mind.
          </p>
          <button
            onClick={onSkip}
            className="skip-button"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

