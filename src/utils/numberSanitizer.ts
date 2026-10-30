/**
 * Strict currency input sanitization and math rounding utility for AED Financial Vault.
 * Converts numeric strings, enforces non-negative numbers, eliminates NaN corruption,
 * and guarantees exact 2-decimal-place rounding.
 */

export function sanitizeCurrency(val: unknown): number {
  if (val === null || val === undefined) {
    return 0;
  }

  let cleaned: number;

  if (typeof val === 'number') {
    cleaned = val;
  } else if (typeof val === 'string') {
    // Strip AED currency labels, commas, currency symbols, and extra spaces
    const stripped = val.replace(/[^0-9.-]/g, '').trim();
    cleaned = parseFloat(stripped);
  } else {
    return 0;
  }

  // Prevent NaN, infinite, or negative inputs from corrupting ledger state
  if (isNaN(cleaned) || !isFinite(cleaned) || cleaned < 0) {
    return 0;
  }

  // Round consistently to two decimal places
  return Math.round(cleaned * 100) / 100;
}

export function formatCurrencyInput(val: unknown): string {
  const sanitized = sanitizeCurrency(val);
  return sanitized.toFixed(2);
}

export function roundToTwoDecimals(num: number): number {
  if (isNaN(num) || !isFinite(num)) {
    return 0;
  }
  return Math.round(num * 100) / 100;
}
