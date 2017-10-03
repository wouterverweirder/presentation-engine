require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   4.1.1
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.ES6Promise = factory());
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  var type = typeof x;
  return x !== null && (type === 'object' || type === 'function');
}

function isFunction(x) {
  return typeof x === 'function';
}

var _isArray = undefined;
if (Array.isArray) {
  _isArray = Array.isArray;
} else {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
}

var isArray = _isArray;

var len = 0;
var vertxNext = undefined;
var customSchedulerFn = undefined;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && ({}).toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  if (typeof vertxNext !== 'undefined') {
    return function () {
      vertxNext(flush);
    };
  }

  return useSetTimeout();
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var r = require;
    var vertx = r('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = undefined;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof require === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var _arguments = arguments;

  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;

  if (_state) {
    (function () {
      var callback = _arguments[_state - 1];
      asap(function () {
        return invokeCallback(_state, child, callback, parent._result);
      });
    })();
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve$1(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(16);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var GET_THEN_ERROR = new ErrorObject();

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    GET_THEN_ERROR.error = error;
    return GET_THEN_ERROR;
  }
}

function tryThen(then$$1, value, fulfillmentHandler, rejectionHandler) {
  try {
    then$$1.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then$$1) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then$$1, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return resolve(promise, value);
    }, function (reason) {
      return reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$1) {
  if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$1 === GET_THEN_ERROR) {
      reject(promise, GET_THEN_ERROR.error);
      GET_THEN_ERROR.error = null;
    } else if (then$$1 === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$1)) {
      handleForeignThenable(promise, maybeThenable, then$$1);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function resolve(promise, value) {
  if (promise === value) {
    reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;

  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = undefined,
      callback = undefined,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function ErrorObject() {
  this.error = null;
}

var TRY_CATCH_ERROR = new ErrorObject();

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = undefined,
      error = undefined,
      succeeded = undefined,
      failed = undefined;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value.error = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
      resolve(promise, value);
    } else if (failed) {
      reject(promise, error);
    } else if (settled === FULFILLED) {
      fulfill(promise, value);
    } else if (settled === REJECTED) {
      reject(promise, value);
    }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      resolve(promise, value);
    }, function rejectPromise(reason) {
      reject(promise, reason);
    });
  } catch (e) {
    reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function Enumerator$1(Constructor, input) {
  this._instanceConstructor = Constructor;
  this.promise = new Constructor(noop);

  if (!this.promise[PROMISE_ID]) {
    makePromise(this.promise);
  }

  if (isArray(input)) {
    this.length = input.length;
    this._remaining = input.length;

    this._result = new Array(this.length);

    if (this.length === 0) {
      fulfill(this.promise, this._result);
    } else {
      this.length = this.length || 0;
      this._enumerate(input);
      if (this._remaining === 0) {
        fulfill(this.promise, this._result);
      }
    }
  } else {
    reject(this.promise, validationError());
  }
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
}

Enumerator$1.prototype._enumerate = function (input) {
  for (var i = 0; this._state === PENDING && i < input.length; i++) {
    this._eachEntry(input[i], i);
  }
};

Enumerator$1.prototype._eachEntry = function (entry, i) {
  var c = this._instanceConstructor;
  var resolve$$1 = c.resolve;

  if (resolve$$1 === resolve$1) {
    var _then = getThen(entry);

    if (_then === then && entry._state !== PENDING) {
      this._settledAt(entry._state, i, entry._result);
    } else if (typeof _then !== 'function') {
      this._remaining--;
      this._result[i] = entry;
    } else if (c === Promise$2) {
      var promise = new c(noop);
      handleMaybeThenable(promise, entry, _then);
      this._willSettleAt(promise, i);
    } else {
      this._willSettleAt(new c(function (resolve$$1) {
        return resolve$$1(entry);
      }), i);
    }
  } else {
    this._willSettleAt(resolve$$1(entry), i);
  }
};

Enumerator$1.prototype._settledAt = function (state, i, value) {
  var promise = this.promise;

  if (promise._state === PENDING) {
    this._remaining--;

    if (state === REJECTED) {
      reject(promise, value);
    } else {
      this._result[i] = value;
    }
  }

  if (this._remaining === 0) {
    fulfill(promise, this._result);
  }
};

Enumerator$1.prototype._willSettleAt = function (promise, i) {
  var enumerator = this;

  subscribe(promise, undefined, function (value) {
    return enumerator._settledAt(FULFILLED, i, value);
  }, function (reason) {
    return enumerator._settledAt(REJECTED, i, reason);
  });
};

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all$1(entries) {
  return new Enumerator$1(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race$1(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject$1(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {function} resolver
  Useful for tooling.
  @constructor
*/
function Promise$2(resolver) {
  this[PROMISE_ID] = nextId();
  this._result = this._state = undefined;
  this._subscribers = [];

  if (noop !== resolver) {
    typeof resolver !== 'function' && needsResolver();
    this instanceof Promise$2 ? initializePromise(this, resolver) : needsNew();
  }
}

Promise$2.all = all$1;
Promise$2.race = race$1;
Promise$2.resolve = resolve$1;
Promise$2.reject = reject$1;
Promise$2._setScheduler = setScheduler;
Promise$2._setAsap = setAsap;
Promise$2._asap = asap;

Promise$2.prototype = {
  constructor: Promise$2,

  /**
    The primary way of interacting with a promise is through its `then` method,
    which registers callbacks to receive either a promise's eventual value or the
    reason why the promise cannot be fulfilled.
  
    ```js
    findUser().then(function(user){
      // user is available
    }, function(reason){
      // user is unavailable, and you are given the reason why
    });
    ```
  
    Chaining
    --------
  
    The return value of `then` is itself a promise.  This second, 'downstream'
    promise is resolved with the return value of the first promise's fulfillment
    or rejection handler, or rejected if the handler throws an exception.
  
    ```js
    findUser().then(function (user) {
      return user.name;
    }, function (reason) {
      return 'default name';
    }).then(function (userName) {
      // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
      // will be `'default name'`
    });
  
    findUser().then(function (user) {
      throw new Error('Found user, but still unhappy');
    }, function (reason) {
      throw new Error('`findUser` rejected and we're unhappy');
    }).then(function (value) {
      // never reached
    }, function (reason) {
      // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
      // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
    });
    ```
    If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
  
    ```js
    findUser().then(function (user) {
      throw new PedagogicalException('Upstream error');
    }).then(function (value) {
      // never reached
    }).then(function (value) {
      // never reached
    }, function (reason) {
      // The `PedgagocialException` is propagated all the way down to here
    });
    ```
  
    Assimilation
    ------------
  
    Sometimes the value you want to propagate to a downstream promise can only be
    retrieved asynchronously. This can be achieved by returning a promise in the
    fulfillment or rejection handler. The downstream promise will then be pending
    until the returned promise is settled. This is called *assimilation*.
  
    ```js
    findUser().then(function (user) {
      return findCommentsByAuthor(user);
    }).then(function (comments) {
      // The user's comments are now available
    });
    ```
  
    If the assimliated promise rejects, then the downstream promise will also reject.
  
    ```js
    findUser().then(function (user) {
      return findCommentsByAuthor(user);
    }).then(function (comments) {
      // If `findCommentsByAuthor` fulfills, we'll have the value here
    }, function (reason) {
      // If `findCommentsByAuthor` rejects, we'll have the reason here
    });
    ```
  
    Simple Example
    --------------
  
    Synchronous Example
  
    ```javascript
    let result;
  
    try {
      result = findResult();
      // success
    } catch(reason) {
      // failure
    }
    ```
  
    Errback Example
  
    ```js
    findResult(function(result, err){
      if (err) {
        // failure
      } else {
        // success
      }
    });
    ```
  
    Promise Example;
  
    ```javascript
    findResult().then(function(result){
      // success
    }, function(reason){
      // failure
    });
    ```
  
    Advanced Example
    --------------
  
    Synchronous Example
  
    ```javascript
    let author, books;
  
    try {
      author = findAuthor();
      books  = findBooksByAuthor(author);
      // success
    } catch(reason) {
      // failure
    }
    ```
  
    Errback Example
  
    ```js
  
    function foundBooks(books) {
  
    }
  
    function failure(reason) {
  
    }
  
    findAuthor(function(author, err){
      if (err) {
        failure(err);
        // failure
      } else {
        try {
          findBoooksByAuthor(author, function(books, err) {
            if (err) {
              failure(err);
            } else {
              try {
                foundBooks(books);
              } catch(reason) {
                failure(reason);
              }
            }
          });
        } catch(error) {
          failure(err);
        }
        // success
      }
    });
    ```
  
    Promise Example;
  
    ```javascript
    findAuthor().
      then(findBooksByAuthor).
      then(function(books){
        // found books
    }).catch(function(reason){
      // something went wrong
    });
    ```
  
    @method then
    @param {Function} onFulfilled
    @param {Function} onRejected
    Useful for tooling.
    @return {Promise}
  */
  then: then,

  /**
    `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
    as the catch block of a try/catch statement.
  
    ```js
    function findAuthor(){
      throw new Error('couldn't find that author');
    }
  
    // synchronous
    try {
      findAuthor();
    } catch(reason) {
      // something went wrong
    }
  
    // async with promises
    findAuthor().catch(function(reason){
      // something went wrong
    });
    ```
  
    @method catch
    @param {Function} onRejection
    Useful for tooling.
    @return {Promise}
  */
  'catch': function _catch(onRejection) {
    return this.then(null, onRejection);
  }
};

/*global self*/
function polyfill$1() {
    var local = undefined;

    if (typeof global !== 'undefined') {
        local = global;
    } else if (typeof self !== 'undefined') {
        local = self;
    } else {
        try {
            local = Function('return this')();
        } catch (e) {
            throw new Error('polyfill failed because global object is unavailable in this environment');
        }
    }

    var P = local.Promise;

    if (P) {
        var promiseToString = null;
        try {
            promiseToString = Object.prototype.toString.call(P.resolve());
        } catch (e) {
            // silently ignored
        }

        if (promiseToString === '[object Promise]' && !P.cast) {
            return;
        }
    }

    local.Promise = Promise$2;
}

// Strange compat..
Promise$2.polyfill = polyfill$1;
Promise$2.Promise = Promise$2;

return Promise$2;

})));



}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":3}],2:[function(require,module,exports){
// the whatwg-fetch polyfill installs the fetch() function
// on the global object (window or self)
//
// Return that as the export for use in Webpack, Browserify etc.
require('whatwg-fetch');
module.exports = self.fetch.bind(self);

},{"whatwg-fetch":4}],3:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ]

    var isDataView = function(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj)
    }

    var isArrayBufferView = ArrayBuffer.isView || function(obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
    }
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1])
      }, this)
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var oldValue = this.map[name]
    this.map[name] = oldValue ? oldValue+','+value : value
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    name = normalizeName(name)
    return this.has(name) ? this.map[name] : null
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value)
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this)
      }
    }
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsArrayBuffer(blob)
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsText(blob)
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf)
    var chars = new Array(view.length)

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i])
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength)
      view.set(new Uint8Array(buf))
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (!body) {
        this._bodyText = ''
      } else if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer)
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer])
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body)
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      }
    }

    this.text = function() {
      var rejected = consumed(this)
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = String(input)
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit })
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers()
    rawHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':')
      var key = parts.shift().trim()
      if (key) {
        var value = parts.join(':').trim()
        headers.append(key, value)
      }
    })
    return headers
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = 'status' in options ? options.status : 200
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = 'statusText' in options ? options.statusText : 'OK'
    this.headers = new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init)
      var xhr = new XMLHttpRequest()

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        }
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL')
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

},{}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _MobileServerBridge = require('../../../shared/js/classes/MobileServerBridge');

