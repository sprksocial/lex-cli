"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lexiconsToDefTree = lexiconsToDefTree;
exports.schemasToNsidTokens = schemasToNsidTokens;
exports.toTitleCase = toTitleCase;
exports.toCamelCase = toCamelCase;
exports.toScreamingSnakeCase = toScreamingSnakeCase;
const syntax_1 = require("@atproto/syntax");
function lexiconsToDefTree(lexicons) {
    const tree = [];
    for (const lexicon of lexicons) {
        if (!lexicon.defs.main) {
            continue;
        }
        const node = getOrCreateNode(tree, lexicon.id.split('.').slice(0, -1));
        node.userTypes.push({ nsid: lexicon.id, def: lexicon.defs.main });
    }
    return tree;
}
function getOrCreateNode(tree, path) {
    let node;
    for (let i = 0; i < path.length; i++) {
        const segment = path[i];
        node = tree.find((v) => v.name === segment);
        if (!node) {
            node = {
                name: segment,
                className: `${toTitleCase(path.slice(0, i + 1).join('-'))}NS`,
                propName: toCamelCase(segment),
                children: [],
                userTypes: [],
            };
            tree.push(node);
        }
        tree = node.children;
    }
    if (!node)
        throw new Error(`Invalid schema path: ${path.join('.')}`);
    return node;
}
function schemasToNsidTokens(lexiconDocs) {
    const nsidTokens = {};
    for (const lexiconDoc of lexiconDocs) {
        const nsidp = syntax_1.NSID.parse(lexiconDoc.id);
        if (!nsidp.name)
            continue;
        for (const defId in lexiconDoc.defs) {
            const def = lexiconDoc.defs[defId];
            if (def.type !== 'token')
                continue;
            const authority = nsidp.segments.slice(0, -1).join('.');
            nsidTokens[authority] ?? (nsidTokens[authority] = []);
            nsidTokens[authority].push(nsidp.name + (defId === 'main' ? '' : `#${defId}`));
        }
    }
    return nsidTokens;
}
function toTitleCase(v) {
    v = v.replace(/^([a-z])/gi, (_, g) => g.toUpperCase()); // upper-case first letter
    v = v.replace(/[.#-]([a-z])/gi, (_, g) => g.toUpperCase()); // uppercase any dash, dot, or hash segments
    return v.replace(/[.-]/g, ''); // remove lefover dashes or dots
}
function toCamelCase(v) {
    v = v.replace(/[.#-]([a-z])/gi, (_, g) => g.toUpperCase()); // uppercase any dash, dot, or hash segments
    return v.replace(/[.-]/g, ''); // remove lefover dashes or dots
}
function toScreamingSnakeCase(v) {
    v = v.replace(/[.#-]+/gi, '_'); // convert dashes, dots, and hashes into underscores
    return v.toUpperCase(); // and scream!
}
//# sourceMappingURL=util.js.map