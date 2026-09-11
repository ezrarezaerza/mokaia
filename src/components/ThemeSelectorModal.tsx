"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Check, X } from 'lucide-react';
import type { LocalUser } from '../types';
import { AVAILABLE_THEMES } from '../lib/gamification';
import { setUserActiveTheme } from '../lib/db';

interface ThemeSelectorModalProps {
  user: LocalUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  user,
  isOpen,
  onClose,
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

  const currentLevel = user?.level ?? 1;
  const currentThemeId = user?.activeTheme ?? 'cyber_slate';

  const handleSelectTheme = async (themeId: string, unlockedAtLevel: number) => {
    if (currentLevel < unlockedAtLevel || !user) return;
    await setUserActiveTheme(user.id, themeId);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Smooth backdrop fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            onClick={onClose}
          />

          <motion.div
            initial={isMobile ? { y: '100%', opacity: 0.5 } : { scale: 0.95, y: 16, opacity: 0 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%', opacity: 0 } : { scale: 0.95, y: 16, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] z-10 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            {/* Top grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Pinned Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center text-xl shrink-0">
                  🎨
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>Unlockable Themes</span>
                    <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                      Level Up Perks
                    </span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    Swap color palettes unlocked by financial leveling
                  </p>
                </div>
              </div>

              <button
                id="close-theme-modal-btn"
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close theme selector"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Theme List */}
            <div className="p-4 space-y-2.5 flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {AVAILABLE_THEMES.map((theme) => {
                const isUnlocked = currentLevel >= theme.unlockedAtLevel;
                const isActive = currentThemeId === theme.id;

                return (
                  <div
                    key={theme.id}
                    onClick={() => isUnlocked && handleSelectTheme(theme.id, theme.unlockedAtLevel)}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-slate-800/90 border-sky-500 shadow-md ring-1 ring-sky-500/50'
                        : isUnlocked
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 cursor-pointer'
                        : 'bg-slate-950/30 border-slate-900 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl shrink-0">
                        {theme.icon}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-100 truncate">
                            {theme.name}
                          </h4>
                          {!isUnlocked && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 shrink-0">
                              <Lock className="w-2.5 h-2.5" />
                              Lvl {theme.unlockedAtLevel}
                            </span>
                          )}
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold shrink-0">
                              Active
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {theme.tagline}
                        </p>

                        {/* Color dots preview */}
                        <div className="flex items-center gap-1.5 mt-2">
                          {theme.previewColors.map((c, i) => (
                            <span
                              key={i}
                              className="w-3 h-3 rounded-full border border-slate-800 shadow-inner"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isActive ? (
                        <div className="w-7 h-7 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center shadow-sm">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      ) : isUnlocked ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTheme(theme.id, theme.unlockedAtLevel);
                          }}
                          className="py-1 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition border border-slate-700 cursor-pointer"
                        >
                          Apply
                        </button>
                      ) : (
                        <div className="p-1.5 text-slate-600">
                          <Lock className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pinned Footer note */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/60 text-center shrink-0">
              <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                Current Rank: <strong className="text-slate-200">Level {currentLevel}</strong>. Gain EXP through login streaks, Cooling-Off self-control, and mindful budgeting to unlock higher tier palettes!
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
