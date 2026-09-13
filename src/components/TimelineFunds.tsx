import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target,
  Plus,
  Calendar,
  Sparkles,
  TrendingUp,
  DollarSign,
  HeartHandshake,
  CheckCircle2,
  Trash2,
  Clock,
  ArrowRight,
  AlertCircle,
  PiggyBank,
  Check,
} from 'lucide-react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { LocalTimelineFund, LocalUser } from '../types';
import {
  getUserTimelineFunds,
  createLocalTimelineFund,
  allocateToTimelineFund,
  deleteLocalTimelineFund,
  db,
} from '../lib/db';
import { useCurrency } from '../context/CurrencyContext';

interface TimelineFundsProps {
  user: LocalUser | null;
  onOpenShareCard?: (fund: LocalTimelineFund) => void;
}

const DEFAULT_FUND_ICONS = ['✈️', '💻', '🚗', '🏠', '🎒', '💍', '🛡️', '🎸', '🏖️', '🎯'];

export function TimelineFunds({ user, onOpenShareCard }: TimelineFundsProps) {
  if (!user) return null;

  const { format: formatMoney, symbol, config } = useCurrency();
  const [funds, setFunds] = useState<LocalTimelineFund[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState<boolean>(false);
  const [selectedFund, setSelectedFund] = useState<LocalTimelineFund | null>(null);

  // Form: Create Fund
  const [title, setTitle] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [icon, setIcon] = useState<string>('🎯');
  const [categoryTag, setCategoryTag] = useState<string>('Travel');
  const [description, setDescription] = useState<string>('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Form: Contribute
  const [allocateAmount, setAllocateAmount] = useState<string>('');
  const [allocateSource, setAllocateSource] = useState<'DIRECT' | 'COMFORT_FUND'>('DIRECT');
  const [allocateNote, setAllocateNote] = useState<string>('');
  const [allocateError, setAllocateError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadFunds = async () => {
    try {
      setIsLoading(true);
      const data = await getUserTimelineFunds(user.id);
      setFunds(data);
    } catch (err) {
      console.error('Failed to load timeline funds:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFunds();
  }, [user.id]);

  const handleCreateFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setCreateError('Please enter a goal title');
      return;
    }
    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      setCreateError('Please enter a valid target amount');
      return;
    }
    if (!targetDate) {
      setCreateError('Please select a target completion date');
      return;
    }

    try {
      setCreateError(null);
      await createLocalTimelineFund({
        userId: user.id,
        title: title.trim(),
        targetAmount: target,
        targetDate: new Date(targetDate).toISOString(),
        icon,
        categoryTag,
        description: description.trim() || undefined,
      });

      setTitle('');
      setTargetAmount('');
      setTargetDate('');
      setDescription('');
      setIsCreateModalOpen(false);
      await loadFunds();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create fund');
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund) return;
    const amount = parseFloat(allocateAmount);
    if (isNaN(amount) || amount <= 0) {
      setAllocateError('Please enter a valid contribution amount');
      return;
    }

    // Check comfort fund balance if source is COMFORT_FUND
    if (allocateSource === 'COMFORT_FUND') {
      const currentUser = await db.users.get(user.id);
      if (!currentUser || (currentUser.comfortFundRemaining ?? 0) < amount) {
        setAllocateError(`Insufficient Comfort Fund allowance (${formatMoney(currentUser?.comfortFundRemaining ?? 0)} remaining)`);
        return;
      }
      // Deduct from comfort fund
      await db.users.update(user.id, {
        comfortFundRemaining: Number((currentUser.comfortFundRemaining - amount).toFixed(2)),
      });
    }

    try {
      setAllocateError(null);
      const result = await allocateToTimelineFund({
        fundId: selectedFund.id,
        userId: user.id,
        amount,
        source: allocateSource,
        note: allocateNote.trim() || undefined,
      });

      setAllocateAmount('');
      setAllocateNote('');
      setIsContributeModalOpen(false);
      await loadFunds();

      // If goal reached and share modal available, offer share
      if (result.fund.isCompleted && onOpenShareCard) {
        onOpenShareCard(result.fund);
      }
    } catch (err: any) {
      setAllocateError(err.message || 'Failed to allocate funds');
    }
  };

  const handleDelete = async (fundId: string) => {
    if (confirm('Delete this timeline fund?')) {
      await deleteLocalTimelineFund(fundId);
      await loadFunds();
    }
  };

  const totalTarget = funds.reduce((sum, f) => sum + f.targetAmount, 0);
  const totalSaved = funds.reduce((sum, f) => sum + f.currentAmount, 0);
  const totalProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950/40 to-slate-900 p-5 md:p-6 border border-sky-500/20 shadow-xl">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-semibold">
              <Target className="w-3.5 h-3.5 text-sky-400" />
              <span>Sinking Funds • Milestone Goals</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Timeline Funds
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-xl">
              Sinking funds with clear target dates, broken down into manageable, stress-free daily savings goals.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full md:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs md:text-sm shadow-lg shadow-sky-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Timeline Fund</span>
          </button>
        </div>

        {/* Global Sinking Fund Metric Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Total Sinking Fund Progress</span>
            <span className="text-sky-300 font-bold">
              {formatMoney(totalSaved)} / {formatMoney(totalTarget)} ({totalProgress}%)
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-700/50">
            <motion.div
              className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${totalProgress}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>
      </div>

      {/* Funds List */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
          <span>Calculating sinking fund timelines...</span>
        </div>
      ) : funds.length === 0 ? (
        <div className="py-14 px-4 rounded-3xl bg-slate-800/40 border border-dashed border-slate-700 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No Timeline Funds Active</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Plan for your next flight, holiday gifts, or camera upgrade. Assign a date and watch your daily required savings pace stay gentle and realistic.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer"
          >
            Create Your First Fund
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Array.isArray(funds) ? funds : []).map((fund) => {
            const progress = Math.min(100, Math.round((fund.currentAmount / fund.targetAmount) * 100));
            const remaining = Math.max(0, fund.targetAmount - fund.currentAmount);
            const targetDateObj = parseISO(fund.targetDate);
            const daysLeft = Math.max(0, differenceInCalendarDays(targetDateObj, new Date()));
            const dailyRequired = daysLeft > 0 ? remaining / daysLeft : remaining;
            const weeklyRequired = dailyRequired * 7;

            return (
              <motion.div
                key={fund.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-3xl p-5 border transition-all space-y-4 flex flex-col justify-between ${
                  fund.isCompleted
                    ? 'bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 border-emerald-500/40 shadow-emerald-950/30'
                    : 'bg-slate-800/70 border-slate-700/70 hover:border-sky-500/40'
                } shadow-xl`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Icon, Title, and Completion Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
                        {fund.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-white">{fund.title}</h3>
                          {fund.isCompleted && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Goal Met</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-slate-400">
                          Due: {format(targetDateObj, 'MMM dd, yyyy')} ({daysLeft} days left)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(fund.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {fund.description && (
                    <p className="text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                      {fund.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Funded</span>
                      <span className="text-white font-bold">
                        {formatMoney(fund.currentAmount)}{' '}
                        <span className="text-slate-400">/ {formatMoney(fund.targetAmount)}</span>{' '}
                        <strong className="text-sky-300">({progress}%)</strong>
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-700/50">
                      <motion.div
                        className={`h-full ${
                          fund.isCompleted
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                  </div>

                  {/* Pacing Advice */}
                  {!fund.isCompleted ? (
                    <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-400 block">
                          Daily Target Pace
                        </span>
                        <span className="font-mono font-bold text-sky-300">
                          {formatMoney(dailyRequired)} / day
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-400 block">
                          Weekly Equivalent
                        </span>
                        <span className="font-mono font-bold text-indigo-300">
                          {formatMoney(weeklyRequired)} / wk
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between font-mono">
                      <span>🎉 Fully Funded! Ready for guilt-free spend.</span>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 border-t border-slate-700/50 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFund(fund);
                      setIsContributeModalOpen(true);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Contribute Funds</span>
                  </button>

                  {onOpenShareCard && (
                    <button
                      type="button"
                      onClick={() => onOpenShareCard(fund)}
                      title="Generate Milestone Share Card"
                      className="py-2 px-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Timeline Fund Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={() => setIsCreateModalOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={isMobile ? { y: '100%', opacity: 0.5 } : { opacity: 0, scale: 0.95, y: 16 }}
              animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border-t sm:border border-slate-700/80 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              {/* Top grab handle for mobile */}
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

              {/* Pinned Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">Create Timeline Fund</h3>
                    <p className="text-[11px] sm:text-xs text-slate-400">Date-Bound Sinking Fund Target</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {/* Form with Scrollable Body and Pinned Footer */}
              <form onSubmit={handleCreateFund} className="flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                  {createError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{createError}</span>
                    </div>
                  )}

                  {/* Icon Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-slate-300">Goal Icon</label>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {DEFAULT_FUND_ICONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setIcon(emoji)}
                          className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition shrink-0 cursor-pointer ${
                            icon === emoji
                              ? 'bg-sky-600 scale-110 shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono uppercase text-slate-300">Goal Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kyoto Trip 2027"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-slate-300">
                        Target Amount ({symbol}) *
                      </label>
                      <input
                        type="number"
                        step={config.decimals === 0 ? '1000' : '0.01'}
                        required
                        placeholder={config.decimals === 0 ? '1500000' : '1200.00'}
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-sky-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-slate-300">
                        Target Date *
                      </label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono uppercase text-slate-300">Category Tag</label>
                    <select
                      value={categoryTag}
                      onChange={(e) => setCategoryTag(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-sky-500"
                    >
                      <option value="Travel">Travel & Trips</option>
                      <option value="Electronics">Electronics & Tools</option>
                      <option value="Emergency">Emergency Buffer</option>
                      <option value="Gifts">Holiday & Celebrations</option>
                      <option value="Car & Home">Vehicle & Home</option>
                      <option value="Personal">Personal Mastery</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono uppercase text-slate-300">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Why this goal matters to you..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Pinned Action Buttons Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/30 transition cursor-pointer"
                  >
                    Create Sinking Fund (+25 EXP)
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contribute Modal */}
      <AnimatePresence>
        {isContributeModalOpen && selectedFund && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={() => setIsContributeModalOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={isMobile ? { y: '100%', opacity: 0.5 } : { opacity: 0, scale: 0.95, y: 16 }}
              animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border-t sm:border border-slate-700/80 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              {/* Top grab handle for mobile */}
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

              {/* Pinned Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="text-2xl">{selectedFund.icon}</div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">Contribute to {selectedFund.title}</h3>
                    <p className="text-[11px] sm:text-xs text-slate-400">
                      Remaining: {formatMoney(selectedFund.targetAmount - selectedFund.currentAmount)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsContributeModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {/* Form with Scrollable Body and Pinned Footer */}
              <form onSubmit={handleAllocate} className="flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                  {allocateError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{allocateError}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-mono uppercase text-slate-300">
                      Contribution Amount ({symbol}) *
                    </label>
                    <input
                      type="number"
                      step={config.decimals === 0 ? '1000' : '0.01'}
                      required
                      autoFocus
                      placeholder={config.decimals === 0 ? '50000' : '50.00'}
                      value={allocateAmount}
                      onChange={(e) => setAllocateAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-base font-mono font-bold text-white focus:outline-hidden focus:border-sky-500"
                    />
                  </div>

                  {/* Source Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-slate-300">Funding Source</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAllocateSource('DIRECT')}
                        className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                          allocateSource === 'DIRECT'
                            ? 'bg-sky-600/20 border-sky-500 text-sky-200'
                            : 'bg-slate-800/60 border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-sky-400" />
                          <span>Direct Cash</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">General savings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAllocateSource('COMFORT_FUND')}
                        className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                          allocateSource === 'COMFORT_FUND'
                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                            : 'bg-slate-800/60 border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Comfort Fund</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          {formatMoney(user.comfortFundRemaining)} available
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono uppercase text-slate-300">Note (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Skipped 2 dinners out this week"
                      value={allocateNote}
                      onChange={(e) => setAllocateNote(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Pinned Action Buttons Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsContributeModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-sky-500/20 hover:opacity-95 transition active:scale-95 cursor-pointer"
                  >
                    Confirm Allocation (+15 EXP)
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
