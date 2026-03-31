import React from 'react';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-IN') : '--';
}

export default function OrdersTable({
  orders = [],
  emptyMessage = 'No orders yet.',
  showSubtotal = true,
  showStatusControl = false,
  statusOptions = [],
  statusSaving = {},
  onStatusChange,
  compactIdLength = 10,
}) {
  if (!orders.length) {
    return (
      <div className="empty-state">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card orders-table-card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Items</th>
            {showSubtotal ? <th>Subtotal</th> : null}
            <th>Total</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td style={{ fontFamily: 'monospace', fontSize: '.75rem' }}>
                {String(order.id || '').slice(-compactIdLength)}
              </td>
              <td style={{ fontSize: '.85rem' }}>{order.userEmail}</td>
              <td style={{ fontSize: '.85rem' }}>
                {(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}
              </td>
              {showSubtotal ? <td>₹{Number(order.subtotal || 0).toFixed(0)}</td> : null}
              <td style={{ fontWeight: 700, color: 'var(--gold)' }}>₹{Number(order.total || 0).toFixed(0)}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className={`status-badge ${String(order.status || '').toLowerCase()}`}>{order.status}</span>
                  {showStatusControl ? (
                    <select
                      className="status-select"
                      disabled={Boolean(statusSaving[order.id])}
                      onChange={event => onStatusChange?.(order.id, event.target.value)}
                      value={order.status || 'Processing'}
                    >
                      {statusOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </td>
              <td style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                {formatDate(order.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
