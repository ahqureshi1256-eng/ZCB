import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import {
  Smartphone,
  Download,
  CheckCircle,
  ExternalLink,
  Share2,
  X,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName?: string;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  shopName = 'Zaiqa Chicken Biryani',
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      const success = await install();
      setInstalling(false);
      if (success) {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-stone-900 border-2 border-amber-500 text-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 p-4 flex items-center justify-between text-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-950 text-amber-400 flex items-center justify-center shadow-md shrink-0">
              <Smartphone className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-stone-950 text-amber-300 px-2 py-0.5 rounded-full">
                  MOBILE APP
                </span>
                <span className="text-[11px] font-bold text-stone-900">
                  Direct Installation
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-stone-950">
                Install Mobile App
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-950/20 hover:bg-stone-950/40 text-stone-950 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-stone-100 flex-1">
          {/* App Preview Card */}
          <div className="bg-stone-950 p-4 rounded-2xl border border-amber-500/30 flex items-center gap-3.5">
            <img
              src="/pwa-192x192.png"
              alt="ZCB App Icon"
              className="w-16 h-16 rounded-2xl shadow-md border border-amber-400/50 shrink-0 object-contain bg-amber-400"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-white text-base truncate">
                {shopName}
              </h3>
              <p className="text-xs text-amber-300 font-medium">
                POS Billing, Kitchen & Online Orders
              </p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-400">
                <span>⚡ Fast Launch</span>
                <span>•</span>
                <span>📱 Fullscreen</span>
                <span>•</span>
                <span>🚀 Offline Capable</span>
              </div>
            </div>
          </div>

          {/* Already Installed State */}
          {isInstalled && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="font-black text-emerald-300 text-sm">
                App is already installed on your device!
              </p>
              <p className="text-xs text-stone-300">
                You can launch it anytime from your home screen or app drawer.
              </p>
            </div>
          )}

          {/* Direct Install Button (Android / Chrome) */}
          {!isInstalled && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={async () => {
                  if (isInstallable) {
                    await handleInstallClick();
                  } else {
                    if (isIOS) {
                      alert('To install on iPhone / iPad:\n1. Tap the Share icon (box with arrow) in Safari.\n2. Select "Add to Home Screen".\n3. Tap "Add" in top right corner.');
                    } else {
                      alert('To install on Android:\n1. Tap the three dots (⋮) menu in Chrome.\n2. Tap "Install app" or "Add to Home screen".');
                    }
                  }
                }}
                disabled={installing}
                className="w-full py-4 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-sm sm:text-base rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer ring-2 ring-amber-300 animate-pulse"
              >
                <Download className="w-5 h-5 stroke-[2.5]" />
                <span>
                  {installing ? 'Installing...' : isInstallable ? '📲 Install App Now (1-Click)' : '📲 Installation Instructions'}
                </span>
              </button>

              <div className="bg-amber-950/40 border border-amber-500/40 p-3 rounded-2xl text-xs text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>💡 Tip for Social Apps (TikTok, WhatsApp, Facebook):</span>
                </p>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  If you are inside an in-app browser (like WhatsApp or TikTok), tap the three dots (⋮) in top right and choose <strong>"Open in Chrome"</strong> or <strong>"Open in Safari"</strong> to enable 1-click install.
                </p>
              </div>
            </div>
          )}

          {/* Android Guide */}
          {(!isInstallable || isAndroid) && !isInstalled && (
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>Android / Chrome Instructions:</span>
              </div>
              <ol className="text-xs text-stone-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>
                  Open Chrome browser and navigate to this page.
                </li>
                <li>
                  Tap the Chrome menu (three dots ⋮ in top right).
                </li>
                <li>
                  Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </li>
              </ol>
            </div>
          )}

          {/* iPhone / Safari Guide */}
          {(isIOS || !isInstallable) && !isInstalled && (
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>iPhone / Safari Instructions:</span>
              </div>
              <ol className="text-xs text-stone-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>
                  In Safari browser, tap the <strong>Share</strong> button (box with upward arrow <Share2 className="w-3.5 h-3.5 inline text-blue-400" />).
                </li>
                <li>
                  Scroll down and tap <strong>"Add to Home Screen"</strong>.
                </li>
                <li>
                  Tap <strong>"Add"</strong> in the top right corner.
                </li>
              </ol>
            </div>
          )}

          {/* Helpful Tip */}
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200/90">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Advantage:</strong> The installed app runs fullscreen without browser address bars, loads instantly, and delivers loud audio chime notifications for new orders.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-stone-950 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
