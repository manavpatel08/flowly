import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const normalized = status.toUpperCase();

  let styles = 'bg-slate-800 text-slate-300 border-slate-700';

  switch (normalized) {
    // Order states
    case 'DRAFT':
      styles = 'bg-slate-800/80 text-slate-300 border-slate-700';
      break;
    case 'PLACED':
      styles = 'bg-amber-950/60 text-amber-300 border-amber-800/80';
      break;
    case 'CONFIRMED':
      styles = 'bg-blue-950/60 text-blue-300 border-blue-800/80';
      break;
    case 'DELIVERED':
      styles = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80';
      break;
    case 'CANCELLED':
    case 'REJECTED':
      styles = 'bg-rose-950/60 text-rose-300 border-rose-800/80';
      break;

    // Kitchen states
    case 'PENDING':
      styles = 'bg-yellow-950/60 text-yellow-300 border-yellow-800/80';
      break;
    case 'STARTED':
      styles = 'bg-cyan-950/60 text-cyan-300 border-cyan-800/80 animate-pulse';
      break;
    case 'DONE':
      styles = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80';
      break;

    // Drop states
    case 'KITCHEN_READY':
      styles = 'bg-indigo-950/60 text-indigo-300 border-indigo-800/80';
      break;
    case 'DISPATCH_READY':
      styles = 'bg-purple-950/60 text-purple-300 border-purple-800/80';
      break;
    case 'OUT_FOR_DELIVERY':
      styles = 'bg-amber-950/60 text-amber-300 border-amber-800/80';
      break;

    default:
      styles = 'bg-slate-800 text-slate-300 border-slate-700';
  }

  const sizeClasses =
    size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm font-medium';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${styles} ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {normalized.replace(/_/g, ' ')}
    </span>
  );
}
