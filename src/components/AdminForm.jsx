import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import useFormValidation from '../hooks/useFormValidation';
import { createAdmin } from '../services/api';
import { toast } from '../component/Toast';

function UserPlusIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  );
}

function EyeIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a3 3 0 0 0 4.24 4.24" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 8 10 8a17.8 17.8 0 0 1-3.04 4.19" />
      <path d="M6.61 6.61A17.23 17.23 0 0 0 2 12s3.5 8 10 8a10.8 10.8 0 0 0 5.39-1.39" />
    </svg>
  );
}

const INITIAL_VALUES = {
  name: '',
  dob: '',
  email: '',
  role: 'admin',
  password: '',
  confirmPassword: '',
};

const STEP_FIELDS = [
  ['name', 'dob', 'email', 'role'],
  ['password', 'confirmPassword'],
];

const STEP_META = [
  { id: 'details', label: 'Details', blurb: 'Basic admin profile information.' },
  { id: 'security', label: 'Security', blurb: 'Set a secure password and confirm access.' },
];

function getAge(value) {
  if (!value) return 0;
  const today = new Date();
  const dob = new Date(value);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const validators = {
  name: value => {
    const trimmed = value.trim();
    if (!trimmed) return 'Full name is required';
    if (trimmed.length < 3) return 'Full name must be at least 3 characters';
    return '';
  },
  dob: value => {
    if (!value) return 'Date of birth is required';
    return getAge(value) >= 18 ? '' : 'Admin must be at least 18 years old';
  },
  email: value => {
    if (!value) return 'Email is required';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Enter a valid email address';
  },
  role: value => (!value ? 'Select a role' : ''),
  password: value => {
    if (!value) return 'Password is required';
    return value.length >= 6 ? '' : 'Password must be at least 6 characters';
  },
  confirmPassword: (value, formValues) => {
    if (!value) return 'Confirm the password';
    return value === formValues.password ? '' : 'Passwords do not match';
  },
};

const stepMotion = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.25 },
};

