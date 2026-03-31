// ============================================================
//  Sidebar.jsx  –  Shared sidebar shell
//
//  Props:
//    items       : [{ id, icon, label, badge? }]  — nav items
//    active      : string                          — active item id
//    onSelect    : (id) => void
//    onLogout    : () => void
//    user        : { name, email, role }
// ============================================================

import React from 'react';

export default function Sidebar({ items = [], active, onSelect, onLogout, user }) {
  return (
    <aside className="sidebar">
      {/* Logo / branding */}
      <div className="sidebar-logo">
        <span>📖 PageTurn</span>
        <small>{user?.role === 'admin' ? 'Admin Panel' : 'Bookstore'}</small>
      </div>

      {/* User chip */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--gold), var(--gold-dim))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '.9rem', color: '#0d1117', flexShrink: 0,
        }}>
          {(user?.name || '?')[0].toUpperCase()}
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.name || 'User'}
          </div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email}
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="sidebar-nav">
        {items.map(item => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge > 0 && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout}>
          <span>🚪</span> Log Out
        </button>
      </div>
    </aside>
  );
}
