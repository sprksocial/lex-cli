import { type LexiconDoc } from '@atproto/lexicon';
import { type FileDiff, type GeneratedAPI } from './types';
export declare function readAllLexicons(paths: string[]): LexiconDoc[];
export declare function readLexicon(path: string): LexiconDoc;
export declare function genTsObj(lexicons: LexiconDoc[]): string;
export declare function genFileDiff(outDir: string, api: GeneratedAPI): FileDiff[];
export declare function printFileDiff(diff: FileDiff[]): void;
export declare function applyFileDiff(diff: FileDiff[]): void;
//# sourceMappingURL=util.d.ts.map