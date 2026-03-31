import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import GoogleSignInButton from './GoogleSignInButton';
import { saveSession } from '../lib/session';
import './Login.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function isAdminRole(role) {
  return role === 'admin' || role === 'super_admin';
}

const panelMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const validateEmail = value =>
  !value
    ? 'Email is required'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? 'Enter a valid email address'
      : '';

const validatePassword = value =>
  !value
    ? 'Password is required'
    : value.length < 6
      ? 'Password must be at least 6 characters'
      : '';

function getFriendlyMessage(error) {
  const message = error?.message || 'Something went wrong. Please try again.';
  if (/Failed to fetch/i.test(message)) {
    return 'Unable to reach the server. Please check your internet or backend URL.';
  }
  return message;
}

async function postJson(path, payload) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
}

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

  function redirectForRole(role) {
    navigate(isAdminRole(role) ? '/admin' : '/home', { replace: true });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerErr('');

    const nextTouched = { email: true, password: true };
    const nextErrors = {
      email: validateEmail(form.email),
      password: validatePassword(form.password),
    };

    setTouched(nextTouched);
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setLoading(true);
    try {
      const data = await postJson('/api/auth/login', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      saveSession(data);
      redirectForRole(data.role);
    } catch (error) {
      console.error('Login failed:', error);
      setServerErr(getFriendlyMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credential) {
    setGoogleLoading(true);
    setServerErr('');

    try {
      const data = await postJson('/api/auth/google', {
        credential,
        client_id: GOOGLE_CLIENT_ID,
      });
      saveSession(data);
      redirectForRole(data.role);
    } catch (error) {
      console.error('Google sign-in failed:', error);
      setServerErr(getFriendlyMessage(error));
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

      <motion.div className="auth-card" {...panelMotion}>
        <Link className="auth-back" to="/">← Back to home</Link>

        <div className="auth-logo">
          <h1>Bookify</h1>
          <p>Sign in to keep your cart, wishlist, and orders in sync.</p>
        </div>

        <div className="auth-tabs">
          <button className="auth-tab active" type="button">Sign In</button>
          <Link
            className="auth-tab"
            style={{ alignItems: 'center', display: 'flex', justifyContent: 'center', textAlign: 'center' }}
            to="/signup"
          >
            Sign Up
          </Link>
        </div>

        <div className="auth-social-block">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <GoogleSignInButton
              disabled={loading || googleLoading}
              onError={message => setServerErr(message)}
              onSuccess={handleGoogleSuccess}
              text="continue_with"
            />
          </motion.div>
        </div>

        <div className="auth-divider">
          <span>or continue with email</span>
        </div>

        <motion.form className="auth-form" noValidate onSubmit={handleSubmit} {...panelMotion}>
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
            <span className={`field-hint ${errors.password && touched.password ? 'err' : touched.password && !errors.password ? 'ok' : ''}`}>
              {touched.password && errors.password ? errors.password : touched.password && !errors.password ? 'Password looks good' : ''}
            </span>
          </div>

          {serverErr && <div className="server-err">{serverErr}</div>}

          <motion.button
            className="auth-submit"
            disabled={loading || googleLoading}
            type="submit"
            whileHover={!loading && !googleLoading ? { scale: 1.05 } : {}}
            whileTap={!loading && !googleLoading ? { scale: 0.95 } : {}}
          >
            {loading ? <span className="spinner" /> : 'Sign In'}
          </motion.button>
        </motion.form>

        <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: 20, textAlign: 'center' }}>
          Don&apos;t have an account?{' '}
          <Link style={{ color: 'var(--gold)', fontWeight: 600 }} to="/signup">
            Create one →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
