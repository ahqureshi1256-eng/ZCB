import React, { useState, useEffect } from 'react';
import { MenuItem, OrderItem, Order, ShopSettings, KhataEntry, AuthUser } from './types';
import { INITIAL_MENU_ITEMS, INITIAL_SHOP_SETTINGS } from './data/initialData';
import { generateBillNumber, generateUPIQrCodeDataUrl, aggregateOrdersForSummaryKot } from './utils/billing';
import { posSound } from './utils/audio';
import { Header } from './components/Header';
import { MenuSection } from './components/MenuSection';
import { ActiveBillPanel } from './components/ActiveBillPanel';
import { ThermalReceipt } from './components/ThermalReceipt';
import { SummaryKotReceipt } from './components/SummaryKotReceipt';
import { EditShopModal } from './components/EditShopModal';
import { AddItemModal } from './components/AddItemModal';
import { BillHistoryModal } from './components/BillHistoryModal';
import { ReceiptPreviewModal } from './components/ReceiptPreviewModal';
import { IncomingOrderAlertModal } from './components/IncomingOrderAlertModal';
import { CustomerOrderingSite } from './components/CustomerOrderingSite';
import { ShareLinkModal } from './components/ShareLinkModal';
import { InstallAppModal } from './components/InstallAppModal';
import { MonthlyKhataModal } from './components/MonthlyKhataModal';
import { PrinterSetupModal } from './components/PrinterSetupModal';
import { GmailModal } from './components/GmailModal';
import { GoogleDeliveryMapModal } from './components/GoogleDeliveryMapModal';
import { GoogleAuthGateModal } from './components/GoogleAuthGateModal';
import { Biryani3DModal } from './components/Biryani3DModal';
import { PosDeviceSettingsModal } from './components/PosDeviceSettingsModal';
import { LiveBillDispenserModal } from './components/LiveBillDispenserModal';
import {
  printDirectOrSystem,
  tryAutoConnectBluetoothPrinter,
  printSummaryKotDirectOrSystem,
} from './utils/printerService';
import {
  subscribeToOrders,
  saveOrderToFirestore,
  updateOrderStatusInFirestore,
} from './services/firestoreOrders';
import { isOwner, OWNER_EMAIL, getOwnerUser } from './utils/ownerAuth';
import { CheckCircle, ShoppingBag, ArrowRight, Bell, BellOff, Globe, Bike, Printer, Mail, MapPin, Utensils, Crown, ExternalLink, Zap } from 'lucide-react';

