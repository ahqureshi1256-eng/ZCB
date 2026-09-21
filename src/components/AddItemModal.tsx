import React, { useState } from 'react';
import { MenuItem, MenuItemPortion } from '../types';
import { X, Plus, Trash2, CheckCircle2, Utensils } from 'lucide-react';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (newItem: MenuItem) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
}) => {
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState<MenuItem['category']>('biryani');
  const [isVeg, setIsVeg] = useState(false);
  const [priceType, setPriceType] = useState<'single' | 'portions'>('portions');
  const [singlePrice, setSinglePrice] = useState<number>(180);

  const [portions, setPortions] = useState<MenuItemPortion[]>([
    { id: 'p1', labelUr: '250g (1 Pao)', labelEn: '250g (1 Pao)', price: 160 },
    { id: 'p2', labelUr: '500g (Half Kg)', labelEn: '500g (Half Kg)', price: 320 },
    { id: 'p3', labelUr: '1000g (1 KG)', labelEn: '1000g (1 KG)', price: 640 },
  ]);

  if (!isOpen) return null;

  const handleAddPortion = () => {
    const newId = `p-${Date.now()}`;
    setPortions([...portions, { id: newId, labelUr: 'Portion', labelEn: 'Portion', price: 100 }]);
  };

  const handleUpdatePortion = (index: number, field: keyof MenuItemPortion, val: any) => {
    const updated = [...portions];
    updated[index] = { ...updated[index], [field]: val };
    setPortions(updated);
  };

  const handleRemovePortion = (index: number) => {
    setPortions(portions.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) return;

    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      nameUr: nameEn.trim(),
      nameEn: nameEn.trim(),
      nameHi: nameEn.trim(),
      category,
      isVeg,
      ...(priceType === 'single'
        ? { defaultPrice: Number(singlePrice) }
        : { portions }),
    };

    onAddItem(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-stone-900 w-full max-w-lg rounded-2xl shadow-2xl border border-stone-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 text-white flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base text-amber-100">Add New Menu Item</h2>
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
              Item Name *
            </label>
            <input
              type="text"
              required
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Chicken Biryani, Shami Kabab, Cold Drink"
              className="w-full px-3.5 py-2 text-sm bg-stone-950 border border-stone-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-semibold bg-stone-950 border border-stone-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="biryani">🍗 Biryani</option>
                <option value="drinks">🥤 Cold Drinks</option>
                <option value="kababs">🍢 Kababs & Tikka</option>
                <option value="sides">🥣 Raita & Salad</option>
                <option value="dessert">🍮 Kheer & Dessert</option>
                <option value="other">🍽️ Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase mb-1">
                Type
              </label>
              <div className="flex gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsVeg(false)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    !isVeg
                      ? 'bg-red-950/60 border-red-500 text-red-300'
                      : 'border-stone-700 text-stone-400 hover:bg-stone-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  <span>Non-Veg</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsVeg(true)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    isVeg
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                      : 'border-stone-700 text-stone-400 hover:bg-stone-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span>Veg</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Setup */}
          <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-300 uppercase">
                Pricing Method
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPriceType('portions')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    priceType === 'portions'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'bg-stone-900 text-stone-300 border border-stone-700'
                  }`}
                >
                  Weight / Portions (250g, 1 KG)
                </button>
                <button
                  type="button"
                  onClick={() => setPriceType('single')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    priceType === 'single'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'bg-stone-900 text-stone-300 border border-stone-700'
                  }`}
                >
                  Single Price
                </button>
              </div>
            </div>

            {priceType === 'single' ? (
              <div>
                <label className="block text-xs text-stone-400 font-medium mb-1">
                  Price (Rs.):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-amber-500">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={singlePrice}
                    onChange={(e) => setSinglePrice(Number(e.target.value))}
                    className="w-full pl-12 pr-3 py-2 text-sm font-bold bg-stone-900 border border-stone-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px] font-bold text-stone-400">
                  <span>Portion Label (e.g. 250g / 1 Pao, 1 KG)</span>
                  <span>Price (Rs.)</span>
                </div>

                {portions.map((portion, idx) => (
                  <div key={portion.id || idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={portion.labelEn || portion.labelUr}
                      onChange={(e) => {
                        handleUpdatePortion(idx, 'labelEn', e.target.value);
                        handleUpdatePortion(idx, 'labelUr', e.target.value);
                      }}
                      placeholder="e.g. 250g (1 Pao)"
                      className="flex-1 px-2.5 py-1.5 text-xs bg-stone-900 border border-stone-700 text-white rounded-lg"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500">
                        Rs.
                      </span>
                      <input
                        type="number"
                        value={portion.price}
                        onChange={(e) =>
                          handleUpdatePortion(idx, 'price', Number(e.target.value))
                        }
                        className="w-full pl-9 pr-2 py-1.5 text-xs font-bold bg-stone-900 border border-stone-700 text-white rounded-lg text-right"
                      />
                    </div>
                    {portions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePortion(idx)}
                        className="p-1.5 text-stone-500 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddPortion}
                  className="w-full py-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 border border-dashed border-amber-500/40 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Another Portion</span>
                </button>
              </div>
            )}
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
              className="px-5 py-2 text-xs font-black bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Save Menu Item</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

