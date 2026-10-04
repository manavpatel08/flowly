'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  ShoppingBag,
  PlusCircle,
  Filter,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/companies?pageSize=100');
      setCompanies(res.data || res.items || []);
    } catch {
      // ignore
    }
  };

  const fetchOrders = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
      });

      if (statusFilter && statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (selectedCompanyId) {
        params.append('companyId', selectedCompanyId);
      }

      const res = await api.get(`/orders?${params.toString()}`);
      setOrders(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
      setPage(targetPage);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchOrders(1);
  }, [statusFilter, selectedCompanyId]);

  const handlePlaceOrder = async (orderId: string) => {
    try {
      await api.post(`/orders/${orderId}/place`);
      setSuccess(`Order #${orderId.slice(-6)} placed successfully!`);
      fetchOrders(page);
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await api.post(`/orders/${orderId}/cancel`);
      setSuccess(`Order #${orderId.slice(-6)} cancelled.`);
      fetchOrders(page);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order');
    }
  };

  return (
    <AppLayout
      title="Orders Management"
      subtitle="View, track, place, and cancel corporate catering orders"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Orders Registry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Showing {total} orders recorded across all companies
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchOrders(page)}
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

      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertBanner type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PLACED">PLACED</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        {/* Company Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Company:
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-xs"
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Order ID</th>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Company</th>
                <th className="px-5 py-3.5">Delivery Schedule</th>
                <th className="px-5 py-3.5">Items</th>
                <th className="px-5 py-3.5">Total</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    <span>Loading orders...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-800/40 transition duration-150"
                  >
                    <td className="px-5 py-3.5 font-mono text-slate-400 font-medium">
                      #{order.id.slice(-6)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-white">
                      {order.employee?.name || 'Unknown'}
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
                    <td className="px-5 py-3.5 text-slate-400">
                      {order.combinations?.length || 0} items
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-white">
                      ₹{(order.totalInPaise / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        <span>View</span>
                      </Link>

                      {order.status === 'DRAFT' && (
                        <button
                          onClick={() => handlePlaceOrder(order.id)}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded-lg border border-emerald-800 transition"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          <span>Place</span>
                        </button>
                      )}

                      {(order.status === 'DRAFT' || order.status === 'PLACED') && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-lg border border-rose-800/80 transition"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchOrders(page - 1)}
                disabled={page <= 1 || loading}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchOrders(page + 1)}
                disabled={page >= totalPages || loading}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