export default function App() {
  // User Authentication State - Defaults to Shop Owner so POS terminal and billing are ALWAYS accessible!
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('zcb_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return getOwnerUser();
  });

  const isUserOwner = isOwner(currentUser);

  const detectInitialViewMode = (): 'pos' | 'customer_site' | 'both' => {
    if (typeof window === 'undefined') return 'pos';
    const savedView = localStorage.getItem('zcb_preferred_view') as 'pos' | 'customer_site' | 'both';
    return savedView || 'pos';
  };

  // App View: 'pos' (Cashier Terminal) vs 'customer_site' (Customer Website) vs 'both' (Both Apps Together)
  const [viewMode, setViewMode] = useState<'pos' | 'customer_site' | 'both'>(detectInitialViewMode);
  const [isShareLinkOpen, setIsShareLinkOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  // Synchronize view mode transitions cleanly with browser URL & localStorage
  const handleSwitchViewMode = (newMode: 'pos' | 'customer_site' | 'both') => {
    setViewMode(newMode);
    localStorage.setItem('zcb_preferred_view', newMode);
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
  }, [isUserOwner]);

  // LocalStorage-backed state with ZCB keys
  const [shopSettings, setShopSettings] = useState<ShopSettings>(() => {
    const saved = localStorage.getItem('zcb_biryani_shop_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.shortName === 'ZCB' || parsed.shopNameEn?.includes('Zaiqa')) {
          return {
            ...INITIAL_SHOP_SETTINGS,
            ...parsed,
          };
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
  const [activeSummaryKotOrders, setActiveSummaryKotOrders] = useState<Order[] | null>(null);
  const [activePrintMode, setActivePrintMode] = useState<'both' | 'bill' | 'kot'>('both');
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>('');
  const [printAlertMessage, setPrintAlertMessage] = useState<string | null>(null);

  // Incoming Online Order Alert State & Bell
  const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
  const [isAlertMuted, setIsAlertMuted] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

  // Monitor Network Connectivity (POS continues 100% offline!)
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setPrintAlertMessage('🌐 Online: Internet connection restored. Cloud sync active.');
      setTimeout(() => setPrintAlertMessage(null), 3000);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setPrintAlertMessage('⚡ Offline Mode: POS billing, orders & thermal printing working offline!');
      setTimeout(() => setPrintAlertMessage(null), 4000);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Modals state
  const [isEditShopOpen, setIsEditShopOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isKhataOpen, setIsKhataOpen] = useState(false);
  const [isPrinterSetupOpen, setIsPrinterSetupOpen] = useState(false);
  const [isGmailOpen, setIsGmailOpen] = useState(false);
  const [isGoogleMapsOpen, setIsGoogleMapsOpen] = useState(false);
  const [hasMapQuotaExceeded, setHasMapQuotaExceeded] = useState(false);
  const [is3DBiryaniModalOpen, setIs3DBiryaniModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isPosSettingsOpen, setIsPosSettingsOpen] = useState<boolean>(false);
  const [dispenserOrder, setDispenserOrder] = useState<Order | null>(null);

  // Screen WakeLock for POS Device (Keeps screen awake on shop counter)
  useEffect(() => {
    let wakeLockSentinel: any = null;
    const requestWakeLock = async () => {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && shopSettings.posKeepScreenAwake !== false) {
        try {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.warn('Wake Lock request error:', err);
        }
      }
    };
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (wakeLockSentinel !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [shopSettings.posKeepScreenAwake]);

  // Continuous Bell Ringing State & Subscriber
  const [isBellRinging, setIsBellRinging] = useState<boolean>(false);

  useEffect(() => {
    const unsub = posSound.addRingingListener((ringing) => {
      setIsBellRinging(ringing);
    });
    return () => {
      unsub();
    };
  }, []);

  // Listen for Google Maps quota errors
  useEffect(() => {
    const handleQuota = () => setHasMapQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Automatic Background Bluetooth Thermal Printer Connection
  useEffect(() => {
    // 1. Initial attempt
    tryAutoConnectBluetoothPrinter(shopSettings.bluetoothDeviceName).catch(() => {});

    // 2. Periodic background check to keep printer connected
    const interval = setInterval(() => {
      tryAutoConnectBluetoothPrinter(shopSettings.bluetoothDeviceName).catch(() => {});
    }, 10000);

    // 3. Connect on tab focus
    const onFocus = () => {
      tryAutoConnectBluetoothPrinter(shopSettings.bluetoothDeviceName).catch(() => {});
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [shopSettings.bluetoothDeviceName]);

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
        supplierOrPartyName: 'Rahim Poultry Wholesale',
        description: '40 KG Fresh Broiler Chicken Supply',
        amount: 22000,
        paidAmount: 15000,
        balanceDue: 7000,
        dateStr: new Date().toLocaleDateString(),
        timeStr: '09:30 AM',
        createdAt: Date.now() - 3600000 * 24,
        status: 'partial',
        notes: 'Remaining Rs. 7,000 to be paid next Monday',
      },
      {
        id: 'khata-sample-2',
        type: 'rice',
        supplierOrPartyName: 'Bismillah Rice Dealers',
        description: '2 Bags Super Kernel Basmati Rice',
        amount: 18500,
        paidAmount: 18500,
        balanceDue: 0,
        dateStr: new Date().toLocaleDateString(),
        timeStr: '11:00 AM',
        createdAt: Date.now() - 3600000 * 12,
        status: 'paid',
        notes: 'Full cash payment completed',
      },
    ];
  });

  // Mobile view toggle ('menu' | 'bill')
  const [mobileTab, setMobileTab] = useState<'menu' | 'bill'>('menu');

  // Sync to localStorage (Global and per-Google User for Data Protection)
  useEffect(() => {
    if (currentUser?.email) {
      const safeKey = currentUser.email.replace(/[^a-zA-Z0-9]/g, '_');
      localStorage.setItem(`zcb_khata_${safeKey}`, JSON.stringify(khataEntries));
    }
    localStorage.setItem('zcb_biryani_khata_v3', JSON.stringify(khataEntries));
  }, [khataEntries, currentUser]);

  useEffect(() => {
    if (currentUser?.email) {
      const safeKey = currentUser.email.replace(/[^a-zA-Z0-9]/g, '_');
      localStorage.setItem(`zcb_shop_${safeKey}`, JSON.stringify(shopSettings));
    }
    localStorage.setItem('zcb_biryani_shop_v3', JSON.stringify(shopSettings));
  }, [shopSettings, currentUser]);

  useEffect(() => {
    if (currentUser?.email) {
      const safeKey = currentUser.email.replace(/[^a-zA-Z0-9]/g, '_');
      localStorage.setItem(`zcb_menu_${safeKey}`, JSON.stringify(menuItems));
    }
    localStorage.setItem('zcb_biryani_menu_v3', JSON.stringify(menuItems));
  }, [menuItems, currentUser]);

  useEffect(() => {
    if (currentUser?.email) {
      const safeKey = currentUser.email.replace(/[^a-zA-Z0-9]/g, '_');
      localStorage.setItem(`zcb_orders_${safeKey}`, JSON.stringify(orders));
    }
    localStorage.setItem('zcb_biryani_orders_v3', JSON.stringify(orders));
  }, [orders, currentUser]);

  useEffect(() => {
    localStorage.setItem('zcb_biryani_token_v3', String(tokenNumber));
  }, [tokenNumber]);

  // Handle Google Login Success: Bind data to logged-in user
  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    localStorage.setItem('zcb_auth_user', JSON.stringify(user));
    setIsAuthModalOpen(false);

    // Restore any existing data saved for this user's Google email
    const safeKey = user.email.replace(/[^a-zA-Z0-9]/g, '_');
    const userOrders = localStorage.getItem(`zcb_orders_${safeKey}`);
    if (userOrders) {
      try {
        setOrders(JSON.parse(userOrders));
      } catch (e) {}
    }
    const userKhata = localStorage.getItem(`zcb_khata_${safeKey}`);
    if (userKhata) {
      try {
        setKhataEntries(JSON.parse(userKhata));
      } catch (e) {}
    }
    const userMenu = localStorage.getItem(`zcb_menu_${safeKey}`);
    if (userMenu) {
      try {
        setMenuItems(JSON.parse(userMenu));
      } catch (e) {}
    }
    const userShop = localStorage.getItem(`zcb_shop_${safeKey}`);
    if (userShop) {
      try {
        setShopSettings(JSON.parse(userShop));
      } catch (e) {}
    }
    const isThisOwner = isOwner(user);
    if (isThisOwner) {
      setViewMode('both');
      localStorage.setItem('zcb_preferred_view', 'both');
      posSound.playSuccess();
      setPrintAlertMessage(`👑 Welcome Owner A.H Qureshi! Both Apps (POS + Website) Unlocked!`);
    } else {
      setViewMode('customer_site');
      localStorage.setItem('zcb_preferred_view', 'customer_site');
      setPrintAlertMessage(`Signed in as ${user.displayName || user.email} (Customer Ordering Active)`);
    }
    setTimeout(() => setPrintAlertMessage(null), 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem('zcb_auth_user');
    setCurrentUser(null);
    setViewMode('customer_site');
    localStorage.setItem('zcb_preferred_view', 'customer_site');
  };

  // Dual-Action: Stop Bell AND Pick/Accept Order with a single tap
  const handleAcceptAndStopBell = () => {
    // 1. Immediately silence and stop continuous ringing sound
    posSound.stopContinuousOrderBell();
    setIsBellRinging(false);

    // 2. Accept and lift incoming order if open
    if (incomingOrder) {
      const targetOrder = incomingOrder;
      setActivePrintOrder(targetOrder);
      setIncomingOrder(null);
      setOrders((prev) =>
        prev.map((o) => (o.id === targetOrder.id ? { ...o, orderStatus: 'accepted' } : o))
      );
      if (shopSettings.autoPrintOnComplete) {
        setTimeout(() => {
          window.print();
        }, 150);
      }
    } else {
      // Also accept any pending orders in queue
      setOrders((prev) =>
        prev.map((o) => (o.orderStatus === 'pending' ? { ...o, orderStatus: 'accepted' } : o))
      );
    }

    setPrintAlertMessage('✅ Order accepted & alarm silenced!');
    setTimeout(() => setPrintAlertMessage(null), 3500);
  };

  const handleRingBell = () => {
    if (isBellRinging) {
      handleAcceptAndStopBell();
    } else {
      posSound.startContinuousOrderBell(
        0,
        shopSettings.cashierName || 'Muzammil',
        shopSettings.voiceAlertEnabled !== false
      );
    }
  };

  // Clean up cross-tab BroadcastChannel and Firestore real-time listener for POS device
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

    // Immediate background auto-connect attempt
    tryAutoConnectBluetoothPrinter();

    // Real-time Firestore orders subscription
    const unsubscribeFirestore = subscribeToOrders(
      (newFirestoreOrder) => {
        handleIncomingOnlineOrder(newFirestoreOrder, false);
      },
      (updatedOrder) => {
        setOrders((prev) => {
          const exists = prev.some((o) => o.id === updatedOrder.id);
          if (exists) {
            return prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
          } else {
            return [updatedOrder, ...prev];
          }
        });
      }
    );

    return () => {
      channel?.close();
      unsubscribeFirestore();
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
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === fullOrder.id);
      if (exists) {
        return prev.map((o) => (o.id === fullOrder.id ? { ...o, ...fullOrder } : o));
      } else {
        setTokenNumber((prevToken) => prevToken + 1);
        return [fullOrder, ...prev];
      }
    });

    // Show alert modal and start continuous bell!
    setIncomingOrder(fullOrder);
    if (shopSettings.soundEnabled && !isAlertMuted) {
      // 0 means INFINITE continuous ringing & voice calling until cashier clicks "LIFT ORDER"!
      posSound.startContinuousOrderBell(
        0,
        shopSettings.cashierName || 'Muzammil',
        shopSettings.voiceAlertEnabled !== false
      );
    }

    // Broadcast cross-tab if enabled & save to Firestore cloud database for POS device
    if (broadcast) {
      saveOrderToFirestore(fullOrder);
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

  // Accept and Print Incoming Online Order (For POS Device and Cashier)
  const handleAcceptAndPrintIncoming = async (order: Order) => {
    posSound.stopContinuousOrderBell();
    setActivePrintOrder(order);
    const targetMode = shopSettings.autoPrintTarget || 'both';
    setActivePrintMode(targetMode);
    setIncomingOrder(null);

    // Update status in orders array
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, orderStatus: 'accepted', riderName: order.riderName } : o))
    );

    // Show visual live dispenser on POS screen
    setDispenserOrder(order);

    // Sync status to Firestore for real-time consistency across customer & POS
    updateOrderStatusInFirestore(order.id, 'accepted', order.riderName);

    // Print to Bluetooth directly or system thermal print
    const printResult = await printDirectOrSystem(order, shopSettings, targetMode);

    setPrintAlertMessage(
      printResult.directBluetooth
        ? `📡 Sent to Bluetooth Printer: Token #${order.tokenNumber}`
        : `Online Order Token #${order.tokenNumber} Accepted & Sent to POS Printer!`
    );
    setTimeout(() => {
      setPrintAlertMessage(null);
    }, 4000);
  };

  // Helper to match an order item against a menu item + portion
  const isMatchingOrderItem = (
    it: OrderItem,
    menuItemId: string,
    portionId?: string,
    pLabelUr?: string,
    pLabelEn?: string
  ) => {
    if (it.menuItemId !== menuItemId) return false;
    if (portionId) {
      if (it.portionId && it.portionId === portionId) return true;
      if (pLabelUr && (it.portionLabelUr === pLabelUr || it.portionLabel === pLabelUr)) return true;
      if (pLabelEn && (it.portionLabelEn === pLabelEn || it.portionLabel === pLabelEn)) return true;
      return false;
    }
    // No portionId - match items with no portion
    return !it.portionId && !it.portionLabelUr && !it.portionLabelEn && !it.portionLabel;
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

    const existingIdx = currentOrderItems.findIndex((it) =>
      isMatchingOrderItem(it, item.id, portionId, portionLabelUr, portionLabelEn)
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
        id: `ord-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        menuItemId: item.id,
        portionId: portionId || undefined,
        nameUr: item.nameUr || item.nameHi || item.nameEn || 'Item',
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

  // Decrease Item quantity directly from menu card (Minus button)
  const handleDecreaseItem = (item: MenuItem, portionId?: string) => {
    let portionLabelUr = '';
    let portionLabelEn = '';
    if (portionId && item.portions) {
      const p = item.portions.find((pt) => pt.id === portionId);
      if (p) {
        portionLabelUr = p.labelUr || p.labelHi || '';
        portionLabelEn = p.labelEn || '';
      }
    }

    const idx = currentOrderItems.findIndex((it) =>
      isMatchingOrderItem(it, item.id, portionId, portionLabelUr, portionLabelEn)
    );

    if (idx >= 0) {
      const existing = currentOrderItems[idx];
      if (existing.quantity > 1) {
        handleUpdateQuantity(idx, existing.quantity - 1);
      } else {
        handleRemoveItem(idx);
      }
    }
  };

  // Cancel/Remove item addition completely directly from menu card (Cancel / Remove button)
  const handleCancelItem = (item: MenuItem, portionId?: string) => {
    let portionLabelUr = '';
    let portionLabelEn = '';
    if (portionId && item.portions) {
      const p = item.portions.find((pt) => pt.id === portionId);
      if (p) {
        portionLabelUr = p.labelUr || p.labelHi || '';
        portionLabelEn = p.labelEn || '';
      }
    }

    setCurrentOrderItems((prev) =>
      prev.filter(
        (it) => !isMatchingOrderItem(it, item.id, portionId, portionLabelUr, portionLabelEn)
      )
    );
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

  // Update unit price of an item in active bill (Customize Rate +/- or input)
  const handleUpdateUnitPrice = (index: number, newUnitPrice: number) => {
    if (newUnitPrice < 0) return;
    const updated = [...currentOrderItems];
    updated[index] = {
      ...updated[index],
      unitPrice: newUnitPrice,
      total: updated[index].quantity * newUnitPrice,
    };
    setCurrentOrderItems(updated);
  };

  // Add a dynamic custom item on the fly with custom price
  const handleAddCustomOrderItem = (name: string, price: number, portionLabel?: string) => {
    const cleanName = name.trim() || 'Custom Item';
    const cleanPrice = Math.max(0, price);
    const newItem: OrderItem = {
      id: `custom-item-${Date.now()}`,
      menuItemId: `custom-menu-${Date.now()}`,
      nameUr: cleanName,
      nameEn: cleanName,
      portionLabelEn: portionLabel?.trim() || undefined,
      portionLabel: portionLabel?.trim() || undefined,
      unitPrice: cleanPrice,
      quantity: 1,
      total: cleanPrice,
    };
    setCurrentOrderItems((prev) => [...prev, newItem]);
    if (shopSettings.soundEnabled) {
      posSound.playAddItem();
    }
  };

  // Edit price of existing menu item in catalog
  const handleEditMenuItemPrice = (itemId: string, portionId?: string, newPrice: number = 0) => {
    if (newPrice < 0) return;
    setMenuItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        if (portionId && item.portions) {
          return {
            ...item,
            portions: item.portions.map((p) => (p.id === portionId ? { ...p, price: newPrice } : p)),
          };
        }
        return { ...item, defaultPrice: newPrice };
      })
    );
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
      deliveryAddress: orderData.deliveryAddress,
      deliveryLandmark: orderData.deliveryLandmark,
      deliveryFee: orderData.deliveryFee,
      riderName: orderData.riderName,
      orderSource: 'pos',
      orderStatus: 'accepted',
      items: [...currentOrderItems],
      subtotal: orderData.subtotal !== undefined ? orderData.subtotal : currentSubtotal,
      discountAmount: orderData.discountAmount !== undefined ? orderData.discountAmount : 0,
      totalAmount:
        orderData.totalAmount !== undefined
          ? orderData.totalAmount
          : Math.max(
              0,
              (orderData.subtotal || currentSubtotal) +
                (orderData.deliveryFee || 0) -
                (orderData.discountAmount || 0)
            ),
      paymentMode: orderData.paymentMode || 'cash',
      cashTendered: orderData.cashTendered,
      changeDue: orderData.changeDue,
      createdAt: Date.now(),
    };

    return completedOrder;
  };

  // VIP 1-Click Print Bill & Kitchen KOT
  const handlePrintBill = async (
    orderData: Partial<Order>,
    mode: 'both' | 'bill' | 'kot' = 'both',
    options?: { skipPreview?: boolean }
  ) => {
    if (currentOrderItems.length === 0) {
      console.warn('[POS App] handlePrintBill called with empty cart, ignoring.');
      return;
    }

    const completedOrder = createOrderObject(orderData);
    console.log(
      `[POS App] Generating order Token #${completedOrder.tokenNumber}, Bill #${completedOrder.billNumber}, Total: ${completedOrder.totalAmount}, Mode: ${mode}`,
      options
    );

    // Save to history & update token
    setOrders((prev) => [completedOrder, ...prev]);
    setTokenNumber((prev) => prev + 1);

    // Decrement inventory for tracked items & portions
    setMenuItems((prevItems) => {
      return prevItems.map((item) => {
        let updated = { ...item };
        let itemOrderedQty = 0;

        completedOrder.items.forEach((ordIt) => {
          if (ordIt.menuItemId === item.id) {
            itemOrderedQty += ordIt.quantity;
            if (ordIt.portionId && updated.portions) {
              updated.portions = updated.portions.map((p) => {
                if (p.id === ordIt.portionId && p.trackInventory) {
                  const currentStock = p.stockQuantity ?? 0;
                  return { ...p, stockQuantity: Math.max(0, currentStock - ordIt.quantity) };
                }
                return p;
              });
            }
          }
        });

        if (updated.trackInventory) {
          const currentStock = updated.stockQuantity ?? 0;
          updated.stockQuantity = Math.max(0, currentStock - itemOrderedQty);
        }

        return updated;
      });
    });

    // Set order and print mode for print container
    setActiveSummaryKotOrders(null);
    setActivePrintMode(mode);
    setActivePrintOrder(completedOrder);

    // Clear current active cart
    setCurrentOrderItems([]);

    // Small delay to ensure ThermalReceipt is mounted in DOM before system print
    await new Promise((res) => setTimeout(res, 50));

    // Print to Bluetooth printer directly or system dialog
    console.log('[POS App] Executing printDirectOrSystem for order:', completedOrder.id);
    const printResult = await printDirectOrSystem(completedOrder, shopSettings, mode, options);
    console.log('[POS App] printDirectOrSystem result:', printResult);

    if ((printResult as any).requiresConnection) {
      setIsPrinterSetupOpen(true);
      setPrintAlertMessage('⚠️ پرنٹر منسلک نہیں ہے۔ براہ کرم پرنٹر کو بلوٹوتھ سے جوڑیں تاکہ ڈائریکٹ بل نکلے (پی ڈی ایف نہیں)!');
      return;
    }

    // Display alert
    const alertText = printResult.directBluetooth
      ? `📡 Sent to Bluetooth Printer: Bill #${completedOrder.tokenNumber} (${mode.toUpperCase()})`
      : mode === 'kot'
      ? `Kitchen KOT #${completedOrder.tokenNumber} sent to printer!`
      : mode === 'bill'
      ? `Customer Bill #${completedOrder.tokenNumber} printed!`
      : `Order #${completedOrder.tokenNumber} (Customer Bill + Kitchen KOT) printed!`;

    setPrintAlertMessage(alertText);
    setTimeout(() => {
      setPrintAlertMessage(null);
    }, 4000);
  };

  // Re-print order from history
  const handleReprintOrder = async (order: Order, mode: 'both' | 'bill' | 'kot' = 'both') => {
    console.log(`[POS App] Re-printing Order Token #${order.tokenNumber}, Mode: ${mode}`);
    setActiveSummaryKotOrders(null);
    setActivePrintMode(mode);
    setActivePrintOrder(order);
    await new Promise((res) => setTimeout(res, 50));
    const res = await printDirectOrSystem(order, shopSettings, mode);
    console.log('[POS App] Re-print result:', res);
    if ((res as any).requiresConnection) {
      setIsPrinterSetupOpen(true);
      setPrintAlertMessage('⚠️ پرنٹر منسلک نہیں ہے۔ براہ کرم پرنٹر کو بلوٹوتھ سے جوڑیں۔');
    }
  };

  // Print Consolidated Summary KOT for bulk kitchen preparation
  const handlePrintSummaryKot = async (selectedOrders: Order[]) => {
    if (!selectedOrders || selectedOrders.length === 0) return;
    setActivePrintOrder(null);
    setActiveSummaryKotOrders(selectedOrders);
    await new Promise((res) => setTimeout(res, 50));
    const res = await printSummaryKotDirectOrSystem(selectedOrders, shopSettings);
    setPrintAlertMessage(
      res.directBluetooth
        ? `📡 Sent Summary KOT (${selectedOrders.length} bills) to Bluetooth Printer!`
        : `🍳 Consolidated Summary KOT (${selectedOrders.length} bills) printed for Kitchen!`
    );
    setTimeout(() => {
      setPrintAlertMessage(null);
    }, 4500);
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

  // Delete an individual order from history
  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setPrintAlertMessage('Order deleted successfully');
    setTimeout(() => {
      setPrintAlertMessage(null);
    }, 3000);
  };

  // Clear all orders from history
  const handleClearAllOrders = () => {
    setOrders([]);
    localStorage.removeItem('zcb_biryani_orders_v3');
    setPrintAlertMessage('All order history cleared');
    setTimeout(() => {
      setPrintAlertMessage(null);
    }, 3000);
  };

  // Render Cashier POS Interface (Menu + Billing + Thermal Print + Header)
  const renderPosContent = () => {
    return (
      <div id="main-app-container" className="flex flex-col flex-1 min-h-0 bg-stone-950">
        {/* Google Maps Quota Warning Banner */}
      {hasMapQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Continuous Ringing Emergency Banner (Single Tap: Stop Bell & Lift Order) */}
      {isBellRinging && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-4 py-2.5 flex items-center justify-between shadow-2xl sticky top-0 z-40 border-b-2 border-white animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-yellow-300"></span>
            </span>
            <Bell className="w-5 h-5 text-yellow-300 animate-bounce shrink-0" />
            <div className="text-xs sm:text-sm font-black flex items-center gap-2 flex-wrap">
              <span>🚨 Alarm Active: "Attention {shopSettings.cashierName || 'Muzammil'}, please lift order!"</span>
              {incomingOrder && (
                <span className="bg-black/40 px-2 py-0.5 rounded text-amber-300 text-xs font-mono">
                  #{incomingOrder.tokenNumber}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAcceptAndStopBell}
              className="px-4 py-1.5 bg-white hover:bg-stone-100 text-red-600 font-black rounded-xl text-xs sm:text-sm shadow-xl flex items-center gap-1.5 cursor-pointer ring-2 ring-red-400 active:scale-95 transition-all"
              title="Silence bell and accept order with one click"
            >
              <BellOff className="w-4 h-4 text-red-600" />
              <span>🔔 Accept Order & Silence Alarm</span>
            </button>
            <button
              onClick={() => {
                posSound.stopContinuousOrderBell();
                setIsBellRinging(false);
              }}
              className="px-2.5 py-1.5 bg-black/40 hover:bg-black/60 text-red-100 border border-white/40 rounded-xl text-xs font-bold cursor-pointer"
              title="Silence alarm only"
            >
              🛑 Silence Sound
            </button>
          </div>
        </div>
      )}

      {/* Header with Google Account Gate & Continuous Bell */}
      <Header
        shop={shopSettings}
        orders={orders}
        currentUser={currentUser}
        onOpenGoogleAuth={() => setIsAuthModalOpen(true)}
        isBellRinging={isBellRinging}
        onAcceptAndStopBell={handleAcceptAndStopBell}
        onRingBell={handleRingBell}
        onOpenEditShop={() => setIsEditShopOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenKhata={() => setIsKhataOpen(true)}
        onOpenPrinterSetup={() => setIsPrinterSetupOpen(true)}
        onOpenPosSettings={() => setIsPosSettingsOpen(true)}
        onOpenShareLink={() => setIsShareLinkOpen(true)}
        onOpenGmail={() => setIsGmailOpen(true)}
        onOpenGoogleMaps={() => setIsGoogleMapsOpen(true)}
        soundEnabled={shopSettings.soundEnabled}
        onToggleSound={() =>
          setShopSettings((prev) => ({
            ...prev,
            soundEnabled: !prev.soundEnabled,
          }))
        }
        onSwitchToCustomerSite={() => handleSwitchViewMode('customer_site')}
        pendingOnlineCount={orders.filter((o) => o.orderStatus === 'pending').length}
      />

      {/* Print Success Toast */}
      {printAlertMessage && (
        <div className="fixed top-20 right-4 z-50 bg-amber-500 text-stone-950 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 animate-bounce text-sm font-black border border-amber-300">
          <CheckCircle className="w-5 h-5 text-stone-950" />
          <span>{printAlertMessage}</span>
        </div>
      )}

      {/* Mobile App View Switcher - Touch-Friendly Native App Tabs */}
      <div className="lg:hidden bg-stone-950 border-b border-stone-800 p-2.5 relative z-20 shadow-lg">
        <div className="grid grid-cols-2 gap-2 bg-stone-900/90 p-1.5 rounded-2xl border border-stone-800">
          <button
            type="button"
            onClick={() => setMobileTab('menu')}
            className={`py-3 px-3 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
              mobileTab === 'menu'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 shadow-md ring-2 ring-amber-300'
                : 'text-stone-300 hover:text-white bg-stone-950/60'
            }`}
          >
            <Utensils className="w-4 h-4 stroke-[2.5]" />
            <span>1. Menu Items ({menuItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('bill')}
            className={`py-3 px-3 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
              mobileTab === 'bill'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 shadow-md ring-2 ring-amber-300'
                : 'text-stone-300 hover:text-white bg-stone-950/60'
            }`}
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            <span>2. Active Bill ({currentOrderItems.length})</span>
            {currentOrderItems.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-stone-950 text-amber-300 font-mono text-[11px] font-black ring-1 ring-amber-400/50">
                {shopSettings.currencySymbol}{currentSubtotal}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area: Responsive POS Columns */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 pb-28 lg:pb-6">
        {/* Menu Section (Left - 7 cols) */}
        <section
          className={`lg:col-span-7 h-auto lg:h-[calc(100vh-140px)] min-h-0 ${
            mobileTab === 'menu' ? 'block' : 'hidden lg:block'
          }`}
        >
          <MenuSection
            menuItems={menuItems}
            currentOrderItems={currentOrderItems}
            shop={shopSettings}
            onAddItem={handleAddItem}
            onDecreaseItem={handleDecreaseItem}
            onCancelItem={handleCancelItem}
            onClearBill={handleClearBill}
            onOpenAddItemModal={() => setIsAddItemOpen(true)}
            onEditPrice={handleEditMenuItemPrice}
            onAddCustomItem={handleAddCustomOrderItem}
            soundEnabled={shopSettings.soundEnabled}
          />
        </section>

        {/* Active Bill / POS Cart Section (Right - 5 cols) */}
        <section
          className={`lg:col-span-5 h-auto lg:h-[calc(100vh-140px)] min-h-0 ${
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
            onOpenMenu={() => setMobileTab('menu')}
            soundEnabled={shopSettings.soundEnabled}
            onOpenPrinterSetup={() => setIsPrinterSetupOpen(true)}
            onUpdateShop={(newShop) => setShopSettings(newShop)}
          />
        </section>
      </main>

      {/* Mobile Sticky Floating Order Pill */}
      {mobileTab === 'menu' && currentOrderItems.length > 0 && (
        <div
          className="lg:hidden fixed bottom-3 inset-x-3 p-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-stone-950 rounded-2xl shadow-2xl border-2 border-white z-40 flex items-center justify-between cursor-pointer animate-in fade-in active:scale-[0.99] transition-transform"
          onClick={() => setMobileTab('bill')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-950 text-amber-300 flex items-center justify-center font-black font-mono text-base shadow-md">
              {currentOrderItems.reduce((acc, it) => acc + it.quantity, 0)}
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-stone-900">
                {currentOrderItems.length} Dishes In Bill • Token #{tokenNumber}
              </div>
              <div className="text-xl font-black text-stone-950 font-mono leading-none">
                {shopSettings.currencySymbol} {currentSubtotal}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMobileTab('bill');
            }}
            className="px-3.5 py-2 bg-stone-950 text-amber-300 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-xl active:scale-95 transition-transform cursor-pointer border border-amber-400"
          >
            <span>View Bill & Discount</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      )}
    </div>
    );
  };

  const pendingOnlineOrders = orders.filter(
    (o) => o.orderSource === 'online_website' && o.orderStatus === 'pending'
  );
  const pendingOnlineOrdersCount = pendingOnlineOrders.length;
  const latestPendingOrder = pendingOnlineOrders[0] || null;

  return (
    <div id="main-app-container" className="min-h-screen bg-stone-950 flex flex-col font-sans text-stone-100 selection:bg-amber-500 selection:text-stone-950">
      {/* 1-Click Print Target Area (Hidden on screen, shown in print) */}
      {activePrintOrder && (
        <ThermalReceipt
          order={activePrintOrder}
          shop={shopSettings}
          qrCodeDataUrl={upiQrDataUrl}
          isPrintOnly={true}
          printMode={activePrintMode}
        />
      )}
      {activeSummaryKotOrders && activeSummaryKotOrders.length > 0 && !activePrintOrder && (
        <SummaryKotReceipt
          summaryData={aggregateOrdersForSummaryKot(activeSummaryKotOrders)}
          shop={shopSettings}
          isPrintOnly={true}
        />
      )}

      {/* Main Screen Content Wrapper (Hidden during @media print) */}
      <div id="main-app-content" className="flex-1 flex flex-col">
        {/* 👑 SHOP OWNER MASTER BAR - Unlocks both apps simultaneously */}
        {isUserOwner && (
          <div
            id="owner-master-control-bar"
            className="bg-gradient-to-r from-amber-600 via-stone-900 to-amber-700 text-white px-3 sm:px-4 py-1.5 flex items-center justify-between border-b border-amber-500/50 relative z-40 shadow-xl flex-wrap gap-2 text-xs select-none"
          >
            <div className="flex items-center gap-2">
              <div className="bg-amber-400 text-stone-950 px-2 py-0.5 rounded-full font-black text-[11px] flex items-center gap-1 shadow-sm">
                <Crown className="w-3.5 h-3.5 text-stone-950" />
                <span>👑 SHOP OWNER</span>
              </div>
              <span className="font-mono text-amber-200 font-bold text-xs">
                {currentUser?.email}
              </span>
              <span className="text-emerald-400 text-[11px] font-bold hidden md:inline">
                ✓ Both Apps Unlocked
              </span>
            </div>

            {/* Mode Selector for Owner: Both Together vs POS Only vs Customer Site Only */}
            <div className="flex bg-stone-950/90 p-1 rounded-xl border border-amber-500/40 gap-1 text-xs">
              <button
                type="button"
                onClick={() => handleSwitchViewMode('both')}
                className={`px-3 py-1 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'both'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-md ring-1 ring-amber-300'
                    : 'text-stone-300 hover:text-white'
                }`}
                title="Run both apps side-by-side on one screen"
              >
                <span>⚡ Dono Apps Ek Sath (Dual Screen)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchViewMode('pos')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'pos'
                    ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                    : 'text-stone-300 hover:text-white'
                }`}
                title="Full-screen POS terminal"
              >
                <span>🏪 POS Terminal</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchViewMode('customer_site')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'customer_site'
                    ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                    : 'text-stone-300 hover:text-white'
                }`}
                title="Full-screen Customer Website"
              >
                <span>🌐 Customer Website</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="text-stone-300 hover:text-amber-300 text-xs font-semibold underline cursor-pointer"
              >
                Account / Logout
              </button>
            </div>
          </div>
        )}

      {/* Offline Mode Banner (Assures Cashier that POS Billing & Thermal Printing continue seamlessly) */}
      {isOffline && (
        <div className="bg-amber-500 text-stone-950 px-4 py-1.5 flex items-center justify-between text-xs font-black border-b border-amber-400 z-30 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-stone-950 animate-ping"></span>
            <span>⚡ OFFLINE POS MODE: POS billing, order management & thermal printing work 100% offline!</span>
          </div>
          <span className="text-[11px] bg-stone-950 text-amber-300 px-2 py-0.5 rounded-md font-mono">
            Offline Storage Active
          </span>
        </div>
      )}

      {/* Persistent Unlifted Order Bar (Rings and Alerts until cashier clicks 'LIFT ORDER!') */}
      {latestPendingOrder && !incomingOrder && (
        <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between shadow-2xl z-40 border-b-2 border-amber-300 animate-pulse">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-9 h-9 rounded-full bg-white text-red-600 flex items-center justify-center font-black animate-bounce shrink-0 shadow-md">
              <Bell className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="truncate">
              <div className="text-xs font-black uppercase tracking-wider text-amber-200">
                🚨 Alarm Ringing! New online order waiting to be accepted
              </div>
              <div className="text-sm font-black truncate">
                Token #{latestPendingOrder.tokenNumber} • {latestPendingOrder.customerName} ({latestPendingOrder.items.length} items - Rs {latestPendingOrder.totalAmount})
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
                  shopSettings.cashierName || 'Muzammil',
                  shopSettings.voiceAlertEnabled !== false
                );
              }}
              className="px-3.5 py-2 bg-stone-950 hover:bg-stone-900 text-amber-300 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 border border-amber-400"
            >
              <span>View Details</span>
            </button>
            <button
              type="button"
              onClick={() => handleAcceptAndPrintIncoming(latestPendingOrder)}
              className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-stone-950 rounded-xl text-xs sm:text-sm font-black shadow-lg transition-all active:scale-95 cursor-pointer ring-2 ring-white flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4 stroke-[3]" />
              <span>ACCEPT & LIFT ORDER</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Viewport Content based on Role & Mode */}
      {!isUserOwner || viewMode === 'customer_site' ? (
        // Public Customer Website (For all public visitors or when owner chooses customer view)
        <CustomerOrderingSite
          shop={shopSettings}
          menuItems={menuItems}
          onPlaceOrder={(order) => {
            handleIncomingOnlineOrder(order);
          }}
          onSwitchToPOS={() => handleSwitchViewMode('pos')}
          isOwner={isUserOwner}
          currentUser={currentUser}
          onOpenLogin={() => setIsAuthModalOpen(true)}
        />
      ) : viewMode === 'both' ? (
        // ⚡ DUAL APP MODE: BOTH APPS RUNNING SIMULTANEOUSLY SIDE-BY-SIDE
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-0 min-h-[calc(100vh-42px)]">
          {/* Left Column (7 cols): POS Terminal */}
          <div className="xl:col-span-7 border-b xl:border-b-0 xl:border-r border-stone-800 flex flex-col bg-stone-950">
            <div className="bg-stone-900/90 px-4 py-2 border-b border-stone-800 flex items-center justify-between text-xs sticky top-0 z-20">
              <span className="font-black text-amber-300 flex items-center gap-1.5 uppercase">
                <span>🏪 APP 1: CASHIER POS TERMINAL</span>
              </span>
              <span className="text-stone-400 text-[11px]">Billing, Thermal Print, Kitchen KOT</span>
            </div>
            {renderPosContent()}
          </div>

          {/* Right Column (5 cols): Live Customer Ordering Website */}
          <div className="xl:col-span-5 flex flex-col bg-stone-950 border-t xl:border-t-0">
            <div className="bg-emerald-950/70 px-4 py-2 border-b border-emerald-500/30 flex items-center justify-between text-xs sticky top-0 z-20">
              <span className="font-black text-emerald-300 flex items-center gap-1.5 uppercase">
                <span>🌐 APP 2: LIVE CUSTOMER WEBSITE</span>
              </span>
              <span className="text-emerald-400 text-[11px] font-bold animate-pulse">
                ● Live Online Ordering
              </span>
            </div>
            <CustomerOrderingSite
              shop={shopSettings}
              menuItems={menuItems}
              onPlaceOrder={(order) => {
                handleIncomingOnlineOrder(order);
              }}
              onSwitchToPOS={() => handleSwitchViewMode('pos')}
              isOwner={true}
              currentUser={currentUser}
              onOpenLogin={() => setIsAuthModalOpen(true)}
            />
          </div>
        </div>
      ) : (
        // Fullscreen POS Terminal Mode (For Owner)
        renderPosContent()
      )}

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
              shopSettings.cashierName || 'Muzammil',
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
        onOpenPrinterSetup={() => setIsPrinterSetupOpen(true)}
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
        onDeleteOrder={handleDeleteOrder}
        onClearAllOrders={handleClearAllOrders}
        onPrintSummaryKot={handlePrintSummaryKot}
      />

      <ReceiptPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        order={previewOrder}
        shop={shopSettings}
        qrCodeDataUrl={upiQrDataUrl}
        onPrint={(mode) => {
          if (previewOrder) {
            handleReprintOrder(previewOrder, mode || 'both');
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

      {/* Customer Ordering Website Link & QR Share Modal */}
      <ShareLinkModal
        isOpen={isShareLinkOpen}
        onClose={() => setIsShareLinkOpen(false)}
        shop={shopSettings}
      />

      {/* Printer Setup & Connectivity Modal (USB Cable, Bluetooth, WiFi LAN, HDMI Display) */}
      <PrinterSetupModal
        isOpen={isPrinterSetupOpen}
        onClose={() => setIsPrinterSetupOpen(false)}
        shop={shopSettings}
        onUpdateShop={setShopSettings}
        onTestPrint={(customOrder?: Order) => {
          const testOrder = customOrder || (orders.length > 0 ? orders[0] : null) || {
            id: `test-${Date.now()}`,
            billNumber: 'ZCB-TEST-001',
            tokenNumber: 1,
            dateStr: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            timeStr: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            customerName: 'Sunmi V2s POS Test Bill',
            customerPhone: '0333-7018183',
            orderType: 'takeaway',
            orderStatus: 'accepted',
            orderSource: 'pos',
            items: [
              {
                id: 't-1',
                menuItemId: 'biryani-chicken',
                nameEn: 'Chicken Biryani (Test)',
                nameUr: 'Chicken Biryani',
                portionLabelEn: '01 KG',
                portionLabel: '01 KG',
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
          handleReprintOrder(testOrder, 'bill');
        }}
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

      {/* Gmail Workspace Integration Modal (Receipts, Reports, Inbox) */}
      <GmailModal
        isOpen={isGmailOpen}
        onClose={() => setIsGmailOpen(false)}
        shop={shopSettings}
        orders={orders}
        khataEntries={khataEntries}
      />

      {/* Google Maps Live Delivery Radar & Route Map Modal */}
      <GoogleDeliveryMapModal
        isOpen={isGoogleMapsOpen}
        onClose={() => setIsGoogleMapsOpen(false)}
        shop={shopSettings}
        orders={orders}
        selectedOrder={orders.find((o) => o.orderType === 'delivery') || null}
      />

      {/* 3D Biryani Model Viewer & Interactive Physics Modal */}
      <Biryani3DModal
        isOpen={is3DBiryaniModalOpen}
        onClose={() => setIs3DBiryaniModalOpen(false)}
        shopName={shopSettings.shopNameEn}
      />

      {/* Smart POS Device & Auto-Order Settings Modal */}
      <PosDeviceSettingsModal
        isOpen={isPosSettingsOpen}
        onClose={() => setIsPosSettingsOpen(false)}
        shop={shopSettings}
        onOpenPrinterSetup={() => setIsPrinterSetupOpen(true)}
        onSave={(updated) => {
          setShopSettings(updated);
          localStorage.setItem('zcb_biryani_shop_v3', JSON.stringify(updated));
        }}
        onTestPrint={async () => {
          const testOrder = orders[0] || {
            id: `test-pos-${Date.now()}`,
            billNumber: 'ZCB-BILL-TEST',
            tokenNumber: 99,
            dateStr: new Date().toLocaleDateString('en-GB'),
            timeStr: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            customerName: 'POS Machine Test Bill',
            customerPhone: '0333-7018183',
            orderType: 'takeaway',
            orderStatus: 'accepted',
            items: [
              {
                id: 't-1',
                menuItemId: 'biryani-chicken',
                nameEn: 'Chicken Biryani (Test)',
                nameUr: 'Chicken Biryani',
                portionLabelEn: '01 KG',
                portionLabel: '01 KG',
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
          setActivePrintOrder(testOrder as Order);
          const targetMode = shopSettings.autoPrintTarget || 'both';
          setActivePrintMode(targetMode);
          await printDirectOrSystem(testOrder as Order, shopSettings, targetMode);
        }}
      />

      {/* Google Sign-In & Security Modal (Non-blocking) */}
      <GoogleAuthGateModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        isMandatory={false}
      />

      {/* Live POS Bill Dispenser Modal - Visually animates the bill coming out of the printer on screen */}
      <LiveBillDispenserModal
        isOpen={!!dispenserOrder}
        order={dispenserOrder}
        shop={shopSettings}
        qrCodeDataUrl={upiQrDataUrl}
        onClose={() => setDispenserOrder(null)}
        onUpdateShop={setShopSettings}
      />
      </div>
    </div>
  );
}

