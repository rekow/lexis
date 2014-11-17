/**
 * @file Lexer class - takes a string and tokenizes according to a {@link Lexicon}.
 * @author David Rekow <d@davidrekow.com>
 */

var matchers = require('./matchers'),
  Future = require('./Future'),
  Lexicon = require('./Lexicon'),
  Token = require('./Token'),
  LexError = require('./LexError');

/**
 * @constructor
 * @param {(Lexicon|Object.<string, string>)=} lexicon An instance of <code>Lexicon</code>,
 *   or rules to instantiate one with.
 * @param {(string|Array.<string>)=} source Source string or char array to lex.
 */
var Lexer = function (lexicon, source) {
  /**
   * @expose
   * @type {?Lexicon}
   */
  this.lexicon = null;

  /**
   * @expose
   * @type {?(string|Array.<string>)}
   */
  this.source = null;

  /**
   * @expose
   * @type {?(LexError|Error)}
   */
  this.error = null;

  /**
   * @expose
   * @protected
   * @type {Array.<Token>}
   */
  this.tokens = [];

  /**
   * @protected
   * @type {Array.<Token>}
   */
  this._valid = [];

  /**
   * @protected
   * @type {Array.<Token>}
   */
  this._match = [];

  /**
   * @protected
   * @type {?string}
   */
  this._current = null;

  /**
   * @protected
   * @type {?string}
   */
  this._next = null;

  /**
   * @protected
   * @type {Array.<Token>}
   */
  this._previous = [];

  /**
   * @protected
   * @type {Array.<string>}
   */
  this._lines = [];

  /**
   * @protected
   * @type {Array.<string>}
   */
  this._stream = [];

  /**
   * @protected
   * @type {number}
   */
  this._lineno = 0;

  /**
   * @protected
   * @type {?number}
   */
  this._state = null;

  /**
   * @protected
   * @type {Future}
   */
  this._result = new Future();

  if (lexicon)
    this.setLexicon(lexicon);

  if (source)
    this.setSource(source);
};

/**
 * Resets the lexer state.
 * @expose
 * @return {Lexer}
 */
Lexer.prototype.reset = function () {
  Lexer.call(this);
  return this;
};

/**
 * Exit the lex loop and fulfills the result with the error.
 * @protected
 */
Lexer.prototype.fail = function () {
  this._result.fulfill(false, this.error);
};

/**
 * Sets the passed text as the lexing source, breaking into lines if necessary, and initializes
 * the character stream.
 * @expose
 * @param {(string|Array.<string>)=} source String or character array to tokenize.
 */
Lexer.prototype.setSource = function (source) {
  if (typeof source.length !== 'number' || typeof source.slice !== 'function') {
    this.error = new LexError('Lexer.setSource() expects a string or char array source.');
    return this.fail();
  }

  this.source = source;
  this._lineno = 1;
  this._state = 1;

  if (typeof source === 'string') {
    this._lines = source.split(matchers.LINEBREAK);
    this._stream = this._lines.shift().split('');
  } else {
    this._lines = [];
    this._stream = source;
  }
};

/**
 * Sets the current Lexicon.
 * @expose
 * @param {(Lexicon|Object.<string, string>)} lexicon
 */
Lexer.prototype.setLexicon = function (lexicon) {
  if (!lexicon) {
    this.error = new LexError('Lexer.setLexicon() expects an object or instance of Lexicon.');
    this.fail();
  } else {
    if (!(lexicon instanceof Lexicon)) {
      try {
        lexicon = new Lexicon(lexicon);
      } catch (e) {
        this.error = e;
        this.fail();
      }
    }

    this.lexicon = lexicon;
  }
};

/**
 * Processes the input stream, matching and tokenizing left to right in a single pass.
 * @expose
 * @param {(string|Array.<string>)=} source String to set as source and lex.
 */
Lexer.prototype.lex = function (source) {
  var lexer = this,
    current, next, _valid;

  if (typeof source === 'string' || Array.isArray(source))
    this.setSource(source);

  if (!(this.source && this._lines && this._stream)) {
    this.error = new LexError('Lexer.lex() cannot be called before source and lexicon are set.');
    this._state = -1;
  }

  current = this._current || '';

  switch('' + this._state) {
  case '-1':
    this.fail();
    return this._result;

  case '0':
    this.tokens.push(new Token('EOF', '', this._lineno));
    this._result.fulfill(this.tokens);
    return this._result;

  case '1':
    next = this._next || this._stream.shift();

    if (!next) {
      if (this._lines.length) {
        this._stream = this._lines.shift().split('');
        this._lineno += 1;
      } else {
        this._state = 0;
      }
      break;
    }

    this._next = next;
    this._current = current + next;
    this._valid = this.lexicon.getRules(next);
    this._state = this._valid.length ? 2 : -1;

    if (this._state === -1)
      this.error = new LexError('No rule matched: ' + next, this._lineno);

    break;

  case '2':
    _valid = this._valid;

    this._match = this.lexicon.match(this._valid, this._current);
    this._valid = this.lexicon.filter(this._valid, this._current);
    this._previous = this._previous || [];
    this._state = this._match.length ? 6 :
      this._valid.length ? 3 :
      this._previous.length ? 4 :
      -1;

    if (this._state === -1)
      this.error = new LexError('Unrecognized token: ' + current, this._lineno);

    break;

  case '3':
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

  case '4':
    this.tokens.push(new Token(
      this._previous[0].type,
      this._current.slice(0, -1),
      this._lineno));
    this._next = this._current.slice(-1);
    this._state = 7;
    break;

  case '5':
    this.tokens.push(new Token(
      this._previous[0].type,
      /** @type {string} */(this._current),
      this._lineno));
    this._state = 7;
    break;

  case '6':
    this._previous = this._match;
    this._match = [];
    this._state = 3;
    break;

  case '7':
    this._previous = [];
    this._current = '';
    this._state = 1;
    break;

  default:
    this.error = new LexError('Invalid Lexer state: ' + this._state, this._lineno);
    this._state = -1;
  }

  setTimeout(function () {
    lexer.lex();
  }, 0);

  return this._result;
};

module.exports = Lexer;
