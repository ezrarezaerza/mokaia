"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  MessageSquare,
  Copy,
  Check,
  Sparkles,
  Users,
  ShieldCheck,
  Send,
} from 'lucide-react';
import type { LocalDebt } from '../types';
import { haptics } from '../lib/haptics';
import { soundFx } from '../lib/soundFx';
import { useCurrency } from '../context/CurrencyContext';

interface IOUReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: LocalDebt | null;
}

type ToneType = 'POLITE' | 'DIRECT' | 'GROUP';

export const IOUReminderModal: React.FC<IOUReminderModalProps> = ({
  isOpen,
  onClose,
  debt,
}) => {
  const { format: formatMoney } = useCurrency();
  const [selectedTone, setSelectedTone] = useState<ToneType>('POLITE');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !debt) return null;

  const isReceivable = debt.debtType === 'IOU_RECEIVABLE';
  const name = debt.counterpartyName || 'friend';
  const amount = formatMoney(debt.remainingBalance);
  const purpose = debt.name;

  // Curated low-awkwardness reminder templates
  const templates: Record<ToneType, { title: string; description: string; text: string }> = {
    POLITE: {
      title: 'Gentle & Warm',
      description: 'Zero guilt, friendly nudge perfect for close friends & casual splits',
      text: isReceivable
        ? `Hey ${name}! Hope your week is going great 😊 Just doing some quick monthly budgeting and noticed the ${amount} for ${purpose}. Whenever you get a chance to settle up, no rush at all! Thanks so much!`
        : `Hey ${name}! Just sent over ${amount} for ${purpose} so you don't have to worry about tracking it. Appreciate you! 🙏`,
    },
    DIRECT: {
      title: 'Clear & Direct',
      description: 'Polite, clear, and business-casual without awkward beating around the bush',
      text: isReceivable
        ? `Hey ${name}, friendly reminder regarding the ${amount} split for ${purpose}. Let me know if you need my payment details to square up. Thanks!`
        : `Hey ${name}, I've marked off our ${amount} for ${purpose} and sent the payment your way. Let me know when it clears!`,
    },
    GROUP: {
      title: 'Group Outing / Event',
      description: 'Frames the expense within the context of a shared dinner, concert, or trip',
      text: isReceivable
        ? `Hey ${name}! Had such a blast at ${purpose}! Just doing a quick reconciliation of the group expenses—your portion came out to ${amount}. Appreciate you squaring up when you can! 🎉`
        : `Hey ${name}! Thanks again for fronting the bill for ${purpose}! Just transferred my ${amount} portion over.`,
    },
  };

  const activeMessage = templates[selectedTone].text;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeMessage);
      soundFx.playCoinSound();
      haptics.selectionTick();
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs cursor-pointer"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl z-10 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Low-Awkwardness IOU Nudge</h3>
                <p className="text-xs text-slate-400">
                  {isReceivable ? `Collecting from ${name}` : `Repayment note to ${name}`}
                </p>
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

          {/* Tone Selector Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-800/70 rounded-2xl border border-slate-700/50">
            {(['POLITE', 'DIRECT', 'GROUP'] as ToneType[]).map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => {
                  haptics.selectionTick();
                  setSelectedTone(tone);
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                  selectedTone === tone
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {templates[tone].title}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-slate-400">
            {templates[selectedTone].description}
          </p>

          {/* Message Preview Box */}
          <div className="relative p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              Message Preview
            </span>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed select-all">
              &quot;{activeMessage}&quot;
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-950/40'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Message Template</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
