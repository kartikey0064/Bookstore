import React from 'react';

function IconShell({ children }) {
  return (
    <span className="dashboard-icon-shell" aria-hidden="true">
      <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
        {children}
      </svg>
    </span>
  );
}

export function UsersIcon() {
  return (
    <IconShell>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </IconShell>
  );
}

export function BooksIcon() {
  return (
    <IconShell>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </IconShell>
  );
}

export function RevenueIcon() {
  return (
    <IconShell>
      <path d="M12 1v22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </IconShell>
  );
}

export function RatingIcon() {
  return (
    <IconShell>
      <path d="m12 2.5 2.94 5.96 6.58.96-4.76 4.64 1.12 6.56L12 17.5l-5.88 3.12 1.12-6.56L2.48 9.42l6.58-.96L12 2.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </IconShell>
  );
}
