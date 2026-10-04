import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'slate';
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = 'blue',
}: StatCardProps) {
  const accentBorder = {
    blue: 'border-l-blue-500',
    emerald: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    purple: 'border-l-purple-500',
    rose: 'border-l-rose-500',
    slate: 'border-l-slate-500',
  }[accent];

  return (
    <div
      className={`bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm border-l-4 ${accentBorder} flex items-start justify-between`}
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </p>
        <p className="text-2xl font-bold text-white mt-1.5">{value}</p>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
      {icon && (
        <div className="p-2.5 rounded-lg bg-slate-800/80 text-slate-300">
          {icon}
        </div>
      )}
    </div>
  );
}
