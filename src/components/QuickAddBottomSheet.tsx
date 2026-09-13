"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ArrowUpRight, ArrowDownLeft, ShieldAlert, Sparkles, Calendar, FileText, Clock, Calculator, HeartHandshake, Smile } from 'lucide-react';
import { createLocalTransaction, updateLocalTransaction, sendToCoolingOffQueue, EMOTIONAL_MOOD_CONFIG } from '../lib/db';
import { syncEngine } from '../lib/syncEngine';
import type { LocalCategory, LocalTransaction, MindfulTag, TransactionType, EmotionalMood } from '../types';
import { CostPerUseVisualizerModal } from './CostPerUseVisualizerModal';
import { BehavioralInterceptionModal } from './BehavioralInterceptionModal';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';
import { useCurrency } from '../context/CurrencyContext';

interface QuickAddBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  categories: LocalCategory[];
  transactionToEdit?: LocalTransaction | null;
  comfortFundRemaining?: number;
  comfortFundUnlocked?: boolean;
  onUnlockComfortFund?: () => void;
  initialHoldInCoolingOff?: boolean;
}

const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

const MINDFUL_TAGS: Array<{ tag: MindfulTag; label: string; desc: string; emoji: string }> = [
  { tag: 'NEED', label: 'Essential Need', desc: 'Rent, groceries, health, basic bills', emoji: '🛡️' },
  { tag: 'WANT', label: 'Lifestyle Want', desc: 'Treats, social dining, games, style', emoji: '✨' },
  { tag: 'SAVING', label: 'Future Saving', desc: 'Emergency cushion or sinking fund', emoji: '🌱' },
  { tag: 'INVESTMENT', label: 'Growth / Learn', desc: 'Books, education, tools, fitness', emoji: '📈' },
];

