import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2,
  Download,
  Copy,
  Sparkles,
  Flame,
  Shield,
  CheckCircle2,
  Trophy,
  Target,
  Package,
  Layers,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import type { LocalUser, MilestoneShareCardData, LocalTimelineFund, LocalVaultItem } from '../types';
import { getLevelFromExp, getRankForLevel } from '../lib/gamification';

interface MilestoneShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: LocalUser | null;
  defaultType?: 'STREAK' | 'IMPULSE_RESISTED' | 'RANK_UP' | 'FUND_COMPLETED' | 'VAULT_ITEM';
  extraData?: {
    fund?: LocalTimelineFund;
    vaultItem?: LocalVaultItem;
    savedAmount?: number;
    streak?: number;
  };
}

export function MilestoneShareModal({
  isOpen,
  onClose,
  user,
  defaultType = 'STREAK',
  extraData,
}: MilestoneShareModalProps) {
  const [cardType, setCardType] = useState<
    'STREAK' | 'IMPULSE_RESISTED' | 'RANK_UP' | 'FUND_COMPLETED' | 'VAULT_ITEM'
  >(defaultType);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const cardRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const userLevel = getLevelFromExp(user.exp ?? 0);
  const rankInfo = getRankForLevel(userLevel);
  const mascotName = user.mascotName || 'Mochi';

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      setExportError(null);
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `financial-milestone-${cardType.toLowerCase()}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error('Failed to export share card:', err);
      setExportError('Failed to generate image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      setExportError(null);
      const blob = await toBlob(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });

      if (!blob) {
        throw new Error('Could not create image blob');
      }

      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({
            'image/png': blob,
          }),
        ]);
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 3000);
      } else {
        // Fallback: download
        handleDownload();
      }
    } catch (err: any) {
      console.error('Failed to copy card to clipboard:', err);
      setExportError('Clipboard direct copy not supported; downloading PNG instead.');
      handleDownload();
    } finally {
      setIsExporting(false);
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
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
            onClick={onClose}
          />
          <motion.div
            initial={isMobile ? { y: '100%', opacity: 0.5 } : { opacity: 0, scale: 0.94, y: 16 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-slate-900 border-t sm:border border-slate-700/80 p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            {/* Top grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 shrink-0">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">Milestone Share Cards</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    High-Resolution Visual Cards Powered by <code className="text-indigo-300">html-to-image</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin py-3">

        {/* Template Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setCardType('STREAK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              cardType === 'STREAK'
                ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Streak Heat</span>
          </button>

          <button
            type="button"
            onClick={() => setCardType('IMPULSE_RESISTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              cardType === 'IMPULSE_RESISTED'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Impulse Resisted</span>
          </button>

          <button
            type="button"
            onClick={() => setCardType('RANK_UP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              cardType === 'RANK_UP'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Rank & Level</span>
          </button>

          {extraData?.fund && (
            <button
              type="button"
              onClick={() => setCardType('FUND_COMPLETED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                cardType === 'FUND_COMPLETED'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Timeline Victory</span>
            </button>
          )}

          {extraData?.vaultItem && (
            <button
              type="button"
              onClick={() => setCardType('VAULT_ITEM')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                cardType === 'VAULT_ITEM'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Vault Item ROI</span>
            </button>
          )}
        </div>

        {exportError && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{exportError}</span>
          </div>
        )}

        {/* The Card Render Node (Captured by html-to-image) */}
        <div className="flex justify-center p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
          <div
            ref={cardRef}
            className="w-full max-w-[420px] aspect-[4/5] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between select-none shadow-2xl"
            style={{
              background:
                cardType === 'STREAK'
                  ? 'linear-gradient(145deg, #1c1917 0%, #431407 50%, #0c0a09 100%)'
                  : cardType === 'IMPULSE_RESISTED'
                  ? 'linear-gradient(145deg, #022c22 0%, #064e3b 50%, #021a14 100%)'
                  : cardType === 'RANK_UP'
                  ? 'linear-gradient(145deg, #2e1065 0%, #3b0764 50%, #090214 100%)'
                  : cardType === 'FUND_COMPLETED'
                  ? 'linear-gradient(145deg, #082f49 0%, #0c4a6e 50%, #031422 100%)'
                  : 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #020617 100%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            {/* Ambient Backlight Glows */}
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />

            {/* Top Brand Bar */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-sm">
                  💎
                </div>
                <span className="text-xs font-black tracking-wider uppercase text-white/90">
                  Mokaia
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-mono text-white/80">
                {new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>

            {/* Dynamic Center Hero Content */}
            <div className="relative z-10 my-auto text-center space-y-4 py-4">
              {cardType === 'STREAK' && (
                <>
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-orange-500/20 border-2 border-orange-500/40 flex items-center justify-center text-4xl shadow-lg shadow-orange-500/20">
                    🔥
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-mono uppercase tracking-widest text-orange-300">
                      Engagement Streak
                    </span>
                    <h2 className="text-5xl font-black text-white tracking-tight">
                      {user.currentStreak}{' '}
                      <span className="text-2xl font-bold text-orange-400">DAYS</span>
                    </h2>
                    <p className="text-xs text-white/70 max-w-xs mx-auto pt-1">
                      Conscious financial tracking without breaking the chain. Guarded by{' '}
                      <strong className="text-white">{user.graceDays ?? 1} Grace Shields</strong>.
                    </p>
                  </div>
                </>
              )}

              {cardType === 'IMPULSE_RESISTED' && (
                <>
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/20">
                    🛡️
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-mono uppercase tracking-widest text-emerald-300">
                      The Cooling-Off Queue
                    </span>
                    <h2 className="text-4xl font-black text-white tracking-tight">
                      VICTORY OVER IMPULSE
                    </h2>
                    <p className="text-xs text-emerald-200/80 max-w-xs mx-auto pt-1">
                      Waited 48 hours and rejected the urge to spend impulsively. Future wealth
                      protected!
                    </p>
                  </div>
                </>
              )}

              {cardType === 'RANK_UP' && (
                <>
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-purple-500/20 border-2 border-purple-500/40 flex items-center justify-center text-4xl shadow-lg shadow-purple-500/20">
                    👑
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-mono uppercase tracking-widest text-purple-300">
                      Progression Unlocked
                    </span>
                    <h2 className="text-3xl font-black text-white tracking-tight uppercase">
                      LEVEL {userLevel} • {rankInfo.name}
                    </h2>
                    <p className="text-xs text-purple-200/80 max-w-xs mx-auto pt-1">
                      {user.exp} Total EXP earned through positive financial habits and mindful
                      discipline.
                    </p>
                  </div>
                </>
              )}

              {cardType === 'FUND_COMPLETED' && extraData?.fund && (
                <>
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-sky-500/20 border-2 border-sky-500/40 flex items-center justify-center text-4xl shadow-lg shadow-sky-500/20">
                    {extraData.fund.icon || '🎯'}
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-mono uppercase tracking-widest text-sky-300">
                      Timeline Fund Achieved
                    </span>
                    <h2 className="text-3xl font-black text-white tracking-tight">
                      {extraData.fund.title}
                    </h2>
                    <p className="text-2xl font-mono font-black text-sky-400">
                      ${extraData.fund.targetAmount.toFixed(2)} Fully Funded
                    </p>
                    <p className="text-xs text-sky-200/80 max-w-xs mx-auto">
                      100% guilt-free spending milestone reached right on schedule!
                    </p>
                  </div>
                </>
              )}

              {cardType === 'VAULT_ITEM' && extraData?.vaultItem && (
                <>
                  <div className="relative w-24 h-24 mx-auto rounded-2xl overflow-hidden border-2 border-cyan-400/40 shadow-xl">
                    <img
                      src={extraData.vaultItem.photoUrl}
                      alt={extraData.vaultItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-mono uppercase tracking-widest text-cyan-300">
                      The Collection Vault ROI
                    </span>
                    <h2 className="text-2xl font-black text-white tracking-tight truncate">
                      {extraData.vaultItem.name}
                    </h2>
                    <div className="flex items-center justify-center gap-3 font-mono">
                      <span className="text-sm text-white/70">
                        {extraData.vaultItem.currentUses} uses
                      </span>
                      <span className="text-base font-black text-cyan-400">
                        ${extraData.vaultItem.costPerUse?.toFixed(2) ?? '0.00'}/use
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Mascot & Proof Stamp */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center text-sm">
                  {user.mascotAvatarUrl ? (
                    <img
                      src={user.mascotAvatarUrl}
                      alt={mascotName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>🐱</span>
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-bold block">{user.username}</span>
                  <span className="text-[10px] text-white/60 font-mono">
                    Companion: {mascotName}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-mono tracking-wider uppercase text-white/50 block">
                  Zero Guilt • Gen Z Finance
                </span>
                <span className="text-[10px] font-bold text-white/80">#Mokaia</span>
              </div>
            </div>
          </div>
        </div>
      </div>

          {/* Pinned Action Buttons Footer */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-3 border-t border-slate-800 bg-slate-900 shrink-0">
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isExporting}
              className="w-full sm:flex-1 py-2.5 sm:py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {copiedNotification ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-300" />
                  <span>Copy to Clipboard</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="w-full sm:flex-1 py-2.5 sm:py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-indigo-500/20 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                  <span>Generating High-Res PNG...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Share Card (PNG)</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
