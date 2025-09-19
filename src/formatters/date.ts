import type { MessageFormatter } from "../types.ts";

export const date: MessageFormatter = (value, lc, size) => {
  const o: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  switch (size) {
    // deno-lint-ignore no-fallthrough
    case "full":
      o.weekday = "long";
    case "long":
      o.month = "long";
      break;
    case "short":
      o.month = "numeric";
  }
  return new Date(value).toLocaleDateString(lc, o);
};
