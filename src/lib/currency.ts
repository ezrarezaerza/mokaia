/**
 * Mokaia Universal Currency & Number Formatting Engine
 * 
 * Supports zero-decimal currencies (IDR, JPY) and standard two-decimal currencies (USD, EUR, GBP, SGD, etc.)
 * Provides compact abbreviations (Rp 1,5 Jt / $1.2M), contextual quick-add presets, and localized symbol placements.
 */

export type CurrencyCode = 'IDR' | 'USD' | 'EUR' | 'GBP' | 'SGD' | 'MYR' | 'JPY' | 'AUD';

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  nativeName: string;
  symbol: string;
  symbolPosition: 'prefix' | 'suffix';
  symbolSpacing: boolean;
  decimals: number;
  thousandsSeparator: string;
  decimalSeparator: string;
  flag: string;
  quickAddPresets: Array<{ value: number; label: string }>;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  IDR: {
    code: 'IDR',
    name: 'Indonesian Rupiah',
    nativeName: 'Rupiah Indonesia',
    symbol: 'Rp',
    symbolPosition: 'prefix',
    symbolSpacing: true,
    decimals: 0,
    thousandsSeparator: '.',
    decimalSeparator: ',',
    flag: '🇮🇩',
    quickAddPresets: [
      { value: 10000, label: '+10rb' },
      { value: 25000, label: '+25rb' },
      { value: 50000, label: '+50rb' },
      { value: 100000, label: '+100rb' },
      { value: 500000, label: '+500rb' },
    ],
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    nativeName: 'US Dollar',
    symbol: '$',
    symbolPosition: 'prefix',
    symbolSpacing: false,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    flag: '🇺🇸',
    quickAddPresets: [
      { value: 5, label: '+$5' },
      { value: 10, label: '+$10' },
      { value: 25, label: '+$25' },
      { value: 50, label: '+$50' },
      { value: 100, label: '+$100' },
    ],
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    nativeName: 'Euro',
    symbol: '€',
    symbolPosition: 'prefix',
    symbolSpacing: false,
    decimals: 2,
    thousandsSeparator: '.',
    decimalSeparator: ',',
    flag: '🇪🇺',
    quickAddPresets: [
      { value: 5, label: '+€5' },
      { value: 10, label: '+€10' },
      { value: 20, label: '+€20' },
      { value: 50, label: '+€50' },
      { value: 100, label: '+€100' },
    ],
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    nativeName: 'British Pound',
    symbol: '£',
    symbolPosition: 'prefix',
    symbolSpacing: false,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    flag: '🇬🇧',
    quickAddPresets: [
      { value: 5, label: '+£5' },
      { value: 10, label: '+£10' },
      { value: 20, label: '+£20' },
      { value: 50, label: '+£50' },
      { value: 100, label: '+£100' },
    ],
  },
  SGD: {
    code: 'SGD',
    name: 'Singapore Dollar',
    nativeName: 'Singapore Dollar',
    symbol: 'S$',
    symbolPosition: 'prefix',
    symbolSpacing: false,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    flag: '🇸🇬',
    quickAddPresets: [
      { value: 5, label: '+S$5' },
      { value: 10, label: '+S$10' },
      { value: 20, label: '+S$20' },
      { value: 50, label: '+S$50' },
      { value: 100, label: '+S$100' },
    ],
  },
  MYR: {
    code: 'MYR',
    name: 'Malaysian Ringgit',
    nativeName: 'Ringgit Malaysia',
    symbol: 'RM',
    symbolPosition: 'prefix',
    symbolSpacing: true,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    flag: '🇲🇾',
    quickAddPresets: [
      { value: 10, label: '+RM 10' },
      { value: 20, label: '+RM 20' },
      { value: 50, label: '+RM 50' },
      { value: 100, label: '+RM 100' },
      { value: 200, label: '+RM 200' },
    ],
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    nativeName: '日本円',
    symbol: '¥',
    symbolPosition: 'prefix',
    symbolSpacing: false,
    decimals: 0,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    flag: '🇯🇵',
    quickAddPresets: [
      { value: 500, label: '+¥500' },
      { value: 1000, label: '+¥1k' },
      { value: 2000, label: '+¥2k' },
      { value: 5000, label: '+¥5k' },
      { value: 10000, label: '+¥10k' },
    ],
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    nativeName: 'Australian Dollar',
    symbol: 'A$',
    symbolPosition: 'prefix',
    symbolSpacing: false,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    flag: '🇦🇺',
    quickAddPresets: [
      { value: 5, label: '+A$5' },
      { value: 10, label: '+A$10' },
      { value: 20, label: '+A$20' },
      { value: 50, label: '+A$50' },
      { value: 100, label: '+A$100' },
    ],
  },
};

export const DEFAULT_CURRENCY: CurrencyCode = 'IDR';

/**
 * Format a number using specific thousands and decimal separators
 */
function formatNumberWithSeparators(
  num: number,
  decimals: number,
  thousandsSeparator: string,
  decimalSeparator: string
): string {
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const fixed = absNum.toFixed(decimals);
  const [integerPart, decimalPart] = fixed.split('.');

  // Insert thousands separator
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);

  let result = formattedInteger;
  if (decimals > 0 && decimalPart) {
    result += decimalSeparator + decimalPart;
  }

  return isNegative ? `-${result}` : result;
}