var _MobileServerBridge2 = _interopRequireDefault(_MobileServerBridge);

var _Constants = require('../../../shared/js/Constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MobileServerBridge = function (_MobileServerBridgeBa) {
  _inherits(MobileServerBridge, _MobileServerBridgeBa);

  function MobileServerBridge(presentation, settings) {
    _classCallCheck(this, MobileServerBridge);

    var _this = _possibleConstructorReturn(this, (MobileServerBridge.__proto__ || Object.getPrototypeOf(MobileServerBridge)).call(this, presentation, settings));

    bean.on(_this.presentation, _Constants.Constants.SET_CURRENT_SLIDE_INDEX, _this.currentSlideIndexChanged.bind(_this));
    return _this;
  }

  _createClass(MobileServerBridge, [{
    key: 'socketConnectHandler',
    value: function socketConnectHandler() {
      _get(MobileServerBridge.prototype.__proto__ || Object.getPrototypeOf(MobileServerBridge.prototype), 'socketConnectHandler', this).call(this);
      this.tryToSend(_Constants.Constants.MESSAGE, {
        target: {
          client: 'mobile'
        },
        content: {
          action: _Constants.Constants.SET_CURRENT_SLIDE_INDEX,
          currentSlideIndex: this.presentation.currentSlideIndex
        }
      });
    }
  }, {
    key: 'currentSlideIndexChanged',
    value: function currentSlideIndexChanged(currentSlideIndex) {
      this.tryToSend(_Constants.Constants.MESSAGE, {
        target: {
          client: 'mobile'
        },
        content: {
          action: _Constants.Constants.SET_CURRENT_SLIDE_INDEX,
          currentSlideIndex: currentSlideIndex
        }
      });
    }
  }]);

  return MobileServerBridge;
}(_MobileServerBridge2.default);

exports.default = MobileServerBridge;

},{"../../../shared/js/Constants":17,"../../../shared/js/classes/MobileServerBridge":19}],6:[function(require,module,exports){
(function (process){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var childProcess = requireNode("child_process");
var EventEmitter = requireNode("events").EventEmitter;
var path = requireNode("path");

var platform = requireNode("electron").remote.process.platform;
var isWin = /^win/.test(platform);

//kill entire process tree
//http://krasimirtsonev.com/blog/article/Nodejs-managing-child-processes-starting-stopping-exec-spawn
var kill = function kill(pid, signal) {
  signal = signal || "SIGKILL";
  return new Promise(function (resolve) {
    if (!isWin) {
      var psTree = requireNode("ps-tree");
      var killTree = true;
      if (killTree) {
        psTree(pid, function (err, children) {
          [pid].concat(children.map(function (p) {
            return p.PID;
          })).forEach(function (tpid) {
            try {
              process.kill(tpid, signal);
            } catch (ex) {
              console.error(ex);
            }
          });
        });
      } else {
        try {
          process.kill(pid, signal);
        } catch (ex) {
          console.error(ex);
        }
      }
      resolve();
    } else {
      childProcess.exec("taskkill /PID " + pid + " /T /F", function () {
        resolve();
      });
    }
  });
};

var NodeAppRunner = function (_EventEmitter) {
  _inherits(NodeAppRunner, _EventEmitter);

  function NodeAppRunner() {
    _classCallCheck(this, NodeAppRunner);

    return _possibleConstructorReturn(this, (NodeAppRunner.__proto__ || Object.getPrototypeOf(NodeAppRunner)).call(this));
  }

  _createClass(NodeAppRunner, [{
    key: "run",
    value: function run(applicationPath) {
      var _this2 = this;

      return this.stop().then(function () {
        _this2.cwd = path.dirname(applicationPath);
        _this2.numDataEventsReceived = 0;
        _this2.ignoreFirstEventsAmount = 0;
        if (isWin) {
          _this2.ignoreFirstEventsAmount = 2;
          _this2.runner = childProcess.spawn("cmd", ["nvmw", "use", "iojs-v2.3.1"], { cwd: _this2.cwd });
          setTimeout(function () {
            _this2.runner.stdin.write("node " + applicationPath + "\n");
          }, 500);
        } else {
          console.log("node " + applicationPath);
          _this2.runner = childProcess.spawn("node", [applicationPath], { cwd: _this2.cwd });
        }
        _this2.runner.stdout.on("data", function (data) {
          return _this2.onRunnerData(data);
        });
        _this2.runner.stderr.on("data", function (error) {
          return _this2.onRunnerError(error);
        });
        _this2.runner.on("disconnect", function () {
          return _this2.onDisconnect();
        });
        _this2.runner.on("close", function () {
          return _this2.onClose();
        });
        _this2.runner.on("exit", function () {
          return _this2.onExit();
        });
      });
    }
  }, {
    key: "onRunnerData",
    value: function onRunnerData(data) {
      this.numDataEventsReceived++;
      if (this.numDataEventsReceived <= this.ignoreFirstEventsAmount) {
        //ignore the first x-messages
        return;
      }
      data = data.toString().trim();
      if (data.indexOf(this.cwd) === 0) {
        data = data.substr(this.cwd.length);
        if (data.length === 1) {
          return;
        }
      }
      this.emit("stdout-data", data);
    }
  }, {
    key: "onRunnerError",
    value: function onRunnerError(error) {
      this.emit("stderr-data", error.toString().trim());
    }
  }, {
    key: "onDisconnect",
    value: function onDisconnect() {
      console.log("[ChildApp] runner disconnected");
      this.runner = false;
    }
  }, {
    key: "onClose",
    value: function onClose() {
      console.log("[ChildApp] runner closed");
      this.runner = false;
    }
  }, {
    key: "onExit",
    value: function onExit() {
      console.log("[ChildApp] runner exited");
      this.runner = false;
    }
  }, {
    key: "stop",
    value: function stop() {
      var _this3 = this;

      return new Promise(function (resolve) {
        if (!_this3.runner) {
          resolve();
        }
        _this3.runner.stdout.removeAllListeners();
        _this3.runner.stderr.removeAllListeners();
        _this3.runner.stdin.end();
        //listen for runner events and resolve on the one that occurs
        // const cbCalled = false;
        // this.runner.on('disconnect', () => {
        //   console.log('disconnect');
        //   if(!cbCalled) {
        //     resolve();
        //   }
        // });
        // this.runner.on('close', () => {
        //   console.log('close');
        //   if(!cbCalled) {
        //     resolve();
        //   }
        // });
        // this.runner.on('exit', () => {
        //   console.log('exit');
        //   if(!cbCalled) {
        //     resolve();
        //   }
        // });
        kill(_this3.runner.pid).then(function () {
          resolve();
        });
        _this3.runner = false;
      });
    }
  }, {
    key: "destroy",
    value: function destroy() {
      return this.stop().then(function () {});
    }
  }]);

  return NodeAppRunner;
}(EventEmitter);

exports.default = NodeAppRunner;

}).call(this,require('_process'))

},{"_process":3}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Constants = require('../../../shared/js/Constants');

var _Presentation = require('../../../shared/js/classes/Presentation');

var _Presentation2 = _interopRequireDefault(_Presentation);

var _SlideBridge = require('./SlideBridge');

var _SlideBridge2 = _interopRequireDefault(_SlideBridge);

var _MobileServerBridge = require('./MobileServerBridge');

var _MobileServerBridge2 = _interopRequireDefault(_MobileServerBridge);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var path = requireNode('path');

var KEYCODE_LEFT = 37;
var KEYCODE_RIGHT = 39;
var KEYCODE_SPACE = 32;

var Presentation = function (_PresentationBase) {
  _inherits(Presentation, _PresentationBase);

  function Presentation(data, role, settings) {
    _classCallCheck(this, Presentation);

    var _this = _possibleConstructorReturn(this, (Presentation.__proto__ || Object.getPrototypeOf(Presentation)).call(this, data, role, settings));

    window.onbeforeunload = function (event) {
      return _this.closeHandler(event);
    };
    $(window).on('keydown', function (event) {
      return _this.keydownHandler(event);
    });
    bean.on(_this, _Constants.Constants.SET_CURRENT_SLIDE_INDEX, _this.currentSlideIndexChangedHandler.bind(_this));

    $('body').on(_Constants.Constants.GO_TO_PREVIOUS_SLIDE, _this.goToPreviousSlide.bind(_this));
    $('body').on(_Constants.Constants.GO_TO_NEXT_SLIDE, _this.goToNextSlide.bind(_this));
    $('body').on(_Constants.Constants.OPEN_COMMAND_LINE, _this.openCommandLine.bind(_this));
    $('body').on(_Constants.Constants.OPEN_CAMERA, _this.openCamera.bind(_this));
    return _this;
  }

  _createClass(Presentation, [{
    key: 'closeHandler',
    value: function closeHandler(event) {// eslint-disable-line no-unused-vars
    }
  }, {
    key: 'currentSlideIndexChangedHandler',
    value: function currentSlideIndexChangedHandler(slideIndex) {// eslint-disable-line no-unused-vars
    }
  }, {
    key: 'createMobileServerBridge',
    value: function createMobileServerBridge() {
      return new _MobileServerBridge2.default(this, this.settings);
    }
  }, {
    key: 'toggleElevatorMusic',
    value: function toggleElevatorMusic() {
      this.elevatorMusicPlaying = !this.elevatorMusicPlaying;
      if (this.elevatorMusicPlaying) {
        this.elevatorMusic.play();
      } else {
        this.elevatorMusic.pause();
      }
    }

    //prepend urls with file:/// (faster?)

  }, {
    key: 'processSlideSrc',
    value: function processSlideSrc(src) {
      src = 'file:///' + path.resolve(this.settings.presentationPath, src);
      src = src.replace(/\\/g, '/');
      return src;
    }
  }, {
    key: 'createSlideBridges',
    value: function createSlideBridges(data) {
      _Presentation2.default.prototype.createSlideBridges.call(this, data);
      var that = this;
      var $slideMenu = $('#slideMenu');
      var numSlideBridges = this.slideBridges.length;
      for (var i = 0; i < numSlideBridges; i++) {
        var slideBridge = this.slideBridges[i];
        $slideMenu.append('<button type="button" data-slidenr="' + i + '" class="dropdown-item">' + (i + 1) + ' ' + slideBridge.name + '</button>');
      }
      $slideMenu.find('button').on('click', function (event) {
        event.preventDefault();
        that.setCurrentSlideIndex(parseInt($(this).data('slidenr')));
      });
    }
  }, {
    key: 'createSlideBridge',
    value: function createSlideBridge(slide) {
      //use our own bridge which doesn't use fetch
      return new _SlideBridge2.default(slide);
    }
  }, {
    key: 'slideMessageHandler',
    value: function slideMessageHandler(event) {
      _Presentation2.default.prototype.slideMessageHandler.call(this, event);
      if (!event.data) {
        return;
      }
      switch (event.data.action) {
        case _Constants.Constants.GO_TO_PREVIOUS_SLIDE:
          this.goToPreviousSlide();
          break;
        case _Constants.Constants.GO_TO_NEXT_SLIDE:
          this.goToNextSlide();
          break;
        case _Constants.Constants.OPEN_COMMAND_LINE:
          this.openCommandLine();
          break;
        case _Constants.Constants.OPEN_CAMERA:
          this.openCamera();
          break;
      }
    }
  }, {
    key: 'keydownHandler',
    value: function keydownHandler(event) {
      var _this2 = this;

      //one frame delay
      window.requestAnimationFrame(function () {
        if (event.isImmediatePropagationStopped()) {
          return;
        }
        switch (event.keyCode) {
          case KEYCODE_LEFT:
            _this2.goToPreviousSlide();
            break;
          case KEYCODE_RIGHT:
            _this2.goToNextSlide();
            break;
          case KEYCODE_SPACE:
            $('#presentation-controls').toggle();
            break;
        }
      });
    }
  }, {
    key: 'childAppDataHandler',
    value: function childAppDataHandler(data) {
      var currentSlideBridge = this.getSlideBridgeByIndex(this.currentSlideIndex);
      if (currentSlideBridge) {
        currentSlideBridge.tryToPostMessage({
          action: _Constants.Constants.CHILD_APP_STDOUT_DATA,
          data: data
        });
      }
    }
  }, {
    key: 'childAppErrorHandler',
    value: function childAppErrorHandler(data) {
      var currentSlideBridge = this.getSlideBridgeByIndex(this.currentSlideIndex);
      if (currentSlideBridge) {
        currentSlideBridge.tryToPostMessage({
          action: _Constants.Constants.CHILD_APP_STDERR_DATA,
          data: data
        });
      }
    }
  }, {
    key: 'openCommandLine',
    value: function openCommandLine() {
      $('#consoleModal').modal('show');
    }
  }, {
    key: 'openCamera',
    value: function openCamera() {
      $('#webcamModal').modal('show');
    }
  }, {
    key: 'handleMobileServerMessage',
    value: function handleMobileServerMessage(message) {
      if (message.content) {
        if (message.content.action === 'goToNextSlide') {
          this.goToNextSlide();
        } else if (message.content.action === 'goToPreviousSlide') {
          this.goToPreviousSlide();
        }
      }
    }
  }]);

  return Presentation;
}(_Presentation2.default);

exports.default = Presentation;

},{"../../../shared/js/Constants":17,"../../../shared/js/classes/Presentation":20,"./MobileServerBridge":5,"./SlideBridge":8}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _SlideBridge = require('../../../shared/js/classes/SlideBridge');

