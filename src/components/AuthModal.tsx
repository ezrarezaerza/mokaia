"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Sparkles, ArrowRight, ShieldCheck, WifiOff } from 'lucide-react';
import { AuthService } from '../lib/auth';
import type { LocalUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  isOffline: boolean;
  onSuccess: (user: LocalUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, isOffline, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('demo@expensetracker.app');
  const [username, setUsername] = useState('Alex');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isRegister) {
        if (!username.trim()) throw new Error('Username is required.');
        if (!email.trim() || !email.includes('@')) throw new Error('Valid email is required.');
        if (password.length < 4) throw new Error('Password must be at least 4 characters.');
        
        const { user } = await AuthService.register({
          username,
          email,
          password,
        });
        onSuccess(user);
      } else {
        if (!email.trim()) throw new Error('Please enter your email.');
        const { user } = await AuthService.login({ email, password });
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setIsLoading(true);
    try {
      const { user } = await AuthService.login({
        email: 'alex@expensetracker.app',
        password: 'demo_password',
      });
      onSuccess(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
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
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
          />

          <motion.div
            initial={isMobile ? { y: '100%', opacity: 0.5 } : { opacity: 0, scale: 0.95, y: 16 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden text-slate-100 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            {/* Top grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Ambient glows */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Scrollable Body */}
            <div className="p-5 sm:p-7 flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {/* Header */}
              <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-2.5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {isRegister ? 'Create Your Account' : 'Welcome Back'}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                  Offline-first ledger with instant zero-latency logging
                </p>
                {isOffline && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Offline Mode Active • Saved on Device</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {isRegister && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. Alex"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@expensetracker.app"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span>{isLoading ? 'Authenticating...' : isRegister ? 'Register & Start' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Quick Demo Access */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleQuickDemo}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-700/60"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Instant Guest Mode (Alex)</span>
                </button>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(!isRegister);
                      setError(null);
                    }}
                    className="text-xs text-slate-400 hover:text-blue-400 transition cursor-pointer"
                  >
                    {isRegister
                      ? 'Already have an account? Sign in'
                      : "Don't have an account? Create one"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
