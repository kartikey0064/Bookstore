import React from 'react';
import { motion } from 'framer-motion';

export default function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <motion.section
      className={`dashboard-chart-card ${className}`.trim()}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -3 }}
    >
      <div className="dashboard-card-header">
        <div>
          <p className="dashboard-card-title">{title}</p>
          {subtitle ? <p className="dashboard-card-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      <div className="dashboard-chart-body">
        {children}
      </div>
    </motion.section>
  );
}