var _SlideBridge2 = _interopRequireDefault(_SlideBridge);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var SlideBridge = function (_SlideBridgeBase) {
  _inherits(SlideBridge, _SlideBridgeBase);

  function SlideBridge() {
    _classCallCheck(this, SlideBridge);

    return _possibleConstructorReturn(this, (SlideBridge.__proto__ || Object.getPrototypeOf(SlideBridge)).apply(this, arguments));
  }

  _createClass(SlideBridge, [{
    key: 'attachToSlideHolder',
    value: function attachToSlideHolder(slideHolder, src, cb) {
      var _this2 = this;

      // console.log('attachToSlideHolder', src);
      // console.log(slideHolder);
      this.slideHolder = slideHolder;
      //notify the content it is being cleared
      this.tryToPostMessage({ action: 'destroy' });
      //clear the current content
      this.slideHolder.innerHTML = '';
      $(slideHolder).attr('data-name', this.name);
      $(slideHolder).addClass('loading');

      $(slideHolder).off('load');
      $(slideHolder).on('load', function () {
        _this2.tryToPostMessage({
          action: 'setState',
          state: _this2.state
        });
        $(slideHolder).off('load');
      });

      if (src !== $(slideHolder).attr('data-src')) {
        //create html import
        var $importEl = $('<link rel="import">');
        var importEl = $importEl[0];
        $importEl.on('load', function () {
          var template = importEl.import.querySelector('template');
          if (template) {
            var clone = document.importNode(template.content, true);
            _this2.slideHolder.appendChild(clone);
          }
          $importEl.remove();
          $(slideHolder).removeClass('loading');
          cb();
        });
        $importEl.attr('href', src);
        $(slideHolder).attr('data-src', src);
        $(slideHolder).html($importEl);
      }
    }
  }]);

  return SlideBridge;
}(_SlideBridge2.default);

exports.default = SlideBridge;

},{"../../../shared/js/classes/SlideBridge":21}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fs = requireNode("fs-extra");

var CodeElement = function () {
  function CodeElement(el, options) {
    _classCallCheck(this, CodeElement);

    this.el = el;
    this.$el = $(el);
    //options
    if (!options) {
      options = {};
    }

    var width = $(el).parent()[0].style.width || "100%";
    var height = $(el).parent()[0].style.height || "100%";

    //wrap element in a container
    this.$wrapperEl = $(el).wrap("<div class=\"live-code-element live-code-code-element\"></div>").parent();
    this.wrapperEl = this.$wrapperEl[0];

    this.id = this.$el.attr("data-id");
    this.file = this.$el.data("file");

    if (!this.id && this.file) {
      this.id = this.file;
    }
    if (!this.id) {
      this.id = "code-" + Math.round(Math.random() * 1000 * new Date().getTime());
    }
    this.$el.attr("data-id", this.id);

    this.runtime = this.$el.data("runtime");
    if (!this.runtime) {
      this.runtime = "browser";
    }

    this.console = this.$el.data("console");
    this.processor = this.$el.data("processor");

    //language is programming language - used for injecting in html
    this.language = this.$el.data("language");
    if (!this.language) {
      //default to javascript
      this.language = "javascript";
    }

    //mode is mode for codemirror
    this.mode = this.$el.data("mode");
    if (!this.mode) {
      //default to the language
      this.mode = this.language;
    }

    this.codeMirror = CodeMirror.fromTextArea(this.el, {
      lineNumbers: true,
      mode: this.mode,
      extraKeys: { "Ctrl-Space": "autocomplete" }
    });

    this.codeMirror.setSize(width, height);

    //this.$el.css('width', '100%').css('height', '100%');
    this.layout();
  }

  _createClass(CodeElement, [{
    key: "pause",
    value: function pause() {
      //no real reason to do pause / resume
    }
  }, {
    key: "resume",
    value: function resume() {
      //no real reason to do pause / resume
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.pause();
    }
  }, {
    key: "getValue",
    value: function getValue() {
      return this.codeMirror.getValue();
    }
  }, {
    key: "setValue",
    value: function setValue(value) {
      this.codeMirror.setValue(value);
    }
  }, {
    key: "saveToFile",
    value: function saveToFile(filePath) {
      return fs.writeFile(filePath, this.getValue());
    }
  }, {
    key: "readFromFile",
    value: function readFromFile(filePath) {
      var _this = this;

      return fs.readFile(filePath, "utf8").then(function (data) {
        _this.setValue(data);
        return data;
      });
    }
  }, {
    key: "layout",
    value: function layout() {
      // this.$wrapperEl.find('.CodeMirror-scroll').css('max-height', this.$wrapperEl.css('height'));
      this.codeMirror.refresh();
    }
  }]);

  return CodeElement;
}();

exports.default = CodeElement;

},{}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _NodeAppRunner = require('../NodeAppRunner');

