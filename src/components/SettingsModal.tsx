"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  Cloud,
  CloudOff,
  RefreshCw,
  Wifi,
  WifiOff,
  Tag,
  Palette,
  Calculator,
  Share2,
  Download,
  LogOut,
  X,
  CheckCircle2,
  Shield,
  Clock,
  Sparkles,
  Database,
  ExternalLink,
  Volume2,
  VolumeX,
  Smartphone,
  Coins,
  Globe,
} from 'lucide-react';
import type { LocalUser } from '../types';
import type { SyncEngineStatus } from '../lib/syncEngine';
import { exportLocalDatabaseToJson } from '../lib/db';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';
import { useCurrency } from '../context/CurrencyContext';
import { CURRENCIES, CurrencyCode } from '../lib/currency';
import { useTranslation } from '../context/LanguageContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: LocalUser | null;
  syncStatus: SyncEngineStatus;
  onTriggerSync: () => void;
  onToggleSimulatedOffline: (simulated: boolean) => void;
  onOpenCategories: () => void;
  onOpenCostPerUse?: () => void;
  onOpenShareCard?: () => void;
  onOpenThemes?: () => void;
  onLogout: () => void;
  transactionsCount?: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  syncStatus,
  onTriggerSync,
  onToggleSimulatedOffline,
  onOpenCategories,
  onOpenCostPerUse,
  onOpenShareCard,
  onOpenThemes,
  onLogout,
  transactionsCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'SYNC' | 'DATA'>('GENERAL');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundFx.isEnabled());
  const [hapticsEnabled, setHapticsEnabled] = useState(haptics.isEnabled());
  const { currency, setCurrency, format } = useCurrency();
  const { t, language, setLanguage, formatDateTime } = useTranslation();

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return language === 'id' ? 'Belum pernah disinkronkan' : 'Never synced in this session';
    try {
      const date = new Date(isoString);
      return formatDateTime(date);
    } catch {
      return isoString;
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      const jsonString = await exportLocalDatabaseToJson();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mokaia-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to export database backup:', err);
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
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            onClick={onClose}
          />
          <motion.div
            initial={isMobile ? { y: '100%', opacity: 0.5 } : { scale: 0.95, y: 16, opacity: 0 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%', opacity: 0 } : { scale: 0.95, y: 16, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            {/* Top grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  {t('settings.title')}
                </h2>
                <p className="text-xs text-slate-400">
                  {t('settings.subtitle')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close Settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex border-b border-slate-800 px-5 pt-2 gap-2 bg-slate-950/40">
            <button
              type="button"
              onClick={() => setActiveTab('GENERAL')}
              className={`pb-3 px-3 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'GENERAL'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('settings.tabGeneral')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SYNC')}
              className={`pb-3 px-3 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'SYNC'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('settings.tabSync')}</span>
              {syncStatus.pendingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {syncStatus.pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DATA')}
              className={`pb-3 px-3 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'DATA'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('settings.tabData')}</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* TAB 1: GENERAL & TOOLS */}
            {activeTab === 'GENERAL' && (
              <div className="space-y-4">
                {/* Account Identity Card */}
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {user?.username ? user.username.charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {user?.username || 'Active User'}
                        </span>
                        {user?.level && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Level {user.level}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {user?.email || 'Offline-first Local Profile'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Language & Localization Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      <span>{t('settings.language')}</span>
                    </label>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      {language === 'id' ? 'Bahasa Indonesia (ID)' : 'English (US)'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playTickSound();
                          setLanguage('id');
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          language === 'id'
                            ? 'bg-blue-500/15 border-blue-500/50 text-white shadow-sm ring-1 ring-blue-500/30'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">🇮🇩</span>
                          <div>
                            <div className="text-xs font-bold text-white">Bahasa Indonesia</div>
                            <div className="text-[10px] text-slate-400">Default & Lokal</div>
                          </div>
                        </div>
                        {language === 'id' && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playTickSound();
                          setLanguage('en');
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          language === 'en'
                            ? 'bg-blue-500/15 border-blue-500/50 text-white shadow-sm ring-1 ring-blue-500/30'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">🇺🇸</span>
                          <div>
                            <div className="text-xs font-bold text-white">English</div>
                            <div className="text-[10px] text-slate-400">International</div>
                          </div>
                        </div>
                        {language === 'en' && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed pt-0.5">
                      {language === 'id'
                        ? 'Format tanggal, pesan pendamping (Mascot), dan navigasi disesuaikan otomatis secara offline.'
                        : 'Dates, companion mascot reflections, and all interface text adapt instantly offline.'}
                    </p>
                  </div>
                </div>

                {/* Currency & Regional Formatting Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>Currency & Number Formatting</span>
                    </label>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Active: {currency} ({CURRENCIES[currency]?.symbol})
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-3">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-700/40">
                      <span className="text-slate-400">Live Format Preview</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700">
                          {format(150000)}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          (Compact: {format(1500000, { compact: true })})
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
                        const item = CURRENCIES[code];
                        const isSelected = currency === code;
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              soundFx.playTickSound();
                              setCurrency(code);
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                              isSelected
                                ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm ring-1 ring-amber-500/30'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-850'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-base">{item.flag}</span>
                              <span className="text-xs font-mono font-bold text-slate-200">
                                {item.symbol}
                              </span>
                            </div>
                            <div className="mt-1.5">
                              <div className="text-xs font-bold text-white flex items-center justify-between">
                                <span>{item.code}</span>
                                {isSelected && (
                                  <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {item.nativeName}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                      Values are preserved and re-labeled to your chosen currency format without altering your historical records.
                    </p>
                  </div>
                </div>

                {/* Mindful Tools & Configuration */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-1">
                    Financial & Mindful Tools
                  </label>

                  {/* Custom Lifestyle Tags */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCategories();
                    }}
                    className="w-full text-left p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between hover:bg-slate-800/70 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          Lifestyle Tags & Categories
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Create custom spending tags with personalized icons
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-indigo-400 font-semibold">Manage</span>
                  </button>

                  {/* Themes */}
                  {onOpenThemes && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenThemes();
                      }}
                      className="w-full text-left p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between hover:bg-slate-800/70 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                          <Palette className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            Unlockable Themes & Palettes
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Switch app theme aesthetics earned through level progression
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-purple-400 font-semibold">Customize</span>
                    </button>
                  )}

                  {/* Cost-Per-Use Visualizer */}
                  {onOpenCostPerUse && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCostPerUse();
                      }}
                      className="w-full text-left p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between hover:bg-slate-800/70 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                          <Calculator className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            Cost-Per-Use Visualizer
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Calculate true value per use before making high-ticket buys
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-sky-400 font-semibold">Calculate</span>
                    </button>
                  )}

                  {/* Milestone Share Card */}
                  {onOpenShareCard && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenShareCard();
                      }}
                      className="w-full text-left p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between hover:bg-slate-800/70 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                          <Share2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            Milestone Share Card Generator
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Export aesthetic graphic cards to share financial wins
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-indigo-400 font-semibold">Generate</span>
                    </button>
                  )}
                </div>

                {/* Tactile & Sensory Feedback Controls */}
                <div className="space-y-2 pt-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-1">
                    Sensory & Tactile Feedback
                  </label>

                  {/* Sound FX Toggle */}
                  <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${soundEnabled ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          Synthesized Sound Effects
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Sound effects for spins, rewards, and milestones
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {soundEnabled && (
                        <button
                          type="button"
                          onClick={() => soundFx.playCoinSound()}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 text-[10px] font-mono font-bold hover:bg-slate-700 transition cursor-pointer"
                        >
                          Test
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const next = !soundEnabled;
                          setSoundEnabled(next);
                          soundFx.setEnabled(next);
                          if (next) soundFx.playCoinSound();
                        }}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          soundEnabled ? 'bg-amber-500' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-1 ${
                            soundEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Haptics Feedback Toggle */}
                  <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${hapticsEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          Haptic Touch Feedback
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Micro-vibration pulses on mobile devices
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hapticsEnabled && (
                        <button
                          type="button"
                          onClick={() => haptics.successPulse()}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-emerald-300 text-[10px] font-mono font-bold hover:bg-slate-700 transition cursor-pointer"
                        >
                          Test
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const next = !hapticsEnabled;
                          setHapticsEnabled(next);
                          haptics.setEnabled(next);
                          if (next) haptics.successPulse();
                        }}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          hapticsEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-1 ${
                            hapticsEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SYNC & CLOUD */}
            {activeTab === 'SYNC' && (
              <div className="space-y-4">
                {/* Real-Time Sync Status Overview */}
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-xl ${
                          syncStatus.isOnline && !syncStatus.isSimulatedOffline
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {syncStatus.isOnline && !syncStatus.isSimulatedOffline ? (
                          <Cloud className="w-5 h-5" />
                        ) : (
                          <CloudOff className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">
                          {syncStatus.isOnline && !syncStatus.isSimulatedOffline
                            ? 'Cloud Synchronization Active'
                            : 'Offline Mode Active'}
                        </div>
                        <p className="text-xs text-slate-400">
                          {syncStatus.isOnline && !syncStatus.isSimulatedOffline
                            ? 'Your data is securely synchronized with the cloud'
                            : 'Saved safely to your device, ready to sync when back online'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/50 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                        Last Cloud Sync
                      </span>
                      <span className="font-mono text-slate-200 mt-0.5 block text-[11px]">
                        {formatLastSync(syncStatus.lastSyncTime)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                        Queued for Sync
                      </span>
                      <span className="font-mono text-slate-200 mt-0.5 block text-[11px]">
                        {syncStatus.pendingCount === 0
                          ? 'Zero pending (Up-to-date)'
                          : `${syncStatus.pendingCount} record(s) queued`}
                      </span>
                    </div>
                  </div>

                  {/* Manual Sync Trigger Button */}
                  <button
                    type="button"
                    onClick={onTriggerSync}
                    disabled={syncStatus.isSyncing || !syncStatus.isOnline || syncStatus.isSimulatedOffline}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`}
                    />
                    <span>
                      {syncStatus.isSyncing
                        ? 'Synchronizing Local Records...'
                        : 'Sync with Cloud Now'}
                    </span>
                  </button>
                </div>

                {/* Simulated Offline Mode Switch */}
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                        {syncStatus.isSimulatedOffline ? (
                          <WifiOff className="w-4 h-4" />
                        ) : (
                          <Wifi className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          Simulated Offline Mode
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Simulate being offline to test local entries and automatic sync
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleSimulatedOffline(!syncStatus.isSimulatedOffline)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        syncStatus.isSimulatedOffline ? 'bg-amber-500' : 'bg-slate-700'
                      }`}
                      role="switch"
                      aria-checked={syncStatus.isSimulatedOffline}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          syncStatus.isSimulatedOffline ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DATA & BACKUP */}
            {activeTab === 'DATA' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        Export Backup File
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Download a complete backup file of your spending history, funds, and achievements
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {isExporting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : exportSuccess ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>
                      {isExporting
                        ? 'Preparing Backup...'
                        : exportSuccess
                        ? 'Backup Downloaded Successfully!'
                        : 'Download Backup File (.json)'}
                    </span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-800 text-xs text-slate-400 space-y-1.5">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Local Data Privacy & Storage</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Mokaia stores your primary data securely right on your device so it is always accessible offline.
                    When connected, your entries automatically synchronize with your cloud backup.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer with Sign Out */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">
              Mokaia • Mindful Money Manager
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
