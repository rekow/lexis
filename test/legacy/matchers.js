/**
 * @file Matchers for lexing tokens.
 * @author David Rekow <d@davidrekow.com>
 */

var matchers = {};

/**
 * Matcher for splitting lex source into lines.
 * @type {RegExp}
 */
matchers.LINEBREAK = /(?:\r\n|\n|\r)/;

/**
 * Matcher for escaping backslashes.
 * @type {RegExp}
 */
matchers.BACKSLASH = /\\/g;

/**
 * Matcher for complex RegExp sources.
 * @type {RegExp}
 */
matchers.COMPLEX = /^RE::(.*)$/;

/**
 * List of special RegExp characters to escape.
 * @type {Array.<string>}
 */
matchers.SPECIAL = ['/', '{', '}', '(', ')', '[', ']', '^', '$', ',', '.', '+', '?', '*', '|'];

/**
 * Escapes a string and returns a version safe for passing to <code>RegExp()</code>.
 * @param {string} str String to escape.
 * @returns {string} Escaped string.
 */
matchers.escape = function (str) {
  return str.split('').map(function (c) {
    return !!~matchers.SPECIAL.indexOf(c) ? '\\' + c : c;
  }).join('');
};

module.exports = matchers;
