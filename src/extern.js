/**
 * @file Externs for lexis library.
 * @author  David Rekow <d@davidrekow.com>
 * @copyright (c) David Rekow 2014
 * @externs
 */

/**
 * @constructor
 */
var Future = function () {};

/**
 * @type {string}
 */
Future.prototype.status = '';

/**
 * @param {(boolean|*)} value Promised value, or false if an error occurred.
 * @param {Error=} error If fulfill failed, error to pass to waiting callbacks.
 * @throws {Error} If fulfill is called on an already-fulfilled Future.
 * @return {Future}
 */
Future.prototype.fulfill = function (value, error) {};

/**
 * @param {(function(*, Error=)|Future)} waiting
 * @return {Future}
 */
Future.prototype.then = function (waiting) {};


/**
 * @constructor
 * @extends {Error}
 * @param {string=} msg Human-readable error message.
 * @param {number=} lineno
 */
var LexError = function (msg, lineno) {};

/**
 * @type {string}
 */
LexError.prototype.message = '';

/**
 * @type {string}
 */
LexError.prototype.name = '';

/**
 * @type {number}
 */
LexError.prototype.lineno = 0;


/**
 * @constructor
 * @param {string} type Token type or name, e.g. <code>OPEN_TAG</code>.
 * @param {string} value Real value of symbol to match, e.g. <code><</code>.
 * @param {number=} lineno Line number Token was encountered on.
 */
var Token = function (type, value, lineno) {};

/**
 * @type {string}
 */
Token.prototype.type = '';

/**
 * @type {string}
 */
Token.prototype.value = '';

/**
 * @type {number}
 */
Token.prototype.lineno = 0;


/**
 * @constructor
 * @param {Object.<string, string>=} rules Rules map. See {@link Lexicon#define} for details.
 */
var Lexicon = function (rules) {};

/**
 * @param {Object.<string, string>} rules
 */
Lexicon.prototype.define = function (rules) {};

/**
 * @param {?string} str
 * @return {Array.<Object>}
 */
Lexicon.prototype.getRules = function (str) {};

/**
 * @param {?Array.<Object>} rules
 * @param {?string} str
 * @return {Array.<Object>}
 */
Lexicon.prototype.filter = function (rules, str) {};

/**
 * @param {?Array.<Object>} rules
 * @param {?string} str
 * @return {Array.<Object>}
 */
Lexicon.prototype.match = function (rules, str) {};


/**
 * @constructor
 * @param {(Lexicon|Object.<string, string>)=} lexicon An instance of <code>Lexicon</code>,
 *   or rules to instantiate one with.
 * @param {(string|Array.<string>)=} source Source string or char array to lex.
 */
var Lexer = function (lexicon, source) {};

/**
 * @expose
 * @type {?Lexicon}
 */
Lexer.prototype.lexicon = null;

/**
 * @expose
 * @type {?(string|Array.<string>)}
 */
Lexer.prototype.source = null;

/**
 * @expose
 * @type {?(LexError|Error)}
 */
Lexer.prototype.error = null;

/**
 * @expose
 * @protected
 * @type {Array.<Token>}
 */
Lexer.prototype.tokens = [];

/**
 * @param {(string|Array.<string>)=} source
 */
Lexer.prototype.setSource = function (source) {};

/**
 * @param {(Lexicon|Object.<string, string>)} lexicon
 */
Lexer.prototype.setLexicon = function (lexicon) {};

/**
 * @param {(string|Array.<string>)=} source
 * @return {Future}
 */
Lexer.prototype.lex = function (source) {};


/**
 * @typedef {function(Lexicon|Object.<string,string>): Lexer}
 */
var lexis = function () {};

/**
 * @typedef {function(new: Future)}
 */
lexis.Future;

/**
 * @typedef {function(new: Token)}
 */
lexis.Token;

/**
 * @typedef {function(new: LexError)}
 */
lexis.LexError;

/**
 * @typedef {function(new: Lexicon)}
 */
lexis.Lexicon;

/**
 * @typedef {function(new: Lexer)}
 */
lexis.Lexer;
