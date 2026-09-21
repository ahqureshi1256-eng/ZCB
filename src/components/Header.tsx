import React, { useState } from 'react';
import { ShopSettings, Order } from '../types';
import { formatPrice } from '../utils/billing';
import { ZcbLogo } from './ZcbLogo';
import { posSound } from '../utils/audio';
import {
  Store,
  History,
  Volume2,
  VolumeX,
  Printer,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Phone,
  ReceiptText,
  Globe,
  Bell,
  Bike,
  Share2,
  Download,
  Smartphone,
  MoreVertical,
  BookOpen,
} from 'lucide-react';

interface HeaderProps {
  shop: ShopSettings;
  orders: Order[];
  onOpenEditShop: () => void;
  onOpenHistory: () => void;
  onOpenKhata?: () => void;
  onOpenPrinterSetup?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSwitchToCustomerSite?: () => void;
  onOpenShareLink?: () => void;
  onOpenInstallApp?: () => void;
  onSimulateOrder?: () => void;
  pendingOnlineCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  shop,
  orders,
  onOpenEditShop,
  onOpenHistory,
  onOpenKhata,
  onOpenPrinterSetup,
  soundEnabled,
  onToggleSound,
  onSwitchToCustomerSite,
  onOpenShareLink,
  onOpenInstallApp,
  onSimulateOrder,
  pendingOnlineCount = 0,
}) => {
  const [showBannerFull, setShowBannerFull] = useState(true);
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
    posSound.testVoiceAlert(shop.cashierName || 'مزمل');
  };

  return (
    <header className="text-white shadow-xl sticky top-0 z-30 flex flex-col">
      {/* Top ZCB Brand Hero Banner (Collapsible/Expandable) */}
      {shop.bannerUrl && (
        <div className="relative bg-black border-b border-amber-500/30 overflow-hidden select-none">
          <div className="relative w-full max-h-36 sm:max-h-44 md:max-h-52 overflow-hidden">
            <img
              src={shop.bannerUrl}
              alt="ZCB Zaiqa Chicken Biryani Banner"
              className={`w-full object-cover object-center transition-all duration-300 ${
                showBannerFull ? 'h-28 sm:h-36 md:h-44 opacity-95 filter brightness-105' : 'h-11 opacity-75'
              }`}
            />
            {/* Dark Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950/85 via-transparent to-stone-950/85" />

            {/* Banner Floating Overlay Badges */}
            <div className="absolute inset-0 flex items-center justify-between px-4 md:px-8 pointer-events-none">
              <div className="flex items-center gap-3">
                {/* Exact Official ZCB Logo */}
                <ZcbLogo className="w-14 h-14 sm:w-20 sm:h-20 border-2 border-amber-400 shadow-xl" imageUrl={shop.logoUrl} />
                <div className="drop-shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500 text-stone-950 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded tracking-widest uppercase shadow-md">
                      {shop.shortName || 'ZCB'} OFFICIAL POS
                    </span>
                    <span className="hidden sm:inline-block bg-emerald-700/90 text-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/40 tracking-wider">
                      🛵 BIKE DELIVERY & THERMAL PRINT
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-3xl font-black text-amber-100 tracking-wide mt-0.5 uppercase">
                    {shop.shopNameEn || 'Zaiqa Chicken Biryani'}
                  </h1>
                  <p className="text-xs sm:text-sm font-semibold text-amber-300 tracking-wider">
                    {shop.taglineEn || 'Food Prepared Fresh on Order'} • Tel: {shop.phone}
                  </p>
                </div>
              </div>

              {/* Right side banner toggle button */}
              <div className="pointer-events-auto hidden sm:flex items-center gap-2">
                <button
                  onClick={() => setShowBannerFull(!showBannerFull)}
                  className="px-2.5 py-1 rounded-lg bg-stone-900/80 hover:bg-stone-800 text-amber-200 text-xs font-medium border border-amber-500/30 backdrop-blur-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {showBannerFull ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Collapse Banner</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>View Full Banner</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Control Bar */}
      <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 border-b border-amber-700/30 px-3 sm:px-6 py-2 sm:py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* Left Title & Status */}
          <div className="flex items-center gap-2.5">
            <ZcbLogo className="w-9 h-9 border border-amber-400/60 shadow-sm shrink-0" imageUrl={shop.logoUrl} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-amber-200 tracking-wide">
                  {shop.shortName || 'ZCB'} - {shop.shopNameEn}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/40">
                  POS TERMINAL
                </span>
              </div>
              <div className="text-[11px] text-stone-400 flex items-center gap-2 font-medium">
                <span>{shop.taglineEn || 'Food Prepared Fresh on Order'}</span>
                <span className="text-stone-600">•</span>
                <span className="text-[11px] text-amber-300/90 font-sans flex items-center gap-1">
                  <Phone className="w-3 h-3 inline text-amber-400" />
                  {shop.phone}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Widgets */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Share Customer Ordering Link for TikTok & WhatsApp */}
            {onOpenShareLink && (
              <button
                onClick={onOpenShareLink}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer ring-1 ring-pink-400"
                title="Get Customer Website Link for TikTok Bio & WhatsApp sharing"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>🔗 TikTok & WhatsApp لنک</span>
              </button>
            )}

            {/* Install / Download Mobile App Button */}
            {onOpenInstallApp && (
              <button
                onClick={onOpenInstallApp}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                title="Download and Install Mobile App on your phone"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">📲 ایپ ڈاؤن لوڈ کریں</span>
                <span className="sm:hidden">📲 ایپ</span>
              </button>
            )}

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

            {/* Test Voice Order Bell Button ("اے مزمل آرڈر اٹھاؤ!") */}
            <button
              onClick={handleTestBell}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-950/90 hover:bg-red-900 text-red-100 border border-red-600/70 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs"
              title={`Test Talking Bell: "اے ${shop.cashierName || 'مزمل'}، آرڈر اٹھاؤ!"`}
            >
              <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>🔊 ٹیسٹ آواز ({shop.cashierName || 'مزمل'})</span>
            </button>

            {/* Simulate Customer Order Button */}
            {onSimulateOrder && (
              <button
                onClick={onSimulateOrder}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/50 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                title="Test incoming online bike delivery order alert"
              >
                <Bike className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">+ Demo Order</span>
              </button>
            )}

            {/* Daily Sales Stat */}
            <div
              onClick={onOpenHistory}
              className="flex items-center gap-2 px-3 py-1.5 bg-stone-800/90 hover:bg-stone-800 border border-amber-500/30 rounded-xl cursor-pointer transition-all hover:border-amber-400 shadow-xs"
              title="View today's sales and order history"
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

            {/* Monthly Khata & Udhaar Book Button */}
            {onOpenKhata && (
              <button
                onClick={onOpenKhata}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-stone-950 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer ring-1 ring-emerald-300"
                title="ماہانہ سیل، مرغی و چاول ادھار کھاتہ (Monthly Ledger)"
              >
                <BookOpen className="w-4 h-4 stroke-[2.5]" />
                <span className="inline">📒 ماہانہ کھاتہ</span>
              </button>
            )}

            {/* History Button */}
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 transition-colors shadow-2xs cursor-pointer"
              title="View Order History & Receipts"
            >
              <History className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">History</span>
            </button>

            {/* Three Dots (⋮) Settings & Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setIsThreeDotsOpen(!isThreeDotsOpen)}
                className="p-2 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-xl border border-stone-700 transition-colors cursor-pointer flex items-center justify-center"
                title="سیٹنگز اور آپشنز (Menu & Settings)"
              >
                <MoreVertical className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* Dropdown Menu */}
              {isThreeDotsOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 bg-stone-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1 animate-in zoom-in-95 duration-150"
                  onClick={() => setIsThreeDotsOpen(false)}
                >
                  <button
                    onClick={onOpenEditShop}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-stone-200 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold"
                  >
                    <Store className="w-4 h-4 text-amber-400" />
                    <span>ریستوران سیٹنگز (Shop Settings)</span>
                  </button>

                  {onOpenKhata && (
                    <button
                      onClick={onOpenKhata}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 text-stone-200 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold"
                    >
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                      <span>مرغی و چاول ادھار کھاتہ (Khata)</span>
                    </button>
                  )}

                  {onOpenInstallApp && (
                    <button
                      onClick={onOpenInstallApp}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 text-stone-200 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold"
                    >
                      <Smartphone className="w-4 h-4 text-amber-400" />
                      <span>📲 ایپ ڈاؤن لوڈ کریں (Install App)</span>
                    </button>
                  )}

                  {onOpenShareLink && (
                    <button
                      onClick={onOpenShareLink}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 text-stone-200 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold"
                    >
                      <Share2 className="w-4 h-4 text-blue-400" />
                      <span>🔗 کسٹمر ویب لنک شیئر کریں</span>
                    </button>
                  )}

                  <button
                    onClick={onToggleSound}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-stone-200 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer font-bold"
                  >
                    {soundEnabled ? (
                      <>
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                        <span>آواز فعال ہے (Mute Sound)</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4 text-stone-500" />
                        <span>آواز بند ہے (Unmute Sound)</span>
                      </>
                    )}
                  </button>

                  <div className="border-t border-stone-800 my-1 pt-1">
                    <button
                      onClick={onOpenEditShop}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer font-bold"
                    >
                      <span>🔄 ری سیٹ ڈیٹا (Reset App Data)</span>
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

