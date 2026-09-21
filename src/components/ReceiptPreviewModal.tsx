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
  onPrint: () => void;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  isOpen,
  onClose,
  order,
  shop,
  qrCodeDataUrl,
  onPrint,
}) => {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-stone-900 rounded-2xl shadow-2xl border border-stone-700 max-w-md w-full overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-stone-950 text-white flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold text-sm text-amber-100">
              Thermal Receipt Preview
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Realistic Receipt Paper in Scroll Container */}
        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-stone-950/70">
          <ThermalReceipt
            order={order}
            shop={shop}
            qrCodeDataUrl={qrCodeDataUrl}
            isPrintOnly={false}
          />
        </div>

        {/* Bottom Actions */}
        <div className="p-3 bg-stone-950 border-t border-stone-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-300 hover:bg-stone-800 rounded-xl cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="px-5 py-2 text-xs font-black bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl shadow-md flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Print Bill</span>
          </button>
        </div>
      </div>
    </div>
  );
};

