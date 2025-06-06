import { type LexUserType, type LexiconDoc } from '@atproto/lexicon';
export interface DefTreeNodeUserType {
    nsid: string;
    def: LexUserType;
}
export interface DefTreeNode {
    name: string;
    className: string;
    propName: string;
    children: DefTreeNode[];
    userTypes: DefTreeNodeUserType[];
}
export declare function lexiconsToDefTree(lexicons: LexiconDoc[]): DefTreeNode[];
export declare function schemasToNsidTokens(lexiconDocs: LexiconDoc[]): Record<string, string[]>;
export declare function toTitleCase(v: string): string;
export declare function toCamelCase(v: string): string;
export declare function toScreamingSnakeCase(v: string): string;
//# sourceMappingURL=util.d.ts.map