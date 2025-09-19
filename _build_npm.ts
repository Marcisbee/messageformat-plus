#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env --allow-run

import * as dnt from "jsr:@deno/dnt";
import denojson from "./deno.json" with { type: "json" };

async function start() {
  await dnt.emptyDir("./npm");

  await dnt.build({
    entryPoints: ["./src/core.ts"],
    outDir: "./npm",
    shims: {},
    typeCheck: false,
    test: false,
    compilerOptions: {
      importHelpers: true,
      target: "ES2021",
    },
    package: {
      name: "messageformat-plus",
      version: denojson.version,
      description:
        "Messageformat with flexible parser and minimal spec deviation",
      license: "MIT",
      repository: {
        type: "git",
        url: "git+https://github.com/Marcisbee/messageformat-plus.git",
      },
      bugs: {
        url: "https://github.com/Marcisbee/messageformat-plus/issues",
      },
    },
    declaration: "inline",

    async postBuild() {
      await Deno.copyFile("LICENSE", "npm/LICENSE");
      await Deno.copyFile("README.md", "npm/README.md");
    },
  });
}

start();
