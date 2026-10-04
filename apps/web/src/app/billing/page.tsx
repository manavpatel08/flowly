'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Receipt,
  PlusCircle,
  RefreshCw,
  FileCheck,
  CheckCircle,
  Building,
  CheckSquare,
  Square,
  Eye,
} from 'lucide-react';

export default function BillingPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Generate Invoice Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [eligibleOrders, setEligibleOrders] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // View Invoice Detail Modal
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/invoices?pageSize=50');
      setInvoices(res.items || []);
      setTotalInvoices(res.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const openCreateInvoiceModal = async () => {
    setCreateModalOpen(true);
    setOrdersLoading(true);
    setSelectedOrderIds([]);
    try {
      // Find orders that are CONFIRMED or DELIVERED
      const confirmedRes = await api.get('/orders?status=CONFIRMED&pageSize=50');
      const deliveredRes = await api.get('/orders?status=DELIVERED&pageSize=50');

      const all = [...(confirmedRes.items || []), ...(deliveredRes.items || [])];
      // Filter out any that already have an invoice
      const unbilled = all.filter((o) => !o.invoiceOrder);
      setEligibleOrders(unbilled);
      // Auto-select all by default
      setSelectedOrderIds(unbilled.map((o) => o.id));
    } catch (err: any) {
      setError('Failed to fetch unbilled orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const toggleSelectOrder = (orderId: string) => {
    if (selectedOrderIds.includes(orderId)) {
      setSelectedOrderIds(selectedOrderIds.filter((id) => id !== orderId));
    } else {
      setSelectedOrderIds([...selectedOrderIds, orderId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === eligibleOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(eligibleOrders.map((o) => o.id));
    }
  };

  const handleGenerateInvoice = async () => {
    if (selectedOrderIds.length === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const created = await api.post('/invoices', {
        orderIds: selectedOrderIds,
      });
      setSuccess(`Invoice ${created.invoiceNumber} generated successfully!`);
      setCreateModalOpen(false);
      fetchInvoices();
    } catch (err: any) {
      setError(err.message || 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const previewTotalInPaise = eligibleOrders
    .filter((o) => selectedOrderIds.includes(o.id))
    .reduce((sum, o) => sum + (o.totalInPaise || 0), 0);

  return (
    <AppLayout
      title="Corporate Invoices & Billing"
      subtitle="Server-calculated invoicing for completed corporate catering orders"
      requiredRole={['ADMIN']}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <span>Invoice Ledger</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalInvoices} issued corporate invoices
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={openCreateInvoiceModal}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-emerald-500/20 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Generate Invoice</span>
          </button>
        </div>
      </div>

      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertBanner type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Invoices Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Invoice Number</th>
                <th className="px-5 py-3.5">Issue Date</th>
                <th className="px-5 py-3.5">Orders Included</th>
                <th className="px-5 py-3.5">Total Amount</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    <span>Loading invoices...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    No invoices generated yet. Click &quot;Generate Invoice&quot; to invoice confirmed/delivered orders.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-800/40 transition duration-150"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-white">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {new Date(inv.issuedAt).toLocaleDateString()} at{' '}
                      {new Date(inv.issuedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      <span className="font-semibold text-white">
                        {inv._count?.invoiceOrders || inv.invoiceOrders?.length || 0}
                      </span>{' '}
                      orders
                    </td>
                    <td className="px-5 py-3.5 font-mono font-extrabold text-emerald-400 text-sm">
                      ₹{(inv.totalInPaise / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                        ISSUED / LOCKED
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={async () => {
                          const full = await api.get(`/invoices/${inv.id}`);
                          setViewInvoice(full);
                        }}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Invoice Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Generate Invoice From Billable Orders"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400">
            Select confirmed or delivered orders to bundle into this corporate invoice.
            The final total is authoritatively calculated and locked by the server.
          </p>

          {ordersLoading ? (
            <div className="py-8 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
              <span>Scanning billable orders...</span>
            </div>
          ) : eligibleOrders.length === 0 ? (
            <div className="p-6 bg-slate-950 rounded-xl text-center text-slate-500">
              No unbilled CONFIRMED or DELIVERED orders found.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  {selectedOrderIds.length === eligibleOrders.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span>
                    {selectedOrderIds.length === eligibleOrders.length
                      ? 'Deselect All'
                      : 'Select All Eligible'}
                  </span>
                </button>
                <span className="text-slate-400">
                  {selectedOrderIds.length} of {eligibleOrders.length} selected
                </span>
              </div>

              {/* Order checklist */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-800 pr-1 space-y-1">
                {eligibleOrders.map((ord) => {
                  const isChecked = selectedOrderIds.includes(ord.id);
                  return (
                    <div
                      key={ord.id}
                      onClick={() => toggleSelectOrder(ord.id)}
                      className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition ${
                        isChecked
                          ? 'bg-emerald-950/30 border-emerald-700/80 text-white'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold text-xs text-white">
                            #{ord.id.slice(-6)} — {ord.employee?.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {ord.company?.name} •{' '}
                            {ord.deliveryDate
                              ? new Date(ord.deliveryDate).toLocaleDateString()
                              : ''}{' '}
                            ({ord.status})
                          </p>
                        </div>
                      </div>

                      <span className="font-mono font-bold text-white text-xs">
                        ₹{(ord.totalInPaise / 100).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Server Total Calculation Preview */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Calculated Invoice Total:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Sum of historical snapshot prices
                  </span>
                </div>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  ₹{(previewTotalInPaise / 100).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateInvoice}
              disabled={generating || selectedOrderIds.length === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition"
            >
              {generating ? 'Generating...' : `Create Invoice (${selectedOrderIds.length} Orders)`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Invoice Detail Modal */}
      {viewInvoice && (
        <Modal
          isOpen={!!viewInvoice}
          onClose={() => setViewInvoice(null)}
          title={`Invoice ${viewInvoice.invoiceNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <p className="text-slate-400 font-medium">Issue Date</p>
                <p className="text-white font-semibold">
                  {new Date(viewInvoice.issuedAt).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 font-medium">Grand Total</p>
                <p className="text-emerald-400 font-mono font-bold text-base">
                  ₹{(viewInvoice.totalInPaise / 100).toFixed(2)}
                </p>
              </div>
            </div>

            <div>
              <p className="font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Included Orders ({viewInvoice.invoiceOrders?.length || 0}):
              </p>
              <div className="divide-y divide-slate-800 max-h-60 overflow-y-auto">
                {viewInvoice.invoiceOrders?.map((io: any) => (
                  <div key={io.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">
                        Order #{io.order?.id?.slice(-6)} — {io.order?.employee?.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {io.order?.company?.name} • {io.order?.deliveryTime}
                      </p>
                    </div>
                    <span className="font-mono text-white font-semibold">
                      ₹{((io.order?.totalInPaise || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setViewInvoice(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
