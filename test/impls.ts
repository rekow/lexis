/**
 * Adapters that let one behavior suite run against the legacy (Future-based) implementation, the
 * current source, and the built ESM and CJS packages, so the port can be checked against the original
 * and the published builds against the source.
 */
import { createRequire } from 'node:module';
import lexisDistEsm from '../dist/index.mjs';
import lexisSrc from '../src/index';

export type LexResult = { tokens: string[] } | { error: any };

export interface Impl {
  name: string;
  /** Which implementation the behavior comes from; pinned bugs are keyed on this. */
  generation: 'legacy' | 'current';
  lexis: any;
  /** Lexes and normalizes the outcome; tokens are rendered with `Token#toString()`. */
  lex(lexer: any, source?: unknown): Promise<LexResult>;
}

const require = createRequire(import.meta.url);

export const legacy: Impl = {
  name: 'legacy',
  generation: 'legacy',
  lexis: require('./legacy/index.js'),
  lex: (lexer, source) =>
    new Promise((resolve) => {
      let future;
      try {
        future = lexer.lex(source);
      } catch (error) {
        return resolve({ error });
      }
      future.then((tokens: any[] | false, error?: any) =>
        resolve(tokens ? { tokens: tokens.map(String) } : { error }),
      );
    }),
};

const current = (name: string, lexis: any): Impl => ({
  name,
  generation: 'current',
  lexis,
  lex: async (lexer, source) => {
    try {
      return { tokens: (await lexer.lex(source)).map(String) };
    } catch (error) {
      return { error };
    }
  },
});

export const impls: Impl[] = [
  legacy,
  current('src', lexisSrc),
  current('dist (esm)', lexisDistEsm),
  current('dist (cjs)', require('../dist/index.cjs')),
];
