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
  MessageCircle,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  X,
  ExternalLink,
  Share2,
  Download,
  Smartphone,
} from 'lucide-react';
import { InstallAppModal } from './InstallAppModal';
import { getPublicCustomerUrl } from '../utils/urlHelper';

interface CustomerOrderingSiteProps {
  shop: ShopSettings;
  menuItems: MenuItem[];
  onPlaceOrder: (orderData: Partial<Order>) => void;
  onSwitchToPOS?: () => void;
}

export const CustomerOrderingSite: React.FC<CustomerOrderingSiteProps> = ({
  shop,
  menuItems,
  onPlaceOrder,
  onSwitchToPOS,
}) => {
  // Mobile PWA Install Modal State
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

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

  // Customer Checkout Form
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryLandmark, setDeliveryLandmark] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online'>('cash');

  // Order Confirmed State
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Bike delivery fee
  const bikeDeliveryFee = deliveryMode === 'delivery' ? 50 : 0;
  const itemsSubtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const netTotal = itemsSubtotal + bikeDeliveryFee;

  // Categories
  const categories = [
    { id: 'all', label: 'All Menu (سب کھانے)' },
    { id: 'biryani', label: '🍗 Chicken Biryani' },
    { id: 'kababs', label: '🍢 Shami Kababs' },
    { id: 'sides', label: '🥣 Raita & Salad' },
    { id: 'drinks', label: '🥤 Cold Drinks' },
  ];

  const filteredItems = menuItems.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  // Handle portion change for an item
  const handlePortionSelect = (itemId: string, portionId: string) => {
    setSelectedPortions((prev) => ({ ...prev, [itemId]: portionId }));
  };

  // Add item to cart
  const handleAddToCart = (item: MenuItem) => {
    let unitPrice = item.defaultPrice || 100;
    let portionLabel = '';

    if (item.portions && item.portions.length > 0) {
      const selectedPId = selectedPortions[item.id] || item.portions[0].id;
      const portion = item.portions.find((p) => p.id === selectedPId) || item.portions[0];
      unitPrice = portion.price;
      portionLabel = portion.labelEn || portion.weightOrQty || portion.labelUr;
    }

    const existingIdx = cart.findIndex(
      (c) => c.menuItemId === item.id && (c.portionLabelEn === portionLabel || c.portionLabel === portionLabel)
    );

    if (existingIdx >= 0) {
      const updated = [...cart];
      updated[existingIdx].quantity += 1;
      updated[existingIdx].total = updated[existingIdx].quantity * updated[existingIdx].unitPrice;
      setCart(updated);
    } else {
      const newItem: OrderItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        menuItemId: item.id,
        nameUr: item.nameUr,
        nameEn: item.nameEn,
        portionLabelEn: portionLabel,
        portionLabel: portionLabel,
        unitPrice,
        quantity: 1,
        total: unitPrice,
      };
      setCart([...cart, newItem]);
    }
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
      alert('Please enter your name for the order.');
      return;
    }
    if (!customerPhone.trim()) {
      alert('Please enter your mobile phone number.');
      return;
    }
    if (deliveryMode === 'delivery' && !deliveryAddress.trim()) {
      alert('Please enter your delivery address so our bike rider can reach you.');
      return;
    }

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
      deliveryLandmark: deliveryMode === 'delivery' ? deliveryLandmark.trim() : undefined,
      deliveryFee: bikeDeliveryFee,
      riderName: deliveryMode === 'delivery' ? 'ZCB Bike Rider' : undefined,
      items: cart,
      subtotal: itemsSubtotal,
      discountAmount: 0,
      totalAmount: netTotal,
      paymentMode: paymentMode === 'cash' ? 'cash' : 'online',
      notes: customerNotes.trim() || undefined,
      createdAt: Date.now(),
    };

    onPlaceOrder(newOrderData);
    setConfirmedOrder(newOrderData as Order);
    setIsCartOpen(false);
    setCart([]);
  };

  // Order directly via WhatsApp
  const handleOrderViaWhatsApp = () => {
    if (cart.length === 0) return;

    const itemList = cart
      .map((it) => `• ${it.nameEn} (${it.portionLabel || it.portionLabelEn}) x ${it.quantity} = ${shop.currencySymbol} ${it.total}`)
      .join('\n');

    const msg = `*NEW ONLINE FOOD ORDER - ZCB (ZAIQA CHICKEN BIRYANI)*\n` +
      `-----------------------------------------\n` +
      `*Order Type:* ${deliveryMode === 'delivery' ? '🛵 BIKE HOME DELIVERY' : '🛍️ SELF PICKUP'}\n` +
      `*Customer:* ${customerName || 'Online Customer'}\n` +
      `*Phone:* ${customerPhone || 'Not provided'}\n` +
      (deliveryMode === 'delivery'
        ? `*Delivery Address:* ${deliveryAddress || 'Address on file'}\n` +
          (deliveryLandmark ? `*Landmark:* ${deliveryLandmark}\n` : '')
        : '') +
      `-----------------------------------------\n` +
      `*ITEMS ORDERED:*\n${itemList}\n` +
      `-----------------------------------------\n` +
      `*Items Subtotal:* ${shop.currencySymbol} ${itemsSubtotal}\n` +
      (bikeDeliveryFee > 0 ? `*🛵 Bike Delivery Fee:* ${shop.currencySymbol} ${bikeDeliveryFee}\n` : '') +
      `*TOTAL AMOUNT:* ${shop.currencySymbol} ${netTotal}\n` +
      `*Payment:* ${paymentMode === 'cash' ? 'Cash on Delivery (COD)' : 'Online QR'}\n` +
      (customerNotes ? `*Note:* ${customerNotes}\n` : '') +
      `\n_Please confirm our order and dispatch bike rider!_`;

    const primaryNumber = '923337018183';
    window.open(`https://api.whatsapp.com/send?phone=${primaryNumber}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans flex flex-col selection:bg-amber-500 selection:text-stone-950">
      {/* Top Banner with Bike Delivery & WhatsApp Hotline */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-stone-950 py-2 px-3 text-center text-xs font-black tracking-wide shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2 mx-auto">
          <Bike className="w-4 h-4 animate-bounce" />
          <span>FAST BIKE HOME DELIVERY IN 25-35 MINS • FRESH DEGI CHICKEN BIRYANI</span>
          <span className="hidden sm:inline opacity-75">• Tel / WhatsApp: {shop.phone}</span>
        </div>
        {onSwitchToPOS && (
          <button
            onClick={onSwitchToPOS}
            className="text-[11px] bg-stone-950 text-amber-300 px-3 py-1 rounded-full font-bold hover:bg-stone-900 transition-colors shrink-0 cursor-pointer"
          >
            🔒 کیشیئر لاگ اِن (Merchant POS)
          </button>
        )}
      </div>

      {/* Mobile Install App Top Sticky Bar */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-stone-950 px-3 py-2 text-xs font-black flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 truncate">
          <Smartphone className="w-4 h-4 shrink-0 stroke-[2.5]" />
          <span className="truncate font-bold">📲 ZCB ایپ موبائل میں ڈاؤن لوڈ کریں (Install App)</span>
        </div>
        <button
          onClick={() => setIsInstallModalOpen(true)}
          className="px-3 py-1 bg-stone-950 hover:bg-stone-900 text-amber-300 rounded-lg text-xs font-black shrink-0 transition-colors shadow-sm cursor-pointer flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>ڈاؤن لوڈ کریں</span>
        </button>
      </div>

      {/* Website Branded Header */}
      <header className="bg-stone-900 border-b border-stone-800 sticky top-0 z-30 shadow-xl backdrop-blur-md bg-stone-900/95">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3">
            <ZcbLogo className="w-14 h-14 sm:w-16 sm:h-16 shadow-lg flex-shrink-0" />
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
            {/* Install App Button */}
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer ring-1 ring-amber-300"
              title="موبائل ایپ ڈاؤن لوڈ کریں"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="inline">📲 ایپ ڈاؤن لوڈ</span>
            </button>

            <a
              href="tel:03337018183"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold border border-stone-700 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>Call Us</span>
            </a>

            <a
              href={`https://api.whatsapp.com/send?phone=${shop.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-600/50 transition-colors shadow-sm"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">WhatsApp</span>
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
                  alert('ویب سائٹ کا پبلک لنک کاپی ہوگیا! (Public Link Copied)');
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
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm rounded-xl cursor-pointer"
              >
                Place Another Order
              </button>
              <a
                href={`https://api.whatsapp.com/send?phone=923337018183&text=${encodeURIComponent(`Salam ZCB, I placed Order Token #${confirmedOrder.tokenNumber}. Please update me on rider dispatch status!`)}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 font-bold text-sm rounded-xl flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Track on WhatsApp</span>
              </a>
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

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-300'
                  : 'bg-stone-900 text-stone-300 border border-stone-800 hover:bg-stone-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Food Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const hasPortions = item.portions && item.portions.length > 0;
            const currentPortionId = selectedPortions[item.id] || (hasPortions ? item.portions![0].id : '');
            const currentPortion = hasPortions
              ? item.portions!.find((p) => p.id === currentPortionId) || item.portions![0]
              : null;
            const displayPrice = currentPortion ? currentPortion.price : (item.defaultPrice || 0);

            return (
              <div
                key={item.id}
                className="bg-stone-900 border border-stone-800 hover:border-amber-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all flex flex-col justify-between group"
              >
                {/* Item Image */}
                <div className="relative h-44 w-full bg-stone-950 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.nameEn}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-stone-900">
                      <ZcbLogo className="w-16 h-16 opacity-40" />
                    </div>
                  )}

                  {item.popular && (
                    <div className="absolute top-2.5 left-2.5 bg-amber-500 text-stone-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Bestseller</span>
                    </div>
                  )}

                  <div className="absolute bottom-2.5 right-2.5 bg-stone-950/90 text-amber-400 px-3 py-1 rounded-xl text-sm font-black border border-amber-500/30 backdrop-blur-sm shadow-md font-mono">
                    {formatPrice(displayPrice, shop.currencySymbol)}
                  </div>
                </div>

                {/* Item Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                      {item.nameEn}
                    </h4>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Freshly made degi recipe with pure aromatic spices and tender chicken.
                    </p>
                  </div>

                  {/* Portions Selector (250g, 370g, 500g, 750g, 1 KG) */}
                  {hasPortions && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                        Select Portion Size:
                      </span>
                      <div className="grid grid-cols-5 gap-1">
                        {item.portions!.map((p) => {
                          const isSelected = p.id === currentPortionId;
                          return (
                            <button
                              key={p.id}
                              onClick={() => handlePortionSelect(item.id, p.id)}
                              className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-amber-500 text-stone-950 border-amber-400 font-black shadow-xs'
                                  : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700 text-xs font-semibold'
                              }`}
                            >
                              <span className="block text-[10.5px] font-bold">{p.labelEn}</span>
                              <span className="block text-[9px] opacity-80">{shop.currencySymbol}{p.price}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="w-full py-2.5 px-3 bg-stone-800 hover:bg-amber-500 text-stone-200 hover:text-stone-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 border border-stone-700 hover:border-amber-400 transition-all active:scale-[0.98] cursor-pointer shadow-sm mt-2"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>ADD TO CART</span>
                    <span className="font-mono">({formatPrice(displayPrice, shop.currencySymbol)})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating Bottom Cart Bar for Mobile */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-xl mx-auto animate-in slide-in-from-bottom-5">
          <div
            onClick={() => setIsCartOpen(true)}
            className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-stone-950 p-3.5 sm:p-4 rounded-2xl shadow-2xl flex items-center justify-between cursor-pointer ring-2 ring-amber-300 font-bold"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-stone-950 text-amber-300 flex items-center justify-center font-mono font-black text-sm">
                {cart.reduce((sum, it) => sum + it.quantity, 0)}
              </div>
              <div>
                <div className="text-xs uppercase font-black tracking-wider text-stone-950">
                  {deliveryMode === 'delivery' ? '🛵 BIKE DELIVERY ORDER' : '🛍️ TAKEAWAY ORDER'}
                </div>
                <div className="text-base font-black text-stone-950">
                  Total: {formatPrice(netTotal, shop.currencySymbol)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-black uppercase bg-stone-950 text-amber-300 px-3 py-1.5 rounded-xl shadow-xs">
              <span>View Cart</span>
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
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Delivery Mode Banner in Drawer */}
              <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between text-xs">
                <span className="text-stone-300 font-bold flex items-center gap-1.5">
                  {deliveryMode === 'delivery' ? <Bike className="w-4 h-4 text-emerald-400" /> : <ShoppingBag className="w-4 h-4 text-amber-400" />}
                  <span>{deliveryMode === 'delivery' ? 'Bike Home Delivery' : 'Self Takeaway'}</span>
                </span>
                <span className="text-amber-400 font-bold">
                  {deliveryMode === 'delivery' ? '+ Rs. 50 Rider Fee' : 'Free Pickup'}
                </span>
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
                      className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between gap-2"
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
                      <div className="flex items-center gap-1.5 bg-stone-900 p-0.5 rounded-lg border border-stone-800">
                        <button
                          onClick={() => handleUpdateQty(index, item.quantity - 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-stone-300 hover:bg-stone-800 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-mono font-bold text-xs text-amber-300">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(index, item.quantity + 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-stone-300 hover:bg-stone-800 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right min-w-[55px]">
                        <span className="font-black text-amber-300 text-sm font-mono">
                          {formatPrice(item.total, shop.currencySymbol)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Customer Contact & Delivery Form */}
              {cart.length > 0 && (
                <form id="orderForm" onSubmit={handleSubmitOrder} className="space-y-3 pt-2">
                  <div className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-stone-800 pb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Customer Details (آپ کا نام اور پتہ)</span>
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-400 block mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tariq Mehmood"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-700 text-white rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-400 block mb-1">Mobile Phone Number (03xx-xxxxxxx) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="0333-1234567"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-700 text-white rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  {deliveryMode === 'delivery' && (
                    <>
                      <div>
                        <label className="text-[11px] text-stone-400 block mb-1">
                          🛵 Full Delivery Address (گھر / آفس کا پتہ) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="House #, Street #, Colony or Area"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-950 border border-amber-500/50 text-white rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-stone-400 block mb-1">
                          Nearest Landmark (قریبی مشہور نشانی)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Near Bilal Masjid / Govt School / Main Gate"
                          value={deliveryLandmark}
                          onChange={(e) => setDeliveryLandmark(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-950 border border-stone-700 text-white rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-[11px] text-stone-400 block mb-1">Special Rider Note (اختیاری نوٹ)</label>
                    <input
                      type="text"
                      placeholder="e.g. Please bring extra raita / call on arrival"
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-700 text-white rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Payment Mode Selection */}
                  <div className="pt-2">
                    <label className="text-[11px] text-stone-400 block mb-1">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMode('cash')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          paymentMode === 'cash'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                            : 'bg-stone-950 text-stone-400 border-stone-800'
                        }`}
                      >
                        💵 Cash on Delivery (COD)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMode('online')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          paymentMode === 'online'
                            ? 'bg-sky-600 text-white border-sky-500 shadow-xs'
                            : 'bg-stone-950 text-stone-400 border-stone-800'
                        }`}
                      >
                        📱 Online / QR Code
                      </button>
                    </div>
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

                  {/* Secondary WhatsApp Direct Order Button */}
                  <button
                    type="button"
                    onClick={handleOrderViaWhatsApp}
                    className="w-full py-2.5 px-4 bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>OR ORDER DIRECT VIA WHATSAPP</span>
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
        {/* Mobile Download Card in Footer */}
        <div className="max-w-md mx-auto my-4 p-4 bg-stone-950 border border-amber-500/40 rounded-2xl text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs">
            <Smartphone className="w-4 h-4" />
            <span>ZCB کسٹمر موبائل ایپ (Add to Home Screen)</span>
          </div>
          <p className="text-[11px] text-stone-400">
            ایک کلک میں بغیر براؤزر کے فل اسکرین پر بریانی آرڈر کرنے کے لیے ایپ ڈاؤن لوڈ کریں۔
          </p>
          <button
            type="button"
            onClick={() => setIsInstallModalOpen(true)}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>📲 موبائل میں ایپ ڈاؤن لوڈ / انسٹال کریں</span>
          </button>
        </div>

        <p className="text-[10px] text-stone-600 pt-1">
          © {new Date().getFullYear()} ZCB Official Ordering Portal. All Rights Reserved.
        </p>
        {onSwitchToPOS && (
          <div className="pt-2">
            <button
              onClick={onSwitchToPOS}
              className="text-[11px] text-stone-500 hover:text-amber-400 underline transition-colors cursor-pointer"
            >
              🔒 کیشیئر لاگ اِن / POS ٹرمینل کھولیں (Switch to Merchant POS)
            </button>
          </div>
        )}
      </footer>

      {/* Mobile PWA Install Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        shopName={shop.shopNameUr || shop.shopNameEn}
      />
    </div>
  );
};
