import React from 'react';

function EmptyChart({ message }) {
  return <div className="chart-empty-state">{message}</div>;
}

function buildPoints(data, width, height, padding = 14) {
  if (!data.length) return '';
  const max = Math.max(...data.map(point => Number(point.value) || 0), 1);
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  return data.map((point, index) => {
    const x = padding + stepX * index;
    const ratio = (Number(point.value) || 0) / max;
    const y = height - padding - ratio * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
}

export function SparklineChart({ data = [] }) {
  if (!data.length) return <EmptyChart message="No trend data" />;
  const points = buildPoints(data, 160, 52, 6);
  return (
    <svg className="sparkline-chart" preserveAspectRatio="none" viewBox="0 0 160 52">
      <defs>
        <linearGradient id="sparklineFill" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(96, 165, 250, 0.45)" />
          <stop offset="100%" stopColor="rgba(96, 165, 250, 0)" />
        </linearGradient>
      </defs>
      <polyline fill="none" points={points} stroke="#7dd3fc" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </svg>
  );
}

export function LineTrendChart({ data = [], emptyMessage = 'No data available' }) {
  if (!data.length) return <EmptyChart message={emptyMessage} />;
  const width = Math.max(360, data.length * 44);
  const height = 210;
  const points = buildPoints(data, width, height, 20);
  const labels = data.map(point => point.label);
  return (
    <div className="chart-scroll-shell">
      <div className="chart-svg-shell" style={{ minWidth: width }}>
        <svg className="trend-chart" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
          <g className="chart-grid">
            {[40, 90, 140].map(y => (
              <line key={y} x1="16" x2={width - 16} y1={y} y2={y} />
            ))}
          </g>
          <polyline fill="none" points={points} stroke="#38bdf8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          {points.split(' ').map((point, index) => {
            const [x, y] = point.split(',');
            return <circle key={`${labels[index]}-${index}`} cx={x} cy={y} fill="#f8fafc" r="3.8" stroke="#38bdf8" strokeWidth="2" />;
          })}
        </svg>
        <div className="chart-axis-labels" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(52px, 1fr))` }}>
          {labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
        </div>
      </div>
    </div>
  );
}

export function BarTrendChart({ data = [], emptyMessage = 'No data available', valueFormatter }) {
  if (!data.length) return <EmptyChart message={emptyMessage} />;
  const max = Math.max(...data.map(point => Number(point.value) || 0), 1);
  return (
    <div className="chart-scroll-shell">
      <div className="bar-chart" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(52px, 1fr))`, minWidth: Math.max(320, data.length * 64) }}>
        {data.map((point, index) => (
          <div key={`${point.label}-${index}`} className="bar-chart-item">
            <div className="bar-chart-column">
              <div className="bar-chart-fill" style={{ height: `${Math.max((Number(point.value) || 0) / max * 100, 4)}%` }} />
            </div>
            <span className="bar-chart-value">{valueFormatter ? valueFormatter(point.value) : point.value}</span>
            <span className="bar-chart-label">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function polarToCartesian(cx, cy, radius, angle) {
  const radians = (angle - 90) * (Math.PI / 180);
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function PieBreakdownChart({ data = [] }) {
  if (!data.length) return <EmptyChart message="No category data available" />;

  const palette = ['#38bdf8', '#f59e0b', '#34d399', '#f472b6', '#a78bfa', '#fb7185', '#2dd4bf'];
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0) || 1;
  let startAngle = 0;

  return (
    <div className="pie-chart-layout">
      <svg className="pie-chart-svg" viewBox="0 0 120 120">
        <circle cx="60" cy="60" fill="none" r="38" stroke="rgba(148, 163, 184, 0.12)" strokeWidth="18" />
        {data.map((item, index) => {
          const share = (Number(item.value) || 0) / total;
          const endAngle = startAngle + share * 360;
          const path = describeArc(60, 60, 38, startAngle, endAngle);
          const element = (
            <path
              key={item.label}
              d={path}
              fill="none"
              stroke={palette[index % palette.length]}
              strokeLinecap="round"
              strokeWidth="18"
            />
          );
          startAngle = endAngle;
          return element;
        })}
      </svg>
      <div className="pie-chart-legend">
        {data.map((item, index) => (
          <div key={item.label} className="pie-legend-item">
            <span className="pie-legend-dot" style={{ background: palette[index % palette.length] }} />
            <span className="pie-legend-label">{item.label}</span>
            <span className="pie-legend-value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RatingStars({ value = 0 }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <div className="rating-stars" aria-label={`Average rating ${value}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} className={rounded >= star ? 'filled' : rounded >= star - 0.5 ? 'half' : ''}>★</span>
      ))}
    </div>
  );
}
