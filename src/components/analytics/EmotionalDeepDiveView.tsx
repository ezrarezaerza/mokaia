"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  Smile,
  AlertTriangle,
  Lightbulb,
  HeartHandshake,
  Calendar,
  Sparkles,
  TrendingDown,
  Wind,
} from 'lucide-react';
import { parseISO, getDay } from 'date-fns';
import type { LocalTransaction, EmotionalMood } from '../../types';
import { EMOTIONAL_MOOD_CONFIG } from '../../lib/db';

interface EmotionalDeepDiveViewProps {
  transactions?: LocalTransaction[];
  currency?: string;
  isMasked?: boolean;
  onOpenMascotChat?: () => void;
  mascotName?: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const EmotionalDeepDiveView: React.FC<EmotionalDeepDiveViewProps> = ({
  transactions = [],
  currency = '$',
  isMasked = false,
  onOpenMascotChat,
  mascotName = 'Mochi',
}) => {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const formatCurrency = (val: number) => {
    if (isMasked) return '••••••';
    return `${currency}${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const activeExpenses = useMemo(() => {
    return safeTransactions.filter(
      (t) => !t.isDeleted && t.type === 'EXPENSE' && t.queueStatus !== 'LOCKED' && t.queueStatus !== 'REJECTED'
    );
  }, [safeTransactions]);

  // 1. Mood breakdown for BarChart
  const moodDistributionData = useMemo(() => {
    const totals: Record<string, { total: number; count: number }> = {
      BORED: { total: 0, count: 0 },
      STRESSED: { total: 0, count: 0 },
      CELEBRATING: { total: 0, count: 0 },
      FOMO: { total: 0, count: 0 },
      TREAT_MYSELF: { total: 0, count: 0 },
      CALM: { total: 0, count: 0 },
    };

    let totalTaggedSpend = 0;

    activeExpenses.forEach((t) => {
      if (t.emotionalMood && totals[t.emotionalMood]) {
        totals[t.emotionalMood].total += Number(t.amount);
        totals[t.emotionalMood].count += 1;
        totalTaggedSpend += Number(t.amount);
      }
    });

    const keys = Object.keys(totals) as EmotionalMood[];
    return keys.map((key) => {
      const cfg = EMOTIONAL_MOOD_CONFIG[key];
      const data = totals[key];
      const percentage = totalTaggedSpend > 0 ? Math.round((data.total / totalTaggedSpend) * 100) : 0;
      return {
        mood: key,
        name: cfg.label,
        emoji: cfg.emoji,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
        color: cfg.color,
        cue: cfg.cue,
        percentage,
      };
    }).sort((a, b) => b.total - a.total);
  }, [activeExpenses]);

  // 2. Day-of-Week Behavioral Vulnerability Heatmap (7-day distribution)
  const dayOfWeekStats = useMemo(() => {
    const days = [0, 1, 2, 3, 4, 5, 6].map((dayIdx) => ({
      dayIdx,
      dayShort: DAY_NAMES[dayIdx],
      dayFull: FULL_DAY_NAMES[dayIdx],
      totalSpent: 0,
      impulseCount: 0,
      moodSpend: 0,
      transactionsCount: 0,
    }));

    activeExpenses.forEach((t) => {
      try {
        const txDate = parseISO(t.date);
        const dayIdx = getDay(txDate);
        if (days[dayIdx]) {
          const amt = Number(t.amount);
          days[dayIdx].totalSpent += amt;
          days[dayIdx].transactionsCount += 1;
          if (t.emotionalMood && t.emotionalMood !== 'CALM') {
            days[dayIdx].moodSpend += amt;
            days[dayIdx].impulseCount += 1;
          }
        }
      } catch {}
    });

    let maxImpulses = 0;
    let peakDay = days[0];

    days.forEach((d) => {
      if (d.moodSpend > maxImpulses) {
        maxImpulses = d.moodSpend;
        peakDay = d;
      }
    });

    return { days, peakDay, maxImpulses };
  }, [activeExpenses]);

  // Top emotional trigger
  const topTrigger = moodDistributionData[0]?.total > 0 ? moodDistributionData[0] : null;

  return (
    <div className="space-y-4">
      {/* 1. Psychological Behavioral Takeaway Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-purple-950/30 to-slate-900 border border-indigo-500/30 text-slate-100 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-300">
              <Smile className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
              Subconscious Emotional Drivers
            </h3>
          </div>

          {topTrigger && (
            <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
              <span>{topTrigger.emoji}</span>
              <span>Top Trigger: {topTrigger.name}</span>
            </span>
          )}
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {topTrigger ? (
            topTrigger.mood === 'BORED' ? (
              <>
                <strong className="text-white">Boredom Scrolling Alert:</strong>{' '}
                {topTrigger.percentage}% of your tagged spend occurs when filling idle downtime.
                Consider locking prospective non-essentials in The Cooling-Off Queue for 24 hours.
              </>
            ) : topTrigger.mood === 'STRESSED' ? (
              <>
                <strong className="text-white">Stress-Relief Shopping:</strong>{' '}
                {topTrigger.percentage}% of purchases happen during high-pressure days. Remember to
                use your Comfort Fund micro-budget instead of unallocated reserves!
              </>
            ) : topTrigger.mood === 'FOMO' ? (
              <>
                <strong className="text-white">Social FOMO Pattern:</strong>{' '}
                {topTrigger.percentage}% of discretionary spending is sparked by peer activity or feeds.
                Pausing for a 3-breath mindful reset neutralizes 80% of instant checkout urges.
              </>
            ) : (
              <>
                <strong className="text-white">Mindful Intent Realized:</strong>{' '}
                Your dominant spending mood is {topTrigger.name}. You are approaching discretionary
                decisions with clear-headed intentionality!
              </>
            )
          ) : (
            'Tag your expenses with 1-tap emotional check-ins during manual logging to uncover how feelings drive transactions.'
          )}
        </p>

        {onOpenMascotChat && (
          <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-between">
            <span className="text-[11px] text-indigo-300 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Ask {mascotName} for a mindful breathing pause</span>
            </span>
            <button
              type="button"
              onClick={onOpenMascotChat}
              className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <Wind className="w-3.5 h-3.5" />
              <span>Reset with {mascotName}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Mood Distribution Bar Chart */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-slate-100 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Spending by Emotional State
            </h4>
            <span className="text-[11px] text-slate-400">
              Proportion of discretionary funds across 6 emotional archetypes
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-300">
            {formatCurrency(moodDistributionData.reduce((acc, i) => acc + i.total, 0))} Tracked
          </span>
        </div>

        <div className="h-48 sm:h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={moodDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(v) => (isMasked ? '••' : `$${v}`)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length || !payload[0]?.payload) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="p-3 rounded-2xl bg-slate-950/95 border border-slate-700 shadow-xl text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-200">
                        <span className="text-base">{item.emoji}</span>
                        <span>{item.name}</span>
                      </div>
                      <div className="text-slate-400 text-[10px]">{item.cue}</div>
                      <div className="pt-1 border-t border-slate-800 flex items-center justify-between gap-3">
                        <span className="text-slate-400">Total Spent:</span>
                        <span className="font-mono font-bold text-white">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[10px] text-indigo-400">
                        <span>Share:</span>
                        <span className="font-bold font-mono">{item.percentage}% ({item.count} transactions)</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {moodDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Weekly Behavioral Vulnerability Heatmap (Day-of-Week) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-slate-100 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Weekly Vulnerability Heatmap
              </h4>
              <span className="text-[11px] text-slate-400">
                Identifying high-risk impulse days throughout the week
              </span>
            </div>
          </div>

          {dayOfWeekStats.peakDay.moodSpend > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Peak: {dayOfWeekStats.peakDay.dayFull}</span>
            </span>
          )}
        </div>

        {/* 7-Day Matrix */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2">
          {dayOfWeekStats.days.map((day) => {
            const isPeak = day.dayIdx === dayOfWeekStats.peakDay.dayIdx && day.moodSpend > 0;
            const intensityRatio = dayOfWeekStats.maxImpulses > 0 ? day.moodSpend / dayOfWeekStats.maxImpulses : 0;

            let bgColor = 'bg-slate-800/40 border-slate-700/50';
            if (intensityRatio > 0.7) {
              bgColor = 'bg-rose-500/20 border-rose-500/40 text-rose-200';
            } else if (intensityRatio > 0.35) {
              bgColor = 'bg-amber-500/20 border-amber-500/30 text-amber-200';
            } else if (day.totalSpent > 0) {
              bgColor = 'bg-indigo-500/15 border-indigo-500/30 text-indigo-200';
            }

            return (
              <div
                key={day.dayIdx}
                className={`p-2 sm:p-2.5 rounded-2xl border text-center transition flex flex-col items-center justify-between min-h-[85px] ${bgColor} ${
                  isPeak ? 'ring-2 ring-amber-400/50 shadow-md' : ''
                }`}
              >
                <span className="text-[11px] font-bold">{day.dayShort}</span>

                <div className="space-y-0.5 my-auto">
                  <span className="text-xs font-bold font-mono block">
                    {formatCurrency(day.totalSpent)}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {day.impulseCount > 0 ? `${day.impulseCount} impulses` : 'Calm'}
                  </span>
                </div>

                <div
                  className="w-full h-1 rounded-full bg-slate-950/60 overflow-hidden"
                  title={`${Math.round(intensityRatio * 100)}% emotional density`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-indigo-400 to-rose-400"
                    style={{ width: `${Math.max(5, intensityRatio * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Heatmap Insights Footer */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2 text-slate-400 text-xs">
          <HeartHandshake className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-200">Mindful Friction:</strong> Knowing your vulnerable days allows you to set up passive guardrails (like pre-locking the Cooling-Off Queue) before cravings strike.
          </p>
        </div>
      </div>
    </div>
  );
};
