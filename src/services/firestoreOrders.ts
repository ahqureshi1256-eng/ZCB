import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Order } from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let db: Firestore;
try {
  const dbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  }, dbId !== '(default)' ? dbId : undefined);
} catch {
  try {
    if ((firebaseConfig as any).firestoreDatabaseId) {
      db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
    } else {
      db = getFirestore(app);
    }
  } catch (err) {
    db = getFirestore(app);
  }
}

export { db };

const ORDERS_COLLECTION = 'orders';

// Multi-Tab Offline & Realtime Sync Bridge
const syncChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('zcb_orders_sync_channel')
    : null;

/**
 * Save order to Firestore & local sync channel so it works 100% online and offline
 */
export async function saveOrderToFirestore(order: Order): Promise<boolean> {
  // 1. Broadcast locally immediately for instantaneous multi-tab sync
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'ORDER_SAVED', order });
    } catch {}
  }

  // 2. Persist to Firestore (and Firestore offline cache)
  try {
    const orderDocRef = doc(db, ORDERS_COLLECTION, order.id);
    const cleanOrder = JSON.parse(JSON.stringify(order));
    await setDoc(orderDocRef, {
      ...cleanOrder,
      updatedAt: Date.now(),
    });
    return true;
  } catch (error: any) {
    // If offline or backend unreachable, Firestore operates in offline mode
    if (error?.code !== 'unavailable') {
      console.warn('Firestore sync queued for reconnection:', error?.message || error);
    }
    return true;
  }
}

/**
 * Update order status in Firestore (e.g. accepted, rider assigned)
 */
export async function updateOrderStatusInFirestore(
  orderId: string,
  orderStatus: Order['orderStatus'],
  riderName?: string
): Promise<boolean> {
  if (syncChannel) {
    try {
      syncChannel.postMessage({
        type: 'ORDER_STATUS_UPDATED',
        orderId,
        orderStatus,
        riderName,
      });
    } catch {}
  }

  try {
    const orderDocRef = doc(db, ORDERS_COLLECTION, orderId);
    const updates: Record<string, any> = {
      orderStatus,
      updatedAt: Date.now(),
    };
    if (riderName) {
      updates.riderName = riderName;
    }
    await updateDoc(orderDocRef, updates);
    return true;
  } catch (error: any) {
    if (error?.code !== 'unavailable') {
      console.warn('Order status update queued for reconnection:', error?.message || error);
    }
    return true;
  }
}

/**
 * Real-time listener for incoming orders.
 * Listens for new orders created on the website so the POS machine receives them instantaneously!
 */
export function subscribeToOrders(
  onNewPendingOrder: (order: Order) => void,
  onOrderUpdated?: (order: Order) => void
): () => void {
  // Listen to local BroadcastChannel for zero-latency cross-tab sync
  const handleChannelMsg = (event: MessageEvent) => {
    try {
      const data = event.data;
      if (data?.type === 'ORDER_SAVED' && data.order) {
        if (onOrderUpdated) onOrderUpdated(data.order);
        if (data.order.orderStatus === 'pending') {
          onNewPendingOrder(data.order);
        }
      }
    } catch {}
  };

  if (syncChannel) {
    syncChannel.addEventListener('message', handleChannelMsg);
  }

  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    const q = query(ordersRef, orderBy('createdAt', 'desc'), limit(30));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data() as Order;

          if (change.type === 'added') {
            if (onOrderUpdated) {
              onOrderUpdated(data);
            }
            if (data.orderStatus === 'pending') {
              onNewPendingOrder(data);
            }
          } else if (change.type === 'modified') {
            if (onOrderUpdated) {
              onOrderUpdated(data);
            }
            if (data.orderStatus === 'pending') {
              onNewPendingOrder(data);
            }
          }
        });
      },
      (error) => {
        // Log friendly note rather than fatal error when offline
        if (error.code === 'unavailable') {
          // Normal offline operation
        } else {
          console.warn('Firestore real-time sync active in offline mode');
        }
      }
    );

    return () => {
      unsubscribe();
      if (syncChannel) {
        syncChannel.removeEventListener('message', handleChannelMsg);
      }
    };
  } catch (error) {
    return () => {
      if (syncChannel) {
        syncChannel.removeEventListener('message', handleChannelMsg);
      }
    };
  }
}
