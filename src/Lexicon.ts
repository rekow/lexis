/**
 * @file Lexicon class - describes rules for matching tokens.
 * @author David Rekow <d@davidrekow.com>
 */

import { COMPLEX, escape } from './matchers';

/**
 * Rules map of token types to matcher strings. See {@link Lexicon#define} for details.
 */
export type Rules = Record<string, string>;

export interface Rule {
  source: string;
  type: string;
  matcher: RegExp;
  complex: boolean;
}

export class Lexicon {
  /**
   * Rules bucketed by first character; complex (RegExp) rules live under <code>RE</code>.
   */
  protected rules: { RE: Rule[]; [key: string]: Rule[] };

  /**
   * @param rules Rules map. See {@link Lexicon#define} for details.
   */
  constructor(rules?: Rules) {
    this.rules = { RE: [] };

    if (rules)
      this.define(rules);
  }

  /**
   * Defines the token rules for this <code>Lexicon</code>.
   * @param rules The rules for the lexicon as a map of token names to string sources
   *   to directly match. To perform more complex regex matching, pass <code>RegExp</code> sources
   *   prefixed with <code>RE::</code> (make sure to escape backslashes for special characters):
   * <pre><code>{
   *   OPEN_TAG: '<',         // Matches `<` exactly.
   *   DIGIT:    'RE::\\d',    // Matches a single digit.
   *   ALPHANUM: 'RE::\\w+'    // Matches alphanumeric text greedily.
   * }</code></pre>
   */
  define(rules: Rules): void {
    for (const type in rules) {
      if (Object.prototype.hasOwnProperty.call(rules, type)) {
        const src = rules[type]!;
        let key: string;
        let rule: Rule;

        if (COMPLEX.test(src)) {
          rule = { source: src, type, matcher: new RegExp(src.slice(4)), complex: true };
          key = 'RE';
        } else {
          rule = { source: src, type, matcher: new RegExp(escape(src)), complex: false };
          key = src.charAt(0);
        }

        (this.rules[key] ??= []).push(rule);
      }
    }
  }

  /**
   * Returns the full set of potentially-matching token rules for a string.
   * @param str String to find all potential matches for.
   * @return Set of potentially-matching token rules.
   */
  getRules(str: string | null): Rule[] {
    if (!str)
      return [];

    return (this.rules[str.charAt(0)] || []).concat(this.rules.RE);
  }

  /**
   * Filters the set of potential token rules for future or current matches.
   * @param rules If passed, filter this instead of current Lexicon.
   * @param str String to find future and current matches for.
   * @return List of eventually-matching token rules.
   */
  filter(rules: Rule[] | null, str: string): Rule[] {
    return (rules || this.getRules(str)).filter((rule) =>
      rule.complex ? this.match([rule], str).length > 0 : rule.source.startsWith(str));
  }

  /**
   * Like filter, but returns only current matches.
   * @param rules If passed, filter this instead of current Lexicon.
   * @param str String to find current token matches for.
   * @returns List of exactly-matching tokens.
   */
  match(rules: Rule[] | null, str: string): Rule[] {
    return (rules || this.getRules(str)).filter((rule) => {
      const matches = rule.matcher.exec(str);
      return matches !== null && matches[0].length === str.length;
    });
  }
}
