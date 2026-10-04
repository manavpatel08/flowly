'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  requiredRole?: string | string[];
}

export function AppLayout({
  children,
  title,
  subtitle,
  requiredRole,
}: AppLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm font-medium">Loading Fernleaf Operations...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check role authorization
  if (requiredRole) {
    const allowed = Array.isArray(requiredRole)
      ? requiredRole.includes(user.role)
      : user.role === requiredRole;

    if (!allowed && user.role !== 'ADMIN') {
      return (
        <div className="flex min-h-screen bg-slate-950">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header title="Access Denied" />
            <main className="flex-1 p-8 flex items-center justify-center">
              <div className="max-w-md w-full bg-slate-900 border border-rose-900/60 p-6 rounded-2xl text-center">
                <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center justify-center mx-auto mb-4 text-xl">
                  🔒
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  Unauthorized Access
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Your current role (<span className="text-slate-200 font-bold">{user.role}</span>) does not have permission to view this view.
                </p>
                <button
                  onClick={() => router.push(user.role === 'DRIVER' ? '/driver' : user.role === 'KITCHEN' ? '/kitchen' : '/dashboard')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  Return to Authorized Portal
                </button>
              </div>
            </main>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
