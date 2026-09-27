import React, { useState } from 'react';
import { Order, ShopSettings } from '../types';
import { formatPrice } from '../utils/billing';
import { printSummaryKotDirectOrSystem } from '../utils/printerService';
import { SummaryKotModal } from './SummaryKotModal';
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
  Trash2,
  AlertTriangle,
  RotateCcw,
  UtensilsCrossed,
  Check,
  CheckSquare,
  Square,
  Eye,
  Layers,
} from 'lucide-react';

interface BillHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  shop: ShopSettings;
  onReprintOrder: (order: Order, mode?: 'both' | 'bill' | 'kot') => void;
  onOpenPreview: (order: Order) => void;
  onDeleteOrder?: (orderId: string) => void;
  onClearAllOrders?: () => void;
  onPrintSummaryKot?: (selectedOrders: Order[]) => void;
}

export const BillHistoryModal: React.FC<BillHistoryModalProps> = ({
  isOpen,
  onClose,
  orders,
  shop,
  onReprintOrder,
  onOpenPreview,
  onDeleteOrder,
  onClearAllOrders,
  onPrintSummaryKot,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'cash' | 'online' | 'card'>('all');
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isSummaryKotOpen, setIsSummaryKotOpen] = useState(false);
  const [summaryStatusMessage, setSummaryStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedOrders = orders.filter((o) => selectedOrderIds.includes(o.id));

  const handleToggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredOrders.map((o) => o.id);
    const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedOrderIds.includes(id));
    if (areAllSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handlePrintSummaryKot = async () => {
    if (selectedOrders.length === 0) return;
    if (onPrintSummaryKot) {
      onPrintSummaryKot(selectedOrders);
      return;
    }
    setSummaryStatusMessage('Transmitting Summary KOT to thermal printer...');
    const res = await printSummaryKotDirectOrSystem(selectedOrders, shop);
    setSummaryStatusMessage(res.message);
    setTimeout(() => setSummaryStatusMessage(null), 4000);
  };

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

          <div className="flex gap-1.5 items-center">
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

            {filteredOrders.length > 0 && (
              <button
                onClick={handleSelectAllFiltered}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border ${
                  filteredOrders.every((o) => selectedOrderIds.includes(o.id))
                    ? 'bg-amber-500 text-stone-950 border-amber-400 font-black'
                    : 'bg-stone-800 hover:bg-stone-750 text-stone-200 border-stone-700'
                }`}
                title="Select all visible bills to print a consolidated Summary KOT"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>
                  {filteredOrders.every((o) => selectedOrderIds.includes(o.id))
                    ? 'Deselect All'
                    : `Select All (${filteredOrders.length})`}
                </span>
              </button>
            )}

            {onClearAllOrders && orders.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete all sales and bill history for today?')) {
                    onClearAllOrders();
                  }
                }}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 transition-colors flex items-center gap-1 cursor-pointer ml-1"
                title="Clear All Bills"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Consolidated Summary KOT Sticky Action Bar */}
        {selectedOrderIds.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-stone-950 border-b-2 border-amber-500 p-3 px-5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-md shrink-0">
                <UtensilsCrossed className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-amber-200 text-xs sm:text-sm">
                    {selectedOrders.length} {selectedOrders.length === 1 ? 'Bill' : 'Bills'} Selected for Kitchen KOT
                  </span>
                  <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded-full shadow-xs">
                    Tokens: {selectedOrders.map((o) => `#${o.tokenNumber}`).join(', ')}
                  </span>
                </div>
                <p className="text-[11px] text-stone-300 font-medium">
                  Group orders and print 1 combined Summary KOT with aggregated portions for bulk chef preparation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handlePrintSummaryKot}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 rounded-xl text-xs sm:text-sm font-black shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5 ring-1 ring-amber-300"
                title="Print Consolidated Kitchen Summary KOT directly to Thermal/Bluetooth printer"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                <span>🍳 Print Summary KOT ({selectedOrders.length})</span>
              </button>

              <button
                onClick={() => setIsSummaryKotOpen(true)}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/60 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                title="Preview Consolidated Kitchen Summary KOT and copy WhatsApp text"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Preview KOT</span>
              </button>

              <button
                onClick={() => setSelectedOrderIds([])}
                className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white rounded-xl text-xs font-semibold border border-stone-800 transition-colors cursor-pointer"
                title="Deselect all bills"
              >
                Deselect
              </button>
            </div>
          </div>
        )}

        {/* Status Notification Alert */}
        {summaryStatusMessage && (
          <div className="px-5 py-2 bg-amber-500/20 text-amber-300 text-xs font-bold border-b border-amber-500/40 flex items-center justify-between">
            <span>{summaryStatusMessage}</span>
            <button onClick={() => setSummaryStatusMessage(null)} className="text-stone-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Orders Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 text-stone-500 text-sm">
              <p className="font-semibold text-stone-400">No orders found.</p>
              <p className="text-xs text-stone-600 mt-1">Try another search or filter.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredOrders.map((order) => {
                const isSelected = selectedOrderIds.includes(order.id);
                return (
                  <div
                    key={order.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-inner ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 shadow-amber-500/10 ring-1 ring-amber-500/40'
                        : 'border-stone-800 bg-stone-950/70 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 w-full">
                      {/* Selection Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleSelectOrder(order.id)}
                        className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 border-amber-400 text-stone-950 shadow-sm ring-2 ring-amber-400/40'
                            : 'border-stone-700 bg-stone-900 hover:border-amber-400 text-transparent'
                        }`}
                        title={isSelected ? 'Remove from Summary KOT' : 'Select for Summary KOT'}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
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
                                : order.orderType === 'delivery'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {order.orderType === 'takeaway' ? 'Takeaway' : order.orderType === 'delivery' ? 'Bike Delivery' : 'Dine-In'}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-1.5 py-0.2 rounded uppercase">
                              ✓ Grouped
                            </span>
                          )}
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
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-stone-800">
                      <div className="text-left md:text-right">
                        <div className="text-base font-black text-amber-300">
                          {formatPrice(order.totalAmount, shop.currencySymbol)}
                        </div>
                        {order.discountAmount > 0 && (
                          <div className="text-[10px] font-black text-emerald-400">
                            -Rs. {order.discountAmount} Disc
                          </div>
                        )}
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

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Quick Group / Ungroup Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOrder(order.id)}
                          title={isSelected ? 'Remove from Consolidated KOT' : 'Add to Consolidated Summary KOT'}
                          className={`px-2 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-colors cursor-pointer border ${
                            isSelected
                              ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                              : 'bg-stone-900 hover:bg-stone-800 text-amber-300/90 border-stone-700'
                          }`}
                        >
                          <UtensilsCrossed className="w-3.5 h-3.5" />
                          <span>{isSelected ? '✓ KOT' : '+ KOT'}</span>
                        </button>

                        <button
                          onClick={() => onOpenPreview(order)}
                          title="Preview Receipt & KOT"
                          className="p-2 text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg border border-stone-700 transition-colors cursor-pointer"
                        >
                          <Receipt className="w-4 h-4 text-amber-400" />
                        </button>

                        <button
                          onClick={() => onReprintOrder(order, 'kot')}
                          title="Reprint Individual Kitchen KOT for Chef"
                          className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-black flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                        >
                          <span>🍳 Slip</span>
                        </button>

                        <button
                          onClick={() => onReprintOrder(order, 'both')}
                          title="Reprint Customer Bill + KOT"
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

                        {onDeleteOrder && (
                          <button
                            onClick={() => setOrderToDelete(order)}
                            title="Delete this order"
                            className="p-2 text-stone-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg border border-stone-800 hover:border-rose-700/50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Single Order Confirmation Modal */}
        {orderToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-stone-900 border-2 border-rose-600 text-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-full bg-rose-950 flex items-center justify-center border border-rose-700/50">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Delete Order?</h3>
                  <p className="text-xs text-rose-300">Token #{orderToDelete.tokenNumber} • {orderToDelete.billNumber}</p>
                </div>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">
                Are you sure you want to permanently delete Token <strong>#{orderToDelete.tokenNumber}</strong> ({formatPrice(orderToDelete.totalAmount, shop.currencySymbol)}) from sales history? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setOrderToDelete(null)}
                  className="px-3 py-1.5 text-xs font-bold text-stone-400 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteOrder && orderToDelete) {
                      onDeleteOrder(orderToDelete.id);
                      setOrderToDelete(null);
                    }
                  }}
                  className="px-4 py-1.5 text-xs font-black bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Consolidated Summary KOT Preview & Print Modal */}
        <SummaryKotModal
          isOpen={isSummaryKotOpen}
          onClose={() => setIsSummaryKotOpen(false)}
          orders={selectedOrders}
          shop={shop}
        />
      </div>
    </div>
  );
};

