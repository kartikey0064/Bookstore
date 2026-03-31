// ============================================================
//  StarRating.jsx  –  Clickable + display star rating
//
//  Props:
//    value       : number  0-5   (current rating)
//    onChange    : (stars) => void  (omit to make read-only)
//    size        : 'sm' | 'md' | 'lg'  (default 'md')
//    readonly    : bool
// ============================================================

import React, { useState } from 'react';

export default function StarRating({ value = 0, onChange, size = 'md', readonly = false }) {
  const [hover, setHover] = useState(0);

  const sizes = { sm: '.85rem', md: '1.1rem', lg: '1.4rem' };
  const fontSize = sizes[size] || sizes.md;

  const display = hover || value;

  return (
    <span className="stars" style={{ gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          className={`star ${star <= display ? 'filled' : ''}`}
          style={{ fontSize, cursor: readonly ? 'default' : 'pointer' }}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          title={readonly ? `${value}/5` : `Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          ★
        </span>
      ))}
    </span>
  );
}
