import React from 'react';
import { ShopSettings, SummaryKotData } from '../types';
import { ZcbLogo } from './ZcbLogo';

interface SummaryKotReceiptProps {
  summaryData: SummaryKotData;
  shop: ShopSettings;
  isPrintOnly?: boolean;
}

export const SummaryKotReceipt: React.FC<SummaryKotReceiptProps> = ({
  summaryData,
  shop,
  isPrintOnly = false,
}) => {
  const is58mm = (shop.printerWidth || shop.thermalPaperWidth) === '58mm';
  const widthClass = is58mm ? 'max-w-[240px] text-[10px]' : 'max-w-[340px] text-xs';

  return (
    <div
      id={isPrintOnly ? 'receipt-print-area' : undefined}
      className={`bg-white text-black font-mono-receipt leading-tight select-none space-y-3 ${
        isPrintOnly
          ? 'hidden print:block'
          : `p-5 w-full ${widthClass} mx-auto shadow-2xl rounded-sm border-2 border-stone-300 relative text-black`
      }`}
      style={{
        width: isPrintOnly ? (is58mm ? '58mm' : '80mm') : undefined,
        maxWidth: isPrintOnly ? (is58mm ? '58mm' : '80mm') : undefined,
      }}
    >
      {/* Brand & Header */}
      <div className="text-center pb-1">
        <div className="flex justify-center mb-1 print:my-0.5">
          {shop.logoUrl ? (
            <img
              src={shop.logoUrl}
              alt={shop.shopNameEn || 'Logo'}
              className="w-14 h-14 object-contain mx-auto print:max-h-14 print:w-auto"
              style={{ filter: 'grayscale(100%) contrast(125%)' }}
            />
          ) : (
            <ZcbLogo className="w-14 h-14 mx-auto" />
          )}
        </div>

        <div className="font-black text-sm sm:text-base tracking-wider text-black uppercase">
          {shop.shortName || 'ZCB'} - {shop.shopNameEn || 'ZAIQA CHICKEN BIRYANI'}
        </div>

        <div className="mt-1 bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest inline-block rounded-xs">
          🍳 CONSOLIDATED SUMMARY KOT
        </div>
        <p className="text-[9px] font-black uppercase text-black mt-0.5 tracking-wide">
          *** BULK KITCHEN PREPARATION TICKET ***
        </p>
      </div>

      {/* Double Separator */}
      <div className="border-t-2 border-black my-1" />

      {/* Batch Overview Banner */}
      <div className="bg-stone-100 print:bg-white border border-black p-1.5 space-y-1 text-[9.5px]">
        <div className="flex justify-between font-black">
          <span>BATCH: {summaryData.summaryId}</span>
          <span>{summaryData.totalOrders} BILLS COMBINED</span>
        </div>
        <div className="flex justify-between text-black">
          <span>Date: <strong>{summaryData.batchDate}</strong></span>
          <span>Time: <strong>{summaryData.batchTime}</strong></span>
        </div>
        <div className="pt-0.5 border-t border-dotted border-black/60">
          <span className="font-black block uppercase text-[9px]">TOKENS INCLUDED:</span>
          <div className="font-black text-sm tracking-wide text-black">
            {summaryData.tokens.map((t) => `#${t}`).join(', ')}
          </div>
        </div>
        <div className="text-[8.5px] font-semibold flex justify-between text-stone-700 print:text-black">
          <span>🛍️ Takeaway: <strong>{summaryData.orderTypeCounts.takeaway}</strong></span>
          <span>🛵 Delivery: <strong>{summaryData.orderTypeCounts.delivery}</strong></span>
          <span>🍽️ Dine-In: <strong>{summaryData.orderTypeCounts.dine_in}</strong></span>
        </div>
      </div>

      {/* Thick Divider */}
      <div className="border-t-2 border-black my-1" />

      {/* Consolidated Items to Cook Section */}
      <div>
        <div className="bg-black text-white px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider flex justify-between items-center rounded-xs mb-1">
          <span>ITEM & PORTION</span>
          <span>BULK QTY</span>
        </div>

        <div className="space-y-1.5 py-1">
          {summaryData.items.map((item, idx) => (
            <div
              key={idx}
              className="border-b border-dashed border-black/50 pb-1 flex justify-between items-start"
            >
              <div className="pr-2 leading-tight flex-1">
                <span className="font-black text-xs sm:text-sm text-black block">
                  • {item.nameEn || item.nameUr}
                </span>
                {(item.portionLabelEn || item.portionLabelUr) && (
                  <span className="inline-block text-[9.5px] font-black bg-stone-200 print:bg-stone-100 px-1 py-0.2 rounded mt-0.5 text-black">
                    Portion: [{item.portionLabelEn || item.portionLabelUr}]
                  </span>
                )}
                <span className="block text-[8.5px] text-stone-600 print:text-black mt-0.5">
                  Tokens: {item.tokens.map((t) => `#${t}`).join(', ')}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-base sm:text-lg font-black bg-black text-white px-2.5 py-0.5 rounded-xs inline-block">
                  x {item.totalQuantity}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Total Portions Banner */}
        <div className="my-2 p-1.5 bg-black text-white text-center rounded-xs">
          <span className="text-[9px] block uppercase font-bold tracking-widest text-stone-200">
            TOTAL CONSOLIDATED PORTIONS
          </span>
          <span className="text-xl sm:text-2xl font-black tracking-tight leading-none">
            {summaryData.totalItemCount} ITEMS TO PREPARE
          </span>
        </div>
      </div>

      {/* Order-Wise Packing Breakdown */}
      <div className="border-t-2 border-black pt-1.5 space-y-1 text-[9.5px]">
        <div className="font-black uppercase tracking-wide text-[10px] border-b border-black pb-0.5 flex justify-between items-center">
          <span>📦 ORDER-WISE PACKING GUIDE</span>
          <span className="text-[8.5px] font-normal">{summaryData.orders.length} slips</span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          {summaryData.orders.map((ord) => (
            <div key={ord.id} className="border-b border-dotted border-black/40 pb-1">
              <div className="flex justify-between font-black text-black">
                <span>
                  • TOKEN #{ord.tokenNumber}{' '}
                  <span className="font-normal text-[8.5px] uppercase">
                    ({ord.orderType === 'delivery' ? '🛵 Delivery' : ord.orderType === 'takeaway' ? '🛍️ Takeaway' : '🍽️ Dine-In'})
                  </span>
                </span>
                <span className="text-[8.5px]">{ord.billNumber}</span>
              </div>

              {ord.customerName && (
                <div className="text-[8.5px] text-stone-700 print:text-black">
                  Cust: {ord.customerName} {ord.customerPhone ? `(${ord.customerPhone})` : ''}
                  {ord.riderName && ` • Rider: ${ord.riderName}`}
                </div>
              )}

              <div className="text-[9px] font-bold text-black mt-0.5 leading-snug">
                {ord.items
                  .map(
                    (it) =>
                      `${it.quantity}x ${it.nameEn || it.nameUr}${
                        it.portionLabelEn ? ` [${it.portionLabelEn}]` : ''
                      }`
                  )
                  .join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Special Kitchen Instructions */}
      {summaryData.notes && summaryData.notes.length > 0 && (
        <div className="p-1.5 border-2 border-black bg-stone-50 print:bg-white text-[9.5px] space-y-1">
          <strong className="block text-black font-black uppercase text-[10px]">
            ⚠️ SPECIAL CHEF INSTRUCTIONS:
          </strong>
          {summaryData.notes.map((n, idx) => (
            <div key={idx} className="border-b border-dotted border-black/40 pb-0.5 last:border-b-0">
              <span className="font-black">Token #{n.token}: </span>
              <span className="italic font-bold">"{n.note}"</span>
            </div>
          ))}
        </div>
      )}

      {/* Kitchen Staff Checklist */}
      <div className="pt-1 border-t-2 border-black text-[9px] space-y-1 text-center font-bold">
        <div className="grid grid-cols-3 gap-1">
          <div className="border border-black p-1">
            <span>[  ] Cooked</span>
          </div>
          <div className="border border-black p-1">
            <span>[  ] Packed</span>
          </div>
          <div className="border border-black p-1">
            <span>[  ] Dispatched</span>
          </div>
        </div>
        <p className="text-[8px] uppercase tracking-wider text-black pt-0.5 font-bold">
          *** FOR KITCHEN & PACKING STAFF ONLY • NOT A BILL ***
        </p>
      </div>
    </div>
  );
};
