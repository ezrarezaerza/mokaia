"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Trash2,
  Edit3,
  MoreVertical,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  X,
  Check,
  ArrowDown,
  Sparkles,
  CloudOff,
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { deleteLocalTransaction } from '../lib/db';
import { syncEngine } from '../lib/syncEngine';
import type { LocalCategory, LocalTransaction, TransactionType, MindfulTag } from '../types';

interface TransactionListProps {
  transactions: LocalTransaction[];
  categories: LocalCategory[];
  onEditTransaction: (tx: LocalTransaction) => void;
}

const PAGE_SIZE = 10;

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions = [],
  categories = [],
  onEditTransaction,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedMindfulFilter, setSelectedMindfulFilter] = useState<'ALL' | MindfulTag>('ALL');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [activeMenuTxId, setActiveMenuTxId] = useState<string | null>(null);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  const categoryMap = new Map<string, LocalCategory>();
  safeCategories.forEach((cat) => {
    if (!cat.isDeleted) {
      categoryMap.set(cat.id, cat);
    }
  });

  // Filter out hard/soft tombstones that are marked isDeleted
  const activeTransactions = safeTransactions.filter((tx) => !tx.isDeleted);

  // Apply search, category, mindful tag, and type filters
  const filtered = activeTransactions.filter((tx) => {
    if (filterType !== 'ALL' && tx.type !== filterType) return false;
    if (selectedCategoryFilter !== 'ALL' && tx.categoryId !== selectedCategoryFilter) return false;
    if (selectedMindfulFilter !== 'ALL' && tx.mindfulTag !== selectedMindfulFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const cat = categoryMap.get(tx.categoryId);
      const descMatch = tx.description.toLowerCase().includes(q);
      const catMatch = cat?.name.toLowerCase().includes(q);
      const notesMatch = tx.notes?.toLowerCase().includes(q);
      if (!descMatch && !catMatch && !notesMatch) return false;
    }
    return true;
  });

  const activeFiltersCount =
    (selectedCategoryFilter !== 'ALL' ? 1 : 0) +
    (selectedMindfulFilter !== 'ALL' ? 1 : 0);
  const activeCategoryObj = selectedCategoryFilter !== 'ALL' ? categoryMap.get(selectedCategoryFilter) : null;

  // Paginated subset
  const paginatedTransactions = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  /**
   * Strict Directive 2: Tombstone Deletion Pattern (CRITICAL)
   */
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction? It will be removed across your devices.')) {
      return;
    }
    try {
      setActiveMenuTxId(null);
      await deleteLocalTransaction(id);
      syncEngine.sync().catch(() => {});
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  /**
   * Timezone Hygiene: format UTC ISO date string into user's local timezone
   */
  const formatUtcDate = (isoString: string) => {
    try {
      const date = parseISO(isoString);
      if (isToday(date)) {
        return `Today, ${format(date, 'h:mm a')}`;
      }
      if (isYesterday(date)) {
        return `Yesterday, ${format(date, 'h:mm a')}`;
      }
      return format(date, 'MMM d, yyyy • h:mm a');
    } catch {
      return 'Recent';
    }
  };

  const getMindfulBadge = (tag?: string) => {
    switch (tag) {
      case 'NEED':
        return (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 whitespace-nowrap">
            Need
          </span>
        );
      case 'WANT':
        return (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 whitespace-nowrap">
            Want
          </span>
        );
      case 'SAVING':
        return (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 whitespace-nowrap">
            Saving
          </span>
        );
      case 'INVESTMENT':
        return (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 whitespace-nowrap">
            Invest
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Consolidated Controls Bar */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search descriptions, memos, notes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="w-full pl-9 pr-8 py-2 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-start">
            {/* Type Segmented Control */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFilterType('ALL');
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterType === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({activeTransactions.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterType('EXPENSE');
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterType === 'EXPENSE'
                    ? 'bg-rose-500/25 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Outflow
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterType('INCOME');
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterType === 'INCOME'
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Inflow
              </button>
            </div>

            {/* Consolidated Filter Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  activeFiltersCount > 0 || isFilterDropdownOpen
                    ? 'bg-indigo-600/25 text-indigo-200 border-indigo-500/50 shadow-xs'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Filter</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-bold">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    isFilterDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Filter Popover Dropdown */}
              {isFilterDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsFilterDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 z-40 w-72 sm:w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Filter className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Filter Activity</span>
                      </div>
                      {activeFiltersCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategoryFilter('ALL');
                            setSelectedMindfulFilter('ALL');
                          }}
                          className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        >
                          Reset filters
                        </button>
                      )}
                    </div>

                    {/* Section 1: Categories / Lifestyle Tags */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Lifestyle Category
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategoryFilter('ALL');
                            setVisibleCount(PAGE_SIZE);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                            selectedCategoryFilter === 'ALL'
                              ? 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>All Categories</span>
                          {selectedCategoryFilter === 'ALL' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                        </button>
                        {Array.from(categoryMap.values()).map((cat) => {
                          const isSelected = selectedCategoryFilter === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setSelectedCategoryFilter(cat.id);
                                setVisibleCount(PAGE_SIZE);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30'
                                  : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span>{cat.icon}</span>
                                <span className="truncate">{cat.name}</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 2: Mindful Intent */}
                    <div className="pt-2 border-t border-slate-800">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Mindful Intent
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMindfulFilter('ALL');
                            setVisibleCount(PAGE_SIZE);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-xs text-left transition cursor-pointer ${
                            selectedMindfulFilter === 'ALL'
                              ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30'
                              : 'text-slate-300 bg-slate-800/60 hover:bg-slate-800'
                          }`}
                        >
                          All Intent
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMindfulFilter('NEED');
                            setVisibleCount(PAGE_SIZE);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-xs text-left transition cursor-pointer ${
                            selectedMindfulFilter === 'NEED'
                              ? 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30'
                              : 'text-slate-300 bg-slate-800/60 hover:bg-slate-800'
                          }`}
                        >
                          🛡️ Need
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMindfulFilter('WANT');
                            setVisibleCount(PAGE_SIZE);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-xs text-left transition cursor-pointer ${
                            selectedMindfulFilter === 'WANT'
                              ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30'
                              : 'text-slate-300 bg-slate-800/60 hover:bg-slate-800'
                          }`}
                        >
                          ✨ Want
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMindfulFilter('SAVING');
                            setVisibleCount(PAGE_SIZE);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-xs text-left transition cursor-pointer ${
                            selectedMindfulFilter === 'SAVING'
                              ? 'bg-emerald-600/20 text-emerald-300 font-bold border border-emerald-500/30'
                              : 'text-slate-300 bg-slate-800/60 hover:bg-slate-800'
                          }`}
                        >
                          🌱 Saving
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMindfulFilter('INVESTMENT');
                            setVisibleCount(PAGE_SIZE);
                          }}
                          className={`col-span-2 px-2 py-1.5 rounded-lg text-xs text-left transition cursor-pointer ${
                            selectedMindfulFilter === 'INVESTMENT'
                              ? 'bg-purple-600/20 text-purple-300 font-bold border border-purple-500/30'
                              : 'text-slate-300 bg-slate-800/60 hover:bg-slate-800'
                          }`}
                        >
                          📈 Growth / Investment
                        </button>
                      </div>
                    </div>

                    {/* Done Action */}
                    <button
                      type="button"
                      onClick={() => setIsFilterDropdownOpen(false)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Badges Strip (Single tap dismiss) */}
        {(activeFiltersCount > 0 || searchQuery) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Active filters:</span>
            {activeCategoryObj && (
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('ALL')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] hover:bg-blue-500/25 transition cursor-pointer"
                title="Remove category filter"
              >
                <span>{activeCategoryObj.icon}</span>
                <span>{activeCategoryObj.name}</span>
                <X className="w-3 h-3 text-blue-400 ml-0.5" />
              </button>
            )}
            {selectedMindfulFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedMindfulFilter('ALL')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] hover:bg-indigo-500/25 transition cursor-pointer"
                title="Remove intent filter"
              >
                <span>Intent: {selectedMindfulFilter}</span>
                <X className="w-3 h-3 text-indigo-400 ml-0.5" />
              </button>
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-700/60 border border-slate-600/60 text-slate-300 text-[11px] hover:bg-slate-700 transition cursor-pointer"
                title="Clear search query"
              >
                <span>"{searchQuery}"</span>
                <X className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryFilter('ALL');
                setSelectedMindfulFilter('ALL');
                setSearchQuery('');
              }}
              className="text-[11px] text-slate-500 hover:text-slate-300 underline cursor-pointer ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Transaction Records List */}
      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {paginatedTransactions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 px-4 rounded-3xl bg-slate-800/30 border border-dashed border-slate-700/60"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Filter className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">No transactions match filter</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                {searchQuery || filterType !== 'ALL' || selectedCategoryFilter !== 'ALL'
                  ? 'Try clearing your search query or category filter.'
                  : 'Tap the Quick-Add FAB at the bottom to log your first transaction.'}
              </p>
            </motion.div>
          ) : (
            paginatedTransactions.map((tx) => {
              const cat = categoryMap.get(tx.categoryId);
              const isExpense = tx.type === 'EXPENSE';
              const isPendingSync = tx.syncStatus === 'pending_create' || tx.syncStatus === 'pending_update';
              const isMenuOpen = activeMenuTxId === tx.id;

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-slate-600/70 transition-all shadow-xs"
                >
                  {/* Left: Category Icon & Full Description (No truncation) */}
                  <div
                    onClick={() => onEditTransaction(tx)}
                    className="flex items-start sm:items-center gap-3 min-w-0 pr-3 flex-1 cursor-pointer"
                  >
                    <div
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 border mt-0.5 sm:mt-0 transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: `${cat?.color || '#3b82f6'}18`,
                        borderColor: `${cat?.color || '#3b82f6'}35`,
                      }}
                    >
                      {cat?.icon || (isExpense ? '💸' : '💰')}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Description with full wrap & badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-blue-300 transition-colors leading-snug break-words">
                          {tx.description}
                        </span>
                        {getMindfulBadge(tx.mindfulTag)}
                        {tx.isComfortFund && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                            💖 Comfort Fund
                          </span>
                        )}
                        {tx.costPerUse && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
                            ~${tx.costPerUse.toFixed(2)}/use
                          </span>
                        )}
                        {tx.queueStatus === 'APPROVED' && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/30 whitespace-nowrap">
                            ✓ Post-Delay
                          </span>
                        )}
                      </div>

                      {/* Metadata Row: Category • Timestamp */}
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                        <span className="font-medium text-slate-300">{cat?.name || 'General'}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-[11px] text-slate-400 font-mono">{formatUtcDate(tx.date)}</span>
                        {isPendingSync && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400/90" title="Queued locally for cloud sync">
                              <CloudOff className="w-3 h-3 text-amber-400" />
                              <span>Local queue</span>
                            </span>
                          </>
                        )}
                      </div>

                      {tx.notes && (
                        <p className="text-[11px] text-slate-400/90 mt-1 italic line-clamp-2">
                          "{tx.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Prominent Amount & Subtle Contextual Actions */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-base sm:text-lg font-black font-mono tracking-tight whitespace-nowrap ${
                          isExpense ? 'text-slate-100' : 'text-emerald-400'
                        }`}
                      >
                        {isExpense ? '-' : '+'}${tx.amount.toFixed(2)}
                      </div>
                    </div>

                    {/* Subtle Actions: Desktop Hover-Reveal */}
                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        type="button"
                        onClick={() => onEditTransaction(tx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/80 transition cursor-pointer"
                        title="Edit Transaction"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Mobile Subtle Action: 3-Dot Dropdown / Popover */}
                    <div className="relative sm:hidden">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuTxId(isMenuOpen ? null : tx.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
                        aria-label="Transaction Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuTxId(null);
                            }}
                          />
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-8 z-20 w-32 py-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-100"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuTxId(null);
                                onEditTransaction(tx);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(tx.id)}
                              className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Pagination / Infinite Scroll "Load More" Control */}
      {hasMore && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={handleLoadMore}
            className="px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-slate-200 text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer shadow-sm hover:border-blue-500/40"
          >
            <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
            <span>
              Load More ({filtered.length - visibleCount} remaining)
            </span>
          </button>
        </div>
      )}

      {/* Pagination summary indicator */}
      {filtered.length > 0 && (
        <div className="text-center text-[11px] font-mono text-slate-500">
          Showing {paginatedTransactions.length} of {filtered.length} active records
        </div>
      )}
    </div>
  );
};
