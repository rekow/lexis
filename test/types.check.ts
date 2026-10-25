/**
 * Type-level tests of the shipped ESM declarations (`dist/index.d.mts`), imported by package name.
 * Checked by `npm run typecheck`; never executed.
 */
import lexis, { Lexer, LexError, Lexicon, Token, type Rule, type Rules, type Source } from 'lexis';
import { expectTypeOf } from 'vitest';

expectTypeOf(lexis).toBeCallableWith();
expectTypeOf(lexis).toBeCallableWith({ A: 'a' });
expectTypeOf(lexis).toBeCallableWith(new Lexicon());
expectTypeOf(lexis()).toEqualTypeOf<Lexer>();
expectTypeOf(lexis.Lexer).toEqualTypeOf<typeof Lexer>();
expectTypeOf(lexis.Token).toEqualTypeOf<typeof Token>();

expectTypeOf<Lexer['lex']>().parameter(0).toEqualTypeOf<Source | undefined>();
expectTypeOf<Lexer['lex']>().returns.toEqualTypeOf<Promise<Token[]>>();
expectTypeOf<Lexer['reset']>().returns.toEqualTypeOf<Lexer>();
expectTypeOf(new LexError('boom', 2)).toExtend<Error>();
expectTypeOf(new LexError().lineno).toBeNumber();

expectTypeOf<Rules>().toEqualTypeOf<Record<string, string>>();
expectTypeOf<Source>().toEqualTypeOf<string | string[]>();
expectTypeOf<Rule['matcher']>().toEqualTypeOf<RegExp>();

// @ts-expect-error -- Future was removed in 0.1.0.
lexis.Future;
// @ts-expect-error -- lexer internals are protected.
lexis()._state;
