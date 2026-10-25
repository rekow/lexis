/**
 * Behavior suite: pins observable behavior of the original implementation so the TypeScript port
 * can be verified against it. Known bugs are pinned with `it.fails` using the *correct* expectation,
 * so a fix flips them to passing and the suite asks for the marker to be removed.
 */
import { describe, expect, it } from 'vitest';
import { impls, type Impl, type LexResult } from './impls';

const README_RULES = { LPAREN: '(', RPAREN: ')', ALPHANUM: 'RE::[a-zA-Z0-9]+' };
const WS_RULES = { ...README_RULES, WS: 'RE::[ \\t]+' };

const tokensOf = (r: LexResult) => {
  if ('error' in r) throw new Error(`expected tokens, got error: ${r.error}`);
  return r.tokens;
};
const errorOf = (r: LexResult) => {
  if (!('error' in r)) throw new Error(`expected error, got tokens: ${r.tokens.join(' ')}`);
  return r.error;
};

describe.each(impls)('$name', (impl: Impl) => {
  const { lexis } = impl;
  const lex = (rules: unknown, source?: unknown) => impl.lex(lexis(rules), source);
  /** Marks a test as a pinned known bug for the given implementation generations. */
  const bug = (...generations: Impl['generation'][]) =>
    generations.includes(impl.generation) ? it.fails : it;

  describe('lexis()', () => {
    it('exposes the public classes on the namespace', () => {
      for (const name of ['Token', 'LexError', 'Lexicon', 'Lexer']) {
        expect(typeof lexis[name]).toBe('function');
      }
    });

    it('returns a Lexer built from a rules map', () => {
      const lexer = lexis(README_RULES);
      expect(lexer).toBeInstanceOf(lexis.Lexer);
      expect(lexer.lexicon).toBeInstanceOf(lexis.Lexicon);
    });

    it('accepts a Lexicon instance', async () => {
      const lexicon = new lexis.Lexicon(README_RULES);
      const lexer = lexis(lexicon);
      expect(lexer.lexicon).toBe(lexicon);
      expect(tokensOf(await impl.lex(lexer, '(a)'))).toHaveLength(4);
    });

    it('returns a Lexer without a lexicon when called with none', () => {
      expect(lexis().lexicon).toBeNull();
    });
  });

  describe('Token', () => {
    it('stores type, value and line number', () => {
      const token = new lexis.Token('LPAREN', '(', 3);
      expect([token.type, token.value, token.lineno]).toEqual(['LPAREN', '(', 3]);
    });

    it('defaults lineno to 1', () => {
      expect(new lexis.Token('A', 'a').lineno).toBe(1);
      expect(new lexis.Token('A', 'a', '7').lineno).toBe(1);
    });

    it('renders as TYPE<"value">:lineno', () => {
      expect(String(new lexis.Token('ALPHANUM', 'abc', 2))).toBe('ALPHANUM<"abc">:2');
    });
  });

  describe('LexError', () => {
    it('stores message, name and line number', () => {
      const error = new lexis.LexError('boom', 4);
      expect([error.message, error.name, error.lineno]).toEqual(['boom', 'LexError', 4]);
    });

    it('defaults message to empty and lineno to 1', () => {
      const error = new lexis.LexError();
      expect([error.message, error.lineno]).toEqual(['', 1]);
    });

    it('renders as LexError: message', () => {
      expect(String(new lexis.LexError('boom'))).toBe('LexError: boom');
    });

    it('captures a stack trace', () => {
      expect(typeof new lexis.LexError('boom').stack).toBe('string');
    });

    // The original annotated LexError as `@extends {Error}` but never wired the prototype.
    bug('legacy')('is an instance of Error', () => {
      expect(new lexis.LexError('boom')).toBeInstanceOf(Error);
    });
  });

  describe('Lexicon', () => {
    const lexicon = () =>
      new lexis.Lexicon({ LPAREN: '(', DBL_LPAREN: '((', DIGITS: 'RE::\\d+', DOT: '.' });
    const types = (rules: Array<{ type: string }>) => rules.map((r) => r.type);

    it('buckets simple rules by first character and complex rules under RE', () => {
      const { rules } = lexicon();
      expect(types(rules['('])).toEqual(['LPAREN', 'DBL_LPAREN']);
      expect(types(rules['.'])).toEqual(['DOT']);
      expect(types(rules.RE)).toEqual(['DIGITS']);
      expect(rules.RE[0]).toMatchObject({ source: 'RE::\\d+', complex: true });
      expect(rules['('][0]).toMatchObject({ source: '(', complex: false });
    });

    it('supports define() after construction', () => {
      const lex = new lexis.Lexicon();
      lex.define({ A: 'a' });
      expect(types(lex.getRules('a'))).toEqual(['A']);
    });

    it('getRules() returns the bucket followed by complex rules', () => {
      expect(types(lexicon().getRules('(x'))).toEqual(['LPAREN', 'DBL_LPAREN', 'DIGITS']);
      expect(types(lexicon().getRules('z'))).toEqual(['DIGITS']);
      expect(lexicon().getRules('')).toEqual([]);
      expect(lexicon().getRules(null)).toEqual([]);
    });

    it('match() returns rules that match the whole string', () => {
      const l = lexicon();
      expect(types(l.match(null, '('))).toEqual(['LPAREN']);
      expect(types(l.match(null, '(('))).toEqual(['DBL_LPAREN']);
      expect(types(l.match(null, '123'))).toEqual(['DIGITS']);
      expect(types(l.match(null, '12a'))).toEqual([]);
    });

    it('match() escapes regex specials in simple rules', () => {
      expect(types(lexicon().match(null, '.'))).toEqual(['DOT']);
      expect(types(lexicon().match(null, 'x'))).toEqual([]);
    });

    it('filter() keeps simple rules that could still match and complex rules that match now', () => {
      const l = lexicon();
      expect(types(l.filter(null, '('))).toEqual(['LPAREN', 'DBL_LPAREN']);
      expect(types(l.filter(null, '(('))).toEqual(['DBL_LPAREN']);
      expect(types(l.filter(null, '1'))).toEqual(['DIGITS']);
    });

    it('match() and filter() narrow an explicit rule list', () => {
      const l = lexicon();
      const only = l.getRules('(').slice(1);
      expect(types(l.match(only, '('))).toEqual([]);
      expect(types(l.filter(only, '('))).toEqual(['DBL_LPAREN']);
    });
  });

  describe('Lexer', () => {
    it('lexes the README example', async () => {
      expect(tokensOf(await lex(README_RULES, '(abc1234)'))).toEqual([
        'LPAREN<"(">:1',
        'ALPHANUM<"abc1234">:1',
        'RPAREN<")">:1',
        'EOF<"">:1',
      ]);
    });

    it('prefers the longest simple match', async () => {
      expect(tokensOf(await lex({ LPAREN: '(', DBL: '((' }, '((('))).toEqual([
        'DBL<"((">:1',
        'LPAREN<"(">:1',
        'EOF<"">:1',
      ]);
    });

    it('matches complex rules greedily', async () => {
      expect(tokensOf(await lex(WS_RULES, 'ab  cd'))).toEqual([
        'ALPHANUM<"ab">:1',
        'WS<"  ">:1',
        'ALPHANUM<"cd">:1',
        'EOF<"">:1',
      ]);
    });

    it('tracks line numbers across \\n, \\r\\n and \\r without emitting newlines', async () => {
      expect(tokensOf(await lex(README_RULES, 'a\nb\r\nc\rd'))).toEqual([
        'ALPHANUM<"a">:1',
        'ALPHANUM<"b">:2',
        'ALPHANUM<"c">:3',
        'ALPHANUM<"d">:4',
        'EOF<"">:4',
      ]);
    });

    it('ends tokens at line boundaries and skips blank lines', async () => {
      expect(tokensOf(await lex(README_RULES, 'ab\n\ncd'))).toEqual([
        'ALPHANUM<"ab">:1',
        'ALPHANUM<"cd">:3',
        'EOF<"">:3',
      ]);
    });

    it('lexes a character array source as a single line', async () => {
      expect(tokensOf(await lex(README_RULES, ['(', 'a', 'b', ')']))).toEqual([
        'LPAREN<"(">:1',
        'ALPHANUM<"ab">:1',
        'RPAREN<")">:1',
        'EOF<"">:1',
      ]);
    });

    it('lexes a source given to the constructor', async () => {
      const lexer = new lexis.Lexer(README_RULES, '(a)');
      expect(lexer.source).toBe('(a)');
      expect(tokensOf(await impl.lex(lexer))).toHaveLength(4);
    });

    it('exposes the tokens on the lexer after lexing', async () => {
      const lexer = lexis(README_RULES);
      const tokens = tokensOf(await impl.lex(lexer, '(a)'));
      expect(lexer.tokens.map(String)).toEqual(tokens);
    });

    it('can lex again after reset(true), keeping the lexicon', async () => {
      const lexer = lexis(README_RULES);
      await impl.lex(lexer, '(a)');
      const lexicon = lexer.lexicon;
      expect(lexer.reset(true)).toBe(lexer);
      expect(lexer.lexicon).toBe(lexicon);
      expect(tokensOf(await impl.lex(lexer, 'b'))).toEqual(['ALPHANUM<"b">:1', 'EOF<"">:1']);
    });

    it('drops the lexicon on reset()', () => {
      const lexer = lexis(README_RULES);
      lexer.reset();
      expect([lexer.lexicon, lexer.source, lexer.error, lexer.tokens]).toEqual([null, null, null, []]);
    });

    describe('errors', () => {
      it('fails when no rule can start with a character', async () => {
        const error = errorOf(await lex({ A: 'a' }, 'a\nax'));
        expect(error).toBeInstanceOf(lexis.LexError);
        expect([error.message, error.lineno]).toEqual(['No rule matched: x', 2]);
      });

      it('fails when complex rules exist but none match', async () => {
        const error = errorOf(await lex({ DIGITS: 'RE::\\d+' }, 'x'));
        expect([error.message, error.lineno]).toEqual(['Unrecognized token: x', 1]);
      });

      it('fails when input ends inside a partial match', async () => {
        const error = errorOf(await lex({ ABC: 'abc' }, 'ab'));
        expect([error.message, error.lineno]).toEqual(['Unexpected end of input: ab', 1]);
      });

      it('records the error on the lexer', async () => {
        const lexer = lexis({ A: 'a' });
        const error = errorOf(await impl.lex(lexer, 'x'));
        expect(lexer.error).toBe(error);
      });

      it('fails when lexing without a source', async () => {
        const error = errorOf(await lex(README_RULES));
        expect(error.message).toBe('Lexer.lex() cannot be called before source and lexicon are set.');
      });

      it('records an error for a non-string, non-array source', () => {
        const lexer = lexis(README_RULES);
        lexer.setSource(5);
        expect(lexer.error.message).toBe('Lexer.setSource() expects a string or char array source.');
      });

      it('records an error for a missing lexicon', () => {
        const lexer = lexis(README_RULES);
        lexer.setLexicon(null);
        expect(lexer.error.message).toBe(
          'Lexer.setLexicon() expects an object or instance of Lexicon.',
        );
      });
    });

    describe('known bugs (pinned, fixed after review)', () => {
      // Backtracking only rewinds one character, so a longer failed lookahead is swallowed.
      bug('legacy')('backtracks more than one character', async () => {
        expect(tokensOf(await lex({ A: 'a', ABCD: 'abcd', B: 'b', C: 'c' }, 'abc'))).toEqual([
          'A<"a">:1',
          'B<"b">:1',
          'C<"c">:1',
          'EOF<"">:1',
        ]);
      });

      // At the end of a line the whole lookahead is emitted as the last match's value.
      bug('legacy')('backtracks to the last match at the end of a line', async () => {
        expect(tokensOf(await lex({ A: 'a', ABC: 'abc', B: 'b' }, 'ab\nab'))).toEqual([
          'A<"a">:1',
          'B<"b">:1',
          'A<"a">:2',
          'B<"b">:2',
          'EOF<"">:2',
        ]);
      });

      bug('legacy')('backtracks again while re-reading backed-up input', async () => {
        const rules = { A: 'a', AXYZW: 'axyzw', X: 'x', Y: 'y', Z: 'z' };
        expect(tokensOf(await lex(rules, 'axyz'))).toEqual([
          'A<"a">:1',
          'X<"x">:1',
          'Y<"y">:1',
          'Z<"z">:1',
          'EOF<"">:1',
        ]);
      });

      bug('legacy', 'current')('lexes an empty string to just EOF', async () => {
        expect(tokensOf(await lex(README_RULES, ''))).toEqual(['EOF<"">:1']);
      });

      // Legacy throws a TypeError synchronously from lex().
      bug('legacy', 'current')('fails with a LexError when no lexicon is set', async () => {
        expect(errorOf(await lex(undefined, 'a'))).toBeInstanceOf(lexis.LexError);
      });

      // `matchers.escape` does not escape `\`, so the rule's RegExp throws during define().
      bug('legacy', 'current')('supports a backslash in a simple rule', async () => {
        expect(tokensOf(await lex({ BS: '\\' }, '\\'))).toEqual(['BS<"\\">:1', 'EOF<"">:1']);
      });

      // Legacy returns the previous result, then crashes the process with an uncaught TypeError
      // when it re-fulfills the Future, so it can't run in-process.
      (impl.generation === 'legacy' ? it.skip : it.fails)('lexes again without reset()', async () => {
        const lexer = lexis(README_RULES);
        await impl.lex(lexer, 'a');
        expect(tokensOf(await impl.lex(lexer, 'b'))).toEqual(['ALPHANUM<"b">:1', 'EOF<"">:1']);
      });
    });
  });
});
