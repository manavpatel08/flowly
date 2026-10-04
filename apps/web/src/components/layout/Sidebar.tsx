'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Truck,
  Receipt,
  LogOut,
  ShoppingBag,
  ChefHat,
  PlusCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const role = user.role;

  // Role-based navigation items
  const navItems = [];

  if (role === 'ADMIN') {
    navItems.push(
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Orders', href: '/orders', icon: ShoppingBag },
      { label: 'Create Order', href: '/orders/create', icon: PlusCircle },
      { label: 'Kitchen Queue', href: '/kitchen', icon: ChefHat },
      { label: 'Dispatch & Drops', href: '/dispatch', icon: Truck },
      { label: 'Billing & Invoices', href: '/billing', icon: Receipt },
    );
  } else if (role === 'KITCHEN') {
    navItems.push(
      { label: 'Kitchen Queue', href: '/kitchen', icon: ChefHat },
    );
  } else if (role === 'DISPATCH') {
    navItems.push(
      { label: 'Orders', href: '/orders', icon: ShoppingBag },
      { label: 'Dispatch & Drops', href: '/dispatch', icon: Truck },
    );
  } else if (role === 'DRIVER') {
    navItems.push(
      { label: 'My Deliveries', href: '/driver', icon: Truck },
    );
  }

  const roleColor = {
    ADMIN: 'bg-purple-950/70 text-purple-300 border-purple-800',
    KITCHEN: 'bg-amber-950/70 text-amber-300 border-amber-800',
    DISPATCH: 'bg-blue-950/70 text-blue-300 border-blue-800',
    DRIVER: 'bg-emerald-950/70 text-emerald-300 border-emerald-800',
  }[role] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <aside className="w-64 bg-slate-950/95 border-r border-slate-800/80 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-lg">
            🍃
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight leading-none">
              Fernleaf
            </h1>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none block mt-1">
              Kitchen Ops
            </span>
          </div>
        </Link>
      </div>

      {/* Role Pill */}
      <div className="px-6 pt-5 pb-2">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">
          <span>Active Role</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${roleColor}`}
          >
            {role}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' &&
              item.href !== '/orders' &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? 'text-emerald-400' : 'text-slate-400'
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer & Logout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="overflow-hidden pr-2">
            <p className="text-xs font-medium text-white truncate">
              {user.email}
            </p>
            <p className="text-[11px] text-slate-500">Authenticated Session</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-semibold text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 rounded-lg transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
