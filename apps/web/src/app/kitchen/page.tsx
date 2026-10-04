'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  ChefHat,
  Play,
  CheckCircle2,
  RefreshCw,
  Clock,
  Building,
  Flame,
  Zap,
} from 'lucide-react';

export default function KitchenPage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'STARTED' | 'DONE'>('ALL');
  const [stationFilter, setStationFilter] = useState<string>('ALL');

  const fetchStations = async () => {
    try {
      const res = await api.get('/kitchen/stations');
      setStations(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('Failed to fetch kitchen stations', e);
    }
  };

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/kitchen/queue');
      setQueue(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch kitchen queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchStations();
  }, []);

  const handleStart = async (unitId: string) => {
    try {
      await api.post(`/kitchen/units/${unitId}/start`);
      setSuccess('Kitchen unit started cooking!');
      fetchQueue();
    } catch (err: any) {
      setError(err.message || 'Failed to start kitchen unit');
    }
  };

  const handleDone = async (unitId: string) => {
    try {
      await api.post(`/kitchen/units/${unitId}/done`);
      setSuccess('Kitchen unit marked ready/done!');
      fetchQueue();
    } catch (err: any) {
      setError(err.message || 'Failed to complete kitchen unit');
    }
  };

  const handleForceComplete = async (orderId: string) => {
    if (!confirm('Force complete all kitchen units for this order?')) return;
    try {
      await api.post(`/kitchen/orders/${orderId}/force-complete`);
      setSuccess(`Order #${orderId.slice(-6)} force-completed by Admin.`);
      fetchQueue();
    } catch (err: any) {
      setError(err.message || 'Failed to force complete order');
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (stationFilter === 'ALL') return true;
    if (stationFilter === 'UNASSIGNED') {
      return !item.combination?.dish?.kitchenStationId;
    }
    return item.combination?.dish?.kitchenStationId === stationFilter;
  });

  return (
    <AppLayout
      title="Kitchen Station Queue"
      subtitle="Fulfillment pipeline, line cooking, and prep station coordination"
      requiredRole={['ADMIN', 'KITCHEN']}
    >
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <ChefHat className="w-5 h-5 text-amber-400" />
            <span>Kitchen Queue</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {queue.length} production items in line • Station routing active
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Station dropdown filter */}
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-400 font-medium">Station:</span>
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Stations</option>
              {stations.map((st) => (
                <option key={st.id} value={st.id} className="bg-slate-900 text-white">
                  {st.name}
                </option>
              ))}
              <option value="UNASSIGNED" className="bg-slate-900 text-white">Unassigned Station</option>
            </select>
          </div>

          {/* Status quick tabs */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            {(['ALL', 'PENDING', 'STARTED', 'DONE'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  statusFilter === tab
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={fetchQueue}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertBanner type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Queue Grid / Cards */}
      {loading && queue.length === 0 ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-400" />
          <p className="text-sm">Loading kitchen queue...</p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
          <ChefHat className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">
            No items in queue
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Confirmed orders with pending prep will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQueue.map((unit) => {
            const comb = unit.combination;
            const order = comb?.order;
            const dish = comb?.dish;

            return (
              <div
                key={unit.id}
                className={`bg-slate-900/90 border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition ${
                  unit.status === 'STARTED'
                    ? 'border-cyan-800/80 ring-1 ring-cyan-500/20'
                    : unit.status === 'DONE'
                    ? 'border-emerald-800/80 opacity-75'
                    : 'border-slate-800'
                }`}
              >
                <div>
                  {/* Top card header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Order #{order?.id?.slice(-6)}
                      </span>
                      <p className="text-xs font-semibold text-slate-300 flex items-center space-x-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-500" />
                        <span>{order?.company?.name || 'Corporate'}</span>
                      </p>
                    </div>
                    <StatusBadge status={unit.status} />
                  </div>

                  {/* Dish Name & Quantity */}
                  <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl mb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white leading-tight">
                        {comb?.dishNameSnapshot}
                      </h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-white font-mono font-bold shrink-0 ml-2">
                        Qty: {comb?.quantity}
                      </span>
                    </div>

                    {dish?.kitchenStation ? (
                      <span className="inline-block text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded mt-2">
                        Station: {dish.kitchenStation.name}
                      </span>
                    ) : (
                      <span className="inline-block text-[10px] text-slate-400 bg-slate-800/60 border border-slate-700/60 px-2 py-0.5 rounded mt-2">
                        Station: Unassigned
                      </span>
                    )}

                    {/* Options list */}
                    {comb?.combinationOptions &&
                      comb.combinationOptions.length > 0 && (
                        <div className="mt-2 text-xs text-slate-400 border-t border-slate-800/60 pt-2 space-y-0.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Customizations:
                          </p>
                          {comb.combinationOptions.map((opt: any) => (
                            <p key={opt.id} className="text-slate-300 text-xs">
                              • {opt.optionNameSnapshot}
                            </p>
                          ))}
                        </div>
                      )}

                    {comb?.notes && (
                      <p className="mt-2 text-xs text-amber-300 bg-amber-950/40 p-1.5 rounded border border-amber-900/50">
                        <span className="font-semibold">Note:</span> {comb.notes}
                      </p>
                    )}
                  </div>

                  {/* Delivery window */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-4 px-1">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Delivery:</span>
                    </span>
                    <span className="font-semibold text-white">
                      {order?.deliveryTime} (
                      {order?.deliveryDate
                        ? new Date(order.deliveryDate).toLocaleDateString()
                        : '-'}
                      )
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  {unit.status === 'PENDING' && (
                    <button
                      onClick={() => handleStart(unit.id)}
                      className="w-full flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-sm transition"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Cooking</span>
                    </button>
                  )}

                  {unit.status === 'STARTED' && (
                    <button
                      onClick={() => handleDone(unit.id)}
                      className="w-full flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Ready (Done)</span>
                    </button>
                  )}

                  {unit.status === 'DONE' && (
                    <div className="text-center py-1.5 text-xs text-emerald-400 font-semibold flex items-center justify-center space-x-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ready for Packaging</span>
                    </div>
                  )}

                  {user?.role === 'ADMIN' && unit.status !== 'DONE' && order?.id && (
                    <button
                      onClick={() => handleForceComplete(order.id)}
                      className="w-full text-center py-1 text-[11px] text-slate-400 hover:text-amber-300 transition"
                    >
                      Force Complete Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