export const QuickAddBottomSheet: React.FC<QuickAddBottomSheetProps> = ({
  isOpen,
  onClose,
  userId,
  categories = [],
  transactionToEdit,
  comfortFundRemaining = 25,
  comfortFundUnlocked = false,
  onUnlockComfortFund,
  initialHoldInCoolingOff = false,
}) => {
  const safeCategories = Array.isArray(categories) ? categories : [];
  const { symbol, quickAddPresets, format, config } = useCurrency();
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [mindfulTag, setMindfulTag] = useState<MindfulTag>('WANT');
  const [emotionalMood, setEmotionalMood] = useState<EmotionalMood | undefined>(undefined);
  const [notes, setNotes] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMindfulCheck, setShowMindfulCheck] = useState(false);

  // Phase 2 Behavioral States
  const [isComfortFund, setIsComfortFund] = useState<boolean>(false);
  const [costPerUse, setCostPerUse] = useState<number | undefined>(undefined);
  const [estimatedUses, setEstimatedUses] = useState<number | undefined>(undefined);
  const [isCostPerUseModalOpen, setIsCostPerUseModalOpen] = useState<boolean>(false);
  const [isInterceptionModalOpen, setIsInterceptionModalOpen] = useState<boolean>(false);
  const [hasBypassedInterception, setHasBypassedInterception] = useState<boolean>(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus amount field on open or populate fields when editing
  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setType(transactionToEdit.type);
        setAmountStr(transactionToEdit.amount.toString());
        setDescription(transactionToEdit.description);
        setSelectedCategoryId(transactionToEdit.categoryId);
        setMindfulTag(transactionToEdit.mindfulTag);
        setEmotionalMood(transactionToEdit.emotionalMood);
        setNotes(transactionToEdit.notes || '');
        setIsComfortFund(transactionToEdit.isComfortFund || false);
        setCostPerUse(transactionToEdit.costPerUse);
        setEstimatedUses(transactionToEdit.estimatedUses);
        setHasBypassedInterception(true);
        // Local date-time input format: YYYY-MM-DDTHH:mm
        try {
          const d = new Date(transactionToEdit.date);
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setDateStr(localIso);
        } catch {
          setDateStr('');
        }
      } else {
        setType('EXPENSE');
        setAmountStr('');
        setDescription('');
        setNotes('');
        setShowMindfulCheck(false);
        setIsComfortFund(false);
        setCostPerUse(undefined);
        setEstimatedUses(undefined);
        setEmotionalMood(undefined);
        setHasBypassedInterception(false);
        const now = new Date();
        const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setDateStr(localIso);
        if (categories.length > 0) {
          const firstNonDeleted = categories.find((c) => !c.isDeleted);
          if (firstNonDeleted) setSelectedCategoryId(firstNonDeleted.id);
        }
      }

      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, transactionToEdit, categories, initialHoldInCoolingOff]);

  const handleQuickAddAmount = (addValue: number) => {
    soundFx.playTickSound();
    haptics.selectionTick();
    const current = parseFloat(amountStr) || 0;
    const nextAmount = current + addValue;
    setAmountStr(nextAmount.toFixed(current % 1 === 0 ? 0 : 2));
    if (nextAmount >= 50 && mindfulTag === 'WANT') {
      haptics.mindfulFriction();
    }
  };

  const handleSendToCoolingOff = async (coolingHours: 24 | 48 = 24, customCpu?: number, customUses?: number) => {
    const numAmount = parseFloat(amountStr);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      amountInputRef.current?.focus();
      return;
    }

    const activeCategories = safeCategories.filter((c) => !c.isDeleted);
    const activeCategory = activeCategories.find((c) => c.id === selectedCategoryId);
    const finalDesc = description.trim() || activeCategory?.name || 'Impulse Want';

    setIsSubmitting(true);
    try {
      await sendToCoolingOffQueue({
        userId,
        categoryId: selectedCategoryId || (activeCategories[0]?.id ?? 'default'),
        amount: numAmount,
        description: finalDesc,
        notes: notes.trim() || undefined,
        coolingHours,
        emotionalMood,
        costPerUse: customCpu ?? costPerUse,
        estimatedUses: customUses ?? estimatedUses,
      });

      syncEngine.sync().catch(() => {});
      onClose();
    } catch (err) {
      console.error('Failed to send to Cooling-Off Queue:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, forceBypass = false) => {
    if (e) e.preventDefault();
    const numAmount = parseFloat(amountStr);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      amountInputRef.current?.focus();
      return;
    }

    // Phase 2 Behavioral Interception:
    // If logging an unreviewed WANT over threshold, pause and present mindful alternatives
    const interceptionThreshold = config.decimals === 0 ? 250000 : 35;
    if (
      !forceBypass &&
      !hasBypassedInterception &&
      !transactionToEdit &&
      type === 'EXPENSE' &&
      mindfulTag === 'WANT' &&
      numAmount >= interceptionThreshold
    ) {
      setIsInterceptionModalOpen(true);
      return;
    }

    const activeCategories = safeCategories.filter((c) => !c.isDeleted);
    const activeCategory = activeCategories.find((c) => c.id === selectedCategoryId);
    const finalDesc = description.trim() || activeCategory?.name || (type === 'EXPENSE' ? 'Expense' : 'Income');

    // Convert local datetime input back to UTC ISO 8601 string (Timezone Hygiene Directive)
    let finalUtcDate = new Date().toISOString();
    if (dateStr) {
      try {
        finalUtcDate = new Date(dateStr).toISOString();
      } catch {
        finalUtcDate = new Date().toISOString();
      }
    }

    setIsSubmitting(true);
    try {
      if (transactionToEdit) {
        // UPDATE Existing Transaction
        await updateLocalTransaction(transactionToEdit.id, {
          categoryId: selectedCategoryId || transactionToEdit.categoryId,
          amount: numAmount,
          type,
          description: finalDesc,
          date: finalUtcDate,
          mindfulTag,
          emotionalMood,
          notes: notes.trim() || undefined,
          isComfortFund: type === 'EXPENSE' ? isComfortFund : false,
          costPerUse,
          estimatedUses,
        });
      } else {
        // CREATE New Transaction
        await createLocalTransaction({
          userId,
          categoryId: selectedCategoryId || (activeCategories[0]?.id ?? 'default'),
          amount: numAmount,
          type,
          description: finalDesc,
          date: finalUtcDate,
          mindfulTag,
          emotionalMood,
          notes: notes.trim() || undefined,
          isComfortFund: type === 'EXPENSE' ? isComfortFund : false,
          costPerUse,
          estimatedUses,
          queueStatus: 'ACTIVE',
        });
      }

      soundFx.playCoinSound();
      haptics.lightTap();

      // Trigger background sync without blocking UI
      syncEngine.sync().catch((err) => {
        console.log('Background sync push scheduled:', err.message);
      });

      onClose();
    } catch (err) {
      console.error('Failed to write transaction in Dexie:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategories = safeCategories.filter((c) => !c.isDeleted);
  const activeCategory = activeCategories.find((c) => c.id === selectedCategoryId);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop click with fade transition */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs cursor-pointer"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-2xl max-h-[92vh] overflow-y-auto z-10 text-slate-100"
          >
          {/* Top handle bar for mobile */}
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex p-0.5 rounded-xl bg-slate-800 border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setType('EXPENSE')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    type === 'EXPENSE'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Expense</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('INCOME')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    type === 'INCOME'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Income</span>
                </button>
              </div>

              {transactionToEdit && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Editing
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Amount Numeric Display */}
            <div className="relative text-center py-2">
              <div className="text-xs text-slate-400 uppercase font-mono tracking-wider font-semibold mb-1">
                {transactionToEdit ? 'Adjust Amount' : 'Enter Amount'}
              </div>
              <div className="inline-flex items-center justify-center">
                <span className="text-2xl sm:text-3xl font-bold text-slate-400 mr-1.5">{symbol}</span>
                <input
                  ref={amountInputRef}
                  type="number"
                  step={config.decimals === 0 ? '1' : '0.01'}
                  inputMode={config.decimals === 0 ? 'numeric' : 'decimal'}
                  placeholder={config.decimals === 0 ? '0' : '0.00'}
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-48 sm:w-56 text-4xl sm:text-5xl font-extrabold text-white text-center bg-transparent border-b-2 border-transparent focus:border-blue-500 focus:outline-hidden transition-all placeholder-slate-700"
                  required
                />
              </div>

              {/* Quick Amount Buttons for frictionless logging */}
              <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                {quickAddPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleQuickAddAmount(preset.value)}
                    className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 text-xs font-medium font-mono transition cursor-pointer active:scale-95"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Description / Memo
              </label>
              <input
                type="text"
                placeholder="What was this for? (e.g. Avocado Toast)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Category Selector Chips */}
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2">Lifestyle Tag</div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none touch-scroll-x">
                {activeCategories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        haptics.selectionTick();
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-slate-800 text-white border-blue-500 shadow-xs shadow-blue-500/20 ring-1 ring-blue-500/30'
                          : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-sm">{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & Optional Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Date & Time</span>
                </label>
                <input
                  type="datetime-local"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Notes (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Additional context or receipts"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {/* Mindful Spending Friction & Intent (Only for Expenses) */}
            {type === 'EXPENSE' && (
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Mindful Intent</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMindfulCheck(!showMindfulCheck)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    {showMindfulCheck ? 'Hide Reflection' : 'Pause & Reflect'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {MINDFUL_TAGS.map((tagItem) => {
                    const isSelected = mindfulTag === tagItem.tag;
                    return (
                      <button
                        key={tagItem.tag}
                        type="button"
                        onClick={() => {
                          setMindfulTag(tagItem.tag);
                          if (tagItem.tag === 'WANT') {
                            haptics.mindfulFriction();
                          } else {
                            haptics.selectionTick();
                          }
                        }}
                        className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500/50 text-white'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-base">{tagItem.emoji}</span>
                        <div>
                          <div className="text-xs font-semibold">{tagItem.label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {showMindfulCheck && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2.5 pt-2.5 border-t border-slate-700/60 text-xs text-slate-400 flex items-start gap-2"
                  >
                    <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>
                      Will this purchase still bring you joy or utility 7 days from now?
                    </span>
                  </motion.div>
                )}
              </div>
            )}

            {/* 1-Tap Emotional Check-In (Mood Tagging) */}
            {type === 'EXPENSE' && (
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Smile className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Emotional Check-In</span>
                  </div>
                  {emotionalMood && (
                    <button
                      type="button"
                      onClick={() => setEmotionalMood(undefined)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {(Object.keys(EMOTIONAL_MOOD_CONFIG) as EmotionalMood[]).map((moodKey) => {
                    const cfg = EMOTIONAL_MOOD_CONFIG[moodKey];
                    const isSelected = emotionalMood === moodKey;
                    return (
                      <button
                        key={moodKey}
                        type="button"
                        onClick={() => {
                          soundFx.playCoinSound();
                          haptics.lightTap();
                          setEmotionalMood(isSelected ? undefined : moodKey);
                        }}
                        className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-sm'
                            : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-200'
                        }`}
                        title={cfg.cue}
                      >
                        <span className="text-lg">{cfg.emoji}</span>
                        <span className="text-[10px] font-bold leading-tight truncate w-full">
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Phase 2 Behavioral Guardrails Action Row (Only for Expenses) */}
            {type === 'EXPENSE' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400">Behavioral Guardrails</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Cost-Per-Use Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsCostPerUseModalOpen(true)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      costPerUse
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="text-xs font-bold">Cost-Per-Use</div>
                        <div className="text-[10px] text-slate-400">
                          {costPerUse
                            ? `${format(costPerUse)}/use (${estimatedUses}x)`
                            : 'Calculate item ROI'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-700/60 text-slate-300">
                      {costPerUse ? 'APPLIED' : 'TEST'}
                    </span>
                  </button>

                  {/* Comfort Fund Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!comfortFundUnlocked && onUnlockComfortFund) {
                        onUnlockComfortFund();
                      }
                      setIsComfortFund(!isComfortFund);
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      isComfortFund
                        ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <HeartHandshake className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="text-xs font-bold">The Comfort Fund</div>
                        <div className="text-[10px] text-slate-400">
                          {format(comfortFundRemaining)} remaining
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        isComfortFund
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-700/60 text-slate-400'
                      }`}
                    >
                      {isComfortFund ? 'ACTIVE' : 'OFF'}
                    </span>
                  </button>
                </div>

                {/* Direct Send to Cooling-Off Queue */}
                <button
                  type="button"
                  onClick={() => handleSendToCoolingOff(24)}
                  disabled={isSubmitting}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/20 hover:from-amber-500/20 hover:to-amber-600/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hold in The Cooling-Off Queue (24h)</span>
                </button>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Saving...'
                  : transactionToEdit
                  ? 'Update Transaction'
                  : isComfortFund
                  ? 'Log with Comfort Fund'
                  : `Log ${type === 'EXPENSE' ? 'Expense' : 'Income'}`}
              </span>
            </button>
          </form>

          {/* Cost-Per-Use Visualizer Modal */}
          <CostPerUseVisualizerModal
            isOpen={isCostPerUseModalOpen}
            onClose={() => setIsCostPerUseModalOpen(false)}
            initialAmount={parseFloat(amountStr) || 150}
            initialDescription={description.trim() || activeCategory?.name || 'Item'}
            onApplyCalculation={(cpu, uses) => {
              setCostPerUse(cpu);
              setEstimatedUses(uses);
            }}
            onSendToCoolingOff={(coolingHours, cpu, uses) => {
              handleSendToCoolingOff(coolingHours, cpu, uses);
            }}
          />

          {/* Behavioral Interception Modal */}
          <BehavioralInterceptionModal
            isOpen={isInterceptionModalOpen}
            onClose={() => setIsInterceptionModalOpen(false)}
            amount={parseFloat(amountStr) || 0}
            description={description.trim() || activeCategory?.name || 'Impulse Want'}
            categoryName={activeCategory?.name || 'Lifestyle'}
            categoryIcon={activeCategory?.icon || '✨'}
            comfortFundRemaining={comfortFundRemaining}
            onConfirmCoolingOff={(hours) => {
              handleSendToCoolingOff(hours);
            }}
            onOpenCostPerUse={() => {
              setIsCostPerUseModalOpen(true);
            }}
            onUseComfortFund={() => {
              setIsComfortFund(true);
              setHasBypassedInterception(true);
            }}
            onProceedAnyway={() => {
              setHasBypassedInterception(true);
              handleSubmit(undefined, true);
            }}
          />
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
