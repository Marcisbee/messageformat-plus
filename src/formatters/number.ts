import type { MessageFormatter } from "../types.ts";

/**
 * Number formatter
 *
 * Usage examples in message strings:
 *  {VAL, number}                -> locale-formatted number
 *  {VAL, number, integer}       -> integer (no fraction digits)
 *  {RATE, number, percent}      -> percent (value 0.42 -> 42%)
 *  {PRICE, number, currency}    -> currency with default (USD)
 *  {PRICE, number, currency:EUR} -> currency with explicit code
 *
 * The argument (if any) has the form:
 *   - "integer"
 *   - "percent"
 *   - "currency"
 *   - "currency:CODE" (CODE = 3-letter currency or valid ISO code used by Intl)
 *
 * Non-finite numeric input (NaN / Infinity) is returned as a string form.
 */
const nfCache = new Map<string, Intl.NumberFormat>();

function getNumberFormat(
  locale: string | string[],
  opt: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = String(locale) + JSON.stringify(opt);
  let inst = nfCache.get(key);
  if (!inst) {
    inst = new Intl.NumberFormat(locale, opt);
    nfCache.set(key, inst);
  }
  return inst;
}

function coerceNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const n = Number(value);
  return n;
}

export const number: MessageFormatter = (value, lc, ...rawArgs) => {
  const num = coerceNumber(value);
  if (!Number.isFinite(num)) return String(value);

  // Derive a single spec string from possibly tokenized args
  // Examples of rawArgs we may get:
  //  [] -> default
  //  ["integer"] -> integer
  //  ["currency:EUR"] -> currency:EUR
  //  ["currency", ":", "EUR"] -> currency:EUR (tokenized split)
  //  ["currency", ":","EUR"," "] -> tolerate extra tokens
  let spec = "";
  if (!rawArgs || rawArgs.length === 0) {
    spec = "";
  } else if (rawArgs.length === 1) {
    spec = String(rawArgs[0]).trim();
  } else if (rawArgs[1] === ":" && rawArgs[0] && rawArgs[2]) {
    spec = `${rawArgs[0]}:${rawArgs[2]}`.trim();
  } else {
    spec = rawArgs
      .map((p) => (p == null ? "" : String(p)))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (!spec) {
    return getNumberFormat(lc, {}).format(num);
  }

  let kind: string;
  let currencyCode: string | undefined;

  if (spec.includes(":")) {
    const [k, c] = spec.split(":");
    kind = k.trim();
    currencyCode = c && c.trim() || undefined;
  } else {
    kind = spec.trim();
  }

  switch (kind) {
    case "integer":
      return getNumberFormat(lc, { maximumFractionDigits: 0 }).format(num);

    case "percent":
      return getNumberFormat(lc, { style: "percent" }).format(num);

    case "currency": {
      const currency = currencyCode || "USD";
      return getNumberFormat(lc, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    }

    default:
      return getNumberFormat(lc, {}).format(num);
  }
};

// Optional specialized aliases mirroring original messageformat runtime API
export const numberInteger: MessageFormatter = (value, lc) =>
  number(value, lc, "integer");

export const numberPercent: MessageFormatter = (value, lc) =>
  number(value, lc, "percent");

export const numberCurrency: MessageFormatter = (value, lc, currency) =>
  number(value, lc, currency ? `currency:${currency}` : "currency");
