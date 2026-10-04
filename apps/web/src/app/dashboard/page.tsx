'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  ShoppingBag,
  ChefHat,
  Truck,
  CheckCircle,
  Receipt,
  PlusCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalOrders: 0,
    placedOrders: 0,
    confirmedOrders: 0,
    deliveredOrders: 0,
    kitchenActive: 0,
    outForDelivery: 0,
    totalRevenuePaise: 0,
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Orders list
      const ordersRes = await api.get('/orders?pageSize=10');
      const orders = ordersRes.items || [];
      const totalOrdersCount = ordersRes.total || 0;

      let placed = 0;
      let confirmed = 0;
      let delivered = 0;
      let revenue = 0;

      orders.forEach((o: any) => {
        if (o.status === 'PLACED' || o.status === 'DRAFT') placed++;
        if (o.status === 'CONFIRMED') confirmed++;
        if (o.status === 'DELIVERED') delivered++;
        revenue += o.totalInPaise || 0;
      });

      // 2. Fetch Kitchen queue
      let kitchenActiveCount = 0;
      try {
        const kitchenRes = await api.get('/kitchen/queue');
        kitchenActiveCount = Array.isArray(kitchenRes) ? kitchenRes.length : 0;
      } catch {
        // Kitchen read might be restricted if role doesn't have it
      }

      // 3. Fetch Drops count
      let outForDeliveryCount = 0;
      try {
        const dropsRes = await api.get('/drops?status=OUT_FOR_DELIVERY');
        outForDeliveryCount = dropsRes.total || 0;
      } catch {
        // Dispatch read might be restricted
      }

      setStats({
        totalOrders: totalOrdersCount,
        placedOrders: placed,
        confirmedOrders: confirmed,
        deliveredOrders: delivered,
        kitchenActive: kitchenActiveCount,
        outForDelivery: outForDeliveryCount,
        totalRevenuePaise: revenue,
      });

      setRecentOrders(orders.slice(0, 6));
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <AppLayout
      title="Operations Command Center"
      subtitle="Real-time order fulfillment, kitchen stations, and dispatch tracking"
    >
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Live Operations Overview
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Snapshot across companies, kitchen stations, drops, and deliveries
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {user?.role === 'ADMIN' && (
            <Link
              href="/orders/create"
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-emerald-500/20 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Order</span>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-rose-950/40 border border-rose-900 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          subtitle="All-time processed"
          icon={<ShoppingBag className="w-5 h-5" />}
          accent="blue"
        />
        <StatCard
          title="Pending Cutoff"
          value={stats.placedOrders}
          subtitle="DRAFT or PLACED"
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          accent="amber"
        />
        <StatCard
          title="Kitchen Queue"
          value={stats.kitchenActive}
          subtitle="Pending / Cooking"
          icon={<ChefHat className="w-5 h-5 text-cyan-400" />}
          accent="purple"
        />
        <StatCard
          title="Out For Delivery"
          value={stats.outForDelivery}
          subtitle="En-route with drivers"
          icon={<Truck className="w-5 h-5 text-emerald-400" />}
          accent="emerald"
        />
      </div>

      {/* Recent Activity Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Orders</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Latest corporate catering orders and state transitions
            </p>
          </div>
          <Link
            href="/orders"
            className="flex items-center space-x-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Order ID</th>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Company</th>
                <th className="px-5 py-3.5">Delivery Window</th>
                <th className="px-5 py-3.5">Total</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    No orders recorded yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-800/40 transition duration-150"
                  >
                    <td className="px-5 py-3.5 font-mono text-slate-400 font-medium">
                      #{order.id.slice(-6)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-white">
                      {order.employee?.name || 'Unknown Employee'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {order.company?.name || 'Corporate'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {order.deliveryDate
                        ? new Date(order.deliveryDate).toLocaleDateString()
                        : '-'}{' '}
                      at <span className="font-semibold">{order.deliveryTime}</span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-white">
                      ₹{(order.totalInPaise / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/orders/${order.id}`}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
