import { MessageFormat } from "./core.ts";
import { expect } from "jsr:@std/expect";

Deno.test("MessageFormat works", async (t) => {
  const mf = new MessageFormat("en", {
    customFormatters: {
      upcase: (v: string) => String(v).toUpperCase(),
    },
  });

  await t.step("plain string", () => {
    expect(mf.compile("test")()).toEqual("test");
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
});
