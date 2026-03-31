// ============================================================
//  Toast.jsx  –  Lightweight notification system
//
//  Usage:
//    import { toast } from './Toast';
//    toast('Item added!', 'success');  // 'success' | 'error' | 'info' | ''
//
//  Mount <ToastContainer /> once at the app root.
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';

// ── Internal subscriber list ─────────────────────────────────
let _listeners = [];

export function toast(message, type = '') {
  const id = Date.now() + Math.random();
  _listeners.forEach(fn => fn({ id, message, type }));
}

// ── ToastContainer: renders all active toasts ────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  // Subscribe on mount, unsubscribe on unmount
  useEffect(() => {
    const handler = item => {
      setToasts(prev => [...prev, item]);
      // Auto-dismiss after 3s
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== item.id));
      }, 3000);
    };
    _listeners.push(handler);
    return () => { _listeners = _listeners.filter(l => l !== handler); };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
