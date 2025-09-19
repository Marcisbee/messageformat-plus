# messageformat-plus

<a href="https://github.com/Marcisbee/messageformat-plus/actions">
  <img alt="CI" src="https://img.shields.io/github/actions/workflow/status/Marcisbee/messageformat-plus/main.yml?branch=main&style=flat-square" />
</a>
<a href="https://www.npmjs.com/package/messageformat-plus">
  <img alt="npm" src="https://img.shields.io/npm/v/messageformat-plus.svg?style=flat-square" />
</a>
<a href="https://jsr.io/@marcisbee/mf">
  <img alt="jsr" src="https://jsr.io/badges/@marcisbee/mf?style=flat-square" />
</a>
<a href="https://bundlephobia.com/result?p=messageformat-plus">
  <img alt="package size" src="https://deno.bundlejs.com/?q=messageformat-plus&badge=&badge-style=flat-square" />
</a>

A lightweight, modern take on ICU MessageFormat-inspired message compilation
with a focus on:

- Simplicity of authoring
- Flexible path (dot & bracket) access
- Extensible, pluggable formatters
- Small, dependency‑lean parsing core

## Quick Start

```ts
import { MessageFormat } from "messageformat-plus"; // adjust path for your environment

const mf = new MessageFormat("en", {
  customFormatters: {
    upcase: (v: unknown) => String(v).toUpperCase(),
  },
});

const greet = mf.compile("Hello {user.name, upcase}! Today is {today, date}.");

console.log(greet({
  user: { name: "Ada" },
  today: Date.now(),
}));
// → e.g. "Hello ADA! Today is Feb 21, 2016"
```

### Built-in Formatters

| Name       | Syntax Examples                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| `date`     | `{d, date}`, `{d, date, short}`, `{d, date, full}`                                                                  |
| `time`     | `{t, time}`, `{t, time, short}`, `{t, time, long}`                                                                  |
| `duration` | `{s, duration}` (seconds -> `H:MM:SS(.fff)`)                                                                        |
| `number`   | `{n, number}`, `{n, number, integer}`, `{p, number, percent}`, `{v, number, currency}`, `{v, number, currency:EUR}` |
| `select`   | `{g, select, male{He} female{She} other{They}}`                                                                     |

(You can register your own via `customFormatters`.)

## Usage Notes

### Compiling & Reuse

`compile()` returns a pure function. Reuse it for multiple param sets:

```ts
const line = mf.compile("Hi {name, select, alice{Alice} other{User}}");
line({ name: "alice" }); // "Hi Alice"
line({ name: "bob" }); // "Hi User"
```

### Variable Paths

Supports mixed dot & bracket style:

- `{user.name}`
- `{user.profile[0].email}`
- `{data.items[order.index].price}` (nested bracketed expression tokens are
  parsed if they form a valid path sequence)

Missing segments yield `undefined` (no crash).

## How This Deviates From MessageFormat v1

This project intentionally **does not** aim for byte‑for‑byte compatibility with
the original `messageformat` v1 runtime. Key differences:

1. More permissive path resolution Dot & bracket nesting (`a.b[c[d].e].f`) is
   parsed into a uniform path array and resolved dynamically. Some syntactic
   forms that classic MF might reject are accepted here.

2. Formatter argument token flexibility Arguments like `currency:EUR` may arrive
   from the parser as:
   - `["currency:EUR"]`
   - `["currency", ":", "EUR"]`
   - `["currency", ":", "EUR", " "]` The `number` formatter normalizes these
     automatically.

3. Select value coercion `select` coerces the incoming value to `String(value)`
   so numeric option keys work: `{count, select, 1{One} other{Many}}`.

4. Partial feature surface (lean core) Not (yet) implementing: `plural`,
   `selectordinal`, rich nested message interpolation inside select arms, or
   skeleton-based date/number formatting. Only a focused subset is provided.

5. Simpler argument parsing model Transformer (formatter) arguments are passed
   as a raw token-ish array. Complex nested `{}` inside formatter arms are
   presently flattened as text. (Future work could re-parse inner segments
   recursively.)

6. Error handling Unknown formatter names throw early at runtime. Malformed
   argument groupings default to a sane fallback rather than fail the whole
   message.

7. Escaping semantics Backslash escaping is pragmatic: `\{` and `\}` produce
   literal braces. Behavior for some edge escape sequences may differ from
   canonical ICU rules.

If you need strict ICU / MessageFormat v1 behavior, use the original library.
This project optimizes for ergonomic flexibility and a smaller mental model.

## Custom Formatters

```ts
const mf = new MessageFormat("en", {
  customFormatters: {
    upper: (v) => String(v).toUpperCase(),
  },
});

mf.compile("HELLO {x, upper}")({ x: "world" }); // "HELLO WORLD"
```

A formatter signature:

```ts
((value: unknown, locale: string | string[], ...args: unknown[]) => string);
```

## Testing

Run all tests:

```
deno test -A
```

## Performance

The parser builds a compact JS expression and uses `new Function` bound with a
lightweight context (`d` = dispatcher, `p` = path resolver, `l` = locale). This
keeps runtime evaluation fast after the initial compile.

## Caveats

- Output can vary across environments due to `Intl` differences (especially
  currency & time zone strings).
- Select arm contents are currently treated as plain text; embedded variables
  are not re-interpreted.

## Contributing

Issues & PRs welcome. Keep additions minimal & well‑tested. Preference is for
incremental, opt‑in complexity rather than broad speculative feature builds.

## License

MIT
