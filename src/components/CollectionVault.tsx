import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package,
  Plus,
  Sparkles,
  Camera,
  CheckCircle2,
  Trash2,
  Tag,
  DollarSign,
  TrendingDown,
  Calendar,
  Cloud,
  CloudOff,
  Search,
  ExternalLink,
  ChevronRight,
  UploadCloud,
  AlertCircle,
} from 'lucide-react';
import type { LocalVaultItem, LocalUser } from '../types';
import {
  getUserVaultItems,
  createLocalVaultItem,
  incrementVaultItemUses,
  deleteLocalVaultItem,
  compressImageViaCanvas,
} from '../lib/db';

interface CollectionVaultProps {
  user: LocalUser | null;
  onOpenShareCard?: (item: LocalVaultItem) => void;
}

export function CollectionVault({ user, onOpenShareCard }: CollectionVaultProps) {
  if (!user) return null;

  const [items, setItems] = useState<LocalVaultItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [animatingItemId, setAnimatingItemId] = useState<string | null>(null);

  // Form State for New Item
  const [name, setName] = useState<string>('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [category, setCategory] = useState<string>('Electronics');
  const [estimatedUses, setEstimatedUses] = useState<string>('100');
  const [acquisitionDate, setAcquisitionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadItems = async () => {
    try {
      setIsLoading(true);
      const data = await getUserVaultItems(user.id);
      setItems(data);
    } catch (err) {
      console.error('Failed to load collection vault items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [user.id]);

  // Handle Client-Side Canvas Compression on File Select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setFormError(null);
      setRawFile(file);

      // Compress client-side via HTML5 canvas
      const compressedDataUrl = await compressImageViaCanvas(file, 1000, 1000, 0.82);
      setPreviewImage(compressedDataUrl);
    } catch (err: any) {
      console.error('Image compression failed:', err);
      setFormError('Failed to process image. Please try a different photo.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setFormError(null);
      setRawFile(file);
      const compressedDataUrl = await compressImageViaCanvas(file, 1000, 1000, 0.82);
      setPreviewImage(compressedDataUrl);
    } catch (err) {
      setFormError('Failed to process dropped image.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Item name is required');
      return;
    }
    const priceNum = parseFloat(purchasePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('Please enter a valid positive purchase price');
      return;
    }
    if (!previewImage) {
      setFormError('Please upload a photo of the item for The Collection Vault');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      let finalPhotoUrl = previewImage;
      let blobKey: string | null = null;

      // Attempt background cloud upload to Vercel Blob if online
      if (navigator.onLine) {
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Data: previewImage,
              filename: `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.webp`,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.url && !data.url.startsWith('data:')) {
              finalPhotoUrl = data.url;
              blobKey = data.pathname || null;
            }
          }
        } catch {
          // Graceful fallback to offline local base64 in IndexedDB
        }
      }

      await createLocalVaultItem({
        userId: user.id,
        name: name.trim(),
        purchasePrice: priceNum,
        category,
        photoUrl: finalPhotoUrl,
        blobKey,
        notes: notes.trim() || undefined,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate).toISOString() : undefined,
        estimatedUses: estimatedUses ? parseInt(estimatedUses, 10) : 100,
        currentUses: 1,
      });

      // Reset form
      setName('');
      setPurchasePrice('');
      setPreviewImage(null);
      setRawFile(null);
      setNotes('');
      setIsAddModalOpen(false);
      await loadItems();
    } catch (err: any) {
      console.error('Failed to create vault item:', err);
      setFormError(err.message || 'Failed to save item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIncrementUse = async (item: LocalVaultItem) => {
    try {
      setAnimatingItemId(item.id);
      await incrementVaultItemUses(item.id);
      await loadItems();
      setTimeout(() => setAnimatingItemId(null), 600);
    } catch (err) {
      console.error('Failed to increment use:', err);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (confirm('Remove this item from your Collection Vault?')) {
      await deleteLocalVaultItem(itemId);
      await loadItems();
    }
  };

  const safeItems = Array.isArray(items) ? items : [];
  const categories = ['ALL', ...Array.from(new Set(safeItems.map((i) => i.category)))];

  const filteredItems = safeItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalVaultValue = safeItems.reduce((sum, item) => sum + item.purchasePrice, 0);
  const totalUses = safeItems.reduce((sum, item) => sum + item.currentUses, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 p-5 md:p-6 border border-indigo-500/20 shadow-xl">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Package className="w-3.5 h-3.5 text-indigo-400" />
              <span>Vercel Blob • Visual Asset Vault</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              The Collection Vault
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-xl">
              Track possessions you truly cherish. Log uses to witness your{' '}
              <strong className="text-cyan-300">Cost-Per-Use</strong> plummet toward zero.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-bold text-xs md:text-sm shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vault Item</span>
            </button>
          </div>
        </div>

        {/* Vault Macro Stats */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-[11px] font-mono uppercase text-slate-400">Total Items</span>
            <p className="text-lg font-black text-white">{items.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-[11px] font-mono uppercase text-slate-400">Vault Valuation</span>
            <p className="text-lg font-black text-indigo-300">${totalVaultValue.toFixed(2)}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-[11px] font-mono uppercase text-slate-400">Total Uses Logged</span>
            <p className="text-lg font-black text-cyan-300">{totalUses} wears/uses</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vault items by name or notes..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-xs text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 transition"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Vault Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span>Opening your Collection Vault...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-14 px-4 rounded-3xl bg-slate-800/40 border border-dashed border-slate-700 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Your Collection Vault is Empty</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add your favorite wardrobe pieces, electronics, or gear. Watch how mindful use transforms high upfront costs into pennies per day!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
          >
            Add Your First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const usesTarget = item.estimatedUses || 100;
            const progress = Math.min(100, Math.round((item.currentUses / usesTarget) * 100));
            const costPerUse = item.costPerUse ?? (item.purchasePrice / (item.currentUses || 1));
            const isLocalDataUrl = item.photoUrl.startsWith('data:');

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative rounded-3xl bg-slate-800/80 border border-slate-700/70 overflow-hidden shadow-lg hover:border-indigo-500/40 transition-all flex flex-col justify-between"
              >
                {/* Image Container with Cloud/Local Badge */}
                <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-[10px] font-bold text-indigo-300">
                      {item.category}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isLocalDataUrl ? (
                        <span
                          title="Saved on device • Will sync when connected"
                          className="px-2 py-0.5 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-[10px] font-mono text-amber-300 flex items-center gap-1"
                        >
                          <CloudOff className="w-2.5 h-2.5" />
                          <span>Offline</span>
                        </span>
                      ) : (
                        <span
                          title="Synced to Cloud"
                          className="px-2 py-0.5 rounded-full bg-cyan-500/20 backdrop-blur-md border border-cyan-500/40 text-[10px] font-mono text-cyan-300 flex items-center gap-1"
                        >
                          <Cloud className="w-2.5 h-2.5" />
                          <span>Blob CDN</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-full bg-slate-900/80 text-slate-400 hover:text-rose-400 backdrop-blur-md transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Image Overlay Details */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
                    <div className="truncate pr-2">
                      <h4 className="text-sm font-black text-white truncate drop-shadow-md">
                        {item.name}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-300">
                        Initial: ${item.purchasePrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-cyan-300 block">Cost / Use</span>
                      <span className="text-base font-black text-cyan-400 font-mono">
                        ${costPerUse.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                  {/* Progress to target uses */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>ROI Progress</span>
                      <span className="text-slate-200 font-bold">
                        {item.currentUses} / {usesTarget} uses ({progress}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-700/50">
                      <motion.div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                  </div>

                  {/* Notes snippet if present */}
                  {item.notes && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                      "{item.notes}"
                    </p>
                  )}

                  {/* Actions: Log Use & Share */}
                  <div className="pt-2 border-t border-slate-700/50 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleIncrementUse(item)}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        animatingItemId === item.id
                          ? 'bg-emerald-500 text-slate-950 scale-95'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>+1 Use Logged</span>
                    </button>

                    {onOpenShareCard && (
                      <button
                        type="button"
                        onClick={() => onOpenShareCard(item)}
                        title="Generate Milestone Share Card"
                        className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Item to Vault Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={isMobile ? { y: '100%', opacity: 0.5 } : { opacity: 0, scale: 0.95, y: 16 }}
              animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border-t sm:border border-slate-700/80 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              {/* Top grab handle for mobile */}
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

              {/* Pinned Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">Add Item to Vault</h3>
                    <p className="text-[11px] sm:text-xs text-slate-400">Client-Side Canvas Compression & Blob Upload</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {/* Form with Scrollable Body and Pinned Footer */}
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Photo Upload with Drag & Drop */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-slate-300">
                      Item Photo (Compressed Locally) *
                    </label>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[140px] ${
                        previewImage
                          ? 'border-indigo-500/60 bg-slate-950'
                          : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      {isCompressing ? (
                        <div className="flex flex-col items-center gap-2 text-indigo-300 text-xs">
                          <div className="w-6 h-6 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                          <span>Compressing image on canvas...</span>
                        </div>
                      ) : previewImage ? (
                        <div className="relative w-full h-36 rounded-xl overflow-hidden group">
                          <img
                            src={previewImage}
                            alt="Preview"
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-semibold text-white">
                            Click or drop to replace photo
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 text-slate-400">
                          <UploadCloud className="w-8 h-8 mx-auto text-indigo-400" />
                          <p className="text-xs font-semibold text-slate-200">
                            Click to select or drag & drop photo
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Auto-compressed client-side for zero-latency offline storage
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Item Name & Purchase Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-slate-300">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sony WH-1000XM5"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-slate-300">
                        Purchase Price ($) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="399.99"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Category & Estimated Uses */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-slate-300">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                      >
                        <option value="Electronics">Electronics & Tech</option>
                        <option value="Wardrobe">Wardrobe & Fashion</option>
                        <option value="Fitness">Fitness & Sports</option>
                        <option value="Home & Kitchen">Home & Kitchen</option>
                        <option value="Hobbies">Hobbies & Creative</option>
                        <option value="General">General Gear</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-slate-300">
                        Target Uses (ROI Goal)
                      </label>
                      <input
                        type="number"
                        placeholder="100"
                        value={estimatedUses}
                        onChange={(e) => setEstimatedUses(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Acquisition Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-mono uppercase text-slate-300">
                      Acquisition Date
                    </label>
                    <input
                      type="date"
                      value={acquisitionDate}
                      onChange={(e) => setAcquisitionDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-mono uppercase text-slate-300">
                      Personal Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Bought for daily focus while coding; aiming for 200 sessions"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Pinned Action Buttons Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isCompressing}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-indigo-500/20 hover:opacity-95 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Compressing & Storing...' : 'Add to Vault (+20 EXP)'}
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
