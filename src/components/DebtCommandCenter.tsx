"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  ShoppingBag,
  Users,
  Building,
  Plus,
  Calendar,
  AlertCircle,
  TrendingDown,
  CheckCircle2,
  Clock,
  Sparkles,
  DollarSign,
  Percent,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Trash2,
  History,
  Zap,
  MessageSquare,
} from 'lucide-react';
import type { LocalDebt, DebtType, LocalUser, LocalCategory, LocalDebtPayment } from '../types';
import { AddDebtModal } from './AddDebtModal';
import { DebtStrategySimulator } from './DebtStrategySimulator';
import { DebtPaymentHistoryDrawer } from './DebtPaymentHistoryDrawer';
import { IOUReminderModal } from './IOUReminderModal';
import { DebtConqueredCelebrationModal } from './DebtConqueredCelebrationModal';
import { createLocalDebt, deleteLocalDebt, logLocalDebtPayment, getLocalDebtPayments } from '../lib/db';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';
import { useCurrency } from '../context/CurrencyContext';

interface DebtCommandCenterProps {
  user: LocalUser;
  debts: LocalDebt[];
  categories: LocalCategory[];
  onRefreshDebts: () => Promise<void>;
  onOpenQuickAdd?: () => void;
  onOpenShareCard?: (debt: LocalDebt) => void;
  onOpenSpinner?: () => void;
}

