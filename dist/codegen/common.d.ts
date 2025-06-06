import { Project, SourceFile } from 'ts-morph';
import { type LexiconDoc } from '@atproto/lexicon';
import { type GeneratedFile } from '../types';
export declare const utilTs: (project: any) => Promise<GeneratedFile>;
export declare const lexiconsTs: (project: any, lexicons: LexiconDoc[]) => Promise<GeneratedFile>;
export declare function gen(project: Project, path: string, gen: (file: SourceFile) => Promise<void>): Promise<GeneratedFile>;
//# sourceMappingURL=common.d.ts.map