var _NodeAppRunner2 = _interopRequireDefault(_NodeAppRunner);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var htmlEscape = function htmlEscape(str) {
  return String(str).replace(/&/g, '&amp;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

var needsJSONConversion = function needsJSONConversion(arg) {
  if (typeof arg === 'number' || typeof arg === 'string' || typeof arg === 'boolean') {
    return false;
  }
  return true;
};

var ConsoleElement = function () {
  function ConsoleElement(el, options) {
    var _this = this;

    _classCallCheck(this, ConsoleElement);

    this.el = el;
    this.$el = $(el);

    this.nodeAppRunner = new _NodeAppRunner2.default();
    this.nodeAppRunner.on('stdout-data', function (data) {
      return _this.info([data]);
    });
    this.nodeAppRunner.on('stderr-data', function (error) {
      return _this.error([error]);
    });

    //options
    if (!options) {
      options = {};
    }
    //wrap element in a container
    this.$wrapperEl = $(el).wrap('<div class="live-code-element live-code-console-element unreset"></div>').parent();
    this.wrapperEl = this.$wrapperEl[0];

    this.id = this.$el.attr('data-id');
    if (!this.id) {
      //generate id
      this.id = 'code-' + Math.round(Math.random() * 1000 * new Date().getTime());
      this.$el.attr('data-id', this.id);
    }

    this.file = this.$el.data('file');

    this.$el.css('width', '100%').css('height', '100%');

    this.logs = [];

    this.isRunning = false;
  }

  _createClass(ConsoleElement, [{
    key: 'pause',
    value: function pause() {
      if (!this.isRunning) {
        return;
      }
      this.isRunning = false;
      this.nodeAppRunner.stop();
    }
  }, {
    key: 'resume',
    value: function resume() {
      if (this.isRunning) {
        return;
      }
      if (!this.applicationPath) {
        return;
      }
      this.nodeAppRunner.run(this.applicationPath);
      this.isRunning = true;
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.pause();
    }
  }, {
    key: 'runNodeApp',
    value: function runNodeApp(applicationPath) {
      this.pause();
      this.applicationPath = applicationPath;
      this.resume();
    }
  }, {
    key: 'info',
    value: function info(args) {
      var str = '';
      args.forEach(function (arg) {
        if (str.length > 0) {
          str += ' ';
        }
        //is it an object or a simple type?
        if (needsJSONConversion(arg)) {
          arg = JSON.stringify(arg);
        }
        str += htmlEscape(arg);
      });
      this.logs.push('<pre>' + str + '</pre>');
      while (this.logs.length > 20) {
        this.logs.shift();
      }
      var html = this.logs.join('');
      this.el.innerHTML = html;
      this.wrapperEl.scrollTop = this.wrapperEl.scrollHeight;
    }
  }, {
    key: 'error',
    value: function error(args) {
      var str = '';
      args.forEach(function (arg) {
        if (str.length > 0) {
          str += ' ';
        }
        //is it an object or a simple type?
        if (needsJSONConversion(arg)) {
          arg = JSON.stringify(arg);
        }
        str += htmlEscape(arg);
      });
      this.logs.push('<pre class="console-error">' + str + '</pre>');
      while (this.logs.length > 20) {
        this.logs.shift();
      }
      var html = this.logs.join('');
      this.el.innerHTML = html;
      this.wrapperEl.scrollTop = this.wrapperEl.scrollHeight;
    }
  }]);

  return ConsoleElement;
}();

exports.default = ConsoleElement;

},{"../NodeAppRunner":6}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TERMINAL_URL = "http://localhost:3000";

var TerminalElement = function () {
  function TerminalElement(el, options) {
    var _this = this;

    _classCallCheck(this, TerminalElement);

    this.el = el;
    this.$el = $(el);

    this._ipcMessageHandler = function (e) {
      return _this.ipcMessageHandler(e);
    };

    //options
    if (!options) {
      options = {};
    }
    //wrap element in a container
    this.$wrapperEl = $(el).wrap("<div class=\"live-code-element live-code-terminal-element\"></div>").parent();
    this.wrapperEl = this.$wrapperEl[0];

    this.id = this.$el.attr("data-id");
    if (!this.id) {
      //generate id
      this.id = "code-" + Math.round(Math.random() * 1000 * new Date().getTime());
      this.$el.attr("data-id", this.id);
    }

    this.dir = this.$el.data("dir");
    this.autorun = this.$el.data("autorun");

    this.$el.css("width", "100%").css("height", "100%");

    this.isRunning = false;
  }

  _createClass(TerminalElement, [{
    key: "pause",
    value: function pause() {
      this.isRunning = false;
      if (this.webview) {
        this.webview.parentNode.removeChild(this.webview);
        this.webview = false;
      }
    }
  }, {
    key: "resume",
    value: function resume() {
      if (this.isRunning) {
        return;
      }
      this.isRunning = true;
      //create a webview tag
      if (this.webview) {
        this.webview.removeEventListener("ipc-message", this._ipcMessageHandler);
        this.webview.parentNode.removeChild(this.webview);
        this.webview = false;
      }
      this.webview = document.createElement("webview");
      // this.webview.addEventListener('dom-ready', () => {
      //   this.webview.openDevTools();
      // });
      this.webview.addEventListener("ipc-message", this._ipcMessageHandler);
      this.webview.style.width = "100%";
      this.webview.style.height = "100%";
      this.webview.setAttribute("nodeintegration", "");
      this.webview.setAttribute("src", TERMINAL_URL);
      this.el.appendChild(this.webview);
    }
  }, {
    key: "ipcMessageHandler",
    value: function ipcMessageHandler(e) {
      if (e.channel !== "message-from-terminal") {
        return;
      }
      if (e.args.length < 1) {
        return;
      }
      var o = e.args[0];
      if (!o.command) {
        return;
      }
      switch (o.command) {
        case "init":
          if (this.dir) {
            this.executeCommand("cd " + this.dir);
            this.executeCommand("clear");
          }
          if (this.autorun) {
            this.executeCommand(this.autorun);
          }
          break;
        default:
          console.warn("unknow command object from terminal");
          console.warn(o);
          break;
      }
    }
  }, {
    key: "executeCommand",
    value: function executeCommand(commandString) {
      this.webview.send("message-to-terminal", {
        command: "execute",
        value: commandString
      });
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.pause();
    }
  }]);

  return TerminalElement;
}();

exports.default = TerminalElement;

},{}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WebPreviewElement = function () {
  function WebPreviewElement(el, options) {
    _classCallCheck(this, WebPreviewElement);

    this.el = el;
    this.$el = $(el);
    //options
    if (!options) {
      options = {};
    }
    //wrap element in a container
    this.$wrapperEl = $(el).wrap("<div class=\"live-code-element live-code-web-preview-element\"></div>").parent();
    this.wrapperEl = this.$wrapperEl[0];

    this.id = this.$el.attr("data-id");
    if (!this.id) {
      //generate id
      this.id = "code-" + Math.round(Math.random() * 1000 * new Date().getTime());
      this.$el.attr("data-id", this.id);
    }

    this.file = this.$el.data("file") || this.$el.data("url");
    this.autoload = this.$el.data("autoload") || false;
    this.zoomfactor = this.$el.data("zoomfactor") || false;

    this.console = this.$el.data("console") || false;

    this.$el.css("width", "100%").css("height", "100%");

    this.url = false;
    this.blocks = false;
    this.isRunning = false;
    //webview gets created by calling updateUrl or updateCode
  }

  _createClass(WebPreviewElement, [{
    key: "destroy",
    value: function destroy() {
      this.pause();
    }
  }, {
    key: "pause",
    value: function pause() {
      this.isRunning = false;
      if (this.webview) {
        this.webview.removeEventListener("did-get-response-details", this._didGetResponseDetailsHandler);
        this.webview.removeEventListener("dom-ready", this._domReadyHandler);
        this.webview.removeEventListener("did-fail-load", this._didFailLoadHandler);
        this.webview.removeEventListener("ipc-message", this._ipcMessageHandler);
        this.webview.parentNode.removeChild(this.webview);
        this.webview = false;
        clearTimeout(this.retryTimeout);
      }
    }
  }, {
    key: "resume",
    value: function resume() {
      if (this.isRunning) {
        return;
      }
      if (this.url === false && this.blocks === false) {
        return;
      }
      this.isRunning = true;
      this._createWebview();
    }
  }, {
    key: "_createWebview",
    value: function _createWebview() {
      var _this = this;

      //create a webview tag
      if (this.webview) {
        this.webview.parentNode.removeChild(this.webview);
        this.webview = false;
      }
      this.webview = document.createElement("webview");
      this.webview.style.width = "100%";
      this.webview.style.height = "100%";
      this.webview.preload = "js/webpreview.js";
      this.el.appendChild(this.webview);

      var url = this.url !== false ? this.url : "webpreview.html";
      var htmlSrc = "";
      if (this.blocks !== false) {
        for (var i = 0; i < this.blocks.length; i++) {
          htmlSrc += this.blocks[i].code;
        }
      }

      //add listeners
      this._didGetResponseDetailsHandler = function (e) {
        if (e.originalURL !== _this.webview.src) {
          return;
        }
        if (_this.$el.attr("data-open-devtools")) {
          _this.webview.openDevTools();
        }
      };
      this.webview.addEventListener("did-get-response-details", this._didGetResponseDetailsHandler);

      this._domReadyHandler = function (e) {
        if (_this.zoomfactor) {
          var zoomfactor = parseFloat(_this.zoomfactor);
          _this.webview.setZoomFactor(zoomfactor);
        }
      };
      this.webview.addEventListener("dom-ready", this._domReadyHandler);

      this._didFailLoadHandler = function () {
        _this.retryTimeout = setTimeout(function () {
          _this.pause();
          _this.resume();
        }, 1000);
      };
      this.webview.addEventListener("did-fail-load", this._didFailLoadHandler);

      this._ipcMessageHandler = function (event) {
        if (event.channel === "request-html") {
          _this.webview.send("receive-html", htmlSrc);
        } else if (event.channel === "console.log") {
          //notify live code editor
          _this.$wrapperEl.trigger("console.log", event.args[0]);
        } else if (event.channel === "console.error") {
          //notify live code editor
          _this.$wrapperEl.trigger("console.error", event.args[0]);
        }
      };
      this.webview.addEventListener("ipc-message", this._ipcMessageHandler);

      if (!this.$el.attr("data-disable-nodeintegration")) {
        this.webview.setAttribute("nodeintegration", "");
      }
      this.webview.setAttribute("src", url);
    }
  }, {
    key: "updateUrl",
    value: function updateUrl(url) {
      this.pause();
      this.url = url;
      this.blocks = false;
      this.resume();
    }
  }, {
    key: "updateCode",
    value: function updateCode(blocks) {
      this.pause();
      this.url = false;
      this.blocks = blocks;
      this.resume();
    }
  }, {
    key: "needsOutputPathPrefix",
    get: function get() {
      return !this.$el.data("url");
    }
  }]);

  return WebPreviewElement;
}();

exports.default = WebPreviewElement;

},{}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WebcamElement = function () {
  function WebcamElement(el, options) {
    _classCallCheck(this, WebcamElement);

    this.el = el;
    this.$el = $(el);

    //options
    if (!options) {
      options = {};
    }

    this.id = this.$el.attr("data-id");
    if (!this.id) {
      //generate id
      this.id = "webcam-" + Math.round(Math.random() * 1000 * new Date().getTime());
      this.$el.attr("data-id", this.id);
    }

    this.source = this.$el.attr("data-source");
    if (this.source) {
      this.sourceEl = document.querySelector(this.source);
    }

    this.ctx = this.el.getContext("2d");

    this.isRunning = false;
  }

  _createClass(WebcamElement, [{
    key: "destroy",
    value: function destroy() {
      this.pause();
    }
  }, {
    key: "pause",
    value: function pause() {
      this.isRunning = false;
      window.cancelAnimationFrame(this.animationFrameId);
    }
  }, {
    key: "resume",
    value: function resume() {
      var _this = this;

      if (this.isRunning) {
        return;
      }
      this.isRunning = true;
      this.animationFrameId = window.requestAnimationFrame(function () {
        return _this.drawLoop();
      });
    }
  }, {
    key: "drawLoop",
    value: function drawLoop() {
      var _this2 = this;

      if (this.isRunning) {
        window.requestAnimationFrame(function () {
          return _this2.drawLoop();
        });
      }
      if (!this.sourceEl) {
        return;
      }
      this.el.width = this.sourceEl.width;
      this.el.height = this.sourceEl.height;
      this.ctx.clearRect(0, 0, this.el.width, this.el.height);
      this.ctx.drawImage(this.sourceEl, 0, 0);
    }
  }]);

  return WebcamElement;
}();

exports.default = WebcamElement;

},{}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _ConsoleElement = require('./ConsoleElement');

var _ConsoleElement2 = _interopRequireDefault(_ConsoleElement);

var _TerminalElement = require('./TerminalElement');

var _TerminalElement2 = _interopRequireDefault(_TerminalElement);

var _CodeElement = require('./CodeElement');

var _CodeElement2 = _interopRequireDefault(_CodeElement);

var _WebPreviewElement = require('./WebPreviewElement');

var _WebPreviewElement2 = _interopRequireDefault(_WebPreviewElement);

var _WebcamElement = require('./WebcamElement');

var _WebcamElement2 = _interopRequireDefault(_WebcamElement);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var path = requireNode('path');
var fs = requireNode('fs-extra');

