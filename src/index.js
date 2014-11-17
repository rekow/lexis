/**
 * @file Main lexis module.
 * @author David Rekow <d@davidrekow.com>
 */

var Lexer = require('./Lexer'),
  Lexicon = require('./Lexicon');

/**
 * @param {(Lexicon|Object.<string, string>)} lexicon
 * @return {Lexer}
 */
var lexis = function (lexicon) {
  return new Lexer(lexicon);
};

/** @expose */
lexis.Future = require('./Future');

/** @expose */
lexis.Lexicon = Lexicon;

lexis({});

module.exports = lexis;

if (typeof window !== 'undefined') {
  /** @expose */
  window.lexis = lexis;
}
