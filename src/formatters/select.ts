import type { MessageFormatter } from "../types.ts";

/**
 * Basic ICU-style select formatter.
 *
 * Expected message usage (simplified):
 *   {gender, select, male{He} female{She} other{They}}
 *
 * Parser passes the raw token/segment list for all arguments to this formatter:
 *   ["male","{",["He"],"}"," ","female","{",["She"],"}"," ","other","{",["They"],"}"]
 *
 * This implementation:
 *  - Scans the argument list for KEY "{" CONTENT "}" patterns
 *  - Builds a mapping { key -> flattened string content }
 *  - Returns mapping[value] if present, else mapping.other, else empty string
 *
 * Limitations (given the current parser behavior):
 *  - Content inside option braces is not further parsed; any nested `{}` or variables
 *    are treated as raw text (because the parser treats them as unmatched delimiters
 *    within transformer arguments). If deeper dynamic behavior is desired later,
 *    the parser would need to recursively parse those segments into message ASTs
 *    and we would need to evaluate them here with access to the runtime context.
 */
export const select: MessageFormatter = (value, _lc, rawArgs) => {
  const args = rawArgs || [];
  const options: Record<string, string> = Object.create(null);

  function flatten(segment: any): string {
    if (Array.isArray(segment)) {
      return segment.map(flatten).join("");
    }
    if (segment == null) return "";
    return String(segment);
  }

  for (let i = 0; i < args.length; i++) {
    // Anchor on the opening brace and build the key from the tokens immediately
    // preceding it. This allows keys composed of symbol/punctuation tokens that
    // the parser may have split into multiple string fragments (e.g. ["bob", ".", "foo_", "@$!"])
    if (args[i] === "{") {
      // Expect pattern: KEY_TOKENS... "{" CONTENT "}"
      if (i + 2 < args.length && args[i + 2] === "}") {
        // Walk backwards from i-1 collecting contiguous non-whitespace string tokens
        // that are not braces. Stop when encountering a space token, a brace, non-string,
        // or the start of the array.
        let start = i - 1;
        while (start >= 0) {
          const t = args[start];
          if (typeof t !== "string") break;
          if (t === "{" || t === "}") break;
          if (/^\s*$/.test(t)) break; // stop on whitespace separators
          start--;
        }
        const keyTokens = args.slice(start + 1, i);
        if (keyTokens.length > 0) {
          const key = keyTokens.map((k) => String(k)).join("");
          const content = args[i + 1];
          options[key] = flatten(content);
        }
        // Skip past the "{" CONTENT "}" we've just processed
        i += 2;
      }
    }
  }

  const valKey = String(value);
  if (Object.prototype.hasOwnProperty.call(options, valKey)) {
    return options[valKey];
  }
  if (Object.prototype.hasOwnProperty.call(options, "other")) {
    return options.other;
  }
  return "";
};
