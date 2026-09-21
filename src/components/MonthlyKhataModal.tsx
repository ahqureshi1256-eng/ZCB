import React, { useState } from 'react';
import { Order, ShopSettings, KhataEntry, KhataType } from '../types';
import { formatPrice } from '../utils/billing';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  CreditCard,
  PlusCircle,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileText,
  X,
  PieChart,
  UserCheck,
  Search,
  Filter,
} from 'lucide-react';

interface MonthlyKhataModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  shop: ShopSettings;
  khataEntries: KhataEntry[];
  onAddKhataEntry: (entry: KhataEntry) => void;
  onDeleteKhataEntry: (id: string) => void;
  onUpdateKhataEntry: (entry: KhataEntry) => void;
}

export const MonthlyKhataModal: React.FC<MonthlyKhataModalProps> = ({
  isOpen,
  onClose,
  orders,
  shop,
  khataEntries,
  onAddKhataEntry,
  onDeleteKhataEntry,
  onUpdateKhataEntry,
}) => {
  // Current month filter (YYYY-MM format e.g. "2026-09")
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [activeTab, setActiveTab] = useState<'summary' | 'daily' | 'udhaar_khata'>('summary');
  const [khataTypeFilter, setKhataTypeFilter] = useState<'all' | KhataType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Entry form state
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [newType, setNewType] = useState<KhataType>('chicken');
  const [newParty, setNewParty] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newPaid, setNewPaid] = useState('');
  const [newNotes, setNewNotes] = useState('');

  if (!isOpen) return null;

  // Filter orders by selected month
  const monthOrders = orders.filter((o) => {
    if (!o.createdAt) return false;
    const date = new Date(o.createdAt);
    const mStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return mStr === selectedMonth;
  });

  // Calculate monthly sales
  const monthSales = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const monthBillsCount = monthOrders.length;

  // Calculate total boxes/portions sold in this month
  let totalDabbeCount = 0;
  monthOrders.forEach((o) => {
    o.items.forEach((item) => {
      totalDabbeCount += item.quantity;
    });
  });

  // Filter khata entries by selected month
  const monthKhata = khataEntries.filter((k) => {
    if (!k.createdAt) return false;
    const date = new Date(k.createdAt);
    const mStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return mStr === selectedMonth;
  });

  // Calculate Khata totals
  const totalExpenses = monthKhata.reduce((sum, k) => sum + k.amount, 0);
  const totalPaidExpenses = monthKhata.reduce((sum, k) => sum + k.paidAmount, 0);
  const totalPendingUdhaar = monthKhata.reduce((sum, k) => sum + k.balanceDue, 0);

  // Group by category (Chicken, Rice, Masala, etc.)
  const chickenKhata = monthKhata.filter((k) => k.type === 'chicken');
  const chickenTotal = chickenKhata.reduce((sum, k) => sum + k.amount, 0);
  const chickenUdhaar = chickenKhata.reduce((sum, k) => sum + k.balanceDue, 0);

  const riceKhata = monthKhata.filter((k) => k.type === 'rice');
  const riceTotal = riceKhata.reduce((sum, k) => sum + k.amount, 0);
  const riceUdhaar = riceKhata.reduce((sum, k) => sum + k.balanceDue, 0);

  const masalaKhata = monthKhata.filter((k) => k.type === 'masala');
  const masalaTotal = masalaKhata.reduce((sum, k) => sum + k.amount, 0);
  const masalaUdhaar = masalaKhata.reduce((sum, k) => sum + k.balanceDue, 0);

  const customerUdhaarKhata = monthKhata.filter((k) => k.type === 'customer_udhaar');
  const customerUdhaarTotal = customerUdhaarKhata.reduce((sum, k) => sum + k.balanceDue, 0);

  // Daily Breakdown calculation for this month
  const dailyBreakdown: Record<
    string,
    { dateStr: string; sales: number; bills: number; dabbe: number; expense: number; udhaar: number }
  > = {};

  monthOrders.forEach((o) => {
    const dayKey = o.dateStr || new Date(o.createdAt).toLocaleDateString();
    if (!dailyBreakdown[dayKey]) {
      dailyBreakdown[dayKey] = { dateStr: dayKey, sales: 0, bills: 0, dabbe: 0, expense: 0, udhaar: 0 };
    }
    dailyBreakdown[dayKey].sales += o.totalAmount;
    dailyBreakdown[dayKey].bills += 1;
    o.items.forEach((i) => {
      dailyBreakdown[dayKey].dabbe += i.quantity;
    });
  });

  monthKhata.forEach((k) => {
    const dayKey = k.dateStr || new Date(k.createdAt).toLocaleDateString();
    if (!dailyBreakdown[dayKey]) {
      dailyBreakdown[dayKey] = { dateStr: dayKey, sales: 0, bills: 0, dabbe: 0, expense: 0, udhaar: 0 };
    }
    dailyBreakdown[dayKey].expense += k.paidAmount;
    dailyBreakdown[dayKey].udhaar += k.balanceDue;
  });

  const dailyList = Object.values(dailyBreakdown).sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  // Handle Add Khata
  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newAmount) || 0;
    const paid = parseFloat(newPaid) || 0;
    const balance = Math.max(0, amt - paid);

    const now = new Date();
    const newEntry: KhataEntry = {
      id: `khata-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: newType,
      supplierOrPartyName: newParty.trim() || (newType === 'chicken' ? 'مرغی سپلائر' : newType === 'rice' ? 'چاول و اناج مارکیٹ' : 'پارٹی'),
      description: newDesc.trim() || `${newType.toUpperCase()} کی خریداری`,
      amount: amt,
      paidAmount: paid,
      balanceDue: balance,
      dateStr: now.toLocaleDateString(),
      timeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: now.getTime(),
      status: balance === 0 ? 'paid' : paid > 0 ? 'partial' : 'pending_udhaar',
      notes: newNotes.trim(),
    };

    onAddKhataEntry(newEntry);
    setIsAddingEntry(false);
    setNewAmount('');
    setNewPaid('');
    setNewDesc('');
    setNewParty('');
    setNewNotes('');
  };

  const filteredKhata = monthKhata.filter((k) => {
    const matchesType = khataTypeFilter === 'all' || k.type === khataTypeFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      k.supplierOrPartyName.toLowerCase().includes(q) ||
      k.description.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  // Net Profit Estimation: (Sales - Total Expenses)
  const netEstimatedMargin = monthSales - totalExpenses;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-stone-900 border-2 border-amber-500/80 text-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 p-4 sm:p-5 flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shadow-lg font-black text-xl">
              📒
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                  RESTAURANT KHATA & UDHAAR BOOK
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  {selectedMonth}
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white mt-0.5">
                ماہانہ سیلز، ڈبے اور ادھار کھاتہ (Monthly Ledger)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Month Selector */}
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-stone-800 border border-amber-500/40 text-amber-200 text-xs px-3 py-2 rounded-xl font-bold cursor-pointer outline-hidden"
              title="Select Month"
            />

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Top Analytics Cards Banner */}
        <div className="bg-stone-950/80 px-4 py-3 border-b border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Total Monthly Sales */}
          <div className="bg-stone-900/90 p-3 rounded-2xl border border-emerald-500/30">
            <span className="text-[10px] font-bold text-emerald-400 block uppercase">
              1. مہینے کی کل سیل (Sales)
            </span>
            <span className="text-base sm:text-xl font-black text-white block mt-0.5">
              {formatPrice(monthSales, shop.currencySymbol)}
            </span>
            <span className="text-[11px] text-stone-400">
              {monthBillsCount} کل بل جاری ہوئے
            </span>
          </div>

          {/* Total Dabbe Sold */}
          <div className="bg-stone-900/90 p-3 rounded-2xl border border-amber-500/30">
            <span className="text-[10px] font-bold text-amber-400 block uppercase flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              <span>2. کل ڈبے / پلیٹس (Boxes)</span>
            </span>
            <span className="text-base sm:text-xl font-black text-amber-300 block mt-0.5">
              {totalDabbeCount} ڈبے
            </span>
            <span className="text-[11px] text-stone-400">
              بریانی و دیگر آئٹمز کی فروخت
            </span>
          </div>

          {/* Total Udhaar Pending */}
          <div className="bg-stone-900/90 p-3 rounded-2xl border border-rose-500/30">
            <span className="text-[10px] font-bold text-rose-400 block uppercase flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>3. کل ادھار واجب الادا (Udhaar)</span>
            </span>
            <span className="text-base sm:text-xl font-black text-rose-300 block mt-0.5">
              {formatPrice(totalPendingUdhaar, shop.currencySymbol)}
            </span>
            <span className="text-[11px] text-stone-400">
              مرغی، چاول و دیگر باقیات
            </span>
          </div>

          {/* Net Margin / Profit Estimation */}
          <div className="bg-stone-900/90 p-3 rounded-2xl border border-cyan-500/30">
            <span className="text-[10px] font-bold text-cyan-400 block uppercase flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>4. خالص نفع / بقایا (Net)</span>
            </span>
            <span className={`text-base sm:text-xl font-black block mt-0.5 ${netEstimatedMargin >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
              {formatPrice(netEstimatedMargin, shop.currencySymbol)}
            </span>
            <span className="text-[11px] text-stone-400">
              کل اخراجات: {formatPrice(totalExpenses, shop.currencySymbol)}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-stone-900 px-4 pt-3 border-b border-stone-800 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'summary'
                  ? 'bg-stone-950 text-amber-300 border-t-2 border-amber-400'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>مرغی و چاول ادھار سمری</span>
            </button>

            <button
              onClick={() => setActiveTab('udhaar_khata')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'udhaar_khata'
                  ? 'bg-stone-950 text-amber-300 border-t-2 border-amber-400'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>مکمل کھاتہ اندراج ({monthKhata.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'daily'
                  ? 'bg-stone-950 text-amber-300 border-t-2 border-amber-400'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>روزانہ کا ریکارڈ (Daily Ledger)</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddingEntry(true)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black flex items-center gap-1 shadow-md transition-transform active:scale-95 cursor-pointer mb-2"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ نیا کھاتہ / ادھار لکھیں</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: SUMMARY OF CHICKEN, RICE & SUPPLIERS */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Murgi (Chicken) Khata Card */}
                <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <span className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
                      🍗 <span>مرغی کا کھاتہ (Chicken Khata)</span>
                    </span>
                    <span className="text-xs bg-stone-900 px-2 py-0.5 rounded text-stone-400">
                      {chickenKhata.length} اندراج
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-stone-300">
                      <span>کل خریدی:</span>
                      <span className="font-bold text-white">{formatPrice(chickenTotal, shop.currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-stone-300">
                      <span>ادائیگی کر دی:</span>
                      <span className="font-bold text-emerald-400">{formatPrice(chickenTotal - chickenUdhaar, shop.currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-stone-300 border-t border-stone-800 pt-1.5">
                      <span className="font-bold text-rose-400">باقی ادھار (Udhaar Due):</span>
                      <span className="font-black text-rose-300 text-sm">{formatPrice(chickenUdhaar, shop.currencySymbol)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setKhataTypeFilter('chicken');
                      setActiveTab('udhaar_khata');
                    }}
                    className="w-full py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs rounded-xl font-bold cursor-pointer transition-colors"
                  >
                    مرغی کے بل اور ادھار دیکھیں →
                  </button>
                </div>

                {/* 2. Chawal (Rice) Khata Card */}
                <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <span className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
                      🍚 <span>چاول کا کھاتہ (Rice Khata)</span>
                    </span>
                    <span className="text-xs bg-stone-900 px-2 py-0.5 rounded text-stone-400">
                      {riceKhata.length} اندراج
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-stone-300">
                      <span>کل خریدی:</span>
                      <span className="font-bold text-white">{formatPrice(riceTotal, shop.currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-stone-300">
                      <span>ادائیگی کر دی:</span>
                      <span className="font-bold text-emerald-400">{formatPrice(riceTotal - riceUdhaar, shop.currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-stone-300 border-t border-stone-800 pt-1.5">
                      <span className="font-bold text-rose-400">باقی ادھار (Udhaar Due):</span>
                      <span className="font-black text-rose-300 text-sm">{formatPrice(riceUdhaar, shop.currencySymbol)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setKhataTypeFilter('rice');
                      setActiveTab('udhaar_khata');
                    }}
                    className="w-full py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs rounded-xl font-bold cursor-pointer transition-colors"
                  >
                    چاول کا کھاتہ دیکھیں →
                  </button>
                </div>

                {/* 3. Masala & Packaging Khata Card */}
                <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <span className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
                      🌶️ <span>مصالحہ، آئل و ڈبے پیکنگ</span>
                    </span>
                    <span className="text-xs bg-stone-900 px-2 py-0.5 rounded text-stone-400">
                      {masalaKhata.length} اندراج
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-stone-300">
                      <span>کل خریدی:</span>
                      <span className="font-bold text-white">{formatPrice(masalaTotal, shop.currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-stone-300">
                      <span>ادائیگی کر دی:</span>
                      <span className="font-bold text-emerald-400">{formatPrice(masalaTotal - masalaUdhaar, shop.currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-stone-300 border-t border-stone-800 pt-1.5">
                      <span className="font-bold text-rose-400">باقی ادھار (Udhaar Due):</span>
                      <span className="font-black text-rose-300 text-sm">{formatPrice(masalaUdhaar, shop.currencySymbol)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setKhataTypeFilter('masala');
                      setActiveTab('udhaar_khata');
                    }}
                    className="w-full py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs rounded-xl font-bold cursor-pointer transition-colors"
                  >
                    تفصیل دیکھیں →
                  </button>
                </div>
              </div>

              {/* Customer Udhaar Quick Alert */}
              {customerUdhaarTotal > 0 && (
                <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-rose-300 block">
                        گاہکوں کی طرف بقایا ادھار: {formatPrice(customerUdhaarTotal, shop.currencySymbol)}
                      </span>
                      <span className="text-[11px] text-stone-400">
                        جن گاہکوں نے کھانا لے کر پیسے بعد میں دینے کا کہا ہے
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setKhataTypeFilter('customer_udhaar');
                      setActiveTab('udhaar_khata');
                    }}
                    className="px-3 py-1 bg-rose-500 hover:bg-rose-400 text-stone-950 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    گاہک ادھار دیکھیں
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UDHAAR & KHATA LEDGER ENTRIES */}
          {activeTab === 'udhaar_khata' && (
            <div className="space-y-3">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
                  {(['all', 'chicken', 'rice', 'masala', 'packaging', 'gas_fuel', 'customer_udhaar', 'other'] as const).map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() => setKhataTypeFilter(type)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors shrink-0 cursor-pointer ${
                          khataTypeFilter === type
                            ? 'bg-amber-500 text-stone-950'
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                      >
                        {type === 'all'
                          ? 'سب کھاتے'
                          : type === 'chicken'
                          ? '🍗 مرغی'
                          : type === 'rice'
                          ? '🍚 چاول'
                          : type === 'masala'
                          ? '🌶️ مصالحہ'
                          : type === 'packaging'
                          ? '📦 ڈبے پیکنگ'
                          : type === 'customer_udhaar'
                          ? '👤 گاہک ادھار'
                          : type}
                      </button>
                    )
                  )}
                </div>

                <div className="w-full sm:w-60 relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="سپلائر یا پارٹی تلاش کریں..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-stone-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Entries List */}
              {filteredKhata.length === 0 ? (
                <div className="text-center py-12 bg-stone-950/50 rounded-2xl border border-stone-800">
                  <p className="text-sm text-stone-400">کوئی کھاتہ یا ادھار کا اندراج نہیں ملا۔</p>
                  <button
                    onClick={() => setIsAddingEntry(true)}
                    className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl cursor-pointer"
                  >
                    + نیا اندراج شامل کریں
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredKhata.map((k) => (
                    <div
                      key={k.id}
                      className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-amber-500/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-amber-300">
                            {k.type === 'chicken'
                              ? '🍗 مرغی'
                              : k.type === 'rice'
                              ? '🍚 چاول'
                              : k.type === 'masala'
                              ? '🌶️ مصالحہ'
                              : k.type === 'customer_udhaar'
                              ? '👤 گاہک ادھار'
                              : '📄 کھاتہ'}
                          </span>
                          <span className="font-bold text-white text-sm">
                            {k.supplierOrPartyName}
                          </span>
                          <span className="text-[10px] text-stone-500 font-mono">
                            {k.dateStr} • {k.timeStr}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400">{k.description}</p>
                        {k.notes && <p className="text-[11px] text-stone-500 italic">نوٹ: {k.notes}</p>}
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-stone-800 pt-2 sm:pt-0">
                        <div className="text-right">
                          <div className="text-xs text-stone-400">
                            کل رقم: <strong className="text-white">{formatPrice(k.amount, shop.currencySymbol)}</strong>
                          </div>
                          {k.balanceDue > 0 ? (
                            <span className="text-xs font-black text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-600/40">
                              باقی ادھار: {formatPrice(k.balanceDue, shop.currencySymbol)}
                            </span>
                          ) : (
                            <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-600/40">
                              ✓ مکمل ادا شدہ (Paid)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {k.balanceDue > 0 && (
                            <button
                              onClick={() => {
                                onUpdateKhataEntry({
                                  ...k,
                                  paidAmount: k.amount,
                                  balanceDue: 0,
                                  status: 'paid',
                                });
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black text-xs rounded-xl cursor-pointer"
                              title="ادھار کلیئر کریں (Mark as Fully Paid)"
                            >
                              ادھار ختم
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteKhataEntry(k.id)}
                            className="p-1.5 text-stone-500 hover:text-rose-400 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                            title="ڈیلیٹ کریں"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DAILY LEDGER OF THE MONTH */}
          {activeTab === 'daily' && (
            <div className="space-y-3">
              <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 text-xs text-stone-400">
                مہینے کے ہر دن کی سیلز، کل فروخت شدہ ڈبے، اور خرچے کی روزانہ تفصیل:
              </div>

              {dailyList.length === 0 ? (
                <div className="text-center py-10 text-stone-400 text-xs">
                  اس مہینے کا کوئی ریکارڈ موجود نہیں ہے۔
                </div>
              ) : (
                <div className="space-y-2">
                  {dailyList.map((day) => (
                    <div
                      key={day.dateStr}
                      className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-black text-amber-300 text-sm block">
                          📅 {day.dateStr}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                          <span>{day.bills} بل</span>
                          <span>•</span>
                          <span className="text-amber-200 font-bold">📦 {day.dabbe} ڈبے فروخت</span>
                        </div>
                      </div>

                      <div className="text-right space-y-0.5">
                        <div className="text-sm font-black text-emerald-400">
                          سیل: {formatPrice(day.sales, shop.currencySymbol)}
                        </div>
                        {day.udhaar > 0 && (
                          <div className="text-xs font-bold text-rose-400">
                            ادھار: {formatPrice(day.udhaar, shop.currencySymbol)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <div className="text-xs text-stone-400">
            نوٹ: تمام کھاتہ ڈیٹا آپ کے براؤزر اور موبائل میں ہمیشہ محفوظ رہتا ہے۔
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            بند کریں (Close)
          </button>
        </div>
      </div>

      {/* Add Entry Sub-Modal */}
      {isAddingEntry && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEntry}
            className="bg-stone-900 border-2 border-amber-500 rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h3 className="font-black text-amber-300 text-base flex items-center gap-1.5">
                <PlusCircle className="w-5 h-5 text-amber-400" />
                <span>نیا کھاتہ یا ادھار کا اندراج</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingEntry(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 font-bold mb-1">کھاتہ کی قسم (Category)</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as KhataType)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 text-white outline-hidden"
                >
                  <option value="chicken">🍗 مرغی کا کھاتہ (Chicken Supply)</option>
                  <option value="rice">🍚 چاول کا کھاتہ (Rice & Grains)</option>
                  <option value="masala">🌶️ مصالحہ جات و آئل (Spices & Oil)</option>
                  <option value="packaging">📦 ڈبے، شاپر و پیکنگ (Packaging Boxes)</option>
                  <option value="gas_fuel">🔥 گیس سلنڈر و ایندھن (Gas / Fuel)</option>
                  <option value="customer_udhaar">👤 گاہک کا ادھار (Customer Udhaar)</option>
                  <option value="labour">👨‍🍳 کاریگر / ملازم کی تنخواہ (Labour)</option>
                  <option value="other">📄 دیگر متفرق اخراجات (Other)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">
                  {newType === 'customer_udhaar' ? 'گاہک کا نام و فون نمبر' : 'سپلائر / دکاندار کا نام'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={newType === 'chicken' ? 'مثال: حنیف پولٹری فارم' : 'نام درج کریں'}
                  value={newParty}
                  onChange={(e) => setNewParty(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 text-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">تفصیل (مثال: 50 کلو مرغی یا 2 بوری چاول)</label>
                <input
                  type="text"
                  placeholder="سامان کی تفصیل..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 text-white outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-300 font-bold mb-1">کل بل کی رقم ({shop.currencySymbol})</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 text-white font-mono outline-hidden font-bold"
                  />
                </div>
                <div>
                  <label className="block text-emerald-400 font-bold mb-1">نقد ادا کیے ({shop.currencySymbol})</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newPaid}
                    onChange={(e) => setNewPaid(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 text-white font-mono outline-hidden font-bold"
                  />
                </div>
              </div>

              {/* Live Remaining Balance Calculation */}
              <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800 flex justify-between items-center text-xs">
                <span className="text-stone-400">باقی رہ جانے والا ادھار:</span>
                <span className="font-black text-rose-400 text-sm">
                  {formatPrice(
                    Math.max(0, (parseFloat(newAmount) || 0) - (parseFloat(newPaid) || 0)),
                    shop.currencySymbol
                  )}
                </span>
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">اضافی نوٹ (اختیاری)</label>
                <input
                  type="text"
                  placeholder="کوئی خاص بات یا تاریخ..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 text-white outline-hidden"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingEntry(false)}
                className="flex-1 py-2.5 bg-stone-800 text-stone-300 rounded-xl font-bold cursor-pointer text-xs"
              >
                منسوخ
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl font-black cursor-pointer text-xs shadow-md"
              >
                محفوظ کریں (Save)
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
