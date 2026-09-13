"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  CreditCard,
  ShoppingBag,
  Users,
  Building,
  Calendar,
  DollarSign,
  Percent,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import type { DebtType, RepaymentFrequency } from '../types';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';
import { useCurrency } from '../context/CurrencyContext';

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    debtType: DebtType;
    totalAmount: number;
    remainingBalance: number;
    interestRate: number;
    minimumPayment: number;
    counterpartyName?: string;
    dueDate?: string;
    frequency: RepaymentFrequency;
    installmentCount?: number;
    installmentsPaid?: number;
    notes?: string;
  }) => Promise<void>;
}

export const AddDebtModal: React.FC<AddDebtModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { symbol, config } = useCurrency();
  const [debtType, setDebtType] = useState<DebtType>('BNPL');
  const [name, setName] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [totalAmountStr, setTotalAmountStr] = useState('');
  const [remainingBalanceStr, setRemainingBalanceStr] = useState('');
  const [interestRateStr, setInterestRateStr] = useState('0');
  const [minimumPaymentStr, setMinimumPaymentStr] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [frequency, setFrequency] = useState<RepaymentFrequency>('BI_WEEKLY');
  const [installmentCountStr, setInstallmentCountStr] = useState('4');
  const [installmentsPaidStr, setInstallmentsPaidStr] = useState('0');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleTypeSelect = (type: DebtType) => {
    soundFx.playTickSound();
    haptics.selectionTick();
    setDebtType(type);

    // Smart Archetype Defaults
    if (type === 'BNPL') {
      setInterestRateStr('0');
      setFrequency('BI_WEEKLY');
      setInstallmentCountStr('4');
      setInstallmentsPaidStr('0');
    } else if (type === 'IOU_OWED' || type === 'IOU_RECEIVABLE') {
      setInterestRateStr('0');
      setFrequency('ONE_OFF');
      setInstallmentCountStr('');
      setInstallmentsPaidStr('');
    } else if (type === 'CREDIT_CARD') {
      setInterestRateStr('22.5');
      setFrequency('MONTHLY');
      setInstallmentCountStr('');
      setInstallmentsPaidStr('');
    } else if (type === 'LOAN_MORTGAGE') {
      setInterestRateStr('6.5');
      setFrequency('MONTHLY');
      setInstallmentCountStr('');
      setInstallmentsPaidStr('');
    }
  };

  const handleTotalAmountChange = (val: string) => {
    setTotalAmountStr(val);
    if (!remainingBalanceStr || remainingBalanceStr === totalAmountStr) {
      setRemainingBalanceStr(val);
    }
    // Auto-calculate PayLater installment amount if 4-pay
    if (debtType === 'BNPL' && val) {
      const num = parseFloat(val);
      const count = parseInt(installmentCountStr) || 4;
      if (!isNaN(num) && count > 0) {
        setMinimumPaymentStr((num / count).toFixed(2));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Please enter a descriptive name for this debt or IOU.');
      return;
    }

    const total = parseFloat(totalAmountStr);
    if (isNaN(total) || total <= 0) {
      setErrorMsg('Please provide a valid total amount.');
      return;
    }

    const remaining = remainingBalanceStr ? parseFloat(remainingBalanceStr) : total;
    if (isNaN(remaining) || remaining < 0) {
      setErrorMsg('Remaining balance cannot be negative.');
      return;
    }

    const apr = parseFloat(interestRateStr) || 0;
    const minPay = parseFloat(minimumPaymentStr) || 0;
    const instCount = installmentCountStr ? parseInt(installmentCountStr) : undefined;
    const instPaid = installmentsPaidStr ? parseInt(installmentsPaidStr) : undefined;

    try {
      setIsSubmitting(true);
      await onSubmit({
        name: name.trim(),
        debtType,
        totalAmount: total,
        remainingBalance: remaining,
        interestRate: apr,
        minimumPayment: minPay,
        counterpartyName: counterpartyName.trim() || undefined,
        dueDate: dueDate || undefined,
        frequency,
        installmentCount: instCount,
        installmentsPaid: instPaid,
        notes: notes.trim() || undefined,
      });

      soundFx.playCoinSound();
      haptics.successPulse();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save debt entry.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Add Debt or IOU</h2>
              <p className="text-xs text-slate-400">PayLater, Friend IOUs, Cards, & Mortgages</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Archetype Selector */}
        <div className="mt-4 space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Liability Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 1. BNPL */}
            <button
              type="button"
              onClick={() => handleTypeSelect('BNPL')}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col items-start gap-1 ${
                debtType === 'BNPL'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-200 ring-1 ring-purple-500/40'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-bold">PayLater</span>
              </div>
              <span className="text-[10px] text-slate-400">Klarna, Affirm</span>
            </button>

            {/* 2. Friend IOU */}
            <button
              type="button"
              onClick={() => handleTypeSelect('IOU_OWED')}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col items-start gap-1 ${
                debtType === 'IOU_OWED'
                  ? 'bg-amber-600/20 border-amber-500 text-amber-200 ring-1 ring-amber-500/40'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold">I Owe Friend</span>
              </div>
              <span className="text-[10px] text-slate-400">Dinners, splits</span>
            </button>

            {/* 3. Friend Owes Me */}
            <button
              type="button"
              onClick={() => handleTypeSelect('IOU_RECEIVABLE')}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col items-start gap-1 ${
                debtType === 'IOU_RECEIVABLE'
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/40'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold">Friend Owes</span>
              </div>
              <span className="text-[10px] text-slate-400">Receivable loan</span>
            </button>

            {/* 4. Cards & Loans */}
            <button
              type="button"
              onClick={() => handleTypeSelect('CREDIT_CARD')}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col items-start gap-1 ${
                debtType === 'CREDIT_CARD' || debtType === 'LOAN_MORTGAGE'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-1 ring-blue-500/40'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-bold">Card / Loan</span>
              </div>
              <span className="text-[10px] text-slate-400">Revolving APR</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Item Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              {debtType === 'BNPL'
                ? 'Item / Order Name'
                : debtType === 'IOU_OWED' || debtType === 'IOU_RECEIVABLE'
                ? 'Reason / Split Description'
                : 'Account / Loan Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                debtType === 'BNPL'
                  ? 'e.g., Apple AirPods Max'
                  : debtType === 'IOU_OWED'
                  ? 'e.g., Coachella Airbnb split'
                  : 'e.g., Chase Sapphire or Car Loan'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Counterparty / Provider */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              {debtType === 'BNPL'
                ? 'PayLater Provider / Store'
                : debtType === 'IOU_OWED' || debtType === 'IOU_RECEIVABLE'
                ? 'Friend / Person Name'
                : 'Lender / Bank'}
            </label>
            <input
              type="text"
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
              placeholder={
                debtType === 'BNPL'
                  ? 'e.g., Klarna, Affirm, Afterpay'
                  : debtType === 'IOU_OWED' || debtType === 'IOU_RECEIVABLE'
                  ? 'e.g., Sarah Chen'
                  : 'e.g., Wells Fargo, Chase'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Amount Inputs: Total & Remaining */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <span>Total Amount</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono text-sm">{symbol}</span>
                <input
                  type="number"
                  step={config.decimals === 0 ? '1000' : '0.01'}
                  min={config.decimals === 0 ? '1' : '0.01'}
                  value={totalAmountStr}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  placeholder={config.decimals === 0 ? '0' : '0.00'}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Remaining Balance</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono text-sm">{symbol}</span>
                <input
                  type="number"
                  step={config.decimals === 0 ? '1000' : '0.01'}
                  min="0"
                  value={remainingBalanceStr}
                  onChange={(e) => setRemainingBalanceStr(e.target.value)}
                  placeholder={config.decimals === 0 ? '0' : '0.00'}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Interest APR & Minimum Installment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Interest APR</span>
                <span className="text-[10px] text-slate-500">0% for BNPL/IOU</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={interestRateStr}
                  onChange={(e) => setInterestRateStr(e.target.value)}
                  placeholder="0"
                  className="w-full pl-3 pr-7 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-3 top-2.5 text-slate-500 text-sm">%</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                {debtType === 'BNPL' ? 'Installment Amount' : 'Min / Regular Payment'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono text-sm">{symbol}</span>
                <input
                  type="number"
                  step={config.decimals === 0 ? '1000' : '0.01'}
                  min="0"
                  value={minimumPaymentStr}
                  onChange={(e) => setMinimumPaymentStr(e.target.value)}
                  placeholder={config.decimals === 0 ? '0' : '0.00'}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* BNPL Installment Counts */}
          {debtType === 'BNPL' && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-purple-950/20 border border-purple-500/20">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-purple-300">Total Installments</label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={installmentCountStr}
                  onChange={(e) => setInstallmentCountStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-purple-300">Installments Paid</label>
                <input
                  type="number"
                  min="0"
                  max="48"
                  value={installmentsPaidStr}
                  onChange={(e) => setInstallmentsPaidStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-white"
                />
              </div>
            </div>
          )}

          {/* Due Date & Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Next Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Payment Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RepaymentFrequency)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="BI_WEEKLY">Bi-Weekly (Pay-in-4)</option>
                <option value="MONTHLY">Monthly</option>
                <option value="WEEKLY">Weekly</option>
                <option value="ONE_OFF">One-off / Lump Sum</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Mindful Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Pay off early to avoid high interest, or split details"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Register Liability'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
