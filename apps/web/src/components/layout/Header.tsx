'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Clock, RefreshCw, Zap } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth();
  const [cutoffModalOpen, setCutoffModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunCutoff = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post('/cutoff/run', { force: true });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to execute cutoff');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="h-16 px-8 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <div>
          {title && (
            <h2 className="text-lg font-semibold text-white tracking-tight">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Quick Cutoff Trigger (Admin only) */}
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => {
                setCutoffModalOpen(true);
                setError(null);
                setResult(null);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/60 rounded-lg transition shadow-sm"
              title="Trigger Asia/Kolkata Business Cutoff"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Run Cutoff</span>
            </button>
          )}

          {/* Backend Status indicator */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-300">API Live</span>
          </div>
        </div>
      </header>

      {/* Cutoff Trigger Modal */}
      <Modal
        isOpen={cutoffModalOpen}
        onClose={() => setCutoffModalOpen(false)}
        title="Execute Business Cutoff (Asia/Kolkata)"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Running cutoff triggers the business rule transitions for today's orders:
          </p>
          <ul className="text-xs space-y-1 text-slate-300 list-disc list-inside bg-slate-950/50 p-3 rounded-lg border border-slate-800">
            <li>
              <span className="font-semibold text-amber-300">DRAFT</span> →{' '}
              <span className="font-semibold text-rose-300">CANCELLED</span>
            </li>
            <li>
              <span className="font-semibold text-amber-300">PLACED</span> →{' '}
              <span className="font-semibold text-blue-300">CONFIRMED</span>
            </li>
            <li>Spawns <span className="font-semibold text-emerald-300">Kitchen Units</span> for confirmed combinations.</li>
            <li>Idempotent operation (safe to run multiple times).</li>
          </ul>

          {error && <AlertBanner type="error" message={error} />}

          {result && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-emerald-300">
                ✅ Cutoff Executed Successfully
              </p>
              <p className="text-slate-300">
                Confirmed Orders: <span className="font-bold text-white">{result.confirmedCount}</span>
              </p>
              <p className="text-slate-300">
                Cancelled Orders: <span className="font-bold text-white">{result.cancelledCount}</span>
              </p>
              <p className="text-slate-400 text-[10px]">
                Execution Time: {result.executionTimeKolkata}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={() => setCutoffModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={handleRunCutoff}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg transition shadow-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Execute Cutoff Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
