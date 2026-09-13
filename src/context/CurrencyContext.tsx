import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  CurrencyCode,
  CurrencyConfig,
  CURRENCIES,
  DEFAULT_CURRENCY,
  formatCurrency,
  formatCompactCurrency,
  getQuickAddPresets,
  getCurrencySymbol,
  FormatCurrencyOptions,
} from '../lib/currency';
import { db } from '../lib/db';

const STORAGE_KEY = 'mokaia_preferred_currency';

interface CurrencyContextValue {
  currency: CurrencyCode;
  config: CurrencyConfig;
  symbol: string;
  quickAddPresets: Array<{ value: number; label: string }>;
  setCurrency: (code: CurrencyCode) => Promise<void>;
  format: (amount: number | null | undefined, options?: FormatCurrencyOptions) => string;
  formatCompact: (amount: number | null | undefined, options?: { showSign?: boolean; hideSymbol?: boolean }) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode; activeUserId?: string }> = ({
  children,
  activeUserId,
}) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode;
      if (stored && CURRENCIES[stored]) {
        return stored;
      }
    }
    return DEFAULT_CURRENCY;
  });

  // Sync from user profile in Dexie when user logs in or switches
  useEffect(() => {
    if (!activeUserId) return;
    let isMounted = true;

    db.users.get(activeUserId).then((user) => {
      if (isMounted && user?.preferredCurrency && CURRENCIES[user.preferredCurrency]) {
        setCurrencyState(user.preferredCurrency);
        localStorage.setItem(STORAGE_KEY, user.preferredCurrency);
      }
    }).catch((err) => {
      console.warn('[CurrencyContext] Failed to load user preferred currency:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [activeUserId]);

  const setCurrency = useCallback(
    async (code: CurrencyCode) => {
      if (!CURRENCIES[code]) return;
      setCurrencyState(code);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, code);
      }

      if (activeUserId) {
        try {
          await db.users.update(activeUserId, { preferredCurrency: code });
        } catch (err) {
          console.warn('[CurrencyContext] Failed to persist currency to Dexie:', err);
        }
      }
    },
    [activeUserId]
  );

  const config = useMemo(() => CURRENCIES[currency] || CURRENCIES[DEFAULT_CURRENCY], [currency]);
  const symbol = useMemo(() => getCurrencySymbol(currency), [currency]);
  const quickAddPresets = useMemo(() => getQuickAddPresets(currency), [currency]);

  const format = useCallback(
    (amount: number | null | undefined, options?: FormatCurrencyOptions) => {
      return formatCurrency(amount, currency, options);
    },
    [currency]
  );

  const formatCompact = useCallback(
    (amount: number | null | undefined, options?: { showSign?: boolean; hideSymbol?: boolean }) => {
      return formatCompactCurrency(amount, currency, options);
    },
    [currency]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      config,
      symbol,
      quickAddPresets,
      setCurrency,
      format,
      formatCompact,
    }),
    [currency, config, symbol, quickAddPresets, setCurrency, format, formatCompact]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    // Graceful fallback outside provider
    const fallbackConfig = CURRENCIES[DEFAULT_CURRENCY];
    return {
      currency: DEFAULT_CURRENCY,
      config: fallbackConfig,
      symbol: fallbackConfig.symbol,
      quickAddPresets: fallbackConfig.quickAddPresets,
      setCurrency: async () => {},
      format: (amount, options) => formatCurrency(amount, DEFAULT_CURRENCY, options),
      formatCompact: (amount, options) => formatCompactCurrency(amount, DEFAULT_CURRENCY, options),
    };
  }
  return context;
}
