import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ShopSettings } from '../types';
import { getPublicCustomerUrl, isDevUrl } from '../utils/urlHelper';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  QrCode,
  Sparkles,
  Download,
  X,
  Globe,
  Smartphone,
  Info,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: ShopSettings;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  shop,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Clean, public customer ordering link (auto converts ais-dev- to public ais-pre- so mobile users don't get 403 Forbidden!)
  const customerUrl = getPublicCustomerUrl();

  // Generate high-resolution QR code for customer link
  useEffect(() => {
    if (customerUrl && isOpen) {
      QRCode.toDataURL(customerUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('QR code generation failed:', err));
    }
  }, [customerUrl, isOpen]);

  if (!isOpen) return null;

  // 1-Click Copy Customer Link
  const handleCopyLink = () => {
    if (!customerUrl) return;
    navigator.clipboard.writeText(customerUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  // 1-Click WhatsApp Share
  const handleShareWhatsApp = () => {
    const text =
      `🍗 *ذائقہ چکن بریانی (${shop.shortName || 'ZCB'}) - آن لائن آرڈر شروع!* 🍗\n\n` +
      `گرما گرم دیگی چکن بریانی، شامی کباب اور کولڈ ڈرنکس اب گھر بیٹھے بائیک ڈیلیوری سے حاصل کریں۔\n\n` +
      `👇 *آن لائن آرڈر کے لیے اس لنک پر کلک کریں:*\n` +
      `${customerUrl}\n\n` +
      `🛵 فاسٹ بائیک ہوم ڈیلیوری (25-35 منٹ)\n` +
      `📞 رابطہ / واٹس ایپ: ${shop.phone}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Open customer site in a separate tab
  const handleOpenInNewTab = () => {
    window.open(customerUrl, '_blank');
  };

  // Download QR Code
  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `zcb-customer-order-qr.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-stone-900 border-2 border-amber-500/80 text-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 p-4 sm:p-5 flex items-center justify-between text-stone-950 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-950 text-amber-400 flex items-center justify-center shadow-md">
              <Share2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-stone-950 text-amber-300 px-2 py-0.5 rounded-full">
                  TIKTOK & WHATSAPP LINK
                </span>
                <span className="text-[11px] font-bold text-stone-900">
                  کسٹمر آرڈرنگ لنک
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-stone-950 mt-0.5">
                کسٹمر کے لیے ویب سائٹ کا لنک
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Direct Link Box with 1-Click Copy */}
          <div className="bg-stone-950 p-4 rounded-2xl border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-amber-400" />
                <span>کسٹمر ویب سائٹ کا مکمل لنک (Customer Ordering Link)</span>
              </label>
              <span className="text-[11px] text-stone-400 font-medium">
                یہ لنک ٹک ٹاک اور واٹس ایپ پر شیئر کریں
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 bg-stone-900 border border-stone-700 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-mono text-amber-200 truncate select-all flex items-center">
                {customerUrl}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 ${
                    copied
                      ? 'bg-emerald-500 text-stone-950 ring-2 ring-emerald-300'
                      : 'bg-amber-500 hover:bg-amber-400 text-stone-950 active:scale-95'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>کاپی ہوگیا! (Copied)</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 stroke-[2.5]" />
                      <span>لنک کاپی کریں</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center gap-1.5 border border-stone-700 transition-colors cursor-pointer shrink-0"
                  title="Open in new browser tab to test as a customer"
                >
                  <ExternalLink className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">نئی ٹیب میں کھولیں</span>
                </button>
              </div>
            </div>

            {copied && (
              <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>
                  لنک کاپی ہو چکا ہے! اب آپ اسے TikTok کے بائیو یا WhatsApp چیٹس اور اسٹیٹس پر پیسٹ کر سکتے ہیں۔
                </span>
              </div>
            )}

            {/* Public Access 403-Free Badge */}
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-[11px] text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>403 Error Free Link:</strong> یہ 100% پبلک لنک ہے جو بغیر گوگل لاگ اِن کے ہر کسٹمر کے موبائل، واٹس ایپ اور ٹک ٹاک پر فوراً کھلتا ہے۔
              </span>
            </div>
          </div>

          {/* WhatsApp Direct Share & TikTok Bio Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* WhatsApp Share Card */}
            <div className="bg-stone-950 p-4 rounded-2xl border border-emerald-500/30 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                  <span>1. واٹس ایپ پر ایک کلک میں بھیجیں</span>
                </div>
                <p className="text-xs text-stone-300 mt-1.5 leading-relaxed">
                  اپنے تمام کسٹمرز، گروپس اور واٹس ایپ اسٹیٹس پر ZCB کا مکمل مینو اور آرڈر لنک فوراً شیئر کریں۔
                </p>
              </div>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 stroke-[2.5]" />
                <span>WhatsApp پر شیئر کریں (Share)</span>
              </button>
            </div>

            {/* TikTok Guide Card */}
            <div className="bg-stone-950 p-4 rounded-2xl border border-pink-500/30 space-y-2">
              <div className="flex items-center gap-2 text-pink-400 font-black text-sm">
                <Smartphone className="w-5 h-5 text-pink-400" />
                <span>2. ٹک ٹاک بائیو (TikTok Bio) میں لگانے کا طریقہ</span>
              </div>
              <ul className="text-xs text-stone-300 space-y-1.5 list-disc list-inside leading-relaxed">
                <li>
                  ٹک ٹاک ایپ میں جا کر <strong>Edit Profile</strong> پر کلک کریں۔
                </li>
                <li>
                  اوپر کاپی کیا گیا لنک <strong>Website</strong> یا <strong>Bio</strong> میں پیسٹ کر دیں۔
                </li>
                <li>
                  اپنی ویڈیوز میں کہیں: <em>"بریانی آرڈر کرنے کے لیے بائیو والے لنک پر کلک کریں!"</em>
                </li>
              </ul>
            </div>
          </div>

          {/* QR Code Section for Flyers, TikTok Videos, Counter Stickers */}
          <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 flex flex-col sm:flex-row items-center gap-4">
            {qrCodeDataUrl ? (
              <div className="bg-white p-2.5 rounded-2xl shadow-xl border border-amber-400 shrink-0">
                <img
                  src={qrCodeDataUrl}
                  alt="ZCB Customer Order QR Code"
                  className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                />
              </div>
            ) : (
              <div className="w-28 h-28 bg-stone-900 rounded-2xl flex items-center justify-center text-stone-600 shrink-0">
                <QrCode className="w-10 h-10 animate-pulse" />
              </div>
            )}

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-amber-300 font-bold text-sm">
                <QrCode className="w-4 h-4" />
                <span>کسٹمر آرڈرنگ کیو آر کوڈ (Customer QR Code)</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                کسٹمرز اپنے موبائل کیمرے سے یہ QR کوڈ اسکین کر کے فوراً آن لائن ویب سائٹ کھول سکتے ہیں۔ آپ اسے دکان کے کاؤنٹر، پمفلٹ، یا ویڈیو میں بھی دکھا سکتے ہیں۔
              </p>
              <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>QR کوڈ ڈاؤن لوڈ کریں (PNG)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Clarification on Separation */}
          <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-xs text-amber-200/90 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>دونوں الگ الگ ہیں:</strong> جب آپ کا کسٹمر یہ لنک کھولے گا تو اس کے پاس صرف اور صرف خوبصورت کسٹمر ویب سائٹ کھلے گی (جہاں سے وہ بریانی، کباب، کولڈ ڈرنک چن کر بائیک ڈیلیوری ایڈریس ڈال سکے گا)۔ آپ کا کیشیئر POS ٹرمینل محفوظ رہے گا اور جیسے ہی کسٹمر آرڈر کرے گا، آپ کے پاس زور سے گھنٹی بولے گی: <em>"اے مزمل، آرڈر اٹھاؤ!"</em>
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            بند کریں (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
