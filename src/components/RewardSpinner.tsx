import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Ticket,
  Gift,
  X,
  Plus,
  ShieldCheck,
  Trophy,
  CheckCircle,
  ExternalLink,
  RotateCw,
} from 'lucide-react';
import type { LocalUser, LocalReward } from '../types';
import {
  DEFAULT_SPINNER_SLICES,
  type SpinnerSlice,
  EXP_RULES,
} from '../lib/gamification';
import {
  consumeSpinnerTicket,
  addRewardToInventory,
  awardUserExp,
  addGraceDayShield,
  addSpinnerTickets,
} from '../lib/db';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';

interface RewardSpinnerProps {
  user: LocalUser | null;
  onClose?: () => void;
  onOpenWallet?: () => void;
}

export const RewardSpinner: React.FC<RewardSpinnerProps> = ({
  user,
  onClose,
  onOpenWallet,
}) => {
  const [slices, setSlices] = useState<SpinnerSlice[]>(DEFAULT_SPINNER_SLICES);
  const [rotation, setRotation] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winningSlice, setWinningSlice] = useState<SpinnerSlice | null>(null);
  const [showWinModal, setShowWinModal] = useState<boolean>(false);
  const [customPrizeTitle, setCustomPrizeTitle] = useState<string>('');
  const [showAddCustomModal, setShowAddCustomModal] = useState<boolean>(false);

  const tickets = user?.spinnerTickets ?? 0;
  const numSlices = slices.length;
  const sliceAngle = 360 / numSlices;
  const radius = 160;
  const center = 175;
  const svgSize = 350;

  // Sound / haptic ticker simulation ref
  const lastTickAngle = useRef<number>(0);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#34d399', '#facc15', '#f43f5e', '#a855f7'],
      });
    } catch {
      // Non-blocking
    }
  };

  const handleSpin = async () => {
    if (isSpinning || !user) return;

    if (tickets <= 0) {
      // Alert user they need a ticket earned via level-up or streak milestone
      return;
    }

    // Deduct ticket
    const consumed = await consumeSpinnerTicket(user.id);
    if (!consumed) return;

    setIsSpinning(true);
    setWinningSlice(null);
    setShowWinModal(false);

    // Pick random target slice index
    const targetIndex = Math.floor(Math.random() * numSlices);
    const chosenSlice = slices[targetIndex];

    // Calculate rotational angle for the slice center with a random jitter (-12 to +12 degrees)
    const jitter = (Math.random() - 0.5) * 24;
    const sliceCenter = targetIndex * sliceAngle + sliceAngle / 2 + jitter;
    
    // Top pointer is at 0 degrees (12 o'clock).
    // To land on sliceCenter, wheel needs to stop such that (360 - (rotation % 360)) % 360 = sliceCenter
    const targetNormalized = (360 - sliceCenter + 360) % 360;
    const fullSpins = 6 + Math.floor(Math.random() * 3); // 6 to 8 full rotations
    const currentMod = rotation % 360;
    const forwardDistance = (targetNormalized - currentMod + 360) % 360;
    const nextRotation = rotation + fullSpins * 360 + forwardDistance;

    setRotation(nextRotation);

    // Audio & Haptic ticker simulation with realistic deceleration
    const tickIntervals = [50, 60, 70, 85, 100, 120, 150, 190, 240, 300, 380, 480, 600];
    let elapsed = 0;
    tickIntervals.forEach((interval) => {
      elapsed += interval;
      setTimeout(() => {
        soundFx.playTickSound();
        haptics.wheelTick();
      }, elapsed);
    });

    // Transition duration matches Framer Motion spring timing (~3.8s)
    setTimeout(async () => {
      setIsSpinning(false);
      setWinningSlice(chosenSlice);
      setShowWinModal(true);
      triggerConfetti();
      soundFx.playFanfareSound();
      haptics.levelUpCelebration();

      // Process rewards based on rewardType
      if (chosenSlice.rewardType === 'DIGITAL_EXP') {
        const expAmount = Number(chosenSlice.rewardValue || EXP_RULES.WHEEL_SPIN_BONUS);
        await awardUserExp(user.id, expAmount, `Reward Spinner: ${chosenSlice.label}`);
      } else if (chosenSlice.rewardType === 'DIGITAL_SHIELD') {
        await addGraceDayShield(user.id, 1);
        await addRewardToInventory(user.id, {
          rewardType: 'DIGITAL_SHIELD',
          title: '+1 Grace Day Shield',
          description: 'Protected your login streak from calendar day gaps.',
          icon: '🛡️',
          rewardValue: '1 Shield',
        });
      } else if (chosenSlice.rewardType === 'DIGITAL_TICKET') {
        await addSpinnerTickets(user.id, 1);
      } else if (chosenSlice.rewardType === 'REAL_WORLD_TREAT') {
        await addRewardToInventory(user.id, {
          rewardType: 'REAL_WORLD_TREAT',
          title: chosenSlice.label,
          description: chosenSlice.sublabel || 'Real-world mindful treat earned through positive financial habits.',
          icon: chosenSlice.icon,
          rewardValue: chosenSlice.rewardValue || chosenSlice.label,
        });
      }
    }, 3900);
  };

  const handleAddCustomTreat = () => {
    if (!customPrizeTitle.trim()) return;

    const newSlice: SpinnerSlice = {
      id: `custom-${Date.now()}`,
      label: customPrizeTitle.trim(),
      sublabel: 'Custom Real-World Treat',
      rewardType: 'REAL_WORLD_TREAT',
      icon: '🎁',
      color: '#ec4899',
      textColor: '#ffffff',
      rewardValue: customPrizeTitle.trim(),
    };

    // Replace the last slice with user's custom slice
    const updated = [...slices];
    updated[updated.length - 1] = newSlice;
    setSlices(updated);
    setCustomPrizeTitle('');
    setShowAddCustomModal(false);
  };

  // Polar to Cartesian coordinate math for SVG slices (0° = 12 o'clock, clockwise)
  const polarToCartesian = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  };

  return (
    <div
      id="reward-spinner-container"
      className="relative flex flex-col items-center justify-center w-full max-w-md mx-auto p-4 select-none"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between w-full mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg">
            🎡
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-1.5">
              The Reward Spinner
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                Physics Wheel
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Spin to earn real-world treats and digital shields
            </p>
          </div>
        </div>

        {onClose && (
          <button
            id="close-spinner-button"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition"
            aria-label="Close spinner"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Ticket counter & Actions Banner */}
      <div className="flex items-center justify-between w-full bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-2.5 mb-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-slate-300">
            Tickets Available:{' '}
            <strong className="text-amber-400 font-bold text-sm">
              {tickets}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="custom-treat-launcher-btn"
            type="button"
            onClick={() => setShowAddCustomModal(true)}
            className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl px-2.5 py-1.5 flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            Custom Treat
          </button>

          {onOpenWallet && (
            <button
              id="open-wallet-launcher-btn"
              type="button"
              onClick={onOpenWallet}
              className="text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-2.5 py-1.5 flex items-center gap-1 transition"
            >
              <Gift className="w-3.5 h-3.5" />
              Wallet
            </button>
          )}
        </div>
      </div>

      {/* Wheel Stage Frame */}
      <div className="relative flex items-center justify-center my-2">
        {/* Needle / Pointer at top center (12 o'clock) */}
        <div className="absolute -top-3 z-30 flex flex-col items-center">
          <div className="w-7 h-9 bg-gradient-to-b from-amber-400 to-amber-600 rounded-b-md shadow-lg shadow-amber-500/30 flex items-center justify-center border-2 border-slate-900 clip-pointer">
            <div className="w-2 h-2 rounded-full bg-white shadow-inner mb-2" />
          </div>
        </div>

        {/* Outer Glow Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-slate-800/80 pointer-events-none shadow-2xl shadow-sky-500/10" />

        {/* The Animated Wheel */}
        <motion.div
          animate={{ rotate: rotation }}
          transition={{
            type: 'spring',
            mass: 2.2,
            damping: 26,
            stiffness: 35,
            restDelta: 0.001,
          }}
          className="relative rounded-full overflow-hidden shadow-2xl border-4 border-slate-700 bg-slate-950"
          style={{ width: svgSize, height: svgSize }}
        >
          <svg
            width={svgSize}
            height={svgSize}
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            className="w-full h-full"
          >
            <defs>
              <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="60%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </radialGradient>
            </defs>

            {/* Slices */}
            {slices.map((slice, index) => {
              const startAngle = index * sliceAngle;
              const endAngle = (index + 1) * sliceAngle;
              const p1 = polarToCartesian(startAngle, radius);
              const p2 = polarToCartesian(endAngle, radius);
              const midAngle = startAngle + sliceAngle / 2;
              const textPos = polarToCartesian(midAngle, radius * 0.65);

              // SVG Path: M center L p1 A radius radius 0 0 1 p2 Z
              const pathData = `
                M ${center} ${center}
                L ${p1.x} ${p1.y}
                A ${radius} ${radius} 0 0 1 ${p2.x} ${p2.y}
                Z
              `;

              return (
                <g key={slice.id}>
                  <path
                    d={pathData}
                    fill={slice.color}
                    stroke="#0f172a"
                    strokeWidth="2.5"
                    className="transition-colors"
                  />
                  {/* Icon & Label */}
                  <g
                    transform={`translate(${textPos.x}, ${textPos.y}) rotate(${midAngle + 90})`}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    <text
                      y="-10"
                      fontSize="18"
                      textAnchor="middle"
                      className="select-none"
                    >
                      {slice.icon}
                    </text>
                    <text
                      y="10"
                      fontSize="10"
                      fontWeight="bold"
                      fill={slice.textColor}
                      textAnchor="middle"
                      className="select-none tracking-tight"
                    >
                      {slice.label.length > 13
                        ? `${slice.label.slice(0, 11)}...`
                        : slice.label}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Center Hub */}
            <circle
              cx={center}
              cy={center}
              r="26"
              fill="url(#hubGradient)"
              stroke="#0f172a"
              strokeWidth="4"
              className="shadow-lg"
            />
            <circle
              cx={center}
              cy={center}
              r="12"
              fill="#0f172a"
            />
          </svg>
        </motion.div>
      </div>

      {/* Spin Trigger Button */}
      <div className="w-full mt-5 flex flex-col items-center gap-2">
        <button
          id="spin-wheel-button"
          type="button"
          onClick={handleSpin}
          disabled={isSpinning || tickets <= 0}
          className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition transform active:scale-95 shadow-lg ${
            tickets > 0 && !isSpinning
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-orange-500/25 cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
          }`}
        >
          <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
          {isSpinning
            ? 'Spinning Wheel...'
            : tickets > 0
            ? `SPIN WHEEL (1 Ticket)`
            : 'Earn Tickets via Level-Ups & Streaks'}
        </button>

        <p className="text-xs text-slate-500 text-center">
          Prizes write directly to your local Reward Wallet with zero guilt.
        </p>
      </div>

      {/* WIN CELEBRATION MODAL */}
      <AnimatePresence>
        {showWinModal && winningSlice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              {/* Background ambient light */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-3xl flex items-center justify-center mx-auto mb-3">
                {winningSlice.icon}
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Congratulations!
              </span>
              <h3 className="text-xl font-bold text-white mt-1 mb-1">
                {winningSlice.label}
              </h3>
              <p className="text-xs text-slate-300 mb-5 leading-relaxed">
                {winningSlice.sublabel || 'Added to your inventory!'}
              </p>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 mb-5 text-left flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <p className="font-semibold text-slate-100">
                    {winningSlice.rewardType === 'DIGITAL_EXP'
                      ? 'Progression EXP Granted'
                      : winningSlice.rewardType === 'DIGITAL_SHIELD'
                      ? 'Grace Shield Activated'
                      : 'Saved in Reward Wallet'}
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {winningSlice.rewardType === 'REAL_WORLD_TREAT'
                      ? 'Redeem and enjoy this treat whenever you feel ready.'
                      : 'Your streak and leveling benefits have been saved.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {onOpenWallet && winningSlice.rewardType === 'REAL_WORLD_TREAT' && (
                  <button
                    id="view-in-wallet-btn"
                    type="button"
                    onClick={() => {
                      setShowWinModal(false);
                      onOpenWallet();
                    }}
                    className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Reward Wallet
                  </button>
                )}

                <button
                  id="claim-and-close-win-btn"
                  type="button"
                  onClick={() => setShowWinModal(false)}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition"
                >
                  Awesome, Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD CUSTOM REAL-WORLD TREAT MODAL */}
      <AnimatePresence>
        {showAddCustomModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full text-left shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-sky-400" />
                  Add Custom Treat to Wheel
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-4">
                Define a guilt-free real-world reward (e.g. &quot;Favorite Boba Tea&quot; or &quot;1h Reading at the Park&quot;) to appear on your prize wheel.
              </p>

              <div className="space-y-3 mb-5">
                <div>
                  <label
                    htmlFor="custom-treat-input"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Reward Label
                  </label>
                  <input
                    id="custom-treat-input"
                    type="text"
                    value={customPrizeTitle}
                    onChange={(e) => setCustomPrizeTitle(e.target.value)}
                    placeholder="e.g., Japanese Ramen Night"
                    maxLength={32}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="w-1/2 py-2.5 bg-slate-800 text-slate-300 hover:text-white text-xs font-medium rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomTreat}
                  disabled={!customPrizeTitle.trim()}
                  className="w-1/2 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs rounded-xl transition"
                >
                  Add to Wheel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
