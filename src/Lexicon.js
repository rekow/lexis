/**
 * @file Lexicon class - describes rules for matching tokens.
 * @author David Rekow <d@davidrekow.com>
 */

var matchers = require('./matchers');

/**
 * @constructor
 * @param {Object.<string, string>=} rules Rules map. See {@link Lexicon#define} for details.
 */
var Lexicon = function (rules) {
  /**
   * @protected
   * @type {Object}
   */
  this.rules = {
    /**
     * @type {Array.<Object>}
     */
    RE: []
  };

  if (rules)
    this.define(rules);
};

/**
 * Defines the token rules for this <code>Lexicon</code>.
 * @expose
 * @param {Object.<string, string>} rules The rules for the lexicon as a map of token names to string sources
 *   to directly match. To perform more complex regex matching, pass <code>RegExp</code> sources
 *   prefixed with <code>RE::</code> (make sure to escape backslashes for special characters):
 * <pre><code>{
 *   OPEN_TAG: '<',         // Matches `<` exactly.
 *   DIGIT:    'RE::\\d',    // Matches a single digit.
 *   ALPHANUM: 'RE::\\w+'    // Matches alphanumeric text greedily.
 * }</code></pre>
 */
Lexicon.prototype.define = function (rules) {
  var type, src, rule, key;

  for (type in rules) {
    if (rules.hasOwnProperty(type)) {
      src = rules[type];

      rule = {
        source: src,
        type: type
      };

      if (matchers.COMPLEX.test(src)) {
        rule.matcher = new RegExp(src.slice(4));
        rule.complex = true;
        key = 'RE';
      } else {
        rule.matcher = new RegExp(matchers.escape(src));
        rule.complex = false;
        key = src.charAt(0);
      }

      if (!this.rules[key])
        this.rules[key] = [];

      this.rules[key].push(rule);
    }
  }
};

/**
 * Returns the full set of potentially-matching token rules for a string.
 * @expose
 * @param {?string} str String to find all potential matches for.
 * @return {Array.<Object>} Set of potentially-matching token rules.
 */
Lexicon.prototype.getRules = function (str) {
  var key;

  if (!str)
    return [];

  key = str.charAt(0);

  return (this.rules[key] || []).concat(this.rules.RE);
};

/**
 * Filters the set of potential token rules for future or current matches.
 * @expose
 * @param {?Array.<Object>} rules If passed, filter this instead of current Lexicon.
 * @param {?string} str String to find future and current matches for.
 * @return {Array.<Object>} List of eventually-matching token rules.
 */
Lexicon.prototype.filter = function (rules, str) {
  var lexicon = this;
  return (rules || this.getRules(str)).filter(function (rule) {
    return rule.complex ? !!(lexicon.match([rule], str).length) : rule.source.indexOf(str) > -1;
  });
};

/**
 * Like filter, but returns only current matches.
 * @expose
 * @param {?Array.<Object>} rules If passed, filter this instead of current Lexicon.
 * @param {?string} str String to find current token matches for.
 * @returns {Array.<Object>} List of exactly-matching tokens.
 */
Lexicon.prototype.match = function (rules, str) {
  var lexicon = this;
  return (rules || this.getRules(str)).filter(function (rule) {
    var matches = rule.matcher.exec(str);
    return matches && matches.length && matches[0].length === str.length;
  });
};

module.exports = Lexicon;
