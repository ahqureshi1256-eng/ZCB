import React, { useState, useRef, useEffect } from 'react';
import { ShopSettings, Order } from '../types';
import {
  Store,
  X,
  Check,
  Phone,
  MapPin,
  Tag,
  Image,
  Upload,
  RefreshCw,
  Bike,
  Receipt,
  Sparkles,
  Printer,
  Bluetooth,
  CheckCircle2,
  Zap,
  Usb,
  Wifi,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { ZcbLogo } from './ZcbLogo';
import {
  connectWebBluetoothPrinter,
  disconnectWebBluetoothPrinter,
  getActiveBluetoothSession,
  addBluetoothStatusListener,
  printDirectOrSystem,
} from '../utils/printerService';
import { posSound } from '../utils/audio';

interface EditShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ShopSettings;
  onSave: (newSettings: ShopSettings) => void;
  onOpenPrinterSetup?: () => void;
}

export const EditShopModal: React.FC<EditShopModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onOpenPrinterSetup,
}) => {
  const [formData, setFormData] = useState<ShopSettings>(settings);
  const [isScanningBt, setIsScanningBt] = useState(false);
  const [activeBtSession, setActiveBtSession] = useState(getActiveBluetoothSession());
  const [printerNotice, setPrinterNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize Bluetooth session state
  useEffect(() => {
    const unsub = addBluetoothStatusListener((session) => {
      setActiveBtSession(session);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
      setActiveBtSession(getActiveBluetoothSession());
      setPrinterNotice(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleScanBluetooth = async () => {
    setIsScanningBt(true);
    setPrinterNotice('Scanning for Bluetooth thermal printers... Pick your device from the popup.');
    const watchdog = setTimeout(() => setIsScanningBt(false), 7500);

    try {
      const res = await connectWebBluetoothPrinter();
      clearTimeout(watchdog);
      setIsScanningBt(false);

      if (res.success) {
        posSound.playSuccess();
        const updated = {
          ...formData,
          preferredPrintMethod: 'direct_bluetooth' as const,
          bluetoothDeviceName: res.deviceName,
        };
        setFormData(updated);
        setPrinterNotice(`✓ Connected & Test Signal Received: ${res.deviceName || 'Thermal POS Printer'}`);
      } else if (res.isIframePolicyRestricted) {
        setPrinterNotice('💡 Bluetooth requires full tab. Tap "All Printer Options" or open app in a new tab.');
      } else if (res.cancelled) {
        setPrinterNotice(null);
      } else {
        setPrinterNotice(res.error || '❌ Could not connect. Check that printer is ON and within range.');
      }
    } catch (e) {
      clearTimeout(watchdog);
      setIsScanningBt(false);
      setPrinterNotice('Bluetooth scan error. Ensure Bluetooth is ON.');
    } finally {
      clearTimeout(watchdog);
      setIsScanningBt(false);
    }
  };

  const handleQuickTestPrint = async () => {
    posSound.playPrintBill();
    const demoOrder: Order = {
      id: `test-shop-${Date.now()}`,
      billNumber: 'ZCB-TEST-SHOP',
      tokenNumber: 1,
      dateStr: new Date().toLocaleDateString('en-GB'),
      timeStr: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      customerName: 'Test Bill from Settings',
      customerPhone: formData.phone || '0333-7018183',
      orderType: 'takeaway',
      orderStatus: 'accepted',
      items: [
        {
          id: 't-1',
          menuItemId: 'biryani-chicken',
          nameEn: 'Chicken Biryani (Test Slip)',
          nameUr: 'Chicken Biryani',
          portionLabelEn: '01 KG',
          unitPrice: 720,
          quantity: 1,
          total: 720,
        },
      ],
      subtotal: 720,
      discountAmount: 0,
      totalAmount: 720,
      paymentMode: 'cash',
      createdAt: Date.now(),
    };

    const res = await printDirectOrSystem(demoOrder, formData, 'both');
    setPrinterNotice(`✓ ${res.message}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData({
            ...formData,
            logoUrl: event.target.result as string,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-stone-900 w-full max-w-lg rounded-2xl shadow-2xl border border-stone-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 text-white flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base text-amber-100">Restaurant Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-amber-300 uppercase mb-1">
              Restaurant Name *
            </label>
            <input
              type="text"
              required
              value={formData.shopNameEn || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shopNameEn: e.target.value,
                  shopNameUr: e.target.value,
                })
              }
              placeholder="Zaiqa Chicken Biryani"
              className="w-full px-3.5 py-2 text-sm bg-stone-950 border border-stone-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Shop Logo Customization Section */}
          <div className="p-4 bg-stone-950 rounded-2xl border-2 border-amber-500/40 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-amber-400" />
                <label className="text-xs font-black text-amber-300 uppercase tracking-wide">
                  🖼️ Restaurant Logo & Bill Header
                </label>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Printed on Receipts
              </span>
            </div>

            <div className="flex items-center gap-4 bg-stone-900/90 p-3 rounded-xl border border-stone-800">
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-stone-950 border-2 border-amber-400 shadow-md shrink-0 flex items-center justify-center">
                <ZcbLogo className="w-full h-full object-cover" imageUrl={formData.logoUrl} />
              </div>

              <div className="flex-1 space-y-2">
                <p className="text-[11px] text-stone-300 leading-tight">
                  Upload your own restaurant logo. It will appear on website header and print on all thermal receipts/bills.
                </p>

                <div className="flex flex-wrap gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Upload Logo Image</span>
                  </button>

                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logoUrl: '' })}
                      className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Reset to default official emblem"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Logo URL Input (Alternative) */}
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                Or Paste Image Web URL
              </label>
              <input
                type="url"
                value={formData.logoUrl || ''}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://example.com/your-logo.jpg (or use Upload button above)"
                className="w-full px-3 py-1.5 text-xs bg-stone-900 border border-stone-700 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Delivery Charges Customization Section */}
          <div className="p-4 bg-stone-950 rounded-2xl border-2 border-emerald-500/40 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-emerald-400" />
                <label className="text-xs font-black text-emerald-300 uppercase tracking-wide">
                  🛵 Delivery Charges Setting
                </label>
              </div>
              <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                Current: {formData.currencySymbol || 'Rs.'} {formData.defaultDeliveryFee ?? 100}
              </span>
            </div>

            <p className="text-[11px] text-stone-300 leading-tight">
              Customize delivery charges as you wish (100, 150, or any custom amount). This rate will automatically apply for bike deliveries.
            </p>

            {/* Quick Delivery Fee Presets */}
            <div className="flex flex-wrap gap-1.5">
              {[0, 50, 80, 100, 120, 150, 200, 250].map((fee) => (
                <button
                  key={fee}
                  type="button"
                  onClick={() => setFormData({ ...formData, defaultDeliveryFee: fee })}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    (formData.defaultDeliveryFee ?? 100) === fee
                      ? 'bg-emerald-500 text-stone-950 shadow-md ring-2 ring-emerald-300'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700'
                  }`}
                >
                  {fee === 0 ? 'Free (Rs. 0)' : `Rs. ${fee}`}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="flex items-center gap-2 pt-1">
              <label className="text-xs font-bold text-stone-300 whitespace-nowrap">
                Custom Delivery Fee:
              </label>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">
                  {formData.currencySymbol || 'Rs.'}
                </span>
                <input
                  type="number"
                  min="0"
                  value={formData.defaultDeliveryFee ?? 100}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultDeliveryFee: Math.max(0, Number(e.target.value)),
                    })
                  }
                  placeholder="100 or 150"
                  className="w-full pl-10 pr-3 py-1.5 text-sm font-mono font-black bg-stone-900 border border-emerald-500/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-300 uppercase mb-1">
              Tagline / Subtitle
            </label>
            <input
              type="text"
              value={formData.taglineEn || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  taglineEn: e.target.value,
                  taglineUr: e.target.value,
                })
              }
              placeholder="Food Prepared Fresh On Order"
              className="w-full px-3.5 py-2 text-sm bg-stone-950 border border-stone-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase mb-1">
                Phone / Mobile *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0333-7018183 / 0316-7018516"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-stone-950 border border-stone-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase mb-1">
                NTN / Registration (Optional)
              </label>
              <input
                type="text"
                value={formData.ntnNumber || formData.fssai || ''}
                onChange={(e) => setFormData({ ...formData, ntnNumber: e.target.value, fssai: e.target.value })}
                placeholder="NTN / Tax #"
                className="w-full px-3.5 py-2 text-sm bg-stone-950 border border-stone-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-300 uppercase mb-1">
              Shop Address *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
              <textarea
                required
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Shop address..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-stone-950 border border-stone-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="p-3 bg-stone-950 rounded-xl border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-amber-300 uppercase">
                🗣️ Voice Alert Notification
              </label>
              <button
                type="button"
                onClick={() => {
                  import('../utils/audio').then(({ posSound }) => {
                    posSound.testVoiceAlert(formData.cashierName || 'Cashier');
                  });
                }}
                className="px-2 py-1 text-[11px] bg-red-950 hover:bg-red-900 text-red-200 border border-red-700/60 rounded-lg font-bold transition-colors cursor-pointer"
              >
                🔊 Test Voice Alert
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-stone-300 font-semibold mb-1">
                  Cashier Name (For Voice Call):
                </label>
                <input
                  type="text"
                  value={formData.cashierName || 'Cashier'}
                  onChange={(e) => setFormData({ ...formData, cashierName: e.target.value })}
                  placeholder="Cashier"
                  className="w-full px-3 py-1.5 text-xs bg-stone-900 border border-stone-700 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="voiceAlertCheckbox"
                  checked={formData.voiceAlertEnabled !== false}
                  onChange={(e) => setFormData({ ...formData, voiceAlertEnabled: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <label htmlFor="voiceAlertCheckbox" className="text-xs text-stone-200 cursor-pointer font-medium">
                  Voice alert on incoming order
                </label>
              </div>
            </div>
          </div>

          {/* Custom Receipt Footer Section */}
          <div className="p-4 bg-stone-950 rounded-2xl border-2 border-amber-500/50 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <label className="text-xs font-black text-amber-300 uppercase tracking-wide">
                  🧾 Custom Receipt Footer (بل کے نیچے کا پروموشن / پیغام)
                </label>
              </div>
              <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                Printed on Every Bill
              </span>
            </div>

            <p className="text-[11px] text-stone-300 leading-tight">
              Add a personalized thank-you message, promotional offer, special discount coupon, or WiFi info to print at the bottom of every thermal receipt.
            </p>

            {/* Quick Inspiration Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Quick Preset Messages (کلک کر کے منتخب کریں):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '★ Thank You For Visiting! Show This Bill For 10% Off Next Time ★',
                  '★ Free Raita & Salad On Your Next Visit! Thank You ★',
                  'WiFi: ZCB-Guest | Pass: biryani123 | Follow us on Instagram!',
                  '★ Catering & Daawat Bulk Orders Available: 0333-7018183 ★',
                  '★ Fresh Hot Biryani Daily ★ Rate Us 5-Stars on Google Maps! ★',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData({ ...formData, customReceiptFooter: preset })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-left ${
                      formData.customReceiptFooter === preset
                        ? 'bg-amber-500 text-stone-950 shadow-sm ring-1 ring-amber-300'
                        : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
                {formData.customReceiptFooter && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, customReceiptFooter: '' })}
                    className="px-2 py-1 rounded-lg text-[11px] font-bold bg-stone-900 hover:bg-rose-950 text-stone-400 hover:text-rose-300 border border-stone-800 cursor-pointer"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>

            {/* Input Field */}
            <div>
              <label className="block text-[11px] font-bold text-stone-300 mb-1">
                Custom Footer Message / Promotion:
              </label>
              <textarea
                rows={2}
                value={formData.customReceiptFooter || ''}
                onChange={(e) => setFormData({ ...formData, customReceiptFooter: e.target.value })}
                placeholder="e.g. ★ Thank You For Visiting! Show This Bill For 10% Off Next Time ★"
                className="w-full px-3.5 py-2 text-xs bg-stone-900 border border-stone-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            {/* Live Visual Thermal Receipt Paper Preview */}
            {formData.customReceiptFooter && formData.customReceiptFooter.trim() && (
              <div className="p-3 bg-white text-black rounded-xl border border-stone-400 shadow-md font-mono text-center text-[10px] space-y-1">
                <div className="text-[9px] text-stone-500 uppercase font-bold tracking-widest border-b border-stone-300 pb-0.5">
                  Receipt Bottom Preview
                </div>
                <div className="p-1 border border-dashed border-black font-black uppercase tracking-wide bg-stone-50 text-[10px]">
                  {formData.customReceiptFooter.trim()}
                </div>
                <div className="text-[8.5px] text-stone-700 font-bold">
                  {formData.footerNoteEn || '★ Thank You For Visiting ZCB! ★'}
                </div>
              </div>
            )}
          </div>

          {/* Dedicated Printer Connection & Bluetooth Settings Section */}
          <div className="p-4 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 rounded-2xl border-2 border-amber-500/60 space-y-3.5 shadow-xl text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                  <Printer className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-300 uppercase tracking-wide">
                    🖨️ Thermal Printer & Bluetooth Settings (پرنٹر کنکشن)
                  </h4>
                  <p className="text-[10px] text-stone-300">Bluetooth, RawBT, USB, WiFi & System Print</p>
                </div>
              </div>

              {activeBtSession ? (
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{activeBtSession.deviceName || 'Connected'}</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-stone-800 text-stone-400 border border-stone-700 px-2 py-0.5 rounded-full">
                  Disconnected
                </span>
              )}
            </div>

            {/* Quick Status Notice */}
            {printerNotice && (
              <div className="p-2.5 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-200 animate-in fade-in flex items-center justify-between">
                <span>{printerNotice}</span>
                <button
                  type="button"
                  onClick={() => setPrinterNotice(null)}
                  className="text-stone-400 hover:text-white text-xs ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Preferred Print Mode Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-stone-300">
                طریقہ کار (Print Method):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, preferredPrintMethod: 'direct_bluetooth' })}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 justify-center cursor-pointer ${
                    formData.preferredPrintMethod === 'direct_bluetooth'
                      ? 'bg-sky-500 text-stone-950 border-sky-400 font-black shadow-sm'
                      : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  <Bluetooth className="w-3.5 h-3.5" />
                  <span>بلوٹوتھ (Direct)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, preferredPrintMethod: 'rawbt_intent' })}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 justify-center cursor-pointer ${
                    formData.preferredPrintMethod === 'rawbt_intent'
                      ? 'bg-indigo-500 text-white border-indigo-400 font-black shadow-sm'
                      : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>RawBT ایپ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, preferredPrintMethod: 'mobile_system' })}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 justify-center cursor-pointer ${
                    formData.preferredPrintMethod === 'mobile_system' || !formData.preferredPrintMethod
                      ? 'bg-emerald-500 text-stone-950 border-emerald-400 font-black shadow-sm'
                      : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>سسٹم پرنٹ</span>
                </button>
              </div>
            </div>

            {/* Direct Bluetooth Scanner & Connection Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={handleScanBluetooth}
                disabled={isScanningBt}
                className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                {isScanningBt ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>بلوٹوتھ تلاش ہو رہا ہے...</span>
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-4 h-4" />
                    <span>بلوٹوتھ اسکین کریں (Scan All Devices)</span>
                  </>
                )}
              </button>

              {onOpenPrinterSetup && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenPrinterSetup();
                  }}
                  className="py-2.5 px-3 bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>تمام پرنٹر آپشنز (All Options)</span>
                </button>
              )}
            </div>

            {/* Thermal Printer Paper Width */}
            <div className="pt-1">
              <label className="block text-[11px] font-bold text-stone-300 mb-1">
                Thermal Roll Paper Width (پرنٹر سائز):
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, printerWidth: '58mm', thermalPaperWidth: '58mm' })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    (formData.printerWidth || formData.thermalPaperWidth) === '58mm'
                      ? 'bg-amber-500 text-stone-950 border-amber-400 font-black shadow-sm'
                      : 'bg-stone-900 text-stone-300 border-stone-700'
                  }`}
                >
                  58mm Mini (2-Inch)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, printerWidth: '80mm', thermalPaperWidth: '80mm' })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    (formData.printerWidth || formData.thermalPaperWidth) === '80mm'
                      ? 'bg-amber-500 text-stone-950 border-amber-400 font-black shadow-sm'
                      : 'bg-stone-900 text-stone-300 border-stone-700'
                  }`}
                >
                  80mm Standard POS (3-Inch)
                </button>
              </div>
            </div>

            {/* Test Print Slip Button */}
            <button
              type="button"
              onClick={handleQuickTestPrint}
              className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>ٹیسٹ سلپ پرنٹ کریں (Quick Test Slip)</span>
            </button>
          </div>

            {/* System Reset & Data Cleaning Section */}
            <div className="p-3.5 bg-rose-950/40 rounded-xl border border-rose-600/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300 uppercase">
                  ⚠️ System Reset & Data Clean
                </span>
                <span className="text-[10px] text-rose-400 font-mono">DANGER ZONE</span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                If you want to clear test orders, ledger data, and reset settings back to defaults, click the reset button below.
              </p>
              <button
                type="button"
                onClick={() => {
                  const confirmReset = window.confirm(
                    'Are you sure you want to reset all order history and settings back to factory defaults?'
                  );
                  if (confirmReset) {
                    localStorage.removeItem('zcb_biryani_orders_v3');
                    localStorage.removeItem('zcb_biryani_token_v3');
                    localStorage.removeItem('zcb_biryani_khata_v3');
                    localStorage.removeItem('zcb_biryani_shop_v3');
                    localStorage.removeItem('zcb_preferred_view');
                    window.location.reload();
                  }
                }}
                className="w-full py-2.5 bg-rose-700 hover:bg-rose-600 text-white font-black text-xs rounded-xl transition-colors cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <span>🔄 Reset All App Data</span>
              </button>
            </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-stone-400 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-black bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

