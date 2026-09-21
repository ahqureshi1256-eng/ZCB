import React, { useState, useEffect } from 'react';
import { MenuItem, OrderItem, Order, ShopSettings, KhataEntry } from './types';
import { INITIAL_MENU_ITEMS, INITIAL_SHOP_SETTINGS } from './data/initialData';
import { generateBillNumber, generateUPIQrCodeDataUrl } from './utils/billing';
import { posSound } from './utils/audio';
import { Header } from './components/Header';
import { MenuSection } from './components/MenuSection';
import { ActiveBillPanel } from './components/ActiveBillPanel';
import { ThermalReceipt } from './components/ThermalReceipt';
import { EditShopModal } from './components/EditShopModal';
import { AddItemModal } from './components/AddItemModal';
import { BillHistoryModal } from './components/BillHistoryModal';
import { ReceiptPreviewModal } from './components/ReceiptPreviewModal';
import { IncomingOrderAlertModal } from './components/IncomingOrderAlertModal';
import { CustomerOrderingSite } from './components/CustomerOrderingSite';
import { ShareLinkModal } from './components/ShareLinkModal';
import { InstallAppModal } from './components/InstallAppModal';
import { MonthlyKhataModal } from './components/MonthlyKhataModal';
import { CheckCircle, ShoppingBag, ArrowRight, Bell, Globe, Bike } from 'lucide-react';

