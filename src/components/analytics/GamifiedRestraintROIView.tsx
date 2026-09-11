"use client";

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ShieldCheck,
  Sparkles,
  PieChart as PieIcon,
  Calculator,
  ArrowRight,
  TrendingDown,
  Trophy,
  Ticket,
} from 'lucide-react';
import { format, parseISO, eachDayOfInterval, subDays, isBefore, isSameDay } from 'date-fns';
import type { LocalTransaction } from '../../types';

interface GamifiedRestraintROIViewProps {
  transactions?: LocalTransaction[];
  currency?: string;
  isMasked?: boolean;
  spinnerTickets?: number;
  onOpenSpinner?: () => void;
}

const MINDFUL_COLORS: Record<string, string> = {
  NEED: '#3b82f6', // blue
  WANT: '#a855f7', // purple
  SAVING: '#10b981', // emerald
  COMFORT: '#f43f5e', // rose
  UNSPECIFIED: '#64748b', // slate
};

export const GamifiedRestraintROIView: React.FC<GamifiedRestraintROIViewProps> = ({
  transactions = [],
  currency = '$',
  isMasked = false,
  spinnerTickets = 0,
  onOpenSpinner,
}) => {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const formatCurrency = (val: number) => {
    if (isMasked) return '••••••';
    return `${currency}${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // 1. The Cooling-Off Victory Curve Data (Trailing 30 days)
  const restraintCurveData = useMemo(() => {
    const now = new Date();
    const startDate = subDays(now, 29);
    const days = eachDayOfInterval({ start: startDate, end: now });

    const coolingTxs = safeTransactions.filter(
      (t) => !t.isDeleted && (t.queueStatus === 'REJECTED' || t.queueStatus === 'PURCHASED')
    );

    let cumulativeSaved = 0;
    let cumulativeYielded = 0;

    return days.map((day, idx) => {
      // Find events up to or on this day
      const dayTxs = coolingTxs.filter((t) => {
        try {
          const d = parseISO(t.date);
          return isSameDay(d, day);
        } catch {
          return false;
        }
      });

      dayTxs.forEach((t) => {
        const amt = Number(t.amount);
        if (t.queueStatus === 'REJECTED') {
          cumulativeSaved += amt;
        } else if (t.queueStatus === 'PURCHASED') {
          cumulativeYielded += amt;
        }
      });

      return {
        dateStr: format(day, idx % 5 === 0 ? 'MMM d' : ''),
        fullDate: format(day, 'MMM d, yyyy'),
        saved: Math.round(cumulativeSaved * 100) / 100,
        yielded: Math.round(cumulativeYielded * 100) / 100,
      };
    });
  }, [safeTransactions]);

  // Overall Restraint ROI metrics
  const restraintMetrics = useMemo(() => {
    const rejectedTxs = safeTransactions.filter((t) => !t.isDeleted && t.queueStatus === 'REJECTED');
    const totalSaved = rejectedTxs.reduce((sum, t) => sum + Number(t.amount), 0);
    const rejectedCount = rejectedTxs.length;

    // Convert saved money into hours of labor equivalent (standard $20/hr living wage benchmark)
    const hoursOfFreedomSaved = Math.round(totalSaved / 20);

    return {
      totalSaved,
      rejectedCount,
      hoursOfFreedomSaved,
    };
  }, [safeTransactions]);

  // 2. Mindful Intent Ratio Donut Breakdown (NEED vs WANT vs SAVING vs COMFORT)
  const mindfulIntentData = useMemo(() => {
    const totals: Record<string, number> = {
      NEED: 0,
      WANT: 0,
      SAVING: 0,
      COMFORT: 0,
    };

    let totalDiscretionary = 0;

    safeTransactions
      .filter((t) => !t.isDeleted && t.type === 'EXPENSE' && t.queueStatus !== 'REJECTED')
      .forEach((t) => {
        const amt = Number(t.amount);
        if (t.isComfortFund) {
          totals.COMFORT += amt;
        } else if (t.mindfulTag && totals[t.mindfulTag] !== undefined) {
          totals[t.mindfulTag] += amt;
        } else {
          totals.WANT += amt;
        }
        totalDiscretionary += amt;
      });

    return Object.keys(totals).map((key) => {
      const amt = totals[key];
      const percentage = totalDiscretionary > 0 ? Math.round((amt / totalDiscretionary) * 100) : 0;
      return {
        key,
        label: key === 'NEED' ? 'Essentials (Need)' : key === 'WANT' ? 'Lifestyle (Want)' : key === 'SAVING' ? 'Timeline Funds' : 'Comfort Fund',
        value: amt,
        percentage,
        color: MINDFUL_COLORS[key] || '#64748b',
        targetRatio: key === 'NEED' ? '50%' : key === 'WANT' ? '30%' : key === 'SAVING' ? '15%' : '5%',
      };
    });
  }, [transactions]);

  // 3. Interactive Cost-Per-Use Amortization Simulator
  const [simulatorCost, setSimulatorCost] = useState<number>(180);
  const [simulatorUses, setSimulatorUses] = useState<number>(60);

  const amortizationCurve = useMemo(() => {
    const points = [];
    const maxUses = Math.max(10, simulatorUses);
    const step = Math.max(1, Math.floor(maxUses / 12));

    for (let u = 1; u <= maxUses; u += step) {
      const cpu = Math.round((simulatorCost / u) * 100) / 100;
      points.push({
        uses: u,
        useLabel: `Use ${u}`,
        costPerUse: cpu,
      });
    }

    // Always include final use
    const finalCpu = Math.round((simulatorCost / maxUses) * 100) / 100;
    if (points[points.length - 1]?.uses !== maxUses) {
      points.push({
        uses: maxUses,
        useLabel: `Use ${maxUses}`,
        costPerUse: finalCpu,
      });
    }

    return points;
  }, [simulatorCost, simulatorUses]);

  const finalCpu = Math.round((simulatorCost / Math.max(1, simulatorUses)) * 100) / 100;

  return (
    <div className="space-y-4">
      {/* 1. Cooling-Off Victory Curve Header */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-slate-100 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                The Cooling-Off Victory Curve (Restraint ROI)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Tangible compounding dividends of walking away from 48-hour impulse traps
            </p>
          </div>

          {onOpenSpinner && (
            <button
              type="button"
              onClick={onOpenSpinner}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-md"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Spin for Restraint ({spinnerTickets})</span>
            </button>
          )}
        </div>

        {/* Restraint Value Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-emerald-400 font-semibold">
              Total Capital Preserved
            </span>
            <p className="text-xl font-bold font-mono text-emerald-300">
              {formatCurrency(restraintMetrics.totalSaved)}
            </p>
            <span className="text-[10px] text-slate-400">
              {restraintMetrics.rejectedCount} impulse buys bypassed
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
              Hours of Freedom Preserved
            </span>
            <p className="text-xl font-bold font-mono text-indigo-300">
              ~{restraintMetrics.hoursOfFreedomSaved} Hours
            </p>
            <span className="text-[10px] text-slate-400">
              Time you didn't have to work to pay for regrets
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
              Willpower Compound Ratio
            </span>
            <div className="flex items-center gap-1.5 pt-0.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-base font-bold text-white">
                {restraintMetrics.rejectedCount >= 3 ? 'Elite Monk 🧘' : restraintMetrics.rejectedCount >= 1 ? 'Rising Guardian 🛡️' : 'Novice Scout 🌱'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Next milestone at {restraintMetrics.rejectedCount + 3} wins</span>
          </div>
        </div>

        {/* Dual Area Chart: Saved vs Yielded */}
        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={restraintCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="savedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} vertical={false} />
              <XAxis dataKey="dateStr" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => (isMasked ? '••' : `$${v}`)} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length || !payload[0]?.payload) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="p-3 rounded-2xl bg-slate-950/95 border border-slate-700 shadow-xl text-xs space-y-1">
                      <div className="font-bold text-slate-300 pb-1 border-b border-slate-800">
                        {data.fullDate}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-emerald-400">
                        <span>Cumulative Preserved:</span>
                        <span className="font-bold font-mono">{formatCurrency(data.saved)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-slate-400 text-[11px]">
                        <span>Approved Buys:</span>
                        <span className="font-mono">{formatCurrency(data.yielded)}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="saved"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#savedGradient)"
                name="Money Preserved"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Mindful Intent Ratio Donut Breakdown */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-slate-100 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Mindful Intent Ratio Allocation
            </h4>
            <span className="text-[11px] text-slate-400">
              Balanced target ratio: 50% Need • 30% Want • 15% Timeline Funds • 5% Comfort Fund
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2">
          {/* Donut Chart */}
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mindfulIntentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {mindfulIntentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length || !payload[0]?.payload) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="p-2.5 rounded-xl bg-slate-950/95 border border-slate-700 shadow-xl text-xs space-y-1">
                        <div className="font-bold text-slate-200">{item.label}</div>
                        <div className="font-mono text-white">{formatCurrency(item.value)}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.percentage}% (Target: {item.targetRatio})
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Breakdown List */}
          <div className="space-y-2">
            {mindfulIntentData.map((item) => (
              <div
                key={item.key}
                className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <div>
                    <span className="font-bold text-slate-200">{item.label}</span>
                    <span className="text-[10px] text-slate-400 block">Target: {item.targetRatio}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono text-slate-100">{formatCurrency(item.value)}</div>
                  <span className="text-[10px] font-bold" style={{ color: item.color }}>
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Cost-Per-Use Amortization Visualizer & Simulator */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-slate-100 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Cost-Per-Use Amortization Curve
              </h4>
              <span className="text-[11px] text-slate-400">
                Visualizing how upfront investments decay toward micro-cents per use
              </span>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold">
            Target: {formatCurrency(finalCpu)} / use
          </div>
        </div>

        {/* Sliders for Interactive Amortization Simulation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Upfront Price</span>
              <span className="font-mono font-bold text-white">${simulatorCost}</span>
            </div>
            <input
              type="range"
              min="20"
              max="1000"
              step="10"
              value={simulatorCost}
              onChange={(e) => setSimulatorCost(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Estimated Uses / Wears</span>
              <span className="font-mono font-bold text-white">{simulatorUses} uses</span>
            </div>
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={simulatorUses}
              onChange={(e) => setSimulatorUses(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Amortization Decay Curve */}
        <div className="h-44 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={amortizationCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} vertical={false} />
              <XAxis dataKey="useLabel" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length || !payload[0]?.payload) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="p-2.5 rounded-xl bg-slate-950/95 border border-slate-700 shadow-xl text-xs space-y-0.5">
                      <div className="font-bold text-slate-300">At {item.uses} Uses</div>
                      <div className="text-indigo-400 font-mono font-bold">
                        {formatCurrency(item.costPerUse)} per use
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="costPerUse"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#6366f1' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
          <span>Initial shock: <strong className="text-slate-200">${simulatorCost}/use</strong></span>
          <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
          <span>At {simulatorUses} uses: <strong className="text-emerald-400">${finalCpu}/use</strong></span>
        </div>
      </div>
    </div>
  );
};
