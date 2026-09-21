import React from 'react';
import { Order, ShopSettings } from '../types';
import { formatPrice } from '../utils/billing';
import { ZcbLogo } from './ZcbLogo';

interface ThermalReceiptProps {
  order: Order;
  shop: ShopSettings;
  qrCodeDataUrl?: string;
  isPrintOnly?: boolean;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  order,
  shop,
  qrCodeDataUrl,
  isPrintOnly = false,
}) => {
  const is58mm = shop.printerWidth === '58mm';
  const widthClass = is58mm ? 'max-w-[240px] text-[10px]' : 'max-w-[340px] text-xs';

  return (
    <div
      id={isPrintOnly ? 'receipt-print-area' : undefined}
      className={`bg-white text-black font-mono-receipt leading-tight select-none ${
        isPrintOnly
          ? 'hidden print:block'
          : `p-5 w-full ${widthClass} mx-auto shadow-2xl rounded-sm border border-stone-300 relative text-black`
      }`}
      style={{
        width: isPrintOnly ? (is58mm ? '58mm' : '80mm') : undefined,
        maxWidth: isPrintOnly ? (is58mm ? '58mm' : '80mm') : undefined,
      }}
    >
      {/* Brand Header */}
      <div className="text-center pb-2">
        {/* Exact Official ZCB Logo */}
        <div className="flex justify-center mb-1">
          <ZcbLogo className="w-14 h-14 mx-auto" imageUrl={shop.logoUrl} />
        </div>

        <div className="font-black text-base md:text-lg tracking-wider text-black uppercase">
          {shop.shortName || 'ZCB'} - {shop.shopNameEn || 'ZAIQA CHICKEN BIRYANI'}
        </div>

        <p className="text-[10px] text-black font-bold uppercase mt-0.5 tracking-wide">
          {shop.taglineEn || 'Food Prepared Fresh On Order'}
        </p>
        <p className="text-[9px] text-black mt-0.5">{shop.address}</p>
        <p className="text-[10px] font-bold text-black mt-0.5">Order Tel: {shop.phone}</p>
      </div>

      {/* Double Separator */}
      <div className="border-t-2 border-black my-1" />

      {/* Token & Order Type Banner */}
      <div className="flex items-center justify-between py-1 bg-stone-100 print:bg-white border border-black px-2 my-1">
        <div className="text-left">
          <span className="text-[9px] block uppercase font-bold text-black">TOKEN NUMBER</span>
          <span className="text-xl font-black tracking-tight text-black">#{order.tokenNumber}</span>
        </div>
        <div className="text-right">
          <span className="text-[9px] block text-black font-semibold uppercase">ORDER TYPE:</span>
          <span className="text-xs font-bold uppercase bg-black text-white px-2 py-0.5 rounded-xs">
            {order.orderType === 'delivery'
              ? '🛵 BIKE DELIVERY'
              : order.orderType === 'takeaway'
              ? 'TAKEAWAY (PARCEL)'
              : `DINE-IN ${order.tableNumber ? `(TABLE ${order.tableNumber})` : ''}`}
          </span>
        </div>
      </div>

      {/* Bike Delivery Customer Details (If Delivery) */}
      {order.orderType === 'delivery' && (
        <div className="my-1.5 p-1.5 border border-black bg-stone-50 print:bg-white text-[9.5px] space-y-0.5">
          <div className="font-black uppercase tracking-wide text-[10px] border-b border-black pb-0.5 flex justify-between items-center">
            <span>🛵 BIKE DELIVERY DISPATCH</span>
            {order.riderName && <span className="font-normal text-[8.5px]">Rider: {order.riderName}</span>}
          </div>
          <div className="pt-0.5">
            <strong>Customer:</strong> {order.customerName || 'Online Customer'}
          </div>
          <div>
            <strong>Phone:</strong> {order.customerPhone || 'N/A'}
          </div>
          <div className="leading-snug">
            <strong>Address:</strong> {order.deliveryAddress || 'Address on file'}
          </div>
          {order.deliveryLandmark && (
            <div>
              <strong>Landmark:</strong> {order.deliveryLandmark}
            </div>
          )}
          {order.notes && (
            <div className="italic text-[8.5px]">
              <strong>Note:</strong> {order.notes}
            </div>
          )}
        </div>
      )}

      {/* Bill Meta Details */}
      <div className="text-[9.5px] text-black py-1 space-y-0.5">
        <div className="flex justify-between">
          <span>Bill #: <strong>{order.billNumber}</strong></span>
          <span>{order.dateStr}</span>
        </div>
        <div className="flex justify-between">
          <span>Time: {order.timeStr}</span>
          <span>
            Payment: <strong>{order.paymentMode.toUpperCase()}</strong>
          </span>
        </div>
        {order.orderType !== 'delivery' && order.customerName && (
          <div className="flex justify-between font-semibold text-black border-t border-dotted border-black/50 pt-0.5 mt-0.5">
            <span>Customer: {order.customerName}</span>
            {order.customerPhone && <span>{order.customerPhone}</span>}
          </div>
        )}
      </div>

      {/* Dashed Separator */}
      <div className="border-t border-dashed border-black my-1" />

      {/* Items Table Header */}
      <div className="flex justify-between font-bold text-[9.5px] pb-1 uppercase border-b border-black">
        <span className="w-1/2 text-left">ITEM</span>
        <span className="w-1/4 text-center">RATE x QTY</span>
        <span className="w-1/4 text-right">AMOUNT</span>
      </div>

      {/* Items List */}
      <div className="py-1 space-y-1">
        {order.items.map((item, idx) => (
          <div key={idx} className="text-[10px] border-b border-dotted border-black/30 pb-1">
            <div className="flex justify-between items-start font-bold text-black">
              <span className="w-1/2 text-left pr-1 leading-tight">
                <span>{item.nameEn || item.nameUr}</span>
                {(item.portionLabelEn || item.portionLabelUr) && (
                  <span className="block text-[8.5px] font-normal text-black">
                    ({item.portionLabelEn || item.portionLabelUr})
                  </span>
                )}
              </span>
              <span className="w-1/4 text-center text-black font-semibold">
                {shop.currencySymbol}{item.unitPrice} x {item.quantity}
              </span>
              <span className="w-1/4 text-right font-black">
                {formatPrice(item.total, shop.currencySymbol)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Separator */}
      <div className="border-t border-dashed border-black my-1" />

      {/* Financial Calculations */}
      <div className="space-y-0.5 text-[10.5px]">
        <div className="flex justify-between text-black font-semibold">
          <span>Subtotal:</span>
          <span>{formatPrice(order.subtotal, shop.currencySymbol)}</span>
        </div>

        {order.deliveryFee && order.deliveryFee > 0 ? (
          <div className="flex justify-between text-black font-bold">
            <span>🛵 Bike Delivery Fee:</span>
            <span>+ {formatPrice(order.deliveryFee, shop.currencySymbol)}</span>
          </div>
        ) : null}

        {order.discountAmount > 0 && (
          <div className="flex justify-between text-black font-bold">
            <span>Discount:</span>
            <span>- {formatPrice(order.discountAmount, shop.currencySymbol)}</span>
          </div>
        )}

        <div className="flex justify-between items-center text-sm font-black border-t-2 border-b-2 border-black py-1 my-1 text-black">
          <span>NET TOTAL:</span>
          <span className="text-base">{formatPrice(order.totalAmount, shop.currencySymbol)}</span>
        </div>

        {order.paymentMode === 'cash' && order.cashTendered && order.cashTendered > 0 && (
          <div className="pt-0.5 text-[9.5px] space-y-0.5 border-b border-dotted border-black pb-1 mb-1">
            <div className="flex justify-between text-black">
              <span>Cash Paid:</span>
              <span>{formatPrice(order.cashTendered, shop.currencySymbol)}</span>
            </div>
            <div className="flex justify-between font-black text-black">
              <span>Change Due:</span>
              <span>{formatPrice(order.changeDue || 0, shop.currencySymbol)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Verification QR Code */}
      {qrCodeDataUrl && (
        <div className="text-center py-1">
          <div className="inline-block p-1 border border-black bg-white">
            <img
              src={qrCodeDataUrl}
              alt="Verification QR"
              className="w-20 h-20 mx-auto"
            />
          </div>
          <p className="text-[8px] text-black uppercase font-bold tracking-wider mt-0.5">
            Verified Receipt • Authentic ZCB Bill
          </p>
        </div>
      )}

      {/* Footer Notes */}
      <div className="text-center text-[9px] text-black pt-1 space-y-0.5">
        <p className="font-bold text-[10px]">{shop.footerNoteEn}</p>
        <p className="text-[8px] pt-0.5">*** ZCB POS Fast Thermal Bill System ***</p>
      </div>
    </div>
  );
};

