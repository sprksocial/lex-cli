"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genComment = genComment;
exports.genCommonImports = genCommonImports;
exports.genImports = genImports;
exports.genUserType = genUserType;
exports.genToken = genToken;
exports.genArray = genArray;
exports.genPrimitiveOrBlob = genPrimitiveOrBlob;
exports.genXrpcParams = genXrpcParams;
exports.genXrpcInput = genXrpcInput;
exports.genXrpcOutput = genXrpcOutput;
exports.genRecord = genRecord;
exports.stripScheme = stripScheme;
exports.stripHash = stripHash;
exports.getHash = getHash;
exports.ipldToType = ipldToType;
exports.primitiveOrBlobToType = primitiveOrBlobToType;
exports.primitiveToType = primitiveToType;
const posix_1 = require("node:path/posix");
const ts_morph_1 = require("ts-morph");
const util_1 = require("./util");
function genComment(commentable, def) {
    if (def.description) {
        commentable.addJsDoc({ description: def.description });
    }
    return commentable;
}
function genCommonImports(file, baseNsid) {
    //= import {ValidationResult, BlobRef} from '@atproto/lexicon'
    file
        .addImportDeclaration({
        moduleSpecifier: '@atproto/lexicon',
    })
        .addNamedImports([
        { name: 'ValidationResult', isTypeOnly: true },
        { name: 'BlobRef' },
    ]);
    //= import {CID} from 'multiformats/cid'
    file
        .addImportDeclaration({
        moduleSpecifier: 'multiformats/cid',
    })
        .addNamedImports([{ name: 'CID' }]);
    //= import { validate as _validate } from '../../lexicons.ts'
    file
        .addImportDeclaration({
        moduleSpecifier: `${baseNsid
            .split('.')
            .map((_str) => '..')
            .join('/')}/lexicons`,
    })
        .addNamedImports([{ name: 'validate', alias: '_validate' }]);
    //= import { type $Typed, is$typed as _is$typed, type OmitKey } from '../[...]/util.ts'
    file
        .addImportDeclaration({
        moduleSpecifier: `${baseNsid
            .split('.')
            .map((_str) => '..')
            .join('/')}/util`,
    })
        .addNamedImports([
        { name: '$Typed', isTypeOnly: true },
        { name: 'is$typed', alias: '_is$typed' },
        { name: 'OmitKey', isTypeOnly: true },
    ]);
    // tsc adds protection against circular imports, which hurts bundle size.
    // Since we know that lexicon.ts and util.ts do not depend on the file being
    // generated, we can safely bypass this protection.
    // Note that we are not using `import * as util from '../../util'` because
    // typescript will emit is own helpers for the import, which we want to avoid.
    file.addVariableStatement({
        isExported: false,
        declarationKind: ts_morph_1.VariableDeclarationKind.Const,
        declarations: [
            { name: 'is$typed', initializer: '_is$typed' },
            { name: 'validate', initializer: '_validate' },
        ],
    });
    //= const id = "{baseNsid}"
    file.addVariableStatement({
        isExported: false, // Do not export to allow tree-shaking
        declarationKind: ts_morph_1.VariableDeclarationKind.Const,
        declarations: [{ name: 'id', initializer: JSON.stringify(baseNsid) }],
    });
}
function genImports(file, imports, baseNsid) {
    const startPath = '/' + baseNsid.split('.').slice(0, -1).join('/');
    for (const nsid of imports) {
        const targetPath = '/' + nsid.split('.').join('/') + '.js';
        let resolvedPath = (0, posix_1.relative)(startPath, targetPath);
        if (!resolvedPath.startsWith('.')) {
            resolvedPath = `./${resolvedPath}`;
        }
        file.addImportDeclaration({
            isTypeOnly: true,
            moduleSpecifier: resolvedPath,
            namespaceImport: (0, util_1.toTitleCase)(nsid),
        });
    }
}
function genUserType(file, imports, lexicons, lexUri) {
    const def = lexicons.getDefOrThrow(lexUri);
    switch (def.type) {
        case 'array':
            genArray(file, imports, lexUri, def);
            break;
        case 'token':
            genToken(file, lexUri, def);
            break;
        case 'object': {
            const ifaceName = (0, util_1.toTitleCase)(getHash(lexUri));
            genObject(file, imports, lexUri, def, ifaceName, {
                typeProperty: true,
            });
            genObjHelpers(file, lexUri, ifaceName, {
                requireTypeProperty: false,
            });
            break;
        }
        case 'blob':
        case 'bytes':
        case 'cid-link':
        case 'boolean':
        case 'integer':
        case 'string':
        case 'unknown':
            genPrimitiveOrBlob(file, lexUri, def);
            break;
        default:
            throw new Error(`genLexUserType() called with wrong definition type (${def.type}) in ${lexUri}`);
    }
}
function genObject(file, imports, lexUri, def, ifaceName, { defaultsArePresent = true, allowUnknownProperties = false, typeProperty = false, } = {}) {
    const iface = file.addInterface({
        name: ifaceName,
        isExported: true,
    });
    genComment(iface, def);
    if (typeProperty) {
        const hash = getHash(lexUri);
        const baseNsid = stripScheme(stripHash(lexUri));
        //= $type?: <uri>
        iface.addProperty({
            name: typeProperty === 'required' ? `$type` : `$type?`,
            type: 
            // Not using $Type here because it is less readable than a plain string
            // `$Type<${JSON.stringify(baseNsid)}, ${JSON.stringify(hash)}>`
            hash === 'main'
                ? JSON.stringify(`${baseNsid}`)
                : JSON.stringify(`${baseNsid}#${hash}`),
        });
    }
    const nullableProps = new Set(def.nullable);
    if (def.properties) {
        for (const propKey in def.properties) {
            const propDef = def.properties[propKey];
            const propNullable = nullableProps.has(propKey);
            const req = def.required?.includes(propKey) ||
                (defaultsArePresent &&
                    'default' in propDef &&
                    propDef.default !== undefined);
            if (propDef.type === 'ref' || propDef.type === 'union') {
                //= propName: External|External
                const types = propDef.type === 'union'
                    ? propDef.refs.map((ref) => refToUnionType(ref, lexUri, imports))
                    : [refToType(propDef.ref, stripScheme(stripHash(lexUri)), imports)];
                if (propDef.type === 'union' && !propDef.closed) {
                    types.push('{ $type: string }');
                }
                iface.addProperty({
                    name: `${propKey}${req ? '' : '?'}`,
                    type: makeType(types, { nullable: propNullable }),
                });
                continue;
            }
            else {
                if (propDef.type === 'array') {
                    //= propName: type[]
                    let propAst;
                    if (propDef.items.type === 'ref') {
                        propAst = iface.addProperty({
                            name: `${propKey}${req ? '' : '?'}`,
                            type: makeType(refToType(propDef.items.ref, stripScheme(stripHash(lexUri)), imports), {
                                nullable: propNullable,
                                array: true,
                            }),
                        });
                    }
                    else if (propDef.items.type === 'union') {
                        const types = propDef.items.refs.map((ref) => refToUnionType(ref, lexUri, imports));
                        if (!propDef.items.closed) {
                            types.push('{ $type: string }');
                        }
                        propAst = iface.addProperty({
                            name: `${propKey}${req ? '' : '?'}`,
                            type: makeType(types, {
                                nullable: propNullable,
                                array: true,
                            }),
                        });
                    }
                    else {
                        propAst = iface.addProperty({
                            name: `${propKey}${req ? '' : '?'}`,
                            type: makeType(primitiveOrBlobToType(propDef.items), {
                                nullable: propNullable,
                                array: true,
                            }),
                        });
                    }
                    genComment(propAst, propDef);
                }
                else {
                    //= propName: type
                    genComment(iface.addProperty({
                        name: `${propKey}${req ? '' : '?'}`,
                        type: makeType(primitiveOrBlobToType(propDef), {
                            nullable: propNullable,
                        }),
                    }), propDef);
                }
            }
        }
        if (allowUnknownProperties) {
            //= [k: string]: unknown
            iface.addIndexSignature({
                keyName: 'k',
                keyType: 'string',
                returnType: 'unknown',
            });
        }
    }
}
function genToken(file, lexUri, def) {
    //= /** <comment> */
    //= export const <TOKEN> = `${id}#<token>`
    genComment(file.addVariableStatement({
        isExported: true,
        declarationKind: ts_morph_1.VariableDeclarationKind.Const,
        declarations: [
            {
                name: (0, util_1.toScreamingSnakeCase)(getHash(lexUri)),
                initializer: `\`\${id}#${getHash(lexUri)}\``,
            },
        ],
    }), def);
}
function genArray(file, imports, lexUri, def) {
    if (def.items.type === 'ref') {
        file.addTypeAlias({
            name: (0, util_1.toTitleCase)(getHash(lexUri)),
            type: `${refToType(def.items.ref, stripScheme(stripHash(lexUri)), imports)}[]`,
            isExported: true,
        });
    }
    else if (def.items.type === 'union') {
        const types = def.items.refs.map((ref) => refToUnionType(ref, lexUri, imports));
        if (!def.items.closed) {
            types.push('{ $type: string }');
        }
        file.addTypeAlias({
            name: (0, util_1.toTitleCase)(getHash(lexUri)),
            type: `(${types.join('|')})[]`,
            isExported: true,
        });
    }
    else {
        genComment(file.addTypeAlias({
            name: (0, util_1.toTitleCase)(getHash(lexUri)),
            type: `${primitiveOrBlobToType(def.items)}[]`,
            isExported: true,
        }), def);
    }
}
function genPrimitiveOrBlob(file, lexUri, def) {
    genComment(file.addTypeAlias({
        name: (0, util_1.toTitleCase)(getHash(lexUri)),
        type: primitiveOrBlobToType(def),
        isExported: true,
    }), def);
}
function genXrpcParams(file, lexicons, lexUri, defaultsArePresent = true) {
    const def = lexicons.getDefOrThrow(lexUri, [
        'query',
        'subscription',
        'procedure',
    ]);
    //= export interface QueryParams {...}
    const iface = file.addInterface({
        name: 'QueryParams',
        isExported: true,
    });
    if (def.parameters) {
        for (const paramKey in def.parameters.properties) {
            const paramDef = def.parameters.properties[paramKey];
            const req = def.parameters.required?.includes(paramKey) ||
                (defaultsArePresent &&
                    'default' in paramDef &&
                    paramDef.default !== undefined);
            genComment(iface.addProperty({
                name: `${paramKey}${req ? '' : '?'}`,
                type: paramDef.type === 'array'
                    ? primitiveToType(paramDef.items) + '[]'
                    : primitiveToType(paramDef),
            }), paramDef);
        }
    }
}
function genXrpcInput(file, imports, lexicons, lexUri, defaultsArePresent = true) {
    const def = lexicons.getDefOrThrow(lexUri, ['query', 'procedure']);
    if (def.type === 'procedure' && def.input?.schema) {
        if (def.input.schema.type === 'ref' || def.input.schema.type === 'union') {
            //= export type InputSchema = ...
            const types = def.input.schema.type === 'union'
                ? def.input.schema.refs.map((ref) => refToUnionType(ref, lexUri, imports))
                : [
                    refToType(def.input.schema.ref, stripScheme(stripHash(lexUri)), imports),
                ];
            if (def.input.schema.type === 'union' && !def.input.schema.closed) {
                types.push('{ $type: string }');
            }
            file.addTypeAlias({
                name: 'InputSchema',
                type: types.join('|'),
                isExported: true,
            });
        }
        else {
            //= export interface InputSchema {...}
            genObject(file, imports, lexUri, def.input.schema, `InputSchema`, {
                defaultsArePresent,
            });
        }
    }
    else if (def.type === 'procedure' && def.input?.encoding) {
        //= export type InputSchema = string | Uint8Array | Blob
        file.addTypeAlias({
            isExported: true,
            name: 'InputSchema',
            type: 'string | Uint8Array | Blob',
        });
    }
    else {
        //= export type InputSchema = undefined
        file.addTypeAlias({
            isExported: true,
            name: 'InputSchema',
            type: 'undefined',
        });
    }
}
function genXrpcOutput(file, imports, lexicons, lexUri, defaultsArePresent = true) {
    const def = lexicons.getDefOrThrow(lexUri, [
        'query',
        'subscription',
        'procedure',
    ]);
    const schema = def.type === 'subscription' ? def.message?.schema : def.output?.schema;
    if (schema) {
        if (schema.type === 'ref' || schema.type === 'union') {
            //= export type OutputSchema = ...
            const types = schema.type === 'union'
                ? schema.refs.map((ref) => refToUnionType(ref, lexUri, imports))
                : [refToType(schema.ref, stripScheme(stripHash(lexUri)), imports)];
            if (schema.type === 'union' && !schema.closed) {
                types.push('{ $type: string }');
            }
            file.addTypeAlias({
                name: 'OutputSchema',
                type: types.join('|'),
                isExported: true,
            });
        }
        else {
            //= export interface OutputSchema {...}
            genObject(file, imports, lexUri, schema, `OutputSchema`, {
                defaultsArePresent,
            });
        }
    }
}
function genRecord(file, imports, lexicons, lexUri) {
    const def = lexicons.getDefOrThrow(lexUri, ['record']);
    //= export interface Record {...}
    genObject(file, imports, lexUri, def.record, 'Record', {
        defaultsArePresent: true,
        allowUnknownProperties: true,
        typeProperty: 'required',
    });
    //= export function isRecord(v: unknown): v is Record {...}
    genObjHelpers(file, lexUri, 'Record', {
        requireTypeProperty: true,
    });
}
function genObjHelpers(file, lexUri, ifaceName, { requireTypeProperty, }) {
    const hash = getHash(lexUri);
    const hashVar = `hash${ifaceName}`;
    file.addVariableStatement({
        isExported: false,
        declarationKind: ts_morph_1.VariableDeclarationKind.Const,
        declarations: [{ name: hashVar, initializer: JSON.stringify(hash) }],
    });
    const isX = (0, util_1.toCamelCase)(`is-${ifaceName}`);
    //= export function is{X}<V>(v: V) {...}
    file
        .addFunction({
        name: isX,
        typeParameters: [{ name: `V` }],
        parameters: [{ name: `v`, type: `V` }],
        isExported: true,
    })
        .setBodyText(`return is$typed(v, id, ${hashVar})`);
    const validateX = (0, util_1.toCamelCase)(`validate-${ifaceName}`);
    //= export function validate{X}(v: unknown) {...}
    file
        .addFunction({
        name: validateX,
        typeParameters: [{ name: `V` }],
        parameters: [{ name: `v`, type: `V` }],
        isExported: true,
    })
        .setBodyText(`return validate<${ifaceName} & V>(v, id, ${hashVar}${requireTypeProperty ? ', true' : ''})`);
}
function stripScheme(uri) {
    if (uri.startsWith('lex:'))
        return uri.slice(4);
    return uri;
}
function stripHash(uri) {
    return uri.split('#')[0] || '';
}
function getHash(uri) {
    return uri.split('#').pop() || '';
}
function ipldToType(def) {
    if (def.type === 'bytes') {
        return 'Uint8Array';
    }
    return 'CID';
}
function refToUnionType(ref, lexUri, imports) {
    const baseNsid = stripScheme(stripHash(lexUri));
    return `$Typed<${refToType(ref, baseNsid, imports)}>`;
}
function refToType(ref, baseNsid, imports) {
    // TODO: import external types!
    let [refBase, refHash] = ref.split('#');
    refBase = stripScheme(refBase);
    if (!refHash)
        refHash = 'main';
    // internal
    if (!refBase || baseNsid === refBase) {
        return (0, util_1.toTitleCase)(refHash);
    }
    // external
    imports.add(refBase);
    return `${(0, util_1.toTitleCase)(refBase)}.${(0, util_1.toTitleCase)(refHash)}`;
}
function primitiveOrBlobToType(def) {
    switch (def.type) {
        case 'blob':
            return 'BlobRef';
        case 'bytes':
            return 'Uint8Array';
        case 'cid-link':
            return 'CID';
        default:
            return primitiveToType(def);
    }
}
function primitiveToType(def) {
    switch (def.type) {
        case 'string':
            if (def.knownValues?.length) {
                return `${def.knownValues
                    .map((v) => JSON.stringify(v))
                    .join(' | ')} | (string & {})`;
            }
            else if (def.enum) {
                return def.enum.map((v) => JSON.stringify(v)).join(' | ');
            }
            else if (def.const) {
                return JSON.stringify(def.const);
            }
            return 'string';
        case 'integer':
            if (def.enum) {
                return def.enum.map((v) => JSON.stringify(v)).join(' | ');
            }
            else if (def.const) {
                return JSON.stringify(def.const);
            }
            return 'number';
        case 'boolean':
            if (def.const) {
                return JSON.stringify(def.const);
            }
            return 'boolean';
        case 'unknown':
            // @TODO Should we use "object" here ?
            // the "Record" identifier from typescript get overwritten by the Record
            // interface created by lex-cli.
            return '{ [_ in string]: unknown }'; // Record<string, unknown>
        default:
            throw new Error(`Unexpected primitive type: ${JSON.stringify(def)}`);
    }
}
function makeType(_types, opts) {
    const types = [].concat(_types);
    if (opts?.nullable)
        types.push('null');
    const arr = opts?.array ? '[]' : '';
    if (types.length === 1)
        return `${types[0]}${arr}`;
    if (arr)
        return `(${types.join(' | ')})${arr}`;
    return types.join(' | ');
}
//# sourceMappingURL=lex-gen.js.map