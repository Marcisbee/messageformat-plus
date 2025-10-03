import {
  and,
  consume,
  consumeBehind,
  consumeUntil,
  createParser,
  createToken,
  Grammar,
  not,
  oneOrMany,
  or,
  peek,
  rule,
  zeroOrMany,
  zeroOrOne,
} from "@marcisbee/nanolex";

const Whitespace = createToken(/[ \t\n\r]+/, "Whitespace");
const LBrace = createToken("{");
const RBrace = createToken("}");
const Comma = createToken(",");
const Dot = createToken(".");
const LBracket = createToken("[");
const RBracket = createToken("]");
const LParen = createToken("(");
const RParen = createToken(")");
const Identifier = createToken(/[a-zA-Z0-9_-]+/, "Identifier");
const Backslash = createToken("\\");
const QuoteSingle = createToken("'", "QuoteSingle");
const QuoteDouble = createToken(`"`, "QuoteDouble");
const QuoteTick = createToken("`", "QuoteTick");
const Anything = createToken(/.+/);

const tokens = [
  Whitespace,
  Identifier,
  LBrace,
  RBrace,
  Dot,
  Comma,
  LBracket,
  RBracket,
  LParen,
  RParen,
  QuoteDouble,
  QuoteSingle,
  QuoteTick,
  Backslash,
];

interface MessageNode {
  type: "message";
  content: (string | VariableNode | PathNode | TransformerNode)[];
  toString?: () => string;
}

interface PathNode {
  type: "path";
  path: (string | PathNode)[];
  toString?: () => string;
}

interface TransformerNode {
  type: "transformer";
  name: string;
  args?: any[];
}

interface VariableNode {
  type: "variable";
  path: PathNode;
  transformer?: TransformerNode;
  toString?: () => string;
}

