"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Camera,
  Edit2,
  Clock,
  Smile,
  Flame,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import type { LocalUser, MascotEvaluationInput } from '../types';
import { getDisplayImageUrl } from '../lib/blobHelper';
import { evaluateMascotState, DEFAULT_MASCOT_PRESETS } from '../lib/mascot';
import { updateUserMascot, compressImageViaCanvas } from '../lib/db';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';
import { useTranslation } from '../context/LanguageContext';
import { MascotChatModal } from './MascotChatModal';

interface AccountabilityMascotProps {
  user: LocalUser | null;
  metrics: MascotEvaluationInput;
  onOpenCoolingOff?: () => void;
  onOpenComfortFund?: () => void;
  onOpenShareCard?: () => void;
}

export function AccountabilityMascot({
  user,
  metrics,
  onOpenCoolingOff,
  onOpenComfortFund,
  onOpenShareCard,
}: AccountabilityMascotProps) {
  if (!user) return null;

  const [isCustomizeOpen, setIsCustomizeOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [mascotNameInput, setMascotNameInput] = useState<string>(user.mascotName || 'Mochi');
  const [selectedEmojiAvatar, setSelectedEmojiAvatar] = useState<string>('🐱');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.mascotAvatarUrl || null);
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, language } = useTranslation();

  // Evaluate real-time psychological status with user personality and active language
  const mascotName = user.mascotName || 'Mochi';
  const mascotStatus = evaluateMascotState(
    mascotName,
    metrics,
    user.mascotPersonality || 'zen',
    language
  );

  const handleSaveCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserMascot(user.id, mascotNameInput, avatarPreview);
      setIsCustomizeOpen(false);
    } catch (err) {
      console.error('Failed to update mascot:', err);
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const compressedDataUrl = await compressImageViaCanvas(file, 400, 400, 0.85);
      setAvatarPreview(compressedDataUrl);

      if (navigator.onLine) {
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Data: compressedDataUrl,
              filename: `mascot-${user.id}-${Date.now()}.webp`,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.url && !data.url.startsWith('data:')) {
              setAvatarPreview(data.url);
            }
          }
        } catch {
          // offline fallback safely stored in preview state
        }
      }
    } catch (err) {
      console.error('Failed to compress avatar:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // High-contrast, WCAG AA compliant state styling
  const getStateColorClasses = () => {
    switch (mascotStatus.state) {
      case 'PROUD':
        return {
          border: 'border-emerald-500/30',
          accent: 'text-emerald-400',
          badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          bubbleBg: 'bg-slate-800/80 border-slate-700/80',
          avatarRing: 'border-emerald-500/50',
        };
      case 'CHEERING':
        return {
          border: 'border-amber-500/30',
          accent: 'text-amber-400',
          badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          bubbleBg: 'bg-slate-800/80 border-slate-700/80',
          avatarRing: 'border-amber-500/50',
        };
      case 'CONCERNED':
        return {
          border: 'border-rose-500/30',
          accent: 'text-rose-400',
          badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          bubbleBg: 'bg-slate-800/80 border-slate-700/80',
          avatarRing: 'border-rose-500/50',
        };
      case 'NEUTRAL':
      default:
        return {
          border: 'border-indigo-500/30',
          accent: 'text-indigo-400',
          badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
          bubbleBg: 'bg-slate-800/80 border-slate-700/80',
          avatarRing: 'border-indigo-500/50',
        };
    }
  };

  const styleClasses = getStateColorClasses();

  return (
    <div
      id="accountability-companion-card"
      className={`relative overflow-hidden rounded-3xl p-4 sm:p-5 border bg-slate-900/90 ${styleClasses.border} shadow-lg backdrop-blur-md transition-all`}
    >
      <div className="flex items-start sm:items-center gap-3.5">
        {/* Companion Avatar & Mood Badge */}
        <div className="relative shrink-0">
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
            className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-800 border-2 ${styleClasses.avatarRing} overflow-hidden flex items-center justify-center text-2xl sm:text-3xl shadow-md cursor-pointer group`}
            onClick={() => {
              soundFx.playMascotChirpSound();
              haptics.lightTap();
              setIsChatOpen(true);
            }}
            title={`Talk to ${mascotName}`}
          >
            {user.mascotAvatarUrl ? (
              <img
                src={getDisplayImageUrl(user.mascotAvatarUrl)}
                alt={mascotName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{selectedEmojiAvatar}</span>
            )}

            {/* Hover icon */}
            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <MessageSquare className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Expression Badge */}
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] shadow-sm cursor-pointer"
            onClick={() => setIsChatOpen(true)}
            title={`Expression: ${mascotStatus.expressionEmoji}`}
          >
            {mascotStatus.expressionEmoji}
          </div>
        </div>

        {/* Dynamic Psychological Speech Bubble */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Companion Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className="text-sm font-bold text-white tracking-tight truncate">
                {mascotName}
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${styleClasses.badgeBg}`}
              >
                {mascotStatus.badge}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Chat & Advice Button */}
              <button
                type="button"
                onClick={() => {
                  soundFx.playMascotChirpSound();
                  haptics.lightTap();
                  setIsChatOpen(true);
                }}
                className="text-indigo-300 hover:text-white px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 transition text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                title={`Chat with ${mascotName}`}
              >
                <MessageSquare className="w-3 h-3" />
                <span>Chat</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCustomizeOpen(true)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                title="Customize Mascot"
              >
                <Edit2 className="w-3 h-3" />
                <span className="hidden sm:inline">Edit</span>
              </button>

              {/* Mobile collapse / expand toggle */}
              <button
                type="button"
                onClick={() => setIsMobileExpanded(!isMobileExpanded)}
                className="sm:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Toggle mascot message details"
              >
                {isMobileExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* High-Contrast Speech Bubble */}
          <div
            className={`p-3 rounded-2xl border text-xs leading-relaxed space-y-1 ${styleClasses.bubbleBg}`}
          >
            <p className="font-semibold text-slate-100 text-xs sm:text-[13px]">
              {mascotStatus.bubbleText}
            </p>

            {/* Subtext shown always on desktop, and on mobile when expanded */}
            <p
              className={`text-[11px] text-slate-300 font-medium ${
                isMobileExpanded ? 'block' : 'hidden sm:block'
              }`}
            >
              {mascotStatus.subText}
            </p>
          </div>

          {/* Quick Interactivity Micro-bar (Only shown when applicable) */}
          <div
            className={`items-center gap-2 pt-0.5 flex-wrap ${
              isMobileExpanded ? 'flex' : 'hidden sm:flex'
            }`}
          >
            {metrics.coolingOffPendingCount > 0 && onOpenCoolingOff && (
              <button
                type="button"
                onClick={onOpenCoolingOff}
                className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Clock className="w-3 h-3" />
                <span>View {metrics.coolingOffPendingCount} in Cooling-Off</span>
              </button>
            )}

            {metrics.coolingOffRejectedCount > 0 && onOpenShareCard && (
              <button
                type="button"
                onClick={onOpenShareCard}
                className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Share Resistance Victory</span>
              </button>
            )}

            {user.currentStreak >= 3 && onOpenShareCard && (
              <button
                type="button"
                onClick={onOpenShareCard}
                className="px-2.5 py-1 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Flame className="w-3 h-3" />
                <span>Share Streak Card</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customize Mascot Modal */}
      <AnimatePresence>
        {isCustomizeOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={() => setIsCustomizeOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={isMobile ? { y: '100%', opacity: 0.5 } : { opacity: 0, scale: 0.95, y: 16 }}
              animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border-t sm:border border-slate-700/80 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden z-10 text-slate-100 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              {/* Top grab handle for mobile */}
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

              {/* Pinned Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-indigo-500/10 text-indigo-400">
                    <Smile className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Customize Companion
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-400">
                      Personalize your Accountability Companion
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomizeOpen(false)}
                  className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {/* Form with Scrollable Body and Pinned Footer */}
              <form onSubmit={handleSaveCustomization} className="flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                  {/* Avatar Preview & Upload */}
                  <div className="flex items-center gap-4">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-600 hover:border-indigo-500 flex items-center justify-center text-3xl sm:text-4xl cursor-pointer overflow-hidden group transition shrink-0"
                    >
                      {avatarPreview ? (
                        <img
                          src={getDisplayImageUrl(avatarPreview)}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{selectedEmojiAvatar}</span>
                      )}

                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-bold">
                        <Camera className="w-4 h-4 mb-0.5" />
                        <span>Upload</span>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFile}
                        className="hidden"
                      />
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-200 block">
                        Custom Avatar Photo
                      </span>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        Upload your pet, character, or picture. Works offline instantly.
                      </p>
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={() => setAvatarPreview(null)}
                          className="text-[11px] text-rose-400 hover:underline font-medium cursor-pointer"
                        >
                          Reset to default emoji
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preset Avatar Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Or Choose Companion Preset
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {DEFAULT_MASCOT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedEmojiAvatar(preset.emoji);
                            setMascotNameInput(preset.name);
                            setAvatarPreview(null);
                          }}
                          className={`p-2 rounded-2xl flex flex-col items-center gap-1 border transition cursor-pointer ${
                            selectedEmojiAvatar === preset.emoji && !avatarPreview
                              ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span className="text-xl">{preset.emoji}</span>
                          <span className="text-[10px] font-bold truncate max-w-full">
                            {preset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mascot Name Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">
                      Companion Name
                    </label>
                    <input
                      type="text"
                      required
                      value={mascotNameInput}
                      onChange={(e) => setMascotNameInput(e.target.value)}
                      placeholder="e.g. Mochi"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-bold"
                    />
                  </div>
                </div>

                {/* Pinned Action Buttons Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCustomizeOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? 'Saving...' : 'Save Companion'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mascot Interactive Chat & Mindful Pause Modal */}
      <MascotChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        user={user}
        metrics={metrics}
        onOpenCoolingOff={onOpenCoolingOff}
        onOpenComfortFund={onOpenComfortFund}
      />
    </div>
  );
}
