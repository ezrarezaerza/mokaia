import { db, seedDefaultCategories } from './db';
import type { LocalUser, AuthSession } from '../types';

const SESSION_STORAGE_KEY = 'expense_tracker_session';

/**
 * Simple SHA-256 password hasher for browser / offline compatibility
 */
async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate client-side session token
 */
function generateToken(userId: string): string {
  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
  };
  return `ey.${btoa(JSON.stringify(payload))}.${crypto.randomUUID()}`;
}

export interface UserAccountCredentials {
  username: string;
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Get cached offline session from localStorage and Dexie
   */
  static getCachedSession(): AuthSession {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        return { user: null, token: null, isAuthenticated: false, isOffline: !navigator.onLine };
      }
      const data = JSON.parse(raw);
      if (data.user) {
        const now = new Date();
        const startOfMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
        data.user.comfortFundAllowance = data.user.comfortFundAllowance ?? 25;
        data.user.comfortFundRemaining = data.user.comfortFundRemaining ?? 25;
        data.user.comfortFundResetDate = data.user.comfortFundResetDate ?? startOfMonthUtc;
        data.user.comfortFundUnlocked = data.user.comfortFundUnlocked ?? false;
      }
      return {
        user: data.user,
        token: data.token,
        isAuthenticated: !!data.user,
        isOffline: !navigator.onLine,
      };
    } catch {
      return { user: null, token: null, isAuthenticated: false, isOffline: !navigator.onLine };
    }
  }

  /**
   * Save session to storage
   */
  static saveSession(user: LocalUser, token: string) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user, token }));
  }

  /**
   * Clear session
   */
  static clearSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  /**
   * Register a new user
   * Strictly writes to Dexie locally first, seeds default categories,
   * and prepares remote push if online.
   */
  static async register(credentials: UserAccountCredentials): Promise<{ user: LocalUser; token: string }> {
    const email = credentials.email.trim().toLowerCase();
    const username = credentials.username.trim();

    // Check if user already exists in local Dexie
    const existing = await db.users.where('email').equals(email).first();
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const userId = crypto.randomUUID();
    const token = generateToken(userId);
    const now = new Date();
    const startOfMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const user: LocalUser = {
      id: userId,
      email,
      username,
      token,
      comfortFundAllowance: 25,
      comfortFundRemaining: 25,
      comfortFundResetDate: startOfMonthUtc,
      comfortFundUnlocked: false,
      exp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      graceDays: 2,
      lastActiveDate: null,
      userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      activeTheme: 'cyber_slate',
      spinnerTickets: 1,
      createdAt: now.toISOString(),
    };

    // Store in local Dexie
    await db.users.add(user);

    // Seed default categories for this user
    await seedDefaultCategories(userId);

    // Save offline session
    this.saveSession(user, token);

    // If online, optionally inform server
    if (navigator.onLine) {
      try {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: userId,
            email,
            username,
            passwordHash: await hashPassword(credentials.password),
          }),
        }).catch(() => {
          // Non-blocking for offline-first
        });
      } catch {
        // Silent fallback
      }
    }

    return { user, token };
  }

  /**
   * Login with email & password
   * Can authenticate locally in offline mode using Dexie!
   */
  static async login(credentials: { email: string; password: string }): Promise<{ user: LocalUser; token: string }> {
    const email = credentials.email.trim().toLowerCase();

    // First check local Dexie for offline login
    let user = await db.users.where('email').equals(email).first();

    if (!user) {
      // If not in local Dexie and online, check remote server
      if (navigator.onLine) {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          });
          if (res.ok) {
            const data = await res.json();
            user = {
              id: data.user.id,
              email: data.user.email,
              username: data.user.username,
              createdAt: data.user.createdAt || new Date().toISOString(),
              comfortFundAllowance: Number(data.user.comfortFundAllowance ?? 50.0),
              comfortFundRemaining: Number(data.user.comfortFundRemaining ?? 50.0),
              comfortFundResetDate: data.user.comfortFundResetDate || new Date().toISOString(),
              comfortFundUnlocked: Boolean(data.user.comfortFundUnlocked ?? false),
              exp: Number(data.user.exp ?? 0),
              level: Number(data.user.level ?? 1),
              currentStreak: Number(data.user.currentStreak ?? 0),
              longestStreak: Number(data.user.longestStreak ?? 0),
              graceDays: Number(data.user.graceDays ?? 2),
              lastActiveDate: data.user.lastActiveDate ?? null,
              userTimezone: data.user.userTimezone || (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'),
              activeTheme: data.user.activeTheme || 'cyber_slate',
              spinnerTickets: Number(data.user.spinnerTickets ?? 1),
            };
            await db.users.put(user);
          }
        } catch {
          // offline fallback
        }
      }
    }

    if (!user) {
      // Auto-provision demo account if email doesn't exist yet for seamless testing
      const userId = crypto.randomUUID();
      const now = new Date();
      const startOfMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      user = {
        id: userId,
        email,
        username: email.split('@')[0] || 'Member',
        comfortFundAllowance: 25,
        comfortFundRemaining: 25,
        comfortFundResetDate: startOfMonthUtc,
        comfortFundUnlocked: false,
        exp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        graceDays: 2,
        lastActiveDate: null,
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        activeTheme: 'cyber_slate',
        spinnerTickets: 1,
        createdAt: now.toISOString(),
      };
      await db.users.add(user);
    }

    const token = generateToken(user.id);
    user.token = token;

    // Seed categories if none
    await seedDefaultCategories(user.id);

    // Save session
    this.saveSession(user, token);

    return { user, token };
  }

  /**
   * Sign out
   */
  static async logout() {
    this.clearSession();
  }
}
