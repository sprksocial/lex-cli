import { SourceFile } from 'ts-morph';
import { type LexArray, type LexBlob, type LexBytes, type LexCidLink, type LexIpldType, type LexPrimitive, type LexToken, type LexUserType, Lexicons } from '@atproto/lexicon';
interface Commentable<T> {
    addJsDoc: ({ description }: {
        description: string;
    }) => T;
}
export declare function genComment<T>(commentable: Commentable<T>, def: LexUserType): T;
export declare function genCommonImports(file: SourceFile, baseNsid: string): void;
export declare function genImports(file: SourceFile, imports: Set<string>, baseNsid: string): void;
export declare function genUserType(file: SourceFile, imports: Set<string>, lexicons: Lexicons, lexUri: string): void;
export declare function genToken(file: SourceFile, lexUri: string, def: LexToken): void;
export declare function genArray(file: SourceFile, imports: Set<string>, lexUri: string, def: LexArray): void;
export declare function genPrimitiveOrBlob(file: SourceFile, lexUri: string, def: LexPrimitive | LexBlob | LexIpldType): void;
export declare function genXrpcParams(file: SourceFile, lexicons: Lexicons, lexUri: string, defaultsArePresent?: boolean): void;
export declare function genXrpcInput(file: SourceFile, imports: Set<string>, lexicons: Lexicons, lexUri: string, defaultsArePresent?: boolean): void;
export declare function genXrpcOutput(file: SourceFile, imports: Set<string>, lexicons: Lexicons, lexUri: string, defaultsArePresent?: boolean): void;
export declare function genRecord(file: SourceFile, imports: Set<string>, lexicons: Lexicons, lexUri: string): void;
export declare function stripScheme(uri: string): string;
export declare function stripHash(uri: string): string;
export declare function getHash(uri: string): string;
export declare function ipldToType(def: LexCidLink | LexBytes): "CID" | "Uint8Array";
export declare function primitiveOrBlobToType(def: LexBlob | LexPrimitive | LexIpldType): string;
export declare function primitiveToType(def: LexPrimitive): string;
export {};
//# sourceMappingURL=lex-gen.d.ts.map