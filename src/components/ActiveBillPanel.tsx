import React, { useState, useEffect } from 'react';
import { OrderItem, Order, ShopSettings } from '../types';
import { formatPrice } from '../utils/billing';
import { posSound } from '../utils/audio';
import {
  Printer,
  Bluetooth,
  Trash2,
  Plus,
  Minus,
  Receipt,
  Banknote,
  Smartphone,
  PlusCircle,
  Settings,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  getActiveBluetoothSession,
  addBluetoothStatusListener,
  tryAutoConnectBluetoothPrinter,
  heartbeatBluetooth,
} from '../utils/printerService';

interface ActiveBillPanelProps {
  items: OrderItem[];
  shop: ShopSettings;
  tokenNumber: number;
  onUpdateQuantity: (index: number, newQty: number) => void;
  onRemoveItem: (index: number) => void;
  onClearBill: () => void;
  onPrintBill: (orderData: Partial<Order>, mode?: 'both' | 'bill' | 'kot', options?: { skipPreview?: boolean }) => void;
  onOpenMenu?: () => void;
  soundEnabled: boolean;
  onOpenPrinterSetup?: () => void;
  onUpdateShop?: (newShop: ShopSettings) => void;
  // Optional backwards-compatibility props
  onUpdateUnitPrice?: (index: number, newUnitPrice: number) => void;
  onAddCustomItem?: (name: string, price: number, portion?: string) => void;
  onOpenPreview?: (orderData: Partial<Order>) => void;
  upiQrDataUrl?: string;
  onOpenPosSettings?: () => void;
}

