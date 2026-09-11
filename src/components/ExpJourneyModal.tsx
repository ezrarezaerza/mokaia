"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  X,
  Sparkles,
  Trophy,
  Flame,
  ShieldCheck,
  Ticket,
  Palette,
  CheckCircle2,
  Clock,
  HelpCircle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import type { LocalUser, LocalExpEvent } from '../types';
import { getExpProgress, getRankForLevel, EXP_RULES, AVAILABLE_THEMES } from '../lib/gamification';
import { getRecentExpEvents } from '../lib/db';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';

interface ExpJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: LocalUser | null;
  onOpenSpinner?: () => void;
  onOpenThemes?: () => void;
}

export const ExpJourneyModal: React.FC<ExpJourneyModalProps> = ({
  isOpen,
  onClose,
  user,
  onOpenSpinner,
  onOpenThemes,
}) => {
  const [events, setEvents] = useState<LocalExpEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'HOW_TO' | 'RANKS'>('AUDIT');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user?.id) {
      setLoading(true);
      getRecentExpEvents(user.id, 25)
        .then((data) => setEvents(data))
        .catch(() => setEvents([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;

  const exp = user.exp ?? 0;
  const level = user.level ?? 1;
  const { expInLevel, expNeeded, percent, nextLevelExp } = getExpProgress(exp);
  const currentRank = getRankForLevel(level);
  const nextRank = getRankForLevel(level + 1);

  // Check if a theme unlocks at next level
  const nextThemeUnlock = AVAILABLE_THEMES.find((t) => t.unlockedAtLevel === level + 1);

  const formatEventTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(d);
    } catch {
      return 'Recent';
    }
  };

  const getEventIcon = (tag: string) => {
    switch (tag) {
      case 'STREAK':
        return <Flame className="w-3.5 h-3.5 text-orange-400" />;
      case 'IMPULSE_SAVED':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'REWARD_SPIN':
        return <Ticket className="w-3.5 h-3.5 text-amber-400" />;
      case 'TIMELINE_FUND':
        return <TrendingUp className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            haptics.lightTap();
            onClose();
          }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]"
        >
          {/* Mobile Grab Handle */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 rounded-full bg-slate-700" />
          </div>

          {/* Pinned Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0"
                style={{
                  backgroundColor: `${currentRank.color}25`,
                  border: `1.5px solid ${currentRank.color}60`,
                }}
              >
                {currentRank.badge}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    EXP Journey & Ranks
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-bold border border-sky-500/30">
                    Level {level}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {currentRank.name} • {exp} Total Lifetime EXP
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                haptics.lightTap();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Level Progress Hero Card */}
          <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-800/40 to-slate-900/40 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Level {level} Progress</span>
              </span>
              <span className="font-mono text-slate-300">
                <strong className="text-white">{expInLevel}</strong> / {expNeeded} EXP ({Math.round(percent)}%)
              </span>
            </div>

            {/* EXP Bar */}
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner mb-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-400 shadow-sm"
              />
            </div>

            {/* Next Level Teaser Pill */}
            <div className="p-2.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 text-[11px] sm:text-xs">
                  Next Level: <strong className="text-amber-300">+1 Free Spinner Ticket</strong>
                  {nextThemeUnlock && ` & Unlocks ${nextThemeUnlock.name} Theme`}
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400 shrink-0">
                {expNeeded - expInLevel} EXP to go
              </span>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="flex items-center px-4 pt-3 border-b border-slate-800 bg-slate-900 shrink-0 gap-2">
            <button
              type="button"
              onClick={() => {
                haptics.lightTap();
                setActiveTab('AUDIT');
              }}
              className={`pb-2.5 px-3 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'AUDIT'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>EXP Audit Log</span>
              {events.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
                  {events.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                haptics.lightTap();
                setActiveTab('HOW_TO');
              }}
              className={`pb-2.5 px-3 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'HOW_TO'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>How to Earn</span>
            </button>

            <button
              type="button"
              onClick={() => {
                haptics.lightTap();
                setActiveTab('RANKS');
              }}
              className={`pb-2.5 px-3 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'RANKS'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              <span>All Ranks</span>
            </button>
          </div>

          {/* Scrollable Body Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
            {/* TAB 1: EXP AUDIT LOG */}
            {activeTab === 'AUDIT' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono uppercase text-slate-400 font-semibold px-1">
                  <span>Recent Behavioral Events</span>
                  <span>EXP Points</span>
                </div>

                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                    Loading your EXP audit history...
                  </div>
                ) : events.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No EXP events recorded yet. Log your first mindful transaction or check in tomorrow!
                  </div>
                ) : (
                  (Array.isArray(events) ? events : []).map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between hover:bg-slate-800/70 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 shrink-0">
                          {getEventIcon(ev.categoryTag)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {ev.reason}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {formatEventTime(ev.createdAt)}
                          </p>
                        </div>
                      </div>

                      <span className="font-mono font-bold text-xs px-2 py-1 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0 ml-2">
                        +{ev.amount} EXP
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: HOW TO EARN EXP */}
            {activeTab === 'HOW_TO' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Mokaia uses an <strong>Anti-Cheese Virtual Economy</strong>. You earn EXP exclusively by practicing mindful spending, resisting impulses, and maintaining daily awareness.
                </p>

                <div className="grid grid-cols-1 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Daily Login & Check-in</div>
                        <p className="text-[11px] text-slate-400">Open Mokaia once per calendar day</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20">
                      +{EXP_RULES.DAILY_LOGIN} EXP
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Resist Cooling-Off Impulse</div>
                        <p className="text-[11px] text-slate-400">Cancel an impulse buy after cooling off</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                      +{EXP_RULES.REJECT_IMPULSE} EXP
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">7-Day Streak Milestone</div>
                        <p className="text-[11px] text-slate-400">Awarded on every 7th consecutive day</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-1 rounded-lg border border-sky-500/20">
                      +{EXP_RULES.STREAK_7_DAY_MILESTONE} EXP
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                        <Ticket className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">The Reward Spinner</div>
                        <p className="text-[11px] text-slate-400">Land on the EXP Surge slice</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                      +{EXP_RULES.WHEEL_SPIN_BONUS} EXP
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ALL RANKS */}
            {activeTab === 'RANKS' && (
              <div className="space-y-2.5">
                {[
                  { name: 'Impulse Novice', levels: 'Levels 1 - 3', badge: '🌱', color: '#10b981', desc: 'Starting out with mindful pause awareness' },
                  { name: 'Mindful Saver', levels: 'Levels 4 - 7', badge: '⚡', color: '#3b82f6', desc: 'Active cooling-off queue practitioner' },
                  { name: 'Budget Tactician', levels: 'Levels 8 - 12', badge: '🛡️', color: '#8b5cf6', desc: 'Sinking fund and comfort fund master' },
                  { name: 'Impulse Warden', levels: 'Levels 13 - 19', badge: '👑', color: '#f59e0b', desc: 'Guards against emotional spending triggers' },
                  { name: 'Zen Capitalist', levels: 'Level 20+', badge: '💎', color: '#ec4899', desc: 'Complete financial mindfulness and peace' },
                ].map((r, i) => {
                  const isCurrent = currentRank.name === r.name;
                  return (
                    <div
                      key={r.name}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                        isCurrent
                          ? 'bg-slate-800/90 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30'
                          : 'bg-slate-800/30 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0"
                          style={{
                            backgroundColor: `${r.color}25`,
                            border: `1.5px solid ${r.color}60`,
                          }}
                        >
                          {r.badge}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{r.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">{r.desc}</p>
                        </div>
                      </div>

                      <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                        {r.levels}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pinned Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 shrink-0 flex items-center justify-between gap-3">
            {onOpenSpinner && (
              <button
                type="button"
                onClick={() => {
                  haptics.lightTap();
                  onClose();
                  onOpenSpinner();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Ticket className="w-3.5 h-3.5 text-amber-400" />
                <span>Spin Reward Wheel</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                haptics.lightTap();
                onClose();
              }}
              className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-md"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
