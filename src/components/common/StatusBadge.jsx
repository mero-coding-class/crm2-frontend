import React from 'react';
import { getStatusColor, getSubStatusColor } from '../../utils/statusColors';

const STATUS_CLASSES = {
  Active:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  Converted:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  Lost:       'bg-rose-50 text-rose-600 border-rose-200',
  New:        'bg-sky-50 text-sky-700 border-sky-200',
  Open:       'bg-blue-50 text-blue-700 border-blue-200',
  Followup:   'bg-amber-50 text-amber-700 border-amber-200',
  inProgress: 'bg-violet-50 text-violet-700 border-violet-200',
  Average:    'bg-slate-100 text-slate-600 border-slate-200',
  Interested: 'bg-teal-50 text-teal-700 border-teal-200',
  Junk:       'bg-red-50 text-red-500 border-red-200',
  NextBatch:  'bg-orange-50 text-orange-600 border-orange-200',
};

const getClass = (status) =>
  STATUS_CLASSES[status] || 'bg-slate-100 text-slate-600 border-slate-200';

export const StatusBadge = ({
  status,
  type = 'status',
  onChange,
  className = '',
  disabled = false,
  isLoading = false,
  error = null
}) => {
  const options = type === 'status'
    ? ['Active', 'Converted', 'Lost']
    : ['New', 'Open', 'Followup', 'inProgress', 'Average', 'Interested', 'Junk', 'NextBatch'];

  const cls = getClass(status);

  return disabled ? (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-[600] leading-[14px] tracking-[0.04em] uppercase border ${cls} ${className}`}
    >
      {status || '—'}
    </span>
  ) : (
    <select
      value={status || (type === 'status' ? 'Active' : 'New')}
      onChange={onChange}
      className={`appearance-none border rounded-[6px] px-2 py-0.5 text-[11px] font-[600] leading-[14px] tracking-[0.04em] uppercase cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors ${cls} ${className}`}
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
};