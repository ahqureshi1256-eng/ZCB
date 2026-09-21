import React, { useState } from 'react';
import { OrderItem, Order, ShopSettings } from '../types';
import { formatPrice } from '../utils/billing';
import { posSound } from '../utils/audio';
import {
  Printer,
  Trash2,
  Plus,
  Minus,
  Receipt,
  Share2,
  Banknote,
  CreditCard,
  User,
  Phone,
  RotateCcw,
  Smartphone,
  Zap,
} from 'lucide-react';

interface ActiveBillPanelProps {
  items: OrderItem[];
  shop: ShopSettings;
  tokenNumber: number;
  onUpdateQuantity: (index: number, newQty: number) => void;
  onRemoveItem: (index: number) => void;
  onClearBill: () => void;
  onPrintBill: (orderData: Partial<Order>) => void;
  onOpenPreview: (orderData: Partial<Order>) => void;
  soundEnabled: boolean;
  upiQrDataUrl?: string;
}

export const ActiveBillPanel: React.FC<ActiveBillPanelProps> = ({
  items,
  shop,
  tokenNumber,
  onUpdateQuantity,
  onRemoveItem,
  onClearBill,
  onPrintBill,
  onOpenPreview,
  soundEnabled,
  upiQrDataUrl,
}) => {
  const [orderType, setOrderType] = useState<'takeaway' | 'dine_in' | 'delivery'>('takeaway');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryLandmark, setDeliveryLandmark] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<number>(50);
  const [riderName, setRiderName] = useState<string>('ZCB Bike Rider #1');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online' | 'card'>('cash');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [cashTendered, setCashTendered] = useState<number | ''>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [showCustomerFields, setShowCustomerFields] = useState<boolean>(false);

  const subtotal = items.reduce((sum, it) => sum + it.total, 0);
  const activeDeliveryFee = orderType === 'delivery' ? deliveryFee : 0;
  const totalAmount = Math.max(0, subtotal + activeDeliveryFee - discountAmount);

  const tenderVal = typeof cashTendered === 'number' ? cashTendered : 0;
  const changeDue = tenderVal > totalAmount ? tenderVal - totalAmount : 0;

  const currentOrderData: Partial<Order> = {
    tokenNumber,
    orderType,
    tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
    deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : undefined,
    deliveryLandmark: orderType === 'delivery' ? deliveryLandmark.trim() : undefined,
    deliveryFee: orderType === 'delivery' ? deliveryFee : undefined,
    riderName: orderType === 'delivery' ? riderName.trim() : undefined,
    customerName: customerName.trim() || undefined,
    customerPhone: customerPhone.trim() || undefined,
    items,
    subtotal,
    discountAmount,
    totalAmount,
    paymentMode,
    cashTendered: paymentMode === 'cash' && tenderVal > 0 ? tenderVal : undefined,
    changeDue: paymentMode === 'cash' && tenderVal > 0 ? changeDue : undefined,
  };

  const handlePrintClick = () => {
    if (items.length === 0) return;
    if (soundEnabled) {
      posSound.playPrintBill();
    }
    onPrintBill(currentOrderData);
  };

  const handleQuickCash = (amt: number) => {
    if (soundEnabled) posSound.playClick();
    setCashTendered(amt);
  };

  const handleShareWhatsApp = () => {
    if (items.length === 0) return;
    const itemList = items
      .map(
        (i) =>
          `• ${i.nameEn} ${i.portionLabelEn || i.portionLabelUr ? `(${i.portionLabelEn || i.portionLabelUr})` : ''} x ${i.quantity} = ${shop.currencySymbol} ${i.total}`
      )
      .join('\n');

    const msg = `*${shop.shortName || 'ZCB'} - ${shop.shopNameEn}*\n${shop.taglineEn}\n${shop.address}\n\n*Token #:* #${tokenNumber}\n*Order Type:* ${
      orderType === 'takeaway' ? 'Takeaway (Parcel)' : 'Dine-In'
    }\n------------------------\n${itemList}\n------------------------\n*Total Amount:* ${shop.currencySymbol} ${totalAmount}\n*Payment Mode:* ${
      paymentMode === 'cash' ? 'Cash' : paymentMode === 'online' ? 'Online' : 'Card'
    }\n\n${shop.footerNoteEn}`;

    const cleanPhone = customerPhone ? customerPhone.replace(/[^0-9]/g, '') : '';
    const url = `https://api.whatsapp.com/send?${
      cleanPhone ? `phone=${cleanPhone}&` : ''
    }text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-stone-900 rounded-2xl border border-stone-800 shadow-xl overflow-hidden">
      {/* Header with Token */}
      <div className="p-3.5 sm:p-4 bg-stone-950 text-white flex items-center justify-between border-b border-amber-500/30">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">
            ACTIVE BILL
          </span>
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-black tracking-tight text-amber-100">
              Token #{tokenNumber}
            </h2>
            <span className="text-xs text-stone-400 font-sans">
              ({items.length} {items.length === 1 ? 'Item' : 'Items'})
            </span>
          </div>
        </div>

        {/* Order Type Toggle: Takeaway vs Dine-In vs Bike Delivery */}
        <div className="flex bg-stone-900 p-1 rounded-xl border border-stone-700 shadow-inner gap-1">
          <button
            onClick={() => setOrderType('takeaway')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              orderType === 'takeaway'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            🛍️ Takeaway
          </button>
          <button
            onClick={() => setOrderType('dine_in')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              orderType === 'dine_in'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            🍽️ Dine-In
          </button>
          <button
            onClick={() => {
              setOrderType('delivery');
              setShowCustomerFields(true);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              orderType === 'delivery'
                ? 'bg-emerald-500 text-stone-950 shadow-xs ring-1 ring-emerald-300'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <span>🛵 Bike Delivery</span>
          </button>
        </div>
      </div>

      {orderType === 'dine_in' && (
        <div className="px-4 py-2 bg-stone-950/90 border-b border-stone-800 flex items-center gap-2 text-xs">
          <span className="font-bold text-amber-400">Table Number:</span>
          <input
            type="text"
            placeholder="e.g. Table 4 / Hall"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="px-2.5 py-1 bg-stone-900 border border-stone-700 text-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 w-40"
          />
        </div>
      )}

      {orderType === 'delivery' && (
        <div className="px-4 py-2.5 bg-emerald-950/40 border-b border-emerald-500/30 text-xs space-y-2">
          <div className="flex items-center justify-between text-emerald-300 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="text-base">🛵</span>
              <span>BIKE HOME DELIVERY DETAILS</span>
            </span>
            <span className="text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
              Delivery Fee: {shop.currencySymbol} {deliveryFee}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-stone-400 block mb-0.5">Delivery Address *</label>
              <input
                type="text"
                required
                placeholder="House #, Street #, Colony/Sector"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-900 border border-emerald-500/40 text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-stone-400 block mb-0.5">Landmark (قریبی نشانی)</label>
              <input
                type="text"
                placeholder="Near Mosque / Main Market"
                value={deliveryLandmark}
                onChange={(e) => setDeliveryLandmark(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-stone-400 block mb-0.5">Assigned Bike Rider</label>
              <input
                type="text"
                placeholder="e.g. Rider Ali / Bike 1"
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-stone-400 block mb-0.5">Delivery Fee (Rs.)</label>
              <input
                type="number"
                placeholder="50"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 font-bold text-amber-300"
              />
            </div>
          </div>
        </div>
      )}

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
            <Receipt className="w-12 h-12 text-stone-600 mb-3 animate-pulse" />
            <p className="font-bold text-stone-300 text-base">Cart is Empty</p>
            <p className="text-xs text-stone-500 mt-1 max-w-xs">
              Click Chicken Biryani (250g, 500g, 1 KG), Sada Biryani, or Cold Drinks to add items to this bill.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="p-2.5 rounded-xl border border-stone-800 bg-stone-950/70 hover:bg-stone-950 transition-colors flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-amber-100 text-sm truncate">
                    {item.nameEn || item.nameUr}
                  </div>
                  <div className="text-xs text-stone-400 font-sans flex items-center gap-1.5 mt-0.5">
                    {(item.portionLabelEn || item.portionLabelUr) && (
                      <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-bold text-[10px] border border-amber-500/30">
                        {item.portionLabelEn || item.portionLabelUr}
                      </span>
                    )}
                    <span className="text-[11px] text-stone-500">
                      @{formatPrice(item.unitPrice, shop.currencySymbol)} each
                    </span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-700 rounded-lg p-0.5 shadow-2xs">
                  <button
                    onClick={() => {
                      if (soundEnabled) posSound.playClick();
                      onUpdateQuantity(index, item.quantity - 1);
                    }}
                    className="w-6 h-6 rounded flex items-center justify-center text-stone-300 hover:bg-stone-800 hover:text-white active:scale-90 transition-all cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-xs text-amber-200">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => {
                      if (soundEnabled) posSound.playClick();
                      onUpdateQuantity(index, item.quantity + 1);
                    }}
                    className="w-6 h-6 rounded flex items-center justify-center text-stone-300 hover:bg-stone-800 hover:text-white active:scale-90 transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total & Remove */}
                <div className="text-right min-w-[65px]">
                  <div className="font-bold text-amber-300 text-sm">
                    {formatPrice(item.total, shop.currencySymbol)}
                  </div>
                  <button
                    onClick={() => onRemoveItem(index)}
                    className="text-stone-500 hover:text-rose-400 text-[10px] inline-flex items-center gap-0.5 mt-0.5 transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bill Footer & Checkout Actions */}
      <div className="border-t border-stone-800 bg-stone-950 p-3.5 sm:p-4 space-y-3 shrink-0">
        {/* Optional Customer Toggle */}
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => setShowCustomerFields(!showCustomerFields)}
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>{showCustomerFields ? 'Hide Customer Details' : '+ Customer Details (Optional)'}</span>
          </button>

          {items.length > 0 && (
            <button
              onClick={onClearBill}
              className="text-stone-500 hover:text-rose-400 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              title="Clear all items from bill"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Bill</span>
            </button>
          )}
        </div>

        {showCustomerFields && (
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-stone-900 border border-stone-800 rounded-xl">
            <div className="relative">
              <User className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-stone-950 border border-stone-700 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="Mobile # (e.g. 0333-7018183)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-stone-950 border border-stone-700 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        )}

        {/* Payment Method Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wide flex justify-between">
            <span>PAYMENT METHOD:</span>
            <span className="text-amber-400">Cash / Online / Card</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setPaymentMode('cash')}
              className={`py-2 px-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                paymentMode === 'cash'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>Cash</span>
            </button>
            <button
              onClick={() => setPaymentMode('online')}
              className={`py-2 px-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                paymentMode === 'online'
                  ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                  : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Online</span>
            </button>
            <button
              onClick={() => setPaymentMode('card')}
              className={`py-2 px-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                paymentMode === 'card'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                  : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Card</span>
            </button>
          </div>
        </div>

        {/* Cash Tendered & Quick Currency Calculator */}
        {paymentMode === 'cash' && items.length > 0 && (
          <div className="p-2.5 bg-stone-900 border border-emerald-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-300">Cash Received:</span>
              <div className="flex items-center gap-1">
                <span className="text-stone-400">{shop.currencySymbol}</span>
                <input
                  type="number"
                  placeholder="Amount"
                  value={cashTendered}
                  onChange={(e) =>
                    setCashTendered(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-28 px-2 py-1 bg-stone-950 border border-emerald-500/50 text-white rounded-lg text-xs font-bold text-right focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-1.5 justify-between">
              <button
                onClick={() => handleQuickCash(totalAmount)}
                className="flex-1 py-1 bg-stone-950 hover:bg-emerald-950 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/40 cursor-pointer shadow-2xs"
              >
                Exact
              </button>
              <button
                onClick={() => handleQuickCash(200)}
                className="flex-1 py-1 bg-stone-950 hover:bg-stone-800 text-stone-200 text-[10px] font-bold rounded border border-stone-700 cursor-pointer shadow-2xs"
              >
                200
              </button>
              <button
                onClick={() => handleQuickCash(500)}
                className="flex-1 py-1 bg-stone-950 hover:bg-stone-800 text-stone-200 text-[10px] font-bold rounded border border-stone-700 cursor-pointer shadow-2xs"
              >
                500
              </button>
              <button
                onClick={() => handleQuickCash(1000)}
                className="flex-1 py-1 bg-stone-950 hover:bg-stone-800 text-stone-200 text-[10px] font-bold rounded border border-stone-700 cursor-pointer shadow-2xs"
              >
                1000
              </button>
              <button
                onClick={() => handleQuickCash(5000)}
                className="flex-1 py-1 bg-stone-950 hover:bg-stone-800 text-stone-200 text-[10px] font-bold rounded border border-stone-700 cursor-pointer shadow-2xs"
              >
                5000
              </button>
            </div>

            {tenderVal > 0 && (
              <div className="flex justify-between items-center pt-1 border-t border-stone-800 text-xs">
                <span className="font-bold text-emerald-400">Change Due:</span>
                <span
                  className={`font-black text-sm ${
                    changeDue > 0 ? 'text-emerald-300' : 'text-stone-400'
                  }`}
                >
                  {formatPrice(changeDue, shop.currencySymbol)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Totals Breakdown */}
        <div className="pt-2 border-t border-stone-800 space-y-1">
          <div className="flex justify-between text-xs text-stone-400">
            <span>Subtotal:</span>
            <span>{formatPrice(subtotal, shop.currencySymbol)}</span>
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-sm font-black text-stone-200">
              TOTAL AMOUNT:
            </span>
            <span className="text-2xl font-black text-amber-400 tracking-tight">
              {formatPrice(totalAmount, shop.currencySymbol)}
            </span>
          </div>
        </div>

        {/* 1-CLICK THERMAL PRINTER PRINT BUTTON */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handlePrintClick}
            disabled={items.length === 0}
            className={`w-full py-4 px-4 rounded-xl font-black text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-[0.98] ${
              items.length > 0
                ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-amber-500/20 cursor-pointer ring-2 ring-amber-400'
                : 'bg-stone-800 text-stone-600 cursor-not-allowed shadow-none border border-stone-700'
            }`}
          >
            <Printer className="w-6 h-6 stroke-[2.5]" />
            <span className="tracking-wide uppercase">
              1-CLICK PRINT BILL
            </span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => onOpenPreview(currentOrderData)}
              disabled={items.length === 0}
              className="flex-1 py-2 px-2 bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-amber-400" />
              <span>Preview Receipt</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              disabled={items.length === 0}
              className="flex-1 py-2 px-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp Bill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

