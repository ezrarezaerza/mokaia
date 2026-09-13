"use client";

import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  HeartHandshake,
  Lock,
  Unlock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Settings,
  Plus,
} from 'lucide-react';
import {
  unlockUserComfortFund,
  lockUserComfortFund,
  updateComfortFundAllowance,
} from '../lib/db';
import type { LocalUser } from '../types';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';
import { useCurrency } from '../context/CurrencyContext';

interface ComfortFundCardProps {
  user: LocalUser;
  onUserUpdated?: (updated: LocalUser) => void;
  onLogComfortSpend?: () => void;
}

export const ComfortFundCard: React.FC<ComfortFundCardProps> = ({
  user,
  onUserUpdated,
  onLogComfortSpend,
}) => {
  const { format: formatMoney, symbol, config } = useCurrency();
  const [isUnlocked, setIsUnlocked] = useState<boolean>(user.comfortFundUnlocked ?? false);
  const [isAdjustingAllowance, setIsAdjustingAllowance] = useState<boolean>(false);
  const [allowanceInput, setAllowanceInput] = useState<number>(user.comfortFundAllowance ?? 25);

  const remaining = user.comfortFundRemaining ?? (user.comfortFundAllowance ?? 25);
  const allowance = user.comfortFundAllowance ?? 25;

  // Slide to Unlock Framer Motion Physics
  const containerRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);
  const textOpacity = useTransform(dragX, [0, 150], [1, 0]);

  // Keep state in sync if props change
  React.useEffect(() => {
    setIsUnlocked(user.comfortFundUnlocked ?? false);
    setAllowanceInput(user.comfortFundAllowance ?? 25);
  }, [user]);

  const handleDragEnd = async (_: any, info: any) => {
    // If dragged past threshold (> 140px or fast velocity)
    if (info.offset.x > 140 || info.velocity.x > 300) {
      dragX.set(180);
      setIsUnlocked(true);
      soundFx.playUnlockSound();
      haptics.unlockHaptic();
      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#8b5cf6'],
        });
      } catch {
        // Fallback
      }
      const updated = await unlockUserComfortFund(user.id);
      if (updated && onUserUpdated) onUserUpdated(updated);
    } else {
      dragX.set(0);
    }
  };

  const handleLockAgain = async () => {
    setIsUnlocked(false);
    dragX.set(0);
    soundFx.playCoinSound();
    haptics.lightTap();
    const updated = await lockUserComfortFund(user.id);
    if (updated && onUserUpdated) onUserUpdated(updated);
  };

  const handleSaveAllowance = async () => {
    if (allowanceInput <= 0) return;
    const updated = await updateComfortFundAllowance(user.id, allowanceInput);
    if (updated && onUserUpdated) onUserUpdated(updated);
    setIsAdjustingAllowance(false);
  };

  const percentLeft = allowance > 0 ? Math.min(100, Math.max(0, (remaining / allowance) * 100)) : 0;

  return (
    <div
      className={`rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isUnlocked
          ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40 shadow-xl shadow-emerald-950/20'
          : 'bg-slate-900/90 border-slate-800 shadow-lg'
      }`}
    >
      {/* Ambient background glow when unlocked */}
      {isUnlocked && (
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      )}

      <div className="p-5 sm:p-6 space-y-5">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-2xl border transition-colors ${
                isUnlocked
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700/60'
              }`}
            >
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">The Comfort Fund</h3>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${
                    isUnlocked
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {isUnlocked ? 'Unlocked • Active' : 'Locked Vault'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Stress-spending micro-budget protected by mindful intent.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsAdjustingAllowance(!isAdjustingAllowance)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Adjust Monthly Comfort Allowance"
            >
              <Settings className="w-4 h-4" />
            </button>
            {isUnlocked && (
              <button
                type="button"
                onClick={handleLockAgain}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 transition cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                <span>Lock</span>
              </button>
            )}
          </div>
        </div>

        {/* Adjust Allowance Sub-Panel */}
        {isAdjustingAllowance && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2 text-xs"
          >
            <div className="font-semibold text-white">Monthly Micro-Budget Allowance</div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">{symbol}</span>
              <input
                type="number"
                min={config.decimals === 0 ? '10000' : '5'}
                step={config.decimals === 0 ? '10000' : '5'}
                value={allowanceInput}
                onChange={(e) => setAllowanceInput(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-28 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold focus:outline-hidden focus:border-emerald-500"
              />
              <div className="flex gap-1">
                {(config.decimals === 0 ? [100000, 250000, 500000] : [15, 25, 50]).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAllowanceInput(val)}
                    className="px-2 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
                  >
                    {formatMoney(val, { compact: true })}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleSaveAllowance}
                className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
              >
                Save
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Guilt-free safety reserve that automatically resets on the 1st of every month.
            </p>
          </motion.div>
        )}

        {/* Balance Display & Meter */}
        <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider font-semibold">
              Available Comfort Balance
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {formatMoney(remaining)}
              </span>
              <span className="text-xs font-mono text-slate-400">
                / {formatMoney(allowance)} this month
              </span>
            </div>
          </div>

          <div className="w-full sm:w-48 space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Budget Health</span>
              <span className={percentLeft > 25 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {Math.round(percentLeft)}% Remaining
              </span>
            </div>
            <div className="h-2 w-full bg-slate-700/70 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  percentLeft > 25 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${percentLeft}%` }}
                transition={{ type: 'spring', damping: 20, stiffness: 120 }}
              />
            </div>
          </div>
        </div>

        {/* State-dependent interaction: Locked vs Unlocked */}
        {!isUnlocked ? (
          /* Slide To Unlock Interaction */
          <div className="space-y-2">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Take a mindful breath: slide to unlock your comfort spending</span>
              <span className="font-mono text-[10px] text-amber-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Protected
              </span>
            </div>

            <div
              ref={containerRef}
              className="relative h-14 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-1.5 flex items-center overflow-hidden select-none"
            >
              {/* Background Track Text */}
              <motion.div
                style={{ opacity: textOpacity }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-bold text-slate-300 pl-8 uppercase tracking-wider flex items-center gap-1.5"
              >
                <span>Slide to Unlock Comfort Fund</span>
                <ChevronRight className="w-4 h-4 text-slate-400 animate-pulse" />
              </motion.div>

              {/* Draggable Slider Handle */}
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 200 }}
                dragElastic={0.1}
                dragMomentum={false}
                style={{ x: dragX }}
                onDragEnd={handleDragEnd}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="z-10 w-11 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-emerald-950/50 cursor-grab active:cursor-grabbing shrink-0"
              >
                <Lock className="w-4 h-4" />
              </motion.div>
            </div>
          </div>
        ) : (
          /* Unlocked State: Positive reinforcement and quick treat logger */
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <Sparkles className="w-4 h-4" />
                <span>Comfort Fund Unlocked</span>
              </div>
              <p className="text-xs text-slate-300">
                You have intentionally granted yourself permission for a restorative treat. Zero guilt allowed.
              </p>
            </div>

            {onLogComfortSpend && (
              <button
                type="button"
                onClick={onLogComfortSpend}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-950 active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Comfort Treat</span>
              </button>
            )}
          </div>
        )}

        {/* Reset Rule Notice */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Resets on the 1st of each month (UTC)</span>
          </div>
          <span className="font-mono text-slate-500">Auto-Refill: {formatMoney(allowance)}</span>
        </div>
      </div>
    </div>
  );
};
