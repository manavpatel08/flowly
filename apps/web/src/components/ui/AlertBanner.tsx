import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface AlertBannerProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
}

export function AlertBanner({ type, message, onClose }: AlertBannerProps) {
  if (!message) return null;

  const styles = {
    success: 'bg-emerald-950/70 border-emerald-800 text-emerald-200',
    error: 'bg-rose-950/70 border-rose-800 text-rose-200',
    info: 'bg-blue-950/70 border-blue-800 text-blue-200',
  }[type];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  }[type];

  return (
    <div
      className={`flex items-center justify-between p-3.5 mb-4 rounded-xl border text-sm shadow-sm ${styles} animate-in fade-in duration-150`}
    >
      <div className="flex items-center space-x-2.5">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="font-medium">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 hover:opacity-75 transition rounded"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
