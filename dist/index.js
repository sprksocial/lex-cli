#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const commander_1 = require("commander");
const yesno_1 = __importDefault(require("yesno"));
const client_1 = require("./codegen/client");
const server_1 = require("./codegen/server");
const mdGen = __importStar(require("./mdgen"));
const util_1 = require("./util");
const program = new commander_1.Command();
program.name('lex').description('Lexicon CLI').version('0.0.0');
program
    .command('gen-md')
    .description('Generate markdown documentation')
    .option('--yes', 'skip confirmation')
    .argument('<outfile>', 'path of the file to write to', toPath)
    .argument('<lexicons...>', 'paths of the lexicon files to include', toPaths)
    .action(async (outFile, lexiconPaths, o) => {
    if (!outFile.endsWith('.md')) {
        console.error('Must supply the path to a .md file as the first parameter');
        process.exit(1);
    }
    if (!o?.yes)
        await confirmOrExit();
    console.log('Writing', outFile);
    const lexicons = (0, util_1.readAllLexicons)(lexiconPaths);
    await mdGen.process(outFile, lexicons);
});
program
    .command('gen-ts-obj')
    .description('Generate a TS file that exports an array of lexicons')
    .argument('<lexicons...>', 'paths of the lexicon files to include', toPaths)
    .action((lexiconPaths) => {
    const lexicons = (0, util_1.readAllLexicons)(lexiconPaths);
    console.log((0, util_1.genTsObj)(lexicons));
});
program
    .command('gen-api')
    .description('Generate a TS client API')
    .option('--yes', 'skip confirmation')
    .argument('<outdir>', 'path of the directory to write to', toPath)
    .argument('<lexicons...>', 'paths of the lexicon files to include', toPaths)
    .action(async (outDir, lexiconPaths, o) => {
    const lexicons = (0, util_1.readAllLexicons)(lexiconPaths);
    const api = await (0, client_1.genClientApi)(lexicons);
    const diff = (0, util_1.genFileDiff)(outDir, api);
    console.log('This will write the following files:');
    (0, util_1.printFileDiff)(diff);
    if (!o?.yes)
        await confirmOrExit();
    (0, util_1.applyFileDiff)(diff);
    console.log('API generated.');
});
program
    .command('gen-server')
    .description('Generate a TS server API')
    .option('--yes', 'skip confirmation')
    .argument('<outdir>', 'path of the directory to write to', toPath)
    .argument('<lexicons...>', 'paths of the lexicon files to include', toPaths)
    .action(async (outDir, lexiconPaths, o) => {
    const lexicons = (0, util_1.readAllLexicons)(lexiconPaths);
    const api = await (0, server_1.genServerApi)(lexicons);
    const diff = (0, util_1.genFileDiff)(outDir, api);
    console.log('This will write the following files:');
    (0, util_1.printFileDiff)(diff);
    if (!o?.yes)
        await confirmOrExit();
    (0, util_1.applyFileDiff)(diff);
    console.log('API generated.');
});
program.parse();
function toPath(v) {
    return v ? node_path_1.default.resolve(v) : undefined;
}
function toPaths(v, acc) {
    acc = acc || [];
    acc.push(node_path_1.default.resolve(v));
    return acc;
}
async function confirmOrExit() {
    const ok = await (0, yesno_1.default)({
        question: 'Are you sure you want to continue? [y/N]',
        defaultValue: false,
    });
    if (!ok) {
        console.log('Aborted.');
        process.exit(0);
    }
}
//# sourceMappingURL=index.js.map