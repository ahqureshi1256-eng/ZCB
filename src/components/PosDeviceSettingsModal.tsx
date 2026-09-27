import React, { useState, useEffect } from 'react';
import { ShopSettings } from '../types';
import { posSound } from '../utils/audio';
import {
  Smartphone,
  Printer,
  Bluetooth,
  CheckCircle,
  Bell,
  Volume2,
  Sparkles,
  Zap,
  HelpCircle,
  ShieldCheck,
  Check,
  RotateCcw,
  Copy,
  ExternalLink,
  Sun,
  X,
  Play,
  Download,
  Scissors,
} from 'lucide-react';

interface PosDeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: ShopSettings;
  onSave: (updated: ShopSettings) => void;
  onTestPrint: () => void;
  onOpenPrinterSetup?: () => void;
}

export const PosDeviceSettingsModal: React.FC<PosDeviceSettingsModalProps> = ({
  isOpen,
  onClose,
  shop,
  onSave,
  onTestPrint,
  onOpenPrinterSetup,
}) => {
  if (!isOpen) return null;

  const [settings, setSettings] = useState<ShopSettings>({
    ...shop,
    posDeviceMode: shop.posDeviceMode ?? true,
    autoAcceptOnlineOrders: shop.autoAcceptOnlineOrders ?? true,
    autoPrintOnAccept: shop.autoPrintOnAccept ?? true,
    autoPrintTarget: shop.autoPrintTarget ?? 'both',
    posKeepScreenAwake: shop.posKeepScreenAwake ?? true,
    posLoudAlert: shop.posLoudAlert ?? true,
    thermalPaperWidth: shop.thermalPaperWidth ?? '58mm',
    printerWidth: shop.printerWidth ?? '58mm',
    autoCutPaper: shop.autoCutPaper ?? true,
  });

  const [copiedLink, setCopiedLink] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Screen WakeLock status check
  useEffect(() => {
    if ('wakeLock' in navigator) {
      setWakeLockActive(true);
    }
  }, []);

  const handleToggleAutoAccept = () => {
    setSettings((prev) => ({
      ...prev,
      autoAcceptOnlineOrders: !prev.autoAcceptOnlineOrders,
    }));
  };

  const handleToggleAutoPrint = () => {
    setSettings((prev) => ({
      ...prev,
      autoPrintOnAccept: !prev.autoPrintOnAccept,
    }));
  };

  const handleToggleAutoCut = () => {
    setSettings((prev) => ({
      ...prev,
      autoCutPaper: prev.autoCutPaper === false ? true : false,
    }));
  };

  const handleToggleWakeLock = () => {
    setSettings((prev) => ({
      ...prev,
      posKeepScreenAwake: !prev.posKeepScreenAwake,
    }));
  };

  const handleToggleLoudAlert = () => {
    setSettings((prev) => ({
      ...prev,
      posLoudAlert: !prev.posLoudAlert,
    }));
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const handleTestSound = () => {
    posSound.startContinuousOrderBell(0, shop.cashierName || 'Cashier', true);
    setTimeout(() => {
      posSound.stopContinuousOrderBell();
    }, 4000);
  };

  const handleCopyPosUrl = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border-2 border-amber-500/80 text-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 p-4 sm:p-5 flex items-center justify-between text-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-950 text-amber-400 flex items-center justify-center shadow-lg border border-amber-400/50">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-stone-950 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/40">
                  SMART POS TERMINAL & AUTO-PRINT
                </span>
                <span className="text-[11px] bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/50">
                  ● Cloud Sync Active
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-stone-950 mt-0.5">
                POS Device & Auto-Order Settings
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-950/20 hover:bg-stone-950/40 text-stone-950 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Notice Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90 leading-relaxed">
              <strong>Smart Setup:</strong> Automated system for your <strong>POS Device / Handheld Thermal Machine</strong>. As soon as a customer places an order on the website, a loud alert will sound on this device and the <strong>bill will automatically print from the attached printer</strong>!
            </p>
          </div>

          {/* Setting 1: Auto Accept Online Orders */}
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">
                  Auto-Accept Incoming Orders
                </h3>
              </div>
              <p className="text-xs text-stone-400">
                Instantly accept customer website orders on the POS device automatically without manual tapping.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoAccept}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.autoAcceptOnlineOrders ? 'bg-emerald-500' : 'bg-stone-750'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.autoAcceptOnlineOrders ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Setting 2: Auto Print Bill on Accept */}
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-sm text-white">
                    Auto-Print Bill on POS Machine
                  </h3>
                </div>
                <p className="text-xs text-stone-400">
                  Automatically print the receipt on the built-in thermal printer when an online order arrives.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoPrint}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.autoPrintOnAccept ? 'bg-amber-500' : 'bg-stone-750'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.autoPrintOnAccept ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {settings.autoPrintOnAccept && (
              <div className="pt-3 border-t border-stone-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Print Target Choice */}
                <div>
                  <label className="text-[11px] font-bold text-stone-400 block mb-1">
                    What to Print:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSettings((p) => ({ ...p, autoPrintTarget: 'both' }))}
                      className={`p-2 rounded-xl text-center font-bold border transition-colors cursor-pointer ${
                        settings.autoPrintTarget === 'both'
                          ? 'bg-amber-500 text-stone-950 border-amber-400'
                          : 'bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      Bill + KOT
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings((p) => ({ ...p, autoPrintTarget: 'bill' }))}
                      className={`p-2 rounded-xl text-center font-bold border transition-colors cursor-pointer ${
                        settings.autoPrintTarget === 'bill'
                          ? 'bg-amber-500 text-stone-950 border-amber-400'
                          : 'bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      Bill Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings((p) => ({ ...p, autoPrintTarget: 'kot' }))}
                      className={`p-2 rounded-xl text-center font-bold border transition-colors cursor-pointer ${
                        settings.autoPrintTarget === 'kot'
                          ? 'bg-amber-500 text-stone-950 border-amber-400'
                          : 'bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      KOT Only
                    </button>
                  </div>
                </div>

                {/* Paper Width (58mm / 80mm) & Connect Printer button */}
                <div>
                  <label className="text-[11px] font-bold text-stone-400 block mb-1">
                    Thermal Paper Roll Width & Setup:
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSettings((p) => ({ ...p, printerWidth: '58mm', thermalPaperWidth: '58mm' }))}
                      className={`flex-1 p-2 rounded-xl text-center font-bold border transition-colors cursor-pointer text-xs ${
                        (settings.printerWidth || settings.thermalPaperWidth) === '58mm'
                          ? 'bg-amber-500 text-stone-950 border-amber-400 font-black'
                          : 'bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      58mm Mini
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings((p) => ({ ...p, printerWidth: '80mm', thermalPaperWidth: '80mm' }))}
                      className={`flex-1 p-2 rounded-xl text-center font-bold border transition-colors cursor-pointer text-xs ${
                        (settings.printerWidth || settings.thermalPaperWidth) === '80mm'
                          ? 'bg-amber-500 text-stone-950 border-amber-400 font-black'
                          : 'bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      80mm POS
                    </button>
                  </div>
                </div>

                {onOpenPrinterSetup && (
                  <div className="sm:col-span-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenPrinterSetup();
                      }}
                      className="w-full py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      <span>🖨️ پرنٹر کنیکٹ کریں یا تبدیل کریں (All Printer Options)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Setting: Automatic Paper Cut (ESC/POS Auto-Cutter) */}
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">
                  Automatic Paper Cut (Auto-Cutter)
                </h3>
                <span className="text-[10px] bg-amber-500/10 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  ESC/POS GS V
                </span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Sends the hardware automatic paper cut command (<code className="font-mono text-[11px] text-amber-300 bg-stone-900 px-1 py-0.5 rounded">GS V 66 0</code>) after every customer bill and kitchen KOT is printed. Turn off if your printer has a manual tear-bar or doesn't support motorized auto-cutting.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoCut}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.autoCutPaper !== false ? 'bg-amber-500' : 'bg-stone-750'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.autoCutPaper !== false ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Setting 3: Keep POS Screen Awake (WakeLock) */}
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-sm text-white">
                  Keep POS Screen Awake
                </h3>
              </div>
              <p className="text-xs text-stone-400">
                Keep device display turned on continuously while on counter so incoming orders are always visible.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleWakeLock}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.posKeepScreenAwake ? 'bg-amber-500' : 'bg-stone-750'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.posKeepScreenAwake ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Setting 4: Loud Continuous Alarm Sound */}
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-red-400" />
                <h3 className="font-bold text-sm text-white">
                  Loud Order Sound Alarm & Voice Alert
                </h3>
              </div>
              <p className="text-xs text-stone-400">
                Plays loud alert chime and voice alert when a new customer order arrives.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestSound}
                className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-xl text-xs font-bold border border-stone-700 cursor-pointer flex items-center gap-1"
                title="Test Alarm Sound"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Test Sound</span>
              </button>
              <button
                type="button"
                onClick={handleToggleLoudAlert}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.posLoudAlert ? 'bg-red-500' : 'bg-stone-750'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.posLoudAlert ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* POS Device Installation Guide */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-950 to-stone-900 border border-amber-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm text-amber-300">
                  POS Device App Installation Steps
                </h3>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                1-Minute Setup
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-stone-300">
              <div className="flex items-start gap-2.5 bg-stone-900/80 p-2.5 rounded-xl border border-stone-800">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Open Google Chrome / Web Browser on your POS machine and visit the link below.
                </p>
              </div>

              <div className="flex items-start gap-2.5 bg-stone-900/80 p-2.5 rounded-xl border border-stone-800">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Click the browser menu (3 dots) and tap <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>. This launches the software as a full-screen POS terminal.
                </p>
              </div>

              <div className="flex items-start gap-2.5 bg-stone-900/80 p-2.5 rounded-xl border border-stone-800">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Sign in with your owner email <strong>a.hqureshi1256@gmail.com</strong> for full control of both POS terminal and customer ordering portal.
                </p>
              </div>
            </div>

            {/* Quick URL Copy Bar */}
            <div className="pt-2 flex items-center gap-2">
              <div className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-amber-200 truncate select-all">
                {window.location.origin}
              </div>
              <button
                type="button"
                onClick={handleCopyPosUrl}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Test Buttons Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {onOpenPrinterSetup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrinterSetup();
                }}
                className="py-3 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white font-black text-xs border border-sky-400/50 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95"
              >
                <Bluetooth className="w-4 h-4 text-sky-200" />
                <span>📡 Pair Bluetooth</span>
              </button>
            )}
            <button
              type="button"
              onClick={onTestPrint}
              className="py-3 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs border border-stone-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Test Print ({settings.thermalPaperWidth || '58mm'})</span>
            </button>
            <button
              type="button"
              onClick={handleTestSound}
              className="py-3 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs border border-stone-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>Test Loud Alarm</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer transition-all flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5 stroke-[2.5]" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
