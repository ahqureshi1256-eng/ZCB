import React, { useState, useEffect } from 'react';
import { ShopSettings, Order } from '../types';
import {
  Printer,
  Bluetooth,
  Zap,
  CheckCircle2,
  RefreshCw,
  X,
  Info,
  AlertCircle,
  ExternalLink,
  Download,
  Smartphone,
  Check,
  HelpCircle,
  SlidersHorizontal,
} from 'lucide-react';
import {
  connectWebBluetoothPrinter,
  disconnectWebBluetoothPrinter,
  getActiveBluetoothSession,
  addBluetoothStatusListener,
  sendBytesToBluetooth,
  buildEscPosReceipt,
  printViaRawBt,
} from '../utils/printerService';
import { posSound } from '../utils/audio';

interface PrinterSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: ShopSettings;
  onUpdateShop: (settings: ShopSettings) => void;
  onTestPrint?: (customOrder?: Order) => void;
}

export const PrinterSetupModal: React.FC<PrinterSetupModalProps> = ({
  isOpen,
  onClose,
  shop,
  onUpdateShop,
  onTestPrint,
}) => {
  const [activeTab, setActiveTab] = useState<'rawbt' | 'bluetooth'>('rawbt');
  const [isConnectingBt, setIsConnectingBt] = useState(false);
  const [isTestingRawBt, setIsTestingRawBt] = useState(false);
  const [activeBtSession, setActiveBtSession] = useState(getActiveBluetoothSession());
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const standaloneUrl = typeof window !== 'undefined' ? window.location.href : '';
  const isRawBtDefault = shop.preferredPrintMethod === 'rawbt_intent';

  // Synchronize Bluetooth session state in real-time
  useEffect(() => {
    const unsub = addBluetoothStatusListener((session) => {
      setActiveBtSession(session);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isOpen) {
      const sess = getActiveBluetoothSession();
      setActiveBtSession(sess);
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getDemoOrder = (): Order => ({
    id: `test-${Date.now()}`,
    billNumber: 'ZCB-TEST-001',
    tokenNumber: 1,
    dateStr: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    timeStr: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    customerName: 'POS Printer Test',
    customerPhone: '0333-7018183',
    orderType: 'takeaway',
    orderSource: 'pos',
    orderStatus: 'accepted',
    items: [
      {
        id: 'test-1',
        menuItemId: 'biryani-chicken',
        nameEn: 'Chicken Biryani (Test Slip)',
        nameUr: 'Chicken Biryani',
        portionLabelEn: '01 KG Full',
        portionLabel: '01 KG Full',
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
  });

  // Direct RawBT Test Print Trigger
  const handleRawBtTestPrint = async () => {
    setIsTestingRawBt(true);
    posSound.playPrintBill();
    const demoOrder = getDemoOrder();

    try {
      const res = await printViaRawBt(demoOrder, shop, 'bill');
      setIsTestingRawBt(false);
      if (res.success) {
        posSound.playSuccess();
        setStatusMessage({
          type: 'success',
          text: '✓ سگنل RawBT کو بھیج دیا گیا! چیک کریں کہ پرنٹر سے بل نکل آیا ہے۔',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || 'RawBT پرنٹ میں مسئلہ آیا۔ چیک کریں کہ RawBT ایپ موبائل میں انسٹال ہے۔',
        });
      }
    } catch (e: any) {
      setIsTestingRawBt(false);
      setStatusMessage({
        type: 'error',
        text: 'سگنل بھیجتے وقت مسئلہ آیا۔ چیک کریں کہ RawBT ایپ انسٹال ہے۔',
      });
    }
  };

  // Toggle RawBT as default print method
  const handleToggleRawBtDefault = () => {
    posSound.playClick();
    const newMethod = isRawBtDefault ? 'direct_bluetooth' : 'rawbt_intent';
    onUpdateShop({
      ...shop,
      preferredPrintMethod: newMethod,
    });
    setStatusMessage({
      type: 'success',
      text: newMethod === 'rawbt_intent' 
        ? '✓ اب ہر بل خودکار طور پر RawBT کے ذریعے ڈائریکٹ پرنٹر سے نکلے گا!' 
        : 'بلوٹوتھ پرنٹر کو ڈیفالٹ سیٹ کر دیا گیا۔',
    });
  };

  // Direct, single-click Web Bluetooth pairing
  const handleConnectBluetooth = async () => {
    setIsConnectingBt(true);
    setStatusMessage({
      type: 'info',
      text: 'بلوٹوتھ کی درخواست بھیجی جا رہی ہے... اپنے پرنٹر پر کلک کر کے جوڑیں (Pair / OK کریں)',
    });

    try {
      const res = await connectWebBluetoothPrinter();
      setIsConnectingBt(false);

      if (res.success) {
        posSound.playSuccess();
        onUpdateShop({
          ...shop,
          preferredPrintMethod: 'direct_bluetooth',
          bluetoothDeviceName: res.deviceName,
        });
        setStatusMessage({
          type: 'success',
          text: `✓ پرنٹر کامیابی سے منسلک ہو گیا: ${res.deviceName || 'Bluetooth Printer'}`,
        });
      } else if (res.isIframePolicyRestricted) {
        setStatusMessage({
          type: 'error',
          text: 'براؤزر نے فریم میں بلوٹوتھ کی اجازت نہیں دی۔ براہ کرم نیچے دیئے گئے "نئے ٹیب میں کھولیں" بٹن پر کلک کریں۔',
        });
      } else if (res.cancelled) {
        setStatusMessage(null);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'پرنٹر کنیکٹ نہیں ہو سکا۔ چیک کریں کہ پرنٹر آن ہے اور رینج میں ہے۔',
        });
      }
    } catch (e: any) {
      setIsConnectingBt(false);
      setStatusMessage({
        type: 'error',
        text: 'بلوٹوتھ تلاش میں مسئلہ آیا۔ اگر آپ پریویو میں ہیں تو نئے ٹیب میں ایپ کھولیں۔',
      });
    }
  };

  // Disconnect active Bluetooth session
  const handleDisconnectBt = async () => {
    posSound.playClick();
    await disconnectWebBluetoothPrinter();
    setActiveBtSession(null);
    onUpdateShop({
      ...shop,
      bluetoothDeviceName: undefined,
    });
    setStatusMessage({
      type: 'info',
      text: 'پرنٹر منقطع کر دیا گیا ہے۔',
    });
  };

  // Run a quick Web Bluetooth test print slip
  const handleWebBtTestPrint = async () => {
    posSound.playPrintBill();
    const demoOrder = getDemoOrder();

    if (activeBtSession && activeBtSession.characteristic) {
      try {
        const escPosBytes = buildEscPosReceipt(demoOrder, shop, 'bill');
        const sent = await sendBytesToBluetooth(escPosBytes);
        if (sent) {
          posSound.playSuccess();
          setStatusMessage({
            type: 'success',
            text: `✓ ٹیسٹ بل کا سگنل ڈائریکٹ پرنٹر "${activeBtSession.deviceName}" کو بھیج دیا گیا!`,
          });
          return;
        }
      } catch (err: any) {
        console.error('BLE direct print error:', err);
      }
    }

    // Try RawBT as fallback
    try {
      const rawRes = await printViaRawBt(demoOrder, shop, 'bill');
      if (rawRes.success) {
        posSound.playSuccess();
        setStatusMessage({
          type: 'success',
          text: '✓ ٹیسٹ بل کی درخواست ڈائریکٹ پرنٹر کو بھیج دی گئی!',
        });
        return;
      }
    } catch (e) {}

    setStatusMessage({
      type: 'error',
      text: 'پرنٹر منسلک نہیں ہے۔ اوپر دیا گیا بٹن دبا کر اپنا پرنٹر سلیکٹ کریں اور OK دبائیں۔',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 w-full max-w-lg rounded-3xl shadow-2xl border-2 border-stone-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-stone-950 text-white flex items-center justify-between border-b border-amber-500/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-white flex items-center gap-2">
                <span>تھرمل پرنٹر سیٹ اپ</span>
                <span className="text-[10px] bg-amber-500/30 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/40">
                  RawBT & Bluetooth
                </span>
              </h2>
              <p className="text-xs text-stone-400">موبائل اور بلوٹوتھ پرنٹر سے براہِ راست بل نکالیں</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-4 pt-3 bg-stone-950/80 border-b border-stone-800 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              posSound.playClick();
              setActiveTab('rawbt');
            }}
            className={`flex-1 py-2.5 px-3 rounded-t-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border-t border-x ${
              activeTab === 'rawbt'
                ? 'bg-stone-900 text-amber-400 border-amber-500/50 shadow-md -mb-px'
                : 'bg-stone-950/50 text-stone-400 hover:text-stone-200 border-transparent'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>⚡ RawBT ایپ (سب سے بہترین طریقہ)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              posSound.playClick();
              setActiveTab('bluetooth');
            }}
            className={`flex-1 py-2.5 px-3 rounded-t-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border-t border-x ${
              activeTab === 'bluetooth'
                ? 'bg-stone-900 text-amber-400 border-amber-500/50 shadow-md -mb-px'
                : 'bg-stone-950/50 text-stone-400 hover:text-stone-200 border-transparent'
            }`}
          >
            <Bluetooth className="w-4 h-4 text-amber-400" />
            <span>📡 ڈائریکٹ بلوٹوتھ</span>
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`mx-4 mt-3 p-3 rounded-2xl text-xs font-bold flex items-center justify-between border animate-in fade-in shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500 shadow-md'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-500 shadow-md'
                : 'bg-sky-950/90 text-sky-200 border-sky-500 shadow-md'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-stone-400 hover:text-white text-xs font-mono ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Scrollable Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: RAWBT PRINT SERVICE (RECOMMENDED) */}
          {activeTab === 'rawbt' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* RawBT Master Control Card */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 rounded-2xl border-2 border-amber-500/60 shadow-xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/60 text-amber-400 flex items-center justify-center shadow-md">
                      <Zap className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-white text-base sm:text-lg">
                          RawBT Print Service
                        </h3>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                          تجویز کردہ (Best)
                        </span>
                      </div>
                      <p className="text-xs text-stone-300 mt-0.5">
                        اینڈرائڈ پر تمام بلوٹوتھ و تھرمل پرنٹرز کے لیے سب سے تیز ترین اور مستند ڈرائیور۔
                      </p>
                    </div>
                  </div>
                </div>

                {/* RawBT Main Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Test Print Button */}
                  <button
                    type="button"
                    onClick={handleRawBtTestPrint}
                    disabled={isTestingRawBt}
                    className="py-3.5 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 font-black text-sm rounded-xl shadow-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isTestingRawBt ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>بھیجا جا رہا ہے...</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4 stroke-[2.5]" />
                        <span>⚡ RawBT سے ٹیسٹ بل نکالیں</span>
                      </>
                    )}
                  </button>

                  {/* Toggle Default Button */}
                  <button
                    type="button"
                    onClick={handleToggleRawBtDefault}
                    className={`py-3.5 px-4 font-black text-xs sm:text-sm rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      isRawBtDefault
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
                    }`}
                  >
                    {isRawBtDefault ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                        <span>✓ RawBT ڈیفالٹ ایکٹیو ہے</span>
                      </>
                    ) : (
                      <>
                        <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                        <span>ہمیشہ RawBT سے بل نکالیں</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Download RawBT Play Store Link */}
                <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-3">
                  <span className="text-xs text-stone-400">
                    اگر موبائل میں RawBT ایپ انسٹال نہیں ہے:
                  </span>
                  <a
                    href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-600/50 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>Play Store سے ڈاؤن لوڈ کریں</span>
                  </a>
                </div>
              </div>

              {/* Complete Step-by-Step Settings Guide (مکمل سیٹنگز کا طریقہ) */}
              <div className="p-4 sm:p-5 bg-stone-950 rounded-2xl border border-stone-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                  <HelpCircle className="w-4 h-4" />
                  <span>RawBT کی مکمل سیٹنگز (Step-by-Step Guide):</span>
                </div>

                <div className="space-y-3 text-xs text-stone-300 leading-relaxed">
                  {/* Step 1 */}
                  <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center shrink-0 text-xs border border-amber-500/40">
                      1
                    </span>
                    <div>
                      <strong className="text-white block font-bold text-xs mb-0.5">
                        RawBT ایپ انسٹال کریں
                      </strong>
                      <span className="text-stone-400">
                        گوگل پلے اسٹور سے <strong>"RawBT Print Service"</strong> ڈاؤن لوڈ کر لیں۔ یہ ایپ آپ کے موبائل اور پرنٹر کے درمیان ڈرائیور کا کام کرتی ہے۔
                      </span>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center shrink-0 text-xs border border-amber-500/40">
                      2
                    </span>
                    <div>
                      <strong className="text-white block font-bold text-xs mb-0.5">
                        موبائل بلوٹوتھ میں پرنٹر پیئر (Pair) کریں
                      </strong>
                      <span className="text-stone-400">
                        موبائل کی <strong>Settings &gt; Bluetooth</strong> میں جائیں۔ پرنٹر آن کر کے سرچ کریں اور اپنے پرنٹر پر کلک کریں۔ پن کوڈ عام طور پر <strong>0000</strong> یا <strong>1234</strong> ہوتا ہے۔
                      </span>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center shrink-0 text-xs border border-amber-500/40">
                      3
                    </span>
                    <div>
                      <strong className="text-white block font-bold text-xs mb-0.5">
                        RawBT ایپ میں پرنٹر منتخب کریں
                      </strong>
                      <span className="text-stone-400">
                        RawBT ایپ کھولیں۔ اوپر بائیں مینو یا <strong>Settings</strong> پر جائیں &gt; <strong>Printer</strong> پر کلک کریں &gt; <strong>Bluetooth</strong> منتخب کریں اور لسٹ سے اپنے پرنٹر کا نام چن کر <strong>Save</strong> کر دیں۔
                      </span>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/40 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center shrink-0 text-xs border border-emerald-500/40">
                      4
                    </span>
                    <div>
                      <strong className="text-emerald-300 block font-bold text-xs mb-0.5">
                        سائلنٹ پرنٹنگ (بغیر کسی ونڈو کے فوری پرنٹ)
                      </strong>
                      <span className="text-stone-300">
                        RawBT کی سیٹنگز میں <strong>"Web Server"</strong> آن کر دیں۔ اس کے بعد جب بھی آپ پی او ایس میں <strong>"PRINT BILL"</strong> کا بٹن دبائیں گے، بل 1 سیکنڈ کے اندر سیدھا پرنٹر سے بغیر کسی رکاوٹ کے نکل آئے گا!
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT WEB BLUETOOTH */}
          {activeTab === 'bluetooth' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* If inside iframe: Prominent 1-click open in Chrome banner */}
              {isInIframe && (
                <div className="p-3.5 bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-transparent rounded-2xl border-2 border-amber-500/60 shadow-md">
                  <div className="flex items-start gap-2.5">
                    <ExternalLink className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <p className="text-xs font-bold text-amber-200 leading-snug">
                        موبائل بلوٹوتھ پرنٹر جوڑنے کے لیے ایپ کو فل کروم براؤزر میں کھولیں تاکہ فون پر پیئرنگ کا پوپ اپ ظاہر ہو سکے۔
                      </p>
                      <a
                        href={standaloneUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>🚀 نئے ٹیب میں ایپ کھولیں (Open in Chrome)</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Direct Bluetooth Card */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all shadow-lg space-y-3.5 ${
                  activeBtSession
                    ? 'bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/30'
                    : 'bg-stone-950 border-amber-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                      activeBtSession
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-emerald-500/20'
                        : 'bg-amber-500/20 border-amber-400 text-amber-400'
                    }`}
                  >
                    <Bluetooth className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-white truncate">
                        {activeBtSession
                          ? `✓ ${activeBtSession.deviceName || 'Bluetooth Printer'}`
                          : 'کوئی پرنٹر منسلک نہیں ہے'}
                      </h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          activeBtSession
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-stone-800 text-stone-400 border border-stone-700'
                        }`}
                      >
                        {activeBtSession ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {activeBtSession
                        ? 'پرنٹر بل نکالنے کے لیے تیار ہے۔'
                        : 'اپنے پرنٹر کا بلوٹوتھ آن کریں اور نیچے دیا گیا بٹن دبائیں:'}
                    </p>
                  </div>
                </div>

                {/* Direct 1-Click Action Buttons */}
                <div className="pt-1">
                  {!activeBtSession ? (
                    <button
                      type="button"
                      onClick={handleConnectBluetooth}
                      disabled={isConnectingBt}
                      className="w-full py-4 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 font-black text-sm sm:text-base rounded-2xl shadow-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2.5"
                    >
                      {isConnectingBt ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>درخواست بھیجی جا رہی ہے...</span>
                        </>
                      ) : (
                        <>
                          <Bluetooth className="w-5 h-5 stroke-[2.5]" />
                          <span>📡 بلوٹوتھ پرنٹر سے جوڑیں (Connect Printer)</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleWebBtTestPrint}
                        className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Printer className="w-4 h-4 stroke-[2.5]" />
                        <span>🖨️ ٹیسٹ بل نکالیں (Print Test Bill)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnectBt}
                        className="py-3.5 px-4 bg-stone-800 hover:bg-rose-950 text-stone-300 hover:text-rose-300 border border-stone-700 text-xs font-bold rounded-xl cursor-pointer transition-all"
                      >
                        منقطع کریں (Disconnect)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-stone-950 border-t border-stone-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-stone-400">
            طریقہ کار:{' '}
            <strong className="text-amber-400">
              {isRawBtDefault ? '⚡ RawBT Service (Auto Print)' : '📡 Bluetooth / Hardware'}
            </strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-white font-black text-xs rounded-xl shadow-sm cursor-pointer transition-all active:scale-95"
          >
            بند کریں (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
