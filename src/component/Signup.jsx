import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import GoogleSignInButton from './GoogleSignInButton';
import OtpInput from './OtpInput';
import { saveSession } from '../lib/session';
import './Login.css';
import './Signup.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const OTP_LENGTH = 6;

const validators = {
  name: value => {
    if (!value.trim()) return 'Full name is required';
    if (value.trim().length < 2) return 'Name must be at least 2 characters';
    return '';
  },
  dob: value => {
    if (!value) return 'Date of birth is required';
    const age = (Date.now() - new Date(value)) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 5) return 'Are you sure? Check the date';
    if (age > 120) return 'Enter a valid date of birth';
    return '';
  },
  email: value => {
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
    return '';
  },
  password: value => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'At least 8 characters required';
    if (!/[A-Z]/.test(value)) return 'Add at least one uppercase letter';
    if (!/[0-9]/.test(value)) return 'Add at least one number';
    return '';
  },
  confirmPassword: (value, password) => {
    if (!value) return 'Please confirm your password';
    if (value !== password) return 'Passwords do not match';
    return '';
  },
};

const STEPS = [
  { label: 'About You', fields: ['name', 'dob'] },
  { label: 'Contact', fields: ['email'] },
  { label: 'Security', fields: ['password', 'confirmPassword'] },
];

