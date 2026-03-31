// ============================================================
//  Introduction.jsx - Landing / splash page
//  Links to /login and /signup
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import './Introduction.css';

export default function Introduction() {
  return (
    <div className="intro-page">
      <div className="intro-bg">
        <div className="intro-orb orb-1" />
        <div className="intro-orb orb-2" />
        <div className="intro-orb orb-3" />
      </div>

      <nav className="intro-nav">
        <span className="brand">Bookify</span>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" className="nav-link-btn outline">Sign In</Link>
          <Link to="/signup" className="nav-link-btn filled">Get Started</Link>
        </div>
      </nav>

      <main className="intro-hero">
        <p className="intro-eyebrow">Welcome to Bookify</p>
        <h1 className="intro-headline">
          Your curated
          <br />
          <em>bookstore</em>
          <br />
          experience.
        </h1>
        <p className="intro-sub">
          Discover thousands of books, build your wishlist,
          <br />
          track your orders, and rate what you've read.
        </p>
        <div className="intro-actions">
          <Link to="/signup" className="btn-primary intro-cta">Start Reading</Link>
          <Link to="/login" className="btn-secondary intro-cta">Sign In</Link>
        </div>
      </main>

      <div className="intro-chips">
        {['Huge Catalogue', 'Community Ratings', 'Easy Checkout', 'Wishlists', 'Order Tracking'].map(feature => (
          <span key={feature} className="chip">{feature}</span>
        ))}
      </div>
    </div>
  );
}
