import React from 'react';
import { Order, ShopSettings } from '../types';
import { formatPrice } from '../utils/billing';
import { posSound } from '../utils/audio';
import {
  Bell,
  Printer,
  CheckCircle,
  Phone,
  MessageCircle,
  MapPin,
  VolumeX,
  Volume2,
  Bike,
  Clock,
  Receipt,
  X,
  BellOff,
  Zap,
} from 'lucide-react';

interface IncomingOrderAlertModalProps {
  order: Order | null;
  shop: ShopSettings;
  isOpen: boolean;
  onClose: () => void;
  onAcceptAndPrint: (order: Order) => void;
  onAssignRider?: (orderId: string, riderName: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const IncomingOrderAlertModal: React.FC<IncomingOrderAlertModalProps> = ({
  order,
  shop,
  isOpen,
  onClose,
  onAcceptAndPrint,
  onAssignRider,
  isMuted,
  onToggleMute,
}) => {
  if (!isOpen || !order) return null;

  const [riderInput, setRiderInput] = React.useState<string>(order.riderName || 'Bike Rider Ali #1');
  const [hasAccepted, setHasAccepted] = React.useState<boolean>(false);
  const [autoAcceptCountdown, setAutoAcceptCountdown] = React.useState<number | null>(
    shop.autoAcceptOnlineOrders ? 4 : null
  );

  const handleAcceptOrder = React.useCallback(() => {
    posSound.stopContinuousOrderBell();
    posSound.speakOrderAccepted(shop.cashierName || 'Muzammil');
    setHasAccepted(true);
    setAutoAcceptCountdown(null);
    const updatedOrder = {
      ...order,
      riderName: riderInput,
      orderStatus: 'accepted' as const,
    };
    onAcceptAndPrint(updatedOrder);
  }, [order, riderInput, shop.cashierName, onAcceptAndPrint]);

  // Handle auto-accept countdown if enabled in POS device settings
  React.useEffect(() => {
    if (!shop.autoAcceptOnlineOrders || autoAcceptCountdown === null || hasAccepted) return;

    if (autoAcceptCountdown <= 0) {
      handleAcceptOrder();
      return;
    }

    const timer = setTimeout(() => {
      setAutoAcceptCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoAcceptCountdown, shop.autoAcceptOnlineOrders, hasAccepted, handleAcceptOrder]);

  const handleOpenWhatsApp = () => {
    if (!order.customerPhone) return;
    const cleanPhone = order.customerPhone.replace(/[^0-9]/g, '');
    const msg = `Salam ${order.customerName || 'Customer'}, your ZCB order #${order.tokenNumber} for Rs. ${order.totalAmount} has been accepted! Our bike rider is preparing for dispatch. Thank you for choosing Zaiqa Chicken Biryani!`;
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border-2 border-amber-500 text-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Urgent Header with Ringing Bell */}
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 p-4 flex items-center justify-between text-white shadow-md relative overflow-hidden">
          {/* Animated pulse ring */}
          <div className="absolute -left-10 -top-10 w-32 h-32 bg-white/20 rounded-full animate-ping pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white text-red-600 flex items-center justify-center shadow-lg animate-bounce">
              <Bell className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-black/40 px-2.5 py-0.5 rounded-full border border-white/30 text-amber-200">
                  {order.orderType === 'delivery' ? '🛵 BIKE DELIVERY ORDER' : '🛍️ ONLINE ORDER'}
                </span>
                <span className="text-xs bg-red-800 text-white font-bold px-2.5 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                  <span>🗣️ "New Incoming Online Order!"</span>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                New Order Token #{order.tokenNumber}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            {/* Direct Accept / Lift Order & Stop Bell Button in Header */}
            <button
              onClick={handleAcceptOrder}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5 ring-2 ring-white animate-pulse"
              title="Accept Order & Stop Alert Bell"
            >
              <CheckCircle className="w-4 h-4 stroke-[3]" />
              <span>🔔 Accept & Stop Bell</span>
            </button>

            {/* Dedicated Stop Bell button in Header */}
            <button
              onClick={() => posSound.stopContinuousOrderBell()}
              className="px-2.5 py-2 rounded-xl bg-red-950/90 hover:bg-red-900 text-red-200 border border-red-500/60 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="Stop Bell Sound"
            >
              <BellOff className="w-4 h-4 text-red-400" />
              <span>🛑 Stop Bell</span>
            </button>

            {/* Replay Voice Alert */}
            <button
              onClick={() => posSound.speakVoiceAlert(shop.cashierName || 'Cashier')}
              className="px-2.5 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-amber-200 border border-amber-400/40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="Replay Voice Call"
            >
              <span>🔊 Replay</span>
            </button>

            {/* Mute Bell Button */}
            <button
              onClick={onToggleMute}
              className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-white border border-white/30 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute Bell' : 'Mute Bell Sound'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-red-300" /> : <Volume2 className="w-5 h-5 text-amber-300" />}
            </button>
          </div>
        </div>

        {/* Modal Body - Order Details */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Customer & Delivery Address Card */}
          <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-400 border-b border-stone-800 pb-2">
              <span className="flex items-center gap-1.5 font-bold text-amber-400">
                <Bike className="w-4 h-4 text-emerald-400" />
                <span>Customer & Bike Delivery Info</span>
              </span>
              <span className="flex items-center gap-1 text-stone-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{order.timeStr} • {order.dateStr}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm pt-1">
              <div>
                <span className="text-[11px] text-stone-400 block">Customer Name</span>
                <span className="font-bold text-white text-base">
                  {order.customerName || 'Online Guest'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block">Contact Phone</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-emerald-400 font-mono">
                    {order.customerPhone || 'N/A'}
                  </span>
                  {order.customerPhone && (
                    <>
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200"
                        title="Call Customer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={handleOpenWhatsApp}
                        className="p-1 rounded bg-emerald-900/80 hover:bg-emerald-800 text-emerald-300"
                        title="WhatsApp Customer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {order.orderType === 'delivery' && (
              <div className="pt-2 border-t border-stone-800/80 space-y-1">
                <div className="flex items-start gap-1.5 text-xs">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-stone-200">
                      {order.deliveryAddress || 'Address on file'}
                    </span>
                    {order.deliveryLandmark && (
                      <span className="block text-[11px] text-amber-300 mt-0.5">
                        📍 Landmark: {order.deliveryLandmark}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {order.notes && (
              <div className="p-2 bg-stone-900 rounded-xl text-xs text-amber-200/90 italic border border-stone-800">
                💬 Note: "{order.notes}"
              </div>
            )}
          </div>

          {/* Ordered Food Items List */}
          <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800">
            <div className="flex items-center justify-between text-xs text-stone-400 border-b border-stone-800 pb-2 mb-2 font-bold uppercase tracking-wider">
              <span>Ordered Food Items</span>
              <span>Rate x Qty</span>
              <span>Total</span>
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto">
              {order.items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs p-2 bg-stone-900/70 rounded-xl border border-stone-800/80"
                >
                  <div className="flex-1">
                    <span className="font-bold text-white text-sm">
                      {it.nameEn || it.nameUr}
                    </span>
                    {(it.portionLabelEn || it.portionLabelUr) && (
                      <span className="ml-2 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                        {it.portionLabelEn || it.portionLabelUr}
                      </span>
                    )}
                  </div>
                  <div className="text-stone-400 font-mono text-center px-3">
                    {shop.currencySymbol}{it.unitPrice} × {it.quantity}
                  </div>
                  <div className="font-bold text-amber-300 text-sm font-mono text-right min-w-[60px]">
                    {formatPrice(it.total, shop.currencySymbol)}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="mt-3 pt-2.5 border-t border-stone-800 text-xs space-y-1">
              <div className="flex justify-between text-stone-400">
                <span>Items Subtotal:</span>
                <span className="font-mono">{formatPrice(order.subtotal, shop.currencySymbol)}</span>
              </div>
              {order.deliveryFee && order.deliveryFee > 0 ? (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>🛵 Bike Delivery Fee:</span>
                  <span className="font-mono">+ {formatPrice(order.deliveryFee, shop.currencySymbol)}</span>
                </div>
              ) : null}
              <div className="flex justify-between items-center text-base font-black text-amber-400 pt-1.5 border-t border-stone-800">
                <span>NET PAYABLE:</span>
                <span className="text-xl font-mono">{formatPrice(order.totalAmount, shop.currencySymbol)}</span>
              </div>
            </div>
          </div>

          {/* Bike Rider Assignment Field */}
          {order.orderType === 'delivery' && (
            <div className="p-3 bg-stone-950 rounded-2xl border border-emerald-500/30 space-y-1.5">
              <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Bike className="w-4 h-4" />
                <span>Assign Bike Delivery Rider:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={riderInput}
                  onChange={(e) => setRiderInput(e.target.value)}
                  placeholder="e.g. Rider Ali / Bike 1"
                  className="flex-1 px-3 py-2 bg-stone-900 border border-stone-700 text-white rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => setRiderInput('Bike Rider Rashid')}
                  className="px-2.5 py-1 text-[11px] bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg"
                >
                  Rider Rashid
                </button>
                <button
                  type="button"
                  onClick={() => setRiderInput('Bike Rider Tariq')}
                  className="px-2.5 py-1 text-[11px] bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg"
                >
                  Rider Tariq
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Auto-Accept Countdown Banner for POS Machine */}
        {shop.autoAcceptOnlineOrders && autoAcceptCountdown !== null && autoAcceptCountdown > 0 && (
          <div className="bg-amber-500/20 border-t border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs">
            <span className="font-bold text-amber-300 flex items-center gap-1.5 animate-pulse">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>POS Auto-Order: Accepting & printing bill in {autoAcceptCountdown}s...</span>
            </span>
            <button
              type="button"
              onClick={() => setAutoAcceptCountdown(null)}
              className="px-2 py-0.5 rounded bg-stone-800 text-[11px] font-bold text-stone-300 hover:text-white"
            >
              Pause
            </button>
          </div>
        )}

        {/* Modal Actions */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleAcceptOrder}
            className="flex-1 py-4 px-4 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-stone-950 font-black text-base sm:text-lg rounded-2xl flex items-center justify-center gap-2.5 shadow-2xl shadow-emerald-500/30 active:scale-[0.98] transition-all cursor-pointer ring-4 ring-emerald-400/50 animate-pulse"
          >
            <Printer className="w-6 h-6 stroke-[2.5] text-stone-950" />
            <div className="text-left sm:text-center leading-tight">
              <span className="block text-base sm:text-lg">✅ Accept & Print Thermal Bill</span>
              <span className="text-[11px] font-bold opacity-80 block font-sans">
                {shop.autoPrintOnAccept !== false ? '🖨️ Auto-Print Attached POS Machine' : 'Accept & Print Receipt'}
              </span>
            </div>
          </button>

          <button
            onClick={() => posSound.stopContinuousOrderBell()}
            className="py-3 px-4 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-600/70 font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
            title="Stop alert bell sound"
          >
            <BellOff className="w-4 h-4 text-red-400" />
            <span>🛑 Stop Bell</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleOpenWhatsApp}
              className="py-3 px-3 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => {
                posSound.stopContinuousOrderBell();
                onClose();
              }}
              className="py-3 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
