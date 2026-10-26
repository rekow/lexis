/**
 * @file Main lexis function, with the public classes attached as properties.
 * @author David Rekow <d@davidrekow.com>
 */

import { Lexer } from './Lexer';
import { LexError } from './LexError';
import { Lexicon, type Rules } from './Lexicon';
import { Token } from './Token';

export interface Lexis {
  /**
   * @param lexicon An instance of <code>Lexicon</code>, or rules to instantiate one with.
   */
  (lexicon?: Lexicon | Rules): Lexer;
  Token: typeof Token;
  LexError: typeof LexError;
  Lexicon: typeof Lexicon;
  Lexer: typeof Lexer;
}

const lexis: Lexis = Object.assign(
  function lexis(lexicon?: Lexicon | Rules): Lexer {
    return new Lexer(lexicon);
  },
  { Token, LexError, Lexicon, Lexer },
);

export default lexis;
