import React from 'react';

function MenuIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export default React.memo(function Navbar({
  onToggleSidebar,
  searchLoading = false,
  searchPlaceholder = 'Search',
  searchValue = '',
  profileRole = 'Reader Space',
  title,
  user,
  onSearchChange,
}) {
  return (
    <header className="topbar">
      <button
        aria-label="Toggle sidebar"
        className="topbar-toggle"
        onClick={onToggleSidebar}
        type="button"
      >
        <MenuIcon />
      </button>

      <div className="topbar-heading">
        <span className="topbar-brand">Bookify</span>
        <span className="topbar-title">{title}</span>
      </div>

      {typeof onSearchChange === 'function' ? (
        <label className="topbar-search">
          <span className="topbar-search-icon">
            <SearchIcon />
          </span>
          <input
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            value={searchValue}
          />
          {searchLoading ? <span className="spinner" /> : null}
        </label>
      ) : null}

      <div className="topbar-profile">
        <div className="topbar-profile-avatar">{(user?.name || 'R')[0].toUpperCase()}</div>
        <div className="topbar-profile-copy">
          <span className="topbar-profile-role">{profileRole}</span>
          <span className="topbar-profile-name">{user?.name || 'Reader'}</span>
        </div>
      </div>
    </header>
  );
});
