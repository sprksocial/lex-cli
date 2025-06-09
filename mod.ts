#!/usr/bin/env node

import { resolve } from "@std/path";
import { Command } from "commander";
import yesno from "yesno";
import { genClientApi } from "./src/codegen/client.ts";
import { genServerApi } from "./src/codegen/server.ts";
import * as mdGen from "./src/mdgen/index.ts";
import {
  applyFileDiff,
  genFileDiff,
  genTsObj,
  printFileDiff,
  readAllLexicons,
} from "./src/util.ts";

const program = new Command();
program.name("lex").description("Lexicon CLI").version("0.0.0");

program
  .command("gen-md")
  .description("Generate markdown documentation")
  .option("--yes", "skip confirmation")
  .argument("<outfile>", "path of the file to write to", toPath)
  .argument("<lexicons...>", "paths of the lexicon files to include", toPaths)
  .action(
    async (outFile: string, lexiconPaths: string[], o: { yes?: true }) => {
      if (!outFile.endsWith(".md")) {
        console.error(
          "Must supply the path to a .md file as the first parameter",
        );
        Deno.exit(1);
      }
      if (!o?.yes) await confirmOrExit();
      console.log("Writing", outFile);
      const lexicons = readAllLexicons(lexiconPaths);
      await mdGen.process(outFile, lexicons);
    },
  );

program
  .command("gen-ts-obj")
  .description("Generate a TS file that exports an array of lexicons")
  .argument("<lexicons...>", "paths of the lexicon files to include", toPaths)
  .action((lexiconPaths: string[]) => {
    const lexicons = readAllLexicons(lexiconPaths);
    console.log(genTsObj(lexicons));
  });

program
  .command("gen-api")
  .description("Generate a TS client API")
  .option("--yes", "skip confirmation")
  .option("--js", "use .js extension for imports instead of .ts")
  .argument("<outdir>", "path of the directory to write to", toPath)
  .argument("<lexicons...>", "paths of the lexicon files to include", toPaths)
  .action(
    async (
      outDir: string,
      lexiconPaths: string[],
      o: { yes?: true; js?: true },
    ) => {
      const lexicons = readAllLexicons(lexiconPaths);
      const api = await genClientApi(lexicons, {
        useJsExtension: o.js,
      });
      const diff = genFileDiff(outDir, api);
      console.log("This will write the following files:");
      printFileDiff(diff);
      if (!o?.yes) await confirmOrExit();
      applyFileDiff(diff);
      console.log("API generated.");
    },
  );

program
  .command("gen-server")
  .description("Generate a TS server API")
  .option("--yes", "skip confirmation")
  .option("--js", "use .js extension for imports instead of .ts")
  .option(
    "--hono-import <path>",
    'specify import path for Hono (defaults to "@hono/hono")',
  )
  .argument("<outdir>", "path of the directory to write to", toPath)
  .argument("<lexicons...>", "paths of the lexicon files to include", toPaths)
  .action(
    async (
      outDir: string,
      lexiconPaths: string[],
      o: { yes?: true; honoImport?: string; js?: true },
    ) => {
      const lexicons = readAllLexicons(lexiconPaths);
      const api = await genServerApi(lexicons, {
        honoImportPath: o.honoImport,
        useJsExtension: o.js,
      });
      const diff = genFileDiff(outDir, api);
      console.log("This will write the following files:");
      printFileDiff(diff);
      if (!o?.yes) await confirmOrExit();
      applyFileDiff(diff);
      console.log("API generated.");
    },
  );

program.parse();

function toPath(v: string) {
  return v ? resolve(v) : undefined;
}

function toPaths(v: string, acc: string[]) {
  acc = acc || [];
  acc.push(resolve(v));
  return acc;
}

async function confirmOrExit() {
  const ok = await yesno({
    question: "Are you sure you want to continue? [y/N]",
    defaultValue: false,
  });
  if (!ok) {
    console.log("Aborted.");
    Deno.exit(0);
  }
}