var LiveCode = function () {
  function LiveCode($el, config, readyCallback) {
    var _this = this;

    _classCallCheck(this, LiveCode);

    this.$el = $el;
    this.el = this.$el[0];

    if (this.$el.attr('data-entry-path')) {
      this.entryPath = path.join(config.presentationPath, this.$el.attr('data-entry-path'));
    }
    if (this.$el.attr('data-output-path')) {
      this.outputPath = path.join(config.presentationPath, this.$el.attr('data-output-path'));
    } else {
      if (this.entryPath) {
        this.outputPath = this.entryPath;
      }
    }

    var p = Promise.resolve();
    p.then(function () {
      if (_this.entryPath && _this.entryPath !== _this.outputPath) {
        return fs.copy(_this.entryPath, _this.outputPath);
      }
    }).then(function () {
      //create the consoles
      _this.consoleElements = {};
      _this.$el.find('[data-type="console"]').each(function (index, consoleEl) {
        return _this.createConsoleElement(consoleEl);
      });

      //create the terminals
      _this.terminalElements = {};
      _this.$el.find('[data-type="terminal"]').each(function (index, terminalEl) {
        return _this.createTerminalElement(terminalEl);
      });

      //create the previews
      _this.webPreviewElements = {};
      _this.$el.find('[data-type="web-preview"]').each(function (index, webPreviewEl) {
        return _this.createWebPreviewElement(webPreviewEl);
      });

      //create the code editors
      _this.codeElements = {};
      _this.$el.find('[data-type="code"]').each(function (index, codeEl) {
        return _this.createCodeElement(codeEl);
      });

      //create the webcam elements
      _this.webcamElements = {};
      _this.$el.find('[data-type="webcam"]').each(function (index, webcamEl) {
        return _this.createWebcamElement(webcamEl);
      });

      //create run buttons
      _this.runButtonEls = [];
      _this.$el.find('[data-type="run-button"]').each(function (index, runButtonEl) {
        return _this.createRunButton(runButtonEl);
      });

      //create save buttons
      _this.saveButtonEls = [];
      _this.$el.find('[data-type="save-button"]').each(function (index, saveButtonEl) {
        return _this.createSaveButton(saveButtonEl);
      });

      //create reload buttons
      _this.reloadButtonEls = [];
      _this.$el.find('[data-type="reload-button"]').each(function (index, reloadButtonEl) {
        return _this.createReloadButton(reloadButtonEl);
      });
    }).then(function () {
      return _this.setCodeElementValuesFromFiles();
    }).then(function () {
      _this.loaded = true;
      if (_this.isRunning) {
        _this.isRunning = false;
        _this.resume();
      }
    }).then(readyCallback).catch(function (err) {
      return console.log(err);
    });

    //disable keyboard bubbling up
    $(window).on('keydown', function (event) {
      return _this.keyDownHandler(event);
    });
  }

  _createClass(LiveCode, [{
    key: 'keyDownHandler',
    value: function keyDownHandler(e) {
      if (this.el.contains(document.activeElement)) {
        e.stopImmediatePropagation();
      }
    }

    /**
     * return a previously created code element, based on the input
     * input can be:
     *  - html dom element
     *  - id of code element
     *
     * returns the code element if found, otherwise returns false
     */

  }, {
    key: 'getCodeElement',
    value: function getCodeElement(input) {
      return this.getElement(this.codeElements, input);
    }

    /**
     * return a previously created web preview element, based on the input
     * input can be:
     *  - html dom element
     *  - id of code element
     *
     * returns the web preview element if found, otherwise returns false
     */

  }, {
    key: 'getWebPreviewElement',
    value: function getWebPreviewElement(input) {
      return this.getElement(this.webPreviewElements, input);
    }
  }, {
    key: 'getElement',
    value: function getElement(elementsCollection, input) {
      var propertyToCheck = 'id';
      if (input.nodeName) {
        propertyToCheck = 'el';
      }
      for (var key in elementsCollection) {
        if (elementsCollection[key][propertyToCheck] === input) {
          return elementsCollection[key];
        }
      }
      return false;
    }
  }, {
    key: 'setCodeElementValueFromFile',
    value: function setCodeElementValueFromFile(codeElement, filePath) {
      return codeElement.readFromFile(filePath);
    }
  }, {
    key: 'saveCodeElementToFile',
    value: function saveCodeElementToFile(codeElement, filePath) {
      return codeElement.saveToFile(filePath);
    }
  }, {
    key: 'getFilePath',
    value: function getFilePath(file) {
      if (!file) {
        return false;
      }
      if (this.outputPath) {
        return path.join(this.outputPath, file);
      }
      return file;
    }
  }, {
    key: 'getFilePathForCodeElement',
    value: function getFilePathForCodeElement(codeElement) {
      if (!codeElement.file) {
        return false;
      }
      return this.getFilePath(codeElement.file);
    }
  }, {
    key: 'setCodeElementValuesFromFiles',
    value: function setCodeElementValuesFromFiles() {
      var tasks = [];
      var key = void 0;
      var codeElement = void 0;
      var filePath = void 0;
      for (key in this.codeElements) {
        codeElement = this.codeElements[key];
        filePath = this.getFilePathForCodeElement(codeElement);
        if (filePath) {
          tasks.push(this.setCodeElementValueFromFile(codeElement, filePath));
        }
      }
      return Promise.all(tasks);
    }
  }, {
    key: 'autoStartWebpreviewElementsWhenNeeded',
    value: function autoStartWebpreviewElementsWhenNeeded() {
      for (var key in this.webPreviewElements) {
        var webPreviewElement = this.webPreviewElements[key];
        if (webPreviewElement.autoload) {
          this.reloadWebPreviewElement(webPreviewElement);
        }
      }
    }
  }, {
    key: 'saveCodeElementsToFiles',
    value: function saveCodeElementsToFiles() {
      var tasks = [];
      var key = void 0;
      var codeElement = void 0;
      var filePath = void 0;
      for (key in this.codeElements) {
        codeElement = this.codeElements[key];
        filePath = this.getFilePathForCodeElement(codeElement);
        if (filePath) {
          tasks.push(this.saveCodeElementToFile(codeElement, filePath));
        }
      }
      return Promise.all(tasks);
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      var _this2 = this;

      var key = void 0;
      for (key in this.consoleElements) {
        this.destroyConsoleElement(this.consoleElements[key]);
      }
      for (key in this.terminalElements) {
        this.destroyTerminalElement(this.terminalElements[key]);
      }
      for (key in this.webPreviewElements) {
        this.destroyWebPreviewElement(this.webPreviewElements[key]);
      }
      for (key in this.codeElements) {
        this.destroyCodeElement(this.codeElements[key]);
      }
      for (key in this.webcamElements) {
        this.destroyWebcamElement(this.webcamElements[key]);
      }
      this.runButtonEls.forEach(function (el) {
        return _this2.destroyRunButton(el);
      });
      this.saveButtonEls.forEach(function (el) {
        return _this2.destroySaveButton(el);
      });
      this.reloadButtonEls.forEach(function (el) {
        return _this2.destroyReloadButton(el);
      });
      //TODO: destroy the tmp directory for this instance
    }
  }, {
    key: 'pause',
    value: function pause() {
      this.isRunning = false;
      if (!this.loaded) {
        return;
      }
      var key = void 0;
      for (key in this.consoleElements) {
        this.consoleElements[key].pause();
      }
      for (key in this.terminalElements) {
        this.terminalElements[key].pause();
      }
      for (key in this.webPreviewElements) {
        this.webPreviewElements[key].pause();
      }
      for (key in this.codeElements) {
        this.codeElements[key].pause();
      }
      for (key in this.webcamElements) {
        this.webcamElements[key].pause();
      }
    }
  }, {
    key: 'resume',
    value: function resume() {
      this.isRunning = true;
      if (!this.loaded) {
        return;
      }
      var key = void 0;
      for (key in this.consoleElements) {
        this.consoleElements[key].resume();
      }
      for (key in this.terminalElements) {
        this.terminalElements[key].resume();
      }
      for (key in this.webPreviewElements) {
        this.webPreviewElements[key].resume();
      }
      for (key in this.codeElements) {
        this.codeElements[key].resume();
      }
      for (key in this.webcamElements) {
        this.webcamElements[key].resume();
      }
      this.autoStartWebpreviewElementsWhenNeeded();
    }
  }, {
    key: 'layout',
    value: function layout() {
      //might be triggered after split pane resize or tab switch
      //codemirror instances need to be updated
      for (var key in this.codeElements) {
        this.codeElements[key].layout();
      }
    }
  }, {
    key: 'createConsoleElement',
    value: function createConsoleElement(consoleEl) {
      var consoleElement = new _ConsoleElement2.default(consoleEl);
      this.consoleElements[consoleElement.id] = consoleElement;
    }
  }, {
    key: 'destroyConsoleElement',
    value: function destroyConsoleElement(consoleElement) {
      consoleElement.destroy();
    }
  }, {
    key: 'createTerminalElement',
    value: function createTerminalElement(terminalEl) {
      var terminalElement = new _TerminalElement2.default(terminalEl);
      this.terminalElements[terminalElement.id] = terminalElement;
    }
  }, {
    key: 'destroyTerminalElement',
    value: function destroyTerminalElement(terminalElement) {
      terminalElement.destroy();
    }
  }, {
    key: 'createWebPreviewElement',
    value: function createWebPreviewElement(webPreviewEl) {
      var webPreviewElement = new _WebPreviewElement2.default(webPreviewEl);
      webPreviewElement.$wrapperEl.on('console.log', this.webPreviewConsoleLogHandler.bind(this, webPreviewElement));
      webPreviewElement.$wrapperEl.on('console.error', this.webPreviewConsoleErrorHandler.bind(this, webPreviewElement));
      this.webPreviewElements[webPreviewElement.id] = webPreviewElement;
    }
  }, {
    key: 'destroyWebPreviewElement',
    value: function destroyWebPreviewElement(webPreviewElement) {
      webPreviewElement.$wrapperEl.off('console.log');
      webPreviewElement.$wrapperEl.off('console.error');
      webPreviewElement.destroy();
    }
  }, {
    key: 'createCodeElement',
    value: function createCodeElement(codeEl) {
      var codeElement = new _CodeElement2.default(codeEl);
      this.codeElements[codeElement.id] = codeElement;
    }
  }, {
    key: 'destroyCodeElement',
    value: function destroyCodeElement(codeElement) {
      codeElement.destroy();
    }
  }, {
    key: 'createWebcamElement',
    value: function createWebcamElement(webcamEl) {
      var webcamElement = new _WebcamElement2.default(webcamEl);
      this.webcamElements[webcamElement.id] = webcamElement;
    }
  }, {
    key: 'destroyWebcamElement',
    value: function destroyWebcamElement(webcamElement) {
      webcamElement.destroy();
    }
  }, {
    key: 'createRunButton',
    value: function createRunButton(runButtonEl) {
      var _this3 = this;

      this.runButtonEls.push(runButtonEl);
      $(runButtonEl).on('click', function () {
        if (_this3.webPreviewElements[$(runButtonEl).data('target')]) {
          //save the files first
          _this3.saveCodeElementsToFiles().catch(function (err) {
            return console.log(err);
          }).then(function () {
            //update the web preview
            _this3.updateWebPreviewElement(_this3.webPreviewElements[$(runButtonEl).data('target')]);
          });
        } else if (_this3.consoleElements[$(runButtonEl).data('target')]) {
          var applicationPath = _this3.getFilePath(_this3.consoleElements[$(runButtonEl).data('target')].file);
          _this3.consoleElements[$(runButtonEl).data('target')].runNodeApp(applicationPath);
        }
      });
    }
  }, {
    key: 'destroyRunButton',
    value: function destroyRunButton(runButtonEl) {
      $(runButtonEl).off('click');
    }
  }, {
    key: 'createSaveButton',
    value: function createSaveButton(saveButtonEl) {
      var _this4 = this;

      this.saveButtonEls.push(saveButtonEl);
      $(saveButtonEl).on('click', function () {
        //get the target element for this button
        var targetString = $(saveButtonEl).data('target');
        if (targetString === 'all') {
          return _this4.saveCodeElementsToFiles();
        }
        var codeElement = _this4.getCodeElement(targetString);
        if (!codeElement) {
          return;
        }
        var filePath = _this4.getFilePathForCodeElement(codeElement);
        if (!filePath) {
          return;
        }
        codeElement.saveToFile(filePath).catch(function (err) {
          console.log(err);
        });
      });
    }
  }, {
    key: 'destroySaveButton',
    value: function destroySaveButton(saveButtonEl) {
      $(saveButtonEl).off('click');
    }
  }, {
    key: 'createReloadButton',
    value: function createReloadButton(reloadButtonEl) {
      var _this5 = this;

      this.reloadButtonEls.push(reloadButtonEl);
      $(reloadButtonEl).on('click', function () {
        //get the reload button target
        var reloadTargetElement = _this5.getCodeElement($(reloadButtonEl).data('target'));
        if (reloadTargetElement) {
          _this5.reloadCodeElement(reloadTargetElement);
          return;
        }
        reloadTargetElement = _this5.getWebPreviewElement($(reloadButtonEl).data('target'));
        if (reloadTargetElement) {
          _this5.reloadWebPreviewElement(reloadTargetElement);
          return;
        }
      });
    }
  }, {
    key: 'reloadCodeElement',
    value: function reloadCodeElement(codeElement) {
      var filePath = self.getFilePathForCodeElement(codeElement);
      if (!filePath) {
        return;
      }
      codeElement.readFromFile(filePath).catch(function (err) {
        return console.log(err);
      });
    }
  }, {
    key: 'reloadWebPreviewElement',
    value: function reloadWebPreviewElement(webPreviewElement) {
      this.updateWebPreviewElement(webPreviewElement);
    }
  }, {
    key: 'destroyReloadButton',
    value: function destroyReloadButton(reloadButtonEl) {
      $(reloadButtonEl).off('click');
    }
  }, {
    key: 'webPreviewConsoleLogHandler',
    value: function webPreviewConsoleLogHandler(webPreviewElement, event, message) {
      //get the console element for this web preview
      var consoleElement = this.getConsoleElementForWebPreview(webPreviewElement);
      if (consoleElement) {
        consoleElement.info(JSON.parse(message).args);
      }
    }
  }, {
    key: 'webPreviewConsoleErrorHandler',
    value: function webPreviewConsoleErrorHandler(webPreviewElement, event, message) {
      //get the console element for this web preview
      var consoleElement = this.getConsoleElementForWebPreview(webPreviewElement);
      if (consoleElement) {
        consoleElement.error(JSON.parse(message).args);
      }
    }
  }, {
    key: 'getConsoleElementForWebPreview',
    value: function getConsoleElementForWebPreview(webPreviewElement) {
      return this.consoleElements[webPreviewElement.console];
    }
  }, {
    key: 'getWebPreviewElementForCodeElement',
    value: function getWebPreviewElementForCodeElement(codeElement) {
      return this.webPreviewElements[codeElement.processor];
    }
  }, {
    key: 'updateWebPreviewElement',
    value: function updateWebPreviewElement(webPreviewElement) {
      //load a file or code blocks?
      if (webPreviewElement.file) {
        if (this.outputPath && webPreviewElement.needsOutputPathPrefix) {
          return webPreviewElement.updateUrl(path.join(this.outputPath, webPreviewElement.file));
        }
        return webPreviewElement.updateUrl(webPreviewElement.file);
      }

      //gather all the code for this element
      var blocks = [];
      for (var key in this.codeElements) {
        var codeElement = this.codeElements[key];
        if (codeElement.processor === webPreviewElement.id) {
          var block = {
            language: codeElement.language,
            code: codeElement.getValue()
          };
          blocks.push(block);
        }
      }
      webPreviewElement.updateCode(blocks);
    }
  }]);

  return LiveCode;
}();

