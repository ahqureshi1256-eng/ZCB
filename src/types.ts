export interface MenuItemPortion {
  id: string;
  labelUr: string;
  labelEn: string;
  labelHi?: string;
  price: number;
  weightOrQty?: string;
}

export interface MenuItem {
  id: string;
  nameUr: string;
  nameEn: string;
  nameHi?: string;
  category: 'biryani' | 'drinks' | 'kababs' | 'sides' | 'dessert' | 'other';
  defaultPrice?: number;
  portions?: MenuItemPortion[];
  imageUrl?: string;
  isVeg?: boolean;
  popular?: boolean;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
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
  logoUrl: string;
  bannerUrl: string;
  currencySymbol: string;
  printerWidth: '80mm' | '58mm';
  thermalPaperWidth?: '80mm' | '58mm';
  autoPrintOnComplete: boolean;
  printCopies: number;
  soundEnabled: boolean;
  cashierName?: string;
  voiceAlertEnabled?: boolean;
  ntnNumber?: string;
  fssai?: string;
  upiId?: string;
  upiPayeeName?: string;
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