export const DebtCommandCenter: React.FC<DebtCommandCenterProps> = ({
  user,
  debts,
  categories,
  onRefreshDebts,
  onOpenShareCard,
  onOpenSpinner,
}) => {
  const { format: formatMoney, symbol, config } = useCurrency();
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'BNPL' | 'IOU' | 'LOAN' | 'PAID' | 'STRATEGY'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Payment execution state
  const [payingDebt, setPayingDebt] = useState<LocalDebt | null>(null);
  const [paymentAmountStr, setPaymentAmountStr] = useState('');
  const [recordInLedger, setRecordInLedger] = useState(true);
  const [selectedLedgerCatId, setSelectedLedgerCatId] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Phase 5.C: Payment History Drawer state
  const [historyDebt, setHistoryDebt] = useState<LocalDebt | null>(null);
  const [debtPaymentsList, setDebtPaymentsList] = useState<LocalDebtPayment[]>([]);

  // Phase 5.C: IOU Reminder Template Modal state
  const [iouNudgeDebt, setIouNudgeDebt] = useState<LocalDebt | null>(null);

  // Phase 5.E: Debt Conquered Celebration Modal state
  const [conqueredDebt, setConqueredDebt] = useState<LocalDebt | null>(null);

  // Aggregated Telemetry Calculations
  const metrics = useMemo(() => {
    const activeDebts = debts.filter((d) => d.status === 'ACTIVE');

    // 1. Total Liabilities Balance (excluding IOUs owed TO user)
    const totalLiabilities = activeDebts
      .filter((d) => d.debtType !== 'IOU_RECEIVABLE')
      .reduce((acc, d) => acc + d.remainingBalance, 0);

    // 2. Total Friend Receivables (money others owe you)
    const totalReceivables = activeDebts
      .filter((d) => d.debtType === 'IOU_RECEIVABLE')
      .reduce((acc, d) => acc + d.remainingBalance, 0);

    // 3. Monthly Recurring Commitment (Minimum payments + BNPL installments)
    const monthlyCommitments = activeDebts
      .filter((d) => d.debtType !== 'IOU_RECEIVABLE')
      .reduce((acc, d) => {
        if (d.minimumPayment && d.minimumPayment > 0) return acc + d.minimumPayment;
        if (d.debtType === 'BNPL' && d.installmentCount && d.installmentCount > 0) {
          return acc + (d.totalAmount / d.installmentCount);
        }
        return acc;
      }, 0);

    // 4. Overall Conquered Debt Percentage
    const totalOriginalDebt = debts
      .filter((d) => d.debtType !== 'IOU_RECEIVABLE')
      .reduce((acc, d) => acc + d.totalAmount, 0);

    const percentPaid =
      totalOriginalDebt > 0
        ? Math.round(((totalOriginalDebt - totalLiabilities) / totalOriginalDebt) * 100)
        : 100;

    // 5. Upcoming due in the next 30 days
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingDue = activeDebts
      .filter((d) => {
        if (!d.dueDate) return false;
        const due = new Date(d.dueDate);
        return due >= now && due <= thirtyDaysAhead;
      })
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

    return {
      totalLiabilities,
      totalReceivables,
      monthlyCommitments,
      percentPaid,
      upcomingDue,
      activeCount: activeDebts.length,
    };
  }, [debts]);

  // Filtered List
  const filteredDebts = useMemo(() => {
    return debts.filter((debt) => {
      if (activeFilter === 'PAID') return debt.status === 'PAID_OFF';
      if (debt.status === 'PAID_OFF') return false; // In other filters, only show active
      if (activeFilter === 'BNPL') return debt.debtType === 'BNPL';
      if (activeFilter === 'IOU') return debt.debtType === 'IOU_OWED' || debt.debtType === 'IOU_RECEIVABLE';
      if (activeFilter === 'LOAN') return debt.debtType === 'CREDIT_CARD' || debt.debtType === 'LOAN_MORTGAGE';
      return true;
    });
  }, [debts, activeFilter]);

  // Default debt repayment category for ledger
  const defaultCategory = useMemo(() => {
    return (
      categories.find((c) => c.name.toLowerCase().includes('debt') || c.name.toLowerCase().includes('bill')) ||
      categories[0]
    );
  }, [categories]);

  const handleOpenPaymentModal = (debt: LocalDebt) => {
    soundFx.playTickSound();
    haptics.selectionTick();
    setPayingDebt(debt);
    setPaymentAmountStr(debt.minimumPayment ? debt.minimumPayment.toString() : debt.remainingBalance.toString());
    setSelectedLedgerCatId(defaultCategory?.id || '');
  };

  const handleOpenHistoryDrawer = async (debt: LocalDebt) => {
    soundFx.playTickSound();
    haptics.lightTap();
    setHistoryDebt(debt);
    try {
      const history = await getLocalDebtPayments(debt.id);
      setDebtPaymentsList(history);
    } catch {
      setDebtPaymentsList([]);
    }
  };

  const handleExecutePayment = async () => {
    if (!payingDebt) return;
    const amount = parseFloat(paymentAmountStr);
    if (isNaN(amount) || amount <= 0) return;

    try {
      setIsSubmittingPayment(true);
      const result = await logLocalDebtPayment({
        debtId: payingDebt.id,
        userId: user.id,
        amount,
        syncToLedger: recordInLedger,
        categoryId: recordInLedger ? selectedLedgerCatId : undefined,
      });

      const currentDebtRef = payingDebt;
      setPayingDebt(null);
      await onRefreshDebts();

      if (result.conquered) {
        soundFx.playFanfareSound();
        haptics.successPulse();
        setConqueredDebt(result.updatedDebt || currentDebtRef);
      } else {
        soundFx.playCoinSound();
        haptics.lightTap();
      }
    } catch (err) {
      console.error('Payment failed:', err);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}"?`)) {
      haptics.lightTap();
      await deleteLocalDebt(id);
      await onRefreshDebts();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Debt & Liabilities Command Center
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Mindful Awareness
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track PayLater commitments, friend IOUs, credit cards, and long-term loans with zero shame.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundFx.playTickSound();
              haptics.selectionTick();
              setActiveFilter(activeFilter === 'STRATEGY' ? 'ALL' : 'STRATEGY');
            }}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer active:scale-95 ${
              activeFilter === 'STRATEGY'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulator</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playTickSound();
              haptics.lightTap();
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-purple-950/40 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Loan or IOU</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Outstanding Liabilities */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Liabilities</span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-white">
            {formatMoney(metrics.totalLiabilities)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Across {metrics.activeCount} active liabilities
          </div>
        </div>

        {/* Monthly Cash Commitments */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Monthly Commitment</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-purple-300">
            {formatMoney(metrics.monthlyCommitments)}
            <span className="text-xs text-slate-400 font-sans font-normal">/mo</span>
          </div>
          <div className="mt-1 text-[11px] text-purple-400/80">
            Installments & min payments
          </div>
        </div>

        {/* Friend Receivables (Money Owed to You) */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Owed to Me</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-emerald-300">
            {formatMoney(metrics.totalReceivables)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-400/80">
            Money owed by friends
          </div>
        </div>

        {/* Debt Conquered Progress */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Repaid Progress</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-amber-300">
            {metrics.percentPaid}%
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, metrics.percentPaid))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 30-Day Upcoming Due Date Radar */}
      {metrics.upcomingDue.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/20 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                30-Day Due Date Radar
              </h3>
            </div>
            <span className="text-[11px] text-purple-300 font-mono">
              {metrics.upcomingDue.length} Upcoming
            </span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {metrics.upcomingDue.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 min-w-[200px] shrink-0 space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-200 truncate max-w-[120px]">
                    {item.name}
                  </span>
                  <span className="font-mono font-bold text-purple-400">
                    {formatMoney(item.minimumPayment || item.remainingBalance)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Due: {item.dueDate}</span>
                  <button
                    type="button"
                    onClick={() => handleOpenPaymentModal(item)}
                    className="text-blue-400 hover:text-blue-300 font-semibold underline cursor-pointer"
                  >
                    Pay
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs & Views */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => {
            haptics.selectionTick();
            setActiveFilter('ALL');
          }}
          className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            activeFilter === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Active ({debts.filter((d) => d.status === 'ACTIVE').length})
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selectionTick();
            setActiveFilter('BNPL');
          }}
          className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeFilter === 'BNPL'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-3 h-3" />
          <span>PayLater ({debts.filter((d) => d.status === 'ACTIVE' && d.debtType === 'BNPL').length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selectionTick();
            setActiveFilter('IOU');
          }}
          className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeFilter === 'IOU'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3 h-3" />
          <span>Friend IOUs ({debts.filter((d) => d.status === 'ACTIVE' && (d.debtType === 'IOU_OWED' || d.debtType === 'IOU_RECEIVABLE')).length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selectionTick();
            setActiveFilter('LOAN');
          }}
          className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeFilter === 'LOAN'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-3 h-3" />
          <span>Cards & Loans</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selectionTick();
            setActiveFilter('PAID');
          }}
          className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeFilter === 'PAID'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>Paid Off ({debts.filter((d) => d.status === 'PAID_OFF').length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playTickSound();
            haptics.selectionTick();
            setActiveFilter('STRATEGY');
          }}
          className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeFilter === 'STRATEGY'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
              : 'text-amber-400 hover:text-amber-300'
          }`}
        >
          <Zap className="w-3 h-3" />
          <span>Simulator</span>
        </button>
      </div>

      {/* View: Strategy Simulator Tab (Phase 5.D) */}
      {activeFilter === 'STRATEGY' ? (
        <DebtStrategySimulator
          debts={debts}
          onOpenPaymentModal={handleOpenPaymentModal}
        />
      ) : (
        /* View: Debt Cards Grid (Phase 5.B, 5.C & 5.E) */
        filteredDebts.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white">No liabilities in this category!</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Enjoy your peace of mind or click &quot;Add Liability or IOU&quot; above to log an installment schedule, friend split, or card balance.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDebts.map((debt) => {
              const isReceivable = debt.debtType === 'IOU_RECEIVABLE';
              const isPaidOff = debt.status === 'PAID_OFF';
              const progress =
                debt.totalAmount > 0
                  ? Math.round(((debt.totalAmount - debt.remainingBalance) / debt.totalAmount) * 100)
                  : 100;

              return (
                <div
                  key={debt.id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all space-y-3.5 relative overflow-hidden ${
                    isPaidOff
                      ? 'bg-slate-900/40 border-emerald-500/30'
                      : isReceivable
                      ? 'bg-slate-900/80 border-emerald-500/30 shadow-md shadow-emerald-950/10'
                      : debt.debtType === 'BNPL'
                      ? 'bg-slate-900/80 border-purple-500/30 shadow-md shadow-purple-950/10'
                      : 'bg-slate-900/80 border-slate-800 shadow-md'
                  }`}
                >
                  {/* Header: Type Badge & Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            debt.debtType === 'BNPL'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : debt.debtType === 'IOU_OWED'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : debt.debtType === 'IOU_RECEIVABLE'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : debt.debtType === 'CREDIT_CARD'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {debt.debtType === 'BNPL'
                            ? 'PayLater (BNPL)'
                            : debt.debtType === 'IOU_OWED'
                            ? 'Friend IOU (I Owe)'
                            : debt.debtType === 'IOU_RECEIVABLE'
                            ? 'Owed To Me'
                            : debt.debtType === 'CREDIT_CARD'
                            ? 'Credit Card'
                            : 'Loan / Mortgage'}
                        </span>

                        {isPaidOff && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 shadow-xs">
                            Conquered 🏆
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                        {debt.name}
                      </h3>

                      {debt.counterpartyName && (
                        <p className="text-xs text-slate-400">
                          {isReceivable ? 'Debtor' : 'Creditor'}:{' '}
                          <strong className="text-slate-300">{debt.counterpartyName}</strong>
                        </p>
                      )}
                    </div>

                    {/* Delete & History Icons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenHistoryDrawer(debt)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition cursor-pointer"
                        title="View Payment Ledger History"
                      >
                        <History className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(debt.id, debt.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Delete liability"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Balances & Interest Grid */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">
                        {isPaidOff ? 'Total Paid' : isReceivable ? 'Pending Collect' : 'Remaining Balance'}
                      </span>
                      <div className="text-lg font-mono font-black text-white">
                        {formatMoney(debt.remainingBalance)}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">
                        {debt.interestRate ? 'Interest Rate' : 'Minimum / Due'}
                      </span>
                      <div className="text-base font-mono font-bold text-slate-200">
                        {debt.interestRate
                          ? `${debt.interestRate}% APR`
                          : debt.minimumPayment
                          ? formatMoney(debt.minimumPayment)
                          : 'Flexible'}
                      </div>
                    </div>
                  </div>

                  {/* BNPL Installment Progress */}
                  {debt.debtType === 'BNPL' && debt.installmentCount && (
                    <div className="p-2.5 rounded-xl bg-purple-950/25 border border-purple-500/20 flex items-center justify-between text-xs">
                      <span className="text-purple-300 font-medium">
                        Installments:{' '}
                        <strong className="text-white">
                          {debt.installmentsPaid || 0} of {debt.installmentCount} paid
                        </strong>
                      </span>
                      <span className="text-[11px] text-purple-400 font-mono">
                        {(debt.installmentCount - (debt.installmentsPaid || 0))} remaining
                      </span>
                    </div>
                  )}

                  {/* Visual Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{progress}% Conquered</span>
                      <span>Initial: {formatMoney(debt.totalAmount)}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPaidOff
                            ? 'bg-emerald-500'
                            : isReceivable
                            ? 'bg-emerald-400'
                            : debt.debtType === 'BNPL'
                            ? 'bg-purple-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                  </div>

                  {/* Notes / Due Date */}
                  {(debt.dueDate || debt.notes) && (
                    <div className="text-xs text-slate-400 space-y-1 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                      {debt.dueDate && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          <span>Due date: <strong>{debt.dueDate}</strong></span>
                        </div>
                      )}
                      {debt.notes && <p className="text-[11px] text-slate-400">{debt.notes}</p>}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {!isPaidOff ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenPaymentModal(debt)}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98 ${
                            isReceivable
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isReceivable ? 'Record Received' : 'Make Payment'}</span>
                        </button>

                        {/* Phase 5.C: Friend IOU Reminder Template Trigger */}
                        {(debt.debtType === 'IOU_OWED' || debt.debtType === 'IOU_RECEIVABLE') && (
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playTickSound();
                              haptics.lightTap();
                              setIouNudgeDebt(debt);
                            }}
                            className="py-2.5 px-3 rounded-xl bg-purple-950/40 border border-purple-500/30 hover:bg-purple-900/40 text-purple-300 text-xs font-semibold transition flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                            title="Open friendly nudge templates"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Nudge</span>
                          </button>
                        )}
                      </>
                    ) : (
                      // Paid Off Milestone Share Card Trigger (Phase 5.E)
                      onOpenShareCard && (
                        <button
                          type="button"
                          onClick={() => {
                            soundFx.playTickSound();
                            haptics.selectionTick();
                            onOpenShareCard(debt);
                          }}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Victory Card</span>
                        </button>
                      )
                    )}

                    {/* Quick Payment History Ledger Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenHistoryDrawer(debt)}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                    >
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ledger</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Add Debt Modal */}
      <AddDebtModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={async (data) => {
          await createLocalDebt({
            userId: user.id,
            name: data.name,
            debtType: data.debtType,
            totalAmount: data.totalAmount,
            remainingBalance: data.remainingBalance,
            interestRate: data.interestRate,
            minimumPayment: data.minimumPayment,
            counterpartyName: data.counterpartyName,
            dueDate: data.dueDate,
            frequency: data.frequency,
            installmentCount: data.installmentCount,
            installmentsPaid: data.installmentsPaid,
            notes: data.notes,
            status: data.remainingBalance <= 0 ? 'PAID_OFF' : 'ACTIVE',
          });
          await onRefreshDebts();
        }}
      />

      {/* Payment / Settle-Up Modal (Phase 5.C) */}
      <AnimatePresence>
        {payingDebt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {payingDebt.debtType === 'IOU_RECEIVABLE' ? 'Record Repayment Received' : 'Log Debt Repayment'}
                  </h3>
                  <p className="text-xs text-slate-400 truncate max-w-[220px]">{payingDebt.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Payment Amount Input */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">Payment Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">{symbol}</span>
                  <input
                    type="number"
                    step={config.decimals === 0 ? '1000' : '0.01'}
                    min={config.decimals === 0 ? '1' : '0.01'}
                    max={payingDebt.remainingBalance}
                    value={paymentAmountStr}
                    onChange={(e) => setPaymentAmountStr(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                    placeholder={config.decimals === 0 ? '50000' : '0.00'}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Balance: {formatMoney(payingDebt.remainingBalance)}</span>
                  <button
                    type="button"
                    onClick={() => setPaymentAmountStr(payingDebt.remainingBalance.toString())}
                    className="text-blue-400 hover:text-blue-300 font-semibold underline cursor-pointer"
                  >
                    Pay in Full
                  </button>
                </div>
              </div>

              {/* Ledger Synergy Checkbox (Phase 5.C) */}
              {payingDebt.debtType !== 'IOU_RECEIVABLE' && (
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={recordInLedger}
                      onChange={(e) => setRecordInLedger(e.target.checked)}
                      className="rounded bg-slate-700 border-slate-600 text-blue-500"
                    />
                    <span>Also log as an expense in main ledger</span>
                  </label>

                  {recordInLedger && (
                    <select
                      value={selectedLedgerCatId}
                      onChange={(e) => setSelectedLedgerCatId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecutePayment}
                  disabled={isSubmittingPayment}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-md disabled:opacity-50"
                >
                  {isSubmittingPayment ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Phase 5.C: Payment Ledger History Drawer */}
      <DebtPaymentHistoryDrawer
        isOpen={!!historyDebt}
        onClose={() => setHistoryDebt(null)}
        debt={historyDebt}
        payments={debtPaymentsList}
        onMakePaymentClick={(d) => {
          handleOpenPaymentModal(d);
        }}
      />

      {/* Phase 5.C: Low-Awkwardness IOU Nudge Modal */}
      <IOUReminderModal
        isOpen={!!iouNudgeDebt}
        onClose={() => setIouNudgeDebt(null)}
        debt={iouNudgeDebt}
      />

      {/* Phase 5.E: Gamified Debt Conquered Celebration Modal */}
      <DebtConqueredCelebrationModal
        isOpen={!!conqueredDebt}
        onClose={() => setConqueredDebt(null)}
        debt={conqueredDebt}
        user={user}
        onOpenShareCard={(debt) => {
          if (onOpenShareCard) onOpenShareCard(debt);
        }}
        onOpenSpinner={onOpenSpinner}
      />
    </div>
  );
};