exports.default = LiveCode;

},{"./CodeElement":9,"./ConsoleElement":10,"./TerminalElement":11,"./WebPreviewElement":12,"./WebcamElement":13}],15:[function(require,module,exports){
'use strict';

var _Presentation = require('./classes/Presentation');

var _Presentation2 = _interopRequireDefault(_Presentation);

var _SlidesFolderParser = require('../../server/classes/SlidesFolderParser');

var _SlidesFolderParser2 = _interopRequireDefault(_SlidesFolderParser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('es6-promise').polyfill();

(function () {

  var remote = requireNode('electron').remote;
  var presentationPath = remote.getGlobal('__dirname');
  var path = requireNode('path');

  var init = function init() {
    var settings = {
      presentationPath: presentationPath
      // mobileServerUrl: 'https://bbridges.herokuapp.com',
      // mobileServerUrl: `http://localhost:5000`,
      // mobileServerUsername: `wouter.verweirder@gmail.com`,
      // mobileServerPassword: `geheim`
    };
    var slidesFolderParser = new _SlidesFolderParser2.default();
    slidesFolderParser.parse(presentationPath, path.resolve(presentationPath, 'slides')).then(function (data) {
      new _Presentation2.default(data, 'presentation', settings);
    });
  };

  init();
})();

},{"../../server/classes/SlidesFolderParser":16,"./classes/Presentation":7,"es6-promise":1}],16:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var requireNode = void 0;
if (!(typeof window !== "undefined" && window)) {
  requireNode = require;
} else {
  requireNode = window.requireNode;
}

var fs = requireNode("fs-extra");
var path = requireNode("path");

var getFileProperties = function getFileProperties(filePath) {
  var _fd = void 0,
      _o = void 0;
  return fs.open(filePath, "r").then(function (fd) {
    _fd = fd;
    return fd;
  }).then(function (fd) {
    return fs.fstat(fd);
  }).then(function (o) {
    _o = o;
    return _o;
  }).then(function () {
    return fs.close(_fd);
  }).then(function () {
    return {
      path: filePath,
      isDirectory: _o.isDirectory(),
      isFile: _o.isFile()
    };
  });
};

var SlidesFolderParser = function () {
  function SlidesFolderParser() {
    _classCallCheck(this, SlidesFolderParser);
  }

  _createClass(SlidesFolderParser, [{
    key: "parse",
    value: function parse(presentationPath, slidesFolderPath) {
      var _this = this;

      //read the contents of the slides directory
      return fs.readdir(slidesFolderPath).then(function (result) {
        return result.filter(function (name) {
          return name.indexOf(".") > 0;
        });
      }).then(function (result) {
        return result.map(function (name) {
          return path.resolve(slidesFolderPath, name);
        });
      }).then(function (result) {
        return Promise.all(result.map(function (filePath) {
          return getFileProperties(filePath);
        }));
      }).then(function (result) {
        var data = {
          slides: []
        };
        var slidesByName = {};
        result.forEach(function (props) {
          var slide = _this.createSlideObjectBasedOnFileProperties(props, presentationPath, slidesByName);
          if (!slidesByName[slide.name]) {
            data.slides.push(slide);
          }
          slidesByName[slide.name] = slide;
        });
        // console.log(data.slides);
        return data;
      }).catch(function (e) {
        console.error(e);
      });
    }
  }, {
    key: "parseSlideBaseName",
    value: function parseSlideBaseName(slideBaseName) {
      var parsed = {};
      parsed.ext = path.extname(slideBaseName);
      parsed.name = slideBaseName.substr(0, slideBaseName.length - parsed.ext.length);
      var splitted = parsed.name.split(".");
      var keywords = ["mobile", "desktop", "muted", "loop", "cover"];
      keywords.forEach(function (keyword) {
        var index = splitted.indexOf(keyword);
        if (index > -1) {
          parsed[keyword] = true;
          splitted.splice(index, 1);
        }
      });
      parsed.name = splitted.join(".");
      return parsed;
    }
  }, {
    key: "createSlideObjectBasedOnFileProperties",
    value: function createSlideObjectBasedOnFileProperties(fileProperties, presentationPath, slidesByName) {

      var parsed = this.parseSlideBaseName(path.basename(fileProperties.path));
      var url = path.relative(presentationPath, fileProperties.path).replace("\\", "/");
      if (parsed.ext === ".jpg" || parsed.ext === ".jpeg" || parsed.ext === ".gif" || parsed.ext === ".png") {
        url = "slides-builtin/image.html?image=" + url;
      }
      if (parsed.ext === ".mp4") {
        url = "slides-builtin/video.html?video=" + url;
      }
      if (slidesByName[parsed.name]) {
        if (parsed.mobile) {
          slidesByName[parsed.name].mobile.url = url;
          slidesByName[parsed.name].mobile.explicit = true;
        } else if (parsed.desktop) {
          slidesByName[parsed.name].presentation.url = url;
          slidesByName[parsed.name].presentation.explicit = true;
        } else {
          //set the one which is not set explicitly
          if (slidesByName[parsed.name].mobile.explicit) {
            slidesByName[parsed.name].presentation.url = url;
          } else {
            slidesByName[parsed.name].mobile.url = url;
          }
          return slidesByName[parsed.name];
        }
      }

      return {
        name: parsed.name,
        presentation: {
          url: url,
          explicit: false
        },
        mobile: {
          url: url,
          explicit: false
        }
      };
    }
  }]);

  return SlidesFolderParser;
}();

exports.default = SlidesFolderParser;

},{}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var Constants = exports.Constants = {
  GO_TO_PREVIOUS_SLIDE: "goToPreviousSlide",
  GO_TO_NEXT_SLIDE: "goToNextSlide",
  SET_SLIDES: "setSlides",
  SET_CURRENT_SLIDE_INDEX: "setCurrentSlideIndex",

  MESSAGE: "message",
  SOCKET_SEND: "socketSend",
  SOCKET_RECEIVE: "socketReceive",
  JOIN_SLIDE_ROOM: "joinSlideRoom",
  LEAVE_SLIDE_ROOM: "leaveSlideRoom",

  ROLE_PRESENTATION: "presentation",
  ROLE_MOBILE: "mobile",

  STATE_ACTIVE: "active",
  STATE_INACTIVE: "inactive",

  SET_SUBSTATE: "setSubstate",

  CHILD_APP_SAVE_CODE: "childAppSaveCode",
  CHILD_APP_RUN_CODE: "childAppRunCode",
  CHILD_APP_STDOUT_DATA: "childAppStdoutData",
  CHILD_APP_STDERR_DATA: "childAppStderrData",

  OPEN_COMMAND_LINE: "openCommandLine",
  OPEN_CAMERA: "openCamera",

  BLINK: "blink",

  HEART_RATE_POLAR: "heartRatePolar",

  SET_TEAM: "setTeam",
  UPDATE_MOTION: "updateMotion",

  YOU_WIN: "youWin",
  YOU_LOSE: "youLose",

  SHAKE_YOUR_PHONES_INTRO: "shakeYourPhonesIntro",
  SHAKE_YOUR_PHONES_GAME: "shakeYourPhonesGame",
  SHAKE_YOUR_PHONES_FINISHED: "shakeYourPhonesFinished",

  SHAKE_YOUR_PHONES_CLIENT_ADDED: "shakeYourPhonesClientAdded",
  SHAKE_YOUR_PHONES_CLIENT_REMOVED: "shakeYourPhonesClientRemoved",
  SHAKE_YOUR_PHONES_CLIENT_LIST: "shakeYourPhonesClientList",
  SHAKE_YOUR_PHONES_CLIENT_UPDATE: "shakeYourPhonesClientUpdate"
};

},{}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Constants = require('../Constants');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ContentBase = function () {
  function ContentBase($slideHolder) {
    _classCallCheck(this, ContentBase);

    this.$slideHolder = $slideHolder;
    this.slideHolder = this.$slideHolder[0];
    this.width = this.slideHolder.offsetWidth;
    this.height = this.slideHolder.offsetHeight;
    this.prevWidth = this.width;
    this.prevHeight = this.height;
    this.widthChanged = false;
    this.heightChanged = false;
    this.sizeChanged = false;
    this.src = $slideHolder.attr('data-src');
    this.name = $slideHolder.attr('data-name');
    this.settings = {};
    try {
      this.settings = JSON.parse($('#presentation').attr('data-presentation-settings'));
    } catch (e) {
      console.error(e);
    }
    this.fps = 60;
    this._animationFrameId = false;
    this._currentTime = 0;
    this._delta = 0;
    this._interval = false;
    this._lastTime = new Date().getTime();
    this.currentFrame = 0;

    this.startListeningForMessages();

    this.__drawLoop = this._drawLoop.bind(this);
    this._interval = 1000 / this.fps;

    window.requestAnimationFrame(function () {
      $slideHolder.trigger('load');
    });
  }

  _createClass(ContentBase, [{
    key: 'startListeningForMessages',
    value: function startListeningForMessages() {
      this._slideHolderMessageToSlideHandler = this.slideHolderMessageToSlideHandler.bind(this);
      this.$slideHolder.on('message-to-slide', this._slideHolderMessageToSlideHandler);
    }
  }, {
    key: 'stopListeningForMessages',
    value: function stopListeningForMessages() {
      this.$slideHolder.off('message-to-slide', this._slideHolderMessageToSlideHandler);
    }
  }, {
    key: 'slideHolderMessageToSlideHandler',
    value: function slideHolderMessageToSlideHandler(event, message) {
      this.receiveMessage({ data: message });
    }
  }, {
    key: 'receiveMessage',
    value: function receiveMessage(event) {
      if (!event.data) {
        return;
      }
      switch (event.data.action) {
        case 'setState':
          this.setState(event.data.state);
          break;
        case 'destroy':
          this.destroy();
          break;
        case _Constants.Constants.SOCKET_RECEIVE:
          this.receiveSocketMessage(event.data.message);
          break;
        default:
          this.handleMessage(event.data);
          break;
      }
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.stopListeningForMessages();
      window.cancelAnimationFrame(this._animationFrameId);
    }
  }, {
    key: 'postMessage',
    value: function postMessage(data) {
      this.$slideHolder.trigger('message-from-slide', data);
    }
  }, {
    key: 'handleMessage',
    value: function handleMessage(data) {// eslint-disable-line no-unused-vars
    }
  }, {
    key: 'postSocketMessage',
    value: function postSocketMessage(message) {
      this.postMessage({
        action: _Constants.Constants.SOCKET_SEND,
        message: message
      });
    }
  }, {
    key: 'receiveSocketMessage',
    value: function receiveSocketMessage(message) {// eslint-disable-line no-unused-vars
      //console.log('receiveSocketMessageame, message);
    }
  }, {
    key: 'setState',
    value: function setState(state) {
      if (state !== this.state) {
        this.state = state;
        this.onStateChanged();
        if (this.state === _Constants.Constants.STATE_ACTIVE) {
          this.currentFrame = 0;
          this._drawLoop();
        } else {
          window.cancelAnimationFrame(this._animationFrameId);
        }
      }
    }
  }, {
    key: 'onStateChanged',
    value: function onStateChanged() {}
  }, {
    key: '_drawLoop',
    value: function _drawLoop() {
      this._animationFrameId = window.requestAnimationFrame(this.__drawLoop);
      this._currentTime = new Date().getTime();
      this._delta = this._currentTime - this._lastTime;
      if (this._delta > this._interval) {
        this.currentFrame++;
        this.prevWidth = this.width;
        this.prevHeight = this.height;
        this.width = this.slideHolder.offsetWidth;
        this.height = this.slideHolder.offsetHeight;
        this.widthChanged = this.width !== this.prevWidth;
        this.heightChanged = this.height !== this.prevHeight;
        this.sizeChanged = this.widthChanged || this.heightChanged;
        this.drawLoop(this._delta);
        this._lastTime = this._currentTime - this._delta % this._interval;
      }
    }
  }, {
    key: 'drawLoop',
    value: function drawLoop(delta) {// eslint-disable-line no-unused-vars
    }
  }]);

  return ContentBase;
}();

