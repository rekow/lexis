/**
 * @file Lexing error class.
 * @author David Rekow <d@davidrekow.com>
 */

type CaptureStackTrace = (target: object, constructorOpt?: Function) => void;

export class LexError extends Error {
  lineno: number;

  /**
   * @param msg Human-readable error message.
   * @param lineno
   */
  constructor(msg?: string, lineno?: number) {
    super(msg || '');
    this.name = 'LexError';
    this.lineno = typeof lineno === 'number' ? lineno : 1;

    // V8-only; elides the constructor frame from the stack where available.
    (Error as { captureStackTrace?: CaptureStackTrace }).captureStackTrace?.(this, LexError);
  }

  override toString(): string {
    return this.name + ': ' + this.message;
  }
}
