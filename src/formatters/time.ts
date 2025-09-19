import type { MessageFormatter } from "../types.ts";

/**
 * Time formatter
 *
 * Usage examples in message strings:
 *  {T, time}              -> default time with seconds
 *  {T, time, short}       -> hours & minutes
 *  {T, time, long}        -> includes short time zone name
 *  {T, time, full}        -> includes short time zone name (same as long here)
 *
 * Accepts either a Unix epoch (ms) number or any value coercible via `new Date(value)`.
 */
export const time: MessageFormatter = (value, lc, size) => {
  const o: Intl.DateTimeFormatOptions = {
    second: "numeric",
    minute: "numeric",
    hour: "numeric",
  };

  switch (size) {
    case "full":
    case "long":
      o.timeZoneName = "short";
      break;
    case "short":
      delete o.second;
      break;
      // 'default' or undefined fall through to base options
  }

  return new Date(value as any).toLocaleTimeString(lc, o);
};
