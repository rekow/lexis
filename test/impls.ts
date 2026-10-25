/**
 * Adapters that let one behavior suite run against both the legacy (Future-based) implementation
 * and the current one, so the port can be checked against the original.
 */
import { createRequire } from 'node:module';
import lexisCurrent from '../src/index';

export type LexResult = { tokens: string[] } | { error: any };

export interface Impl {
  name: 'legacy' | 'current';
  lexis: any;
  /** Lexes and normalizes the outcome; tokens are rendered with `Token#toString()`. */
  lex(lexer: any, source?: unknown): Promise<LexResult>;
}

const require = createRequire(import.meta.url);

export const legacy: Impl = {
  name: 'legacy',
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

export const current: Impl = {
  name: 'current',
  lexis: lexisCurrent,
  lex: async (lexer, source) => {
    try {
      return { tokens: (await lexer.lex(source)).map(String) };
    } catch (error) {
      return { error };
    }
  },
};

export const impls: Impl[] = [legacy, current];
