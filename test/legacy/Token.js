/**
 * @file Token class. Describes a meaningful "word" in a lexicon.
 * @author David Rekow <d@davidrekow.com>
 */

/**
 * @constructor
 * @param {string} type Token type or name, e.g. <code>OPEN_TAG</code>.
 * @param {string} value Real value of symbol to match, e.g. <code><</code>.
 * @param {number=} lineno Line number Token was encountered on.
 */
var Token = function (type, value, lineno) {
  /**
   * @expose
   * @type {string}
   */
  this.type = type;

  /**
   * @expose
   * @type {string}
   */
  this.value = value;

  /**
   * @expose
   * @type {number}
   */
  this.lineno = typeof lineno === 'number' ? lineno : 1;
};

/**
 * @expose
 * @return {string}
 */
Token.prototype.toString = function () {
  return this.type + '<"' + this.value + '">:' + this.lineno;
};

module.exports = Token;
