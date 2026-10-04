'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  PlusCircle,
  ShoppingBag,
  Sparkles,
  Utensils,
  User,
  Trash2,
  Plus,
} from 'lucide-react';

interface OrderCartItem {
  id: string;
  dishId: string;
  dishName: string;
  dishPricePaise: number;
  quantity: number;
  notes?: string;
  optionIds: string[];
  optionsDetails: { id: string; name: string; priceInPaise: number }[];
  lineTotalPaise: number;
}

export default function CreateOrderPage() {
  const router = useRouter();

  // State
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);

  // Menu resolution
  const [menuLoading, setMenuLoading] = useState(false);
  const [resolvedMenu, setResolvedMenu] = useState<any>(null);

  // Active dish selection
  const [selectedDishId, setSelectedDishId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');

  // Cart / Multi-dish items
  const [cartItems, setCartItems] = useState<OrderCartItem[]>([]);

  // Delivery details
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
  );
  const [deliveryTime, setDeliveryTime] = useState<string>('12:30');
  const [packaging, setPackaging] = useState<string>('Standard Bag');
  const [driverInstructions, setDriverInstructions] = useState<string>('Reception desk');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get('/employees?pageSize=100');
        const list = res.data || res.items || [];
        setEmployees(list);
        if (list.length > 0) {
          setSelectedEmployeeId(list[0].id);
        }
      } catch (err: any) {
        setError('Failed to fetch employees');
      }
    };
    fetchEmployees();
  }, []);

  // 2. Fetch Employee's Resolved Menu when employee changes
  useEffect(() => {
    if (!selectedEmployeeId) return;

    const emp = employees.find((e) => e.id === selectedEmployeeId);
    setEmployeeDetails(emp || null);

    const loadMenu = async () => {
      setMenuLoading(true);
      setError(null);
      try {
        const res = await api.get(`/employees/${selectedEmployeeId}/menu`);
        setResolvedMenu(res);
        setCartItems([]); // Reset cart when changing employee

        // Auto-select first available dish
        let firstDish: any = null;
        for (const cat of res.categories || []) {
          if (cat.dishes && cat.dishes.length > 0) {
            firstDish = cat.dishes[0];
            break;
          }
        }
        if (firstDish) {
          setSelectedDishId(firstDish.id);
          const autoSelected: string[] = [];
          for (const og of firstDish.optionGroups || []) {
            if (og.isRequired && og.options.length > 0) {
              autoSelected.push(og.options[0].id);
            }
          }
          setSelectedOptionIds(autoSelected);
        } else {
          setSelectedDishId('');
          setSelectedOptionIds([]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load employee menu');
        setResolvedMenu(null);
      } finally {
        setMenuLoading(false);
      }
    };

    loadMenu();
  }, [selectedEmployeeId, employees]);

  // Find currently selected dish object
  const currentDish = (() => {
    if (!resolvedMenu || !selectedDishId) return null;
    for (const cat of resolvedMenu.categories || []) {
      const found = cat.dishes?.find((d: any) => d.id === selectedDishId);
      if (found) return found;
    }
    return null;
  })();

  // Handle dish change
  const handleDishChange = (dishId: string) => {
    setSelectedDishId(dishId);
    for (const cat of resolvedMenu?.categories || []) {
      const found = cat.dishes?.find((d: any) => d.id === dishId);
      if (found) {
        const autoSelected: string[] = [];
        for (const og of found.optionGroups || []) {
          if (og.isRequired && og.options.length > 0) {
            autoSelected.push(og.options[0].id);
          }
        }
        setSelectedOptionIds(autoSelected);
        break;
      }
    }
  };

  // Toggle option selection
  const handleToggleOption = (group: any, optionId: string) => {
    const groupOptionIds = new Set(group.options.map((o: any) => o.id));
    const filtered = selectedOptionIds.filter((id) => !groupOptionIds.has(id));

    if (selectedOptionIds.includes(optionId)) {
      if (!group.isRequired) {
        setSelectedOptionIds(filtered);
      }
    } else {
      setSelectedOptionIds([...filtered, optionId]);
    }
  };

  // Calculate price of the dish currently configured
  const currentDishUnitPricePaise = (() => {
    if (!currentDish) return 0;
    let base = currentDish.priceInPaise || 0;
    for (const og of currentDish.optionGroups || []) {
      for (const opt of og.options || []) {
        if (selectedOptionIds.includes(opt.id)) {
          base += opt.priceInPaise || 0;
        }
      }
    }
    return base;
  })();

  const currentDishLineTotalPaise = currentDishUnitPricePaise * quantity;

  // Add currently selected dish to cart
  const handleAddDishToCart = () => {
    if (!currentDish) {
      setError('Please select a dish to add');
      return;
    }

    // Verify required option groups
    for (const og of currentDish.optionGroups || []) {
      if (og.isRequired) {
        const hasChoice = og.options.some((o: any) => selectedOptionIds.includes(o.id));
        if (!hasChoice) {
          setError(`Please make a selection for required option: ${og.name}`);
          return;
        }
      }
    }

    // Collect options details
    const optionsDetails: { id: string; name: string; priceInPaise: number }[] = [];
    for (const og of currentDish.optionGroups || []) {
      for (const opt of og.options || []) {
        if (selectedOptionIds.includes(opt.id)) {
          optionsDetails.push({
            id: opt.id,
            name: opt.name,
            priceInPaise: opt.priceInPaise || 0,
          });
        }
      }
    }

    const newItem: OrderCartItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      dishId: currentDish.id,
      dishName: currentDish.name,
      dishPricePaise: currentDish.priceInPaise || 0,
      quantity,
      notes: notes.trim() || undefined,
      optionIds: [...selectedOptionIds],
      optionsDetails,
      lineTotalPaise: currentDishLineTotalPaise,
    };

    setCartItems((prev) => [...prev, newItem]);
    setNotes('');
    setQuantity(1);
    setError(null);
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Total order price in paise
  const totalOrderPaise = (() => {
    const cartTotal = cartItems.reduce((sum, item) => sum + item.lineTotalPaise, 0);
    // If cart is empty and user configured a dish, preview that dish total
    if (cartItems.length === 0) {
      return currentDishLineTotalPaise;
    }
    return cartTotal;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Determine final items array
    let itemsToSubmit: any[] = [];

    if (cartItems.length > 0) {
      itemsToSubmit = cartItems.map((ci) => ({
        dishId: ci.dishId,
        quantity: ci.quantity,
        notes: ci.notes,
        optionIds: ci.optionIds,
      }));
    } else if (currentDish) {
      // Single dish quick submit
      itemsToSubmit = [
        {
          dishId: currentDish.id,
          quantity: Number(quantity),
          notes: notes.trim() || undefined,
          optionIds: selectedOptionIds,
        },
      ];
    } else {
      setError('Please add at least one dish to the order');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        employeeId: selectedEmployeeId,
        deliveryDate,
        deliveryTime,
        packaging,
        driverInstructions,
        status: 'DRAFT',
        items: itemsToSubmit,
      };

      const created = await api.post('/orders', payload);
      router.push(`/orders/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="Create Corporate Order"
      subtitle="Guided order placement with server-authoritative pricing"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/orders"
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition space-x-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders</span>
        </Link>

        {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Select Employee */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>Select Employee & Company</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Ordering Employee
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.company?.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              {employeeDetails && (
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                  <p className="text-slate-400">
                    Company:{' '}
                    <span className="font-semibold text-white">
                      {employeeDetails.company?.name}
                    </span>
                  </p>
                  <p className="text-slate-400">
                    Corporate Email:{' '}
                    <span className="font-mono text-slate-300">
                      {employeeDetails.email}
                    </span>
                  </p>
                  {resolvedMenu && (
                    <p className="text-slate-400">
                      Resolved Price Tier:{' '}
                      <span className="font-bold text-emerald-400">
                        {resolvedMenu.priceTier?.name} Tier
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Select Dish */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Choose Dish From Active Menu</span>
            </h3>

            {menuLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                <span>Resolving company menu...</span>
              </div>
            ) : !resolvedMenu || resolvedMenu.categories?.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">
                No dishes currently available for this company.
              </p>
            ) : (
              <div className="space-y-4">
                {resolvedMenu.categories.map((cat: any) => (
                  <div key={cat.id}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {cat.name}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {cat.dishes.map((dish: any) => {
                        const isSelected = selectedDishId === dish.id;
                        return (
                          <div
                            key={dish.id}
                            onClick={() => handleDishChange(dish.id)}
                            className={`p-4 rounded-xl border cursor-pointer transition ${
                              isSelected
                                ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/50'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-sm text-white">
                                  {dish.name}
                                </p>
                                {dish.description && (
                                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                                    {dish.description}
                                  </p>
                                )}
                                <div className="flex items-center space-x-2 mt-2">
                                  {dish.kitchenStation && (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                      {dish.kitchenStation.name}
                                    </span>
                                  )}
                                  {dish.portion && (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                      {dish.portion.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="font-bold text-emerald-400 text-sm font-mono shrink-0 ml-3">
                                ₹{(dish.priceInPaise / 100).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 3: Options & Customizations */}
          {currentDish && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Customization & Options</span>
              </h3>

              {currentDish.optionGroups?.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No customization options for this dish.
                </p>
              ) : (
                <div className="space-y-4">
                  {currentDish.optionGroups.map((group: any) => (
                    <div
                      key={group.id}
                      className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          {group.name}
                        </span>
                        {group.isRequired ? (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
                            Required Selection *
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            Optional
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {group.options.map((opt: any) => {
                          const isSelected = selectedOptionIds.includes(opt.id);
                          return (
                            <div
                              key={opt.id}
                              onClick={() => handleToggleOption(group, opt.id)}
                              className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                                isSelected
                                  ? 'bg-emerald-950/50 border-emerald-600 text-white font-medium'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <span>{opt.name}</span>
                              <span className="font-mono text-slate-400">
                                {opt.priceInPaise > 0
                                  ? `+₹${(opt.priceInPaise / 100).toFixed(2)}`
                                  : 'Free'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Configure & Add Dish to Order */}
          {currentDish && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center justify-center text-xs font-bold">
                    4
                  </span>
                  <span>Quantity & Add to Order</span>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  Unit Price: ₹{(currentDishUnitPricePaise / 100).toFixed(2)}
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Item Special Instructions / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Extra spicy, dressing on the side"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-800/80">
                <div className="text-xs text-slate-400">
                  Dish Line Total: <span className="text-white font-bold font-mono">₹{(currentDishLineTotalPaise / 100).toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddDishToCart}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Dish to Order</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Order Items Cart */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center justify-center text-xs font-bold">
                  5
                </span>
                <span>Order Dishes & Items ({cartItems.length})</span>
              </div>
              {cartItems.length > 0 && (
                <span className="text-xs text-emerald-400 font-semibold">
                  Multi-dish order ready
                </span>
              )}
            </h3>

            {cartItems.length === 0 ? (
              <div className="p-5 text-center bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-semibold text-slate-300">No dishes added to order list yet</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Click <strong className="text-emerald-400">"Add Dish to Order"</strong> above to combine multiple dishes, or click submit below to create with the currently selected dish.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">
                          #{idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-white">{item.dishName}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 font-mono">
                          Qty: {item.quantity}
                        </span>
                      </div>

                      {item.optionsDetails.length > 0 && (
                        <p className="text-xs text-slate-400">
                          Options: {item.optionsDetails.map((o) => `${o.name} (+₹${(o.priceInPaise / 100).toFixed(2)})`).join(', ')}
                        </p>
                      )}

                      {item.notes && (
                        <p className="text-xs text-amber-300 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/40 inline-block">
                          Note: {item.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="text-sm font-mono font-bold text-white">
                        ₹{(item.lineTotalPaise / 100).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(item.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition"
                        title="Remove dish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 6: Delivery Logistics */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center justify-center text-xs font-bold">
                6
              </span>
              <span>Delivery Logistics</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Delivery Time Window
                </label>
                <input
                  type="text"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  placeholder="12:30"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Packaging Type
                </label>
                <input
                  type="text"
                  value={packaging}
                  onChange={(e) => setPackaging(e.target.value)}
                  placeholder="Standard Bag"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Driver Drop Instructions
                </label>
                <input
                  type="text"
                  value={driverInstructions}
                  onChange={(e) => setDriverInstructions(e.target.value)}
                  placeholder="Reception desk"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Price Preview & Submit Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Order Total ({cartItems.length > 0 ? `${cartItems.length} dish line(s)` : '1 dish'})
              </p>
              <p className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                ₹{(totalOrderPaise / 100).toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-500">
                * Locked & authoritative server-side validation applied upon submission
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || (cartItems.length === 0 && !selectedDishId)}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-semibold text-white rounded-xl shadow-lg shadow-emerald-500/25 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  <span>Create DRAFT Order ({cartItems.length > 0 ? `${cartItems.length} dishes` : '1 dish'})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
