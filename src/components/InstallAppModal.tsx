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
  shopName = 'ZCB - ذائقہ چکن بریانی',
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
                  موبائل ایپ انسٹال کریں
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-stone-950">
                موبائل میں ایپ ڈاؤن لوڈ کریں
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
                فاسٹ فوڈ، بریانی اور آن لائن آرڈرنگ ایپ
              </p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-400">
                <span>⚡ تیز رفتار</span>
                <span>•</span>
                <span>📱 فل اسکرین</span>
                <span>•</span>
                <span>🚀 0 MB اسٹوریج</span>
              </div>
            </div>
          </div>

          {/* Already Installed State */}
          {isInstalled && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="font-black text-emerald-300 text-sm">
                ایپ آپ کے موبائل میں پہلے سے انسٹال ہو چکی ہے!
              </p>
              <p className="text-xs text-stone-300">
                آپ اپنے موبائل کی ہوم اسکرین سے ZCB آئیکن پر کلک کر کے اسے کسی بھی وقت چلا سکتے ہیں۔
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
                    // Explain exactly what to do based on platform
                    if (isIOS) {
                      alert('آئی فون پر انسٹال کے لیے:\n1. نیچے شیئر (Share) کا تیر والا بٹن دبائیں۔\n2. "Add to Home Screen" منتخب کریں۔\nایپ فوراً ہوم اسکرین پر آ جائے گی!');
                    } else {
                      alert('اینڈرائیڈ موبائل پر انسٹال کے لیے:\n1. اوپر دائیں کونے میں کروم براؤزر کے تین نقطوں (⋮) پر کلک کریں۔\n2. "Install app" یا "Add to Home screen" منتخب کریں۔\nZCB ایپ کا آئیکن آپ کے موبائل میں شامل ہو جائے گا!');
                    }
                  }
                }}
                disabled={installing}
                className="w-full py-4 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-sm sm:text-base rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer ring-2 ring-amber-300 animate-pulse"
              >
                <Download className="w-5 h-5 stroke-[2.5]" />
                <span>
                  {installing ? 'انسٹال ہو رہی ہے...' : isInstallable ? '📲 ایک کلک میں ایپ ڈاؤن لوڈ کریں (Install Now)' : '📲 موبائل میں ایپ ڈاؤن لوڈ کا طریقہ (Instructions)'}
                </span>
              </button>

              <div className="bg-amber-950/40 border border-amber-500/40 p-3 rounded-2xl text-xs text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>💡 موبائل پر ڈاؤن لوڈ کیوں نہیں ہو رہی تھی؟</span>
                </p>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  اگر آپ <strong>TikTok، WhatsApp یا فیس بک</strong> کے اندر ہیں، تو ایپ ڈاؤن لوڈ نہیں ہو پاتی۔ پہلے اوپر تین نقطوں (⋮) پر کلک کر کے <strong>"Open in Chrome" (کروم میں کھولیں)</strong> کریں، پھر کروم مینو سے <strong>"Install App"</strong> یا <strong>"Add to Home Screen"</strong> پر کلک کریں۔
                </p>
              </div>
            </div>
          )}

          {/* Android Guide (If in in-app browser like WhatsApp/TikTok) */}
          {(!isInstallable || isAndroid) && !isInstalled && (
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>اینڈرائڈ (Android / Chrome) پر ڈاؤن لوڈ کا طریقہ:</span>
              </div>
              <ol className="text-xs text-stone-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>
                  اگر آپ <strong>TikTok</strong> یا <strong>WhatsApp</strong> کے اندر ہیں، تو اوپر دائیں جانب <strong>تین نقطوں (⋮)</strong> پر کلک کریں اور <strong>"Open in Chrome" (کروم میں کھولیں)</strong> منتخب کریں۔
                </li>
                <li>
                  کروم براؤزر کے مینو (تین نقطے ⋮) پر کلک کریں۔
                </li>
                <li>
                  <strong>"Install App"</strong> یا <strong>"Add to Home screen" (ہوم اسکرین پر شامل کریں)</strong> پر ٹیپ کریں۔
                </li>
              </ol>
            </div>
          )}

          {/* iPhone / Safari Guide */}
          {(isIOS || !isInstallable) && !isInstalled && (
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>آئی فون (iPhone / Safari) پر ڈاؤن لوڈ کا طریقہ:</span>
              </div>
              <ol className="text-xs text-stone-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>
                  سفاری (Safari) براؤزر میں نیچے موجود <strong>Share</strong> بٹن (تیر کا نشان <Share2 className="w-3.5 h-3.5 inline text-blue-400" />) دبائیں۔
                </li>
                <li>
                  تھوڑا نیچے اسکرول کر کے <strong>"Add to Home Screen" (ہوم اسکرین پر شامل کریں)</strong> پر ٹیپ کریں۔
                </li>
                <li>
                  اوپر دائیں کونے میں <strong>"Add"</strong> پر کلک کریں۔ ایپ آپ کی اسکرین پر آ جائے گی!
                </li>
              </ol>
            </div>
          )}

          {/* Helpful Tip */}
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200/90">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>فائدہ:</strong> انسٹال کرنے کے بعد یہ بالکل اصلی اینڈرائیڈ/آئی فون ایپ کی طرح فل اسکرین کھلے گی، بغیر کسی براؤزر بار کے، اور بہت تیزی سے چلے گی۔
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
            بند کریں (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
