import React from 'react';

function LogoutIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M15 7V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M10 12h10" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="m17 7 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function SidebarItem({
  item,
  active,
  expanded,
  onSelect,
  showIcons,
}) {
  return (
    <button
      aria-label={item.label}
      data-tooltip={item.label}
      key={item.id}
      className={`nav-item ${active === item.id ? 'active' : ''} ${expanded ? 'expanded' : 'collapsed'}`}
      onClick={() => onSelect(item.id)}
      type="button"
    >
      {showIcons ? <span className="nav-icon">{item.icon}</span> : null}
      <span className="nav-label">{item.label}</span>
      {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
    </button>
  );
}

export default function Sidebar({
  items = [],
  active,
  onSelect,
  onLogout,
  user,
  isOpen = true,
  isMobileOpen = false,
  onCloseMobile,
  showIcons = true,
  brand = 'Bookify',
  subtitle,
}) {
  const brandSubtitle = subtitle || (user?.role === 'admin' || user?.role === 'super_admin' ? 'Admin Panel' : 'Discover stories');

  const handleSelect = itemId => {
    onSelect?.(itemId);
    onCloseMobile?.();
  };

  return (
    <>
      <button
        aria-hidden={!isMobileOpen}
        className={`sidebar-backdrop ${isMobileOpen ? 'open' : ''}`}
        onClick={onCloseMobile}
        tabIndex={isMobileOpen ? 0 : -1}
        type="button"
      />
      <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-brand-mark">B</div>
          <div className="sidebar-brand-copy">
            <span>{brand}</span>
            <small>{brandSubtitle}</small>
          </div>
        </div>

        <div className={`sidebar-profile ${isOpen ? 'expanded' : 'collapsed'}`}>
          <div className="sidebar-profile-avatar">
            {(user?.name || '?')[0].toUpperCase()}
          </div>
          <div className="sidebar-profile-copy">
            <div className="sidebar-profile-name">{user?.name || 'User'}</div>
            <div className="sidebar-profile-email">{user?.email}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {items.map(item => (
            <SidebarItem
              key={item.id}
              active={active}
              expanded={isOpen}
              item={item}
              onSelect={handleSelect}
              showIcons={showIcons}
            />
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            aria-label="Log Out"
            data-tooltip="Log Out"
            className={`logout-btn ${isOpen ? 'expanded' : 'collapsed'}`}
            onClick={onLogout}
            type="button"
          >
            {showIcons ? <span className="nav-icon"><LogoutIcon /></span> : null}
            <span className="logout-label">Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
