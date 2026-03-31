import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import GoogleSignInButton from './GoogleSignInButton';
import { saveSession } from '../lib/session';
import './Login.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const validateEmail = value => {
  if (!value) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
  return '';
};

const validatePassword = value => {
  if (!value) return 'Password is required';
  if (value.length < 6) return 'Password must be at least 6 characters';
  return '';
};

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [serverErr, setServerErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function validate(name, value) {
    if (name === 'email') return validateEmail(value);
    if (name === 'password') return validatePassword(value);
    return '';
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
    setServerErr('');

    if (touched[name]) {
      setErrors(current => ({ ...current, [name]: validate(name, value) }));
    }
  }

  function handleBlur(event) {
    const { name, value } = event.target;
    setTouched(current => ({ ...current, [name]: true }));
    setErrors(current => ({ ...current, [name]: validate(name, value) }));
  }

  async function handleAuthSuccess(data) {
    saveSession(data);
    navigate(data.role === 'admin' ? '/admin' : '/home', { replace: true });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerErr('');

    const allTouched = { email: true, password: true };
    const nextErrors = {
      email: validateEmail(form.email),
      password: validatePassword(form.password),
    };

    setTouched(allTouched);
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setServerErr(data.error || 'Login failed. Please try again.');
        return;
      }

      await handleAuthSuccess(data);
    } catch {
      setServerErr('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn(credential) {
    setServerErr('');
    setGoogleLoading(true);

    try {
      const response = await fetch(`${API}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, client_id: GOOGLE_CLIENT_ID }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Google sign-in failed. Please try again.');
      }

      await handleAuthSuccess(data);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      <div className="auth-card">
        <Link className="auth-back" to="/">
          Back to home
        </Link>

        <div className="auth-logo">
          <h1>PageTurn</h1>
          <p>Your curated bookstore</p>
        </div>

        <div className="auth-tabs">
          <button className="auth-tab active" type="button">
            Sign In
          </button>
          <Link
            className="auth-tab"
            style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            to="/signup"
          >
            Sign Up
          </Link>
        </div>

        <div className="auth-social-block">
          <GoogleSignInButton
            disabled={loading || googleLoading}
            onError={message => setServerErr(message)}
            onSuccess={handleGoogleSignIn}
            text="continue_with"
          />
          {googleLoading && <p className="google-signin-message">Finishing Google sign-in...</p>}
        </div>

        <div className="auth-divider">
          <span>or use your email</span>
        </div>

        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">Email Address</label>
            <input
              autoComplete="email"
              className={`input-field${errors.email && touched.email ? ' error' : ''}`}
              name="email"
              onBlur={handleBlur}
              onChange={handleChange}
              placeholder="you@example.com"
              type="email"
              value={form.email}
            />
            <span className={`field-hint ${errors.email && touched.email ? 'err' : touched.email && !errors.email ? 'ok' : ''}`}>
              {touched.email && errors.email ? errors.email : touched.email && !errors.email ? 'Looks good' : ''}
            </span>
          </div>

          <div className="form-field">
            <label className="form-label">Password</label>
            <div className="field-wrap">
              <input
                autoComplete="current-password"
                className={`input-field${errors.password && touched.password ? ' error' : ''}`}
                name="password"
                onBlur={handleBlur}
                onChange={handleChange}
                placeholder="Your password"
                type={showPwd ? 'text' : 'password'}
                value={form.password}
              />
              <button className="eye-btn" onClick={() => setShowPwd(current => !current)} type="button">
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
            <span
              className={`field-hint ${errors.password && touched.password ? 'err' : touched.password && !errors.password ? 'ok' : ''}`}
            >
              {touched.password && errors.password ? errors.password : touched.password && !errors.password ? 'OK' : ''}
            </span>
          </div>

          {serverErr && <div className="server-err">{serverErr}</div>}

          <button className="auth-submit" disabled={loading || googleLoading} type="submit">
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '.85rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link style={{ color: 'var(--gold)', fontWeight: 600 }} to="/signup">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
