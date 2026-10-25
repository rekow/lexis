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
To lex another source with the same `Lexer`, call `lexer.reset(true)` first; `true` keeps the current lexicon.

## Upgrading from 0.0.x
- `lexer.lex()` returns a native `Promise` instead of a `Future`. Replace `.then(function (tokens, error) { ... })` with `await` (or `.then(onTokens, onError)`); errors arrive as a rejection rather than as a second callback argument with falsy `tokens`.
- `lexis.Future` has been removed. Use native promises (for example `await new Promise((resolve) => setTimeout(resolve, 1000))` in place of a manually fulfilled `Future`).
- `LexError` now extends `Error`, so `error instanceof Error` is `true` and works in every engine.
- The prebuilt `dist/lexis.min.js`, the `window.lexis` global and AMD `define('lexis')` are gone. In the browser, import `lexis` through your bundler.

## API
- `lexis(lexicon?)` → `Lexer`. Also exposes `lexis.Lexer`, `lexis.Lexicon`, `lexis.Token` and `lexis.LexError`.
- `new Lexer(lexicon?, source?)`
  - `lex(source?)` → `Promise<Token[]>`
  - `setSource(source)`, `setLexicon(lexicon)`, `reset(keepLexicon?)`
  - `lexicon`, `source`, `tokens`, `error`
- `new Lexicon(rules?)`: `define(rules)`, `getRules(str)`, `match(rules, str)`, `filter(rules, str)`
- `new Token(type, value, lineno?)`: `type`, `value`, `lineno`
- `new LexError(message?, lineno?)`: `message`, `name`, `lineno`
