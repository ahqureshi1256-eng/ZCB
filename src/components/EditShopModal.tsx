import React, { useState } from 'react';
import { ShopSettings } from '../types';
import { Store, X, Check, Phone, MapPin, Tag } from 'lucide-react';

interface EditShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ShopSettings;
  onSave: (newSettings: ShopSettings) => void;
}

export const EditShopModal: React.FC<EditShopModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [formData, setFormData] = useState<ShopSettings>(settings);

  if (!isOpen) return null;

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase mb-1">
                Short Name / Brand Code *
              </label>
              <input
                type="text"
                required
                value={formData.shortName || 'ZCB'}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                placeholder="ZCB"
                className="w-full px-3.5 py-2 text-sm font-black bg-stone-950 border border-amber-500/50 text-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={formData.currencySymbol || 'Rs.'}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                placeholder="Rs."
                className="w-full px-3.5 py-2 text-sm font-bold bg-stone-950 border border-stone-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
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
                🗣️ بولنے والی گھنٹی کی ترتیبات (Talking Order Alert)
              </label>
              <button
                type="button"
                onClick={() => {
                  import('../utils/audio').then(({ posSound }) => {
                    posSound.testVoiceAlert(formData.cashierName || 'مزمل');
                  });
                }}
                className="px-2 py-1 text-[11px] bg-red-950 hover:bg-red-900 text-red-200 border border-red-700/60 rounded-lg font-bold transition-colors cursor-pointer"
              >
                🔊 آواز ٹیسٹ کریں
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-stone-300 font-semibold mb-1">
                  کیشیئر کا نام (Cashier Name in Voice):
                </label>
                <input
                  type="text"
                  value={formData.cashierName || 'مزمل'}
                  onChange={(e) => setFormData({ ...formData, cashierName: e.target.value })}
                  placeholder="مزمل"
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
                  نئے آرڈر پر "اے مزمل آرڈر اٹھاؤ" بولیں
                </label>
              </div>
            </div>
          </div>

          <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
            <label className="block text-xs font-bold text-amber-400 uppercase">
              Thermal Printer Paper Width
            </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, printerWidth: '80mm', thermalPaperWidth: '80mm' })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    (formData.printerWidth || formData.thermalPaperWidth) === '80mm'
                      ? 'bg-amber-500 text-stone-950 border-amber-400'
                      : 'bg-stone-900 text-stone-300 border-stone-700'
                  }`}
                >
                  80mm Standard POS
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, printerWidth: '58mm', thermalPaperWidth: '58mm' })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    (formData.printerWidth || formData.thermalPaperWidth) === '58mm'
                      ? 'bg-amber-500 text-stone-950 border-amber-400'
                      : 'bg-stone-900 text-stone-300 border-stone-700'
                  }`}
                >
                  58mm Mini Bluetooth POS
                </button>
              </div>
            </div>

            {/* System Reset & Data Cleaning Section */}
            <div className="p-3.5 bg-rose-950/40 rounded-xl border border-rose-600/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300 uppercase">
                  ⚠️ ری سیٹ بٹن (System Reset & Clean Data)
                </span>
                <span className="text-[10px] text-rose-400 font-mono">DANGER ZONE</span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                اگر آپ تمام پرانے ٹیسٹ بل، کھاتہ، اور کسٹم ترتیبات ری سیٹ کر کے نیا آغاز کرنا چاہتے ہیں تو نیچے دیے گئے ری سیٹ بٹن کو استعمال کریں۔
              </p>
              <button
                type="button"
                onClick={() => {
                  const confirmReset = window.confirm(
                    'کیا آپ واقعی تمام ڈیٹا اور بل ری سیٹ کر کے ایپ کو فیکٹری سیٹنگ پر لانا چاہتے ہیں؟'
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
                <span>🔄 تمام ڈیٹا ری سیٹ کریں (Reset All App Data)</span>
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

