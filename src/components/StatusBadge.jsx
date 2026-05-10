import React from 'react';
import './StatusBadge.css';

const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
  converted: 'Converted',
};

const StatusBadge = ({ status }) => {
  const key = (status || 'draft').toLowerCase();
  const label = STATUS_LABELS[key] || status;
  const knownKey = STATUS_LABELS[key] ? key : 'unknown';
  return <span className={`status-badge status-${knownKey}`}>{label}</span>;
};

export default StatusBadge;
