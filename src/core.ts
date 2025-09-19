import { date } from "./formatters/date.ts";
import { duration } from "./formatters/duration.ts";
import { number } from "./formatters/number.ts";
import { time } from "./formatters/time.ts";
import { select } from "./formatters/select.ts";
import { parseMessageFormat } from "./parser.ts";
import type { MessageFormatter } from "./types.ts";
import dlv from "./utils/delve.ts";

export type { MessageFormatter } from "./types.ts";

export class MessageFormat {
  public baseFormatters: Record<string, MessageFormatter> = {
    date,
    duration,
    number,
    time,
    select,
  };

  public customFormatters: Record<string, MessageFormatter> = {};

  constructor(
    public locale: string | string[] = "en",
    config?: {
      customFormatters?: Record<string, MessageFormatter>;
    },
  ) {
    if (config?.customFormatters) {
      this.customFormatters = config.customFormatters;
    }
  }

  public compile(
    message: string,
    locale?: string | string[],
  ): (params?: Record<string, any>) => string {
    const ctx = {
      d: this.format,
      p: dlv,
      l: locale || this.locale,
    };
    return new Function("v", `return ${parseMessageFormat(message)}`).bind(ctx);
  }

  private format = (
    value: any,
    locale: string,
    name?: string,
    args: any[] = [],
  ) => {
    if (!name) {
      return value;
    }

    const formatter = this.customFormatters[name] || this.baseFormatters[name];
    if (!formatter) {
      throw new Error(`Unknown formatter: ${JSON.stringify(name)}`);
    }

    return formatter(value, locale, ...args);
  };
}
