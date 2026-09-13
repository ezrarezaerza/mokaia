"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingDown,
  Zap,
  ShieldAlert,
  Sparkles,
  Calendar,
  DollarSign,
  ArrowRight,
  Flame,
  CheckCircle2,
  Info,
  Layers,
} from 'lucide-react';
import type { LocalDebt } from '../types';
import { simulateDebtStrategy } from '../lib/debtEngine';
import { haptics } from '../lib/haptics';
import { soundFx } from '../lib/soundFx';
import { useCurrency } from '../context/CurrencyContext';

interface DebtStrategySimulatorProps {
  debts: LocalDebt[];
  onOpenPaymentModal?: (debt: LocalDebt) => void;
}

export const DebtStrategySimulator: React.FC<DebtStrategySimulatorProps> = ({
  debts,
  onOpenPaymentModal,
}) => {
  const { format: formatMoney, config } = useCurrency();
  const isZeroDecimal = config.decimals === 0;
  const sliderMax = isZeroDecimal ? 5000000 : 500;
  const sliderStep = isZeroDecimal ? 50000 : 10;
  const defaultExtra = isZeroDecimal ? 500000 : 50;

  const [strategy, setStrategy] = useState<'SNOWBALL' | 'AVALANCHE'>('AVALANCHE');
  const [extraPower, setExtraPower] = useState<number>(defaultExtra);
  const [showSchedule, setShowSchedule] = useState(false);

  // Run simulation reactively whenever strategy, debts, or extra payment changes
  const simulation = useMemo(() => {
    return simulateDebtStrategy(debts, strategy, extraPower);
  }, [debts, strategy, extraPower]);

  // Compare Snowball vs Avalanche side-by-side with current extra power
  const comparison = useMemo(() => {
    const avalanche = simulateDebtStrategy(debts, 'AVALANCHE', extraPower);
    const snowball = simulateDebtStrategy(debts, 'SNOWBALL', extraPower);
    return {
      avalanche,
      snowball,
      interestDiff: Math.abs(snowball.totalInterestPaid - avalanche.totalInterestPaid),
    };
  }, [debts, extraPower]);

  const activeDebtsCount = debts.filter(
    (d) => d.status === 'ACTIVE' && d.debtType !== 'IOU_RECEIVABLE' && d.remainingBalance > 0
  ).length;

  if (activeDebtsCount === 0) {
    return (
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
        <h3 className="text-sm font-bold text-white">No active debts to simulate!</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          All your registered liabilities are paid off. Add a loan, credit card, or BNPL plan to test repayment strategies.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
      {/* Header & Strategy Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Strategy Simulator
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Interactive Projections
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Compare Snowball (psychological quick wins) vs. Avalanche (mathematical interest savings).
          </p>
        </div>

        {/* Strategy Switcher Pills */}
        <div className="flex items-center p-1 bg-slate-800/80 rounded-2xl border border-slate-700/60 shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => {
              soundFx.playTickSound();
              haptics.selectionTick();
              setStrategy('AVALANCHE');
            }}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              strategy === 'AVALANCHE'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Avalanche (Lowest Cost)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playTickSound();
              haptics.selectionTick();
              setStrategy('SNOWBALL');
            }}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              strategy === 'SNOWBALL'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Snowball (Fastest Wins)</span>
          </button>
        </div>
      </div>

      {/* Monthly Extra Power Slider */}
      <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">
              Monthly Extra Repayment Power
            </span>
          </div>
          <span className="text-sm font-black font-mono text-amber-400">
            +{formatMoney(extraPower)}/mo
          </span>
        </div>

        <input
          type="range"
          min="0"
          max={sliderMax}
          step={sliderStep}
          value={extraPower}
          onChange={(e) => setExtraPower(Number(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer"
        />

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>+{formatMoney(0)} (Min only)</span>
          <span>+{formatMoney(sliderMax * 0.2, { compact: true })}</span>
          <span>+{formatMoney(sliderMax * 0.5, { compact: true })}</span>
          <span>+{formatMoney(sliderMax, { compact: true })}/mo</span>
        </div>

        <div className="text-[11px] text-slate-300">
          Base commitment: <strong className="text-white">{formatMoney(simulation.baseMonthlyTotal)}/mo</strong>
          {' • '}
          Total accelerated power:{' '}
          <strong className="text-amber-300 font-mono">{formatMoney(simulation.totalMonthlyAllocated)}/mo</strong>
        </div>
      </div>

      {/* Core Projection Metrics 4-Pack */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Freedom Date */}
        <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/60">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Debt-Free Horizon</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-black text-emerald-300 truncate">
            {simulation.targetDebtFreeDate}
          </div>
          <div className="mt-1 text-[11px] text-emerald-400 font-mono">
            {simulation.monthsToDebtFree} Months total
          </div>
        </div>

        {/* Time Saved */}
        <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/60">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Time Reclaimed</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-xl font-black font-mono text-purple-300">
            {simulation.monthsSavedVsMinimumOnly > 0
              ? `${simulation.monthsSavedVsMinimumOnly} Mo sooner`
              : 'Baseline'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Vs. paying minimums only
          </div>
        </div>

        {/* Total Interest Paid */}
        <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/60">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Projected Interest</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-xl font-black font-mono text-rose-300">
            {formatMoney(simulation.totalInterestPaid)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Across active balances
          </div>
        </div>

        {/* Interest Saved */}
        <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/60">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Interest Saved</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-black font-mono text-amber-300">
            {formatMoney(simulation.totalInterestSavedVsMinimumOnly)}
          </div>
          <div className="mt-1 text-[11px] text-amber-400/80">
            Kept in your pocket
          </div>
        </div>
      </div>

      {/* Side-by-Side Methodology Comparison Callout */}
      <div className="p-4 rounded-2xl bg-indigo-950/25 border border-indigo-500/25 text-xs text-indigo-200 space-y-2">
        <div className="flex items-center gap-2 font-bold text-white text-sm">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            {strategy === 'AVALANCHE'
              ? 'Avalanche Method Active: Math-First Optimization'
              : 'Snowball Method Active: Psychology-First Momentum'}
          </span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px] sm:text-xs">
          {strategy === 'AVALANCHE'
            ? `You target the highest APR balances first. Compared to Snowball, this saves ~${formatMoney(comparison.interestDiff)} in total interest bleed, getting you free with minimum dollars spent.`
            : `You target the smallest remaining balance first. Knocking out small accounts quickly triggers instant psychological momentum and eliminates bill count fast!`}
        </p>
      </div>

      {/* Repayment Sequence Hierarchy */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Target Repayment Sequence
          </h3>
          <span className="text-[11px] text-slate-400">
            {strategy === 'SNOWBALL' ? 'Ordered: Smallest to largest' : 'Ordered: Highest APR to lowest'}
          </span>
        </div>

        <div className="space-y-2.5">
          {simulation.repaymentSequence.map((item, idx) => (
            <div
              key={item.debtId}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                item.isCurrentTarget
                  ? 'bg-purple-950/30 border-purple-500/40 shadow-sm'
                  : 'bg-slate-800/40 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                    item.isCurrentTarget
                      ? 'bg-purple-500 text-white shadow-xs'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  #{idx + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{item.name}</span>
                    {item.isCurrentTarget && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Primary Target 🎯
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 space-x-2 font-mono">
                    <span>Balance: {formatMoney(item.balance)}</span>
                    <span>•</span>
                    <span>{item.interestRate}% APR</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                <div>
                  <span className="text-[10px] text-slate-400 block">Est. Payoff</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Month {item.estimatedMonthPayoff}
                  </span>
                </div>

                {item.isCurrentTarget && onOpenPaymentModal && (
                  <button
                    type="button"
                    onClick={() => {
                      const foundDebt = debts.find((d) => d.id === item.debtId);
                      if (foundDebt) onOpenPaymentModal(foundDebt);
                    }}
                    className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    Crush This Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optional Month-by-Month Schedule Accordion */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowSchedule(!showSchedule)}
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{showSchedule ? 'Hide month-by-month schedule' : 'View month-by-month projection breakdown'}</span>
        </button>

        {showSchedule && (
          <div className="mt-3 max-h-60 overflow-y-auto rounded-2xl bg-slate-950/80 border border-slate-800 p-3 space-y-2 text-xs font-mono">
            <div className="grid grid-cols-5 text-[10px] uppercase text-slate-500 pb-1 border-b border-slate-800">
              <span>Month</span>
              <span>Principal</span>
              <span>Interest</span>
              <span>Ending Bal</span>
              <span>Milestone</span>
            </div>
            {simulation.schedule.slice(0, 36).map((m) => (
              <div key={m.month} className="grid grid-cols-5 text-[11px] text-slate-300 py-1 border-b border-slate-900">
                <span className="text-slate-400">M{m.month}</span>
                <span className="text-emerald-400">{formatMoney(Number(m.totalPrincipalPaid))}</span>
                <span className="text-rose-400">{formatMoney(Number(m.totalInterestPaid))}</span>
                <span className="font-bold text-white">{formatMoney(Number(m.totalEndingBalance))}</span>
                <span className="text-[10px] text-purple-300 truncate">
                  {m.conqueredThisMonth.length > 0 ? `🎉 ${m.conqueredThisMonth.join(', ')}` : '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
