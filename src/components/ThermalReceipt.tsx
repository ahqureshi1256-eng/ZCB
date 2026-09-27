import React from 'react';
import { Order, ShopSettings } from '../types';
import { formatPrice } from '../utils/billing';
import { ZcbLogo } from './ZcbLogo';

interface ThermalReceiptProps {
  order: Order;
  shop: ShopSettings;
  qrCodeDataUrl?: string;
  isPrintOnly?: boolean;
  printMode?: 'bill' | 'kot' | 'both';
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  order,
  shop,
  qrCodeDataUrl,
  isPrintOnly = false,
  printMode = 'both',
}) => {
  const is58mm = shop.printerWidth === '58mm';
  const widthClass = is58mm ? 'max-w-[240px] text-[10px]' : 'max-w-[340px] text-xs';

  const showBill = printMode === 'bill' || printMode === 'both';
  const showKot = printMode === 'kot' || printMode === 'both';

  return (
    <div
      id={isPrintOnly ? 'receipt-print-area' : undefined}
      className={`bg-white text-black font-mono-receipt leading-tight select-none space-y-4 ${
        isPrintOnly
          ? 'hidden print:block'
          : `p-5 w-full ${widthClass} mx-auto shadow-2xl rounded-sm border border-stone-300 relative text-black`
      }`}
      style={{
        width: isPrintOnly ? (is58mm ? '58mm' : '80mm') : undefined,
        maxWidth: isPrintOnly ? (is58mm ? '58mm' : '80mm') : undefined,
      }}
    >
      {/* 1. CUSTOMER THERMAL BILL */}
      {showBill && (
        <div className="receipt-section customer-bill">
          {/* Brand Header */}
          <div className="text-center pb-2">
            {/* High-Resolution Logo for Thermal Receipt Print */}
            <div className="flex justify-center mb-1.5 print:my-1">
              {shop.logoUrl ? (
                <img
                  src={shop.logoUrl}
                  alt={shop.shopNameEn || 'Logo'}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto print:max-h-20 print:w-auto"
                  style={{ filter: 'grayscale(100%) contrast(125%)' }}
                />
              ) : (
                <ZcbLogo className="w-16 h-16 mx-auto" />
              )}
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
                  : 'DINE-IN'}
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
            <span className="w-1/2 text-left">ITEM & PORTION</span>
            <span className="w-1/4 text-center">RATE x QTY</span>
            <span className="w-1/4 text-right">AMOUNT</span>
          </div>

          {/* Items List */}
          <div className="py-1 space-y-1">
            {order.items.map((item, idx) => (
              <div key={idx} className="text-[10px] border-b border-dotted border-black/30 pb-1">
                <div className="flex justify-between items-start font-bold text-black">
                  <span className="w-1/2 text-left pr-1 leading-tight">
                    <span className="font-black">{item.nameEn || item.nameUr}</span>
                    {(item.portionLabelEn || item.portionLabelUr) && (
                      <span className="block text-[9px] font-bold text-black bg-stone-100 px-1 py-0.2 rounded mt-0.5 inline-block">
                        [{item.portionLabelEn || item.portionLabelUr}]
                      </span>
                    )}
                  </span>
                  <span className="w-1/4 text-center text-black font-semibold pt-0.5">
                    {shop.currencySymbol}{item.unitPrice} × {item.quantity}
                  </span>
                  <span className="w-1/4 text-right font-black pt-0.5">
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
              <div className="flex justify-between items-center text-black font-black border border-black px-1.5 py-0.5 my-1 bg-stone-100 print:bg-white text-[10px]">
                <span className="uppercase">🏷️ DISCOUNT CUT:</span>
                <span className="font-black">- {formatPrice(order.discountAmount, shop.currencySymbol)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm font-black border-t-2 border-b-2 border-black py-1 my-1 text-black">
              <span className="uppercase font-black">NET PAYABLE:</span>
              <span className="text-base font-black">{formatPrice(order.totalAmount, shop.currencySymbol)}</span>
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
          <div className="text-center text-[9px] text-black pt-1 space-y-1">
            {shop.customReceiptFooter && shop.customReceiptFooter.trim() && (
              <div className="p-1 border border-dashed border-black bg-stone-50 print:bg-white text-center font-black text-[9.5px] uppercase tracking-wide">
                {shop.customReceiptFooter.trim()}
              </div>
            )}
            <p className="font-bold text-[10px]">{shop.footerNoteEn}</p>
            <p className="text-[8px] pt-0.5">*** ZCB POS Fast Thermal Bill System ***</p>
          </div>
        </div>
      )}

      {/* Perforated Tear Line / Page Divider between Bill and Kitchen KOT */}
      {showBill && showKot && (
        <div className="my-3 py-2 text-center border-t-2 border-b-2 border-dashed border-black print:page-break-before-auto">
          <span className="text-[9px] font-black uppercase tracking-widest bg-white px-2">
            ✂️ TEAR HERE — KITCHEN SLIP BELOW ✂️
          </span>
        </div>
      )}

      {/* 2. OFFICIAL KITCHEN ORDER TICKET (KOT) */}
      {showKot && (
        <div className="receipt-section kitchen-kot pt-1 border-2 border-black p-2 bg-stone-50 print:bg-white text-black">
          {/* KOT Top Header */}
          <div className="text-center pb-1 border-b-2 border-black">
            <div className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded-xs inline-block mb-1">
              🍳 KITCHEN ORDER TICKET (KOT)
            </div>
            <div className="text-xs font-black uppercase">
              {shop.shortName || 'ZCB'} - KITCHEN PREPARATION ORDER TICKET
            </div>
          </div>

          {/* Giant Token & Order Source Banner */}
          <div className="my-1.5 p-1 bg-black text-white text-center rounded-xs">
            <span className="text-[9px] block uppercase tracking-wider font-bold">KITCHEN TOKEN NUMBER</span>
            <span className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
              #{order.tokenNumber}
            </span>
          </div>

          <div className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-black">
            <span className="uppercase">
              TYPE:{' '}
              <strong className="underline">
                {order.orderType === 'delivery'
                  ? '🛵 BIKE DELIVERY (PACKING)'
                  : order.orderType === 'takeaway'
                  ? '🛍️ TAKEAWAY PARCEL'
                  : '🍽️ DINE-IN'}
              </strong>
            </span>
            <span>{order.timeStr}</span>
          </div>

          <div className="text-[9px] py-1 border-b border-dotted border-black/60 flex justify-between">
            <span>Bill #: <strong>{order.billNumber}</strong></span>
            <span>Date: <strong>{order.dateStr}</strong></span>
          </div>

          {/* KOT Food Items to Prepare (Big Quantity & Portion) */}
          <div className="py-2 space-y-1.5">
            <div className="text-[9px] font-black uppercase tracking-wider border-b border-black pb-0.5 flex justify-between">
              <span>ITEMS TO PREPARE</span>
              <span>QTY</span>
            </div>

            {order.items.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-[11px] font-black border-b border-dashed border-black/40 pb-1"
              >
                <div className="leading-snug pr-2">
                  <span className="text-sm font-black">• {it.nameEn || it.nameUr}</span>
                  {(it.portionLabelEn || it.portionLabelUr) && (
                    <span className="block text-[10px] font-bold text-black bg-stone-200 print:bg-stone-100 px-1 py-0.5 rounded mt-0.5">
                      Portion: [{it.portionLabelEn || it.portionLabelUr}]
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-black bg-black text-white px-2 py-0.5 rounded-xs inline-block">
                    x {it.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Special Kitchen Instructions Note */}
          {order.notes && (
            <div className="my-1.5 p-1.5 border border-black bg-white text-[9.5px]">
              <strong className="block text-black font-black uppercase">⚠️ CHEF SPECIAL INSTRUCTIONS:</strong>
              <span className="italic font-bold">"{order.notes}"</span>
            </div>
          )}

          {/* Kitchen Chef Preparation Checkboxes */}
          <div className="mt-2 pt-1 border-t-2 border-black text-[9px] space-y-1">
            <div className="grid grid-cols-3 gap-1 text-center font-bold">
              <div className="border border-black p-1">
                <span>[  ] Cooked / Plated</span>
              </div>
              <div className="border border-black p-1">
                <span>[  ] Packed / Sealed</span>
              </div>
              <div className="border border-black p-1">
                <span>[  ] Ready to Serve</span>
              </div>
            </div>
            <p className="text-center text-[8px] font-bold pt-1 uppercase tracking-wider">
              *** FOR KITCHEN & PACKING STAFF ONLY • NOT A BILL ***
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

