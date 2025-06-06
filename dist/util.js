"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readAllLexicons = readAllLexicons;
exports.readLexicon = readLexicon;
exports.genTsObj = genTsObj;
exports.genFileDiff = genFileDiff;
exports.printFileDiff = printFileDiff;
exports.applyFileDiff = applyFileDiff;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = require("node:path");
const chalk_1 = __importDefault(require("chalk"));
const zod_1 = require("zod");
const lexicon_1 = require("@atproto/lexicon");
function readAllLexicons(paths) {
    const docs = [];
    for (const path of paths) {
        if (!path.endsWith('.json') || !node_fs_1.default.statSync(path).isFile()) {
            continue;
        }
        try {
            docs.push(readLexicon(path));
        }
        catch (e) {
            // skip
        }
    }
    return docs;
}
function readLexicon(path) {
    let str;
    let obj;
    try {
        str = node_fs_1.default.readFileSync(path, 'utf8');
    }
    catch (e) {
        console.error(`Failed to read file`, path);
        throw e;
    }
    try {
        obj = JSON.parse(str);
    }
    catch (e) {
        console.error(`Failed to parse JSON in file`, path);
        throw e;
    }
    if (obj &&
        typeof obj === 'object' &&
        typeof obj.lexicon === 'number') {
        try {
            return (0, lexicon_1.parseLexiconDoc)(obj);
        }
        catch (e) {
            console.error(`Invalid lexicon`, path);
            if (e instanceof zod_1.ZodError) {
                printZodError(e.format());
            }
            throw e;
        }
    }
    else {
        console.error(`Not lexicon schema`, path);
        throw new Error(`Not lexicon schema`);
    }
}
function genTsObj(lexicons) {
    return `export const lexicons = ${JSON.stringify(lexicons, null, 2)}`;
}
function genFileDiff(outDir, api) {
    const diffs = [];
    const existingFiles = readdirRecursiveSync(outDir);
    for (const file of api.files) {
        file.path = (0, node_path_1.join)(outDir, file.path);
        if (existingFiles.includes(file.path)) {
            diffs.push({ act: 'mod', path: file.path, content: file.content });
        }
        else {
            diffs.push({ act: 'add', path: file.path, content: file.content });
        }
    }
    for (const filepath of existingFiles) {
        if (api.files.find((f) => f.path === filepath)) {
            // do nothing
        }
        else {
            diffs.push({ act: 'del', path: filepath });
        }
    }
    return diffs;
}
function printFileDiff(diff) {
    for (const d of diff) {
        switch (d.act) {
            case 'add':
                console.log(`${chalk_1.default.greenBright('[+ add]')} ${d.path}`);
                break;
            case 'mod':
                console.log(`${chalk_1.default.yellowBright('[* mod]')} ${d.path}`);
                break;
            case 'del':
                console.log(`${chalk_1.default.redBright('[- del]')} ${d.path}`);
                break;
        }
    }
}
function applyFileDiff(diff) {
    for (const d of diff) {
        switch (d.act) {
            case 'add':
            case 'mod':
                node_fs_1.default.mkdirSync((0, node_path_1.join)(d.path, '..'), { recursive: true }); // lazy way to make sure the parent dir exists
                node_fs_1.default.writeFileSync(d.path, d.content || '', 'utf8');
                break;
            case 'del':
                node_fs_1.default.unlinkSync(d.path);
                break;
        }
    }
}
function printZodError(node, path = '') {
    if (node._errors?.length) {
        console.log(chalk_1.default.red(`Issues at ${path}:`));
        for (const err of dedup(node._errors)) {
            console.log(chalk_1.default.red(` - ${err}`));
        }
        return true;
    }
    else {
        for (const k in node) {
            if (k === '_errors') {
                continue;
            }
            printZodError(node[k], `${path}/${k}`);
        }
    }
    return false;
}
function readdirRecursiveSync(root, files = [], prefix = '') {
    const dir = (0, node_path_1.join)(root, prefix);
    if (!node_fs_1.default.existsSync(dir))
        return files;
    if (node_fs_1.default.statSync(dir).isDirectory())
        node_fs_1.default.readdirSync(dir).forEach(function (name) {
            readdirRecursiveSync(root, files, (0, node_path_1.join)(prefix, name));
        });
    else if (prefix.endsWith('.ts')) {
        files.push((0, node_path_1.join)(root, prefix));
    }
    return files;
}
function dedup(arr) {
    return Array.from(new Set(arr));
}
//# sourceMappingURL=util.js.map