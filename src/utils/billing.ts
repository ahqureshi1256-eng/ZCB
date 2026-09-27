import QRCode from 'qrcode';
import { Order, SummaryKotData, SummaryKotItem } from '../types';

export function formatPrice(amount: number, symbol: string = 'Rs.'): string {
  const formatted = new Intl.NumberFormat('en-PK', {
    maximumFractionDigits: 0,
  }).format(amount || 0);
  return `${symbol} ${formatted}`;
}

export const formatINR = formatPrice;

export function generateBillNumber(tokenNumber: number): string {
  const today = new Date();
  const dateCode = today.toISOString().slice(2, 10).replace(/-/g, '');
  return `ZCB-BILL-${String(tokenNumber).padStart(3, '0')}`;
}

export async function generateReceiptQrCodeDataUrl(
  billNumber: string,
  totalAmount: number,
  shopName: string,
  dateStr: string
): Promise<string> {
  const qrContent = `ZCB ZAIQA CHICKEN BIRYANI\nBill ID: ${billNumber}\nDate: ${dateStr}\nTotal: Rs. ${totalAmount}\nVerified Authentic Receipt`;

  try {
    const dataUrl = await QRCode.toDataURL(qrContent, {
      width: 180,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}

export async function generateUPIQrCodeDataUrl(
  upiId: string,
  payeeName: string,
  amount: number,
  billNumber: string
): Promise<string> {
  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amount}&cu=PKR&tn=${encodeURIComponent(billNumber)}`;

  try {
    const dataUrl = await QRCode.toDataURL(upiString, {
      width: 180,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}

/**
 * Group multiple selected bills together and consolidate their items, quantities,
 * tokens, notes, and order types for bulk kitchen preparation (Summary KOT).
 */
export function aggregateOrdersForSummaryKot(orders: Order[]): SummaryKotData {
  const sortedOrders = [...orders].sort((a, b) => a.tokenNumber - b.tokenNumber);

  const tokens = sortedOrders.map((o) => o.tokenNumber);
  const billNumbers = sortedOrders.map((o) => o.billNumber);

  const orderTypeCounts = {
    takeaway: 0,
    dine_in: 0,
    delivery: 0,
  };

  const itemMap = new Map<string, SummaryKotItem>();
  const notes: Array<{ token: number; note: string; billNumber: string }> = [];

  sortedOrders.forEach((order) => {
    if (order.orderType === 'takeaway') orderTypeCounts.takeaway++;
    else if (order.orderType === 'delivery') orderTypeCounts.delivery++;
    else orderTypeCounts.dine_in++;

    if (order.notes && order.notes.trim()) {
      notes.push({
        token: order.tokenNumber,
        note: order.notes.trim(),
        billNumber: order.billNumber,
      });
    }

    order.items.forEach((item) => {
      const portionKey = (item.portionId || item.portionLabelEn || item.portionLabelUr || item.portionLabel || 'regular')
        .toLowerCase()
        .trim();
      const itemKey = `${item.menuItemId || item.nameEn || item.nameUr}___${portionKey}`;

      const existing = itemMap.get(itemKey);
      if (existing) {
        existing.totalQuantity += item.quantity;
        if (!existing.tokens.includes(order.tokenNumber)) {
          existing.tokens.push(order.tokenNumber);
        }
      } else {
        itemMap.set(itemKey, {
          key: itemKey,
          nameEn: item.nameEn || item.nameUr || 'Item',
          nameUr: item.nameUr || item.nameEn || 'Item',
          portionLabelEn: item.portionLabelEn || item.portionLabel,
          portionLabelUr: item.portionLabelUr || item.portionLabel,
          totalQuantity: item.quantity,
          tokens: [order.tokenNumber],
        });
      }
    });
  });

  const aggregatedItems = Array.from(itemMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  const totalItemCount = aggregatedItems.reduce((sum, it) => sum + it.totalQuantity, 0);

  const now = new Date();
  const batchDate = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const batchTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return {
    summaryId: `SUM-KOT-${Date.now().toString().slice(-6)}`,
    batchDate,
    batchTime,
    totalOrders: sortedOrders.length,
    tokens,
    billNumbers,
    orderTypeCounts,
    items: aggregatedItems,
    totalItemCount,
    notes,
    orders: sortedOrders,
  };
}


