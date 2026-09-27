import React from 'react';
import { Order, ShopSettings } from '../types';
import { ThermalReceipt } from './ThermalReceipt';
import { X, Printer } from 'lucide-react';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  shop: ShopSettings;
  qrCodeDataUrl?: string;
  onPrint: (mode?: 'bill' | 'kot' | 'both') => void;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  isOpen,
  onClose,
  order,
  shop,
  qrCodeDataUrl,
  onPrint,
}) => {
  const [selectedMode, setSelectedMode] = React.useState<'both' | 'bill' | 'kot'>('both');

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-stone-900 rounded-3xl shadow-2xl border border-stone-700 max-w-lg w-full overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-stone-950 text-white flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold text-sm text-amber-100 flex items-center gap-2">
              <span>Receipt Preview: Bill #{order.tokenNumber}</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {order.billNumber}
              </span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection: Bill / KOT / Both */}
        <div className="p-2.5 bg-stone-950 border-b border-stone-800 flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedMode('both')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedMode === 'both'
                ? 'bg-amber-500 text-stone-950 shadow-md ring-2 ring-amber-300'
                : 'bg-stone-900 text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            🖨️ Both (Bill + KOT)
          </button>
          <button
            type="button"
            onClick={() => setSelectedMode('bill')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedMode === 'bill'
                ? 'bg-amber-500 text-stone-950 shadow-md ring-2 ring-amber-300'
                : 'bg-stone-900 text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            🧾 Customer Bill Only
          </button>
          <button
            type="button"
            onClick={() => setSelectedMode('kot')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedMode === 'kot'
                ? 'bg-amber-500 text-stone-950 shadow-md ring-2 ring-amber-300'
                : 'bg-stone-900 text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            🍳 Kitchen KOT Only
          </button>
        </div>

        {/* Realistic Receipt Paper in Scroll Container */}
        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-stone-950/70">
          <ThermalReceipt
            order={order}
            shop={shop}
            qrCodeDataUrl={qrCodeDataUrl}
            isPrintOnly={false}
            printMode={selectedMode}
          />
        </div>

        {/* Bottom Actions */}
        <div className="p-3.5 bg-stone-950 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-stone-300 hover:bg-stone-800 rounded-xl cursor-pointer"
          >
            Close
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPrint('kot')}
              className="px-3.5 py-2.5 text-xs font-black bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-xl border border-amber-500/40 shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print Kitchen Order Ticket (KOT)"
            >
              <span>🍳 Print KOT</span>
            </button>

            <button
              type="button"
              onClick={() => onPrint(selectedMode)}
              className="px-5 py-2.5 text-xs sm:text-sm font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer ring-2 ring-amber-300 active:scale-95"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>
                {selectedMode === 'both'
                  ? 'Print Bill + KOT'
                  : selectedMode === 'kot'
                  ? 'Print Kitchen KOT'
                  : 'Print Customer Bill'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

