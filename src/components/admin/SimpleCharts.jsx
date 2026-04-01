import React, { useId } from 'react';
import { motion } from 'framer-motion';

function EmptyChart({ message }) {
  return <div className="chart-empty-state">{message}</div>;
}

function getMaxValue(data) {
  return Math.max(...data.map(point => Number(point.value) || 0), 1);
}

function normalizePadding(padding) {
  if (typeof padding === 'number') {
    return {
      top: padding,
      right: padding,
      bottom: padding,
      left: padding,
    };
  }

  return {
    top: padding?.top ?? 14,
    right: padding?.right ?? 14,
    bottom: padding?.bottom ?? 14,
    left: padding?.left ?? 14,
  };
}

function buildChartPoints(data, width, height, padding = 14) {
  if (!data.length) return [];

  const resolvedPadding = normalizePadding(padding);
  const max = getMaxValue(data);
  const innerHeight = height - resolvedPadding.top - resolvedPadding.bottom;
  const innerWidth = width - resolvedPadding.left - resolvedPadding.right;
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  return data.map((point, index) => {
    const value = Number(point.value) || 0;
    const x = data.length === 1 ? (resolvedPadding.left + innerWidth / 2) : resolvedPadding.left + stepX * index;
    const y = height - resolvedPadding.bottom - (value / max) * innerHeight;

    return {
      x,
      y,
      label: point.label,
      value,
    };
  });
}

function buildLinePath(points) {
  if (!points.length) return '';
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

function buildAreaPath(points, height, padding) {
  if (!points.length) return '';

  const resolvedPadding = normalizePadding(padding);
  const first = points[0];
  const last = points[points.length - 1];
  const baseline = height - resolvedPadding.bottom;

  return [
    `M ${first.x} ${baseline}`,
    `L ${first.x} ${first.y}`,
    ...points.slice(1).map(point => `L ${point.x} ${point.y}`),
    `L ${last.x} ${baseline}`,
    'Z',
  ].join(' ');
}

function formatAxisValue(value, max) {
  if (max <= 5) {
    return Number(value).toFixed(1).replace(/\.0$/, '');
  }

  if (max >= 1000) {
    return new Intl.NumberFormat('en-IN', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  return Number.isInteger(value) ? String(value) : Number(value).toFixed(1).replace(/\.0$/, '');
}

function buildYAxisTicks(max, segments = 4) {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const ratio = (segments - index) / segments;
    const value = max * ratio;
    return {
      ratio,
      value,
    };
  });
}

function polarToCartesian(cx, cy, radius, angle) {
  const radians = (angle - 90) * (Math.PI / 180);
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  if (Math.abs(endAngle - startAngle) >= 359.99) {
    return null;
  }

  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function SparklineChart({ data = [] }) {
  const chartId = useId().replace(/:/g, '');

  if (!data.length) return <EmptyChart message="No trend data" />;

  const width = 160;
  const height = 52;
  const padding = 6;
  const points = buildChartPoints(data, width, height, padding);
  const path = buildLinePath(points);
  const areaPath = buildAreaPath(points, height, padding);
  const finalPoint = points[points.length - 1];

  return (
    <svg className="sparkline-chart" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`sparkline-fill-${chartId}`} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
        </linearGradient>
      </defs>

      <motion.path
        animate={{ opacity: 1 }}
        d={areaPath}
        fill={`url(#sparkline-fill-${chartId})`}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.45 }}
      />
      <motion.path
        animate={{ pathLength: 1, opacity: 1 }}
        d={path}
        fill="none"
        initial={{ pathLength: 0, opacity: 0.35 }}
        stroke="#7dd3fc"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
      {finalPoint ? (
        <motion.circle
          animate={{ scale: 1, opacity: 1 }}
          cx={finalPoint.x}
          cy={finalPoint.y}
          fill="#f8fafc"
          initial={{ scale: 0.4, opacity: 0 }}
          r="3.6"
          stroke="#38bdf8"
          strokeWidth="2"
          transition={{ delay: 0.38, duration: 0.22 }}
        />
      ) : null}
    </svg>
  );
}

