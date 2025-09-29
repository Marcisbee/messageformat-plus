import { default as MF2 } from "npm:messageformat@2.3.0";
import { MessageFormat as CustomPrevious } from "jsr:@marcisbee/mf@0.4.0";

import { MessageFormat as Custom } from "./core.ts";
import { parseMessageFormat } from "./parser.ts";

const customFormatters = {
  upcase: (str: string) => str.toUpperCase(),
};
const input = `Hello {a} {salutation} {user,upcase}!`;
const data = { salutation: "mr", user: "Test" };

// Actual output
console.log(
  "custom:",
  "\n  ",
  new Custom("en", { customFormatters }).compile(input)(data),
  "\n",
);
console.log(
  "messageformat@2.3.0:",
  "\n  ",
  new MF2("en", { customFormatters }).compile(input)(data),
  "\n",
);

// Benchmarks
Deno.bench("custom", { group: "full" }, () => {
  new Custom("en", { customFormatters }).compile(input)(data);
});

Deno.bench("custom@latest", { group: "full" }, () => {
  new CustomPrevious("en", { customFormatters }).compile(input)(data);
});

Deno.bench("messageformat@2.3.0", { group: "full" }, () => {
  new MF2("en", { customFormatters }).compile(input)(data);
});

Deno.bench("custom", { group: "compile" }, () => {
  new Custom("en", { customFormatters }).compile(input);
});

Deno.bench("custom@latest", { group: "compile" }, () => {
  new CustomPrevious("en", { customFormatters }).compile(input);
});

Deno.bench("messageformat@2.3.0", { group: "compile" }, () => {
  new MF2("en", { customFormatters }).compile(input);
});

const mfthis = new Custom("en", { customFormatters }).compile(input);
console.log(
  new Function("v", `return ${parseMessageFormat(input)}`).toString(),
);
Deno.bench("custom", { group: "eval" }, () => {
  mfthis(data);
});

const mfprev = new CustomPrevious("en", { customFormatters }).compile(input);
Deno.bench("custom@latest", { group: "eval" }, () => {
  mfprev(data);
});

const mf2 = new MF2("en", { customFormatters }).compile(input);
console.log(mf2.toString());
Deno.bench("messageformat@2.3.0", { group: "eval" }, () => {
  mf2(data);
});