export default function App() {
  // Helper to detect if user opened via TikTok/WhatsApp Customer Order Link or Cashier POS
  const detectInitialViewMode = (): 'pos' | 'customer_site' => {
    if (typeof window === 'undefined') return 'customer_site';
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();

    // 1. Explicit Cashier POS requested via query param or hash
    if (
      params.get('mode') === 'pos' ||
      params.get('view') === 'pos' ||
      params.has('pos') ||
      hash === '#pos' ||
      window.location.pathname.endsWith('/pos')
    ) {
      return 'pos';
    }

    // 2. Explicit Customer Website requested via query param or hash
    if (
      params.get('mode') === 'order' ||
      params.get('mode') === 'customer' ||
      params.get('view') === 'order' ||
      params.get('view') === 'online' ||
      params.has('order') ||
      hash === '#order' ||
      hash === '#customer' ||
      hash === '#menu' ||
      window.location.pathname.endsWith('/order')
    ) {
      return 'customer_site';
    }

    // 3. If running as installed standalone app (e.g. merchant installed PWA on mobile)
    const isStandalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      const saved = localStorage.getItem('zcb_preferred_view');
      return saved === 'customer_site' ? 'customer_site' : 'pos';
    }

    // 4. If this browser device previously selected cashier POS role
    const saved = localStorage.getItem('zcb_preferred_view');
    if (saved === 'pos') {
      return 'pos';
    }

    // 5. Default for all public links, mobile phones, and TikTok/WhatsApp visitors:
    // Pure, dedicated Customer Ordering Website!
    return 'customer_site';
  };

  // App View: 'pos' (Cashier Terminal) vs 'customer_site' (Customer Online Ordering Website)
  const [viewMode, setViewMode] = useState<'pos' | 'customer_site'>(detectInitialViewMode);
  const [isShareLinkOpen, setIsShareLinkOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  // Synchronize view mode transitions cleanly with browser URL & localStorage
  const handleSwitchViewMode = (newMode: 'pos' | 'customer_site') => {
    setViewMode(newMode);
    localStorage.setItem('zcb_preferred_view', newMode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (newMode === 'customer_site') {
        url.searchParams.set('mode', 'order');
        url.searchParams.delete('pos');
      } else {
        url.searchParams.set('mode', 'pos');
        url.searchParams.delete('order');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Listen to browser navigation events (Back/Forward buttons)
  useEffect(() => {
    const handleNavigation = () => {
      setViewMode(detectInitialViewMode());
    };
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, []);

  // LocalStorage-backed state with ZCB keys
  const [shopSettings, setShopSettings] = useState<ShopSettings>(() => {
    const saved = localStorage.getItem('zcb_biryani_shop_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.shortName === 'ZCB' || parsed.shopNameEn?.includes('Zaiqa')) {
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_SHOP_SETTINGS;
  });

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('zcb_biryani_menu_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_MENU_ITEMS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('zcb_biryani_orders_v3');
    return saved ? JSON.parse(saved) : [];
  });

  const [tokenNumber, setTokenNumber] = useState<number>(() => {
    const saved = localStorage.getItem('zcb_biryani_token_v3');
    return saved ? Number(saved) : 101;
  });

  // Active Bill State
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
  const [activePrintOrder, setActivePrintOrder] = useState<Order | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>('');
  const [printAlertMessage, setPrintAlertMessage] = useState<string | null>(null);

  // Incoming Online Order Alert State & Bell
  const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
  const [isAlertMuted, setIsAlertMuted] = useState<boolean>(false);

  // Modals state
  const [isEditShopOpen, setIsEditShopOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isKhataOpen, setIsKhataOpen] = useState(false);

  // Khata Entries (Chicken, Rice, Masala, Customer Udhaar)
  const [khataEntries, setKhataEntries] = useState<KhataEntry[]>(() => {
    const saved = localStorage.getItem('zcb_biryani_khata_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    // Initial sample ledger data for demonstration
    return [
      {
        id: 'khata-sample-1',
        type: 'chicken',
        supplierOrPartyName: 'رحیم پولٹری ہول سیل',
        description: '40 کلو برائلر چکن تازہ سپلائی',
        amount: 22000,
        paidAmount: 15000,
        balanceDue: 7000,
        dateStr: new Date().toLocaleDateString(),
        timeStr: '09:30 AM',
        createdAt: Date.now() - 3600000 * 24,
        status: 'partial',
        notes: 'باقی 7,000 اگلے سوموار کو ادا کرنے ہیں',
      },
      {
        id: 'khata-sample-2',
        type: 'rice',
        supplierOrPartyName: 'بسم اللہ رائس ڈیلرز',
        description: '2 بوری سپر کرنل باسمتی چاول',
        amount: 18500,
        paidAmount: 18500,
        balanceDue: 0,
        dateStr: new Date().toLocaleDateString(),
        timeStr: '11:00 AM',
        createdAt: Date.now() - 3600000 * 12,
        status: 'paid',
        notes: 'نقد ادائیگی مکمل',
      },
    ];
  });

  // Mobile view toggle ('menu' | 'bill')
  const [mobileTab, setMobileTab] = useState<'menu' | 'bill'>('menu');

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('zcb_biryani_khata_v3', JSON.stringify(khataEntries));
  }, [khataEntries]);

  useEffect(() => {
    localStorage.setItem('zcb_biryani_shop_v3', JSON.stringify(shopSettings));
  }, [shopSettings]);

  useEffect(() => {
    localStorage.setItem('zcb_biryani_menu_v3', JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem('zcb_biryani_orders_v3', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('zcb_biryani_token_v3', String(tokenNumber));
  }, [tokenNumber]);

  // Setup cross-tab BroadcastChannel so placing an order in one tab rings the bell in POS
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('zcb_orders_channel');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'NEW_ORDER') {
          handleIncomingOnlineOrder(event.data.order, false);
        }
      };
    } catch (e) {}

    return () => {
      channel?.close();
    };
  }, []);

  // Generate QR Code dynamically for current bill (if online payment configured)
  const currentSubtotal = currentOrderItems.reduce((sum, it) => sum + it.total, 0);
  useEffect(() => {
    if (currentSubtotal > 0 && shopSettings.upiId) {
      const billNo = generateBillNumber(tokenNumber);
      generateUPIQrCodeDataUrl(
        shopSettings.upiId,
        shopSettings.upiPayeeName || shopSettings.shopNameEn || shopSettings.shopName || 'ZCB POS',
        currentSubtotal,
        billNo
      ).then((url) => setUpiQrDataUrl(url));
    } else {
      setUpiQrDataUrl('');
    }
  }, [currentSubtotal, shopSettings.upiId, shopSettings.upiPayeeName, shopSettings.shopNameEn, shopSettings.shopName, tokenNumber]);

  // Handle incoming order from website or simulation -> RINGS BELL!
  const handleIncomingOnlineOrder = (orderData: Partial<Order>, broadcast: boolean = true) => {
    const fullOrder: Order = {
      id: orderData.id || `online-${Date.now()}`,
      billNumber: orderData.billNumber || generateBillNumber(tokenNumber),
      tokenNumber: orderData.tokenNumber || tokenNumber,
      dateStr: orderData.dateStr || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      timeStr: orderData.timeStr || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      customerName: orderData.customerName || 'Online Customer',
      customerPhone: orderData.customerPhone || '0333-1234567',
      orderType: orderData.orderType || 'delivery',
      orderSource: 'online_website',
      orderStatus: 'pending',
      deliveryAddress: orderData.deliveryAddress || 'Delivery Address on file',
      deliveryLandmark: orderData.deliveryLandmark,
      deliveryFee: orderData.deliveryFee || 50,
      riderName: orderData.riderName || 'Bike Rider Ali #1',
      items: orderData.items || [],
      subtotal: orderData.subtotal || 0,
      discountAmount: orderData.discountAmount || 0,
      totalAmount: orderData.totalAmount || 0,
      paymentMode: orderData.paymentMode || 'cash',
      notes: orderData.notes,
      createdAt: orderData.createdAt || Date.now(),
    };

    // Save to orders list & increment token
    setOrders((prev) => [fullOrder, ...prev]);
    setTokenNumber((prev) => prev + 1);

    // Show alert modal and start continuous bell!
    setIncomingOrder(fullOrder);
    if (shopSettings.soundEnabled && !isAlertMuted) {
      // 0 means INFINITE continuous ringing & voice calling until cashier clicks "آرڈر اٹھائیں"!
      posSound.startContinuousOrderBell(
        0,
        shopSettings.cashierName || 'مزمل',
        shopSettings.voiceAlertEnabled !== false
      );
    }

    // Broadcast cross-tab if enabled
    if (broadcast) {
      try {
        const channel = new BroadcastChannel('zcb_orders_channel');
        channel.postMessage({ type: 'NEW_ORDER', order: fullOrder });
        channel.close();
      } catch (e) {}
    }
  };

  // Demo Order Simulator for Instant Testing
  const handleSimulateDemoOrder = () => {
    const demoItems: OrderItem[] = [
      {
        id: `demo-${Date.now()}-1`,
        menuItemId: 'biryani-chicken',
        nameEn: 'Chicken Biryani',
        nameUr: 'Chicken Biryani',
        portionLabelEn: '01 KG',
        portionLabel: '01 KG',
        unitPrice: 720,
        quantity: 1,
        total: 720,
      },
      {
        id: `demo-${Date.now()}-2`,
        menuItemId: 'side-shami-kabab',
        nameEn: 'Shami Kabab',
        nameUr: 'Shami Kabab',
        unitPrice: 50,
        quantity: 2,
        total: 100,
      },
      {
        id: `demo-${Date.now()}-3`,
        menuItemId: 'drink-coke-regular',
        nameEn: 'Coca Cola 500ml',
        nameUr: 'Coca Cola',
        unitPrice: 100,
        quantity: 1,
        total: 100,
      },
    ];

    const subtotal = 920;
    const deliveryFee = 50;

    handleIncomingOnlineOrder({
      customerName: 'Muhammad Hamza',
      customerPhone: '0312-9876543',
      orderType: 'delivery',
      deliveryAddress: 'Flat #4, 2nd Floor, Al-Madina Heights, Sector F-8',
      deliveryLandmark: 'Opposite Shell Petrol Pump & Allied Bank',
      deliveryFee,
      riderName: 'Bike Rider Tariq',
      items: demoItems,
      subtotal,
      totalAmount: subtotal + deliveryFee,
      notes: 'Please bring fresh hot biryani with spoon and extra raita.',
      paymentMode: 'cash',
    });
  };

  // Accept and Print Incoming Online Order
  const handleAcceptAndPrintIncoming = (order: Order) => {
    posSound.stopContinuousOrderBell();
    setActivePrintOrder(order);
    setIncomingOrder(null);

    // Update status in orders array
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, orderStatus: 'accepted', riderName: order.riderName } : o))
    );

    setTimeout(() => {
      window.print();
    }, 150);

    setPrintAlertMessage(`Online Order Token #${order.tokenNumber} Accepted & Printed!`);
    setTimeout(() => {
      setPrintAlertMessage(null);
    }, 4000);
  };

  // Add Item to Bill in POS
  const handleAddItem = (item: MenuItem, portionId?: string) => {
    let unitPrice = item.defaultPrice || 0;
    let portionLabelUr = '';
    let portionLabelEn = '';

    if (portionId && item.portions) {
      const p = item.portions.find((pt) => pt.id === portionId);
      if (p) {
        unitPrice = p.price;
        portionLabelUr = p.labelUr || p.labelHi || '';
        portionLabelEn = p.labelEn || '';
      }
    }

    const portionKey = portionLabelUr || portionLabelEn || '';
    const existingIdx = currentOrderItems.findIndex(
      (it) => it.menuItemId === item.id && (it.portionLabelUr === portionLabelUr || it.portionLabel === portionKey)
    );

    if (existingIdx >= 0) {
      const updated = [...currentOrderItems];
      const existing = updated[existingIdx];
      const newQty = existing.quantity + 1;
      updated[existingIdx] = {
        ...existing,
        quantity: newQty,
        total: newQty * existing.unitPrice,
      };
      setCurrentOrderItems(updated);
    } else {
      const newItem: OrderItem = {
        id: `ord-item-${Date.now()}-${Math.random()}`,
        menuItemId: item.id,
        nameUr: item.nameUr || item.nameHi || item.nameEn || 'آئٹم',
        nameEn: item.nameEn || item.nameUr || 'Item',
        nameHi: item.nameHi || item.nameEn,
        portionLabelUr: portionLabelUr || undefined,
        portionLabelEn: portionLabelEn || undefined,
        portionLabel: portionLabelUr || portionLabelEn || undefined,
        unitPrice,
        quantity: 1,
        total: unitPrice,
      };
      setCurrentOrderItems([...currentOrderItems, newItem]);
    }
  };

  // Update item quantity
  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...currentOrderItems];
    updated[index] = {
      ...updated[index],
      quantity: newQty,
      total: newQty * updated[index].unitPrice,
    };
    setCurrentOrderItems(updated);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setCurrentOrderItems(currentOrderItems.filter((_, idx) => idx !== index));
  };

  // Clear bill
  const handleClearBill = () => {
    setCurrentOrderItems([]);
  };

  // Build full Order Object
  const createOrderObject = (orderData: Partial<Order>): Order => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const billNo = generateBillNumber(tokenNumber);

    const completedOrder: Order = {
      id: `order-${Date.now()}`,
      billNumber: billNo,
      tokenNumber: tokenNumber,
      dateStr,
      timeStr,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      orderType: orderData.orderType || 'takeaway',
      tableNumber: orderData.tableNumber,
      deliveryAddress: orderData.deliveryAddress,
      deliveryLandmark: orderData.deliveryLandmark,
      deliveryFee: orderData.deliveryFee,
      riderName: orderData.riderName,
      orderSource: 'pos',
      orderStatus: 'accepted',
      items: [...currentOrderItems],
      subtotal: orderData.subtotal || currentSubtotal,
      discountAmount: orderData.discountAmount || 0,
      totalAmount: orderData.totalAmount || currentSubtotal,
      paymentMode: orderData.paymentMode || 'cash',
      cashTendered: orderData.cashTendered,
      changeDue: orderData.changeDue,
      createdAt: Date.now(),
    };

    return completedOrder;
  };

  // VIP 1-Click Print Bill
  const handlePrintBill = async (orderData: Partial<Order>) => {
    if (currentOrderItems.length === 0) return;

    const completedOrder = createOrderObject(orderData);

    // Save to history & update token
    setOrders((prev) => [completedOrder, ...prev]);
    setTokenNumber((prev) => prev + 1);

    // Set order for print container
    setActivePrintOrder(completedOrder);

    // Clear current active cart
    setCurrentOrderItems([]);

    // Trigger Print
    setTimeout(() => {
      window.print();
    }, 150);

    // Display alert
    setPrintAlertMessage(`Order #${completedOrder.tokenNumber} printed successfully!`);
    setTimeout(() => {
      setPrintAlertMessage(null);
    }, 4000);
  };

  // Re-print order from history
  const handleReprintOrder = (order: Order) => {
    setActivePrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Open Preview for current bill or existing order
  const handleOpenPreview = (orderData: Partial<Order> | Order) => {
    if ('createdAt' in orderData) {
      setPreviewOrder(orderData as Order);
    } else {
      const tempOrder = createOrderObject(orderData);
      setPreviewOrder(tempOrder);
    }
    setIsPreviewOpen(true);
  };

  // Save new custom dish to menu
  const handleAddNewItem = (newItem: MenuItem) => {
    setMenuItems((prev) => [newItem, ...prev]);
  };

  // If customer website view is selected, render the Customer Ordering Portal!
  if (viewMode === 'customer_site') {
    return (
      <CustomerOrderingSite
        shop={shopSettings}
        menuItems={menuItems}
        onPlaceOrder={(order) => {
          handleIncomingOnlineOrder(order);
        }}
        onSwitchToPOS={() => handleSwitchViewMode('pos')}
      />
    );
  }

  const pendingOnlineOrders = orders.filter((o) => o.orderSource === 'online_website' && o.orderStatus === 'pending');
  const pendingOnlineOrdersCount = pendingOnlineOrders.length;
  const latestPendingOrder = pendingOnlineOrders[0] || null;

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col font-sans text-stone-100 selection:bg-amber-500 selection:text-stone-950">
      {/* 1-Click Print Target Area (Hidden on screen, shown in print) */}
      {activePrintOrder && (
        <ThermalReceipt
          order={activePrintOrder}
          shop={shopSettings}
          qrCodeDataUrl={upiQrDataUrl}
          isPrintOnly={true}
        />
      )}

      {/* Persistent Unlifted Order Bar (Rings and Alerts until cashier clicks 'آرڈر اٹھائیں!') */}
      {latestPendingOrder && !incomingOrder && (
        <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between shadow-2xl z-40 border-b-2 border-amber-300 animate-pulse">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-9 h-9 rounded-full bg-white text-red-600 flex items-center justify-center font-black animate-bounce shrink-0 shadow-md">
              <Bell className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="truncate">
              <div className="text-xs font-black uppercase tracking-wider text-amber-200">
                🚨 گھنٹی بج رہی ہے! نیا آرڈر ابھی تک نہیں اٹھایا گیا
              </div>
              <div className="text-sm font-black truncate">
                ٹوکن #{latestPendingOrder.tokenNumber} • {latestPendingOrder.customerName} ({latestPendingOrder.items.length} آئٹمز - Rs {latestPendingOrder.totalAmount})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIncomingOrder(latestPendingOrder);
                posSound.startContinuousOrderBell(
                  0,
                  shopSettings.cashierName || 'مزمل',
                  shopSettings.voiceAlertEnabled !== false
                );
              }}
              className="px-3.5 py-2 bg-stone-950 hover:bg-stone-900 text-amber-300 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 border border-amber-400"
            >
              <span>تفصیل دیکھیں</span>
            </button>
            <button
              type="button"
              onClick={() => handleAcceptAndPrintIncoming(latestPendingOrder)}
              className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-stone-950 rounded-xl text-xs sm:text-sm font-black shadow-lg transition-all active:scale-95 cursor-pointer ring-2 ring-white flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4 stroke-[3]" />
              <span>آرڈر اٹھائیں! (LIFT ORDER)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive App Container */}
      <div id="main-app-container" className="flex flex-col min-h-screen">
        {/* Header with Online Ordering toggle & Test Bell */}
        <Header
          shop={shopSettings}
          orders={orders}
          onOpenEditShop={() => setIsEditShopOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenKhata={() => setIsKhataOpen(true)}
          soundEnabled={shopSettings.soundEnabled}
          onToggleSound={() =>
            setShopSettings((prev) => ({
              ...prev,
              soundEnabled: !prev.soundEnabled,
            }))
          }
          onSwitchToCustomerSite={() => handleSwitchViewMode('customer_site')}
          onOpenShareLink={() => setIsShareLinkOpen(true)}
          onOpenInstallApp={() => setIsInstallModalOpen(true)}
          onSimulateOrder={handleSimulateDemoOrder}
          pendingOnlineCount={pendingOnlineOrdersCount}
        />

        {/* Print Success Toast */}
        {printAlertMessage && (
          <div className="fixed top-20 right-4 z-50 bg-amber-500 text-stone-950 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 animate-bounce text-sm font-black border border-amber-300">
            <CheckCircle className="w-5 h-5 text-stone-950" />
            <span>{printAlertMessage}</span>
          </div>
        )}

        {/* Mobile Tab Switcher */}
        <div className="lg:hidden bg-stone-900 border-b border-stone-800 px-4 py-2.5 flex items-center justify-between sticky top-15 z-20">
          <div className="flex bg-stone-950 p-1 rounded-xl w-full border border-stone-800">
            <button
              onClick={() => setMobileTab('menu')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                mobileTab === 'menu'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              1. Menu Items ({menuItems.length})
            </button>
            <button
              onClick={() => setMobileTab('bill')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileTab === 'bill'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>2. Active Bill ({currentOrderItems.length})</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Menu Section (Left - 7 cols) */}
          <section
            className={`lg:col-span-7 h-[calc(100vh-140px)] min-h-[580px] ${
              mobileTab === 'menu' ? 'block' : 'hidden lg:block'
            }`}
          >
            <MenuSection
              menuItems={menuItems}
              currentOrderItems={currentOrderItems}
              shop={shopSettings}
              onAddItem={handleAddItem}
              onOpenAddItemModal={() => setIsAddItemOpen(true)}
              soundEnabled={shopSettings.soundEnabled}
            />
          </section>

          {/* Active Bill / POS Cart Section (Right - 5 cols) */}
          <section
            className={`lg:col-span-5 h-[calc(100vh-140px)] min-h-[580px] ${
              mobileTab === 'bill' ? 'block' : 'hidden lg:block'
            }`}
          >
            <ActiveBillPanel
              items={currentOrderItems}
              shop={shopSettings}
              tokenNumber={tokenNumber}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearBill={handleClearBill}
              onPrintBill={handlePrintBill}
              onOpenPreview={handleOpenPreview}
              soundEnabled={shopSettings.soundEnabled}
              upiQrDataUrl={upiQrDataUrl}
            />
          </section>
        </main>

        {/* Mobile Sticky Checkout Bar if on menu tab and items exist */}
        {mobileTab === 'menu' && currentOrderItems.length > 0 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-stone-900 text-white border-t border-amber-500/40 shadow-2xl z-40 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-amber-300">
                {currentOrderItems.length} Items • Token #{tokenNumber}
              </div>
              <div className="text-lg font-black text-amber-400 font-mono">
                {shopSettings.currencySymbol} {currentSubtotal}
              </div>
            </div>
            <button
              onClick={() => setMobileTab('bill')}
              className="px-4 py-2 bg-amber-500 text-stone-950 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-transform cursor-pointer"
            >
              <span>View & Print Bill</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}
      </div>

      {/* Incoming Online Order Alert Modal (Rings Bell & Displays All Details) */}
      <IncomingOrderAlertModal
        isOpen={!!incomingOrder}
        order={incomingOrder}
        shop={shopSettings}
        isMuted={isAlertMuted}
        onToggleMute={() => {
          if (!isAlertMuted) {
            posSound.stopContinuousOrderBell();
            setIsAlertMuted(true);
          } else {
            setIsAlertMuted(false);
            posSound.startContinuousOrderBell(
              0,
              shopSettings.cashierName || 'مزمل',
              shopSettings.voiceAlertEnabled !== false
            );
          }
        }}
        onClose={() => {
          // If modal dismissed without accepting, keep bell ringing or allow reopening!
          posSound.stopContinuousOrderBell();
          setIncomingOrder(null);
        }}
        onAcceptAndPrint={handleAcceptAndPrintIncoming}
      />

      {/* Share Customer Ordering Link Modal (for TikTok & WhatsApp) */}
      <ShareLinkModal
        isOpen={isShareLinkOpen}
        onClose={() => setIsShareLinkOpen(false)}
        shop={shopSettings}
      />

      {/* Modals */}
      <EditShopModal
        isOpen={isEditShopOpen}
        onClose={() => setIsEditShopOpen(false)}
        settings={shopSettings}
        onSave={setShopSettings}
      />

      <AddItemModal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onAddItem={handleAddNewItem}
      />

      <BillHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        orders={orders}
        shop={shopSettings}
        onReprintOrder={handleReprintOrder}
        onOpenPreview={handleOpenPreview}
      />

      <ReceiptPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        order={previewOrder}
        shop={shopSettings}
        qrCodeDataUrl={upiQrDataUrl}
        onPrint={() => {
          if (previewOrder) {
            handleReprintOrder(previewOrder);
            setIsPreviewOpen(false);
          }
        }}
      />

      {/* Mobile App Install Modal (PWA) */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        shopName={shopSettings.shopNameUr || shopSettings.shopNameEn}
      />

      {/* Monthly Sales, Dabbe and Chicken/Rice Khata & Udhaar Modal */}
      <MonthlyKhataModal
        isOpen={isKhataOpen}
        onClose={() => setIsKhataOpen(false)}
        orders={orders}
        shop={shopSettings}
        khataEntries={khataEntries}
        onAddKhataEntry={(entry) => setKhataEntries((prev) => [entry, ...prev])}
        onDeleteKhataEntry={(id) => setKhataEntries((prev) => prev.filter((k) => k.id !== id))}
        onUpdateKhataEntry={(updated) =>
          setKhataEntries((prev) => prev.map((k) => (k.id === updated.id ? updated : k)))
        }
      />
    </div>
  );
}