export function LineTrendChart({ data = [], emptyMessage = 'No data available' }) {
  const chartId = useId().replace(/:/g, '');

  if (!data.length) return <EmptyChart message={emptyMessage} />;

  const width = Math.max(360, data.length * 68);
  const height = 220;
  const padding = { top: 10, right: 16, bottom: 16, left: 52 };
  const max = getMaxValue(data);
  const yAxisTicks = buildYAxisTicks(max);
  const points = buildChartPoints(data, width, height, padding);
  const linePath = buildLinePath(points);
  const areaPath = buildAreaPath(points, height, padding);
  const labels = data.map(point => point.label);
  const activePoint = points[points.length - 1];

  return (
    <div className="chart-scroll-shell">
      <div className="chart-svg-shell" style={{ minWidth: width }}>
        <div className="chart-surface">
          <svg className="trend-chart" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <linearGradient id={`trend-fill-${chartId}`} x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
              <filter id={`trend-glow-${chartId}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur result="blurred" stdDeviation="6" />
                <feMerge>
                  <feMergeNode in="blurred" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g className="chart-grid">
              <line
                className="chart-axis-line"
                x1={padding.left}
                x2={padding.left}
                y1={padding.top}
                y2={height - padding.bottom}
              />
              {yAxisTicks.map(tick => {
                const y = padding.top + (height - padding.top - padding.bottom) * (1 - tick.ratio);
                return (
                  <g key={tick.ratio}>
                    <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
                    <text
                      className="chart-y-axis-label"
                      textAnchor="end"
                      x={padding.left - 10}
                      y={y + 4}
                    >
                      {formatAxisValue(tick.value, max)}
                    </text>
                  </g>
                );
              })}
            </g>

            <motion.path
              animate={{ opacity: 1 }}
              d={areaPath}
              fill={`url(#trend-fill-${chartId})`}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
            />
            <motion.path
              animate={{ pathLength: 1, opacity: 1 }}
              d={linePath}
              fill="none"
              filter={`url(#trend-glow-${chartId})`}
              initial={{ pathLength: 0, opacity: 0.35 }}
              stroke="#38bdf8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />

            {points.map((point, index) => (
              <motion.circle
                key={`${point.label}-${index}`}
                animate={{ scale: 1, opacity: 1 }}
                className="trend-point"
                cx={point.x}
                cy={point.y}
                fill="#f8fafc"
                initial={{ scale: 0.4, opacity: 0 }}
                r={index === points.length - 1 ? 5 : 4}
                stroke="#38bdf8"
                strokeWidth="2.5"
                transition={{ delay: 0.15 + index * 0.05, duration: 0.22 }}
              />
            ))}

            {activePoint ? (
              <motion.g
                animate={{ opacity: 1, y: 0 }}
                className="chart-callout"
                initial={{ opacity: 0, y: 8 }}
                transition={{ delay: 0.4, duration: 0.25 }}
                transform={`translate(${activePoint.x}, ${Math.max(activePoint.y - 24, padding.top + 10)})`}
              >
                <rect
                  fill="rgba(15, 23, 42, 0.92)"
                  height="24"
                  rx="12"
                  width={String(activePoint.value).length > 4 ? 58 : 46}
                  x={String(activePoint.value).length > 4 ? -29 : -23}
                  y="-20"
                />
                <text fill="#f8fafc" textAnchor="middle" y="-4">
                  {activePoint.value}
                </text>
              </motion.g>
            ) : null}
          </svg>
        </div>

        <div
          className="chart-axis-labels"
          style={{
            gridTemplateColumns: `repeat(${labels.length}, minmax(52px, 1fr))`,
            paddingLeft: `${padding.left}px`,
            paddingRight: `${padding.right}px`,
          }}
        >
          {labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
        </div>
      </div>
    </div>
  );
}

export function BarTrendChart({ data = [], emptyMessage = 'No data available', valueFormatter }) {
  if (!data.length) return <EmptyChart message={emptyMessage} />;

  const max = getMaxValue(data);

  return (
    <div className="chart-scroll-shell">
      <div
        className="bar-chart"
        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(68px, 1fr))`, minWidth: Math.max(320, data.length * 74) }}
      >
        {data.map((point, index) => {
          const height = Math.max(((Number(point.value) || 0) / max) * 100, 4);

          return (
            <div key={`${point.label}-${index}`} className="bar-chart-item">
              <div className="bar-chart-column">
                <motion.div
                  animate={{ height: `${height}%`, opacity: 1 }}
                  className="bar-chart-fill"
                  initial={{ height: '0%', opacity: 0.4 }}
                  transition={{ delay: index * 0.06, duration: 0.45, ease: 'easeOut' }}
                />
              </div>
              <span className="bar-chart-value">{valueFormatter ? valueFormatter(point.value) : point.value}</span>
              <span className="bar-chart-label">{point.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PieBreakdownChart({ data = [] }) {
  if (!data.length) return <EmptyChart message="No category data available" />;

  const palette = ['#38bdf8', '#f59e0b', '#34d399', '#f472b6', '#a78bfa', '#fb7185', '#2dd4bf'];
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0) || 1;
  let startAngle = 0;

  return (
    <div className="pie-chart-layout">
      <div className="pie-chart-shell">
        <svg className="pie-chart-svg" viewBox="0 0 120 120">
          <circle cx="60" cy="60" fill="none" r="38" stroke="rgba(148, 163, 184, 0.12)" strokeWidth="18" />
          {data.map((item, index) => {
            const share = (Number(item.value) || 0) / total;
            const endAngle = startAngle + share * 360;
            const color = palette[index % palette.length];
            const path = describeArc(60, 60, 38, startAngle, endAngle);
            const element = path ? (
              <motion.path
                key={item.label}
                animate={{ pathLength: 1, opacity: 1 }}
                d={path}
                fill="none"
                initial={{ pathLength: 0, opacity: 0.45 }}
                stroke={color}
                strokeLinecap="round"
                strokeWidth="18"
                transition={{ delay: index * 0.08, duration: 0.5, ease: 'easeOut' }}
              />
            ) : (
              <motion.circle
                key={item.label}
                animate={{ pathLength: 1, opacity: 1 }}
                cx="60"
                cy="60"
                fill="none"
                initial={{ pathLength: 0, opacity: 0.45 }}
                r="38"
                stroke={color}
                strokeWidth="18"
                transition={{ delay: index * 0.08, duration: 0.5, ease: 'easeOut' }}
              />
            );

            startAngle = endAngle;
            return element;
          })}
          <text className="pie-chart-total-label" textAnchor="middle" x="60" y="55">Books</text>
          <text className="pie-chart-total-value" textAnchor="middle" x="60" y="72">{total}</text>
        </svg>
      </div>

      <div className="pie-chart-legend">
        {data.map((item, index) => {
          const share = Math.round(((Number(item.value) || 0) / total) * 100);

          return (
            <motion.div
              key={item.label}
              animate={{ opacity: 1, x: 0 }}
              className="pie-legend-item"
              initial={{ opacity: 0, x: 10 }}
              transition={{ delay: index * 0.06, duration: 0.22 }}
            >
              <span className="pie-legend-dot" style={{ background: palette[index % palette.length] }} />
              <span className="pie-legend-label">{item.label}</span>
              <span className="pie-legend-value">{`${item.value} | ${share}%`}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function RatingStars({ value = 0 }) {
  const rounded = Math.round(value * 2) / 2;

  return (
    <div className="rating-stars" aria-label={`Average rating ${value}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} className={rounded >= star ? 'filled' : rounded >= star - 0.5 ? 'half' : ''}>{'\u2605'}</span>
      ))}
    </div>
  );
}
