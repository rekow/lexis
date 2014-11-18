#lexis
a very simple lexer.

##Installation
###node
Add to your `dependencies` in `package.json`:
```javascript
  ...
  "dependencies": {
    "lexis": "~0.0.4",
    ...
  },
  ...
```
or install directly:
```sh
npm install --save lexis
```
then just import the `lexis` module:
```javascript
var lexis = require('lexis');
```
###browser
Include the [minified javascript](https://github.com/davidrekow/lexis/blob/master/dist/lexis.min.js) in your project. The library is available at `window.lexis`, and is also `define`d as a `require`able module:
```javascript
// using the globally exported library
var lexis = window.lexis;

// using requireJS
define('myModule', ['lexis'], function (lexis) { ... });
```

##Usage
###instantiating
```javascript
var lexer = lexis({
  'LPAREN': '(',
  'RPAREN': ')',
  'ALPHANUM': 'RE::[a-zA-Z0-9]+'
});
```
Call `lexis` to retrieve a new [`Lexer`](#Lexer) instance. `lexis()` optionally accepts an instance of [`Lexicon`](#Lexicon), or a mapping of rule definitions to construct one with. If no lexicon is provided at construction time, `lexer.setLexicon()` should be called with one prior to lexing.
###defining rules
Rules are how a `Lexer` matches input to a valid [`Token`](#Token), and the full set of a rules a `Lexer` can match against forms its `Lexicon`. They are declared as a map of `Token` types to rule matcher strings:
```javascript
var rules = {
  'LPAREN': '(',
  'RPAREN': ')',
  'ALPHANUM': 'RE::[a-zA-Z0-9]+'
};
```
There are two kinds of matcher strings - the first is a simple string match. In the example above, `(` would be processed as a `Token` with a `type` of `LPAREN`. Note that this is not limited to single character matches - in the sample below, `(` will only match `LPAREN` and `((` will be processed as a single `DBL_LPAREN`, rather than two `LPAREN`s:
```javascript
var rules = {
  'LPAREN': '(',
  'DBL_LPAREN': '(('
};
```
The second kind of matcher string is a complex `RegExp` matcher. These consist of a special prefix `RE::`, followed by a regex string. If using special characters containing backslashes (such as `\b`), make sure the backslash is escaped in the matcher string so the final `RegExp` is constructed correctly:
```javascript
var rules = {
  'ALPHANUM': 'RE::[a-zA-Z0-9]+',
  'BOUNDARY': 'RE::\\b'
};
```
###lexing
```javascript
var futureTokenList = lexer.lex('(abc1234)');
```
Calling `lex()` on a `Lexer` with a source string returns a [`Future`](#Future) (promise) for a list of tokens. If no source is passed, `lexer.setSource()` must have been called prior to lexing with a string, or an error will occur.

The `Future` will be resolved asynchronously when the lexing has completed - to access the results, call the `Future`'s `then` method and pass a callback:
```javascript
futureTokenList.then(function (tokens, error) {
  if (!tokens && error) {
    // falsy tokens means a lexing error, which will be passed through as error
    return;
  }

  // tokens here is an array of Tokens, do whatever you'd like with them
  ...
});
```
###control flow
`Future.then()` returns a new `Future` awaiting the resolution of the previous, providing a simple but powerful control flow mechanism - simply return a value from the passed callback to fulfill the pending `Future` with it:
```javascript
var lexTask = lexer.lex('(abc1234)')
  .then(function (tokens, error) {
    if (!tokens && error) {
      // Rethrow runtime errors to pipe them to the next step
      throw error;
    }

    // Do something with the tokens - we'll filter out whitespace
    return tokens.filter(function (token) {
      return token.type !== 'WHITESPACE';
    });
  })
  .then(function (filteredTokens, error) {
    if (!filteredTokens && error) {
      // For custom error handling use significant return values
      // rather than rethrowing
      return -1;
    }

    var result = new Future();
    setTimeout(function () { result.fulfill(filteredTokens); }, 1000);

    // If a Future is returned from a callback, the current
    // execution flow is paused until that Future is resolved
    return result;
  })
  .then(function (filteredTokens, error) {
    // This will execute 1000ms after the previous step returned
    if (!filteredTokens && error) {
      // If error is passed, we know a runtime error occurred
      // during the previous step, since we didn't rethrow it
      // in the previous callback
      throw error;
    }

    if (filteredTokens === -1) {
      // Handle the significant return value from the previous
      // control step as an error
      throw new Error('An unknown error occurred.');
    }

    // continue to do something with the tokens...
  });
```

##API
*coming soon*