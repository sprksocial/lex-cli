"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genServerApi = genServerApi;
const ts_morph_1 = require("ts-morph");
const lexicon_1 = require("@atproto/lexicon");
const syntax_1 = require("@atproto/syntax");
const common_1 = require("./common");
const lex_gen_1 = require("./lex-gen");
const util_1 = require("./util");
async function genServerApi(lexiconDocs) {
    const project = new ts_morph_1.Project({
        useInMemoryFileSystem: true,
        manipulationSettings: { indentationText: ts_morph_1.IndentationText.TwoSpaces },
    });
    const api = { files: [] };
    const lexicons = new lexicon_1.Lexicons(lexiconDocs);
    const nsidTree = (0, util_1.lexiconsToDefTree)(lexiconDocs);
    const nsidTokens = (0, util_1.schemasToNsidTokens)(lexiconDocs);
    for (const lexiconDoc of lexiconDocs) {
        api.files.push(await lexiconTs(project, lexicons, lexiconDoc));
    }
    api.files.push(await (0, common_1.utilTs)(project));
    api.files.push(await (0, common_1.lexiconsTs)(project, lexiconDocs));
    api.files.push(await indexTs(project, lexiconDocs, nsidTree, nsidTokens));
    return api;
}
const indexTs = (project, lexiconDocs, nsidTree, nsidTokens) => (0, common_1.gen)(project, '/index.ts', async (file) => {
    //= import {createServer as createXrpcServer, Server as XrpcServer} from '@atproto/xrpc-server'
    file.addImportDeclaration({
        moduleSpecifier: '@atproto/xrpc-server',
        namedImports: [
            {
                name: 'createServer',
                alias: 'createXrpcServer',
            },
            {
                name: 'Server',
                alias: 'XrpcServer',
            },
            {
                name: 'Options',
                alias: 'XrpcOptions',
                isTypeOnly: true,
            },
            { name: 'AuthVerifier', isTypeOnly: true },
            { name: 'StreamAuthVerifier', isTypeOnly: true },
        ],
    });
    //= import {schemas} from './lexicons.js'
    file
        .addImportDeclaration({
        moduleSpecifier: './lexicons.js',
    })
        .addNamedImport({
        name: 'schemas',
    });
    // generate type imports
    for (const lexiconDoc of lexiconDocs) {
        if (lexiconDoc.defs.main?.type !== 'query' &&
            lexiconDoc.defs.main?.type !== 'subscription' &&
            lexiconDoc.defs.main?.type !== 'procedure') {
            continue;
        }
        file
            .addImportDeclaration({
            moduleSpecifier: `./types/${lexiconDoc.id.split('.').join('/')}.js`,
        })
            .setNamespaceImport((0, util_1.toTitleCase)(lexiconDoc.id));
    }
    // generate token enums
    for (const nsidAuthority in nsidTokens) {
        // export const {THE_AUTHORITY} = {
        //  {Name}: "{authority.the.name}"
        // }
        file.addVariableStatement({
            isExported: true,
            declarationKind: ts_morph_1.VariableDeclarationKind.Const,
            declarations: [
                {
                    name: (0, util_1.toScreamingSnakeCase)(nsidAuthority),
                    initializer: [
                        '{',
                        ...nsidTokens[nsidAuthority].map((nsidName) => `${(0, util_1.toTitleCase)(nsidName)}: "${nsidAuthority}.${nsidName}",`),
                        '}',
                    ].join('\n'),
                },
            ],
        });
    }
    //= export function createServer(options?: XrpcOptions) { ... }
    const createServerFn = file.addFunction({
        name: 'createServer',
        returnType: 'Server',
        parameters: [
            { name: 'options', type: 'XrpcOptions', hasQuestionToken: true },
        ],
        isExported: true,
    });
    createServerFn.setBodyText(`return new Server(options)`);
    //= export class Server {...}
    const serverCls = file.addClass({
        name: 'Server',
        isExported: true,
    });
    //= xrpc: XrpcServer = createXrpcServer(methodSchemas)
    serverCls.addProperty({
        name: 'xrpc',
        type: 'XrpcServer',
    });
    // generate classes for the schemas
    for (const ns of nsidTree) {
        //= ns: NS
        serverCls.addProperty({
            name: ns.propName,
            type: ns.className,
        });
        // class...
        genNamespaceCls(file, ns);
    }
    //= constructor (options?: XrpcOptions) {
    //=  this.xrpc = createXrpcServer(schemas, options)
    //=  {namespace declarations}
    //= }
    serverCls
        .addConstructor({
        parameters: [
            { name: 'options', type: 'XrpcOptions', hasQuestionToken: true },
        ],
    })
        .setBodyText([
        'this.xrpc = createXrpcServer(schemas, options)',
        ...nsidTree.map((ns) => `this.${ns.propName} = new ${ns.className}(this)`),
    ].join('\n'));
    file.addTypeAlias({
        name: 'SharedRateLimitOpts',
        typeParameters: [{ name: 'T' }],
        type: `{
        name: string
        calcKey?: (ctx: T) => string | null
        calcPoints?: (ctx: T) => number
      }`,
    });
    file.addTypeAlias({
        name: 'RouteRateLimitOpts',
        typeParameters: [{ name: 'T' }],
        type: `{
        durationMs: number
        points: number
        calcKey?: (ctx: T) => string | null
        calcPoints?: (ctx: T) => number
      }`,
    });
    file.addTypeAlias({
        name: 'HandlerOpts',
        type: `{ blobLimit?: number }`,
    });
    file.addTypeAlias({
        name: 'HandlerRateLimitOpts',
        typeParameters: [{ name: 'T' }],
        type: `SharedRateLimitOpts<T> | RouteRateLimitOpts<T>`,
    });
    file.addTypeAlias({
        name: 'ConfigOf',
        typeParameters: [
            { name: 'Auth' },
            { name: 'Handler' },
            { name: 'ReqCtx' },
        ],
        type: `
        | Handler
        | {
          auth?: Auth
          opts?: HandlerOpts
          rateLimit?: HandlerRateLimitOpts<ReqCtx> | HandlerRateLimitOpts<ReqCtx>[]
          handler: Handler
        }`,
    });
    file.addTypeAlias({
        name: 'ExtractAuth',
        typeParameters: [
            { name: 'AV', constraint: 'AuthVerifier | StreamAuthVerifier' },
        ],
        type: `Extract<
        Awaited<ReturnType<AV>>,
        { credentials: unknown }
      >`,
    });
});
function genNamespaceCls(file, ns) {
    //= export class {ns}NS {...}
    const cls = file.addClass({
        name: ns.className,
        isExported: true,
    });
    //= _server: Server
    cls.addProperty({
        name: '_server',
        type: 'Server',
    });
    for (const child of ns.children) {
        //= child: ChildNS
        cls.addProperty({
            name: child.propName,
            type: child.className,
        });
        // recurse
        genNamespaceCls(file, child);
    }
    //= constructor(server: Server) {
    //=  this._server = server
    //=  {child namespace declarations}
    //= }
    const cons = cls.addConstructor();
    cons.addParameter({
        name: 'server',
        type: 'Server',
    });
    cons.setBodyText([
        `this._server = server`,
        ...ns.children.map((ns) => `this.${ns.propName} = new ${ns.className}(server)`),
    ].join('\n'));
    // methods
    for (const userType of ns.userTypes) {
        if (userType.def.type !== 'query' &&
            userType.def.type !== 'subscription' &&
            userType.def.type !== 'procedure') {
            continue;
        }
        const moduleName = (0, util_1.toTitleCase)(userType.nsid);
        const name = (0, util_1.toCamelCase)(syntax_1.NSID.parse(userType.nsid).name || '');
        const isSubscription = userType.def.type === 'subscription';
        const method = cls.addMethod({
            name,
            typeParameters: [
                {
                    name: 'AV',
                    constraint: isSubscription ? 'StreamAuthVerifier' : 'AuthVerifier',
                },
            ],
        });
        method.addParameter({
            name: 'cfg',
            type: `ConfigOf<AV, ${moduleName}.Handler<ExtractAuth<AV>>, ${moduleName}.HandlerReqCtx<ExtractAuth<AV>>>`,
        });
        const methodType = isSubscription ? 'streamMethod' : 'method';
        method.setBodyText([
            // Placing schema on separate line, since the following one was being formatted
            // into multiple lines and causing the ts-ignore to ignore the wrong line.
            `const nsid = '${userType.nsid}' // @ts-ignore`,
            `return this._server.xrpc.${methodType}(nsid, cfg)`,
        ].join('\n'));
    }
}
const lexiconTs = (project, lexicons, lexiconDoc) => (0, common_1.gen)(project, `/types/${lexiconDoc.id.split('.').join('/')}.ts`, async (file) => {
    const main = lexiconDoc.defs.main;
    if (main?.type === 'query' || main?.type === 'procedure') {
        //= import express from 'express'
        file.addImportDeclaration({
            moduleSpecifier: 'express',
            defaultImport: 'express',
        });
        const streamingInput = main?.type === 'procedure' &&
            main.input?.encoding &&
            !main.input.schema;
        const streamingOutput = main.output?.encoding && !main.output.schema;
        if (streamingInput || streamingOutput) {
            //= import stream from 'node:stream'
            file.addImportDeclaration({
                moduleSpecifier: 'node:stream',
                defaultImport: 'stream',
            });
        }
    }
    (0, lex_gen_1.genCommonImports)(file, lexiconDoc.id);
    const imports = new Set();
    for (const defId in lexiconDoc.defs) {
        const def = lexiconDoc.defs[defId];
        const lexUri = `${lexiconDoc.id}#${defId}`;
        if (defId === 'main') {
            if (def.type === 'query' || def.type === 'procedure') {
                (0, lex_gen_1.genXrpcParams)(file, lexicons, lexUri);
                (0, lex_gen_1.genXrpcInput)(file, imports, lexicons, lexUri);
                (0, lex_gen_1.genXrpcOutput)(file, imports, lexicons, lexUri, false);
                genServerXrpcMethod(file, lexicons, lexUri);
            }
            else if (def.type === 'subscription') {
                (0, lex_gen_1.genXrpcParams)(file, lexicons, lexUri);
                (0, lex_gen_1.genXrpcOutput)(file, imports, lexicons, lexUri, false);
                genServerXrpcStreaming(file, lexicons, lexUri);
            }
            else if (def.type === 'record') {
                (0, lex_gen_1.genRecord)(file, imports, lexicons, lexUri);
            }
            else {
                (0, lex_gen_1.genUserType)(file, imports, lexicons, lexUri);
            }
        }
        else {
            (0, lex_gen_1.genUserType)(file, imports, lexicons, lexUri);
        }
    }
    (0, lex_gen_1.genImports)(file, imports, lexiconDoc.id);
});
function genServerXrpcMethod(file, lexicons, lexUri) {
    const def = lexicons.getDefOrThrow(lexUri, ['query', 'procedure']);
    file.addImportDeclaration({
        moduleSpecifier: '@atproto/xrpc-server',
        namedImports: [{ name: 'HandlerAuth' }, { name: 'HandlerPipeThrough' }],
    });
    //= export interface HandlerInput {...}
    if (def.type === 'procedure' && def.input?.encoding) {
        const handlerInput = file.addInterface({
            name: 'HandlerInput',
            isExported: true,
        });
        handlerInput.addProperty({
            name: 'encoding',
            type: def.input.encoding
                .split(',')
                .map((v) => `'${v.trim()}'`)
                .join(' | '),
        });
        if (def.input.schema) {
            if (def.input.encoding.includes(',')) {
                handlerInput.addProperty({
                    name: 'body',
                    type: 'InputSchema | stream.Readable',
                });
            }
            else {
                handlerInput.addProperty({ name: 'body', type: 'InputSchema' });
            }
        }
        else if (def.input.encoding) {
            handlerInput.addProperty({ name: 'body', type: 'stream.Readable' });
        }
    }
    else {
        file.addTypeAlias({
            isExported: true,
            name: 'HandlerInput',
            type: 'undefined',
        });
    }
    // export interface HandlerSuccess {...}
    let hasHandlerSuccess = false;
    if (def.output?.schema || def.output?.encoding) {
        hasHandlerSuccess = true;
        const handlerSuccess = file.addInterface({
            name: 'HandlerSuccess',
            isExported: true,
        });
        if (def.output.encoding) {
            handlerSuccess.addProperty({
                name: 'encoding',
                type: def.output.encoding
                    .split(',')
                    .map((v) => `'${v.trim()}'`)
                    .join(' | '),
            });
        }
        if (def.output?.schema) {
            if (def.output.encoding.includes(',')) {
                handlerSuccess.addProperty({
                    name: 'body',
                    type: 'OutputSchema | Uint8Array | stream.Readable',
                });
            }
            else {
                handlerSuccess.addProperty({ name: 'body', type: 'OutputSchema' });
            }
        }
        else if (def.output?.encoding) {
            handlerSuccess.addProperty({
                name: 'body',
                type: 'Uint8Array | stream.Readable',
            });
        }
        handlerSuccess.addProperty({
            name: 'headers?',
            type: '{ [key: string]: string }',
        });
    }
    // export interface HandlerError {...}
    const handlerError = file.addInterface({
        name: 'HandlerError',
        isExported: true,
    });
    handlerError.addProperties([
        { name: 'status', type: 'number' },
        { name: 'message?', type: 'string' },
    ]);
    if (def.errors?.length) {
        handlerError.addProperty({
            name: 'error?',
            type: def.errors.map((err) => `'${err.name}'`).join(' | '),
        });
    }
    // export type HandlerOutput = ...
    file.addTypeAlias({
        isExported: true,
        name: 'HandlerOutput',
        type: `HandlerError | ${hasHandlerSuccess ? 'HandlerSuccess | HandlerPipeThrough' : 'void'}`,
    });
    file.addTypeAlias({
        name: 'HandlerReqCtx',
        isExported: true,
        typeParameters: [
            { name: 'HA', constraint: 'HandlerAuth', default: 'never' },
        ],
        type: `{
        auth: HA
        params: QueryParams
        input: HandlerInput
        req: express.Request
        res: express.Response
        resetRouteRateLimits: () => Promise<void>
      }`,
    });
    file.addTypeAlias({
        name: 'Handler',
        isExported: true,
        typeParameters: [
            { name: 'HA', constraint: 'HandlerAuth', default: 'never' },
        ],
        type: `(ctx: HandlerReqCtx<HA>) => Promise<HandlerOutput> | HandlerOutput`,
    });
}
function genServerXrpcStreaming(file, lexicons, lexUri) {
    const def = lexicons.getDefOrThrow(lexUri, ['subscription']);
    file.addImportDeclaration({
        moduleSpecifier: '@atproto/xrpc-server',
        namedImports: [{ name: 'HandlerAuth' }, { name: 'ErrorFrame' }],
    });
    file.addImportDeclaration({
        moduleSpecifier: 'node:http',
        namedImports: [{ name: 'IncomingMessage' }],
    });
    // export type HandlerError = ...
    file.addTypeAlias({
        name: 'HandlerError',
        isExported: true,
        type: `ErrorFrame<${arrayToUnion(def.errors?.map((e) => e.name))}>`,
    });
    // export type HandlerOutput = ...
    file.addTypeAlias({
        isExported: true,
        name: 'HandlerOutput',
        type: `HandlerError | ${def.message?.schema ? 'OutputSchema' : 'void'}`,
    });
    file.addTypeAlias({
        name: 'HandlerReqCtx',
        isExported: true,
        typeParameters: [
            { name: 'HA', constraint: 'HandlerAuth', default: 'never' },
        ],
        type: `{
        auth: HA
        params: QueryParams
        req: IncomingMessage
        signal: AbortSignal
      }`,
    });
    file.addTypeAlias({
        name: 'Handler',
        isExported: true,
        typeParameters: [
            { name: 'HA', constraint: 'HandlerAuth', default: 'never' },
        ],
        type: `(ctx: HandlerReqCtx<HA>) => AsyncIterable<HandlerOutput>`,
    });
}
function arrayToUnion(arr) {
    if (!arr?.length) {
        return 'never';
    }
    return arr.map((item) => `'${item}'`).join(' | ');
}
//# sourceMappingURL=server.js.map