export default function AdminForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    currentStep,
    errors,
    fieldState,
    goBack,
    goNext,
    goToStep,
    handleBlur,
    handleChange,
    isStepComplete,
    reset,
    touched,
    validateStep,
    values,
  } = useFormValidation({
    initialValues: INITIAL_VALUES,
    stepFields: STEP_FIELDS,
    validators,
  });

  const strength = useMemo(() => passwordStrength(values.password), [values.password]);
  const strengthLabel = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Excellent'][strength] || 'Very Weak';
  const strengthWidth = `${Math.max(strength, 0) * 25}%`;
  const strengthTone = ['bg-rose-500', 'bg-orange-400', 'bg-sky-400', 'bg-emerald-400', 'bg-emerald-500'][strength] || 'bg-rose-500';

  function inputClasses(name) {
    const state = fieldState(name);
    const stateStyles = state === 'error'
      ? 'border-rose-400/70 ring-rose-300/15'
      : state === 'success'
        ? 'border-emerald-400/70 ring-emerald-300/15'
        : 'border-slate-700/80 ring-transparent';

    return [
      'w-full rounded-2xl border bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition duration-200',
      'placeholder:text-slate-500 focus:border-sky-300/80 focus:ring-4 focus:ring-sky-300/15',
      stateStyles,
    ].join(' ');
  }

  function hintFor(name, successMessage) {
    if (!touched[name] || !values[name]) return ' ';
    if (errors[name]) return errors[name];
    return successMessage;
  }

  function hintTone(name) {
    const state = fieldState(name);
    if (state === 'error') return 'text-rose-300';
    if (state === 'success') return 'text-emerald-300';
    return 'text-transparent';
  }

  function handleContinue(event) {
    event.preventDefault();
    setServerMessage('');
    goNext();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerMessage('');

    if (!validateStep()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createAdmin({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        dob: values.dob,
        role: values.role,
      });
      toast('Admin Created Successfully', 'success');
      reset();
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (error) {
      setServerMessage(error.message || 'Something went wrong');
      toast('Something went wrong', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-220px)] items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.24),_transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(16,185,129,0.16),_transparent_70%)] blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(245,158,11,0.12),_transparent_70%)] blur-3xl" />
      </div>

      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl rounded-[32px] border border-slate-800/80 bg-[linear-gradient(160deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-6 shadow-[0_32px_90px_rgba(0,0,0,0.45)] sm:p-8"
        initial={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.35 }}
      >
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
              <UserPlusIcon className="h-4 w-4" />
              Add Admin
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Create Admin Account</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Add a new administrator with a focused, production-ready onboarding flow.
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          {STEP_META.map((step, index) => {
            const isActive = currentStep === index;
            const isDone = isStepComplete(index);

            return (
              <motion.button
                key={step.id}
                className={[
                  'rounded-2xl border px-4 py-4 text-left transition duration-200',
                  isActive
                    ? 'border-sky-300/70 bg-sky-400/10 shadow-[0_0_0_1px_rgba(125,211,252,0.16)]'
                    : isDone
                      ? 'border-emerald-400/50 bg-emerald-400/10'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700',
                ].join(' ')}
                onClick={() => goToStep(index)}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      'flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold',
                      isActive
                        ? 'border-sky-300/70 bg-sky-300/15 text-sky-100'
                        : isDone
                          ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-100'
                          : 'border-slate-700 bg-slate-950/70 text-slate-400',
                    ].join(' ')}
                  >
                    {isDone ? 'OK' : index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{step.label}</p>
                    <p className="mt-1 text-xs text-slate-400">{step.blurb}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.form key="details" className="space-y-6" onSubmit={handleContinue} {...stepMotion}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Full Name</label>
                  <input
                    autoFocus
                    className={inputClasses('name')}
                    name="name"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    value={values.name}
                  />
                  <p className={`mt-2 min-h-5 text-xs ${hintTone('name')}`}>{hintFor('name', 'Full name looks good')}</p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Date of Birth</label>
                  <input
                    className={inputClasses('dob')}
                    max={new Date().toISOString().split('T')[0]}
                    name="dob"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    type="date"
                    value={values.dob}
                  />
                  <p className={`mt-2 min-h-5 text-xs ${hintTone('dob')}`}>{hintFor('dob', 'Age requirement satisfied')}</p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Email</label>
                  <input
                    className={inputClasses('email')}
                    name="email"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    placeholder="admin@example.com"
                    type="email"
                    value={values.email}
                  />
                  <p className={`mt-2 min-h-5 text-xs ${hintTone('email')}`}>{hintFor('email', 'Email looks valid')}</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Role</label>
                  <select
                    className={inputClasses('role')}
                    name="role"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.role}
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  <p className={`mt-2 min-h-5 text-xs ${hintTone('role')}`}>{hintFor('role', 'Role selected')}</p>
                </div>
              </div>

              {serverMessage && (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {serverMessage}
                </div>
              )}

              <div className="flex justify-end">
                <motion.button
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_30px_rgba(14,165,233,0.22)]"
                  type="submit"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Continue
                </motion.button>
              </div>
            </motion.form>
          )}

          {currentStep === 1 && (
            <motion.form key="security" className="space-y-6" onSubmit={handleSubmit} {...stepMotion}>
              <div className="grid gap-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Password</label>
                  <div className="relative">
                    <input
                      autoFocus
                      className={`${inputClasses('password')} pr-12`}
                      name="password"
                      onBlur={handleBlur}
                      onChange={handleChange}
                      placeholder="At least 6 characters"
                      type={showPassword ? 'text' : 'password'}
                      value={values.password}
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                      onClick={() => setShowPassword(current => !current)}
                      type="button"
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full rounded-full transition-all duration-300 ${strengthTone}`} style={{ width: strengthWidth }} />
                  </div>
                  <p className={`mt-2 min-h-5 text-xs ${hintTone('password')}`}>
                    {touched.password && values.password
                      ? errors.password || `Password strength: ${strengthLabel}`
                      : ' '}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Confirm Password</label>
                  <div className="relative">
                    <input
                      className={`${inputClasses('confirmPassword')} pr-12`}
                      name="confirmPassword"
                      onBlur={handleBlur}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={values.confirmPassword}
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                      onClick={() => setShowConfirmPassword(current => !current)}
                      type="button"
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  <p className={`mt-2 min-h-5 text-xs ${hintTone('confirmPassword')}`}>
                    {hintFor('confirmPassword', 'Passwords match')}
                  </p>
                </div>
              </div>

              {serverMessage && (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {serverMessage}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <motion.button
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200"
                  onClick={goBack}
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Back
                </motion.button>
                <motion.button
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 to-sky-300 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_30px_rgba(16,185,129,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  type="submit"
                  whileHover={!isSubmitting ? { scale: 1.02, y: -1 } : {}}
                  whileTap={!isSubmitting ? { scale: 0.99 } : {}}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="spinner" />
                      Creating...
                    </span>
                  ) : (
                    'Create Admin'
                  )}
                </motion.button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
  );
}
