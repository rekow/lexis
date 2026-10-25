/**
 * @file Lexer class - takes a string and tokenizes according to a {@link Lexicon}.
 * @author David Rekow <d@davidrekow.com>
 */

import { LexError } from './LexError';
import { Lexicon, type Rule, type Rules } from './Lexicon';
import { LINEBREAK } from './matchers';
import { Token } from './Token';

// Available in browsers and Node; declared locally so the library depends on neither DOM nor Node types.
declare function setTimeout(callback: () => void, ms: number): unknown;

/**
 * Source string, or character array, to lex.
 */
export type Source = string | string[];

const noop = (): void => {};

export class Lexer {
  lexicon!: Lexicon | null;
  source!: Source | null;
  error!: LexError | Error | null;
  tokens!: Token[];

  protected _valid!: Rule[];
  protected _match!: Rule[];
  protected _current!: string | null;
  protected _next!: string | null;
  protected _previous!: Rule[];
  protected _lines!: string[];
  protected _stream!: string[];
  protected _lineno!: number;
  protected _state!: number | null;
  protected _result!: Promise<Token[]>;
  protected _resolve!: (tokens: Token[]) => void;
  protected _reject!: (error: unknown) => void;

  /**
   * @param lexicon An instance of <code>Lexicon</code>, or rules to instantiate one with.
   * @param source Source string or char array to lex.
   */
  constructor(lexicon?: Lexicon | Rules, source?: Source) {
    this.init(lexicon, source);
  }

  /**
   * Resets the lexer state.
   * @param keepLexicon If true, will preserve the current lexicon.
   */
  reset(keepLexicon?: boolean): this {
    this.init(keepLexicon === true ? this.lexicon ?? undefined : undefined);
    return this;
  }

  /**
   * Sets the passed text as the lexing source, breaking into lines if necessary, and initializes
   * the character stream.
   * @param source String or character array to tokenize.
   */
  setSource(source: Source): void {
    if (typeof source.length !== 'number' || typeof source.slice !== 'function') {
      this.error = new LexError('Lexer.setSource() expects a string or char array source.');
      return this.fail();
    }

    this.source = source;
    this._lineno = 1;
    this._state = 1;

    if (typeof source === 'string') {
      this._lines = source.split(LINEBREAK);
      this._stream = this._lines.shift()!.split('');
    } else {
      this._lines = [];
      this._stream = source.slice();
    }
  }

  /**
   * Sets the current Lexicon.
   * @param lexicon
   */
  setLexicon(lexicon: Lexicon | Rules): void {
    if (!lexicon) {
      this.error = new LexError('Lexer.setLexicon() expects an object or instance of Lexicon.');
      this.fail();
    } else {
      if (!(lexicon instanceof Lexicon)) {
        try {
          lexicon = new Lexicon(lexicon);
        } catch (e) {
          this.error = e as Error;
          this.fail();
        }
      }

      // Known bug, kept from the original: if construction threw, this stores the raw rules map.
      this.lexicon = lexicon as Lexicon;
    }
  }

  /**
   * Processes the input stream, matching and tokenizing left to right in a single pass.
   * @param source String to set as source and lex.
   * @return Resolves with the tokens, or rejects with the error that stopped lexing.
   */
  lex(source?: Source): Promise<Token[]> {
    let next: string | undefined;

    if (typeof source === 'string' || Array.isArray(source))
      this.setSource(source);

    if (!(this.source && this._lines && this._stream)) {
      this.error = new LexError('Lexer.lex() cannot be called before source and lexicon are set.');
      this._state = -1;
    }

    const current = this._current || '';

    switch (this._state) {
    case -1:
      this.fail();
      return this._result;

    case 0:
      this.tokens.push(new Token('EOF', '', this._lineno));
      this._resolve(this.tokens);
      return this._result;

    case 1:
      next = this._next || this._stream.shift();

      if (!next) {
        if (this._lines.length) {
          this._stream = this._lines.shift()!.split('');
          this._lineno += 1;
        } else {
          this._state = 0;
        }
        break;
      }

      this._next = next;
      this._current = current + next;
      this._valid = this.lexicon!.getRules(next);
      this._state = this._valid.length ? 2 : -1;

      if (this._state === -1)
        this.error = new LexError('No rule matched: ' + next, this._lineno);

      break;

    case 2:
      this._match = this.lexicon!.match(this._valid, this._current!);
      this._valid = this.lexicon!.filter(this._valid, this._current!);
      this._previous = this._previous || [];
      this._state = this._match.length ? 6 :
        this._valid.length ? 3 :
        this._previous.length ? 4 :
        -1;

      if (this._state === -1)
        this.error = new LexError('Unrecognized token: ' + current, this._lineno);

      break;

    case 3:
      next = this._stream.shift();

      if (next) {
        this._next = next;
        this._current = this._current + this._next;
        this._state = 2;
      } else {
        this._next = null;
        this._state = this._match.length ? 6 :
          this._previous.length ? 5 :
          -1;
      }

      if (this._state === -1)
        this.error = new LexError('Unexpected end of input: ' + current, this._lineno);

      break;

    case 4:
      this.tokens.push(new Token(
        this._previous[0]!.type,
        this._current!.slice(0, -1),
        this._lineno));
      this._next = this._current!.slice(-1);
      this._state = 7;
      break;

    case 5:
      this.tokens.push(new Token(
        this._previous[0]!.type,
        this._current!,
        this._lineno));
      this._state = 7;
      break;

    case 6:
      this._previous = this._match;
      this._match = [];
      this._state = 3;
      break;

    case 7:
      this._previous = [];
      this._current = '';
      this._state = 1;
      break;

    default:
      this.error = new LexError('Invalid Lexer state: ' + this._state, this._lineno);
      this._state = -1;
    }

    setTimeout(() => {
      this.lex();
    }, 0);

    return this._result;
  }

  /**
   * Exit the lex loop and rejects the result with the error.
   */
  protected fail(): void {
    this._reject(this.error);
  }

  /**
   * (Re)initializes all lexer state; shared by the constructor and {@link Lexer#reset}.
   */
  protected init(lexicon?: Lexicon | Rules, source?: Source): void {
    this.lexicon = null;
    this.source = null;
    this.error = null;
    this.tokens = [];
    this._valid = [];
    this._match = [];
    this._current = null;
    this._next = null;
    this._previous = [];
    this._lines = [];
    this._stream = [];
    this._lineno = 0;
    this._state = null;
    this._result = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
    // The result can be settled eagerly by setSource()/setLexicon() errors before anyone calls lex(),
    // as the original Future could. Mark it handled so that isn't an unhandled rejection; callers
    // of lex() still observe the rejection.
    this._result.catch(noop);

    if (lexicon)
      this.setLexicon(lexicon);

    if (source)
      this.setSource(source);
  }
}
