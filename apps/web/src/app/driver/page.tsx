'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Truck,
  CheckCircle2,
  RefreshCw,
  Clock,
  MapPin,
  Building,
  FileText,
  Navigation,
  Check,
} from 'lucide-react';

export default function DriverPage() {
  const { user } = useAuth();
  const [drops, setDrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Mark Delivered Modal
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [selectedDropId, setSelectedDropId] = useState<string | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('Delivered to reception');

  const fetchDriverDrops = async () => {
    setLoading(true);
    setError(null);
    try {
      // Calls authenticated driver endpoint directly
      const res = await api.get('/driver/drops/today');
      setDrops(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned drops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverDrops();
  }, []);

  const openDeliverModal = (dropId: string) => {
    setSelectedDropId(dropId);
    setDeliverModalOpen(true);
  };

  const handleDeliver = async () => {
    if (!selectedDropId) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.post(`/driver/drops/${selectedDropId}/delivered`, {
        deliveryNote: deliveryNote.trim() || undefined,
      });
      setSuccess('Drop marked DELIVERED successfully! Orders marked complete.');
      setDeliverModalOpen(false);
      fetchDriverDrops();
    } catch (err: any) {
      setError(err.message || 'Failed to complete delivery');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppLayout
      title="Driver Delivery Manifest"
      subtitle="Isolated fleet portal for authenticated delivery personnel"
      requiredRole={['ADMIN', 'DRIVER']}
    >
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Navigation className="w-5 h-5 text-emerald-400" />
            <span>Today&apos;s Assigned Routes</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Driver: <span className="text-emerald-400 font-semibold">{user?.email}</span>
          </p>
        </div>

        <button
          onClick={fetchDriverDrops}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Manifest</span>
        </button>
      </div>

      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertBanner type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Driver Drops List */}
      {loading && drops.length === 0 ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-400" />
          <p className="text-sm">Fetching your assigned deliveries...</p>
        </div>
      ) : drops.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl max-w-lg mx-auto">
          <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">
            No Assigned Drops Today
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Dispatch has not assigned active route drops to your account yet. Check back when orders are dispatched.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl">
          {drops.map((drop) => {
            const isDelivered = drop.status === 'DELIVERED';
            const canDeliver = drop.status === 'OUT_FOR_DELIVERY';

            return (
              <div
                key={drop.id}
                className={`bg-slate-900/90 border rounded-2xl p-6 shadow-sm transition ${isDelivered
                    ? 'border-emerald-800/80 bg-slate-950/40 opacity-80'
                    : 'border-slate-800'
                  }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-slate-400">
                        Drop #{drop.id.slice(-6)}
                      </span>
                      <StatusBadge status={drop.status} />
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {drop.company?.name}
                    </h3>
                  </div>

                  <div className="text-right sm:self-center">
                    <span className="text-xs text-slate-400 block">
                      Target Time
                    </span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {drop.deliveryTime}
                    </span>
                  </div>
                </div>

                {/* Delivery Address Box */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl mb-4 text-xs space-y-1">
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">
                        {drop.companyAddress?.label || 'Corporate Office'}
                      </p>
                      <p className="text-slate-300">
                        {drop.companyAddress?.addressLine1}
                        {drop.companyAddress?.addressLine2
                          ? `, ${drop.companyAddress.addressLine2}`
                          : ''}
                      </p>
                      <p className="text-slate-400">
                        {drop.companyAddress?.city} — {drop.companyAddress?.pincode}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contained Orders */}
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Included Catering Orders ({drop.dropOrders?.length || 0}):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {drop.dropOrders?.map((doItem: any) => (
                      <div
                        key={doItem.id}
                        className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <span className="font-medium text-white">
                            {doItem.order?.employee?.name}
                          </span>
                          {doItem.order?.packaging && (
                            <span className="text-[10px] text-slate-400 block">
                              Pack: {doItem.order.packaging}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-slate-400">
                          ₹{((doItem.order?.totalInPaise || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <div className="flex items-center justify-end pt-3 border-t border-slate-800">
                  {canDeliver ? (
                    <button
                      onClick={() => openDeliverModal(drop.id)}
                      className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-emerald-500/20 transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Delivery</span>
                    </button>
                  ) : isDelivered ? (
                    <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold">
                      <Check className="w-4 h-4" />
                      <span>Delivered Successfully</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">
                      Awaiting dispatch departure before delivery can be marked.
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Delivery Modal */}
      <Modal
        isOpen={deliverModalOpen}
        onClose={() => setDeliverModalOpen(false)}
        title="Complete Delivery Handover"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400">
            Confirm that the packages have been physically handed over to the corporate recipient:
          </p>

          <div>
            <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Delivery Proof / Note (Optional)
            </label>
            <input
              type="text"
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder="e.g. Left with security, Front desk signed"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3">
            <button
              onClick={() => setDeliverModalOpen(false)}
              className="px-3 py-2 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleDeliver}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg transition"
            >
              Mark As Delivered
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
