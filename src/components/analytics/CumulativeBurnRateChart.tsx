"use client";

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  isAfter,
  subDays,
  parseISO,
  getDate,
  getDaysInMonth,
} from 'date-fns';
import { Flame, TrendingUp, Calendar, ShieldCheck, AlertCircle, ArrowUpRight } from 'lucide-react';
import type { LocalTransaction } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';

interface CumulativeBurnRateChartProps {
  transactions?: LocalTransaction[];
  monthlyBudget?: number;
  currency?: string;
  isMasked?: boolean;
}

export type TimeRange = 'THIS_MONTH' | 'PAST_30_DAYS' | 'PAST_7_DAYS';

export const CumulativeBurnRateChart: React.FC<CumulativeBurnRateChartProps> = ({
  transactions = [],
  monthlyBudget = 2500,
  currency = '$',
  isMasked = false,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('THIS_MONTH');
  const { format: formatMoney } = useCurrency();

  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const formatCurrency = (val: number) => {
    if (isMasked) return '••••••';
    return formatMoney(val);
  };

  const chartData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (timeRange === 'THIS_MONTH') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else if (timeRange === 'PAST_30_DAYS') {
      startDate = subDays(now, 29);
      endDate = now;
    } else {
      startDate = subDays(now, 6);
      endDate = now;
    }

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const totalDays = days.length;
    const dailyTargetPace = monthlyBudget / (timeRange === 'THIS_MONTH' ? getDaysInMonth(now) : totalDays);

    // Active expense transactions
    const expenses = safeTransactions.filter(
      (t) => !t.isDeleted && t.type === 'EXPENSE' && t.queueStatus !== 'LOCKED' && t.queueStatus !== 'REJECTED'
    );

    let cumulativeActual = 0;
    const isCurrentPeriod = timeRange === 'THIS_MONTH';

    return days.map((day, idx) => {
      const isPastOrToday = isBefore(day, now) || isSameDay(day, now);
      const isFuture = isAfter(day, now) && !isSameDay(day, now);

      // Sum expenses on this specific day
      const dayExpenses = expenses.filter((t) => {
        try {
          const txDate = parseISO(t.date);
          return isSameDay(txDate, day);
        } catch {
          return false;
        }
      });

      const dayTotal = dayExpenses.reduce((sum, t) => sum + Number(t.amount), 0);

      if (isPastOrToday) {
        cumulativeActual += dayTotal;
      }

      // Ideal linear burn target up to this day
      const cumulativeTarget = Math.round((idx + 1) * dailyTargetPace * 100) / 100;

      return {
        dateStr: format(day, timeRange === 'PAST_7_DAYS' ? 'EEE' : 'MMM d'),
        fullDate: format(day, 'MMM d, yyyy'),
        dayNumber: idx + 1,
        actual: isPastOrToday ? Math.round(cumulativeActual * 100) / 100 : null,
        dailySpend: isPastOrToday ? dayTotal : null,
        targetPace: Math.min(cumulativeTarget, monthlyBudget),
        isFuture,
      };
    });
  }, [transactions, monthlyBudget, timeRange]);

  // Compute summary stats
  const stats = useMemo(() => {
    const validActuals = chartData.filter((d) => d.actual !== null);
    const currentActual = validActuals.length > 0 ? (validActuals[validActuals.length - 1].actual ?? 0) : 0;
    const currentTarget = validActuals.length > 0 ? (validActuals[validActuals.length - 1].targetPace ?? 0) : 0;
    const variance = currentActual - currentTarget;

    const daysElapsed = validActuals.length;
    const avgDailyBurn = daysElapsed > 0 ? currentActual / daysElapsed : 0;
    const remainingDays = Math.max(0, chartData.length - daysElapsed);
    const projectedTotal = currentActual + avgDailyBurn * remainingDays;
    const remainingBudget = Math.max(0, monthlyBudget - currentActual);
    const safeDailyAllowance = remainingDays > 0 ? remainingBudget / remainingDays : 0;

    const isUnderPace = variance <= 0;
    const paceStatus = variance < -150 ? 'EXCELLENT' : variance <= 50 ? 'ON_TRACK' : 'ACCELERATED';

    return {
      currentActual,
      currentTarget,
      variance,
      avgDailyBurn,
      projectedTotal,
      safeDailyAllowance,
      paceStatus,
      isUnderPace,
      remainingBudget,
    };
  }, [chartData, monthlyBudget]);

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/95 border border-slate-800 text-slate-100 space-y-4 shadow-xl">
      {/* Header & Filter Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-orange-500/10 text-orange-400">
              <Flame className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Cumulative Burn-Rate & Pacing</span>
            </h3>
          </div>
          <p className="text-[11px] text-slate-400">
            Real-time trajectory vs. ideal linear velocity
          </p>
        </div>

        {/* Time Period Filter Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0 self-start sm:self-auto">
          {(
            [
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'PAST_30_DAYS', label: '30 Days' },
              { id: 'PAST_7_DAYS', label: '7 Days' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setTimeRange(filter.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                timeRange === filter.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
            Current Spend
          </span>
          <p className="text-base sm:text-lg font-bold font-mono text-white">
            {formatCurrency(stats.currentActual)}
          </p>
          <span className="text-[10px] text-slate-400">
            Target: {formatCurrency(stats.currentTarget)}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
            Safe Daily Runway
          </span>
          <p className="text-base sm:text-lg font-bold font-mono text-emerald-300">
            {formatCurrency(stats.safeDailyAllowance)}
          </p>
          <span className="text-[10px] text-slate-400">
            {formatCurrency(stats.remainingBudget)} remaining
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
            Daily Burn Velocity
          </span>
          <p className="text-base sm:text-lg font-bold font-mono text-amber-300">
            {formatCurrency(stats.avgDailyBurn)}
          </p>
          <span className="text-[10px] text-slate-400">per active day</span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
            Pacing Cadence
          </span>
          <div className="pt-0.5">
            {stats.paceStatus === 'EXCELLENT' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Under Budget</span>
              </span>
            )}
            {stats.paceStatus === 'ON_TRACK' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-xs font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>On Target</span>
              </span>
            )}
            {stats.paceStatus === 'ACCELERATED' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Fast Pace</span>
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            {stats.variance <= 0
              ? `${formatCurrency(Math.abs(stats.variance))} surplus cushion`
              : `${formatCurrency(stats.variance)} above ideal line`}
          </span>
        </div>
      </div>

      {/* Interactive Recharts Composed Chart */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="actualSpendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="targetPaceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} vertical={false} />

            <XAxis
              dataKey="dateStr"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />

            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => (isMasked ? '••' : formatMoney(v, { compact: true }))}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length || !payload[0]?.payload) return null;
                const data = payload[0].payload;
                const actual = data.actual ?? null;
                const target = data.targetPace ?? 0;
                const diff = actual !== null ? actual - target : null;

                return (
                  <div className="p-3 rounded-2xl bg-slate-950/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[170px]">
                    <div className="text-[11px] font-bold text-slate-300 border-b border-slate-800 pb-1 flex items-center justify-between">
                      <span>{data.fullDate}</span>
                      <span className="text-[10px] text-slate-400">Day {data.dayNumber}</span>
                    </div>

                    {actual !== null ? (
                      <>
                        <div className="flex items-center justify-between gap-3 text-slate-200">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-400" />
                            <span>Cumulative:</span>
                          </span>
                          <span className="font-bold font-mono text-white">
                            {formatCurrency(actual)}
                          </span>
                        </div>

                        {data.dailySpend !== null && (
                          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                            <span>Today's Log:</span>
                            <span className="font-mono text-slate-300">
                              {formatCurrency(data.dailySpend)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-500" />
                            <span>Ideal Pacing:</span>
                          </span>
                          <span className="font-mono">{formatCurrency(target)}</span>
                        </div>

                        {diff !== null && (
                          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                            <span>Pacing Delta:</span>
                            <span
                              className={`font-mono font-bold ${
                                diff <= 0 ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {diff <= 0 ? '-' : '+'}
                              {formatCurrency(Math.abs(diff))}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-slate-400 italic text-[11px]">
                        Projected ideal line: {formatCurrency(target)}
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Ideal Pacing Trajectory Reference Line */}
            <Line
              type="monotone"
              dataKey="targetPace"
              stroke="#64748b"
              strokeDasharray="4 4"
              strokeWidth={1.75}
              dot={false}
              name="Ideal Pace"
            />

            {/* Actual Spending Area */}
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#6366f1"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#actualSpendGradient)"
              name="Actual Spend"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend & Psychology Reassurance */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-indigo-500 rounded" />
            <span className="text-[11px] text-slate-300">Actual Outflow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b border-dashed border-slate-400" />
            <span className="text-[11px] text-slate-400">Target Velocity</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-300">
          <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
          <span>Projected month-end: <strong className="font-mono text-white">{formatCurrency(stats.projectedTotal)}</strong></span>
        </div>
      </div>
    </div>
  );
};
