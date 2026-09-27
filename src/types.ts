export interface MenuItemPortion {
  id: string;
  labelUr: string;
  labelEn: string;
  labelHi?: string;
  price: number;
  weightOrQty?: string;
  trackInventory?: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
}

export interface MenuItem {
  id: string;
  nameUr: string;
  nameEn: string;
  nameHi?: string;
  category: 'biryani' | 'drinks' | 'kababs' | 'sides' | 'dessert' | 'other' | (string & {});
  defaultPrice?: number;
  portions?: MenuItemPortion[];
  imageUrl?: string;
  isVeg?: boolean;
  popular?: boolean;
  trackInventory?: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  portionId?: string;
  nameUr: string;
  nameEn: string;
  nameHi?: string;
  portionLabelUr?: string;
  portionLabelEn?: string;
  portionLabel?: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Order {
  id: string;
  billNumber: string;
  tokenNumber: number;
  dateStr: string;
  timeStr: string;
  customerName?: string;
  customerPhone?: string;
  orderType: 'takeaway' | 'dine_in' | 'delivery';
  tableNumber?: string;
  // Bike / Home Delivery fields
  deliveryAddress?: string;
  deliveryLandmark?: string;
  deliveryArea?: string;
  deliveryFee?: number;
  riderName?: string;
  orderSource?: 'pos' | 'online_website' | 'whatsapp';
  orderStatus?: 'pending' | 'accepted' | 'preparing' | 'on_bike' | 'delivered' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMode: 'cash' | 'online' | 'card' | 'upi';
  cashTendered?: number;
  changeDue?: number;
  notes?: string;
  createdAt: number;
}

export interface ShopSettings {
  shopNameUr: string;
  shopNameEn: string;
  shopName?: string;
  shortName: string;
  taglineUr: string;
  taglineEn: string;
  address: string;
  phone: string;
  footerNoteUr: string;
  footerNoteEn: string;
  customReceiptFooter?: string;
  logoUrl: string;
  bannerUrl: string;
  currencySymbol: string;
  defaultDeliveryFee?: number;
  printerWidth: '80mm' | '58mm';
  thermalPaperWidth?: '80mm' | '58mm';
  preferredPrintMethod?: 'mobile_system' | 'direct_bluetooth' | 'rawbt_intent' | 'usb_cable' | 'wifi_lan';
  bluetoothDeviceName?: string;
  usbDeviceName?: string;
  wifiPrinterIp?: string;
  wifiPrinterPort?: number;
  autoPrintOnComplete: boolean;
  printCopies: number;
  soundEnabled: boolean;
  cashierName?: string;
  voiceAlertEnabled?: boolean;
  ntnNumber?: string;
  fssai?: string;
  upiId?: string;
  upiPayeeName?: string;
  // Dedicated POS Machine & Auto-Order Settings
  posDeviceMode?: boolean;
  autoAcceptOnlineOrders?: boolean;
  autoPrintOnAccept?: boolean;
  autoPrintTarget?: 'bill' | 'kot' | 'both';
  posKeepScreenAwake?: boolean;
  posLoudAlert?: boolean;
  posMachineType?: 'sunmi' | 'android_pos' | 'thermal_usb_bt' | 'generic';
  autoCutPaper?: boolean;
}

export type KhataType = 'chicken' | 'rice' | 'masala' | 'oil' | 'packaging' | 'gas_fuel' | 'labour' | 'customer_udhaar' | 'other';

export interface KhataEntry {
  id: string;
  type: KhataType;
  supplierOrPartyName: string;
  description: string;
  amount: number;
  paidAmount: number;
  balanceDue: number; // Udhaar amount remaining
  dateStr: string;
  timeStr: string;
  createdAt: number;
  status: 'paid' | 'pending_udhaar' | 'partial';
  notes?: string;
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  authMethod?: 'google' | 'email';
}

export interface SummaryKotItem {
  key: string;
  nameEn: string;
  nameUr: string;
  portionLabelEn?: string;
  portionLabelUr?: string;
  totalQuantity: number;
  tokens: number[];
}

export interface SummaryKotData {
  summaryId: string;
  batchTime: string;
  batchDate: string;
  totalOrders: number;
  tokens: number[];
  billNumbers: string[];
  orderTypeCounts: {
    takeaway: number;
    dine_in: number;
    delivery: number;
  };
  items: SummaryKotItem[];
  totalItemCount: number;
  notes: Array<{ token: number; note: string; billNumber: string }>;
  orders: Order[];
}



