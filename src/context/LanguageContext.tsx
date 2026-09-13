import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { LanguageCode } from '../types';
import { translations } from '../lib/i18n/translations';
import { db } from '../lib/db';

const STORAGE_KEY = 'mokaia_preferred_language';
export const DEFAULT_LANGUAGE: LanguageCode = 'id';

interface LanguageContextValue {
  language: LanguageCode;
  locale: string;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (date: Date | string | number) => string;
  formatRelativeTime: (date: Date | string | number) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode; activeUserId?: string }> = ({
  children,
  activeUserId,
}) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as LanguageCode;
      if (stored === 'id' || stored === 'en') {
        return stored;
      }
    }
    return DEFAULT_LANGUAGE;
  });

  // Sync from user profile in Dexie when user logs in or loads
  useEffect(() => {
    if (!activeUserId) return;
    let isMounted = true;

    db.users.get(activeUserId).then((user) => {
      if (isMounted && user?.preferredLanguage && (user.preferredLanguage === 'id' || user.preferredLanguage === 'en')) {
        setLanguageState(user.preferredLanguage);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, user.preferredLanguage);
        }
      }
    }).catch((err) => {
      console.warn('[LanguageContext] Failed to load user preferred language:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [activeUserId]);

  const setLanguage = useCallback(
    async (lang: LanguageCode) => {
      if (lang !== 'id' && lang !== 'en') return;
      setLanguageState(lang);

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, lang);
        // Also update html lang attribute
        document.documentElement.lang = lang;
      }

      if (activeUserId) {
        try {
          await db.users.update(activeUserId, {
            preferredLanguage: lang,
            preferredLocale: lang === 'id' ? 'id-ID' : 'en-US',
          });
        } catch (err) {
          console.warn('[LanguageContext] Failed to persist language to Dexie:', err);
        }
      }
    },
    [activeUserId]
  );

  const locale = useMemo(() => (language === 'id' ? 'id-ID' : 'en-US'), [language]);

  // Translation lookup with fallback and parameter interpolation
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const currentDict = translations[language] || translations[DEFAULT_LANGUAGE];
      const fallbackDict = translations[DEFAULT_LANGUAGE];
      let message = currentDict[key] ?? fallbackDict[key];

      // Defensive fallback: case-insensitive match
      if (message === undefined) {
        const lowerKey = key.toLowerCase();
        const matchedKey =
          Object.keys(currentDict).find((k) => k.toLowerCase() === lowerKey) ||
          Object.keys(fallbackDict).find((k) => k.toLowerCase() === lowerKey);
        if (matchedKey) {
          message = currentDict[matchedKey] ?? fallbackDict[matchedKey];
        }
      }

      // Graceful fallback for missing keys: extract friendly label instead of raw dot-notation
      if (message === undefined) {
        if (key.includes('.')) {
          const segments = key.split('.');
          const lastSegment = segments[segments.length - 1];
          message = lastSegment
            .replace(/([A-Z])/g, ' $1')
            .replace(/[-_]/g, ' ')
            .replace(/^./, (c) => c.toUpperCase())
            .trim();
        } else {
          message = key;
        }
      }

      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          message = message.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
        });
      }

      return message;
    },
    [language]
  );

  const formatDate = useCallback(
    (dateInput: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      try {
        const d = typeof dateInput === 'object' && dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput);
        const defaultOptions: Intl.DateTimeFormatOptions = options || {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        };
        return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
      } catch {
        return String(dateInput);
      }
    },
    [locale]
  );

  const formatDateTime = useCallback(
    (dateInput: Date | string | number): string => {
      try {
        const d = typeof dateInput === 'object' && dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput);
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(d);
      } catch {
        return String(dateInput);
      }
    },
    [locale]
  );

  const formatRelativeTime = useCallback(
    (dateInput: Date | string | number): string => {
      try {
        const d = typeof dateInput === 'object' && dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput);

        const diffSeconds = Math.round((Date.now() - d.getTime()) / 1000);
        if (diffSeconds < 60) {
          return language === 'id' ? 'Baru saja' : 'Just now';
        }
        const diffMinutes = Math.round(diffSeconds / 60);
        if (diffMinutes < 60) {
          return language === 'id' ? `${diffMinutes} menit lalu` : `${diffMinutes}m ago`;
        }
        const diffHours = Math.round(diffMinutes / 60);
        if (diffHours < 24) {
          return language === 'id' ? `${diffHours} jam lalu` : `${diffHours}h ago`;
        }
        const diffDays = Math.round(diffHours / 24);
        if (diffDays < 7) {
          return language === 'id' ? `${diffDays} hari lalu` : `${diffDays}d ago`;
        }
        return formatDate(d);
      } catch {
        return String(dateInput);
      }
    },
    [language, formatDate]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      locale,
      setLanguage,
      t,
      formatDate,
      formatDateTime,
      formatRelativeTime,
    }),
    [language, locale, setLanguage, t, formatDate, formatDateTime, formatRelativeTime]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    const fallbackLocale = 'id-ID';
    return {
      language: DEFAULT_LANGUAGE,
      locale: fallbackLocale,
      setLanguage: async () => {},
      t: (key: string, params?: Record<string, string | number>) => {
        let msg = translations[DEFAULT_LANGUAGE][key];
        if (msg === undefined) {
          if (key.includes('.')) {
            const segments = key.split('.');
            const last = segments[segments.length - 1];
            msg = last.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase()).trim();
          } else {
            msg = key;
          }
        }
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
          });
        }
        return msg;
      },
      formatDate: (d, options) => {
        try {
          return new Intl.DateTimeFormat(fallbackLocale, options || { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(d));
        } catch {
          return String(d);
        }
      },
      formatDateTime: (d) => {
        try {
          return new Intl.DateTimeFormat(fallbackLocale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
        } catch {
          return String(d);
        }
      },
      formatRelativeTime: (d) => String(d),
    };
  }
  return context;
}

// Convenient alias
export const useLanguage = useTranslation;
