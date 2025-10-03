import { default as MF2 } from "npm:messageformat@2.3.0";
import { MessageFormat as MFP4 } from "jsr:@marcisbee/mf@0.4.0";
import { MessageFormat as MFP5 } from "jsr:@marcisbee/mf@0.5.0";

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
  "mf",
  "\n  ",
  new MF2("en", { customFormatters }).compile(input)(data),
  "\n",
);

// Benchmarks
Deno.bench("mf+@dev", { group: "full" }, () => {
  new Custom("en", { customFormatters }).compile(input)(data);
});

Deno.bench("mf+@0.4.0", { group: "full" }, () => {
  new MFP4("en", { customFormatters }).compile(input)(data);
});

Deno.bench("mf+@0.5.0", { group: "full" }, () => {
  new MFP5("en", { customFormatters }).compile(input)(data);
});

Deno.bench("mf@2.3.0", { group: "full" }, () => {
  new MF2("en", { customFormatters }).compile(input)(data);
});

Deno.bench("mf+@dev", { group: "compile" }, () => {
  new Custom("en", { customFormatters }).compile(input);
});

Deno.bench("mf+@0.4.0", { group: "compile" }, () => {
  new MFP4("en", { customFormatters }).compile(input);
});

Deno.bench("mf+@0.5.0", { group: "compile" }, () => {
  new MFP5("en", { customFormatters }).compile(input);
});

Deno.bench("mf@2.3.0", { group: "compile" }, () => {
  new MF2("en", { customFormatters }).compile(input);
});

const mfthis = new Custom("en", { customFormatters }).compile(input);
console.log(
  new Function("v", `return ${parseMessageFormat(input)}`).toString(),
);
Deno.bench("mf+@dev", { group: "eval" }, () => {
  mfthis(data);
});

const mfp4 = new MFP4("en", { customFormatters }).compile(input);
Deno.bench("mf+@0.4.0", { group: "eval" }, () => {
  mfp4(data);
});

const mfp5 = new MFP5("en", { customFormatters }).compile(input);
Deno.bench("mf+@0.5.0", { group: "eval" }, () => {
  mfp5(data);
});

const mf2 = new MF2("en", { customFormatters }).compile(input);
console.log(mf2.toString());
Deno.bench("mf@2.3.0", { group: "eval" }, () => {
  mf2(data);
});
