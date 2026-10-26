# lexis
a very simple lexer.

## Installation
```sh
npm install lexis
```
then import the `lexis` module:
```javascript
// ES modules
import lexis from 'lexis';
// or pick out the classes you need
import { Lexer, Lexicon, Token, LexError } from 'lexis';

// CommonJS
const lexis = require('lexis');
```
`lexis` ships ES module and CommonJS builds with TypeScript type definitions, has no dependencies, and is
side-effect free, so it works with any modern bundler (Vite, webpack, esbuild, Rollup, ...) for use in the
browser. It requires Node.js 18 or later.

## Usage
### instantiating
```javascript
const lexer = lexis({
  'LPAREN': '(',
  'RPAREN': ')',
  'ALPHANUM': 'RE::[a-zA-Z0-9]+'
});
```
Call `lexis` to retrieve a new `Lexer` instance. `lexis()` optionally accepts an instance of `Lexicon`, or a mapping of rule definitions to construct one with. If no lexicon is provided at construction time, `lexer.setLexicon()` should be called with one prior to lexing.
### defining rules
Rules are how a `Lexer` matches input to a valid `Token`, and the full set of a rules a `Lexer` can match against forms its `Lexicon`. They are declared as a map of `Token` types to rule matcher strings:
```javascript
const rules = {
  'LPAREN': '(',
  'RPAREN': ')',
  'ALPHANUM': 'RE::[a-zA-Z0-9]+'
};
```
There are two kinds of matcher strings - the first is a simple string match. In the example above, `(` would be processed as a `Token` with a `type` of `LPAREN`. Note that this is not limited to single character matches - in the sample below, `(` will only match `LPAREN` and `((` will be processed as a single `DBL_LPAREN`, rather than two `LPAREN`s:
```javascript
const rules = {
  'LPAREN': '(',
  'DBL_LPAREN': '(('
};
```
The second kind of matcher string is a complex `RegExp` matcher. These consist of a special prefix `RE::`, followed by a regex string. If using special characters containing backslashes (such as `\b`), make sure the backslash is escaped in the matcher string so the final `RegExp` is constructed correctly:
```javascript
const rules = {
  'ALPHANUM': 'RE::[a-zA-Z0-9]+',
  'BOUNDARY': 'RE::\\b'
};
```
### lexing
```javascript
const tokens = await lexer.lex('(abc1234)');
```
Calling `lex()` on a `Lexer` with a source string returns a `Promise` for the list of tokens, ending with an `EOF` token. If no source is passed, `lexer.setSource()` must have been called prior to lexing with a string, or an error will occur.

If lexing fails, the promise rejects with a `LexError` carrying the line number where lexing stopped:
```javascript
try {
  const tokens = await lexer.lex('(abc1234)');

  // tokens is an array of Tokens - we'll filter out whitespace
  const filtered = tokens.filter((token) => token.type !== 'WHITESPACE');
  // ...
} catch (error) {
  if (error instanceof lexis.LexError) {
    console.error(`Lexing failed on line ${error.lineno}: ${error.message}`);
  }
  throw error;
}
```
To lex another source with the same `Lexer`, call `lexer.lex(source)` again: it starts over with the new source and the same lexicon. `lexer.lex()` with no source returns the current result. `lexer.reset()` clears the lexer, including its lexicon unless called as `reset(true)`; resetting, or passing a new source, before a lex finishes rejects that lex's promise with a `LexError`.

## Upgrading from 0.0.x
- `lexer.lex()` returns a native `Promise` instead of a `Future`. Replace `.then(function (tokens, error) { ... })` with `await` (or `.then(onTokens, onError)`); errors arrive as a rejection rather than as a second callback argument with falsy `tokens`.
- `lexis.Future` has been removed. Use native promises (for example `await new Promise((resolve) => setTimeout(resolve, 1000))` in place of a manually fulfilled `Future`).
- `LexError` now extends `Error`, so `error instanceof Error` is `true` and works in every engine.
- The prebuilt `dist/lexis.min.js`, the `window.lexis` global and AMD `define('lexis')` are gone. In the browser, import `lexis` through your bundler.
- `lexer.lex(source)` can be called again on a used `Lexer` and lexes the new source; `reset(true)` is no longer needed first. `lexer.lex()` without a source returns the existing result instead of re-running the last step.

Bug fixes that can change results:
- Backtracking: when a longer simple rule matched part of the input and then failed, the lexer re-read only the last character, merging the rest into the previous token. It now backs up to the end of the longest match, so `{ A: 'a', ABCD: 'abcd', B: 'b', C: 'c' }` lexes `abc` as `A`, `B`, `C` instead of `A<"abc">`.
- A partial simple match fails as soon as no rule can continue it ("Unrecognized token"); simple rules were kept alive while their source merely *contained* the input, so 0.0.x read further and sometimes reported "Unexpected end of input" instead.
- Backslashes in simple rules are matched literally: `'\\'` no longer throws and `'a\\d'` no longer matches `a1`.
- `lex('')` resolves to just `EOF`, and lexing without a lexicon rejects with a `LexError` instead of throwing a `TypeError`.
- If rules passed to `setLexicon()` fail to compile, the error is recorded and the previous lexicon is kept, rather than storing the raw rules map.

## API
- `lexis(lexicon?)` → `Lexer`. Also exposes `lexis.Lexer`, `lexis.Lexicon`, `lexis.Token` and `lexis.LexError`.
- `new Lexer(lexicon?, source?)`
  - `lex(source?)` → `Promise<Token[]>`
  - `setSource(source)`, `setLexicon(lexicon)`, `reset(keepLexicon?)`
  - `lexicon`, `source`, `tokens`, `error`
- `new Lexicon(rules?)`: `define(rules)`, `getRules(str)`, `match(rules, str)`, `filter(rules, str)`
- `new Token(type, value, lineno?)`: `type`, `value`, `lineno`
- `new LexError(message?, lineno?)`: `message`, `name`, `lineno`
