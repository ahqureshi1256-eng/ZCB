import React, { useState, useMemo } from 'react';
import { MenuItem, OrderItem, ShopSettings } from '../types';
import { posSound } from '../utils/audio';
import { formatPrice } from '../utils/billing';
import {
  Search,
  Plus,
  Sparkles,
  Flame,
  PlusCircle,
  Utensils,
  CupSoda,
  Beef,
  CakeSlice,
  Soup,
} from 'lucide-react';

interface MenuSectionProps {
  menuItems: MenuItem[];
  currentOrderItems: OrderItem[];
  shop: ShopSettings;
  onAddItem: (item: MenuItem, portionId?: string) => void;
  onOpenAddItemModal: () => void;
  soundEnabled: boolean;
}

export const MenuSection: React.FC<MenuSectionProps> = ({
  menuItems,
  currentOrderItems,
  shop,
  onAddItem,
  onOpenAddItemModal,
  soundEnabled,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    { id: 'all', label: 'All Items', icon: Sparkles },
    { id: 'biryani', label: 'Biryani Menu', icon: Flame },
    { id: 'sides', label: 'Sides & Salad', icon: Soup },
    { id: 'kababs', label: 'Shami Kababs', icon: Beef },
    { id: 'drinks', label: 'Cold Drinks', icon: CupSoda },
  ];

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'sides' && (item.category === 'sides' || item.category === 'other')) ||
        item.category === selectedCategory;

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.nameEn?.toLowerCase().includes(query) ||
        item.nameUr?.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const handleAdd = (item: MenuItem, portionId?: string) => {
    if (soundEnabled) {
      posSound.playAddItem();
    }
    onAddItem(item, portionId);
  };

  // Helper to count how many of a specific item/portion are in bill
  const getItemCount = (menuItemId: string, portionLabelEn?: string) => {
    return currentOrderItems
      .filter((it) => it.menuItemId === menuItemId && (!portionLabelEn || (it.portionLabelEn || it.portionLabelUr) === portionLabelEn))
      .reduce((sum, it) => sum + it.quantity, 0);
  };

  return (
    <div className="flex flex-col h-full bg-stone-900/90 rounded-2xl border border-stone-800 shadow-xl overflow-hidden">
      {/* Search & Top Action Bar */}
      <div className="p-3.5 sm:p-4 border-b border-stone-800 bg-stone-950/80 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Chicken Biryani, Sada Biryani, Cold Drink..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
            />
          </div>

          <button
            onClick={onOpenAddItemModal}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold shadow-md transition-colors shrink-0 cursor-pointer"
            title="Add New Item to Menu"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">+ Add Item</span>
            <span className="sm:hidden">+ Item</span>
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 shadow-md ring-1 ring-amber-400'
                    : 'bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Food Items Grid */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-stone-500 text-sm">
            <p className="font-semibold text-stone-400">No matching items found.</p>
            <p className="text-xs text-stone-600 mt-1">Try another search or click '+ Add Item'.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredItems.map((item) => {
              const isBiryani = item.category === 'biryani';
              const totalInCart = getItemCount(item.id);

              return (
                <div
                  key={item.id}
                  className={`rounded-xl p-3.5 border transition-all relative flex flex-col justify-between ${
                    isBiryani
                      ? 'bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/40 border-amber-500/40 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/5'
                      : 'bg-stone-900/90 border-stone-800 hover:border-stone-700 hover:shadow-md'
                  }`}
                >
                  {/* Card Header with Item Logo / Photo */}
                  <div className="flex items-start gap-3">
                    {/* Item Logo / Thumbnail Image */}
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-stone-700 bg-stone-950 flex items-center justify-center shadow-inner">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.nameEn}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-stone-800 text-amber-400">
                          {item.category === 'drinks' ? (
                            <CupSoda className="w-6 h-6" />
                          ) : item.category === 'kababs' ? (
                            <Beef className="w-6 h-6" />
                          ) : (
                            <Utensils className="w-6 h-6" />
                          )}
                        </div>
                      )}
                      {item.popular && (
                        <span className="absolute top-0 right-0 bg-amber-500 text-stone-950 text-[8px] font-black px-1 rounded-bl">
                          POPULAR
                        </span>
                      )}
                    </div>

                    {/* Titles */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-black text-amber-100 text-base leading-snug tracking-tight">
                          {item.nameEn || item.nameUr}
                        </h3>
                        {totalInCart > 0 && (
                          <span className="px-2 py-0.5 bg-amber-500 text-stone-950 rounded-full text-[10px] font-black shrink-0 shadow-xs">
                            {totalInCart} in Bill
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 font-medium mt-0.5">
                        {item.category === 'biryani'
                          ? 'Fresh Karachi Dum Biryani'
                          : item.category === 'drinks'
                          ? 'Chilled Refreshment'
                          : 'Sides & Extras'}
                      </p>
                    </div>
                  </div>

                  {/* Portions or Direct Add */}
                  {item.portions && item.portions.length > 0 ? (
                    <div className="mt-3 space-y-1.5">
                      <div className="text-[11px] font-semibold text-stone-400 flex justify-between">
                        <span>Select Portion / Size:</span>
                        <span className="text-[10px] text-amber-400 font-medium">1-Click Quick Add</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {item.portions.map((portion) => {
                          const portionLabel = portion.labelEn || portion.labelUr;
                          const portionCount = getItemCount(item.id, portionLabel);
                          return (
                            <button
                              key={portion.id}
                              onClick={() => handleAdd(item, portion.id)}
                              className="relative flex flex-col items-center justify-center p-2 rounded-xl border border-stone-700 bg-stone-950/80 hover:bg-amber-500 hover:text-stone-950 hover:border-amber-400 transition-all text-center group cursor-pointer active:scale-95 shadow-sm"
                            >
                              {portionCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 text-stone-950 text-[9px] rounded-full flex items-center justify-center font-black border border-stone-950">
                                  {portionCount}
                                </span>
                              )}
                              <span className="text-xs font-bold text-stone-200 group-hover:text-stone-950 line-clamp-1">
                                {portionLabel}
                              </span>
                              <span className="text-xs font-black text-amber-400 group-hover:text-stone-950 mt-0.5">
                                {formatPrice(portion.price, shop.currencySymbol)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-stone-800">
                      <div>
                        <span className="text-xs text-stone-400">Price: </span>
                        <span className="text-sm font-black text-amber-300">
                          {formatPrice(item.defaultPrice || 0, shop.currencySymbol)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleAdd(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-lg transition-colors cursor-pointer active:scale-95 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>+ Add to Bill</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

