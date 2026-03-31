import React from 'react';
import { motion } from 'framer-motion';
import { RatingStars, SparklineChart } from './SimpleCharts';

function formatTrend(value, direction) {
  if (value == null) return null;
  const prefix = direction === 'up' ? '+' : direction === 'down' ? '' : '';
  return `${prefix}${Math.abs(Number(value)).toFixed(1)}%`;
}

export default function StatCard({
  title,
  value,
  icon,
  accent = 'default',
  subtitle = '',
  trendPercent = null,
  trendDirection = 'flat',
  sparkline = [],
  ratingValue = null,
}) {
  return (
    <motion.article
      className={`dashboard-stat-card ${accent}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      whileHover={{ y: -3 }}
    >
      <div className="dashboard-stat-top">
        <div className="dashboard-stat-icon">{icon}</div>
        {trendPercent != null ? (
          <div className={`dashboard-trend-pill ${trendDirection}`}>
            {formatTrend(trendPercent, trendDirection)}
          </div>
        ) : null}
      </div>
      <p className="dashboard-stat-label">{title}</p>
      <div className="dashboard-stat-value">{value}</div>
      {ratingValue != null ? (
        <div className="dashboard-rating-block">
          <RatingStars value={ratingValue} />
          <span>{ratingValue.toFixed(1)} ★</span>
        </div>
      ) : null}
      {subtitle ? <p className="dashboard-stat-subtitle">{subtitle}</p> : null}
      {sparkline.length > 1 ? (
        <div className="dashboard-sparkline-wrap">
          <SparklineChart data={sparkline} />
        </div>
      ) : null}
    </motion.article>
  );
}