function strengthScore(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor = ['', '#e05757', '#e0a050', '#5b9bd6', '#4caf8a'];

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
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState({ text: '', type: '' });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
    setServerErr('');

    if (name === 'email') {
      setOtp('');
      setOtpSent(false);
      setEmailVerified(false);
      setOtpMessage({ text: '', type: '' });
    }

    if (!touched[name]) {
      return;
    }

    const nextError =
      name === 'confirmPassword'
        ? validators.confirmPassword(value, form.password)
        : validators[name]?.(value) ?? '';

    setErrors(current => ({ ...current, [name]: nextError }));

    if (name === 'password' && touched.confirmPassword) {
      setErrors(current => ({
        ...current,
        confirmPassword: validators.confirmPassword(form.confirmPassword, value),
      }));
    }
  }

  function handleBlur(event) {
    const { name, value } = event.target;
    const nextError =
      name === 'confirmPassword'
        ? validators.confirmPassword(value, form.password)
        : validators[name]?.(value) ?? '';

    setTouched(current => ({ ...current, [name]: true }));
    setErrors(current => ({ ...current, [name]: nextError }));
  }

  function validateStep() {
    const fields = STEPS[step].fields;
    const nextErrors = {};

    fields.forEach(field => {
      nextErrors[field] =
        field === 'confirmPassword'
          ? validators.confirmPassword(form[field], form.password)
          : validators[field]?.(form[field]) ?? '';
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

  function fieldState(name) {
    if (!touched[name]) return '';
    return errors[name] ? 'error' : 'ok';
  }

  function handleNext(event) {
    event.preventDefault();
    if (!validateStep()) {
      return;
    }

    if (step === 1 && !emailVerified) {
      setServerErr('Verify your email with the OTP before continuing.');
      return;
    }

    setStep(current => current + 1);
  }

  function handleBack() {
    setStep(current => current - 1);
  }

  async function handleAuthSuccess(data) {
    saveSession(data);
    navigate(data.role === 'admin' ? '/admin' : '/home', { replace: true });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateStep()) {
      return;
    }

    setLoading(true);
    setServerErr('');

    try {
      const response = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          dob: form.dob,
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: 'user',
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setServerErr(data.error || 'Registration failed. Please try again.');
        return;
      }

      await handleAuthSuccess(data);
    } catch {
      setServerErr('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    const emailError = validators.email(form.email);
    setTouched(current => ({ ...current, email: true }));
    setErrors(current => ({ ...current, email: emailError }));
    setServerErr('');

    if (emailError) {
      return;
    }

    setSendingOtp(true);
    setOtpMessage({ text: '', type: '' });

    try {
      const response = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim().toLowerCase() }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Could not send OTP. Please try again.');
      }

      setOtp('');
      setOtpSent(true);
      setEmailVerified(false);
      setOtpMessage({ text: data.message || 'OTP sent successfully.', type: 'ok' });
    } catch (error) {
      setOtpMessage({ text: error.message || 'Could not send OTP. Please try again.', type: 'err' });
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    setServerErr('');

    if (otp.length !== OTP_LENGTH) {
      setOtpMessage({ text: 'Enter the full 6-digit OTP.', type: 'err' });
      return;
    }

    setVerifyingOtp(true);
    setOtpMessage({ text: '', type: '' });

    try {
      const response = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          otp,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed.');
      }

      setEmailVerified(true);
      setOtpMessage({ text: data.message || 'Email verified successfully.', type: 'ok' });
    } catch (error) {
      setEmailVerified(false);
      setOtpMessage({ text: error.message || 'OTP verification failed.', type: 'err' });
    } finally {
      setVerifyingOtp(false);
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
        throw new Error(data.error || 'Google sign-up failed. Please try again.');
      }

      await handleAuthSuccess(data);
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

      <div className="auth-card" style={{ maxWidth: 480 }}>
        <Link className="auth-back" to="/login">
          Back to login
        </Link>

        <div className="auth-logo">
          <h1>PageTurn</h1>
          <p>Create your account</p>
        </div>

        <div className="auth-social-block">
          <GoogleSignInButton
            disabled={loading || googleLoading}
            onError={message => setServerErr(message)}
            onSuccess={handleGoogleSignIn}
            text="signup_with"
          />
          {googleLoading && <p className="google-signin-message">Finishing Google sign-up...</p>}
        </div>

        <div className="auth-divider">
          <span>or create an account with email</span>
        </div>

        <div className="step-indicator">
          {STEPS.map((item, index) => (
            <React.Fragment key={item.label}>
              <div className={`step-dot ${index < step ? 'done' : index === step ? 'active' : ''}`}>
                {index < step ? 'OK' : index + 1}
              </div>
              {index < STEPS.length - 1 && <div className={`step-line ${index < step ? 'done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>
        <p className="step-label">
          Step {step + 1} of {STEPS.length} - <strong>{STEPS[step].label}</strong>
        </p>

        {step === 0 && (
          <form className="auth-form" noValidate onSubmit={handleNext}>
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

            <button className="auth-submit" disabled={googleLoading} type="submit">
              Continue
            </button>
          </form>
        )}

        {step === 1 && (
          <form className="auth-form" noValidate onSubmit={handleNext}>
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
                {emailVerified ? 'Email verified' : touched.email ? errors.email || 'Looks good' : ' '}
              </span>
            </div>

            <button
              className="btn-secondary otp-trigger"
              disabled={sendingOtp || !!validators.email(form.email)}
              onClick={handleSendOtp}
              type="button"
            >
              {sendingOtp ? 'Sending OTP...' : otpSent ? 'Resend OTP' : 'Send OTP'}
            </button>

            {otpSent && (
              <div className="otp-panel">
                <div className="otp-panel-head">
                  <div>
                    <h3>Email Verification</h3>
                    <p>Enter the 6-digit code sent to {form.email.trim().toLowerCase()}.</p>
                  </div>
                  {emailVerified && <span className="otp-badge">Verified</span>}
                </div>

                <OtpInput
                  disabled={sendingOtp || verifyingOtp || emailVerified}
                  length={OTP_LENGTH}
                  onChange={setOtp}
                  value={otp}
                />

                {otpMessage.text && <p className={`otp-message ${otpMessage.type}`}>{otpMessage.text}</p>}

                <button
                  className="auth-submit"
                  disabled={sendingOtp || verifyingOtp || emailVerified || otp.length !== OTP_LENGTH}
                  onClick={handleVerifyOtp}
                  type="button"
                >
                  {verifyingOtp ? <span className="spinner" /> : emailVerified ? 'Email Verified' : 'Verify OTP'}
                </button>
              </div>
            )}

            {serverErr && <div className="server-err">{serverErr}</div>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={handleBack} style={{ flex: 1 }} type="button">
                Back
              </button>
              <button className="auth-submit" disabled={!emailVerified} style={{ flex: 2 }} type="submit">
                Continue
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="auth-form" noValidate onSubmit={handleSubmit}>
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
                    style={{
                      width: `${score * 25}%`,
                      background: strengthColor[score],
                    }}
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
              <span
                className={`field-hint ${
                  fieldState('confirmPassword') === 'ok' ? 'ok' : fieldState('confirmPassword') === 'error' ? 'err' : ''
                }`}
              >
                {touched.confirmPassword ? errors.confirmPassword || 'Passwords match' : ' '}
              </span>
            </div>

            {serverErr && <div className="server-err">{serverErr}</div>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={handleBack} style={{ flex: 1 }} type="button">
                Back
              </button>
              <button className="auth-submit" disabled={loading || googleLoading} style={{ flex: 2 }} type="submit">
                {loading ? <span className="spinner" /> : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '.85rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link style={{ color: 'var(--gold)', fontWeight: 600 }} to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
