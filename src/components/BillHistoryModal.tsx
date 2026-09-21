import React, { useState } from 'react';
import { Order, ShopSettings } from '../types';
import { formatPrice } from '../utils/billing';
import {
  History,
  X,
  Printer,
  Search,
  Banknote,
  Receipt,
  Share2,
  Smartphone,
  CreditCard,
  Coins,
} from 'lucide-react';

interface BillHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  shop: ShopSettings;
  onReprintOrder: (order: Order) => void;
  onOpenPreview: (order: Order) => void;
}

export const BillHistoryModal: React.FC<BillHistoryModalProps> = ({
  isOpen,
  onClose,
  orders,
  shop,
  onReprintOrder,
  onOpenPreview,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'cash' | 'online' | 'card'>('all');

  if (!isOpen) return null;

  // Analytics for today
  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCash = orders
    .filter((o) => o.paymentMode === 'cash')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOnline = orders
    .filter((o) => o.paymentMode === 'online' || o.paymentMode === 'upi')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const filteredOrders = orders.filter((o) => {
    const matchesFilter =
      filterMode === 'all' ||
      (filterMode === 'online' ? o.paymentMode === 'online' || o.paymentMode === 'upi' : o.paymentMode === filterMode);
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      o.billNumber.toLowerCase().includes(query) ||
      String(o.tokenNumber).includes(query) ||
      (o.customerName && o.customerName.toLowerCase().includes(query)) ||
      (o.customerPhone && o.customerPhone.includes(query));

    return matchesFilter && matchesSearch;
  });

  const handleShareWhatsApp = (order: Order) => {
    const itemList = order.items
      .map(
        (i) =>
          `• ${i.nameEn} ${i.portionLabelEn || i.portionLabelUr ? `(${i.portionLabelEn || i.portionLabelUr})` : ''} x ${i.quantity} = ${shop.currencySymbol} ${i.total}`
      )
      .join('\n');

    const msg = `*${shop.shortName || 'ZCB'} - ${shop.shopNameEn}*\n${shop.taglineEn}\n${shop.address}\n\n*Bill #:* ${order.billNumber} (#${order.tokenNumber})\n*Date:* ${order.dateStr} (${order.timeStr})\n------------------------\n${itemList}\n------------------------\n*Total:* ${shop.currencySymbol} ${order.totalAmount}\n*Payment:* ${
      order.paymentMode === 'cash' ? 'Cash' : order.paymentMode === 'online' || order.paymentMode === 'upi' ? 'Online' : 'Card'
    }\n\n${shop.footerNoteEn}`;

    const cleanPhone = order.customerPhone ? order.customerPhone.replace(/[^0-9]/g, '') : '';
    const url = `https://api.whatsapp.com/send?${
      cleanPhone ? `phone=${cleanPhone}&` : ''
    }text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-stone-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-stone-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 text-white flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-bold text-base text-amber-100">Today's Sales & Bill History</h2>
              <p className="text-xs text-stone-400 font-sans">Total {orders.length} receipts generated today</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Daily Sales Summary Bar */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-stone-950/60 border-b border-stone-800">
          <div className="bg-stone-900 p-3 rounded-xl border border-stone-800 shadow-inner">
            <div className="text-[11px] font-bold text-amber-400 uppercase flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Total Sales</span>
            </div>
            <div className="text-xl font-black text-amber-200 mt-1">
              {formatPrice(totalSales, shop.currencySymbol)}
            </div>
            <span className="text-[10px] text-stone-400">{orders.length} Orders</span>
          </div>

          <div className="bg-stone-900 p-3 rounded-xl border border-stone-800 shadow-inner">
            <div className="text-[11px] font-bold text-emerald-400 uppercase flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cash Total</span>
            </div>
            <div className="text-xl font-black text-emerald-300 mt-1">
              {formatPrice(totalCash, shop.currencySymbol)}
            </div>
            <span className="text-[10px] text-stone-400">
              {orders.filter((o) => o.paymentMode === 'cash').length} Cash Bills
            </span>
          </div>

          <div className="bg-stone-900 p-3 rounded-xl border border-stone-800 shadow-inner">
            <div className="text-[11px] font-bold text-sky-400 uppercase flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              <span>Online Total</span>
            </div>
            <div className="text-xl font-black text-sky-300 mt-1">
              {formatPrice(totalOnline, shop.currencySymbol)}
            </div>
            <span className="text-[10px] text-stone-400">
              {orders.filter((o) => o.paymentMode === 'online' || o.paymentMode === 'upi').length} Online Bills
            </span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 bg-stone-900">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by bill #, token #, or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-950 border border-stone-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setFilterMode('cash')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                filterMode === 'cash'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              Cash
            </button>
            <button
              onClick={() => setFilterMode('online')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                filterMode === 'online'
                  ? 'bg-sky-600 text-white'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              Online
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 text-stone-500 text-sm">
              <p className="font-semibold text-stone-400">No orders found.</p>
              <p className="text-xs text-stone-600 mt-1">Try another search or filter.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-3.5 rounded-xl border border-stone-800 bg-stone-950/70 hover:border-stone-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-inner"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-500 text-stone-950 font-black text-xs rounded">
                        #{order.tokenNumber}
                      </span>
                      <span className="font-bold text-stone-100 text-sm">
                        {order.billNumber}
                      </span>
                      <span className="text-xs text-stone-400">
                        • {order.timeStr}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.orderType === 'takeaway'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        }`}
                      >
                        {order.orderType === 'takeaway' ? 'Takeaway' : `Dine-In ${order.tableNumber ? `(Table ${order.tableNumber})` : ''}`}
                      </span>
                    </div>

                    <div className="text-xs text-stone-400 mt-1 line-clamp-1">
                      {order.items.map((i) => `${i.nameEn} (${i.portionLabelEn || i.portionLabelUr || 'Regular'}) x${i.quantity}`).join(', ')}
                    </div>

                    {order.customerName && (
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        Customer: {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ''}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-stone-800">
                    <div className="text-left md:text-right">
                      <div className="text-base font-black text-amber-300">
                        {formatPrice(order.totalAmount, shop.currencySymbol)}
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                          order.paymentMode === 'cash'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : order.paymentMode === 'online' || order.paymentMode === 'upi'
                            ? 'bg-sky-950 text-sky-300 border border-sky-800'
                            : 'bg-purple-950 text-purple-300 border border-purple-800'
                        }`}
                      >
                        {order.paymentMode.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onOpenPreview(order)}
                        title="Preview Receipt"
                        className="p-2 text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg border border-stone-700 transition-colors cursor-pointer"
                      >
                        <Receipt className="w-4 h-4 text-amber-400" />
                      </button>

                      <button
                        onClick={() => onReprintOrder(order)}
                        title="Reprint Bill"
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Print</span>
                      </button>

                      <button
                        onClick={() => handleShareWhatsApp(order)}
                        title="Share on WhatsApp"
                        className="p-2 text-emerald-400 hover:bg-emerald-950 rounded-lg border border-emerald-700/50 transition-colors cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

