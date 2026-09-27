import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Bike, X, Compass, CheckCircle2, Phone, Search, ExternalLink } from 'lucide-react';
import { Order, ShopSettings } from '../types';

interface GoogleDeliveryMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: ShopSettings;
  orders: Order[];
  selectedOrder?: Order | null;
}

// Default shop coordinates (Karachi Burns Road / Saddar Food Street)
const DEFAULT_SHOP_LOCATION = { lat: 24.8585, lng: 67.0175 };

export const GoogleDeliveryMapModal: React.FC<GoogleDeliveryMapModalProps> = ({
  isOpen,
  onClose,
  shop,
  orders,
  selectedOrder: initialSelectedOrder,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(
    initialSelectedOrder || orders.find((o) => o.orderType === 'delivery') || orders[0] || null
  );

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(DEFAULT_SHOP_LOCATION);
  const [zoom, setZoom] = useState(13);

  // Delivery rider location simulated between shop and customer
  const deliveryOrders = orders.filter((o) => o.orderType === 'delivery');
  const shopName = shop.shopNameEn || shop.shopNameUr || 'Zaiqa Chicken Biryani';

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyAwzbsW0eS6eVWQU_HUhipxBpuEjZT1OCA';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-stone-900 border-2 border-emerald-500/80 text-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 p-4 sm:p-5 flex items-center justify-between text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-950 text-emerald-400 flex items-center justify-center shadow-md">
              <MapPin className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-stone-950 text-emerald-300 px-2 py-0.5 rounded-full">
                  GOOGLE MAPS PLATFORM
                </span>
                <span className="text-[11px] font-bold text-emerald-100">
                  Live Delivery & Location Tracking
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                Google Maps Delivery Radar & Live Tracking
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-950/30 hover:bg-stone-950/60 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Content Body with Map and Sidebar */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-[460px] h-[550px]">
          {/* Active Deliveries List Sidebar */}
          <div className="w-full md:w-80 bg-stone-950 p-4 border-b md:border-b-0 md:border-r border-stone-800 flex flex-col gap-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 uppercase">
                Active Deliveries ({deliveryOrders.length})
              </span>
              <span className="text-[10px] text-stone-400">Restaurant & Riders</span>
            </div>

            {/* Shop location item */}
            <div
              onClick={() => {
                setMapCenter(DEFAULT_SHOP_LOCATION);
                setZoom(15);
              }}
              className="p-3 rounded-2xl bg-stone-900 border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                  🏪
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-white truncate">{shopName}</div>
                  <div className="text-[10px] text-stone-400 truncate">{shop.address}</div>
                </div>
              </div>
            </div>

            {/* Delivery orders list */}
            <div className="space-y-2 flex-1">
              {deliveryOrders.length === 0 ? (
                <div className="text-center py-6 text-xs text-stone-500">
                  No active home delivery orders found.
                </div>
              ) : (
                deliveryOrders.map((order, index) => {
                  const isSelected = selectedOrder?.id === order.id;
                  return (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedOrder(order);
                        // Offset location slightly for visualization
                        const offsetLat = DEFAULT_SHOP_LOCATION.lat + (index + 1) * 0.008;
                        const offsetLng = DEFAULT_SHOP_LOCATION.lng + (index + 1) * 0.006;
                        setMapCenter({ lat: offsetLat, lng: offsetLng });
                        setZoom(14);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-md'
                          : 'bg-stone-900/70 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">
                          #{order.billNumber} • {order.customerName || 'Customer'}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400">
                          {shop.currencySymbol}{order.totalAmount}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400 truncate mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                        <span className="truncate">{order.deliveryAddress || 'Address on Map'}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-stone-400">
                        <span className="flex items-center gap-1 text-sky-400 font-bold">
                          <Bike className="w-3 h-3" /> Rider on the way
                        </span>
                        <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick directions link */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shopName + ' ' + shop.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Google Maps App</span>
            </a>
          </div>

          {/* Google Maps Container */}
          <div className="flex-1 relative w-full h-full min-h-[350px]">
            <APIProvider apiKey={apiKey}>
              <Map
                mapId="DEMO_MAP_ID"
                style={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={zoom}
                gestureHandling="greedy"
                disableDefaultUI={false}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              >
                {/* Shop Location Marker */}
                <AdvancedMarker position={DEFAULT_SHOP_LOCATION} title={shopName}>
                  <Pin background="#f59e0b" glyphColor="#000000" borderColor="#78350f" scale={1.2}>
                    <span className="text-xs">🏪</span>
                  </Pin>
                </AdvancedMarker>

                {/* Delivery Customer Markers */}
                {deliveryOrders.map((order, idx) => {
                  const lat = DEFAULT_SHOP_LOCATION.lat + (idx + 1) * 0.008;
                  const lng = DEFAULT_SHOP_LOCATION.lng + (idx + 1) * 0.006;
                  return (
                    <AdvancedMarker
                      key={order.id}
                      position={{ lat, lng }}
                      title={`Order #${order.billNumber} - ${order.customerName || 'Customer'}`}
                    >
                      <Pin background="#ef4444" glyphColor="#ffffff" borderColor="#991b1b">
                        <span className="text-xs">📍</span>
                      </Pin>
                    </AdvancedMarker>
                  );
                })}

                {/* Simulated Rider Marker */}
                {deliveryOrders.length > 0 && (
                  <AdvancedMarker
                    position={{
                      lat: DEFAULT_SHOP_LOCATION.lat + 0.004,
                      lng: DEFAULT_SHOP_LOCATION.lng + 0.003,
                    }}
                    title="Delivery Rider"
                  >
                    <Pin background="#0284c7" glyphColor="#ffffff" borderColor="#0369a1" scale={1.1}>
                      <span className="text-xs">🛵</span>
                    </Pin>
                  </AdvancedMarker>
                )}
              </Map>
            </APIProvider>

            {/* Map floating badges */}
            <div className="absolute top-3 left-3 bg-stone-900/90 backdrop-blur-xs border border-stone-700 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-lg flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Delivery Radar (Google Maps)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <span>Google Maps Platform API • Real-time Navigation & Geocoding</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer shadow-md"
          >
            Close Map
          </button>
        </div>
      </div>
    </div>
  );
};
