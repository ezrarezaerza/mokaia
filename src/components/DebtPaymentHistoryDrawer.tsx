"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  History,
  Calendar,
  DollarSign,
  TrendingDown,
  ArrowDownLeft,
  CheckCircle2,
  Tag,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import type { LocalDebt, LocalDebtPayment } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useTranslation } from '../context/LanguageContext';

interface DebtPaymentHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  debt: LocalDebt | null;
  payments: LocalDebtPayment[];
  onMakePaymentClick: (debt: LocalDebt) => void;
}

export const DebtPaymentHistoryDrawer: React.FC<DebtPaymentHistoryDrawerProps> = ({
  isOpen,
  onClose,
  debt,
  payments,
  onMakePaymentClick,
}) => {
  const { format: formatMoney } = useCurrency();
  const { formatDate } = useTranslation();
  if (!isOpen || !debt) return null;

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs cursor-pointer"
          onClick={onClose}
        />

        {/* Drawer panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-md h-[85vh] sm:h-[90vh] rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl z-10 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/95">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">Payment Ledger</h3>
                <p className="text-xs text-slate-400 truncate max-w-[220px]">{debt.name}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Balance Summary Bar */}
          <div className="p-4 bg-slate-800/40 border-b border-slate-800 grid grid-cols-3 gap-2 text-center shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Initial</span>
              <span className="text-sm font-black font-mono text-slate-200">
                {formatMoney(debt.totalAmount)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-purple-400 uppercase font-mono block">Total Repaid</span>
              <span className="text-sm font-black font-mono text-purple-300">
                {formatMoney(totalPaid)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 uppercase font-mono block">Balance</span>
              <span className="text-sm font-black font-mono text-emerald-400">
                {formatMoney(debt.remainingBalance)}
              </span>
            </div>
          </div>

          {/* Payments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {payments.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-slate-400 my-auto">
                <Clock className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-medium">No payments logged yet for this liability.</p>
                <p className="text-[11px] text-slate-500">
                  Payments logged here will automatically update the balance and reward you with EXP.
                </p>
              </div>
            ) : (
              payments.map((p, idx) => {
                const dateFormatted = formatDate(p.paymentDate, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">
                          #{payments.length - idx}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-white block">
                            {formatMoney(p.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400">{dateFormatted}</span>
                        </div>
                      </div>

                      {p.syncedToLedger && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Ledger Linked
                        </span>
                      )}
                    </div>

                    {p.notes && (
                      <p className="text-[11px] text-slate-300 bg-slate-900/50 p-2 rounded-xl">
                        {p.notes}
                      </p>
                    )}

                    {(p.interestAmount > 0 || p.principalAmount < p.amount) && (
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-700/40">
                        <span>Principal: {formatMoney(p.principalAmount)}</span>
                        <span>Interest: {formatMoney(p.interestAmount)}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Action Footer */}
          {debt.status === 'ACTIVE' && (
            <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onMakePaymentClick(debt);
                }}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-purple-950/40"
              >
                <DollarSign className="w-4 h-4" />
                <span>Log New Payment ({formatMoney(debt.remainingBalance)} left)</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