export const ActiveBillPanel: React.FC<ActiveBillPanelProps> = ({
  items,
  shop,
  tokenNumber,
  onUpdateQuantity,
  onRemoveItem,
  onClearBill,
  onPrintBill,
  onOpenMenu,
  soundEnabled,
  onOpenPrinterSetup,
}) => {
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online' | 'card'>('cash');
  const [orderType, setOrderType] = useState<'takeaway' | 'dine_in' | 'delivery'>('takeaway');

  // Real-time Bluetooth Session Tracking
  const [btSession, setBtSession] = useState(getActiveBluetoothSession());

  useEffect(() => {
    const unsub = addBluetoothStatusListener((session) => {
      setBtSession(session);
    });

    // Auto-connect attempt on mount
    tryAutoConnectBluetoothPrinter(shop.bluetoothDeviceName).catch(() => {});

    // Gentle heartbeat when active
    const heartbeatInterval = setInterval(() => {
      const current = getActiveBluetoothSession();
      if (current?.device?.gatt?.connected) {
        heartbeatBluetooth().catch(() => {});
      } else {
        tryAutoConnectBluetoothPrinter(shop.bluetoothDeviceName).catch(() => {});
      }
    }, 10000);

    return () => {
      unsub();
      clearInterval(heartbeatInterval);
    };
  }, [shop.bluetoothDeviceName]);

  const subtotal = items.reduce((sum, it) => sum + it.total, 0);
  const totalAmount = subtotal;

  // Build finalized order object
  const currentOrderData: Partial<Order> = {
    orderType,
    items: [...items],
    subtotal,
    discountAmount: 0,
    totalAmount,
    paymentMode,
  };

  // 1-Click Print & Finalize Master Action
  const handlePrintAndFinalize = () => {
    if (items.length === 0) return;
    if (soundEnabled) {
      posSound.playPrintBill();
    }
    onPrintBill(currentOrderData, 'both', { skipPreview: true });
  };

  const handleOpenMenuClick = () => {
    if (soundEnabled) posSound.playClick();
    if (onOpenMenu) {
      onOpenMenu();
    }
  };

  return (
    <div className="flex flex-col h-auto lg:h-full bg-stone-900 rounded-3xl border-2 border-stone-800 shadow-2xl overflow-visible lg:overflow-hidden">
      {/* 1. HEADER: Token ID, Bluetooth Status Trigger & Clear Action */}
      <div className="p-3.5 sm:p-4 bg-stone-950 text-white flex items-center justify-between border-b border-amber-500/30 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="px-3 py-1 bg-amber-500 text-stone-950 font-mono font-black text-sm sm:text-base rounded-xl shadow-md shrink-0">
            #{tokenNumber}
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
              Active Bill ({items.length})
            </h2>
          </div>
        </div>

        {/* Right Header Actions: Bluetooth Settings & Clear Cart */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Bluetooth Settings Pill Button - Opens full Bluetooth settings modal */}
          {onOpenPrinterSetup && (
            <button
              type="button"
              onClick={onOpenPrinterSetup}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border active:scale-95 shadow-sm ${
                btSession && btSession.characteristic
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 ring-1 ring-emerald-500/30'
                  : 'bg-stone-800 hover:bg-stone-700 text-amber-300 border-amber-500/40'
              }`}
              title="بلوٹوتھ پرنٹر سیٹنگز کھولیں (Open Bluetooth Settings)"
            >
              <Bluetooth className={`w-3.5 h-3.5 ${btSession && btSession.characteristic ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="truncate max-w-[110px] sm:max-w-none">
                {btSession && btSession.characteristic ? `✓ ${btSession.deviceName || 'Printer'}` : 'بلوٹوتھ جوڑیں'}
              </span>
            </button>
          )}

          {/* Cancel/Clear Bill */}
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (soundEnabled) posSound.playClick();
                if (window.confirm('Are you sure you want to clear all items from this bill?')) {
                  onClearBill();
                }
              }}
              className="p-2 text-stone-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer border border-stone-800"
              title="Clear all items from bill"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN BILL AREA: ITEM LIST */}
      <div className="flex-1 overflow-y-visible lg:overflow-y-auto p-3 sm:p-4 space-y-2.5 bg-stone-950/40">
        {items.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-stone-500 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-600 shadow-inner">
              <Receipt className="w-7 h-7" />
            </div>
            <div>
              <p className="font-black text-stone-300 text-sm sm:text-base">بل میں کوئی چیز شامل نہیں ہے</p>
              <p className="text-xs text-stone-500 mt-1">
                کھانے منتخب کرنے کے لیے نیچے دیئے گئے "Add Items" بٹن پر کلک کریں۔
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="p-3 rounded-2xl border-2 border-stone-800 bg-stone-900/90 flex items-center justify-between gap-3 shadow-md transition-all hover:border-stone-700"
              >
                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white text-sm sm:text-base leading-tight truncate">
                    {item.nameEn || item.nameUr}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {(item.portionLabelEn || item.portionLabelUr || item.portionLabel) && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-md font-black text-[11px] border border-amber-500/30">
                        {item.portionLabelEn || item.portionLabelUr || item.portionLabel}
                      </span>
                    )}
                    <span className="font-mono text-stone-400 font-bold text-xs">
                      @{formatPrice(item.unitPrice, shop.currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* Quantity Stepper [-] [Count] [+] */}
                <div className="flex items-center gap-1 bg-stone-950 border border-stone-700 rounded-xl p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) posSound.playClick();
                      onUpdateQuantity(index, item.quantity - 1);
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-stone-800 hover:bg-stone-700 text-amber-300 cursor-pointer font-black active:scale-95 transition-all"
                  >
                    <Minus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                  <div className="min-w-[30px] text-center font-mono font-black text-sm text-amber-400">
                    {item.quantity}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) posSound.playClick();
                      onUpdateQuantity(index, item.quantity + 1);
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer font-black active:scale-95 transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>

                {/* Line Total & Remove Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="font-black text-amber-300 text-sm sm:text-base font-mono text-right min-w-[55px]">
                    {formatPrice(item.total, shop.currencySymbol)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) posSound.playClick();
                      onRemoveItem(index);
                    }}
                    className="text-stone-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Remove Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. TOTAL SUMMARY & PROMINENT CALL-TO-ACTION BUTTONS */}
      <div className="p-3.5 sm:p-5 bg-stone-950 border-t-2 border-stone-800 space-y-4">
        {/* Total Summary Row */}
        <div className="flex justify-between items-center bg-stone-900/90 border border-stone-800 p-3.5 rounded-2xl shadow-inner">
          <div className="space-y-0.5">
            <span className="text-xs sm:text-sm font-black text-stone-300 uppercase tracking-wider block">
              TOTAL AMOUNT (کل رقم):
            </span>
            <div className="flex items-center gap-2">
              {/* Compact Payment Toggle */}
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  paymentMode === 'cash'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white bg-stone-950'
                }`}
              >
                <Banknote className="w-3 h-3" />
                <span>Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('online')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  paymentMode === 'online'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white bg-stone-950'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Online</span>
              </button>
            </div>
          </div>

          <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono tracking-tight text-right">
            {formatPrice(totalAmount, shop.currencySymbol)}
          </div>
        </div>

        {/* 4. TWO PROMINENT CALL-TO-ACTION BUTTONS: 'Add Items' & 'Print Bill/Finalize' */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          {/* BUTTON 1: Add Items (To Open Menu / Add Dishes) */}
          <button
            type="button"
            onClick={handleOpenMenuClick}
            className="sm:col-span-5 py-4 px-4 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 bg-stone-900 hover:bg-stone-800 text-amber-300 border-2 border-amber-500/50 hover:border-amber-400 shadow-lg cursor-pointer transition-all active:scale-95"
            title="Open menu to select more dishes"
          >
            <PlusCircle className="w-5 h-5 text-amber-400 stroke-[2.5]" />
            <span>+ Add Items (مینو)</span>
          </button>

          {/* BUTTON 2: Consolidated 'Print Bill / Finalize' */}
          <button
            type="button"
            id="quick-print-floating-btn"
            onClick={handlePrintAndFinalize}
            disabled={items.length === 0}
            className={`sm:col-span-7 py-4 px-5 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-[0.98] ${
              items.length > 0
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 shadow-amber-500/30 cursor-pointer ring-2 ring-amber-300'
                : 'bg-stone-800 text-stone-600 cursor-not-allowed shadow-none border border-stone-700'
            }`}
            title="Print Full Bill & Finalize Order"
          >
            <Printer className="w-6 h-6 stroke-[2.5]" />
            <span className="tracking-wide uppercase font-black">
              PRINT BILL (بل نکالیں)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
