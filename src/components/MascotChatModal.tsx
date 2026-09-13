"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Shield,
  Lightbulb,
  BarChart2,
  Heart,
  Wind,
  CheckCircle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import type {
  LocalUser,
  MascotEvaluationInput,
  MascotPersonality,
} from '../types';
import {
  evaluateMascotState,
  getMascotDialogues,
  MASCOT_PERSONALITIES,
} from '../lib/mascot';
import { updateUserMascotPersonality } from '../lib/db';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';
import { useTranslation } from '../context/LanguageContext';

interface MascotChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: LocalUser | null;
  metrics: MascotEvaluationInput;
  onOpenCoolingOff?: () => void;
  onOpenComfortFund?: () => void;
}

export const MascotChatModal: React.FC<MascotChatModalProps> = ({
  isOpen,
  onClose,
  user,
  metrics,
  onOpenCoolingOff,
  onOpenComfortFund,
}) => {
  const [selectedPersonality, setSelectedPersonality] = useState<MascotPersonality>(
    user?.mascotPersonality || 'zen'
  );
  const [activeSpeech, setActiveSpeech] = useState<string>('');
  const [isBreathingMode, setIsBreathingMode] = useState<boolean>(false);
  const [breathingPhase, setBreathingPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathingCycle, setBreathingCycle] = useState<number>(1);

  // Sync personality if user updates
  useEffect(() => {
    if (user?.mascotPersonality) {
      setSelectedPersonality(user.mascotPersonality);
    }
  }, [user?.mascotPersonality]);

  const { t, language } = useTranslation();
  const mascotName = user?.mascotName || 'Mochi';
  const mascotStatus = evaluateMascotState(mascotName, metrics, selectedPersonality, language);
  const dialogues = getMascotDialogues(mascotName, selectedPersonality, metrics, language);

  // Set initial speech when modal opens
  useEffect(() => {
    if (isOpen) {
      soundFx.playMascotChirpSound();
      haptics.lightTap();
      setActiveSpeech(mascotStatus.bubbleText);
      setIsBreathingMode(false);
    }
  }, [isOpen, selectedPersonality]);

  // Mindful Breathing Exercise Timer (4s Inhale, 4s Hold, 4s Exhale)
  useEffect(() => {
    if (!isBreathingMode) return;

    soundFx.playMascotPurrSound();
    const interval = setInterval(() => {
      setBreathingPhase((prev) => {
        if (prev === 'Inhale') {
          soundFx.playCoinSound();
          return 'Hold';
        }
        if (prev === 'Hold') {
          soundFx.playMascotPurrSound();
          return 'Exhale';
        }
        setBreathingCycle((c) => (c >= 3 ? 1 : c + 1));
        return 'Inhale';
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isBreathingMode]);

  if (!isOpen || !user) return null;

  const handlePersonalityChange = async (newPersonality: MascotPersonality) => {
    soundFx.playMascotChirpSound();
    haptics.lightTap();
    setSelectedPersonality(newPersonality);
    try {
      await updateUserMascotPersonality(user.id, newPersonality);
    } catch (err) {
      console.error('Failed to update personality in Dexie:', err);
    }
  };

  const handleSelectDialogue = (dialogue: (typeof dialogues)[0]) => {
    soundFx.playMascotChirpSound();
    haptics.lightTap();
    setActiveSpeech(dialogue.response);

    if (dialogue.actionType === 'BREATHE_EXERCISE') {
      setIsBreathingMode(true);
      setBreathingCycle(1);
      setBreathingPhase('Inhale');
    } else {
      setIsBreathingMode(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-indigo-950/40 z-10 text-slate-100 overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl overflow-hidden shadow-inner">
                {user.mascotAvatarUrl ? (
                  <img
                    src={user.mascotAvatarUrl}
                    alt={mascotName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>🐱</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">{mascotName}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {mascotStatus.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Accountability Companion • Emotional Check-In
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close companion dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto space-y-4 py-3 flex-1">
            {/* Personality Style Tabs */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Companion Personality
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {MASCOT_PERSONALITIES.map((p) => {
                  const isSelected = selectedPersonality === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePersonalityChange(p.id)}
                      className={`p-2 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-lg">{p.avatarEmoji}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-tight truncate">
                          {p.name}
                        </div>
                        <div className="text-[9px] opacity-75 truncate">{p.tagline}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mascot Live Speech Bubble */}
            <div className="relative p-4 rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900 border border-slate-700 text-slate-200 shadow-md">
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0">
                  {mascotStatus.expressionEmoji}
                </span>
                <div className="space-y-1 min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                    {mascotName} says:
                  </div>
                  <p className="text-xs sm:text-[13px] leading-relaxed font-medium text-slate-100">
                    {activeSpeech}
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Mindful 3-Breath Visualizer (Triggered when resisting urge) */}
            {isBreathingMode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 rounded-2xl bg-slate-950/70 border border-emerald-500/30 flex flex-col items-center justify-center text-center space-y-3"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <Wind className="w-4 h-4" />
                  <span>3-Breath Impulse Pause (Cycle {breathingCycle}/3)</span>
                </div>

                <div className="relative w-28 h-28 flex items-center justify-center">
                  <motion.div
                    animate={{
                      scale: breathingPhase === 'Inhale' ? 1.35 : breathingPhase === 'Hold' ? 1.35 : 0.85,
                      opacity: breathingPhase === 'Hold' ? 0.9 : 0.6,
                    }}
                    transition={{ duration: 4, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-full bg-emerald-500/20 border-2 border-emerald-400/60"
                  />
                  <div className="relative z-10 flex flex-col items-center">
                    <span className="text-lg font-black text-white tracking-wide">
                      {breathingPhase}
                    </span>
                    <span className="text-[10px] text-emerald-300 font-medium">
                      4 Seconds
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 max-w-xs">
                  Slow your nervous system down. Urges fade after 90 seconds. You are in control of your money.
                </p>

                <button
                  type="button"
                  onClick={() => setIsBreathingMode(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Done with Pause
                </button>
              </motion.div>
            )}

            {/* Interactive Prompt Choices */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Ask {mascotName} for Advice
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Array.isArray(dialogues) ? dialogues : []).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleSelectDialogue(d)}
                    className="p-3 rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition text-left flex items-start gap-2.5 cursor-pointer group"
                  >
                    <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                      {d.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-white leading-tight">
                        {d.label}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Action Navigation Links */}
            <div className="pt-2 flex items-center gap-2 flex-wrap text-xs">
              {onOpenCoolingOff && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCoolingOff();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>The Cooling-Off Queue ({metrics.coolingOffPendingCount})</span>
                </button>
              )}

              {onOpenComfortFund && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenComfortFund();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>The Comfort Fund (${metrics.comfortFundRemaining.toFixed(2)})</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
