import React, { useState, useEffect } from 'react';
import { Order, ShopSettings } from '../types';
import { formatPrice } from '../utils/billing';
import { posSound } from '../utils/audio';
import {
  Printer,
  Bluetooth,
  Share2,
  CheckCircle,
  X,
  Zap,
  Scissors,
  Smartphone,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ZcbLogo } from './ZcbLogo';
import { printDirectOrSystem, getActiveBluetoothSession, connectWebBluetoothPrinter } from '../utils/printerService';

interface LiveBillDispenserModalProps {
  isOpen: boolean;
  order: Order | null;
  shop: ShopSettings;
  qrCodeDataUrl?: string;
  onClose: () => void;
  onUpdateShop?: (newShop: ShopSettings) => void;
}

export const LiveBillDispenserModal: React.FC<LiveBillDispenserModalProps> = ({
  isOpen,
  order,
  shop,
  qrCodeDataUrl,
  onClose,
  onUpdateShop,
}) => {
  const [isPrinting, setIsPrinting] = useState<boolean>(true);
  const [paperEjected, setPaperEjected] = useState<boolean>(false);
  const [printStatusText, setPrintStatusText] = useState<string>('🖨️ Dispensing bill from thermal slot...');
  const [activeSession, setActiveSession] = useState(getActiveBluetoothSession());

  useEffect(() => {
    if (!isOpen || !order) return;

    setIsPrinting(true);
    setPaperEjected(false);
    setPrintStatusText('🖨️ Printing & dispensing bill from thermal roller...');

    // Play realistic thermal printer motor buzz + paper feed sound
    if (shop.soundEnabled !== false) {
      posSound.playThermalPrinterMotor();
    }

    // Trigger paper sliding animation
    const timer1 = setTimeout(() => {
      setPaperEjected(true);
      setIsPrinting(false);
      const bt = getActiveBluetoothSession();
      setActiveSession(bt);
      if (bt) {
        setPrintStatusText(`✓ Printed to Bluetooth Thermal Printer: ${bt.deviceName}`);
      } else {
        setPrintStatusText('✓ Bill Ready! Tear paper or send to Bluetooth / System printer');
      }
    }, 900);

    return () => clearTimeout(timer1);
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const is58mm = shop.printerWidth === '58mm';
  const widthClass = is58mm ? 'max-w-[280px] text-[11px]' : 'max-w-[340px] text-xs';

  const handlePrintAgain = async (mode: 'both' | 'bill' | 'kot' = 'both') => {
    if (shop.soundEnabled !== false) {
      posSound.playClick();
    }
    setPrintStatusText('Sending to thermal printer...');
    const res = await printDirectOrSystem(order, shop, mode);
    if (res.directBluetooth) {
      setPrintStatusText(`✓ Sent to Bluetooth Thermal Printer: ${res.message}`);
    } else {
      setPrintStatusText('✓ Sent to POS / System Print Spooler');
    }
  };

  const handleConnectBtAndPrint = async () => {
    setPrintStatusText('🔍 Searching for Bluetooth thermal printer...');
    const conn = await connectWebBluetoothPrinter();
    if (conn.success) {
      setActiveSession(getActiveBluetoothSession());
      setPrintStatusText(`✓ Connected: ${conn.deviceName}. Sending bill...`);
      await printDirectOrSystem(order, shop, 'both');
    } else if (conn.cancelled) {
      setPrintStatusText('⚠️ Bluetooth selector closed without choosing a printer. Click BT Direct again to select.');
    } else {
      setPrintStatusText(`⚠️ BT Connection failed (${conn.error || 'Check printer'}). Using System Spooler...`);
      window.print();
    }
  };

  const handleShareWhatsApp = () => {
    const itemList = order.items
      .map(
        (i) =>
          `• ${i.nameEn || i.nameUr} ${i.portionLabelEn ? `(${i.portionLabelEn})` : ''} x ${i.quantity} = ${shop.currencySymbol} ${i.total}`
      )
      .join('\n');

    const discountLine =
      order.discountAmount && order.discountAmount > 0
        ? `\n*Discount:* - ${shop.currencySymbol} ${order.discountAmount}`
        : '';
    const deliveryLine =
      order.deliveryFee && order.deliveryFee > 0
        ? `\n*Delivery Fee:* + ${shop.currencySymbol} ${order.deliveryFee}`
        : '';

    const msg = `*${shop.shortName || 'ZCB'} - ${shop.shopNameEn}*\n${shop.taglineEn || 'Food Prepared Fresh'}\n${shop.address}\n\n*Token #:* #${order.tokenNumber}\n*Bill #:* ${order.billNumber}\n*Date:* ${order.dateStr} ${order.timeStr}\n------------------------\n${itemList}\n------------------------\n*Subtotal:* ${shop.currencySymbol} ${order.subtotal}${discountLine}${deliveryLine}\n*Total Amount:* ${shop.currencySymbol} ${order.totalAmount}\n*Payment Mode:* ${order.paymentMode.toUpperCase()}\n\n${shop.footerNoteEn || 'Thank you for your visit!'}`;

    const cleanPhone = order.customerPhone ? order.customerPhone.replace(/[^0-9]/g, '') : '';
    const url = `https://api.whatsapp.com/send?${
      cleanPhone ? `phone=${cleanPhone}&` : ''
    }text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-stone-900 border-2 border-amber-500/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto text-white">
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 px-4 py-3 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center font-black">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-stone-950 px-2 py-0.5 rounded-full">
                  LIVE POS BILL DISPENSER
                </span>
                <span className="text-xs font-bold text-amber-300 font-mono">
                  Token #{order.tokenNumber}
                </span>
              </div>
              <h3 className="text-sm font-black text-white">
                बिल निकल कर तैयार है (Receipt Dispensed)
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live POS Thermal Machine & Ejected Bill Viewport */}
        <div className="p-4 sm:p-6 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 flex flex-col items-center">
          {/* Status Pill */}
          <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-stone-900/90 border border-amber-500/30 rounded-full text-xs font-bold text-amber-300 shadow-inner">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPrinting ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span>{printStatusText}</span>
          </div>

          {/* POS Thermal Printer Hardware Frame with Extrusion Slot */}
          <div className="w-full max-w-[360px] bg-gradient-to-b from-stone-800 to-stone-900 border-4 border-stone-700 rounded-2xl shadow-2xl p-3 relative">
            {/* Top Metallic Bezel / LED Lights */}
            <div className="flex items-center justify-between px-2 pb-2 text-[10px] font-mono text-stone-400 border-b border-stone-700">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-emerald-400/50 shadow-sm" />
                <span className="font-bold text-stone-200">POWER</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-2" />
                <span className="font-bold text-amber-300">PRINT</span>
              </div>
              <span className="font-bold text-amber-400">
                {shop.printerWidth === '58mm' ? '58mm MINI' : '80mm POS'}
              </span>
            </div>

            {/* Thermal Feeder Cutter Slot */}
            <div className="mt-2.5 mx-auto h-3 bg-stone-950 rounded-full border-2 border-stone-950 shadow-inner relative flex items-center justify-center">
              <div className="w-4/5 h-0.5 bg-amber-500/40 rounded-full" />
            </div>

            {/* Paper Receipt Sliding Animation Container */}
            <div className="relative mt-[-4px] overflow-hidden max-h-[380px] overflow-y-auto rounded-b-lg border-t-2 border-dashed border-stone-400/60 shadow-2xl">
              <div
                className={`transition-all duration-700 ease-out transform ${
                  paperEjected
                    ? 'translate-y-0 opacity-100'
                    : '-translate-y-24 opacity-80'
                }`}
              >
                {/* Visual Thermal Receipt with Paper Texture */}
                <div
                  className={`bg-white text-black font-mono-receipt leading-tight select-none p-4 mx-auto shadow-2xl rounded-sm text-black ${widthClass}`}
                  style={{
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  {/* Brand Header */}
                  <div className="text-center pb-2">
                    <div className="flex justify-center mb-1">
                      {shop.logoUrl ? (
                        <img
                          src={shop.logoUrl}
                          alt={shop.shopNameEn || 'Logo'}
                          className="w-14 h-14 object-contain mx-auto"
                          style={{ filter: 'grayscale(100%) contrast(125%)' }}
                        />
                      ) : (
                        <ZcbLogo className="w-14 h-14 mx-auto" />
                      )}
                    </div>

                    <div className="font-black text-sm sm:text-base tracking-wider text-black uppercase">
                      {shop.shortName || 'ZCB'} - {shop.shopNameEn || 'ZAIQA CHICKEN BIRYANI'}
                    </div>

                    <p className="text-[9.5px] text-black font-bold uppercase mt-0.5 tracking-wide">
                      {shop.taglineEn || 'Food Prepared Fresh On Order'}
                    </p>
                    <p className="text-[8.5px] text-black mt-0.5">{shop.address}</p>
                    <p className="text-[9.5px] font-bold text-black mt-0.5">Order Tel: {shop.phone}</p>
                  </div>

                  <div className="border-t-2 border-black my-1" />

                  {/* Token & Order Type */}
                  <div className="flex items-center justify-between py-1 bg-stone-100 border border-black px-2 my-1">
                    <div className="text-left">
                      <span className="text-[8.5px] block uppercase font-bold text-black">TOKEN NO.</span>
                      <span className="text-lg font-black tracking-tight text-black">#{order.tokenNumber}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8.5px] block text-black font-semibold uppercase">ORDER TYPE:</span>
                      <span className="text-[10px] font-bold uppercase bg-black text-white px-2 py-0.5 rounded-xs">
                        {order.orderType === 'delivery'
                          ? '🛵 BIKE DELIVERY'
                          : order.orderType === 'takeaway'
                          ? 'TAKEAWAY'
                          : 'DINE-IN'}
                      </span>
                    </div>
                  </div>

                  {/* Bill Meta */}
                  <div className="text-[9px] text-black py-0.5 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Bill #: <strong>{order.billNumber}</strong></span>
                      <span>{order.dateStr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time: {order.timeStr}</span>
                      <span>Payment: <strong>{order.paymentMode.toUpperCase()}</strong></span>
                    </div>
                    {order.customerName && (
                      <div className="flex justify-between font-semibold text-black border-t border-dotted border-black/40 pt-0.5 mt-0.5">
                        <span>Customer: {order.customerName}</span>
                        {order.customerPhone && <span>{order.customerPhone}</span>}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-dashed border-black my-1" />

                  {/* Items Header */}
                  <div className="flex justify-between font-bold text-[9px] pb-0.5 uppercase border-b border-black">
                    <span className="w-1/2 text-left">ITEM</span>
                    <span className="w-1/4 text-center">RATE x QTY</span>
                    <span className="w-1/4 text-right">TOTAL</span>
                  </div>

                  {/* Items List */}
                  <div className="py-1 space-y-1">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="text-[9.5px] border-b border-dotted border-black/20 pb-0.5">
                        <div className="flex justify-between items-start font-bold text-black">
                          <span className="w-1/2 text-left pr-1 leading-tight font-black">
                            {it.nameEn || it.nameUr}
                            {(it.portionLabelEn || it.portionLabelUr) && (
                              <span className="block text-[8px] font-bold text-black bg-stone-100 px-1 rounded inline-block mt-0.5">
                                [{it.portionLabelEn || it.portionLabelUr}]
                              </span>
                            )}
                          </span>
                          <span className="w-1/4 text-center text-black font-semibold">
                            {shop.currencySymbol}{it.unitPrice} × {it.quantity}
                          </span>
                          <span className="w-1/4 text-right font-black">
                            {formatPrice(it.total, shop.currencySymbol)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-black my-1" />

                  {/* Financials */}
                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between text-black font-semibold">
                      <span>Subtotal:</span>
                      <span>{formatPrice(order.subtotal, shop.currencySymbol)}</span>
                    </div>
                    {order.deliveryFee && order.deliveryFee > 0 ? (
                      <div className="flex justify-between text-black font-bold">
                        <span>🛵 Bike Delivery:</span>
                        <span>+ {formatPrice(order.deliveryFee, shop.currencySymbol)}</span>
                      </div>
                    ) : null}
                    {order.discountAmount && order.discountAmount > 0 ? (
                      <div className="flex justify-between text-black font-black border border-black px-1 py-0.5 bg-stone-100 text-[9px]">
                        <span>🏷️ DISCOUNT:</span>
                        <span>- {formatPrice(order.discountAmount, shop.currencySymbol)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between items-center text-sm font-black border-t-2 border-b-2 border-black py-1 my-1 text-black">
                      <span className="uppercase">NET AMOUNT:</span>
                      <span className="text-base">{formatPrice(order.totalAmount, shop.currencySymbol)}</span>
                    </div>
                  </div>

                  {/* QR Code */}
                  {qrCodeDataUrl && (
                    <div className="text-center py-1">
                      <div className="inline-block p-1 border border-black bg-white">
                        <img src={qrCodeDataUrl} alt="QR Code" className="w-16 h-16 mx-auto" />
                      </div>
                      <p className="text-[7.5px] uppercase font-bold tracking-wider mt-0.5">
                        Scan to Verify • Official ZCB Bill
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="text-center text-[8.5px] text-black pt-1 space-y-1">
                    {shop.customReceiptFooter && shop.customReceiptFooter.trim() && (
                      <div className="p-1 border border-dashed border-black bg-stone-50 text-center font-black text-[9px] uppercase tracking-wide">
                        {shop.customReceiptFooter.trim()}
                      </div>
                    )}
                    <p className="font-bold text-[9.5px]">{shop.footerNoteEn}</p>
                    <p className="text-[7.5px]">*** ZCB Instant Thermal Receipt System ***</p>
                  </div>

                  {/* Bottom Jagged Tear Pattern */}
                  <div className="mt-3 pt-2 text-center border-t border-dashed border-black">
                    <span className="text-[8px] font-bold text-black uppercase tracking-widest">
                      ✂️ TEAR HERE ✂️
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handlePrintAgain('both')}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 font-black text-xs sm:text-sm rounded-xl shadow-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 ring-2 ring-amber-300"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Print Physical Copy (بل نکالیں)</span>
            </button>

            <button
              type="button"
              onClick={handleConnectBtAndPrint}
              className="px-3 py-2.5 bg-sky-600/30 hover:bg-sky-600/40 text-sky-300 border border-sky-500/50 rounded-xl text-xs font-black cursor-pointer transition-colors flex items-center gap-1.5"
              title="Connect Bluetooth Printer"
            >
              <Bluetooth className="w-4 h-4 text-sky-400" />
              <span>BT Direct</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-2.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (shop.soundEnabled !== false) {
                  posSound.playClick();
                }
                onClose();
              }}
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-black cursor-pointer transition-colors flex items-center gap-1.5 border border-stone-700"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Tear & Done (رسید حاصل کر لی)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
