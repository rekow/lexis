/**
 * Type-level tests of the shipped CommonJS declarations (`dist/index.d.cts`).
 * Checked by `npm run typecheck`; never executed.
 */
import lexis = require('lexis');

const lexer: InstanceType<typeof lexis.Lexer> = lexis({ A: 'a' });
const tokens: Promise<Array<InstanceType<typeof lexis.Token>>> = lexer.lex('a');
const error: Error = new lexis.LexError('boom');

// @ts-expect-error -- Future was removed in 0.1.0.
lexis.Future;

void tokens, error;
