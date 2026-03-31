import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import GoogleSignInButton from './GoogleSignInButton';
import { saveSession } from '../lib/session';
import './Login.css';
import './Signup.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const panelMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const validators = {
  name: value =>
    !value.trim()
      ? 'Full name is required'
      : value.trim().length < 2
        ? 'Name must be at least 2 characters'
        : '',
  dob: value => {
    if (!value) return 'Date of birth is required';
    const age = (Date.now() - new Date(value)) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 5) return 'Are you sure? Check the date';
    if (age > 120) return 'Enter a valid date of birth';
    return '';
  },
  email: value =>
    !value
      ? 'Email is required'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? 'Enter a valid email address'
        : '',
  password: value => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'At least 8 characters required';
    if (!/[A-Z]/.test(value)) return 'Add at least one uppercase letter';
    if (!/[0-9]/.test(value)) return 'Add at least one number';
    return '';
  },
  confirmPassword: (value, password) =>
    !value ? 'Please confirm your password' : value !== password ? 'Passwords do not match' : '',
};

const STEPS = [
  { label: 'About You', fields: ['name', 'dob'] },
  { label: 'Contact', fields: ['email'] },
  { label: 'Security', fields: ['password', 'confirmPassword'] },
];

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor = ['', '#e05757', '#e0a050', '#5b9bd6', '#4caf8a'];

