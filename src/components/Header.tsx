import React, { useState } from 'react';
import { ShopSettings, Order, AuthUser } from '../types';
import { formatPrice } from '../utils/billing';
import { ZcbLogo } from './ZcbLogo';
import { posSound } from '../utils/audio';
import {
  Store,
  History,
  Volume2,
  VolumeX,
  Printer,
  Bluetooth,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Phone,
  ReceiptText,
  Globe,
  Bell,
  BellOff,
  CheckCircle,
  Bike,
  MoreVertical,
  BookOpen,
  Share2,
  Trash2,
  RotateCcw,
  Mail,
  MapPin,
  ShieldCheck,
  User,
  Smartphone,
  UtensilsCrossed,
} from 'lucide-react';

interface HeaderProps {
  shop: ShopSettings;
  orders: Order[];
  currentUser?: AuthUser | null;
  onOpenGoogleAuth?: () => void;
  isBellRinging?: boolean;
  onAcceptAndStopBell?: () => void;
  onRingBell?: () => void;
  onOpenEditShop: () => void;
  onOpenHistory: () => void;
  onOpenKhata?: () => void;
  onOpenPrinterSetup?: () => void;
  onOpenPosSettings?: () => void;
  onOpenShareLink?: () => void;
  onOpenGmail?: () => void;
  onOpenGoogleMaps?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSwitchToCustomerSite?: () => void;
  pendingOnlineCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  shop,
  orders,
  currentUser,
  onOpenGoogleAuth,
  isBellRinging = false,
  onAcceptAndStopBell,
  onRingBell,
  onOpenEditShop,
  onOpenHistory,
  onOpenKhata,
  onOpenPrinterSetup,
  onOpenPosSettings,
  onOpenShareLink,
  onOpenGmail,
  onOpenGoogleMaps,
  soundEnabled,
  onToggleSound,
  onSwitchToCustomerSite,
  pendingOnlineCount = 0,
}) => {
  const [isThreeDotsOpen, setIsThreeDotsOpen] = useState(false);
  const todayTotal = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  const handlePrinterClick = () => {
    if (onOpenPrinterSetup) {
      onOpenPrinterSetup();
    } else {
      onOpenEditShop();
    }
  };

  const handleTestBell = () => {
    posSound.testVoiceAlert(shop.cashierName || 'Muzammil');
  };

  return (
    <header className="text-white shadow-xl relative z-30 select-none">
      {/* Compact ZCB Biryani Banner Header with All Controls & Information Directly on the Banner */}
      <div id="header-top-banner-container" className="relative w-full overflow-hidden border-b-2 border-amber-500/50 bg-stone-950 py-2 sm:py-2.5 px-3 sm:px-6 shadow-xl">
        {/* Banner Background Image */}
        {shop.bannerUrl && (
          <img
            src={shop.bannerUrl}
            alt="ZCB Biryani Banner"
            className="absolute inset-0 w-full h-full object-cover object-center filter brightness-65 contrast-110 pointer-events-none"
          />
        )}
        {/* Rich Dark Tint Overlays for Perfect Contrast and Legibility */}
        <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-[1.5px] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-950/75 to-stone-950/90 pointer-events-none" />

        {/* Content & Controls positioned directly ON TOP of the banner */}
        <div className="relative z-10 max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left Title & Status with Enlarged Crisp Logo */}
          <div className="flex items-center gap-3">
            {/* Prominent Official ZCB Logo */}
            <div className="relative group shrink-0">
              <ZcbLogo
                className="w-13 h-13 sm:w-15 sm:h-15 border-2 border-amber-400 shadow-xl rounded-full bg-stone-950 ring-2 ring-amber-400/40"
                imageUrl={shop.logoUrl}
              />
            </div>

            {/* Crisp Elevated Title & Details */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-xl md:text-2xl font-black text-amber-200 tracking-wide uppercase drop-shadow-md">
                  {shop.shortName || 'ZCB'} - {shop.shopNameEn}
                </span>
                <span className="text-[10px] sm:text-[11px] uppercase font-black tracking-wider px-2 py-0.5 bg-amber-500 text-stone-950 rounded-lg shadow-sm">
                  POS TERMINAL
                </span>
              </div>
              <div className="text-xs text-stone-200 flex items-center gap-2 font-medium flex-wrap mt-0.5 drop-shadow-sm">
                <span className="text-amber-300 font-bold">{shop.taglineEn || 'Food Prepared Fresh on Order'}</span>
                <span className="text-stone-400">•</span>
                <span className="text-xs text-amber-200 font-sans font-bold flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 inline text-amber-400" />
                  {shop.phone}
                </span>
                <span className="text-stone-400">•</span>
                <span className="text-xs text-stone-300">
                  Cashier: <strong className="text-amber-300 font-bold">{shop.cashierName || 'Muzammil'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Widgets - Positioned right on the banner */}
          <div id="header-right-action-widgets" className="flex items-center gap-2 flex-wrap">
            {/* View Customer Online Ordering Website Button */}
            {onSwitchToCustomerSite && (
              <button
                onClick={onSwitchToCustomerSite}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer ring-1 ring-amber-300"
                title="Open Customer Online Ordering Website where customers place bike delivery orders"
              >
                <Globe className="w-4 h-4" />
                <span>🌐 Customer Website</span>
                {pendingOnlineCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-stone-950 text-amber-300 rounded-full text-[10px] font-mono animate-pulse">
                    {pendingOnlineCount}
                  </span>
                )}
              </button>
            )}

            {/* Continuous Bell Ringing & Single-Button "Accept Order & Stop Bell" */}
            {isBellRinging ? (
              <div className="flex items-center gap-1.5 animate-pulse">
                <button
                  onClick={onAcceptAndStopBell}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 via-emerald-600 to-emerald-500 hover:from-red-500 hover:to-emerald-400 text-white border-2 border-white rounded-xl text-xs font-black transition-transform active:scale-95 cursor-pointer shadow-xl ring-4 ring-red-500/50"
                  title="Accept incoming order and silence bell"
                >
                  <BellOff className="w-4 h-4 text-white animate-bounce" />
                  <span>🔔 Accept Order & Stop Bell</span>
                </button>
                <button
                  onClick={onAcceptAndStopBell}
                  className="px-2 py-1.5 bg-red-900/90 hover:bg-red-800 text-red-200 border border-red-500 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="Stop bell"
                >
                  🛑 Silence
                </button>
              </div>
            ) : (
              <button
                onClick={onRingBell || handleTestBell}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-950/90 hover:bg-red-900 text-red-100 border border-red-600/70 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs"
                title={`Ring Bell alert: "Order Alert for Cashier"`}
              >
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span>🔊 Ring Bell ({shop.cashierName || 'Cashier'})</span>
              </button>
            )}

            {/* Daily Sales Stat */}
            <div
              onClick={onOpenHistory}
              className="flex items-center gap-2 px-3 py-1.5 bg-stone-800/90 hover:bg-stone-800 border border-amber-500/30 rounded-xl cursor-pointer transition-all hover:border-amber-400 shadow-xs"
              title="Today's sales total and orders count"
            >
              <div className="text-left">
                <div className="text-[9px] text-amber-300/80 uppercase font-semibold">Today's Sales:</div>
                <div className="text-xs sm:text-sm font-black text-amber-300 leading-tight">
                  {formatPrice(todayTotal, shop.currencySymbol)}
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-200 rounded font-bold border border-amber-500/30">
                {orders.length} {orders.length === 1 ? 'Bill' : 'Bills'}
              </span>
            </div>

            {/* Three Dots (⋮) Settings & All Features Hub Button */}
            <div className="relative">
              <button
                id="header-three-dots-btn"
                onClick={() => setIsThreeDotsOpen(!isThreeDotsOpen)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 rounded-xl font-black text-xs sm:text-sm border-2 border-amber-300 shadow-lg transition-all cursor-pointer active:scale-95 ring-2 ring-amber-400/50"
                title="Open all Settings & Features Hub"
              >
                <MoreVertical className="w-5 h-5 stroke-[3] text-stone-950" />
                <span className="font-black text-stone-950">⚙️ Settings</span>
              </button>

              {/* Dropdown Menu */}
              {isThreeDotsOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-stone-900 border-2 border-amber-500 rounded-2xl shadow-2xl p-2.5 z-50 text-xs space-y-1 animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto"
                  onClick={() => setIsThreeDotsOpen(false)}
                >
                  <div className="px-3 py-1.5 mb-1 bg-stone-950/80 rounded-xl border border-stone-800 flex items-center justify-between">
                    <span className="font-black text-amber-300 text-xs uppercase tracking-wider">⚙️ Settings & Features Hub</span>
                    <span className="text-[10px] text-stone-400 font-mono">Select Option</span>
                  </div>

                  {/* Bluetooth & Thermal Printer Highlighted Entry */}
                  <button
                    onClick={handlePrinterClick}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-stone-100 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold border border-amber-500/60 bg-amber-500/15"
                  >
                    <Bluetooth className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-200">Connect Printer</span>
                        <span className="text-[10px] bg-amber-400 text-stone-950 font-black px-1.5 py-0.2 rounded">
                          Bluetooth / 58mm
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-300 font-normal block">تھرمل بلوٹوتھ پرنٹر کنیکٹ کریں</span>
                    </div>
                  </button>

                  {/* Google Account Login & Security */}
                  {onOpenGoogleAuth && (
                    <button
                      onClick={onOpenGoogleAuth}
                      className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-stone-100 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold border border-amber-500/40 bg-stone-950/40"
                    >
                      <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white">Google Account Auth</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${currentUser ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-amber-950 text-amber-300 border border-amber-500/40'}`}>
                            {currentUser ? 'Logged In' : 'Sign In'}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-mono truncate block max-w-[200px]">
                          {currentUser ? currentUser.email : 'Secure cloud backup with Google'}
                        </span>
                      </div>
                    </button>
                  )}

                  {/* Bulk Kitchen KOT (Group Multiple Bills) */}
                  <button
                    onClick={onOpenHistory}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-stone-100 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold border border-amber-500/50 bg-amber-500/15"
                  >
                    <UtensilsCrossed className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-200">Bulk Kitchen KOT</span>
                        <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-1.5 py-0.2 rounded">
                          Summary KOT
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-300 font-normal block">
                        Group multiple bills & print combined chef ticket
                      </span>
                    </div>
                  </button>


                  <button
                    onClick={onOpenHistory}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-stone-100 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold"
                  >
                    <History className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex-1">
                      <div>Order History & Reports</div>
                      <span className="text-[10px] text-stone-400 font-normal">{orders.length} orders saved</span>
                    </div>
                  </button>

                  <button
                    onClick={onOpenEditShop}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-stone-100 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold"
                  >
                    <Store className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex-1">
                      <div>Shop Settings</div>
                      <span className="text-[10px] text-stone-400 font-normal">Name, address, phone & rates</span>
                    </div>
                  </button>

                  {onOpenGoogleMaps && (
                    <button
                      onClick={onOpenGoogleMaps}
                      className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-emerald-300 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold"
                    >
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="flex-1">
                        <div>Google Maps Delivery Tracker</div>
                        <span className="text-[10px] text-stone-400 font-normal">Live rider route & shop GPS</span>
                      </div>
                    </button>
                  )}

                  {onOpenGmail && (
                    <button
                      onClick={onOpenGmail}
                      className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-rose-300 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold"
                    >
                      <Mail className="w-4 h-4 text-rose-400 shrink-0" />
                      <div className="flex-1">
                        <div>Gmail Receipts & Reports</div>
                        <span className="text-[10px] text-stone-400 font-normal">Email receipts to customers</span>
                      </div>
                    </button>
                  )}

                  {onSwitchToCustomerSite && (
                    <button
                      onClick={onSwitchToCustomerSite}
                      className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-amber-300 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold"
                    >
                      <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="flex-1">
                        <div>Customer Online Portal</div>
                        <span className="text-[10px] text-stone-400 font-normal">Open customer ordering website</span>
                      </div>
                    </button>
                  )}

                  {onOpenShareLink && (
                    <button
                      onClick={onOpenShareLink}
                      className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-emerald-300 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold"
                    >
                      <Share2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="flex-1">
                        <div>Share Website Link & QR Code</div>
                        <span className="text-[10px] text-stone-400 font-normal">Send WhatsApp links to customers</span>
                      </div>
                    </button>
                  )}

                  {onOpenKhata && (
                    <button
                      onClick={onOpenKhata}
                      className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-stone-100 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold"
                    >
                      <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="flex-1">
                        <div>Supplies & Expense Ledger (Khata)</div>
                        <span className="text-[10px] text-stone-400 font-normal">Chicken, rice, spices & balance</span>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={onToggleSound}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-stone-200 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold"
                  >
                    {soundEnabled ? (
                      <>
                        <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Mute Sound</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4 text-stone-500 shrink-0" />
                        <span>Unmute Sound</span>
                      </>
                    )}
                  </button>

                  <div className="border-t border-stone-800 my-1 pt-1">
                    <button
                      onClick={onOpenEditShop}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer font-bold"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>🔄 Reset App Data</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

