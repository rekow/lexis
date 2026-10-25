/**
 * @file Token class. Describes a meaningful "word" in a lexicon.
 * @author David Rekow <d@davidrekow.com>
 */

export class Token {
  /** Token type or name, e.g. <code>OPEN_TAG</code>. */
  type: string;

  /** Real value of symbol to match, e.g. <code><</code>. */
  value: string;

  /** Line number Token was encountered on. */
  lineno: number;

  /**
   * @param type Token type or name, e.g. <code>OPEN_TAG</code>.
   * @param value Real value of symbol to match, e.g. <code><</code>.
   * @param lineno Line number Token was encountered on.
   */
  constructor(type: string, value: string, lineno?: number) {
    this.type = type;
    this.value = value;
    this.lineno = typeof lineno === 'number' ? lineno : 1;
  }

  toString(): string {
    return this.type + '<"' + this.value + '">:' + this.lineno;
  }
}
