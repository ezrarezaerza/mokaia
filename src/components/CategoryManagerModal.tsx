"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Edit2, Trash2, Check, Tag } from 'lucide-react';
import { createLocalCategory, updateLocalCategory, deleteLocalCategory } from '../lib/db';
import type { LocalCategory } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  categories: LocalCategory[];
}

const EMOJI_PRESETS = ['🥑', '☕', '🍔', '🛍️', '💻', '🎮', '🍿', '🧘', '🚇', '🏠', '✈️', '📚', '⚡', '💊', '🎁', '💈', '🐾', '🎨', '🎵', '🌿'];
const COLOR_PRESETS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#14b8a6', '#64748b', '#f97316'];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  userId,
  categories = [],
}) => {
  const { language } = useTranslation();
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏷️');
  const [color, setColor] = useState('#3b82f6');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const safeCategories = Array.isArray(categories) ? categories : [];
  const activeCategories = safeCategories.filter((c) => !c.isDeleted);

  const resetForm = () => {
    setName('');
    setIcon('🏷️');
    setColor('#3b82f6');
    setEditingCatId(null);
    setIsFormOpen(false);
    setError(null);
  };

  const handleStartEdit = (cat: LocalCategory) => {
    setEditingCatId(cat.id);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setIsFormOpen(true);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(language === 'id' ? 'Nama kategori wajib diisi.' : 'Category name is required.');
      return;
    }

    try {
      if (editingCatId) {
        await updateLocalCategory(editingCatId, {
          name: name.trim(),
          icon,
          color,
        });
      } else {
        await createLocalCategory({
          userId,
          name: name.trim(),
          icon,
          color,
        });
      }
      resetForm();
    } catch (err: any) {
      setError(err.message || (language === 'id' ? 'Gagal menyimpan kategori' : 'Failed to save category'));
    }
  };

  const handleDelete = async (id: string, isCustom: boolean) => {
    const confirmMsg = language === 'id'
      ? 'Apakah Anda yakin ingin menghapus tag gaya hidup ini? Tag ini akan dihapus di semua perangkat Anda.'
      : 'Are you sure you want to delete this lifestyle tag? It will be removed across your devices.';
    if (!confirm(confirmMsg)) {
      return;
    }
    await deleteLocalCategory(id);
    if (editingCatId === id) {
      resetForm();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
          />

          <motion.div
            initial={isMobile ? { y: '100%', opacity: 0.5 } : { scale: 0.95, y: 16, opacity: 0 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%', opacity: 0 } : { scale: 0.95, y: 16, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden z-10 text-slate-100 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            {/* Top grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Pinned Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {language === 'id' ? 'Tag Gaya Hidup Kustom' : 'Custom Lifestyle Tags'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    {language === 'id' ? 'Penanda Kebiasaan Belanja Berbasis Emoji' : 'Emoji-Driven Spending Habit Markers'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {/* New / Edit Form */}
              {isFormOpen && (
                <form onSubmit={handleSave} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {editingCatId
                        ? (language === 'id' ? 'Edit Tag Gaya Hidup' : 'Edit Lifestyle Tag')
                        : (language === 'id' ? 'Buat Tag Gaya Hidup Kustom' : 'Create Custom Lifestyle Tag')}
                    </span>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      {language === 'id' ? 'Batal' : 'Cancel'}
                    </button>
                  </div>

                  {error && (
                    <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {language === 'id' ? 'Nama Tag' : 'Tag Name'}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={language === 'id' ? 'cth. Kopi Spesialti, Toko Barang Bekas' : 'e.g. Specialty Coffee, Thrift Stores'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                      maxLength={30}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {language === 'id' ? 'Pilih Ikon Emoji' : 'Choose Icon Emoji'}
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap bg-slate-900/60 p-2 rounded-xl border border-slate-700/40">
                      {EMOJI_PRESETS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setIcon(em)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition cursor-pointer ${
                            icon === em
                              ? 'bg-blue-600 shadow-sm scale-110'
                              : 'hover:bg-slate-700'
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {language === 'id' ? 'Warna Aksen Lencana' : 'Badge Accent Color'}
                    </label>
                    <div className="flex items-center gap-2 flex-wrap bg-slate-900/60 p-2 rounded-xl border border-slate-700/40">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full transition cursor-pointer flex items-center justify-center ${
                            color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''
                          }`}
                        >
                          {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      {language === 'id' ? 'Batal' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
                    >
                      {editingCatId
                        ? (language === 'id' ? 'Perbarui Tag' : 'Update Tag')
                        : (language === 'id' ? 'Simpan Tag' : 'Save Tag')}
                    </button>
                  </div>
                </form>
              )}

              {/* Tag List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>{language === 'id' ? 'Tag Aktif' : 'Active Tags'} ({activeCategories.length})</span>
                  <span className="text-[10px] text-slate-500">{language === 'id' ? 'Tersimpan di Perangkat' : 'Saved on Device'}</span>
                </div>

                <div className="space-y-1.5">
                  {activeCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-2.5 sm:p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 shadow-sm"
                          style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                        >
                          {cat.icon}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-slate-200 block truncate">
                            {cat.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {cat.isCustom
                              ? (language === 'id' ? 'Tag kustom' : 'Custom tag')
                              : (language === 'id' ? 'Bawaan standar' : 'Preset default')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                          title={language === 'id' ? 'Edit Tag Gaya Hidup' : 'Edit Lifestyle Tag'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.id, cat.isCustom)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title={language === 'id' ? 'Hapus Tag Gaya Hidup' : 'Delete Lifestyle Tag'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pinned Footer Toolbar */}
            {!isFormOpen && (
              <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsFormOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'id' ? 'Buat Tag Gaya Hidup Baru' : 'Create New Lifestyle Tag'}</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
