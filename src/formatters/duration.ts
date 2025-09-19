import type { MessageFormatter } from "../types.ts";

export const duration: MessageFormatter = (value) => {
  if (typeof value !== "number") value = Number(value);
  if (!Number.isFinite(value)) return String(value);
  let sign = "";
  if (value < 0) {
    sign = "-";
    value = Math.abs(value);
  } else {
    value = Number(value);
  }
  const sec = value % 60;
  const parts = [Math.round(sec) === sec ? sec : sec.toFixed(3)];
  if (value < 60) {
    parts.unshift(0); // at least one : is required
  } else {
    value = Math.round((value - Number(parts[0])) / 60);
    parts.unshift(value % 60); // minutes
    if (value >= 60) {
      value = Math.round((value - Number(parts[0])) / 60);
      parts.unshift(value); // hours
    }
  }
  const first = parts.shift();
  return (
    sign +
    first +
    ":" +
    parts.map((n) => (Number(n) < 10 ? "0" + String(n) : String(n))).join(":")
  );
};