export interface FormatCurrencyOptions {
  showSign?: boolean; // explicitly prefix + for positive numbers
  compact?: boolean;  // compact notation e.g. Rp 1,5 Jt or $1.2M
  hideSymbol?: boolean; // render number only
  forceDecimals?: boolean; // show decimals even for 0-decimal currencies
}

/**
 * Universal Currency Formatter
 */
export function formatCurrency(
  amount: number | null | undefined,
  currencyCode: CurrencyCode = DEFAULT_CURRENCY,
  options: FormatCurrencyOptions = {}
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    amount = 0;
  }

  const config = CURRENCIES[currencyCode] || CURRENCIES[DEFAULT_CURRENCY];
  const { showSign = false, compact = false, hideSymbol = false } = options;

  if (compact) {
    return formatCompactCurrency(amount, currencyCode, { showSign, hideSymbol });
  }

  const isPositive = amount > 0;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const decimals = options.forceDecimals ? (config.decimals || 2) : config.decimals;
  const numberStr = formatNumberWithSeparators(
    absAmount,
    decimals,
    config.thousandsSeparator,
    config.decimalSeparator
  );

  let formatted = numberStr;
  if (!hideSymbol) {
    if (config.symbolPosition === 'prefix') {
      formatted = config.symbolSpacing ? `${config.symbol} ${numberStr}` : `${config.symbol}${numberStr}`;
    } else {
      formatted = config.symbolSpacing ? `${numberStr} ${config.symbol}` : `${numberStr}${config.symbol}`;
    }
  }

  if (isNegative) {
    return `-${formatted}`;
  }
  if (showSign && isPositive) {
    return `+${formatted}`;
  }

  return formatted;
}

/**
 * Compact Currency Formatter for Small Cards, Charts, and Bento Grids
 */
export function formatCompactCurrency(
  amount: number | null | undefined,
  currencyCode: CurrencyCode = DEFAULT_CURRENCY,
  options: { showSign?: boolean; hideSymbol?: boolean } = {}
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    amount = 0;
  }

  const config = CURRENCIES[currencyCode] || CURRENCIES[DEFAULT_CURRENCY];
  const { showSign = false, hideSymbol = false } = options;

  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  let abbreviated = '';
  const prefixSymbol = hideSymbol
    ? ''
    : config.symbolPosition === 'prefix'
    ? config.symbolSpacing
      ? `${config.symbol} `
      : config.symbol
    : '';
  const suffixSymbol = hideSymbol
    ? ''
    : config.symbolPosition === 'suffix'
    ? config.symbolSpacing
      ? ` ${config.symbol}`
      : config.symbol
    : '';

  if (currencyCode === 'IDR') {
    // Indonesian abbreviations: M (Miliar), Jt (Juta), Rb (Ribu)
    if (abs >= 1_000_000_000) {
      const val = (abs / 1_000_000_000).toFixed(1).replace('.0', '').replace('.', ',');
      abbreviated = `${prefixSymbol}${val} M${suffixSymbol}`;
    } else if (abs >= 1_000_000) {
      const val = (abs / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',');
      abbreviated = `${prefixSymbol}${val} Jt${suffixSymbol}`;
    } else if (abs >= 10_000) {
      const val = (abs / 1_000).toFixed(0);
      abbreviated = `${prefixSymbol}${val} Rb${suffixSymbol}`;
    } else {
      abbreviated = formatCurrency(abs, currencyCode, { hideSymbol });
    }
  } else {
    // Standard English abbreviations: B (Billion), M (Million), K (Thousand)
    if (abs >= 1_000_000_000) {
      const val = (abs / 1_000_000_000).toFixed(1).replace('.0', '');
      abbreviated = `${prefixSymbol}${val}B${suffixSymbol}`;
    } else if (abs >= 1_000_000) {
      const val = (abs / 1_000_000).toFixed(1).replace('.0', '');
      abbreviated = `${prefixSymbol}${val}M${suffixSymbol}`;
    } else if (abs >= 1_000) {
      const val = (abs / 1_000).toFixed(1).replace('.0', '');
      abbreviated = `${prefixSymbol}${val}K${suffixSymbol}`;
    } else {
      abbreviated = formatCurrency(abs, currencyCode, { hideSymbol });
    }
  }

  if (isNegative) {
    return `-${abbreviated}`;
  }
  if (showSign && amount > 0) {
    return `+${abbreviated}`;
  }

  return abbreviated;
}

/**
 * Get Quick Add amount buttons suitable for the selected currency
 */
export function getQuickAddPresets(currencyCode: CurrencyCode = DEFAULT_CURRENCY) {
  const config = CURRENCIES[currencyCode] || CURRENCIES[DEFAULT_CURRENCY];
  return config.quickAddPresets;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currencyCode: CurrencyCode = DEFAULT_CURRENCY): string {
  const config = CURRENCIES[currencyCode] || CURRENCIES[DEFAULT_CURRENCY];
  return config.symbol;
}
