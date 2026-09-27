import React, { useState, useEffect } from 'react';
import { Mail, Send, LogIn, LogOut, CheckCircle2, AlertCircle, RefreshCw, X, Shield, FileText, User as UserIcon, Calendar } from 'lucide-react';
import { googleSignIn, logout, initAuth, getAccessToken } from '../services/firebaseAuth';
import { sendGmailMessage, generateOrderReceiptHtml, fetchRecentEmails, EmailMessage } from '../services/gmailService';
import { Order, ShopSettings, KhataEntry } from '../types';
import { User } from 'firebase/auth';
import { posSound } from '../utils/audio';

interface GmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: ShopSettings;
  orders: Order[];
  khataEntries: KhataEntry[];
}

export const GmailModal: React.FC<GmailModalProps> = ({
  isOpen,
  onClose,
  shop,
  orders,
  khataEntries,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'send_receipt' | 'daily_report' | 'inbox'>('send_receipt');

  // Send single receipt state
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  // Daily report state
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportRecipient, setReportRecipient] = useState('');

  // Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [recentEmails, setRecentEmails] = useState<EmailMessage[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, t) => {
        setCurrentUser(user);
        setToken(t);
        if (user.email && !reportRecipient) {
          setReportRecipient(user.email);
        }
      },
      () => {
        setCurrentUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, [reportRecipient]);

  useEffect(() => {
    if (orders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (currentUser && activeTab === 'inbox') {
      loadEmails();
    }
  }, [currentUser, activeTab]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setToken(res.accessToken);
        setStatusMsg({ type: 'success', text: `Gmail Connected: ${res.user.email}` });
        posSound.playSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Google sign-in was cancelled or failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setToken(null);
    setStatusMsg({ type: 'info', text: 'Google Account signed out.' });
  };

  const loadEmails = async () => {
    setIsLoadingEmails(true);
    const emails = await fetchRecentEmails(8);
    setRecentEmails(emails);
    setIsLoadingEmails(false);
  };

  const promptSendReceipt = () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid customer email address.' });
      return;
    }
    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order) {
      setStatusMsg({ type: 'error', text: 'Please select an order to send.' });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `Send Order #${order.billNumber} Receipt?`,
      description: `You are about to send an official digital receipt for ${shop.currencySymbol}${order.totalAmount} to "${recipientEmail}" using your connected Gmail account (${currentUser?.email}).`,
      onConfirm: async () => {
        setLoading(true);
        setStatusMsg(null);
        const shopName = shop.shopNameEn || shop.shopNameUr || 'Zaiqa Chicken Biryani';
        const html = generateOrderReceiptHtml(order, shop);
        const res = await sendGmailMessage({
          to: recipientEmail,
          fromEmail: currentUser?.email || shopName,
          subject: `${shopName} - Order Receipt #${order.billNumber}`,
          htmlBody: html,
        });
        setLoading(false);
        if (res.success) {
          posSound.playSuccess();
          setStatusMsg({ type: 'success', text: `✓ Receipt sent successfully to ${recipientEmail}!` });
          setRecipientEmail('');
        } else {
          setStatusMsg({ type: 'error', text: res.error || 'Failed to send email.' });
        }
      },
    });
  };

  const promptSendDailyReport = () => {
    if (!reportRecipient || !reportRecipient.includes('@')) {
      setStatusMsg({ type: 'error', text: 'Please enter an email for the daily sales summary.' });
      return;
    }

    const shopName = shop.shopNameEn || shop.shopNameUr || 'Zaiqa Chicken Biryani';
    // Filter orders and khata for selected date
    const dayOrders = orders.filter((o) => {
      const orderDateStr = new Date(o.createdAt).toISOString().split('T')[0];
      return orderDateStr === reportDate || o.dateStr === reportDate;
    });
    const dayTotalSales = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const dayDeliveryOrders = dayOrders.filter((o) => o.orderType === 'delivery').length;

    setConfirmDialog({
      isOpen: true,
      title: `Send Daily Sales Report for ${reportDate}?`,
      description: `This will email a detailed sales summary (${dayOrders.length} orders totaling ${shop.currencySymbol}${dayTotalSales.toLocaleString()}) to "${reportRecipient}".`,
      onConfirm: async () => {
        setLoading(true);
        setStatusMsg(null);

        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #d97706; margin-top: 0;">${shopName} - Daily Sales Report</h2>
            <p><strong>Date:</strong> ${reportDate}</p>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 0; font-size: 16px;"><strong>Total Revenue:</strong> ${shop.currencySymbol}${dayTotalSales.toLocaleString()}</p>
              <p style="margin: 5px 0 0 0;"><strong>Total Orders Completed:</strong> ${dayOrders.length}</p>
              <p style="margin: 5px 0 0 0;"><strong>Delivery Orders:</strong> ${dayDeliveryOrders}</p>
            </div>
            <h3>Orders Breakdown:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background: #f3f4f6; text-align: left;">
                  <th style="padding: 8px;">Bill #</th>
                  <th style="padding: 8px;">Customer</th>
                  <th style="padding: 8px;">Type</th>
                  <th style="padding: 8px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${dayOrders
                  .map(
                    (o) => `
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px;">#${o.billNumber}</td>
                    <td style="padding: 8px;">${o.customerName || 'Walk-in'}</td>
                    <td style="padding: 8px;">${o.orderType}</td>
                    <td style="padding: 8px; text-align: right;">${shop.currencySymbol}${o.totalAmount}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
            <p style="margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center;">Generated automatically by ${shopName} POS</p>
          </div>
        `;

        const res = await sendGmailMessage({
          to: reportRecipient,
          fromEmail: currentUser?.email || shopName,
          subject: `${shopName} - Daily Sales Summary (${reportDate})`,
          htmlBody: html,
        });

        setLoading(false);
        if (res.success) {
          posSound.playSuccess();
          setStatusMsg({ type: 'success', text: `✓ Daily report sent to ${reportRecipient}!` });
        } else {
          setStatusMsg({ type: 'error', text: res.error || 'Failed to send report.' });
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-stone-900 border-2 border-red-500/80 text-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-4 sm:p-5 flex items-center justify-between text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-950 text-red-400 flex items-center justify-center shadow-md">
              <Mail className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-stone-950 text-red-300 px-2 py-0.5 rounded-full">
                  GOOGLE WORKSPACE GMAIL
                </span>
                <span className="text-[11px] font-bold text-red-100">
                  Email Receipts & Reports
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                Gmail Integration & Automated Receipts
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

        {/* Auth status bar */}
        <div className="bg-stone-950 px-4 py-3 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Google User'}
                  className="w-8 h-8 rounded-full border border-amber-500"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                  {currentUser.email?.[0]?.toUpperCase() || 'G'}
                </div>
              )}
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{currentUser.displayName || currentUser.email}</span>
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-md font-mono">
                    ✓ Connected
                  </span>
                </div>
                <div className="text-[11px] text-stone-400">{currentUser.email}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-stone-400 text-xs">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Connect your Gmail account to send receipts and reports directly.</span>
            </div>
          )}

          {currentUser ? (
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-900 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div className="bg-stone-950 px-4 pt-2 border-b border-stone-800 flex gap-2">
          <button
            onClick={() => setActiveTab('send_receipt')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'send_receipt'
                ? 'bg-stone-900 text-red-300 border-t-2 border-red-500 shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Send Order Receipt</span>
          </button>
          <button
            onClick={() => setActiveTab('daily_report')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'daily_report'
                ? 'bg-stone-900 text-red-300 border-t-2 border-red-500 shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Daily Sales Report</span>
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'inbox'
                ? 'bg-stone-900 text-red-300 border-t-2 border-red-500 shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Recent Gmail Messages</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {statusMsg && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between border ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500'
                  : statusMsg.type === 'error'
                  ? 'bg-rose-950/80 text-rose-200 border-rose-500'
                  : 'bg-amber-950/80 text-amber-200 border-amber-500'
              }`}
            >
              <span>{statusMsg.text}</span>
              <button
                onClick={() => setStatusMsg(null)}
                className="text-stone-400 hover:text-white font-mono ml-2 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {activeTab === 'send_receipt' && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-3">
                <label className="block text-xs font-black text-amber-400 uppercase">
                  Select Order to Email
                </label>
                {orders.length === 0 ? (
                  <p className="text-xs text-stone-400">No completed orders found today.</p>
                ) : (
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-900 border border-stone-700 text-white rounded-xl text-xs font-bold focus:outline-none focus:border-red-500"
                  >
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        #{o.billNumber} • {o.customerName || 'Walk-in'} • {shop.currencySymbol}
                        {o.totalAmount} • ({new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-3">
                <label className="block text-xs font-black text-amber-400 uppercase">
                  Customer Email Address
                </label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-900 border border-stone-700 text-white rounded-xl text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <button
                type="button"
                onClick={promptSendReceipt}
                disabled={!currentUser || loading || !selectedOrderId}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {currentUser ? 'Send Email Receipt via Gmail' : 'Please Sign In with Google First'}
                </span>
              </button>
            </div>
          )}

          {activeTab === 'daily_report' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-2">
                  <label className="block text-xs font-black text-amber-400 uppercase">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-900 border border-stone-700 text-white rounded-xl text-xs focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-2">
                  <label className="block text-xs font-black text-amber-400 uppercase">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    placeholder="owner@example.com"
                    value={reportRecipient}
                    onChange={(e) => setReportRecipient(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-900 border border-stone-700 text-white rounded-xl text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={promptSendDailyReport}
                disabled={!currentUser || loading}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>
                  {currentUser ? `Email ${reportDate} Sales Report` : 'Please Sign In with Google First'}
                </span>
              </button>
            </div>
          )}

          {activeTab === 'inbox' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-stone-300">Recent Gmail Messages</h4>
                <button
                  onClick={loadEmails}
                  disabled={isLoadingEmails || !currentUser}
                  className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEmails ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {isLoadingEmails ? (
                <div className="text-center py-8 text-stone-400 text-xs">Loading emails from Gmail...</div>
              ) : recentEmails.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-xs">No recent emails found or not signed in.</div>
              ) : (
                <div className="space-y-2">
                  {recentEmails.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1 hover:border-red-500/50 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white truncate max-w-[250px]">{msg.from || 'Unknown'}</span>
                        <span className="text-[10px] text-stone-500">{msg.date ? new Date(msg.date).toLocaleDateString() : ''}</span>
                      </div>
                      <div className="text-xs text-amber-300 font-semibold">{msg.subject || '(No Subject)'}</div>
                      <div className="text-[11px] text-stone-400 line-clamp-2">{msg.snippet}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mandatory User Confirmation Dialog */}
        {confirmDialog && confirmDialog.isOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs">
            <div className="bg-stone-900 border-2 border-amber-500 p-5 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-black text-base">
                <AlertCircle className="w-5 h-5" />
                <span>Confirm Email Action</span>
              </div>
              <h3 className="text-sm font-bold text-white">{confirmDialog.title}</h3>
              <p className="text-xs text-stone-300 leading-relaxed">{confirmDialog.description}</p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const action = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    await action();
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
                >
                  Confirm & Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <span>Connected via Google Workspace APIs • Secure in-memory token</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
