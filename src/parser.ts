import {
  createPattern,
  createToken,
  EOF,
  getComposedTokens,
  nanolex,
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

const tokens = getComposedTokens([
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
]);

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

// Create patterns
const TEXT = createPattern("text");
const PATH_SEGMENT = createPattern("path_segment");
const PATH = createPattern("path");
const MATCHING_DELIMITERS = createPattern("matching_delimiters");
const ARG_MESSAGE_CONTENT = createPattern("arg_message_content");
const ARGS = createPattern("args");
const TRANSFORMER = createPattern("transformer");
const VARIABLE = createPattern("variable");
const MESSAGE = createPattern("message");

export function parseMessageFormat(input: string): MessageNode {
  const {
    consume,
    consumeBehind,
    consumeUntil,
    not,
    and,
    or,
    zeroOrMany,
    oneOrMany,
    zeroOrOne,
    peek,
    patternToSkip,
    throwIfError,
  } = nanolex(input, tokens);

  // Skip whitespace
  patternToSkip(consume(Whitespace));

  function consumeUntilUnescaped(
    token: Parameters<typeof consume>[0],
  ): ReturnType<typeof zeroOrMany> {
    return zeroOrMany(
      or([
        MATCHING_DELIMITERS,
        and([not(peek(consume(token))), consume(Anything)], ([, a]) => a),
      ]),
      (a) => a.flat(1),
      consume(token),
    );
  }

  // Set pattern definitions
  TEXT.set = consume(Anything);

  PATH_SEGMENT.set = or([
    consume(Identifier),
    and([consume(LBracket), PATH, consume(RBracket)], ([, path]) => path),
  ]);

  PATH.set = and(
    [
      PATH_SEGMENT,
      zeroOrMany(
        or([
          and([consume(Dot), consume(Identifier)], ([, id]) => id),
          and(
            [consume(LBracket), PATH, consume(RBracket)],
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
      };
      result.toString = function () {
        if (this.path.length === 1 && typeof this.path[0] === "string") {
          return `v[${JSON.stringify(this.path[0])}]`;
        }
        return (
          "this.p(v,[" +
          this.path.map((val) => {
            return typeof val === "string" ? JSON.stringify(val) : String(val);
          }) +
          "])"
        );
      };
      return result;
    },
  );

  MATCHING_DELIMITERS.set = or([
    consume(Whitespace),
    and(
      [
        not(consumeBehind(Backslash)),
        consume(LBrace),
        ARG_MESSAGE_CONTENT,
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

  ARG_MESSAGE_CONTENT.set = zeroOrMany(
    or([
      consume(Whitespace),
      VARIABLE,
      and([not(peek(consume(RBrace))), TEXT], ([, text]) => text),
    ]),
  );

  ARGS.set = and(
    [
      consume(Comma),
      zeroOrMany(consume(Whitespace)),
      oneOrMany(
        or([consume(Whitespace), MATCHING_DELIMITERS, TEXT]),
        undefined,
        and([not(consumeBehind(Backslash)), consume(RBrace)]),
      ),
    ],
    ([, , text]) => text,
  );

  TRANSFORMER.set = and(
    [consume(Comma), consume(Identifier), zeroOrMany(ARGS)],
    ([, name, args]) => ({
      type: "transformer",
      name,
      args: args?.flat(2).filter(Boolean),
    }),
  );

  VARIABLE.set = and(
    [
      not(consumeBehind(Backslash)),
      consume(LBrace),
      PATH,
      zeroOrOne(TRANSFORMER),
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
    }),
  );

  // Message content (recursive)
  MESSAGE.set = zeroOrMany(
    or([consume(Whitespace), VARIABLE, TEXT]),
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
    }),
  );

  // Run parser
  const [output] = throwIfError(and([MESSAGE, consume(EOF)]));
  return output;
}
