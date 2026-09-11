"use client";

import React from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';

interface FABProps {
  onClick: () => void;
}

export const FAB: React.FC<FABProps> = ({ onClick }) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 280 }}
      className="hidden sm:block fixed sm:bottom-6 sm:right-6 z-40"
    >
      <button
        id="quick-add-fab-btn"
        type="button"
        onClick={onClick}
        className="group relative flex items-center gap-2 px-4 py-3 sm:pl-4 sm:pr-5 sm:py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-950/80 border border-blue-400/40 transition-all cursor-pointer hover:scale-105 active:scale-95 touch-manipulation"
        aria-label="Quick Add Transaction"
      >
        {/* Subtle glowing ring */}
        <span className="absolute -inset-1 rounded-full bg-blue-500/25 blur-sm group-hover:bg-blue-500/40 transition-all pointer-events-none" />
        <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-200 shrink-0" />
        <span className="tracking-tight whitespace-nowrap">Log Expense</span>
      </button>
    </motion.div>
  );
};
