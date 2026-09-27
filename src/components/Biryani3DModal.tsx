import React, { useState } from 'react';
import { Biryani3DPlate } from './Biryani3DPlate';
import { posSound } from '../utils/audio';
import { X, Flame, Sparkles, RotateCw, Volume2, Info, Eye } from 'lucide-react';

interface Biryani3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName?: string;
}

export const Biryani3DModal: React.FC<Biryani3DModalProps> = ({
  isOpen,
  onClose,
  shopName = 'Zaiqa Chicken Biryani',
}) => {
  const [autoRotate, setAutoRotate] = useState(true);
  const [wobbleKey, setWobbleKey] = useState(0);

  if (!isOpen) return null;

  const handleManualWobble = () => {
    posSound.playBiryaniWobble();
    setWobbleKey((k) => k + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 border-2 border-amber-500/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 p-4 flex items-center justify-between text-stone-950 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-stone-950 text-amber-400 flex items-center justify-center font-black text-sm shadow-inner">
              3D
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight flex items-center gap-2">
                <span>Interactive 3D Biryani Model</span>
                <span className="bg-stone-950 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Live Physics
                </span>
              </h2>
              <p className="text-xs font-bold text-stone-900/80">
                Click, drag, or tap the plate to rotate and wobble the biryani!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-950/20 hover:bg-stone-950/40 text-stone-950 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Showcase Canvas Area */}
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/30 via-stone-900 to-stone-950 border-b border-stone-800">
          {/* Subtle glow behind plate */}
          <div className="absolute w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          {/* Interactive 3D Biryani Plate */}
          <div className="relative my-2">
            <Biryani3DPlate
              size={280}
              interactive={true}
              autoRotate={autoRotate}
              showWobblePrompt={false}
              wobbleTrigger={wobbleKey}
              onPlateClick={() => {}}
            />
          </div>

          {/* User Tap Instruction Badge */}
          <div className="mt-2 flex items-center gap-2 text-xs font-black text-amber-300 bg-stone-900/90 border border-amber-500/40 px-3.5 py-1.5 rounded-full shadow-lg">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
            <span>👆 Tap on plate or drag to tilt & 360° spin</span>
          </div>
        </div>

        {/* Interactive Action Controls Bar */}
        <div className="p-4 sm:p-5 bg-stone-950 space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleManualWobble}
              className="py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-95 transition-all ring-2 ring-amber-300"
            >
              <Sparkles className="w-4 h-4 text-stone-950 fill-stone-950" />
              <span>🍲 Wobble Biryani!</span>
            </button>

            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`py-3 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm cursor-pointer border transition-all ${
                autoRotate
                  ? 'bg-stone-800 hover:bg-stone-750 text-amber-300 border-amber-500/40 shadow-inner'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border-stone-800'
              }`}
            >
              <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} />
              <span>{autoRotate ? 'Rotation: ON (360°)' : 'Rotation: OFF'}</span>
            </button>
          </div>

          {/* Authentic Ingredients & Highlights Card */}
          <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3.5 text-xs text-stone-300 space-y-2">
            <div className="flex items-center gap-1.5 font-black text-amber-300 text-xs">
              <Info className="w-3.5 h-3.5" />
              <span>{shopName} Special Recipe Highlights:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span>Saffron Fragrant Basmati Rice</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span>Tender Roasted Chicken Piece</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-600 shrink-0" />
                <span>Crispy Fried Onion (Birista)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>Fresh Lemon, Green Chillies & Mint</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
