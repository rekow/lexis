/**
 * @file Matchers for lexing tokens.
 * @author David Rekow <d@davidrekow.com>
 */

/**
 * Matcher for splitting lex source into lines.
 */
export const LINEBREAK: RegExp = /(?:\r\n|\n|\r)/;

/**
 * Matcher for complex RegExp sources.
 */
export const COMPLEX: RegExp = /^RE::(.*)$/;

/**
 * List of special RegExp characters to escape.
 */
export const SPECIAL: readonly string[] = ['/', '{', '}', '(', ')', '[', ']', '^', '$', ',', '.', '+', '?', '*', '|'];

/**
 * Escapes a string and returns a version safe for passing to <code>RegExp()</code>.
 * @param str String to escape.
 * @returns Escaped string.
 */
export function escape(str: string): string {
  return str.split('').map((c) => (SPECIAL.includes(c) ? '\\' + c : c)).join('');
}
