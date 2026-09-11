"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Package,
  Target,
  ShieldCheck,
  Clock,
  HeartHandshake,
  Ticket,
  Plus,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export type NavTab = 'ledger' | 'vault' | 'timeline' | 'cooling_off' | 'comfort_fund' | 'spinner';

interface MobileBottomNavProps {
  activeTab: NavTab | string;
  onChangeTab: (tab: NavTab) => void;
  onOpenCreate: () => void;
  coolingOffCount?: number;
  spinnerTickets?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenCreate,
  coolingOffCount = 0,
  spinnerTickets = 0,
}) => {
  const [isGuardrailsOpen, setIsGuardrailsOpen] = useState(false);

  const isGuardrailActive =
    activeTab === 'cooling_off' || activeTab === 'comfort_fund' || activeTab === 'spinner';

  const totalGuardrailBadge =
    coolingOffCount > 0 ? coolingOffCount : spinnerTickets > 0 ? spinnerTickets : 0;

  const handleSelectGuardrail = (tab: NavTab) => {
    onChangeTab(tab);
    setIsGuardrailsOpen(false);
  };

  return (
    <>
      {/* Mindful Guardrails Popover Sheet for Mobile */}
      <AnimatePresence>
        {isGuardrailsOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGuardrailsOpen(false)}
              className="sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            />

            {/* Sheet Modal */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-2xl space-y-4"
            >
              {/* Handle bar */}
              <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Mindful Guardrails
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Behavioral impulse tools & rewards
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGuardrailsOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  aria-label="Close Guardrails menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 3 Interactive Cards */}
              <div className="space-y-2.5 pt-1">
                {/* 1. Cooling-Off Queue */}
                <button
                  type="button"
                  onClick={() => handleSelectGuardrail('cooling_off')}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] ${
                    activeTab === 'cooling_off'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white flex items-center gap-2">
                        <span>The Cooling-Off Queue</span>
                        {coolingOffCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] animate-pulse">
                            {coolingOffCount} Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        24-48 hour holding pen for impulse desires
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* 2. Comfort Fund */}
                <button
                  type="button"
                  onClick={() => handleSelectGuardrail('comfort_fund')}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] ${
                    activeTab === 'comfort_fund'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">The Comfort Fund</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Protected micro-budget for stressful days
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* 3. Reward Spinner */}
                <button
                  type="button"
                  onClick={() => handleSelectGuardrail('spinner')}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] ${
                    activeTab === 'spinner'
                      ? 'bg-orange-500/15 border-orange-500/40 text-orange-200'
                      : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white flex items-center gap-2">
                        <span>The Reward Spinner</span>
                        {spinnerTickets > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-orange-500 text-white font-black text-[10px]">
                            {spinnerTickets} Spins
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Spin for mindful treats and perks
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Bottom Dock (5-item layout with centered elevated FAB) */}
      <nav
        id="mobile-bottom-navigation"
        aria-label="Mobile Navigation Dock"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/90 px-2 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-2xl transition-all"
      >
        <div className="grid grid-cols-5 items-center justify-items-center max-w-md mx-auto relative">
          {/* 1. Flow / Ledger */}
          <button
            type="button"
            onClick={() => onChangeTab('ledger')}
            className={`relative flex flex-col items-center justify-center w-full min-h-[46px] py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
              activeTab === 'ledger'
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 tracking-tight leading-none">Flow</span>
            {activeTab === 'ledger' && (
              <span className="absolute bottom-0 w-3.5 h-0.5 rounded-full bg-blue-400 shadow-xs" />
            )}
          </button>

          {/* 2. Goals / Timeline */}
          <button
            type="button"
            onClick={() => onChangeTab('timeline')}
            className={`relative flex flex-col items-center justify-center w-full min-h-[46px] py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
              activeTab === 'timeline'
                ? 'text-sky-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <Target className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 tracking-tight leading-none">Goals</span>
            {activeTab === 'timeline' && (
              <span className="absolute bottom-0 w-3.5 h-0.5 rounded-full bg-sky-400 shadow-xs" />
            )}
          </button>

          {/* 3. Center Elevated Action Button (+ Log Expense) */}
          <div className="relative flex flex-col items-center justify-center">
            <button
              id="mobile-center-log-fab"
              type="button"
              onClick={onOpenCreate}
              aria-label="Log Expense"
              className="relative -mt-6 w-13 h-13 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white shadow-xl shadow-blue-500/40 border-[3.5px] border-slate-900 flex items-center justify-center active:scale-90 hover:scale-105 transition-all cursor-pointer touch-manipulation group"
            >
              <span className="absolute -inset-1 rounded-full bg-blue-400/25 blur-sm group-hover:bg-blue-400/40 pointer-events-none" />
              <Plus className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200" />
            </button>
            <span className="text-[10px] mt-0.5 font-bold text-blue-400 tracking-tight leading-none">
              Log
            </span>
          </div>

          {/* 4. Vault */}
          <button
            type="button"
            onClick={() => onChangeTab('vault')}
            className={`relative flex flex-col items-center justify-center w-full min-h-[46px] py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
              activeTab === 'vault'
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 tracking-tight leading-none">Vault</span>
            {activeTab === 'vault' && (
              <span className="absolute bottom-0 w-3.5 h-0.5 rounded-full bg-indigo-400 shadow-xs" />
            )}
          </button>

          {/* 5. Mindful Guardrails */}
          <button
            type="button"
            onClick={() => setIsGuardrailsOpen(true)}
            className={`relative flex flex-col items-center justify-center w-full min-h-[46px] py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
              isGuardrailActive
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <div className="relative">
              <ShieldCheck className="w-5 h-5" />
              {totalGuardrailBadge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-500 px-1 text-[8.5px] font-black text-slate-950 shadow-xs">
                  {totalGuardrailBadge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight leading-none">Guardrails</span>
            {isGuardrailActive && (
              <span className="absolute bottom-0 w-3.5 h-0.5 rounded-full bg-cyan-400 shadow-xs" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
