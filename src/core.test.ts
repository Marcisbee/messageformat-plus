import { expect } from "jsr:@std/expect";
import { MessageFormat } from "./core.ts";

Deno.test("MessageFormat works", async (t) => {
  const mf = new MessageFormat("en", {
    customFormatters: {
      upcase: (v: string) => String(v).toUpperCase(),
    },
  });

  await t.step("plain string", () => {
    expect(mf.compile("test")({})).toEqual("test");
  });

  await t.step("simple variable", () => {
    expect(mf.compile("Hello {name}")({ name: "Poop" })).toEqual("Hello Poop");
  });

  await t.step("missing nested path pieces", () => {
    expect(
      mf.compile("Hello {input.name}")({ name: "Poop" }),
    ).toEqual("Hello undefined");
    expect(
      mf.compile("Hello {input.name}")({ input: null }),
    ).toEqual("Hello undefined");
    expect(
      mf.compile("Hello {input.name}")({
        input: {} as Record<string, unknown>,
      }),
    ).toEqual("Hello undefined");
    expect(
      mf.compile("Hello {input.name}")({ input: { name: "Poop" } }),
    ).toEqual("Hello Poop");
  });

  await t.step("custom formatter", () => {
    expect(
      mf.compile("Hello {input.name, upcase}")({ input: { name: "Poop" } }),
    ).toEqual(
      "Hello POOP",
    );
  });

  const NOW = Date.parse("2016-02-21T12:00:00Z");

  await t.step("date default locale en", () => {
    expect(
      mf.compile("Today is {T, date}")({ T: NOW }),
    ).toEqual(
      "Today is Feb 21, 2016",
    );
  });

  await t.step("date with override locale fi", () => {
    expect(
      mf.compile("Tänään on {T, date}", "fi")({ T: NOW }),
    ).toEqual(
      "Tänään on 21. helmik. 2016",
    );
  });

  await t.step("date style full", () => {
    expect(
      mf.compile("Unix time started on {T, date, full}")({ T: 0 }),
    ).toEqual(
      "Unix time started on Thursday, January 1, 1970",
    );
  });

  await t.step("date style short", () => {
    expect(
      mf.compile("{sys} became operational on {d0, date, short}")({
        sys: "HAL 9000",
        d0: "12 January 1999",
      }),
    ).toEqual(
      "HAL 9000 became operational on 1/12/1999",
    );
  });

  await t.step("duration positive", () => {
    expect(
      mf.compile("It has been {D, duration}")({ D: 123 }),
    ).toEqual(
      "It has been 2:03",
    );
  });

  await t.step("duration negative countdown", () => {
    expect(
      mf.compile("Countdown: {D, duration}")({ D: -151200.42 }),
    ).toEqual(
      "Countdown: -42:00:00.420",
    );
  });
  await t.step("number default", () => {
    const expected = new Intl.NumberFormat("en").format(12345.67);
    expect(
      mf.compile("{N, number}")({ N: 12345.67 }),
    ).toEqual(expected);
  });

  await t.step("number integer", () => {
    const expected = new Intl.NumberFormat("en", {
      maximumFractionDigits: 0,
    }).format(3.14);
    expect(
      mf.compile("{N, number, integer}")({ N: 3.14 }),
    ).toEqual(expected);
  });

  await t.step("number percent", () => {
    const expected = new Intl.NumberFormat("en", { style: "percent" }).format(
      0.99,
    );
    expect(
      mf.compile("{P, number, percent}")({ P: 0.99 }),
    ).toEqual(expected);
  });

  await t.step("number currency default USD", () => {
    const expected = new Intl.NumberFormat("en", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(5.5);
    expect(
      mf.compile("The total is {V, number, currency}.")({ V: 5.5 }),
    ).toEqual(`The total is ${expected}.`);
  });

  await t.step("number currency explicit EUR", () => {
    const expected = new Intl.NumberFormat("en", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(5.5);
    expect(
      mf.compile("The total is {V, number, currency:EUR}.")({ V: 5.5 }),
    ).toEqual(`The total is ${expected}.`);
  });

  await t.step("select basic value match", () => {
    expect(
      mf.compile("{G, select, male{He} female{She} other{They}}")({
        G: "male",
      }),
    ).toEqual("He");
  });

  await t.step("select basic value match with spaces", () => {
    expect(
      mf.compile("{G, select, male {He} female {She} other {They}}")({
        G: "male",
      }),
    ).toEqual("He");
  });

  await t.step("select other fallback", () => {
    expect(
      mf.compile("{G, select, male{He} female{She} other{They}}")({
        G: "unknown",
      }),
    ).toEqual("They");
  });

  await t.step("time default includes seconds", () => {
    const out = mf.compile("{T, time}")({ T: NOW });
    const colons = (out.match(/:/g) || []).length;
    expect(colons).toBeGreaterThanOrEqual(2); // hh:mm:ss (may have more due to locale specifics)
  });

  await t.step("time short omits seconds", () => {
    const out = mf.compile("{T, time, short}")({ T: NOW });
    const colons = (out.match(/:/g) || []).length;
    expect(colons).toEqual(1); // hh:mm
  });

  await t.step("time long includes zone name", () => {
    const out = mf.compile("{T, time, long}")({ T: NOW });
    expect(out).toMatch(/GMT|UTC|[A-Z]{1,4}/);
  });

  await t.step("time full includes zone name", () => {
    const out = mf.compile("{T, time, full}")({ T: NOW });
    expect(out).toMatch(/GMT|UTC|[A-Z]{1,4}/);
  });

  await t.step("time accepts string date", () => {
    const out = mf.compile("{T, time}")({ T: "2016-02-21T12:00:00Z" });
    expect(out.length).toBeGreaterThan(4);
  });

  await t.step("number currency tokenization variants equal", () => {
    const v1 = mf.compile("{V, number, currency:EUR}")({ V: 5.5 });
    const v2 = mf.compile("{V, number, currency:EUR }")({ V: 5.5 });
    const v3 = mf.compile("{V, number, currency : EUR}")({ V: 5.5 });
    expect(v1).toEqual(v2);
    expect(v2).toEqual(v3);
  });

  await t.step("number NaN & Infinity", () => {
    expect(mf.compile("{X, number}")({ X: NaN })).toEqual("NaN");
    expect(mf.compile("{X, number}")({ X: Infinity })).toEqual("Infinity");
    expect(mf.compile("{X, number}")({ X: -Infinity })).toEqual("-Infinity");
  });

  await t.step("number negative currency formatting (loose assertion)", () => {
    const out = mf.compile("{V, number, currency:USD}")({ V: -12.34 });
    expect(out).toMatch(/12\.34/);
  });

  await t.step("number percent > 1 (ratio semantics)", () => {
    const pct = mf.compile("{R, number, percent}")({ R: 1.5 });
    expect(pct.replace(/[\s\u00A0]/g, "")).toMatch(/^150.?%$/);
  });

  await t.step("select missing other returns empty string", () => {
    const out = mf.compile("{G, select, male{He} female{She}}")({ G: "x" });
    expect(out).toEqual("");
  });

  await t.step("select numeric key matches numeric value", () => {
    const out = mf.compile("{V, select, 1{One} other{Other}}")({ V: 1 });
    expect(out).toEqual("One");
  });

  await t.step("unknown formatter throws", () => {
    expect(() => mf.compile("{X, nope}")({ X: 1 })).toThrow();
  });

  await t.step("custom formatter overrides base", () => {
    const mf2 = new MessageFormat("en", {
      customFormatters: {
        number: (v: unknown) => `#${v}#`,
      },
    });
    expect(mf2.compile("{V, number}")({ V: 12 })).toEqual("#12#");
  });

  await t.step("compile-time locale overrides instance", () => {
    const fn = mf.compile("Date: {T, date}", "fi");
    const out = fn({ T: NOW });
    expect(out).toMatch(/2016/);
  });

  await t.step("deep mixed path with bracket index", () => {
    const fn = mf.compile("Value: {a.b[0].c}");
    const out = fn({ a: { b: [{ c: 42 }] } });
    expect(out).toEqual("Value: 42");
  });

  await t.step("reuse compiled function with select", () => {
    const fn = mf.compile("Hi {name, select, alice{Alice} other{User}}");
    expect(fn({ name: "alice" })).toEqual("Hi Alice");
    expect(fn({ name: "bob" })).toEqual("Hi User");
  });

  await t.step("reuse compiled function with select with weird chars", () => {
    const fn = mf.compile(
      "Hi {name, select, alice-foo{Alice} bob.foo_@$!{Bob} other{User}}",
    );
    expect(fn({ name: "alice-foo" })).toEqual("Hi Alice");
    expect(fn({ name: "bob" })).toEqual("Hi User");
    expect(fn({ name: "bob.foo_@$!" })).toEqual("Hi Bob");
  });

  await t.step("compiled function with nested select", () => {
    const fn = mf.compile(
      "Hi {name, select, alice{Alice({name})} other{User}}",
    );
    expect(fn({ name: "alice" })).toEqual("Hi Alice(alice)");
    expect(fn({ name: "bob" })).toEqual("Hi User");
  });

  await t.step("compiled function with undefined value select", () => {
    const fn = mf.compile("Hi {name, select, other{{name}} undefined{user}}");
    expect(fn({ name: "alice" })).toEqual("Hi alice");
    expect(fn({ name: "bob" })).toEqual("Hi bob");
    expect(fn({})).toEqual("Hi user");
  });
});
