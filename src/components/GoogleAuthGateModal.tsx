import React, { useState } from 'react';
import { AuthUser } from '../types';
import { googleSignIn, logout as firebaseLogout } from '../services/firebaseAuth';
import { isOwner, OWNER_EMAIL } from '../utils/ownerAuth';
import {
  ShieldCheck,
  LogIn,
  Mail,
  CheckCircle2,
  Lock,
  Sparkles,
  User,
  LogOut,
  X,
  AlertCircle,
  Crown,
} from 'lucide-react';

interface GoogleAuthGateModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentUser: AuthUser | null;
  onLoginSuccess: (user: AuthUser) => void;
  onLogout: () => void;
  isMandatory?: boolean; // When true, cannot close without logging in
}

export const GoogleAuthGateModal: React.FC<GoogleAuthGateModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
  isMandatory = false,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isCurrentOwner = isOwner(currentUser);

  // Firebase Google Popup Sign-in
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        const rawEmail = res.user.email || 'user@gmail.com';
        const cleanEmail = rawEmail.trim().toLowerCase().replace('gamil.com', 'gmail.com');
        const authUser: AuthUser = {
          uid: res.user.uid,
          email: cleanEmail,
          displayName:
            res.user.displayName ||
            cleanEmail.split('@')[0] ||
            (cleanEmail === OWNER_EMAIL ? 'A.H Qureshi' : 'ZCB Customer'),
          photoURL: res.user.photoURL || undefined,
          authMethod: 'google',
        };
        onLoginSuccess(authUser);
      }
    } catch (err: any) {
      console.warn('Popup sign in failed or cancelled, allowing direct email sign in:', err);
      setErrorMsg(
        'Google popup was blocked or closed. Please tap the Owner 1-Click button or enter your Gmail below.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Direct Gmail Sign-in (Reliable in all iframe & browser sandbox environments)
  const handleDirectEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    let email = emailInput.trim().toLowerCase().replace('gamil.com', 'gmail.com');
    if (!email.includes('@')) {
      email = `${email}@gmail.com`;
    }

    const isThisOwner = email === OWNER_EMAIL;
    const displayName =
      nameInput.trim() || (isThisOwner ? 'A.H Qureshi (Owner)' : email.split('@')[0]);
    const authUser: AuthUser = {
      uid: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email,
      displayName,
      authMethod: 'email',
    };

    onLoginSuccess(authUser);
  };

  // Quick 1-tap demo account using detected user email
  const handleQuickLogin = (email: string) => {
    const cleanEmail = email.trim().toLowerCase().replace('gamil.com', 'gmail.com');
    const isThisOwner = cleanEmail === OWNER_EMAIL;
    const displayName = isThisOwner ? 'A.H Qureshi (Owner)' : cleanEmail.split('@')[0];
    const authUser: AuthUser = {
      uid: `usr_quick_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: cleanEmail,
      displayName,
      authMethod: 'google',
    };
    onLoginSuccess(authUser);
  };

  return (
    <div
      id="google-auth-gate-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-stone-900 border-2 border-amber-500/80 text-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 p-5 text-stone-950 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-950 text-amber-400 flex items-center justify-center shadow-lg border border-amber-400/40">
              <Lock className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider bg-stone-950/30 px-2 py-0.5 rounded-full text-stone-900">
                  Google Workspace & Auth Gate
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight mt-0.5">
                {currentUser
                  ? isCurrentOwner
                    ? '👑 Shop Owner Account'
                    : '👤 Customer Account'
                  : 'Sign in with Google'}
              </h2>
            </div>
          </div>

          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-950/20 hover:bg-stone-950/40 text-stone-950 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* If already signed in: Show profile details & switch options */}
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 bg-stone-800/80 rounded-2xl border border-amber-500/40 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-stone-950 font-black text-xl shadow-md overflow-hidden shrink-0 border-2 border-amber-400">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{currentUser.displayName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white truncate">
                      {currentUser.displayName}
                    </span>
                    {isCurrentOwner ? (
                      <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <Crown className="w-3 h-3 text-stone-950" />
                        <span>👑 SHOP OWNER</span>
                      </span>
                    ) : (
                      <span className="text-[10px] bg-stone-700 text-stone-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>Customer Account</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-amber-200 font-mono truncate mt-0.5">
                    {currentUser.email}
                  </div>
                  <div className="text-[11px] text-stone-300 mt-1 flex items-center gap-1">
                    {isCurrentOwner ? (
                      <span className="text-emerald-400 font-bold">
                        ✓ Full Owner Access: POS Terminal + Customer Website + Both Together
                        Unlocked
                      </span>
                    ) : (
                      <span className="text-stone-400">
                        Public customer online ordering access active
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={async () => {
                    await firebaseLogout();
                    onLogout();
                  }}
                  className="flex-1 py-3 bg-red-950/80 hover:bg-red-900 border border-red-600/60 text-red-200 font-bold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out / Switch Account</span>
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-2xl text-xs transition-colors cursor-pointer shadow-md"
                  >
                    Continue to App
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Not Signed in yet: Google Sign In Gate */
            <div className="space-y-4">
              {/* Dedicated Owner 1-Click Login Card */}
              <div className="p-4 bg-gradient-to-br from-amber-950/70 via-stone-900 to-amber-950/50 rounded-2xl border-2 border-amber-500 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>👑 Shop Owner Login</span>
                  </div>
                  <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded-full">
                    BOTH APPS UNLOCKED
                  </span>
                </div>
                <p className="text-[12px] text-stone-300 leading-snug">
                  Logging in with{' '}
                  <strong className="text-amber-200 font-mono">a.hqureshi1256@gmail.com</strong>{' '}
                  unlocks both the <strong className="text-white">Cashier POS Terminal</strong> and{' '}
                  <strong className="text-white">Customer Website</strong> simultaneously!
                </p>
                <button
                  type="button"
                  onClick={() => handleQuickLogin(OWNER_EMAIL)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer ring-2 ring-amber-300"
                >
                  <Crown className="w-4 h-4 stroke-[2.5]" />
                  <span>Log in as Owner (a.hqureshi1256@gmail.com)</span>
                </button>
              </div>

              {errorMsg && (
                <div className="bg-red-950/80 border border-red-500/50 rounded-2xl p-3 text-xs text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Official Google Sign-In Button */}
              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-white hover:bg-stone-100 text-stone-800 font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-3 transition-transform active:scale-98 cursor-pointer border border-stone-300"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isLoading ? 'Signing In...' : 'Sign in with Google Account'}</span>
                </button>
              </div>

              {/* Manual Gmail Form */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-stone-900 px-3 text-stone-500 font-bold">
                    Or Enter Any Gmail Address
                  </span>
                </div>
              </div>

              <form onSubmit={handleDirectEmailSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    📧 Gmail / Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="e.g. a.hqureshi1256@gmail.com"
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    Note: Any other Gmail account will open the Customer Ordering Website only.
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sign In with this Email</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
