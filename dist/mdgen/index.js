"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.process = process;
const node_fs_1 = __importDefault(require("node:fs"));
const INSERT_START = [
    '<!-- START lex generated content. Please keep comment here to allow auto update -->',
    "<!-- DON'T EDIT THIS SECTION! INSTEAD RE-RUN lex TO UPDATE -->",
];
const INSERT_END = [
    '<!-- END lex generated TOC please keep comment here to allow auto update -->',
];
async function process(outFilePath, lexicons) {
    let existingContent = '';
    try {
        existingContent = node_fs_1.default.readFileSync(outFilePath, 'utf8');
    }
    catch (e) {
        // ignore - no existing content
    }
    const fileLines = existingContent.split('\n');
    // find previously generated content
    let startIndex = fileLines.findIndex((line) => matchesStart(line));
    let endIndex = fileLines.findIndex((line) => matchesEnd(line));
    if (startIndex === -1) {
        startIndex = fileLines.length;
    }
    if (endIndex === -1) {
        endIndex = fileLines.length;
    }
    // generate & insert content
    fileLines.splice(startIndex, endIndex - startIndex + 1, [
        INSERT_START,
        await genMdLines(lexicons),
        INSERT_END,
    ]);
    node_fs_1.default.writeFileSync(outFilePath, merge(fileLines), 'utf8');
}
async function genMdLines(lexicons) {
    const doc = [];
    for (const lexicon of lexicons) {
        console.log(lexicon.id);
        const desc = [];
        if (lexicon.description) {
            desc.push(lexicon.description, ``);
        }
        doc.push([
            `---`,
            ``,
            `## ${lexicon.id}`,
            '',
            desc,
            '```json',
            JSON.stringify(lexicon, null, 2),
            '```',
        ]);
    }
    return doc;
}
function merge(arr) {
    return arr
        .flat(10)
        .filter((v) => typeof v === 'string')
        .join('\n');
}
function matchesStart(line) {
    return /<!-- START lex /.test(line);
}
function matchesEnd(line) {
    return /<!-- END lex /.test(line);
}
//# sourceMappingURL=index.js.map