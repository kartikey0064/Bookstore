import React from 'react';

const FILTER_OPTIONS = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'custom', label: 'Custom' },
];

export default function DashboardFilter({
  activeFilter = '7d',
  customStartDate = '',
  customEndDate = '',
  error = '',
  loading = false,
  onCustomEndChange,
  onCustomStartChange,
  onFilterChange,
  onPresetSelect,
}) {
  return (
    <div className="dashboard-filter-shell">
      <div className="dashboard-filter-segment" role="tablist" aria-label="Dashboard date range">
        {FILTER_OPTIONS.map(option => (
          <button
            key={option.id}
            className={`dashboard-filter-chip ${activeFilter === option.id ? 'active' : ''}`}
            disabled={loading}
            onClick={() => onPresetSelect?.(option.id)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      {activeFilter === 'custom' ? (
        <div className="dashboard-filter-custom">
          <label className="dashboard-filter-date">
            <span>Start date</span>
            <input
              className="input-field"
              disabled={loading}
              onChange={event => onCustomStartChange?.(event.target.value)}
              type="date"
              value={customStartDate}
            />
          </label>
          <label className="dashboard-filter-date">
            <span>End date</span>
            <input
              className="input-field"
              disabled={loading}
              onChange={event => onCustomEndChange?.(event.target.value)}
              type="date"
              value={customEndDate}
            />
          </label>
          <button
            className="btn-primary dashboard-filter-apply"
            disabled={loading || !customStartDate || !customEndDate}
            onClick={() => onFilterChange?.(customStartDate, customEndDate)}
            type="button"
          >
            {loading ? 'Applying...' : 'Apply'}
          </button>
        </div>
      ) : null}

      {error ? <p className="dashboard-filter-error">{error}</p> : null}
    </div>
  );
}
