import React, { useState } from 'react';
import { Order, ShopSettings, SummaryKotData } from '../types';
import { aggregateOrdersForSummaryKot } from '../utils/billing';
import {
  printSummaryKotDirectOrSystem,
  getActiveBluetoothSession,
} from '../utils/printerService';
import { SummaryKotReceipt } from './SummaryKotReceipt';
import {
  X,
  Printer,
  Bluetooth,
  UtensilsCrossed,
  Copy,
  Check,
  Share2,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';

interface SummaryKotModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  shop: ShopSettings;
}

export const SummaryKotModal: React.FC<SummaryKotModalProps> = ({
  isOpen,
  onClose,
  orders,
  shop,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  if (!isOpen || !orders || orders.length === 0) return null;

  const summaryData: SummaryKotData = aggregateOrdersForSummaryKot(orders);
  const btSession = getActiveBluetoothSession();

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintStatus('Transmitting to thermal printer...');
    try {
      const res = await printSummaryKotDirectOrSystem(orders, shop, summaryData);
      setPrintStatus(res.message);
      setTimeout(() => {
        setPrintStatus(null);
      }, 4000);
    } catch (err: any) {
      setPrintStatus('Print error: ' + (err?.message || 'Failed'));
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSystemPrint = () => {
    window.print();
  };

  const handleCopyKitchenText = () => {
    const itemsText = summaryData.items
      .map(
        (it) =>
          `• *${it.nameEn || it.nameUr}${it.portionLabelEn ? ` (${it.portionLabelEn})` : ''}* x ${it.totalQuantity}  (Tokens: ${it.tokens.map((t) => `#${t}`).join(', ')})`
      )
      .join('\n');

    const packingText = summaryData.orders
      .map(
        (o) =>
          `*#${o.tokenNumber}* (${o.orderType.toUpperCase()}): ${o.items
            .map((it) => `${it.quantity}x ${it.nameEn || it.nameUr}`)
            .join(', ')}`
      )
      .join('\n');

    const notesText =
      summaryData.notes && summaryData.notes.length > 0
        ? `\n\n*⚠️ Special Instructions:*\n` +
          summaryData.notes.map((n) => `• Token #${n.token}: "${n.note}"`).join('\n')
        : '';

    const text = `*🍳 ${shop.shortName || 'ZCB'} - CONSOLIDATED KITCHEN SUMMARY KOT*\n` +
      `*Batch Time:* ${summaryData.batchTime} (${summaryData.batchDate})\n` +
      `*Bills Selected:* ${summaryData.totalOrders} Orders\n` +
      `*Tokens:* ${summaryData.tokens.map((t) => `#${t}`).join(', ')}\n` +
      `*Total Items:* ${summaryData.totalItemCount} Portions\n\n` +
      `*--- BULK FOOD ITEMS TO COOK ---*\n${itemsText}\n\n` +
      `*--- PACKING BREAKDOWN ---*\n${packingText}${notesText}\n\n` +
      `_Cook fresh and pack hot!_`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const itemsText = summaryData.items
      .map(
        (it) =>
          `• ${it.nameEn || it.nameUr}${it.portionLabelEn ? ` (${it.portionLabelEn})` : ''} x ${it.totalQuantity} (Tokens: ${it.tokens.map((t) => `#${t}`).join(', ')})`
      )
      .join('\n');

    const text = `*🍳 ${shop.shortName || 'ZCB'} - KITCHEN SUMMARY KOT*\n` +
      `*Tokens:* ${summaryData.tokens.map((t) => `#${t}`).join(', ')}\n` +
      `*Total Portions:* ${summaryData.totalItemCount}\n` +
      `------------------------\n${itemsText}\n------------------------\n` +
      `Batch: ${summaryData.batchTime}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-stone-900 border-2 border-amber-500/70 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-stone-950 text-white flex items-center justify-between border-b border-amber-500/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <UtensilsCrossed className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base sm:text-lg text-amber-200">
                  Consolidated Summary KOT
                </h2>
                <span className="text-[10px] font-black uppercase bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full">
                  Bulk Kitchen
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {orders.length} bills selected for combined kitchen cooking & packing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Batch Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-stone-950/70 border-b border-stone-800 text-xs">
          <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800">
            <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Selected Bills</span>
            </div>
            <div className="text-lg font-black text-amber-200 mt-0.5">
              {summaryData.totalOrders} Orders
            </div>
            <span className="text-[10px] text-stone-400 truncate block">
              Tokens: {summaryData.tokens.map((t) => `#${t}`).join(', ')}
            </span>
          </div>

          <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800">
            <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Total Dishes</span>
            </div>
            <div className="text-lg font-black text-emerald-300 mt-0.5">
              {summaryData.totalItemCount} Portions
            </div>
            <span className="text-[10px] text-stone-400 block">
              {summaryData.items.length} Unique Dishes
            </span>
          </div>

          <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800">
            <div className="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Batch Created</span>
            </div>
            <div className="text-lg font-black text-sky-300 mt-0.5">
              {summaryData.batchTime}
            </div>
            <span className="text-[10px] text-stone-400 block truncate">
              {summaryData.batchDate}
            </span>
          </div>
        </div>

        {/* Actions Tool Bar */}
        <div className="p-3 bg-stone-900 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 rounded-xl text-xs sm:text-sm font-black shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-2 ring-1 ring-amber-300"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isPrinting
                  ? 'Sending...'
                  : btSession
                  ? `Print to BT (${btSession.deviceName})`
                  : 'Print Summary KOT (Thermal)'}
              </span>
            </button>

            <button
              onClick={handleSystemPrint}
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Browser Print</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyKitchenText}
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Copy Summary Text to Clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-300" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Send to Kitchen Chef WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Print Status Feedback Alert */}
        {printStatus && (
          <div className="px-4 py-2 bg-amber-500/20 text-amber-300 text-xs font-bold border-b border-amber-500/40 flex items-center justify-between">
            <span>{printStatus}</span>
            <button onClick={() => setPrintStatus(null)} className="text-stone-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Thermal Slip Preview Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-stone-950/80 flex justify-center">
          <div className="w-full max-w-sm">
            <SummaryKotReceipt summaryData={summaryData} shop={shop} isPrintOnly={false} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-stone-950 text-stone-400 text-xs border-t border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ESC/POS Auto-Cut: {shop.autoCutPaper !== false ? 'Enabled' : 'Disabled'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
