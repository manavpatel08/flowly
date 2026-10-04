'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import {
  Truck,
  Layers,
  UserCheck,
  CheckCircle2,
  RefreshCw,
  Clock,
  MapPin,
  Building,
  Package,
  ArrowRight,
} from 'lucide-react';

export default function DispatchPage() {
  const [drops, setDrops] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Assign Driver Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDropId, setSelectedDropId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState('');
  const [drivers, setDrivers] = useState<any[]>([]);

  const fetchDrops = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/drops?pageSize=50');
      setDrops(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch drops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrops();
  }, []);

  const handleGroupDrops = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.post('/drops/group');
      setSuccess(res.message || 'Orders grouped into delivery drops!');
      fetchDrops();
    } catch (err: any) {
      setError(err.message || 'Failed to group orders');
    } finally {
      setActionLoading(false);
    }
  };

  const openAssignModal = async (dropId: string) => {
    setSelectedDropId(dropId);
    setAssignModalOpen(true);
    try {
      const activeDrivers = await api.get('/drops/drivers');
      const list = Array.isArray(activeDrivers) ? activeDrivers : [];
      setDrivers(list);
      if (list.length > 0) {
        setDriverId(list[0].id);
      }
    } catch {
      setDrivers([]);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDropId || !driverId) return;
    setActionLoading(true);
    try {
      await api.post(`/drops/${selectedDropId}/assign-driver`, { driverId });
      setSuccess('Driver assigned to drop!');
      setAssignModalOpen(false);
      fetchDrops();
    } catch (err: any) {
      setError(err.message || 'Failed to assign driver');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatchReady = async (dropId: string) => {
    try {
      await api.post(`/drops/${dropId}/dispatch-ready`);
      setSuccess('Drop marked Dispatch Ready!');
      fetchDrops();
    } catch (err: any) {
      setError(err.message || 'Failed to move to dispatch ready');
    }
  };

  const handleOutForDelivery = async (dropId: string) => {
    try {
      await api.post(`/drops/${dropId}/out-for-delivery`);
      setSuccess('Drop marked Out For Delivery!');
      fetchDrops();
    } catch (err: any) {
      setError(err.message || 'Failed to mark out for delivery');
    }
  };

  const handleDelivered = async (dropId: string) => {
    try {
      await api.post(`/drops/${dropId}/delivered`, {
        deliveryNote: 'Delivered by operations dispatch manager',
      });
      setSuccess('Drop and contained orders marked Delivered!');
      fetchDrops();
    } catch (err: any) {
      setError(err.message || 'Failed to deliver drop');
    }
  };

  return (
    <AppLayout
      title="Dispatch & Route Drops"
      subtitle="Grouping orders by company address, assign fleet drivers, and delivery execution"
      requiredRole={['ADMIN', 'DISPATCH']}
    >
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Truck className="w-5 h-5 text-blue-400" />
            <span>Delivery Drops</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {total} scheduled route deliveries
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDrops}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleGroupDrops}
            disabled={actionLoading}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white rounded-xl shadow-lg shadow-blue-500/20 transition"
          >
            <Layers className="w-4 h-4" />
            <span>Auto-Group Confirmed Orders</span>
          </button>
        </div>
      </div>

      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertBanner type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Drops Table / Cards */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Drop ID</th>
                <th className="px-5 py-3.5">Recipient Company</th>
                <th className="px-5 py-3.5">Delivery Address</th>
                <th className="px-5 py-3.5">Schedule</th>
                <th className="px-5 py-3.5">Orders</th>
                <th className="px-5 py-3.5">Assigned Driver</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading && drops.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                    <span>Loading drops...</span>
                  </td>
                </tr>
              ) : drops.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    No active delivery drops yet. Click &quot;Auto-Group Confirmed Orders&quot; to form drops.
                  </td>
                </tr>
              ) : (
                drops.map((drop) => {
                  return (
                    <tr
                      key={drop.id}
                      className="hover:bg-slate-800/40 transition duration-150"
                    >
                      <td className="px-5 py-3.5 font-mono text-slate-400 font-medium">
                        #{drop.id.slice(-6)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-white">
                        {drop.company?.name || 'Corporate'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 max-w-xs truncate">
                        {drop.companyAddress
                          ? `${drop.companyAddress.addressLine1}, ${drop.companyAddress.city}`
                          : 'Default Address'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">
                        {drop.deliveryDate
                          ? new Date(drop.deliveryDate).toLocaleDateString()
                          : '-'}{' '}
                        at <span className="font-semibold text-white">{drop.deliveryTime}</span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-300">
                        {drop.dropOrders?.length || 0} orders
                      </td>
                      <td className="px-5 py-3.5">
                        {drop.driver ? (
                          <span className="inline-flex items-center text-xs font-medium text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                            {drop.driver.email}
                          </span>
                        ) : (
                          <span className="text-amber-400/80 text-[11px] italic">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={drop.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {!drop.driver && drop.status !== 'DELIVERED' && (
                          <button
                            onClick={() => openAssignModal(drop.id)}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                          >
                            <UserCheck className="w-3 h-3 mr-1 text-amber-400" />
                            <span>Assign Driver</span>
                          </button>
                        )}

                        {drop.status === 'KITCHEN_READY' && (
                          <button
                            onClick={() => handleDispatchReady(drop.id)}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-purple-950/70 hover:bg-purple-900/80 text-purple-300 border border-purple-800 rounded-lg transition"
                          >
                            <span>Dispatch Ready</span>
                          </button>
                        )}

                        {drop.status === 'DISPATCH_READY' && (
                          <button
                            onClick={() => handleOutForDelivery(drop.id)}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-800 rounded-lg transition"
                          >
                            <Truck className="w-3 h-3 mr-1" />
                            <span>Out For Delivery</span>
                          </button>
                        )}

                        {drop.status === 'OUT_FOR_DELIVERY' && (
                          <button
                            onClick={() => handleDelivered(drop.id)}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 rounded-lg transition"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            <span>Deliver</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Driver Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Fleet Driver to Delivery Drop"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400">
            Select an authenticated user with the <span className="text-emerald-400 font-bold">DRIVER</span> role:
          </p>

          <div>
            <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Available Drivers
            </label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select a verified driver...</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3">
            <button
              onClick={() => setAssignModalOpen(false)}
              className="px-3 py-2 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignDriver}
              disabled={!driverId || actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg transition"
            >
              Confirm Assignment
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
