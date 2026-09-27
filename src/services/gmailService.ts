import { getAccessToken } from './firebaseAuth';
import { Order, ShopSettings } from '../types';

export interface EmailMessage {
  id: string;
  snippet: string;
  subject?: string;
  from?: string;
  date?: string;
}

/**
 * Creates RFC 2822 base64url encoded email message
 */
function createRawEmail(to: string, fromEmail: string, subject: string, htmlBody: string): string {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    `To: ${to}`,
    `From: ${fromEmail}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody,
  ];
  const message = messageParts.join('\r\n');
  return btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send an Order Receipt or Daily Report Email via Gmail API
 */
export async function sendGmailMessage(params: {
  to: string;
  fromEmail: string;
  subject: string;
  htmlBody: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Gmail access token not found. Please sign in with Google first.' };
  }

  try {
    const raw = createRawEmail(params.to, params.fromEmail, params.subject, params.htmlBody);
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to send email (HTTP ${response.status})`);
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('Gmail send error:', err);
    return { success: false, error: err.message || 'Failed to send email via Gmail' };
  }
}

/**
 * Generate formatted HTML receipt email for a Biryani order
 */
export function generateOrderReceiptHtml(order: Order, shop: ShopSettings): string {
  const shopName = shop.shopNameEn || shop.shopNameUr || 'Zaiqa Chicken Biryani';
  const shopTagline = shop.taglineUr || shop.taglineEn || 'Food Prepared Fresh on Order';
  const dateFormatted = new Date(order.createdAt).toLocaleString();

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 8px; font-weight: bold; color: #111827;">${item.nameEn || item.nameUr} ${item.portionLabelEn || item.portionLabelUr ? `(${item.portionLabelEn || item.portionLabelUr})` : ''}</td>
        <td style="padding: 10px 8px; text-align: center; color: #4b5563;">x${item.quantity}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: #111827;">${shop.currencySymbol}${item.total.toLocaleString()}</td>
      </tr>
    `
    )
    .join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #fed7aa; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #d97706, #f59e0b); padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">${shopName}</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.95;">${shopTagline}</p>
        <div style="margin-top: 12px; display: inline-block; background-color: rgba(0,0,0,0.25); padding: 4px 14px; border-radius: 12px; font-size: 12px; font-weight: bold;">
          Order #${order.billNumber} • ${dateFormatted}
        </div>
      </div>

      <div style="padding: 24px;">
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 6px 0; font-size: 14px; color: #92400e; font-weight: bold;">Customer Information:</h3>
          <p style="margin: 0; font-size: 13px; color: #374151;"><strong>Name:</strong> ${order.customerName || 'Walk-in Customer'}</p>
          ${order.customerPhone ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #374151;"><strong>Phone:</strong> ${order.customerPhone}</p>` : ''}
          ${order.deliveryAddress ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #374151;"><strong>Delivery Address:</strong> ${order.deliveryAddress}</p>` : ''}
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #374151;"><strong>Order Type:</strong> ${order.orderType === 'delivery' ? '🛵 Home Delivery' : order.orderType === 'dine_in' ? '🍽️ Dine-In' : '🥡 Takeaway'}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <thead>
            <tr style="background-color: #f3f4f6; color: #374151; font-size: 12px; text-transform: uppercase;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="border-top: 2px dashed #e5e7eb; padding-top: 16px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px;">
            <span style="color: #6b7280;">Subtotal:</span>
            <span style="font-weight: 600; color: #111827;">${shop.currencySymbol}${order.subtotal.toLocaleString()}</span>
          </div>
          ${(order.deliveryFee || 0) > 0 ? `
          <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px;">
            <span style="color: #6b7280;">Delivery Fee:</span>
            <span style="font-weight: 600; color: #111827;">${shop.currencySymbol}${order.deliveryFee}</span>
          </div>` : ''}
          ${(order.discountAmount || 0) > 0 ? `
          <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px;">
            <span style="color: #059669;">Discount:</span>
            <span style="font-weight: 600; color: #059669;">-${shop.currencySymbol}${order.discountAmount}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; color: #92400e; border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 8px;">
            <span>Total Paid (${(order.paymentMode || 'cash').toUpperCase()}):</span>
            <span>${shop.currencySymbol}${order.totalAmount.toLocaleString()}</span>
          </div>
        </div>

        <div style="text-align: center; padding-top: 10px; color: #6b7280; font-size: 12px;">
          <p style="margin: 0; font-weight: bold; color: #111827;">${shop.address}</p>
          <p style="margin: 4px 0 0 0;">Tel: ${shop.phone}</p>
          <p style="margin: 12px 0 0 0; color: #d97706; font-weight: 600;">✨ Thank you! Please visit Zaiqa Chicken Biryani again ✨</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Fetch recent Gmail messages for the user
 */
export async function fetchRecentEmails(maxResults = 5): Promise<EmailMessage[]> {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=label:INBOX`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!listRes.ok) return [];
    const listData = await listRes.json();
    if (!listData.messages || !Array.isArray(listData.messages)) return [];

    const messages = await Promise.all(
      listData.messages.map(async (msg: { id: string }) => {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!detailRes.ok) return { id: msg.id, snippet: '' };
        const d = await detailRes.json();
        const headers = d.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === 'Subject')?.value;
        const from = headers.find((h: any) => h.name === 'From')?.value;
        const date = headers.find((h: any) => h.name === 'Date')?.value;
        return {
          id: msg.id,
          snippet: d.snippet || '',
          subject,
          from,
          date,
        };
      })
    );

    return messages;
  } catch (e) {
    console.error('Error fetching emails', e);
    return [];
  }
}
