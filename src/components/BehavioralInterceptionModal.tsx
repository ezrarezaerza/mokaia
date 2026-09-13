"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Clock, Calculator, HeartHandshake, ArrowRight, X, Sparkles } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface BehavioralInterceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  description: string;
  categoryName: string;
  categoryIcon: string;
  comfortFundRemaining?: number;
  onConfirmCoolingOff: (hours: 24 | 48) => void;
  onOpenCostPerUse: () => void;
  onUseComfortFund: () => void;
  onProceedAnyway: () => void;
}

export const BehavioralInterceptionModal: React.FC<BehavioralInterceptionModalProps> = ({
  isOpen,
  onClose,
  amount,
  description,
  categoryName,
  categoryIcon,
  comfortFundRemaining = 25,
  onConfirmCoolingOff,
  onOpenCostPerUse,
  onUseComfortFund,
  onProceedAnyway,
}) => {
  const { format: formatMoney } = useCurrency();
  const [selectedLockHours, setSelectedLockHours] = useState<24 | 48>(24);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
            onClick={onClose}
          />

          <motion.div
            initial={isMobile ? { y: '100%', opacity: 0.5 } : { scale: 0.95, y: 16, opacity: 0 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%', opacity: 0 } : { scale: 0.95, y: 16, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 text-slate-100 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            {/* Top grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Pinned Header */}
            <div className="relative p-4 sm:p-5 border-b border-slate-800 shrink-0 text-center">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2 shadow-inner">
                <ShieldAlert className="w-5 h-5" />
              </div>

              <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-400 mb-0.5">
                Mindful Moment
              </div>
              <h3 className="text-lg font-extrabold text-white tracking-tight">
                Pause for a Second 🌬️
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 max-w-xs mx-auto">
                You are about to log an unbudgeted Lifestyle Want. Let&apos;s check if this impulse is temporary.
              </p>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 space-y-3.5 flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {/* Transaction Summary Preview Box */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl p-2 rounded-xl bg-slate-800 border border-slate-700/80 shrink-0">
                    {categoryIcon || '✨'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white leading-snug truncate">
                      {description || 'Impulse Purchase'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{categoryName}</div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base sm:text-lg font-mono font-extrabold text-white">
                    {formatMoney(amount)}
                  </div>
                  <div className="text-[9px] font-mono text-amber-400 font-semibold uppercase">
                    Lifestyle Want
                  </div>
                </div>
              </div>

              {/* Guardrail Option Cards */}
              <div className="space-y-2.5">
                {/* 1. Cooling-Off Queue Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/30 to-slate-800/80 border border-amber-500/30">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-white">
                        The Cooling-Off Queue
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-700 text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={() => setSelectedLockHours(24)}
                        className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                          selectedLockHours === 24
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        24h
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedLockHours(48)}
                        className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                          selectedLockHours === 48
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        48h
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                    Lock this purchase for {selectedLockHours} hours to cool off. If you still crave it when the timer expires, approve it with zero guilt!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onConfirmCoolingOff(selectedLockHours);
                      onClose();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-950/40"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Hold in The Cooling-Off Queue ({selectedLockHours}h)</span>
                  </button>
                </div>

                {/* 2. Cost-Per-Use Visualizer */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCostPerUse();
                  }}
                  className="w-full p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-left flex items-center justify-between group transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                        <span>Cost-Per-Use Visualizer</span>
                        <span className="text-[10px] font-normal text-blue-400 font-mono shrink-0">Value Check</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        See how much this item really costs per wear or day of use.
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors shrink-0 ml-2" />
                </button>

                {/* 3. Comfort Fund Micro-Budget */}
                {comfortFundRemaining > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onUseComfortFund();
                      onClose();
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-left flex items-center justify-between group transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
                        <HeartHandshake className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                          <span>Fund from The Comfort Fund</span>
                          <span className="text-[10px] font-bold text-emerald-400 font-mono shrink-0">
                            {formatMoney(comfortFundRemaining)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          Guilt-free micro-budget allocated specifically for stressful days.
                        </div>
                      </div>
                    </div>
                    <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors shrink-0 ml-2" />
                  </button>
                )}
              </div>
            </div>

            {/* Pinned Footer with Autonomy Bypass */}
            <div className="p-3 sm:p-3.5 border-t border-slate-800 bg-slate-900 text-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  onProceedAnyway();
                  onClose();
                }}
                className="text-xs text-slate-400 hover:text-slate-200 underline font-medium transition cursor-pointer"
              >
                I have thought this through — log immediately
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
