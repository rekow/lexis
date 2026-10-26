/**
 * @file Base future class - represents a value to be asynchronously resolved in the future.
 * @author David Rekow <d@davidrekow.com>
 */

/**
 * @constructor
 */
var Future = function () {
  /**
   * @type {string}
   */
  this.status = 'PENDING';

  /**
   * @private
   * @type {?Array.<function(*, Error=)>}
   */
  this._waiting = [];

  /**
   * @private
   * @type {?Array.<*>}
   */
  this._result = null;
};

/**
 * Fulfills the current Future with a value or error.
 * @expose
 * @param {(boolean|*)} value Promised value, or false if an error occurred.
 * @param {Error=} error If fulfill failed, error to pass to waiting callbacks.
 * @throws {Error} If fulfill is called on an already-fulfilled Future.
 * @return {Future}
 */
Future.prototype.fulfill = function (value, error) {
  var cbs;

  if (this.status !== 'PENDING') {
    value = false;
    error = new Error('Can\'t fulfill already-fulfilled future with value ' + value + '.');
  }

  if (value instanceof Future && value.status !== 'FULFILLED') {
    return value.then(this);
  }

  cbs = this._waiting;

  setTimeout(cbs.forEach.bind(cbs, function (cb) {
    if (cb instanceof Future) {
      cb.fulfill(value, error);
    } else {
      cb(value, error);
    }
  }), 0);

  this._waiting = null;

  this.status = error ? 'FAILED' : 'FULFILLED';
  this._result = [value, error];

  return this;
};

/**
 * Returns a new Future waiting for the result of the current Future.
 * @expose
 * @param {(function(*, Error=)|Future)} waiting
 * @return {Future}
 */
Future.prototype.then = function (waiting) {
  var next = new Future(),
    cb = function (value, error) {
      var result;
      if (waiting instanceof Future) {
        waiting.then(function (v, e) { next.fulfill(v, e); });
        waiting.fulfill(value, error);
      } else {
        try {
          result = waiting(value, error);
        } catch (e) {
          return next.fulfill(false, e);
        }

        next.fulfill(result);
      }
    };

  if (this._result) {
    cb.apply(null, this._result);
  } else {
    this._waiting.push(cb);
  }

  return next;
};

module.exports = Future;