function strengthScore(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

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

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    dob: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [serverErr, setServerErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function fieldState(name) {
    if (!touched[name]) return '';
    return errors[name] ? 'error' : 'ok';
  }

  function validateField(name, value, currentForm = form) {
    if (name === 'confirmPassword') {
      return validators.confirmPassword(value, currentForm.password);
    }
    return validators[name]?.(value) ?? '';
  }

  function handleChange(event) {
    const { name, value } = event.target;
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);
    setServerErr('');

    if (touched[name]) {
      setErrors(current => ({
        ...current,
        [name]: validateField(name, value, nextForm),
      }));
    }

    if (name === 'password' && touched.confirmPassword) {
      setErrors(current => ({
        ...current,
        confirmPassword: validators.confirmPassword(nextForm.confirmPassword, value),
      }));
    }
  }

  function handleBlur(event) {
    const { name, value } = event.target;
    setTouched(current => ({ ...current, [name]: true }));
    setErrors(current => ({
      ...current,
      [name]: validateField(name, value),
    }));
  }

  function validateStep() {
    const fields = STEPS[step].fields;
    const nextErrors = {};

    fields.forEach(field => {
      nextErrors[field] = validateField(field, form[field]);
    });

    setErrors(current => ({ ...current, ...nextErrors }));
    setTouched(current => {
      const nextTouched = { ...current };
      fields.forEach(field => {
        nextTouched[field] = true;
      });
      return nextTouched;
    });

    return fields.every(field => !nextErrors[field]);
  }

  function handleNext(event) {
    event.preventDefault();
    if (validateStep()) {
      setStep(current => current + 1);
    }
  }

  function handleBack() {
    setStep(current => current - 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateStep()) {
      return;
    }

    setLoading(true);
    setServerErr('');

    try {
      const data = await postJson('/api/auth/register', {
        name: form.name.trim(),
        dob: form.dob,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: 'user',
      });
      saveSession(data);
      navigate('/home', { replace: true });
    } catch (error) {
      console.error('Registration failed:', error);
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
      navigate('/home', { replace: true });
    } catch (error) {
      console.error('Google signup failed:', error);
      setServerErr(getFriendlyMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  }

  const score = strengthScore(form.password);

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      <motion.div className="auth-card" style={{ maxWidth: 500 }} {...panelMotion}>
        <Link className="auth-back" to="/login">← Back to login</Link>

        <div className="auth-logo">
          <h1>Bookify</h1>
          <p>Create your account and start building your library.</p>
        </div>

        <div className="auth-tabs">
          <Link
            className="auth-tab"
            style={{ alignItems: 'center', display: 'flex', justifyContent: 'center', textAlign: 'center' }}
            to="/login"
          >
            Sign In
          </Link>
          <button className="auth-tab active" type="button">Sign Up</button>
        </div>

        {step === 0 && (
          <>
            <div className="auth-social-block">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <GoogleSignInButton
                  disabled={loading || googleLoading}
                  onError={message => setServerErr(message)}
                  onSuccess={handleGoogleSuccess}
                  text="signup_with"
                />
              </motion.div>
            </div>

            <div className="auth-divider">
              <span>or sign up with email</span>
            </div>
          </>
        )}

        <div className="step-indicator">
          {STEPS.map((currentStep, index) => (
            <React.Fragment key={currentStep.label}>
              <div className={`step-dot ${index < step ? 'done' : index === step ? 'active' : ''}`}>
                {index < step ? '✓' : index + 1}
              </div>
              {index < STEPS.length - 1 && <div className={`step-line ${index < step ? 'done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>
        <p className="step-label">
          Step {step + 1} of {STEPS.length} — <strong>{STEPS[step].label}</strong>
        </p>

        {step === 0 && (
          <motion.form className="auth-form" noValidate onSubmit={handleNext} {...panelMotion}>
            <div className="form-field">
              <label className="form-label">Full Name</label>
              <input
                autoFocus
                className={`input-field${fieldState('name') === 'error' ? ' error' : ''}`}
                name="name"
                onBlur={handleBlur}
                onChange={handleChange}
                placeholder="Jane Doe"
                type="text"
                value={form.name}
              />
              <span className={`field-hint ${fieldState('name') === 'ok' ? 'ok' : fieldState('name') === 'error' ? 'err' : ''}`}>
                {touched.name ? errors.name || 'Name looks good' : ' '}
              </span>
            </div>

            <div className="form-field">
              <label className="form-label">Date of Birth</label>
              <input
                className={`input-field${fieldState('dob') === 'error' ? ' error' : ''}`}
                max={new Date().toISOString().split('T')[0]}
                name="dob"
                onBlur={handleBlur}
                onChange={handleChange}
                type="date"
                value={form.dob}
              />
              <span className={`field-hint ${fieldState('dob') === 'ok' ? 'ok' : fieldState('dob') === 'error' ? 'err' : ''}`}>
                {touched.dob ? errors.dob || 'Looks good' : ' '}
              </span>
            </div>

            {serverErr && <div className="server-err">{serverErr}</div>}

            <motion.button className="auth-submit" type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              Continue →
            </motion.button>
          </motion.form>
        )}

        {step === 1 && (
          <motion.form className="auth-form" noValidate onSubmit={handleNext} {...panelMotion}>
            <div className="form-field">
              <label className="form-label">Email Address</label>
              <input
                autoComplete="email"
                autoFocus
                className={`input-field${fieldState('email') === 'error' ? ' error' : ''}`}
                name="email"
                onBlur={handleBlur}
                onChange={handleChange}
                placeholder="you@example.com"
                type="email"
                value={form.email}
              />
              <span className={`field-hint ${fieldState('email') === 'ok' ? 'ok' : fieldState('email') === 'error' ? 'err' : ''}`}>
                {touched.email ? errors.email || 'Looks good' : ' '}
              </span>
            </div>

            {serverErr && <div className="server-err">{serverErr}</div>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={handleBack} style={{ flex: 1 }} type="button">← Back</button>
              <motion.button className="auth-submit" style={{ flex: 2 }} type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                Continue →
              </motion.button>
            </div>
          </motion.form>
        )}

        {step === 2 && (
          <motion.form className="auth-form" noValidate onSubmit={handleSubmit} {...panelMotion}>
            <div className="form-field">
              <label className="form-label">Password</label>
              <div className="field-wrap">
                <input
                  autoComplete="new-password"
                  autoFocus
                  className={`input-field${fieldState('password') === 'error' ? ' error' : ''}`}
                  name="password"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="Min 8 chars, 1 upper, 1 number"
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                />
                <button className="eye-btn" onClick={() => setShowPwd(current => !current)} type="button">
                  {showPwd ? 'Hide' : 'Show'}
                </button>
              </div>
              {form.password && (
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{ background: strengthColor[score], width: `${score * 25}%` }}
                  />
                </div>
              )}
              <span className={`field-hint ${fieldState('password') === 'ok' ? 'ok' : fieldState('password') === 'error' ? 'err' : ''}`}>
                {form.password ? (errors.password && touched.password ? errors.password : `Strength: ${strengthLabel[score]}`) : ' '}
              </span>
            </div>

            <div className="form-field">
              <label className="form-label">Confirm Password</label>
              <div className="field-wrap">
                <input
                  autoComplete="new-password"
                  className={`input-field${fieldState('confirmPassword') === 'error' ? ' error' : ''}`}
                  name="confirmPassword"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  type={showConf ? 'text' : 'password'}
                  value={form.confirmPassword}
                />
                <button className="eye-btn" onClick={() => setShowConf(current => !current)} type="button">
                  {showConf ? 'Hide' : 'Show'}
                </button>
              </div>
              <span className={`field-hint ${fieldState('confirmPassword') === 'ok' ? 'ok' : fieldState('confirmPassword') === 'error' ? 'err' : ''}`}>
                {touched.confirmPassword ? errors.confirmPassword || 'Passwords match' : ' '}
              </span>
            </div>

            {serverErr && <div className="server-err">{serverErr}</div>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={handleBack} style={{ flex: 1 }} type="button">← Back</button>
              <motion.button
                className="auth-submit"
                disabled={loading || googleLoading}
                style={{ flex: 2 }}
                type="submit"
                whileHover={!loading && !googleLoading ? { scale: 1.05 } : {}}
                whileTap={!loading && !googleLoading ? { scale: 0.95 } : {}}
              >
                {loading ? <span className="spinner" /> : 'Create Account'}
              </motion.button>
            </div>
          </motion.form>
        )}

        <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: 20, textAlign: 'center' }}>
          Already have an account?{' '}
          <Link style={{ color: 'var(--gold)', fontWeight: 600 }} to="/login">
            Sign in →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
