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
  /** Input read past the end of the last token, re-read before {@link Lexer#_stream}. */
  protected _next!: string | null;
  protected _previous!: Rule[];
  /** The text <code>_previous</code> matched: the longest token found so far. */
  protected _matched!: string;
  protected _lines!: string[];
  protected _stream!: string[];
  protected _lineno!: number;
  protected _state!: number | null;
  /** Whether {@link Lexer#lex} has started stepping through the current source. */
  protected _started!: boolean;
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
   * Resets the lexer state. A lex still in progress stops, and its promise rejects with a
   * {@link LexError}.
   * @param keepLexicon If true, will preserve the current lexicon.
   */
  reset(keepLexicon?: boolean): this {
    // No-op if the lex already finished.
    if (this._started)
      this._reject(new LexError(
        'Lexer.reset() or Lexer.lex(source) was called before lexing finished.',
        this._lineno));

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
    } else if (lexicon instanceof Lexicon) {
      this.lexicon = lexicon;
    } else {
      // On failure, the previous lexicon (if any) is kept.
      try {
        this.lexicon = new Lexicon(lexicon);
      } catch (e) {
        this.error = e as Error;
        this.fail();
      }
    }
  }

  /**
   * Processes the input stream, matching and tokenizing left to right in a single pass.
   * @param source String to set as source and lex. Once lexing has started, passing a source
   *   starts over with it, keeping the lexicon, as {@link Lexer#reset}<code>(true)</code> would.
   * @return Resolves with the tokens, or rejects with the error that stopped lexing. Called again
   *   without a source, returns the same promise.
   */
  lex(source?: Source): Promise<Token[]> {
    if (typeof source === 'string' || Array.isArray(source)) {
      if (this._started)
        this.reset(true);

      this.setSource(source);
    } else if (this._started) {
      return this._result;
    }

    this._started = true;
    this.run();
    return this._result;
  }

  /**
   * Steps the lexer, one step per turn of the event loop, until it finishes or is reset.
   */
  protected run(): void {
    const result = this._result;

    if (this.step()) {
      setTimeout(() => {
        if (this._result === result)
          this.run();
      }, 0);
    }
  }

  /**
   * Advances the lexer state machine by one step.
   * @return False once lexing has finished or failed.
   */
  protected step(): boolean {
    let next: string | undefined;

    if (this.source == null || !this.lexicon) {
      this.error = new LexError('Lexer.lex() cannot be called before source and lexicon are set.');
      this._state = -1;
    }

    const current = this._current || '';

    switch (this._state) {
    case -1:
      this.fail();
      return false;

    case 0:
      this.tokens.push(new Token('EOF', '', this._lineno));
      this._resolve(this.tokens);
      return false;

    case 1:
      next = this.read();

      if (!next) {
        if (this._lines.length) {
          this._stream = this._lines.shift()!.split('');
          this._lineno += 1;
        } else {
          this._state = 0;
        }
        break;
      }

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
      next = this.read();

      if (next) {
        this._current = this._current + next;
        this._state = 2;
      } else {
        this._state = this._match.length ? 6 :
          this._previous.length ? 5 :
          -1;
      }

      if (this._state === -1)
        this.error = new LexError('Unexpected end of input: ' + current, this._lineno);

      break;

    case 4:
    case 5:
      // Emit the longest match and back up to re-read whatever was read past it.
      this.tokens.push(new Token(
        this._previous[0]!.type,
        this._matched,
        this._lineno));
      this._next = this._current!.slice(this._matched.length) + (this._next || '') || null;
      this._state = 7;
      break;

    case 6:
      this._previous = this._match;
      this._matched = this._current!;
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

    return true;
  }

  /**
   * Reads the next character of the current line, taking backed-up input first.
   */
  protected read(): string | undefined {
    const next = this._next;

    if (!next)
      return this._stream.shift();

    this._next = next.length > 1 ? next.slice(1) : null;
    return next.charAt(0);
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
    this._matched = '';
    this._lines = [];
    this._stream = [];
    this._lineno = 0;
    this._state = null;
    this._started = false;
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

    if (source != null)
      this.setSource(source);
  }
}