exports.default = ContentBase;

},{"../Constants":17}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _isomorphicFetch = require('isomorphic-fetch');

var _isomorphicFetch2 = _interopRequireDefault(_isomorphicFetch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MobileServerBridge = function () {
  function MobileServerBridge(presentation, settings) {
    _classCallCheck(this, MobileServerBridge);

    this.presentation = presentation;
    this.settings = settings;
    this.connect();
  }

  _createClass(MobileServerBridge, [{
    key: 'connect',
    value: function connect() {
      var _this = this;

      if (!this.settings.mobileServerUrl) {
        return;
      }
      console.log('MobileServerBridge.connect');
      //console.warn('MobileServerBridge disabled');
      //return;
      //post to the api
      (0, _isomorphicFetch2.default)(this.settings.mobileServerUrl + '/login', {
        method: 'POST',
        body: JSON.stringify(this.getLoginCredentials()),
        headers: new Headers({ 'Content-Type': 'application/json' })
      }).then(function (response) {
        return response.json();
      }).then(function (result) {
        return _this.loginHandler(result);
      }).catch(function () {
        //retry after one second
        setTimeout(function () {
          return _this.connect();
        }, 1000);
      });
    }
  }, {
    key: 'getLoginCredentials',
    value: function getLoginCredentials() {
      return {
        email: this.settings.mobileServerUsername,
        password: this.settings.mobileServerPassword
      };
    }
  }, {
    key: 'loginHandler',
    value: function loginHandler(result) {
      this.token = result.token;
      this.socket = io(this.settings.mobileServerUrl, {
        query: 'token=' + this.token,
        reconnection: false,
        forceNew: true
      });
      this.socket.on('connect', this.socketConnectHandler.bind(this));
      this.socket.on('disconnect', this.socketDisconnectHandler.bind(this));
      this.socket.on('message', this.socketMessageHandler.bind(this));
    }
  }, {
    key: 'socketConnectHandler',
    value: function socketConnectHandler() {
      console.log('MobileServerBridge.socketConnectHandler');
      this.presentation.mobileServerBridgeConnected();
    }
  }, {
    key: 'socketDisconnectHandler',
    value: function socketDisconnectHandler() {
      this.connect();
    }
  }, {
    key: 'tryToSend',
    value: function tryToSend() {
      if (this.socket) {
        this.socket.emit.apply(this.socket, arguments);
      }
    }
  }, {
    key: 'socketMessageHandler',
    value: function socketMessageHandler(message) {
      this.presentation.mobileServerMessageHandler(message);
    }
  }]);

  return MobileServerBridge;
}();

exports.default = MobileServerBridge;

},{"isomorphic-fetch":2}],20:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Constants = require('../Constants');

var _SlideBridge = require('./SlideBridge');

var _SlideBridge2 = _interopRequireDefault(_SlideBridge);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Presentation = function () {
  /*
   * data: json object with slides array property
   * role: mobile or presentation
   */
  function Presentation(data, role, settings) {
    _classCallCheck(this, Presentation);

    this.data = data;
    this.role = role;
    this.settings = settings;
    $('#presentation').attr('data-presentation-settings', JSON.stringify(settings));
    this.currentSlideIndex = -1;
    this.slideHolders = [];
    this.numSlideHolders = 3;
    this.slideBridges = [];
    this.slideBridgesBySlideName = {};

    this.createSlideHolders();
    this.createSlideBridges(this.data);

    this.mobileServerBridge = this.createMobileServerBridge();
    this.startListeningForMessages();

    this.setCurrentSlideIndex(0);
  }

  _createClass(Presentation, [{
    key: 'startListeningForMessages',
    value: function startListeningForMessages() {
      window.addEventListener('message', this.slideMessageHandler.bind(this), false);
    }
  }, {
    key: 'createSlideHolders',
    value: function createSlideHolders() {
      for (var i = 0; i < this.numSlideHolders; i++) {
        var $slideHolder = $('<div class="slide-frame" />');
        this.slideHolders.push($slideHolder);
        $('#presentation').append($slideHolder);
      }
    }
  }, {
    key: 'createSlideBridges',
    value: function createSlideBridges(data) {
      var numSlides = data.slides.length;
      for (var i = 0; i < numSlides; i++) {
        var slideBridge = this.createSlideBridge(data.slides[i]);
        this.slideBridges.push(slideBridge);
        this.slideBridgesBySlideName[slideBridge.name] = slideBridge;
      }
    }
  }, {
    key: 'createSlideBridge',
    value: function createSlideBridge(slide) {
      return new _SlideBridge2.default(slide);
    }
  }, {
    key: 'slideMessageHandler',
    value: function slideMessageHandler(event) {
      if (!event.data) {
        return;
      }
      switch (event.data.action) {
        case _Constants.Constants.SOCKET_SEND:
          if (this.mobileServerBridge) {
            this.mobileServerBridge.tryToSend(_Constants.Constants.MESSAGE, event.data.message);
          }
          break;
      }
    }
  }, {
    key: 'mobileServerBridgeConnected',
    value: function mobileServerBridgeConnected() {
      //join the rooms of the slideHolders
      for (var i = 0; i < this.numSlideHolders; i++) {
        this.mobileServerBridge.tryToSend(_Constants.Constants.JOIN_SLIDE_ROOM, $(this.slideHolders[i]).attr('data-name'));
      }
    }
  }, {
    key: 'mobileServerMessageHandler',
    value: function mobileServerMessageHandler(message) {
      if (message.target.slide) {
        //slide has to handle the message
        var slideBridge = this.getSlideBridgeByName(message.target.slide);
        if (slideBridge) {
          slideBridge.tryToPostMessage({
            action: _Constants.Constants.SOCKET_RECEIVE,
            message: message
          });
        }
      } else {
        //presentation has to handle the message
        this.handleMobileServerMessage(message);
      }
    }
  }, {
    key: 'handleMobileServerMessage',
    value: function handleMobileServerMessage(message) {
      console.log('[shared/Presentation] handleMobileServerMessage', message);
    }
  }, {
    key: 'getSlideBridgeByIndex',
    value: function getSlideBridgeByIndex(index) {
      if (index >= 0 && index < this.slideBridges.length) {
        return this.slideBridges[index];
      }
      return false;
    }
  }, {
    key: 'getSlideBridgeByName',
    value: function getSlideBridgeByName(slideName) {
      return this.slideBridgesBySlideName[slideName];
    }
  }, {
    key: 'getSlideHolderForSlide',
    value: function getSlideHolderForSlide(slide, slidesNotToClear) {
      if (slide) {
        var $slideHolder = $('.slide-frame[data-name="' + slide.name + '"]');
        if ($slideHolder.length > 0) {
          return $slideHolder[0];
        }
        //get a free slideHolder
        var slideNamesNotToClear = [];
        $(slidesNotToClear).each(function (index, obj) {
          slideNamesNotToClear.push(obj.name);
        });
        var $slideHolders = $('.slide-frame');
        for (var i = $slideHolders.length - 1; i >= 0; i--) {
          $slideHolder = $($slideHolders[i]);
          var name = $slideHolder.attr('data-name');
          if (!name || slideNamesNotToClear.indexOf(name) === -1) {
            return $slideHolder[0];
          }
        }
      }
      return false;
    }
  }, {
    key: 'goToPreviousSlide',
    value: function goToPreviousSlide() {
      this.setCurrentSlideIndex(this.currentSlideIndex - 1);
    }
  }, {
    key: 'goToNextSlide',
    value: function goToNextSlide() {
      this.setCurrentSlideIndex(this.currentSlideIndex + 1);
    }
  }, {
    key: 'setCurrentSlideIndex',
    value: function setCurrentSlideIndex(value) {
      value = Math.max(0, Math.min(value, this.slideBridges.length - 1));
      if (value !== this.currentSlideIndex) {
        this.currentSlideIndex = value;

        var currentSlideBridge = this.getSlideBridgeByIndex(this.currentSlideIndex);
        var previousSlideBridge = this.getSlideBridgeByIndex(this.currentSlideIndex - 1);
        var nextSlideBridge = this.getSlideBridgeByIndex(this.currentSlideIndex + 1);

        //remove "used" class from slide holders
        $('.slide-frame').removeAttr('data-used', false);

        var currentSlideHolder = this.getSlideHolderForSlide(currentSlideBridge, [previousSlideBridge, nextSlideBridge]);
        this.setupSlideHolder(currentSlideHolder, currentSlideBridge, _Constants.Constants.STATE_ACTIVE, 0);

        var previousSlideHolder = this.getSlideHolderForSlide(previousSlideBridge, [currentSlideBridge, nextSlideBridge]);
        this.setupSlideHolder(previousSlideHolder, previousSlideBridge, _Constants.Constants.STATE_INACTIVE, '-100%');

        var nextSlideHolder = this.getSlideHolderForSlide(nextSlideBridge, [previousSlideBridge, currentSlideBridge]);
        this.setupSlideHolder(nextSlideHolder, nextSlideBridge, _Constants.Constants.STATE_INACTIVE, '100%');

        //clear attributes of unused slide frames
        $('.slide-frame').each(function (index, slideHolder) {
          if (!$(slideHolder).attr('data-used')) {
            $(slideHolder).removeAttr('data-used').removeAttr('data-name').removeAttr('data-src');
          }
        });

        //all other slideHolder bridges should be unlinked from their slideHolder
        this.slideBridges.forEach(function (slideBridge) {
          if (slideBridge === currentSlideBridge) {
            return;
          }
          if (slideBridge === previousSlideBridge) {
            return;
          }
          if (slideBridge === nextSlideBridge) {
            return;
          }
          slideBridge.slideHolder = null;
        });

        bean.fire(this, _Constants.Constants.SET_CURRENT_SLIDE_INDEX, [this.currentSlideIndex]);
      }
    }
  }, {
    key: 'setupSlideHolder',
    value: function setupSlideHolder(slideHolder, slideBridge, state, left) {
      if (slideHolder) {
        var src = 'slides/' + slideBridge.name + '.html';
        if (slideBridge.data[this.role] && slideBridge.data[this.role].url) {
          src = slideBridge.data[this.role].url;
        }
        src = this.processSlideSrc(src);
        if (slideBridge.isAlreadyCorrectlyAttached(slideHolder, src)) {
          //console.log(slideBridge.name + ' already attached');
        } else {
          this.attachToSlideHolder(slideHolder, slideBridge, src);
        }
        slideBridge.setState(state);
        $(slideHolder).css('left', left);
        $(slideHolder).attr('data-used', 1);
      }
    }
  }, {
    key: 'attachToSlideHolder',
    value: function attachToSlideHolder(slideHolder, slideBridge, src) {
      var _this = this;

      //listen for events on this slideHolder
      $(slideHolder).off('message-from-slide');
      $(slideHolder).on('message-from-slide', function (event, message) {
        _this.slideMessageHandler({ data: message });
      });
      //leave previous channel of this slideHolder
      if (this.mobileServerBridge) {
        this.mobileServerBridge.tryToSend(_Constants.Constants.LEAVE_SLIDE_ROOM, $(slideHolder).attr('data-name'));
      }
      //add the join as a callback for the onload event
      slideBridge.attachToSlideHolder(slideHolder, src, this.slideLoaded.bind(this, slideHolder, slideBridge, src));
    }
  }, {
    key: 'slideLoaded',
    value: function slideLoaded(slideHolder, slideBridge) {
      // eslint-disable-line no-unused-vars
      //join new channel
      if (this.mobileServerBridge) {
        this.mobileServerBridge.tryToSend(_Constants.Constants.JOIN_SLIDE_ROOM, $(slideHolder).attr('data-name'));
      }
    }
  }, {
    key: 'processSlideSrc',
    value: function processSlideSrc(src) {
      return src;
    }
  }, {
    key: 'createMobileServerBridge',
    value: function createMobileServerBridge() {
      //to implement in extending classes
    }
  }]);

  return Presentation;
}();