const parser = createParser(tokens, {
  PATH_SEGMENT() {
    return or([
      consume(Identifier),
      and(
        [consume(LBracket), rule(this.PATH), consume(RBracket)],
        ([, path]) => path,
      ),
    ]);
  },

  PATH(): Grammar<string | PathNode> {
    return and(
      [
        rule(this.PATH_SEGMENT),
        zeroOrMany(
          or([
            and([consume(Dot), consume(Identifier)], ([, id]) => id),
            and(
              [consume(LBracket), rule(this.PATH), consume(RBracket)],
              ([, path]) => path,
            ),
          ]),
        ),
      ],
      ([first, rest]) => {
        // Allow this pattern foo.bar[12]
        if (typeof first === "string" && /^\d+$/.test(first)) {
          return first;
        }

        const result = {
          type: "path",
          path: [first, ...rest],
        } as PathNode;
        result.toString = function () {
          if (this.path.length === 1 && typeof this.path[0] === "string") {
            return `v[${JSON.stringify(this.path[0])}]`;
          }
          return (
            "this.p(v,[" +
            this.path.map((val) => {
              return typeof val === "string"
                ? JSON.stringify(val)
                : String(val);
            }) +
            "])"
          );
        };
        return result;
      },
    );
  },

  MATCHING_DELIMITERS() {
    const consumeUntilUnescaped = (
      token: Parameters<typeof consume>[0],
    ): ReturnType<typeof zeroOrMany> => {
      return zeroOrMany(
        or([
          rule(this.MATCHING_DELIMITERS),
          and([not(peek(consume(token))), consume(Anything)], ([, a]) => a),
        ]),
        (a) => a.flat(1),
        consume(token),
      );
    };

    return or([
      consume(Whitespace),
      and(
        [
          not(consumeBehind(Backslash)),
          consume(LBrace),
          rule(this.ARG_MESSAGE_CONTENT),
          not(consumeBehind(Backslash)),
          consume(RBrace),
        ],
        ([, lb, content, , rb]) => [lb, content, rb],
      ),
      and(
        [
          not(consumeBehind(Backslash)),
          consume(LBracket),
          consumeUntilUnescaped(RBracket),
          not(consumeBehind(Backslash)),
          consume(RBracket),
        ],
        ([, lb, content, , rb]) => [lb, content, rb],
      ),
      and(
        [
          not(consumeBehind(Backslash)),
          consume(LParen),
          consumeUntilUnescaped(RParen),
          not(consumeBehind(Backslash)),
          consume(RParen),
        ],
        ([, lb, content, , rb]) => [lb, content, rb],
      ),
      and(
        [
          not(consumeBehind(Backslash)),
          consume(QuoteSingle),
          consumeUntil(QuoteSingle),
          not(consumeBehind(Backslash)),
          consume(QuoteSingle),
        ],
        ([, lb, content, , rb]) => [lb, content, rb],
      ),
      and(
        [
          not(consumeBehind(Backslash)),
          consume(QuoteDouble),
          consumeUntil(QuoteDouble),
          not(consumeBehind(Backslash)),
          consume(QuoteDouble),
        ],
        ([, lb, content, , rb]) => [lb, content, rb],
      ),
      and(
        [
          not(consumeBehind(Backslash)),
          consume(QuoteTick),
          consumeUntil(QuoteTick),
          not(consumeBehind(Backslash)),
          consume(QuoteTick),
        ],
        ([, lb, content, , rb]) => [lb, content, rb],
      ),
    ]);
  },

  ARG_MESSAGE_CONTENT() {
    return zeroOrMany(
      or([
        consume(Whitespace),
        rule(this.VARIABLE),
        and(
          [not(peek(consume(RBrace))), consume(Anything)],
          ([, text]) => text,
        ),
      ]),
    );
  },

  ARGS() {
    return and(
      [
        consume(Comma),
        zeroOrMany(consume(Whitespace)),
        oneOrMany(
          or([
            consume(Whitespace),
            rule(this.MATCHING_DELIMITERS),
            consume(Anything),
          ]),
          undefined,
          and([not(consumeBehind(Backslash)), consume(RBrace)]),
        ),
      ],
      ([, , text]) => text,
    );
  },

  TRANSFORMER(): Grammar<TransformerNode> {
    return and(
      [consume(Comma), consume(Identifier), zeroOrMany(rule(this.ARGS))],
      ([, name, args]) => ({
        type: "transformer",
        name,
        args: args?.flat(2).filter(Boolean),
      }),
    );
  },

  VARIABLE(): Grammar<VariableNode> {
    return and(
      [
        not(consumeBehind(Backslash)),
        consume(LBrace),
        rule(this.PATH),
        zeroOrOne(rule(this.TRANSFORMER)),
        not(consumeBehind(Backslash)),
        consume(RBrace),
      ],
      ([_, _lb, path, transformer, _rb]) => ({
        type: "variable",
        path,
        transformer,
        toString() {
          if (!transformer?.name) {
            return String(path);
          }

          function stringifyArgsRecursive(args: any): any {
            if (Array.isArray(args)) {
              return "[" + String(args.map(stringifyArgsRecursive)) + "]";
            } else if (
              args && typeof args === "object" &&
              typeof args.toString === "function"
            ) {
              return args.toString();
            } else {
              return JSON.stringify(args);
            }
          }

          const tName = JSON.stringify(transformer.name);
          const pathStr = String(path);
          const args = transformer.args;
          if (args && args.length) {
            return "this.d[" + tName + "](" + pathStr + ",this.l," +
              stringifyArgsRecursive(args) + ")";
          }
          return "this.d[" + tName + "](" + pathStr + ",this.l)";
        },
      } as VariableNode),
    );
  },

  // Message content (recursive)
  MESSAGE() {
    return zeroOrMany(
      or([consume(Whitespace), rule(this.VARIABLE), consume(Anything)]),
      (content) => ({
        type: "message",
        content,
        toString() {
          const segments: string[] = [];
          let textBuffer = "";
          for (const part of content) {
            if (typeof part === "string") {
              textBuffer += part;
            } else {
              // flush buffered text parts as a single JSON string
              if (textBuffer) {
                segments.push(JSON.stringify(textBuffer));
                textBuffer = "";
              }
              if (part && typeof part.toString === "function") {
                segments.push(part.toString());
              } else {
                segments.push(String(part));
              }
            }
          }
          if (textBuffer) {
            segments.push(JSON.stringify(textBuffer));
          }
          return segments.join("+");
        },
      } as MessageNode),
    );
  },
}, () => consume(Whitespace));

export function parseMessageFormat(input: string): MessageNode {
  return parser("MESSAGE", input);
}
