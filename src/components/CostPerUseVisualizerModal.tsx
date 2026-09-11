"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, X, Sparkles, Clock, Check, ShieldAlert } from 'lucide-react';

interface CostPerUseVisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: number;
  initialDescription?: string;
  onApplyCalculation?: (costPerUse: number, estimatedUses: number) => void;
  onSendToCoolingOff?: (coolingHours: 24 | 48, costPerUse: number, estimatedUses: number, amount?: number, description?: string) => void;
}

const USAGE_PRESETS = [
  { label: 'Special Occasion', uses: 5, icon: '🥂', desc: 'Rare events & galas' },
  { label: 'Monthly Routine', uses: 12, icon: '🗓️', desc: 'Once a month' },
  { label: 'Weekend Gear', uses: 52, icon: '🧗', desc: 'Once a week for 1 yr' },
  { label: 'Workday Essential', uses: 220, icon: '💼', desc: 'Office days' },
  { label: 'Everyday Daily', uses: 365, icon: '⚡', desc: 'Used every single day' },
  { label: 'Long-Term Staple', uses: 700, icon: '🏆', desc: '2+ years of heavy use' },
];

export const CostPerUseVisualizerModal: React.FC<CostPerUseVisualizerModalProps> = ({
  isOpen,
  onClose,
  initialAmount = 150,
  initialDescription = '',
  onApplyCalculation,
  onSendToCoolingOff,
}) => {
  const [price, setPrice] = useState<number>(initialAmount || 150);
  const [uses, setUses] = useState<number>(50);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keep price updated if initialAmount changes
  React.useEffect(() => {
    if (initialAmount && initialAmount > 0) {
      setPrice(initialAmount);
    }
  }, [initialAmount]);

  const costPerUse = uses > 0 ? Number((price / uses).toFixed(2)) : price;

  // Emotional Anchor benchmark
  const getAnchorBenchmark = (cpu: number) => {
    if (cpu <= 0.75) {
      return {
        badge: 'Outstanding Value',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        text: '☕ Less than half a coffee per use. Highly justified investment if used consistently!',
      };
    }
    if (cpu <= 2.5) {
      return {
        badge: 'Solid Utilitarian Buy',
        color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
        text: '🥑 About the cost of an espresso or fruit snack per use. Reasonable daily ROI.',
      };
    }
    if (cpu <= 8.0) {
      return {
        badge: 'Moderate Luxury',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        text: '🥪 Equivalent to a quick sandwich or cinema ticket per use. Make sure you truly love it.',
      };
    }
    return {
      badge: 'High Emotional Friction',
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      text: '⚠️ Steep per-use expense! Consider renting, borrowing, or holding off for 24-48 hours.',
    };
  };

  const benchmark = getAnchorBenchmark(costPerUse);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop with smooth fade transition */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            onClick={onClose}
          />

          <motion.div
            initial={isMobile ? { y: '100%', opacity: 0.5 } : { scale: 0.95, opacity: 0, y: 16 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
            exit={isMobile ? { y: '100%', opacity: 0 } : { scale: 0.95, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl z-10 text-slate-100 max-h-[92vh] sm:max-h-[88vh] flex flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            {/* Top grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

            {/* Pinned Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                  <Calculator className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">Cost-Per-Use Visualizer</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                    {initialDescription ? `Evaluating "${initialDescription}"` : 'Translate upfront price into true utility value'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0 ml-2"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto py-3.5 space-y-4 pr-1 sm:pr-1.5 scrollbar-thin">
              {/* Value Big Metric Showcase - Compact & Focused */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-800/40 border border-slate-700/80 text-center relative overflow-hidden">
                <div className="text-[10px] sm:text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider mb-0.5">
                  Real Calculated Cost Per Use
                </div>
                <div className="flex items-baseline justify-center gap-1.5 my-0.5">
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    ${costPerUse.toFixed(2)}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-400 font-mono">/ wear or use</span>
                </div>

                {/* Emotional Anchor Tag */}
                <div className="mt-2 flex items-center justify-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${benchmark.color}`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {benchmark.badge}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  {benchmark.text}
                </p>
              </div>

              {/* Price and Estimated Uses Adjusters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] sm:text-xs font-semibold text-slate-400 flex justify-between">
                    <span>Upfront Cost</span>
                    <span className="text-white font-mono font-bold">${price.toFixed(2)}</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-semibold text-xs">$</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={price}
                      onChange={(e) => setPrice(Math.max(1, parseFloat(e.target.value) || 1))}
                      className="w-full pl-6 pr-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] sm:text-xs font-semibold text-slate-400 flex justify-between">
                    <span>Total Uses</span>
                    <span className="text-white font-mono font-bold">{uses}x</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={uses}
                      onChange={(e) => setUses(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Slider for quick scrubbing */}
              <div className="space-y-1 bg-slate-800/30 p-2.5 rounded-xl border border-slate-800/80">
                <div className="flex justify-between text-[10px] sm:text-[11px] text-slate-400 font-mono">
                  <span>1 use</span>
                  <span className="text-blue-400 font-bold">Scrub: {uses} uses</span>
                  <span>500+ uses</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="500"
                  value={uses}
                  onChange={(e) => setUses(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Usage Frequency Presets */}
              <div>
                <div className="text-[11px] sm:text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Usage Frequency Presets</span>
                  <span className="text-[10px] text-slate-500">Tap to select</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {USAGE_PRESETS.map((p) => {
                    const isSelected = uses === p.uses;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setUses(p.uses)}
                        className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500/60 text-white shadow-xs'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-xs font-bold">
                          <span>{p.icon}</span>
                          <span>{p.uses}x</span>
                        </div>
                        <div className="text-[10px] sm:text-[11px] font-medium text-slate-300 truncate mt-0.5">
                          {p.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Breakeven Roadmap */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs space-y-1.5">
                <div className="font-semibold text-slate-300 flex items-center gap-1 text-[11px] sm:text-xs">
                  <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                  <span>Breakeven Thresholds:</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-[10px] sm:text-[11px]">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <div className="text-slate-400 text-[10px]">At $5.00/use</div>
                    <div className="font-bold text-white font-mono mt-0.5">{Math.ceil(price / 5)} uses</div>
                  </div>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <div className="text-slate-400 text-[10px]">At $2.00/use</div>
                    <div className="font-bold text-white font-mono mt-0.5">{Math.ceil(price / 2)} uses</div>
                  </div>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <div className="text-slate-400 text-[10px]">At $1.00/use</div>
                    <div className="font-bold text-white font-mono mt-0.5">{Math.ceil(price / 1)} uses</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Action Footer */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2 shrink-0 bg-slate-900">
              {onSendToCoolingOff && (
                <button
                  type="button"
                  onClick={() => {
                    onSendToCoolingOff(24, costPerUse, uses, price, initialDescription);
                    onClose();
                  }}
                  className="w-full sm:w-1/2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Lock in Cooling-Off (24h)</span>
                </button>
              )}

              {onApplyCalculation ? (
                <button
                  type="button"
                  onClick={() => {
                    onApplyCalculation(costPerUse, uses);
                    onClose();
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-950"
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Save with Cost-Per-Use</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <span>Done</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
