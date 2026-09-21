import QRCode from 'qrcode';

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
  return `ZTV-${dateCode}-${String(tokenNumber).padStart(3, '0')}`;
}

export async function generateReceiptQrCodeDataUrl(
  billNumber: string,
  totalAmount: number,
  shopName: string,
  dateStr: string
): Promise<string> {
  const qrContent = `ZTV ZAIKA CHICKEN BIRYANI\nBill: ${billNumber}\nDate: ${dateStr}\nTotal: Rs. ${totalAmount}\nVerified Authentic Receipt`;

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


