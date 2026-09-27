import React, { useState, useMemo } from 'react';
import { MenuItem, OrderItem, ShopSettings } from '../types';
import { posSound } from '../utils/audio';
import { formatPrice } from '../utils/billing';
import { ZcbLogo } from './ZcbLogo';
import {
  Search,
  Plus,
  Minus,
  XCircle,
  Sparkles,
  PlusCircle,
  Utensils,
  CupSoda,
  Beef,
  Trash2,
  LayoutGrid,
  List,
  AlertTriangle,
  Package,
} from 'lucide-react';

interface MenuSectionProps {
  menuItems: MenuItem[];
  currentOrderItems: OrderItem[];
  shop: ShopSettings;
  onAddItem: (item: MenuItem, portionId?: string) => void;
  onDecreaseItem?: (item: MenuItem, portionId?: string) => void;
  onCancelItem?: (item: MenuItem, portionId?: string) => void;
  onClearBill?: () => void;
  onOpenAddItemModal: () => void;
  onDeleteItem?: (itemId: string) => void;
  onEditPrice?: (itemId: string, portionId: string | undefined, newPrice: number) => void;
  onAddCustomItem?: (name: string, price: number, portion?: string) => void;
  soundEnabled: boolean;
}

export const MenuSection: React.FC<MenuSectionProps> = ({
  menuItems,
  currentOrderItems,
  shop,
  onAddItem,
  onDecreaseItem,
  onCancelItem,
  onClearBill,
  onOpenAddItemModal,
  soundEnabled,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'line'>('grid');

  // Flatten items into distinct individual medium-sized cards for every portion
  interface DisplayCard {
    cardId: string;
    parentItem: MenuItem;
    portionId?: string;
    nameEn: string;
    portionBadge?: string;
    price: number;
    category: string;
    imageUrl?: string;
    isBiryani: boolean;
    popular?: boolean;
    trackInventory: boolean;
    stockQuantity: number;
    lowStockThreshold: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
  }

  const allDisplayCards = useMemo(() => {
    const cards: DisplayCard[] = [];

    menuItems.forEach((item) => {
      if (item.portions && item.portions.length > 0) {
        item.portions.forEach((portion) => {
          const portionLabel = portion.labelEn || portion.labelUr || '';
          const trackInventory = !!(portion.trackInventory ?? item.trackInventory);
          const stockQuantity = portion.stockQuantity ?? item.stockQuantity ?? 0;
          const lowStockThreshold = portion.lowStockThreshold ?? item.lowStockThreshold ?? 5;
          const isOutOfStock = trackInventory && stockQuantity <= 0;
          const isLowStock = trackInventory && stockQuantity > 0 && stockQuantity <= lowStockThreshold;

          cards.push({
            cardId: `${item.id}-${portion.id}`,
            parentItem: item,
            portionId: portion.id,
            nameEn: `${item.nameEn}`,
            portionBadge: portion.weightOrQty || portionLabel,
            price: portion.price,
            category: item.category,
            imageUrl: item.imageUrl,
            isBiryani: item.category === 'biryani',
            popular: item.popular,
            trackInventory,
            stockQuantity,
            lowStockThreshold,
            isLowStock,
            isOutOfStock,
          });
        });
      } else {
        const trackInventory = !!item.trackInventory;
        const stockQuantity = item.stockQuantity ?? 0;
        const lowStockThreshold = item.lowStockThreshold ?? 5;
        const isOutOfStock = trackInventory && stockQuantity <= 0;
        const isLowStock = trackInventory && stockQuantity > 0 && stockQuantity <= lowStockThreshold;

        cards.push({
          cardId: item.id,
          parentItem: item,
          portionId: undefined,
          nameEn: item.nameEn,
          portionBadge: undefined,
          price: item.defaultPrice || 0,
          category: item.category,
          imageUrl: item.imageUrl,
          isBiryani: item.category === 'biryani',
          popular: item.popular,
          trackInventory,
          stockQuantity,
          lowStockThreshold,
          isLowStock,
          isOutOfStock,
        });
      }
    });

    return cards;
  }, [menuItems]);

  const lowStockCount = useMemo(() => {
    return allDisplayCards.filter((c) => c.isLowStock || c.isOutOfStock).length;
  }, [allDisplayCards]);

  // Standard clean food categories + Low Stock Filter
  const categories = useMemo(() => {
    const base = [
      { id: 'all', label: 'All Items', emoji: '✨' },
      { id: 'biryani', label: '🍗 Biryani', emoji: '🍗' },
      { id: 'kababs', label: '🍢 Shami Kababs', emoji: '🍢' },
      { id: 'sides', label: '🥣 Raita & Salad', emoji: '🥣' },
      { id: 'drinks', label: '🥤 Cold Drinks', emoji: '🥤' },
    ];
    if (lowStockCount > 0) {
      base.splice(1, 0, {
        id: 'low_stock',
        label: `⚠️ Low Stock (${lowStockCount})`,
        emoji: '⚠️',
      });
    }
    return base;
  }, [lowStockCount]);

  const filteredCards = useMemo(() => {
    return allDisplayCards.filter((card) => {
      let matchesCategory = false;
      if (selectedCategory === 'all') {
        matchesCategory = true;
      } else if (selectedCategory === 'low_stock') {
        matchesCategory = card.isLowStock || card.isOutOfStock;
      } else if (selectedCategory === 'sides') {
        matchesCategory = card.category === 'sides' || card.category === 'other';
      } else {
        matchesCategory = card.category === selectedCategory;
      }

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        card.nameEn.toLowerCase().includes(query) ||
        (card.portionBadge && card.portionBadge.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [allDisplayCards, selectedCategory, searchQuery]);

  const handleAddCard = (card: DisplayCard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (soundEnabled) {
      posSound.playAddItem();
    }
    onAddItem(card.parentItem, card.portionId);
  };

  const handleDecreaseCard = (card: DisplayCard, e: React.MouseEvent) => {
    e.stopPropagation();
    if (soundEnabled) {
      posSound.playClick();
    }
    if (onDecreaseItem) {
      onDecreaseItem(card.parentItem, card.portionId);
    }
  };

  const handleCancelCard = (card: DisplayCard, e: React.MouseEvent) => {
    e.stopPropagation();
    if (soundEnabled) {
      posSound.playClick();
    }
    if (onCancelItem) {
      onCancelItem(card.parentItem, card.portionId);
    }
  };

  // Helper to count how many of this specific card/portion are in the active bill
  const getCardCountInBill = (card: DisplayCard) => {
    if (card.portionId && card.parentItem.portions) {
      const p = card.parentItem.portions.find((pt) => pt.id === card.portionId);
      const pLabelEn = p ? p.labelEn : undefined;
      return currentOrderItems
        .filter((it) => {
          if (it.menuItemId !== card.parentItem.id) return false;
          if (it.portionId && it.portionId === card.portionId) return true;
          if (pLabelEn && (it.portionLabelEn === pLabelEn || it.portionLabel === pLabelEn)) return true;
          return false;
        })
        .reduce((sum, it) => sum + it.quantity, 0);
    }
    return currentOrderItems
      .filter((it) => it.menuItemId === card.parentItem.id && !it.portionId && !it.portionLabelEn && !it.portionLabel)
      .reduce((sum, it) => sum + it.quantity, 0);
  };

  return (
    <div className="flex flex-col h-auto lg:h-full bg-stone-900 rounded-3xl border-2 border-stone-800 shadow-2xl overflow-visible lg:overflow-hidden">
      {/* Search & Top Action Bar */}
      <div className="p-3 sm:p-4 border-b border-stone-800 bg-stone-950 space-y-3">
        {/* Search Bar & Actions */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search: 1 Paav, 2 Paav, 1 KG, Kababs, Drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-stone-900 border border-stone-700 hover:border-amber-500/50 rounded-xl text-xs sm:text-sm text-stone-100 placeholder:text-stone-400 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-inner"
            />
          </div>

          {currentOrderItems.length > 0 && onClearBill && (
            <button
              onClick={() => {
                if (soundEnabled) posSound.playClick();
                if (window.confirm('Are you sure you want to cancel and clear all items from current bill?')) {
                  onClearBill();
                }
              }}
              className="flex items-center gap-1 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-md transition-all shrink-0 cursor-pointer active:scale-95 border border-rose-400"
              title="Clear all items from bill"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}

          <button
            onClick={onOpenAddItemModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 rounded-xl text-xs font-black shadow-md transition-all shrink-0 cursor-pointer active:scale-95 ring-1 ring-amber-300"
            title="Add New Custom Item to Menu"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>+ Item</span>
          </button>
        </div>

        {/* Category Filter Chips & View Mode Toggle */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-amber-500 text-stone-950 shadow-md ring-1 ring-amber-300'
                      : 'bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700 hover:text-white'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle: 4-Portion Grid vs List */}
          <div className="flex items-center bg-stone-900 p-0.5 rounded-xl border border-stone-700 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="4-Portion Grid View (Medium Size)"
            >
              <LayoutGrid className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">4-Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('line')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                viewMode === 'line'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Food Items Container: Responsive 4-Column Medium Grid */}
      <div className="flex-1 overflow-y-visible lg:overflow-y-auto p-3 sm:p-4 bg-stone-950/60 pb-16 lg:pb-4">
        {filteredCards.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="font-black text-stone-200 text-base">No matching food items found.</p>
            <p className="text-xs text-stone-500 mt-1">Try searching again or click '+ Item' above.</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* 4-PORTION / 4-COLUMN MEDIUM SIZED GRID CARDS */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredCards.map((card) => {
              const inBillCount = getCardCountInBill(card);

              return (
                <div
                  key={card.cardId}
                  className={`border-2 rounded-2xl overflow-hidden shadow-md transition-all flex flex-col justify-between group relative ${
                    inBillCount > 0
                      ? 'bg-gradient-to-b from-stone-900 via-amber-950/30 to-stone-900 border-amber-400 ring-2 ring-amber-400/40 shadow-amber-500/20'
                      : card.isOutOfStock
                      ? 'bg-rose-950/20 border-rose-600/70 ring-1 ring-rose-500/30'
                      : card.isLowStock
                      ? 'bg-amber-950/20 border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-amber-950/30'
                      : card.isBiryani
                      ? 'bg-stone-900 border-amber-500/50 hover:border-amber-400'
                      : 'bg-stone-900 border-stone-800 hover:border-stone-600'
                  }`}
                >
                  {/* Item Image & Price Badge Header */}
                  <div className="relative h-24 sm:h-28 w-full bg-stone-950 overflow-hidden border-b border-stone-800">
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.nameEn}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-stone-900 text-amber-400 p-2">
                        {card.isBiryani ? (
                          <ZcbLogo className="w-16 h-16" imageUrl={shop.logoUrl} />
                        ) : card.category === 'drinks' ? (
                          <CupSoda className="w-12 h-12 opacity-75 text-cyan-400" />
                        ) : card.category === 'kababs' ? (
                          <Beef className="w-12 h-12 opacity-75 text-amber-500" />
                        ) : (
                          <Utensils className="w-12 h-12 opacity-75 text-amber-400" />
                        )}
                      </div>
                    )}

                    {/* Low Stock / Out of Stock Top Warning Banner */}
                    {card.isOutOfStock ? (
                      <div className="absolute top-1.5 left-1.5 bg-rose-600/95 text-white px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight shadow-md flex items-center gap-1 border border-rose-400 backdrop-blur-xs">
                        <AlertTriangle className="w-3 h-3 stroke-[3]" />
                        <span>Out of Stock</span>
                      </div>
                    ) : card.isLowStock ? (
                      <div className="absolute top-1.5 left-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 px-2 py-0.5 rounded-lg text-[10px] font-black tracking-tight shadow-md flex items-center gap-1 border border-amber-300 backdrop-blur-xs animate-pulse">
                        <AlertTriangle className="w-3 h-3 stroke-[3] text-stone-950" />
                        <span>Low Stock: {card.stockQuantity}</span>
                      </div>
                    ) : card.trackInventory ? (
                      <div className="absolute top-1.5 left-1.5 bg-stone-900/90 text-stone-300 px-1.5 py-0.5 rounded-md text-[9px] font-bold shadow-xs flex items-center gap-1 border border-stone-700">
                        <Package className="w-2.5 h-2.5 text-stone-400" />
                        <span>{card.stockQuantity} left</span>
                      </div>
                    ) : null}

                    {card.popular && (
                      <div className="absolute top-1.5 right-1.5 bg-red-600 text-white px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wide shadow-sm flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5 stroke-[2.5]" />
                        <span>Hot</span>
                      </div>
                    )}

                    {/* Price Badge on Image */}
                    <div className="absolute bottom-1.5 right-1.5 bg-stone-950/95 text-amber-300 px-2 py-0.5 rounded-lg text-xs sm:text-sm font-black border border-amber-500/50 backdrop-blur-xs font-mono shadow-sm">
                      {formatPrice(card.price, shop.currencySymbol)}
                    </div>
                  </div>

                  {/* Medium Card Body */}
                  <div className="p-2 sm:p-2.5 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-amber-300 transition-colors leading-tight line-clamp-1">
                        {card.nameEn}
                      </h4>

                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {card.portionBadge && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-md text-[10px] font-black border border-amber-500/30 truncate max-w-full">
                            {card.portionBadge}
                          </span>
                        )}
                        {card.isLowStock && (
                          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[9px] font-black border border-amber-500/40">
                            ⚠️ {card.stockQuantity} left
                          </span>
                        )}
                        {inBillCount > 0 && (
                          <span className="px-1.5 py-0.2 bg-amber-400 text-stone-950 rounded font-black text-[10px]">
                            ✓ {inBillCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="pt-1.5 border-t border-stone-800/80">
                      {inBillCount === 0 ? (
                        <button
                          type="button"
                          onClick={(e) => handleAddCard(card, e)}
                          className={`w-full py-1.5 active:scale-95 font-black rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm ${
                            card.isOutOfStock
                              ? 'bg-stone-800 text-stone-400 hover:bg-stone-700 border border-stone-700'
                              : card.isLowStock
                              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 ring-1 ring-amber-300'
                              : 'bg-amber-500 hover:bg-amber-400 text-stone-950 ring-1 ring-amber-300'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>{card.isOutOfStock ? 'Add Anyway' : 'Add'}</span>
                        </button>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleDecreaseCard(card, e)}
                              className="flex-1 py-1 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded-lg text-xs font-black border border-amber-500/40 cursor-pointer active:scale-95 flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3 stroke-[3]" />
                            </button>
                            <div className="px-2 py-0.5 bg-amber-400 text-stone-950 rounded-lg font-black font-mono text-xs text-center min-w-[28px]">
                              {inBillCount}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleAddCard(card, e)}
                              className="flex-1 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-black cursor-pointer active:scale-95 flex items-center justify-center shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleCancelCard(card, e)}
                            className="w-full py-0.5 text-[10px] text-stone-400 hover:text-rose-400 font-bold transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="flex flex-col gap-2.5">
            {filteredCards.map((card) => {
              const inBillCount = getCardCountInBill(card);

              return (
                <div
                  key={card.cardId}
                  className={`rounded-2xl p-3 border-2 transition-all relative flex items-center justify-between gap-3 shadow-md ${
                    inBillCount > 0
                      ? 'bg-gradient-to-r from-stone-900 via-amber-950/30 to-stone-900 border-amber-400 ring-1 ring-amber-400/40'
                      : card.isOutOfStock
                      ? 'bg-rose-950/20 border-rose-600/70 ring-1 ring-rose-500/30'
                      : card.isLowStock
                      ? 'bg-amber-950/20 border-amber-500 ring-1 ring-amber-500/30'
                      : card.isBiryani
                      ? 'bg-stone-900 border-amber-500/50 hover:border-amber-400'
                      : 'bg-stone-900 border-stone-800 hover:border-stone-600'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-stone-800 bg-stone-950 flex items-center justify-center relative">
                      {card.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt={card.nameEn}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ZcbLogo className="w-10 h-10" imageUrl={shop.logoUrl} />
                      )}
                      {card.isLowStock && (
                        <div className="absolute bottom-0 inset-x-0 bg-amber-500 text-stone-950 text-[8px] font-black text-center py-0.2">
                          LOW STOCK
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white truncate">
                          {card.nameEn}
                        </h4>
                        {card.isLowStock && (
                          <span className="px-1.5 py-0.2 bg-amber-500 text-stone-950 font-black text-[9px] rounded uppercase animate-pulse">
                            ⚠️ Low Stock ({card.stockQuantity})
                          </span>
                        )}
                        {card.isOutOfStock && (
                          <span className="px-1.5 py-0.2 bg-rose-600 text-white font-black text-[9px] rounded uppercase">
                            Out of Stock
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {card.portionBadge && (
                          <span className="px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                            {card.portionBadge}
                          </span>
                        )}
                        <span className="font-mono font-black text-amber-300 text-xs">
                          {formatPrice(card.price, shop.currencySymbol)}
                        </span>
                        {card.trackInventory && !card.isLowStock && !card.isOutOfStock && (
                          <span className="text-[10px] text-stone-400 flex items-center gap-0.5 ml-1">
                            <Package className="w-2.5 h-2.5" />
                            <span>{card.stockQuantity} in stock</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {inBillCount === 0 ? (
                      <button
                        type="button"
                        onClick={(e) => handleAddCard(card, e)}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-amber-500/40">
                        <button
                          type="button"
                          onClick={(e) => handleDecreaseCard(card, e)}
                          className="w-6 h-6 rounded-lg bg-stone-800 text-amber-400 flex items-center justify-center font-black cursor-pointer"
                        >
                          <Minus className="w-3 h-3 stroke-[3]" />
                        </button>
                        <span className="px-2 font-mono font-black text-amber-300 text-xs">
                          {inBillCount}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleAddCard(card, e)}
                          className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-black cursor-pointer"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
