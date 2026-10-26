/**
 * @file Lexing error class.
 * @author David Rekow <d@davidrekow.com>
 */

/**
 * @constructor
 * @extends {Error}
 * @param {string=} msg Human-readable error message.
 * @param {number=} lineno
 */
var LexError = function (msg, lineno) {
  /**
   * @expose
   * @type {string}
   */
  this.message = msg || '';

  /**
   * @expose
   * @type {string}
   */
  this.name = 'LexError';

  /**
   * @expose
   * @type {number}
   */
  this.lineno = typeof lineno === 'number' ? lineno : 1;

  Error.captureStackTrace(this, this.constructor);
};

/**
 * @expose
 * @return {string}
 */
LexError.prototype.toString = function () {
  return this.name + ': ' + this.message;
};

module.exports = LexError;
