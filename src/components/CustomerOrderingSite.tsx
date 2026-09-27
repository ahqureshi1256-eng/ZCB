import React, { useState } from 'react';
import { MenuItem, OrderItem, Order, ShopSettings, MenuItemPortion } from '../types';
import { formatPrice } from '../utils/billing';
import { ZcbLogo } from './ZcbLogo';
import {
  Bike,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  X,
  XCircle,
  ExternalLink,
  Share2,
  CupSoda,
  Beef,
  Utensils,
  Crown,
  User,
} from 'lucide-react';
import { getPublicCustomerUrl } from '../utils/urlHelper';
import { AuthUser } from '../types';

interface CustomerOrderingSiteProps {
  shop: ShopSettings;
  menuItems: MenuItem[];
  onPlaceOrder: (orderData: Partial<Order>) => void;
  onSwitchToPOS?: () => void;
  isOwner?: boolean;
  currentUser?: AuthUser | null;
  onOpenLogin?: () => void;
}

export const CustomerOrderingSite: React.FC<CustomerOrderingSiteProps> = ({
  shop,
  menuItems,
  onPlaceOrder,
  onSwitchToPOS,
  isOwner = false,
  currentUser = null,
  onOpenLogin,
}) => {
  // Delivery Mode: 'delivery' (Bike) vs 'takeaway' (Pickup)
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'takeaway'>('delivery');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Selected portions per item map: { [itemId]: portionId }
  const [selectedPortions, setSelectedPortions] = useState<{ [itemId: string]: string }>({
    'biryani-chicken': 'cb-1kg',
    'biryani-sada': 'sb-1kg',
  });

  // Cart Items
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Customer Checkout Form (Only 3 essential fields: Name, Phone, Address/Location)
  const [customerName, setCustomerName] = useState<string>(() => {
    return localStorage.getItem('zcb_cust_name') || '';
  });
  const [customerPhone, setCustomerPhone] = useState<string>(() => {
    return localStorage.getItem('zcb_cust_phone') || '';
  });
  const [deliveryAddress, setDeliveryAddress] = useState<string>(() => {
    return localStorage.getItem('zcb_cust_addr') || '';
  });
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online'>('cash');
  const [formError, setFormError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);

  // Order Confirmed State
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Bike delivery fee configured from shop settings
  const baseDeliveryFee = shop.defaultDeliveryFee ?? 100;
  const bikeDeliveryFee = deliveryMode === 'delivery' ? baseDeliveryFee : 0;
  const itemsSubtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const netTotal = itemsSubtotal + bikeDeliveryFee;

  // Categories
  const categories = [
    { id: 'all', label: 'All Menu' },
    { id: 'biryani', label: '🍗 Chicken Biryani (250g, 500g, 1 KG)' },
    { id: 'kababs', label: '🍢 Shami Kababs' },
    { id: 'sides', label: '🥣 Raita & Salad' },
    { id: 'drinks', label: '🥤 Cold Drinks' },
  ];

  // Flatten items into distinct individual boxes for every portion
  interface WebDisplayCard {
    cardId: string;
    parentItem: MenuItem;
    portionId?: string;
    nameEn: string;
    nameUr: string;
    portionBadge?: string;
    price: number;
    category: string;
    imageUrl?: string;
    isBiryani: boolean;
    popular?: boolean;
    description: string;
  }

  const allDisplayCards = React.useMemo(() => {
    const cards: WebDisplayCard[] = [];

    menuItems.forEach((item) => {
      if (item.portions && item.portions.length > 0) {
        item.portions.forEach((portion) => {
          const portionLabel = portion.labelEn || portion.labelUr || '';
          cards.push({
            cardId: `${item.id}-${portion.id}`,
            parentItem: item,
            portionId: portion.id,
            nameEn: `${item.nameEn || item.nameUr} - ${portionLabel}`,
            nameUr: `${item.nameUr || item.nameEn} (${portion.labelUr || portionLabel})`,
            portionBadge: portion.weightOrQty || portionLabel,
            price: portion.price,
            category: item.category,
            imageUrl: item.imageUrl,
            isBiryani: item.category === 'biryani',
            popular: item.popular,
            description: item.category === 'biryani'
              ? 'Fresh aromatic degi recipe with rich spices, tender chicken pieces and flavorful basmati rice.'
              : item.category === 'drinks'
              ? 'Ice-chilled refreshing cold beverage.'
              : 'Freshly prepared side dish to accompany your hot biryani.',
          });
        });
      } else {
        cards.push({
          cardId: item.id,
          parentItem: item,
          portionId: undefined,
          nameEn: item.nameEn || item.nameUr,
          nameUr: item.nameUr || item.nameEn,
          portionBadge: undefined,
          price: item.defaultPrice || 0,
          category: item.category,
          imageUrl: item.imageUrl,
          isBiryani: item.category === 'biryani',
          popular: item.popular,
          description: item.category === 'sides'
            ? 'Fresh creamy zeera raita / crisp green salad prepared daily.'
            : item.category === 'kababs'
            ? 'Crispy fried shami kabab packed with tender seasoned chicken and daal.'
            : 'Food prepared fresh on order.',
        });
      }
    });

    return cards;
  }, [menuItems]);

  const filteredCards = React.useMemo(() => {
    return allDisplayCards.filter((card) => {
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'sides') return card.category === 'sides' || card.category === 'other';
      return card.category === selectedCategory;
    });
  }, [allDisplayCards, selectedCategory]);

  // Helper to match cart item with web display card
  const isMatchingCartCard = (item: OrderItem, card: WebDisplayCard) => {
    if (item.menuItemId !== card.parentItem.id) return false;
    const portionLabel = card.portionBadge || '';
    if (portionLabel) {
      return (
        item.portionLabelEn === portionLabel ||
        item.portionLabelUr === portionLabel ||
        item.portionLabel === portionLabel
      );
    }
    return !item.portionLabel && !item.portionLabelEn && !item.portionLabelUr;
  };

  // Add item card directly to cart (Plus +)
  const handleAddToCartCard = (card: WebDisplayCard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const portionLabel = card.portionBadge || '';
    const existingIdx = cart.findIndex((c) => isMatchingCartCard(c, card));

    if (existingIdx >= 0) {
      const updated = [...cart];
      updated[existingIdx].quantity += 1;
      updated[existingIdx].total = updated[existingIdx].quantity * updated[existingIdx].unitPrice;
      setCart(updated);
    } else {
      const newItem: OrderItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        menuItemId: card.parentItem.id,
        portionId: card.portionId,
        nameUr: card.nameUr || card.parentItem.nameUr,
        nameEn: card.nameEn,
        portionLabelEn: portionLabel || undefined,
        portionLabelUr: card.parentItem.portions?.find(p => p.id === card.portionId)?.labelUr || undefined,
        portionLabel: portionLabel || undefined,
        unitPrice: card.price,
        quantity: 1,
        total: card.price,
      };
      setCart([...cart, newItem]);
    }
  };

  // Decrease item card quantity directly from card (Minus -)
  const handleDecreaseCartCard = (card: WebDisplayCard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const existingIdx = cart.findIndex((c) => isMatchingCartCard(c, card));
    if (existingIdx >= 0) {
      if (cart[existingIdx].quantity > 1) {
        handleUpdateQty(existingIdx, cart[existingIdx].quantity - 1);
      } else {
        setCart(cart.filter((_, i) => i !== existingIdx));
      }
    }
  };

  // Cancel item card completely from cart (Remove button)
  const handleCancelCartCard = (card: WebDisplayCard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCart(cart.filter((c) => !isMatchingCartCard(c, card)));
  };

  // Clear entire cart (Reset)
  const handleClearCart = () => {
    setCart([]);
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setCart(cart.filter((_, i) => i !== index));
    } else {
      const updated = [...cart];
      updated[index].quantity = newQty;
      updated[index].total = newQty * updated[index].unitPrice;
      setCart(updated);
    }
  };

  // Checkout and place order -> Triggers bell in POS!
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!customerName.trim()) {
      setFormError('Please enter your name.');
      return;
    }
    if (!customerPhone.trim()) {
      setFormError('Please enter your mobile phone number.');
      return;
    }
    if (deliveryMode === 'delivery' && !deliveryAddress.trim()) {
      setFormError('Please enter your delivery address / location.');
      return;
    }

    setFormError(null);
    try {
      localStorage.setItem('zcb_cust_name', customerName.trim());
      localStorage.setItem('zcb_cust_phone', customerPhone.trim());
      if (deliveryAddress.trim()) {
        localStorage.setItem('zcb_cust_addr', deliveryAddress.trim());
      }
    } catch (e) {}

    const tokenNum = Math.floor(Math.random() * 800) + 100;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newOrderData: Partial<Order> = {
      id: `online-${Date.now()}`,
      billNumber: `WEB-${Math.floor(1000 + Math.random() * 9000)}`,
      tokenNumber: tokenNum,
      dateStr,
      timeStr,
      orderType: deliveryMode,
      orderSource: 'online_website',
      orderStatus: 'pending',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryMode === 'delivery' ? deliveryAddress.trim() : undefined,
      deliveryFee: bikeDeliveryFee,
      riderName: deliveryMode === 'delivery' ? 'ZCB Bike Rider' : undefined,
      items: cart,
      subtotal: itemsSubtotal,
      discountAmount: 0,
      totalAmount: netTotal,
      paymentMode: paymentMode === 'cash' ? 'cash' : 'online',
      createdAt: Date.now(),
    };

    onPlaceOrder(newOrderData);
    setConfirmedOrder(newOrderData as Order);
    setIsCartOpen(false);
    setCart([]);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans flex flex-col selection:bg-amber-500 selection:text-stone-950">
      {/* Top Banner with Bike Delivery Hotline */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-stone-950 py-2 px-3 text-center text-xs font-black tracking-wide shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2 mx-auto">
          <Bike className="w-4 h-4 animate-bounce" />
          <span>FAST BIKE HOME DELIVERY IN 25-35 MINS • FRESH DEGI CHICKEN BIRYANI</span>
          <span className="hidden sm:inline opacity-75">• Tel: {shop.phone}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isOwner && onSwitchToPOS && (
            <button
              onClick={onSwitchToPOS}
              className="text-[11px] bg-stone-950 text-amber-300 px-3 py-1 rounded-full font-black hover:bg-stone-900 transition-colors shrink-0 cursor-pointer flex items-center gap-1 border border-amber-400 shadow-sm"
              title="Open Merchant POS Terminal"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>👑 Open POS Terminal</span>
            </button>
          )}

          {onOpenLogin && (
            <button
              onClick={onOpenLogin}
              className="text-[11px] bg-stone-950/80 hover:bg-stone-900 text-stone-200 hover:text-white px-2.5 py-1 rounded-full font-bold transition-colors shrink-0 cursor-pointer border border-stone-800"
              title="Account / Login"
            >
              {currentUser ? (
                isOwner ? (
                  <span className="text-amber-300 font-bold flex items-center gap-1">
                    👑 Owner
                  </span>
                ) : (
                  <span className="text-stone-300 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{currentUser.displayName || 'Customer'}</span>
                  </span>
                )
              ) : (
                <span className="text-stone-300 hover:text-amber-300">🔑 Sign In</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Website Branded Header */}
      <header className="bg-stone-900 border-b border-stone-800 sticky top-0 z-30 shadow-xl backdrop-blur-md bg-stone-900/95">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3.5">
            <div className="relative group shrink-0">
              <ZcbLogo className="w-16 h-16 sm:w-20 sm:h-20 shadow-xl flex-shrink-0 border-2 border-amber-400 rounded-full ring-2 ring-amber-400/40" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  {shop.shortName || 'ZCB'} - {shop.shopNameEn || 'Zaiqa Chicken Biryani'}
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Online
                </span>
              </div>
              <p className="text-xs text-amber-400 font-semibold tracking-wide mt-0.5">
                {shop.taglineEn || 'Food Prepared Fresh on Order • A.R FOODS ZAIQA'}
              </p>
              <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{shop.address}</span>
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <a
              href="tel:03337018183"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold border border-stone-700 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>Call Us</span>
            </a>

            {/* Share Website Button */}
            <button
              onClick={() => {
                const publicUrl = getPublicCustomerUrl() || window.location.href;
                if (navigator.share) {
                  navigator.share({
                    title: `${shop.shortName || 'ZCB'} - Online Order`,
                    text: `Order fresh chicken biryani online from ${shop.shopNameEn || 'ZCB'}!`,
                    url: publicUrl,
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(publicUrl);
                  alert('Public ordering link copied to clipboard!');
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold border border-stone-700 transition-colors cursor-pointer"
              title="Share restaurant menu with friends"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 sm:px-4 sm:py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer ring-1 ring-amber-300"
            >
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">View Cart</span>
              {cart.length > 0 && (
                <span className="px-1.5 py-0.2 bg-stone-950 text-amber-300 rounded-full font-mono font-black text-xs">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Compact Tasteful Biryani Hero Banner */}
      {shop.bannerUrl && (
        <div className="relative w-full h-28 sm:h-36 md:h-40 overflow-hidden border-b-2 border-amber-500/40 select-none bg-black">
          <img
            src={shop.bannerUrl}
            alt="ZCB Zaiqa Chicken Biryani Banner"
            className="w-full h-full object-cover object-center filter brightness-95 contrast-105"
          />
          {/* Subtle Dark Vignette & Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-transparent to-stone-950/90" />

          {/* Banner Floating Overlay Badges */}
          <div className="absolute inset-0 flex items-center justify-between px-4 sm:px-8 pointer-events-none">
            <div className="flex items-center gap-3 sm:gap-5">
              <ZcbLogo
                className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 border-3 border-amber-400 shadow-2xl rounded-full bg-stone-950 ring-2 ring-amber-400/50 shrink-0"
                imageUrl={shop.logoUrl}
              />
              <div className="drop-shadow-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-amber-500 text-stone-950 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-lg tracking-wider uppercase shadow-md">
                    {shop.shortName || 'ZCB'} OFFICIAL
                  </span>
                  <span className="hidden sm:inline-block bg-emerald-600 text-white text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-lg border border-emerald-400/50 shadow-md tracking-wider">
                    🛵 25-35 MINS DOORSTEP BIKE DELIVERY
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-amber-100 tracking-wide mt-1 uppercase drop-shadow-lg">
                  {shop.shopNameEn || 'Zaiqa Chicken Biryani'}
                </h1>
                <p className="text-xs sm:text-sm font-bold text-amber-300 tracking-wider mt-0.5">
                  {shop.taglineEn || 'Food Prepared Fresh on Order'} • Order Online or Call: {shop.phone}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Order Confirmed Screen (If Placed) */}
        {confirmedOrder && (
          <div className="bg-stone-900 border-2 border-emerald-500 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/50 animate-bounce">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">
                ORDER RECEIVED & KITCHEN BELL ALERTED! 🔔
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Thank You, {confirmedOrder.customerName}!
              </h2>
              <p className="text-sm text-stone-300 max-w-md mx-auto">
                Your order is confirmed with <strong>Token #{confirmedOrder.tokenNumber}</strong>. The kitchen order bell has rung, our chef is packing fresh hot biryani, and our bike rider will dispatch shortly!
              </p>
            </div>

            {/* Live Progress Tracker */}
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 max-w-lg mx-auto">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="space-y-1 text-emerald-400 font-bold">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-stone-950 flex items-center justify-center mx-auto font-black">
                    ✓
                  </div>
                  <span>Bell Rung 🔔</span>
                </div>
                <div className="space-y-1 text-amber-400 font-bold">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center mx-auto font-black animate-pulse">
                    2
                  </div>
                  <span>Cooking 🍗</span>
                </div>
                <div className="space-y-1 text-stone-400">
                  <div className="w-8 h-8 rounded-full bg-stone-800 text-stone-300 flex items-center justify-center mx-auto font-bold">
                    3
                  </div>
                  <span>On Bike 🛵</span>
                </div>
                <div className="space-y-1 text-stone-400">
                  <div className="w-8 h-8 rounded-full bg-stone-800 text-stone-300 flex items-center justify-center mx-auto font-bold">
                    4
                  </div>
                  <span>Delivered 🏠</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button
                onClick={() => setConfirmedOrder(null)}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm rounded-xl cursor-pointer"
              >
                Place Another Order
              </button>
            </div>
          </div>
        )}

        {/* Delivery Mode Banner Card */}
        <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 p-4 sm:p-5 rounded-3xl border border-stone-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Bike className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                How would you like to receive your food?
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Select Bike Home Delivery for fast doorstep arrival, or Self Takeaway from the shop counter.
              </p>
            </div>
          </div>

          {/* Toggle Buttons */}
          <div className="flex p-1 bg-stone-950 rounded-2xl border border-stone-800 shadow-inner w-full md:w-auto">
            <button
              onClick={() => setDeliveryMode('delivery')}
              className={`flex-1 md:flex-initial py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                deliveryMode === 'delivery'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-md ring-1 ring-amber-400'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>🛵 Bike Home Delivery (25-35 Mins)</span>
            </button>
            <button
              onClick={() => setDeliveryMode('takeaway')}
              className={`flex-1 md:flex-initial py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                deliveryMode === 'takeaway'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-md ring-1 ring-amber-400'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>🛍️ Self Pickup / Takeaway</span>
            </button>
          </div>
        </div>

        {/* Category Filters with Larger Tabs */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl text-sm font-black whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/25 ring-2 ring-amber-300'
                  : 'bg-stone-900 text-stone-300 border border-stone-800 hover:bg-stone-800 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Food Menu Grid - Clean Cards with Large Text */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCards.map((card) => {
            const inCartItem = cart.find((c) => isMatchingCartCard(c, card));
            const cartQty = inCartItem ? inCartItem.quantity : 0;

            return (
              <div
                key={card.cardId}
                className={`border-2 rounded-3xl overflow-hidden shadow-xl transition-all flex flex-col justify-between group ${
                  cartQty > 0
                    ? 'bg-amber-950/20 border-amber-400 shadow-amber-500/15'
                    : 'bg-stone-900 border-stone-800 hover:border-amber-500/60 hover:shadow-2xl'
                }`}
              >
                {/* Item Image */}
                <div className="relative h-48 w-full bg-stone-950 overflow-hidden">
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.nameEn}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-stone-900 text-amber-400">
                      {card.category === 'drinks' ? (
                        <CupSoda className="w-16 h-16 opacity-60" />
                      ) : card.category === 'kababs' ? (
                        <Beef className="w-16 h-16 opacity-60" />
                      ) : (
                        <Utensils className="w-16 h-16 opacity-60" />
                      )}
                    </div>
                  )}

                  {card.popular && (
                    <div className="absolute top-3 left-3 bg-amber-500 text-stone-950 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide shadow-md flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Bestseller</span>
                    </div>
                  )}

                  {/* Big Price Badge on Image */}
                  <div className="absolute bottom-3 right-3 bg-stone-950/95 text-amber-300 px-3.5 py-1.5 rounded-2xl text-lg font-black border border-amber-500/40 backdrop-blur-md shadow-lg font-mono">
                    {formatPrice(card.price, shop.currencySymbol)}
                  </div>
                </div>

                {/* Item Details with Large Text */}
                <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-lg sm:text-xl font-black text-white group-hover:text-amber-300 transition-colors leading-tight">
                        {card.nameEn}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {card.portionBadge && (
                        <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-xl text-xs font-black border border-amber-500/30">
                          📦 {card.portionBadge}
                        </span>
                      )}
                      {cartQty > 0 && (
                        <span className="px-2 py-0.5 bg-amber-400 text-stone-950 rounded-full text-xs font-black shadow-xs">
                          ✓ In Basket: {cartQty}
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-stone-400 mt-2 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  {/* Inside Box Action Controls */}
                  <div className="pt-2 border-t border-stone-800/80">
                    {cartQty === 0 ? (
                      /* If 0 in basket: Big Add to Cart Button */
                      <button
                        type="button"
                        onClick={(e) => handleAddToCartCard(card, e)}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 text-stone-950 font-black text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2 border border-amber-400 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] cursor-pointer ring-1 ring-amber-300"
                        title="Add to basket"
                      >
                        <Plus className="w-5 h-5 stroke-[3]" />
                        <span>+ Add to Cart</span>
                        <span className="font-mono text-stone-900">({formatPrice(card.price, shop.currencySymbol)})</span>
                      </button>
                    ) : (
                      /* When added: Plus, Minus, Counter, Delete, and Cancel Controls inside the card */
                      <div className="space-y-2 bg-stone-950/80 p-2.5 rounded-2xl border border-amber-500/40">
                        {/* Subtotal calculation for this item */}
                        <div className="flex items-center justify-between text-xs px-1">
                          <span className="text-stone-400 font-bold">Item Total:</span>
                          <span className="text-amber-400 font-mono font-black text-sm">
                            {cartQty} x {formatPrice(card.price, shop.currencySymbol)} = {formatPrice(card.price * cartQty, shop.currencySymbol)}
                          </span>
                        </div>

                        {/* Interactive Action Buttons Row */}
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          {/* Minus Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDecreaseCartCard(card, e)}
                            className="flex-1 min-w-[70px] py-2 px-2 bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-amber-400 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 border-2 border-amber-500/40 shadow-xs"
                            title="Decrease quantity by 1"
                          >
                            <Minus className="w-4 h-4 stroke-[3]" />
                            <span>Minus (-)</span>
                          </button>

                          {/* Numeric Counter Box */}
                          <div
                            className="flex flex-col items-center justify-center min-w-[50px] px-2.5 py-1 bg-amber-400 text-stone-950 rounded-xl font-black shadow-md ring-2 ring-amber-300 select-none"
                            title={`${cartQty} in cart`}
                          >
                            <span className="text-base sm:text-lg font-mono leading-none font-black text-stone-950">
                              {cartQty}
                            </span>
                            <span className="text-[8px] uppercase font-black text-stone-900">
                              Qty
                            </span>
                          </div>

                          {/* Plus Button */}
                          <button
                            type="button"
                            onClick={(e) => handleAddToCartCard(card, e)}
                            className="flex-1 min-w-[70px] py-2 px-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-300 text-stone-950 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-md ring-2 ring-amber-300"
                            title="Increase quantity by 1"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>Plus (+)</span>
                          </button>
                        </div>

                        {/* Secondary Delete & Cancel Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => handleCancelCartCard(card, e)}
                            className="flex-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 border border-rose-400 shadow-xs"
                            title="Delete from basket"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                            <span>Remove</span>
                          </button>

                          {/* Cancel Button */}
                          <button
                            type="button"
                            onClick={(e) => handleCancelCartCard(card, e)}
                            className="flex-1 py-1.5 px-2 bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 border border-stone-700 shadow-xs"
                            title="Cancel item"
                          >
                            <XCircle className="w-3.5 h-3.5 text-stone-400" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating Bottom Cart Bar for Mobile & Desktop */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-xl mx-auto animate-in slide-in-from-bottom-5">
          <div
            onClick={() => setIsCartOpen(true)}
            className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-stone-950 p-3.5 sm:p-4 rounded-2xl shadow-2xl flex items-center justify-between cursor-pointer ring-2 ring-amber-300 font-bold"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-stone-950 text-amber-300 flex items-center justify-center font-mono font-black text-base shadow-sm">
                {cart.reduce((sum, it) => sum + it.quantity, 0)}
              </div>
              <div>
                <div className="text-[11px] font-black tracking-wide text-stone-950 flex items-center gap-1">
                  <span>{deliveryMode === 'delivery' ? '🛵 Bike Home Delivery' : '🛍️ Self Pickup'}</span>
                  <span className="text-[10px] bg-stone-950/20 px-1.5 py-0.5 rounded font-mono">
                    Food: {formatPrice(itemsSubtotal, shop.currencySymbol)} {deliveryMode === 'delivery' ? `+ Delivery ${formatPrice(baseDeliveryFee, shop.currencySymbol)}` : '(Free Delivery)'}
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-stone-950 leading-tight">
                  Total: {formatPrice(netTotal, shop.currencySymbol)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-black uppercase bg-stone-950 text-amber-300 px-3 py-2 rounded-xl shadow-xs active:scale-95 transition-transform">
              <span>View Basket</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Cart & Checkout Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-stone-900 border-l border-stone-800 text-white h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-black text-white">Your Food Basket</h3>
                <span className="text-xs text-stone-400 font-mono">
                  ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all items from your basket?')) {
                        handleClearCart();
                      }
                    }}
                    className="px-2 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Clear entire basket"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                )}
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Delivery Mode Banner & Instant Toggle in Drawer */}
              <div className="p-2.5 bg-stone-950 rounded-2xl border border-stone-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-bold">Select Delivery Mode:</span>
                  <span className="text-amber-400 font-bold">
                    {deliveryMode === 'delivery' ? `Bike Fee: ${formatPrice(baseDeliveryFee, shop.currencySymbol)}` : 'Free (Rs. 0)'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-900 rounded-xl border border-stone-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('delivery')}
                    className={`py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      deliveryMode === 'delivery'
                        ? 'bg-amber-500 text-stone-950 shadow-xs'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>🛵 Bike Delivery (+{formatPrice(baseDeliveryFee, shop.currencySymbol)})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('takeaway')}
                    className={`py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      deliveryMode === 'takeaway'
                        ? 'bg-amber-500 text-stone-950 shadow-xs'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>🛍️ Counter Pickup (Rs.0)</span>
                  </button>
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 text-stone-500 space-y-2">
                  <ShoppingBag className="w-12 h-12 mx-auto text-stone-600 animate-pulse" />
                  <p className="font-bold text-stone-400">Your basket is empty</p>
                  <p className="text-xs text-stone-600">Add Chicken Biryani or drinks to place an order.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-white truncate">{item.nameEn}</div>
                        <div className="text-[11px] text-stone-400 flex items-center gap-1.5 mt-0.5">
                          {item.portionLabel && (
                            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-bold text-[10px] border border-amber-500/30">
                              {item.portionLabel}
                            </span>
                          )}
                          <span>@{shop.currencySymbol}{item.unitPrice}</span>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-700">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(index, item.quantity - 1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-amber-400 hover:bg-stone-800 cursor-pointer font-black"
                          title="Decrease"
                        >
                          <Minus className="w-3 h-3 stroke-[3]" />
                        </button>
                        <span className="min-w-[24px] text-center font-mono font-black text-xs text-amber-300">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(index, item.quantity + 1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-950 bg-amber-500 hover:bg-amber-400 cursor-pointer font-black"
                          title="Increase"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                        </button>
                      </div>

                      <div className="text-right min-w-[70px] flex flex-col items-end gap-1">
                        <span className="font-black text-amber-300 text-sm font-mono">
                          {formatPrice(item.total, shop.currencySymbol)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(index, 0)}
                          className="text-stone-400 hover:text-rose-400 text-[10px] flex items-center gap-0.5 font-bold cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-2.5 h-2.5 text-rose-400" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Customer Contact & Delivery Form - 3 Simple Fields Only */}
              {cart.length > 0 && (
                <form id="orderForm" onSubmit={handleSubmitOrder} className="space-y-3 pt-2 bg-stone-950 p-3 rounded-2xl border border-stone-800">
                  <div className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-stone-800 pb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-400" />
                      <span>Customer Details (3 Fields)</span>
                    </div>
                    <span className="text-[10px] text-amber-300/80 font-normal">Fast & Easy</span>
                  </div>

                  {formError && (
                    <div className="p-2.5 bg-rose-950/80 border border-rose-500/60 rounded-xl text-xs text-rose-200 font-bold flex items-center gap-2 animate-shake">
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* 1. Name */}
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">
                      1. Customer Name (Aap Ka Naam) <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tariq Mehmood"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-700 text-white rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400 placeholder:text-stone-500"
                    />
                  </div>

                  {/* 2. Mobile Phone */}
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">
                      2. Mobile Number (Phone Number) <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0333-1234567"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-700 text-amber-300 rounded-xl text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400 placeholder:text-stone-500"
                    />
                  </div>

                  {/* 3. Delivery Address / Location */}
                  {deliveryMode === 'delivery' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-stone-300 block">
                          3. Delivery Address & Location <span className="text-amber-400">*</span>
                        </label>
                      </div>

                      {/* 1-Tap Google GPS Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.geolocation) {
                            setGpsLoading(true);
                            navigator.geolocation.getCurrentPosition(
                              (pos) => {
                                const gpsLoc = `GPS Pin: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
                                setDeliveryAddress(gpsLoc);
                                setGpsLoading(false);
                                if (formError) setFormError(null);
                              },
                              () => {
                                setDeliveryAddress('City Area, Main Road');
                                setGpsLoading(false);
                              }
                            );
                          }
                        }}
                        className="w-full mb-2 py-1.5 px-2.5 bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-500/50 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 shadow-xs"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{gpsLoading ? 'Fetching Location...' : '📍 1-Click GPS Location Pin'}</span>
                      </button>

                      <input
                        type="text"
                        required
                        placeholder="House / Shop #, Street, Area Name"
                        value={deliveryAddress}
                        onChange={(e) => {
                          setDeliveryAddress(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        className="w-full px-3.5 py-2.5 bg-stone-900 border border-amber-500/50 text-white rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400 placeholder:text-stone-500"
                      />
                    </div>
                  )}

                  {/* Payment Method Badge */}
                  <div className="pt-1 flex items-center justify-between text-xs bg-stone-900/60 p-2 rounded-xl border border-stone-800">
                    <span className="text-stone-400 font-bold">Payment Method:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      💵 Cash on Delivery (COD)
                    </span>
                  </div>
                </form>
              )}
            </div>

            {/* Drawer Footer & Final Checkout Actions */}
            {cart.length > 0 && (
              <div className="p-4 bg-stone-950 border-t border-stone-800 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-stone-400">
                    <span>Items Subtotal:</span>
                    <span className="font-mono">{formatPrice(itemsSubtotal, shop.currencySymbol)}</span>
                  </div>
                  {deliveryMode === 'delivery' && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>🛵 Bike Delivery Fee:</span>
                      <span className="font-mono">+ {formatPrice(bikeDeliveryFee, shop.currencySymbol)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-lg font-black text-amber-400 pt-1 border-t border-stone-800">
                    <span>NET TOTAL:</span>
                    <span className="font-mono text-xl">{formatPrice(netTotal, shop.currencySymbol)}</span>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="space-y-2 pt-1">
                  {/* Primary 1-Click Order -> Rings bell in POS! */}
                  <button
                    type="submit"
                    form="orderForm"
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer ring-2 ring-amber-300"
                  >
                    <span>🔔 PLACE ORDER (RINGS KITCHEN BELL)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Website Footer */}
      <footer className="bg-stone-900 border-t border-stone-800 py-6 px-4 mt-12 text-center text-xs text-stone-500 space-y-2">
        <div className="flex justify-center mb-2">
          <ZcbLogo className="w-12 h-12 opacity-80" />
        </div>
        <p className="font-bold text-stone-300 uppercase tracking-wide">
          {shop.shortName || 'ZCB'} - {shop.shopNameEn || 'Zaiqa Chicken Biryani'}
        </p>
        <p className="text-[11px] text-stone-400">
          Fresh Degi Biryani, Shami Kababs & Cold Drinks • Delivery Hotline: {shop.phone}
        </p>

        <p className="text-[10px] text-stone-600 pt-1">
          © {new Date().getFullYear()} ZCB Official Ordering Portal. All Rights Reserved.
        </p>
        {onSwitchToPOS && isOwner && (
          <div className="pt-2">
            <button
              onClick={onSwitchToPOS}
              className="text-[11px] text-stone-500 hover:text-amber-400 underline transition-colors cursor-pointer"
            >
              🔒 Switch to Merchant POS Terminal
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};