exports.default = Presentation;

},{"../Constants":17,"./SlideBridge":21}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _isomorphicFetch = require('isomorphic-fetch');

var _isomorphicFetch2 = _interopRequireDefault(_isomorphicFetch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SlideBridge = function () {
  function SlideBridge(data) {
    _classCallCheck(this, SlideBridge);

    this.data = data;
    this.name = this.data.name;
  }

  _createClass(SlideBridge, [{
    key: 'isAlreadyCorrectlyAttached',
    value: function isAlreadyCorrectlyAttached(slideHolder, src) {
      return this.slideHolder === slideHolder && $(slideHolder).attr('data-name') === this.name && $(slideHolder).attr('data-src') === src;
    }
  }, {
    key: 'attachToSlideHolder',
    value: function attachToSlideHolder(slideHolder, src, cb) {
      var _this = this;

      this.slideHolder = slideHolder;
      //notify the content it is being cleared
      this.tryToPostMessage({ action: 'destroy' });
      //clear the current content
      this.slideHolder.innerHTML = '';
      $(slideHolder).attr('data-name', this.name);
      $(slideHolder).addClass('loading');

      $(slideHolder).off('load');
      $(slideHolder).on('load', function () {
        _this.tryToPostMessage({
          action: 'setState',
          state: _this.state
        });
        $(slideHolder).off('load');
      });

      if (src !== $(slideHolder).attr('data-src')) {
        //fetch the html
        (0, _isomorphicFetch2.default)(src).then(function (result) {
          return result.text();
        }).then(function (result) {
          return $(result);
        }).then(function ($result) {
          $(slideHolder).html($result.html());
          $(slideHolder).removeClass('loading');
          cb();
        }).catch(function (err) {
          console.error(err);
          $(slideHolder).removeClass('loading');
          cb();
        });
        $(slideHolder).attr('data-src', src);
      }
    }
  }, {
    key: 'tryToPostMessage',
    value: function tryToPostMessage(message) {
      if (!this.slideHolder) {
        console.log(this.name + ' post fail');
        return;
      }
      //trigger with jquery
      $(this.slideHolder).trigger('message-to-slide', message);
    }
  }, {
    key: 'setState',
    value: function setState(state) {
      this.state = state;
      this.tryToPostMessage({
        action: 'setState',
        state: this.state
      });
    }
  }]);

  return SlideBridge;
}();

exports.default = SlideBridge;

},{"isomorphic-fetch":2}],"LiveCodeSlide":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _Constants = require('../../../../shared/js/Constants');

var _ContentBase2 = require('../../../../shared/js/classes/ContentBase');

var _ContentBase3 = _interopRequireDefault(_ContentBase2);

var _liveCode = require('../live-code');

var _liveCode2 = _interopRequireDefault(_liveCode);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LiveCodeSlide = function (_ContentBase) {
  _inherits(LiveCodeSlide, _ContentBase);

  function LiveCodeSlide($slideHolder, config, readyCallback) {
    _classCallCheck(this, LiveCodeSlide);

    var _this = _possibleConstructorReturn(this, (LiveCodeSlide.__proto__ || Object.getPrototypeOf(LiveCodeSlide)).call(this, $slideHolder));

    var remote = requireNode('electron').remote;
    var config2 = _extends({}, config, { presentationPath: remote.getGlobal('__dirname') });

    //find live code element
    _this.liveCode = new _liveCode2.default(_this.$slideHolder.find('.live-code'), config2, readyCallback);
    return _this;
  }

  _createClass(LiveCodeSlide, [{
    key: 'layout',
    value: function layout() {
      this.liveCode.layout();
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      _get(LiveCodeSlide.prototype.__proto__ || Object.getPrototypeOf(LiveCodeSlide.prototype), 'destroy', this).call(this);
      this.liveCode.destroy();
    }
  }, {
    key: 'onStateChanged',
    value: function onStateChanged() {
      if (this.state === _Constants.Constants.STATE_ACTIVE) {
        this.liveCode.resume();
      } else {
        //stop
        this.liveCode.pause();
      }
    }
  }]);

  return LiveCodeSlide;
}(_ContentBase3.default);

exports.default = LiveCodeSlide;

},{"../../../../shared/js/Constants":17,"../../../../shared/js/classes/ContentBase":18,"../live-code":14}],"VideoSlide":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _Constants = require('../../../../shared/js/Constants');

var _ContentBase2 = require('../../../../shared/js/classes/ContentBase');

var _ContentBase3 = _interopRequireDefault(_ContentBase2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var getParameterByName = function getParameterByName(url, name) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
      results = regex.exec(url);
  return results == null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

var VideoSlide = function (_ContentBase) {
  _inherits(VideoSlide, _ContentBase);

  function VideoSlide($slideHolder) {
    _classCallCheck(this, VideoSlide);

    var _this = _possibleConstructorReturn(this, (VideoSlide.__proto__ || Object.getPrototypeOf(VideoSlide)).call(this, $slideHolder));

    _this.videoPlaying = false;
    var videoUrl = getParameterByName(_this.src, 'video');

    //check for extra config in the filename
    var loop = false;
    var muted = false;
    var videoUrlSplitted = videoUrl.split('.');
    videoUrlSplitted.forEach(function (part) {
      if (part === 'loop') {
        loop = true;
      }
      if (part === 'muted') {
        muted = true;
      }
    });

    _this.video = _this.$slideHolder.find('video')[0];
    if (loop) {
      $(_this.video).attr('loop', 'loop');
    }
    if (muted) {
      $(_this.video).attr('muted', 'muted');
    }
    $(_this.video).attr('src', videoUrl);
    _this._clickHandler = function () {
      return _this.toggleVideoPlaying();
    };
    $(_this.video).on('click', _this._clickHandler);
    return _this;
  }

  _createClass(VideoSlide, [{
    key: 'destroy',
    value: function destroy() {
      _get(VideoSlide.prototype.__proto__ || Object.getPrototypeOf(VideoSlide.prototype), 'destroy', this).call(this);
      $(this.video).off('click', this._clickHandler);
    }
  }, {
    key: 'onStateChanged',
    value: function onStateChanged() {
      if (this.state === _Constants.Constants.STATE_ACTIVE) {
        this.setVideoPlaying(true);
      } else {
        this.setVideoPlaying(false);
      }
    }
  }, {
    key: 'setVideoPlaying',
    value: function setVideoPlaying(value) {
      if (value !== this.videoPlaying) {
        this.videoPlaying = value;
        if (this.videoPlaying) {
          this.video.play();
        } else {
          this.video.pause();
        }
      }
    }
  }, {
    key: 'toggleVideoPlaying',
    value: function toggleVideoPlaying() {
      this.setVideoPlaying(!this.videoPlaying);
    }
  }]);

  return VideoSlide;
}(_ContentBase3.default);

exports.default = VideoSlide;

},{"../../../../shared/js/Constants":17,"../../../../shared/js/classes/ContentBase":18}]},{},[15])

//# sourceMappingURL=script.js.map
