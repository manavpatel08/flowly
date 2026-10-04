'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  RefreshCw,
  ShoppingBag,
  User,
  XCircle,
  Building,
  FileText,
} from 'lucide-react';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const handlePlace = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await api.post(`/orders/${id}/place`);
      setSuccess('Order placed successfully!');
      fetchOrder();
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.post(`/orders/${id}/cancel`);
      setSuccess('Order cancelled.');
      fetchOrder();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Order Details">
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
          <p className="text-sm">Loading order #{id}...</p>
        </div>
      </AppLayout>
    );
  }

  if (!order) {
    return (
      <AppLayout title="Order Details">
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <p className="text-slate-400 mb-4">Order not found.</p>
          <Link
            href="/orders"
            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg"
          >
            Back to Orders
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Order #${order.id.slice(-6)}`} subtitle="Historical snapshot & timeline">
      {/* Back button & Actions header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Link
          href="/orders"
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition space-x-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Orders</span>
        </Link>

        <div className="flex items-center space-x-3">
          <StatusBadge status={order.status} size="md" />

          {order.status === 'DRAFT' && (
            <button
              onClick={handlePlace}
              disabled={actionLoading}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white rounded-xl shadow-lg shadow-emerald-500/20 transition"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Place Order</span>
            </button>
          )}

          {(order.status === 'DRAFT' || order.status === 'PLACED') && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-950/70 hover:bg-rose-900/80 border border-rose-800 text-xs font-semibold text-rose-300 rounded-xl transition"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel Order</span>
            </button>
          )}
        </div>
      </div>

      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertBanner type="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Order Combinations & Snapshots */}
        <div className="lg:col-span-2 space-y-6">
          {/* Combinations / Items Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>Ordered Items (Historical Snapshots)</span>
            </h3>

            <div className="divide-y divide-slate-800">
              {order.combinations?.map((comb: any) => {
                const optionsTotal =
                  comb.combinationOptions?.reduce(
                    (sum: number, o: any) => sum + (o.priceInPaise || 0),
                    0,
                  ) || 0;
                const unitTotal = comb.unitPriceInPaise + optionsTotal;
                const lineTotal = unitTotal * comb.quantity;

                return (
                  <div key={comb.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-white text-sm">
                            {comb.dishNameSnapshot}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                            Qty: {comb.quantity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          Base unit price: ₹{(comb.unitPriceInPaise / 100).toFixed(2)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-white text-sm">
                          ₹{(lineTotal / 100).toFixed(2)}
                        </span>
                        <p className="text-[11px] text-slate-500 font-mono">
                          (₹{(unitTotal / 100).toFixed(2)} each)
                        </p>
                      </div>
                    </div>

                    {/* Options list */}
                    {comb.combinationOptions && comb.combinationOptions.length > 0 && (
                      <div className="mt-2.5 pl-3 border-l-2 border-slate-800 space-y-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Selected Options:
                        </p>
                        {comb.combinationOptions.map((opt: any) => (
                          <div
                            key={opt.id}
                            className="flex items-center justify-between text-xs text-slate-300"
                          >
                            <span>+ {opt.optionNameSnapshot}</span>
                            <span className="font-mono text-slate-400">
                              +₹{(opt.priceInPaise / 100).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {comb.notes && (
                      <p className="mt-2 text-xs text-amber-300/90 bg-amber-950/30 border border-amber-900/50 p-2 rounded-lg">
                        <span className="font-semibold">Note:</span> {comb.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total Footer */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-base">
              <span className="font-semibold text-slate-300">Final Order Total</span>
              <span className="font-extrabold text-emerald-400 text-xl font-mono">
                ₹{(order.totalInPaise / 100).toFixed(2)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 text-right mt-1">
              {order.totalInPaise} integer paise (locked server-side)
            </p>
          </div>

          {/* Delivery & Address Snapshot */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>Delivery Address Snapshot</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Recipient Label</p>
                <p className="text-white font-semibold text-sm mt-0.5">
                  {order.addressLabelSnapshot}
                </p>
                <p className="text-slate-300 mt-1">{order.addressLine1Snapshot}</p>
                {order.addressLine2Snapshot && (
                  <p className="text-slate-300">{order.addressLine2Snapshot}</p>
                )}
                <p className="text-slate-400 mt-1">
                  {order.citySnapshot} — {order.pincodeSnapshot}
                </p>
              </div>

              <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-800 md:pl-4 pt-3 md:pt-0">
                <div>
                  <p className="text-slate-400 font-medium">Delivery Schedule</p>
                  <p className="text-white font-semibold mt-0.5">
                    {order.deliveryDate
                      ? new Date(order.deliveryDate).toLocaleDateString()
                      : '-'}{' '}
                    at {order.deliveryTime}
                  </p>
                </div>
                {order.packaging && (
                  <div>
                    <p className="text-slate-400 font-medium">Packaging</p>
                    <p className="text-slate-300 mt-0.5">{order.packaging}</p>
                  </div>
                )}
                {order.driverInstructions && (
                  <div>
                    <p className="text-slate-400 font-medium">Driver Instructions</p>
                    <p className="text-slate-300 mt-0.5">{order.driverInstructions}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Customer & Audit Trail */}
        <div className="space-y-6">
          {/* Customer / Corporate Profile */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
              <Building className="w-4 h-4 text-purple-400" />
              <span>Customer Details</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400">Company</span>
                <p className="font-semibold text-white text-sm">
                  {order.company?.name || 'Corporate Account'}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Employee</span>
                <p className="font-medium text-slate-200">
                  {order.employee?.name || 'Unknown'}
                </p>
                <p className="text-slate-500 font-mono text-[11px]">
                  {order.employee?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline Audit Trail */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>State Audit Timeline</span>
            </h3>

            <div className="space-y-4 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-800">
              {order.timelines?.map((timeline: any) => (
                <div key={timeline.id} className="relative flex items-start space-x-3 text-xs">
                  <div className="w-5 h-5 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center shrink-0 z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div>
                    <StatusBadge status={timeline.status} />
                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(timeline.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
