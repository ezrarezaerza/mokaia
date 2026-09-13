"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, Award, Ticket, Palette, Check } from 'lucide-react';
import { getRankForLevel, AVAILABLE_THEMES } from '../lib/gamification';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';

interface LevelUpCelebrationModalProps {
  isOpen: boolean;
  newLevel: number;
  onClose: () => void;
  onOpenThemes?: () => void;
  onOpenSpinner?: () => void;
}

export const LevelUpCelebrationModal: React.FC<LevelUpCelebrationModalProps> = ({
  isOpen,
  newLevel,
  onClose,
  onOpenThemes,
  onOpenSpinner,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      soundFx.playFanfareSound();
      haptics.levelUpCelebration();
    }
  }, [isOpen]);

  const rank = getRankForLevel(newLevel);
  const unlockedTheme = AVAILABLE_THEMES.find((t) => t.unlockedAtLevel === newLevel);

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
            initial={isMobile ? { y: '100%', opacity: 0.5 } : { scale: 0.85, y: 20, opacity: 0 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%', opacity: 0 } : { scale: 0.85, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border-t sm:border border-amber-500/40 rounded-t-3xl sm:rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden z-10 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            {/* Top grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Ambient background rays */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {/* Level Badge icon */}
              <motion.div
                initial={{ rotate: -15, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950 flex items-center justify-center text-3xl sm:text-4xl shadow-xl shadow-amber-500/20 mx-auto mb-3"
              >
                {rank.badge}
              </motion.div>

              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-amber-400">
                Level Up Achieved!
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 mb-1">
                Level {newLevel}
              </h2>

              <p className="text-xs font-semibold text-sky-400 mb-4">
                Rank: {rank.name}
              </p>

              {/* Unlocked rewards breakdown */}
              <div className="space-y-2 mb-2 text-left">
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-base shrink-0">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-200">
                      +1 Free Spinner Ticket
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Added to your balance. Spin now or save it for later anytime!
                    </p>
                  </div>
                </div>

                {unlockedTheme && (
                  <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-base shrink-0">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-indigo-300">
                        New Theme Unlocked: {unlockedTheme.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {unlockedTheme.tagline}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pinned Action Buttons Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex flex-col gap-2 shrink-0">
              {unlockedTheme && onOpenThemes && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenThemes();
                  }}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Preview & Apply New Theme</span>
                </button>
              )}

              {onOpenSpinner && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSpinner();
                  }}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Spin The Wheel Now</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Keep Ticket & Continue Saving
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
