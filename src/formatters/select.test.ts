import { expect } from "jsr:@std/expect";
import { select } from "./select.ts";

Deno.test("select formatter", async (t) => {
  await t.step("returns matching value without spaces", () => {
    const args = [
      "male",
      "{",
      ["He"],
      "}",
      " ",
      "female",
      "{",
      ["She"],
      "}",
      " ",
      "other",
      "{",
      ["They"],
      "}",
    ];
    expect(select("male", "en", args)).toEqual("He");
    expect(select("female", "en", args)).toEqual("She");
  });

  await t.step("returns matching value with spaces before braces", () => {
    const args = [
      "male",
      " ",
      "{",
      ["He"],
      "}",
      " ",
      "female",
      " ",
      "{",
      ["She"],
      "}",
      " ",
      "other",
      " ",
      "{",
      ["They"],
      "}",
    ];
    expect(select("male", "en", args)).toEqual("He");
    expect(select("female", "en", args)).toEqual("She");
  });

  await t.step("returns other fallback for unmatched value", () => {
    const args = [
      "male",
      "{",
      ["He"],
      "}",
      " ",
      "female",
      "{",
      ["She"],
      "}",
      " ",
      "other",
      "{",
      ["They"],
      "}",
    ];
    expect(select("unknown", "en", args)).toEqual("They");
  });

  await t.step("returns other fallback with spaces before braces", () => {
    const args = [
      "male",
      " ",
      "{",
      ["He"],
      "}",
      " ",
      "female",
      " ",
      "{",
      ["She"],
      "}",
      " ",
      "other",
      " ",
      "{",
      ["They"],
      "}",
    ];
    expect(select("unknown", "en", args)).toEqual("They");
  });

  await t.step("returns empty string when no match and no other", () => {
    const args = ["male", "{", ["He"], "}", " ", "female", "{", ["She"], "}"];
    expect(select("unknown", "en", args)).toEqual("");
  });

  await t.step("handles numeric keys", () => {
    const args = [
      "1",
      "{",
      ["One"],
      "}",
      " ",
      "2",
      "{",
      ["Two"],
      "}",
      " ",
      "other",
      "{",
      ["Other"],
      "}",
    ];
    expect(select(1, "en", args)).toEqual("One");
    expect(select(2, "en", args)).toEqual("Two");
    expect(select(3, "en", args)).toEqual("Other");
  });

  await t.step("handles keys with special characters", () => {
    const args = [
      "alice",
      "-",
      "foo",
      "{",
      ["Alice"],
      "}",
      " ",
      "bob",
      ".",
      "bar",
      "{",
      ["Bob"],
      "}",
      " ",
      "other",
      "{",
      ["Other"],
      "}",
    ];
    expect(select("alice-foo", "en", args)).toEqual("Alice");
    expect(select("bob.bar", "en", args)).toEqual("Bob");
  });

  await t.step("handles keys with underscores and symbols", () => {
    const args = ["foo_", "@$!", "{", ["Foo"], "}", " ", "other", "{", [
      "Other",
    ], "}"];
    expect(select("foo_@$!", "en", args)).toEqual("Foo");
  });

  await t.step("handles nested array content", () => {
    const args = ["yes", "{", ["Hello ", ["World"]], "}", " ", "other", "{", [
      "Bye",
    ], "}"];
    expect(select("yes", "en", args)).toEqual("Hello World");
  });

  await t.step("handles empty args", () => {
    expect(select("any", "en", [])).toEqual("");
    expect(select("any", "en", undefined)).toEqual("");
  });

  await t.step("handles null and undefined content", () => {
    const args = [
      "test",
      "{",
      [null, undefined, "text"],
      "}",
      " ",
      "other",
      "{",
      ["Other"],
      "}",
    ];
    expect(select("test", "en", args)).toEqual("text");
  });

  await t.step("handles multiple spaces between key and brace", () => {
    const args = [
      "key",
      " ",
      " ",
      " ",
      "{",
      ["Value"],
      "}",
      " ",
      "other",
      "{",
      ["Other"],
      "}",
    ];
    expect(select("key", "en", args)).toEqual("Value");
  });

  await t.step("handles mixed spacing styles", () => {
    const args = [
      "a",
      "{",
      ["A"],
      "}",
      " ",
      "b",
      " ",
      "{",
      ["B"],
      "}",
      " ",
      "other",
      "{",
      ["Other"],
      "}",
    ];
    expect(select("a", "en", args)).toEqual("A");
    expect(select("b", "en", args)).toEqual("B");
  });

  await t.step("handles undefined as key value", () => {
    const args = ["undefined", "{", ["Undefined"], "}", " ", "other", "{", [
      "Other",
    ], "}"];
    expect(select(undefined, "en", args)).toEqual("Undefined");
  });

  await t.step("handles null as key value", () => {
    const args = [
      "null",
      "{",
      ["Null"],
      "}",
      " ",
      "other",
      "{",
      ["Other"],
      "}",
    ];
    expect(select(null, "en", args)).toEqual("Null");
  });

  await t.step("prefers exact match over other", () => {
    const args = ["other", "{", ["Other"], "}", " ", "specific", "{", [
      "Specific",
    ], "}"];
    expect(select("other", "en", args)).toEqual("Other");
    expect(select("specific", "en", args)).toEqual("Specific");
  });
});
