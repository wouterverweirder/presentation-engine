require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// the whatwg-fetch polyfill installs the fetch() function
// on the global object (window or self)
//
// Return that as the export for use in Webpack, Browserify etc.
require('whatwg-fetch');
module.exports = self.fetch.bind(self);

},{"whatwg-fetch":3}],2:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

(function () {
    try {
        cachedSetTimeout = setTimeout;
    } catch (e) {
        cachedSetTimeout = function () {
            throw new Error('setTimeout is not defined');
        }
    }
    try {
        cachedClearTimeout = clearTimeout;
    } catch (e) {
        cachedClearTimeout = function () {
            throw new Error('clearTimeout is not defined');
        }
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
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

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
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

    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var list = this.map[name]
    if (!list) {
      list = []
      this.map[name] = list
    }
    list.push(value)
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    var values = this.map[normalizeName(name)]
    return values ? values[0] : null
  }

  Headers.prototype.getAll = function(name) {
    return this.map[normalizeName(name)] || []
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = [normalizeValue(value)]
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    Object.getOwnPropertyNames(this.map).forEach(function(name) {
      this.map[name].forEach(function(value) {
        callback.call(thisArg, value, name, this)
      }, this)
    }, this)
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
    reader.readAsArrayBuffer(blob)
    return fileReaderReady(reader)
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    reader.readAsText(blob)
    return fileReaderReady(reader)
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (!body) {
        this._bodyText = ''
      } else if (support.arrayBuffer && ArrayBuffer.prototype.isPrototypeOf(body)) {
        // Only support ArrayBuffers for POST method.
        // Receiving ArrayBuffers happens via Blobs, instead.
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
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        return this.blob().then(readBlobAsArrayBuffer)
      }

      this.text = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return readBlobAsText(this._bodyBlob)
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as text')
        } else {
          return Promise.resolve(this._bodyText)
        }
      }
    } else {
      this.text = function() {
        var rejected = consumed(this)
        return rejected ? rejected : Promise.resolve(this._bodyText)
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
    if (Request.prototype.isPrototypeOf(input)) {
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
      if (!body) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = input
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
    return new Request(this)
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

  function headers(xhr) {
    var head = new Headers()
    var pairs = (xhr.getAllResponseHeaders() || '').trim().split('\n')
    pairs.forEach(function(header) {
      var split = header.trim().split(':')
      var key = split.shift().trim()
      var value = split.join(':').trim()
      head.append(key, value)
    })
    return head
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = options.statusText
    this.headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers)
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
      var request
      if (Request.prototype.isPrototypeOf(input) && !init) {
        request = input
      } else {
        request = new Request(input, init)
      }

      var xhr = new XMLHttpRequest()

      function responseURL() {
        if ('responseURL' in xhr) {
          return xhr.responseURL
        }

        // Avoid security warnings on getResponseHeader when not allowed by CORS
        if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
          return xhr.getResponseHeader('X-Request-URL')
        }

        return
      }

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: headers(xhr),
          url: responseURL()
        }
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

},{}],4:[function(require,module,exports){
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

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(MobileServerBridge).call(this, presentation, settings));

    bean.on(_this.presentation, _Constants.Constants.SET_CURRENT_SLIDE_INDEX, _this.currentSlideIndexChanged.bind(_this));
    return _this;
  }

  _createClass(MobileServerBridge, [{
    key: 'socketConnectHandler',
    value: function socketConnectHandler() {
      _get(Object.getPrototypeOf(MobileServerBridge.prototype), 'socketConnectHandler', this).call(this);
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

},{"../../../shared/js/Constants":15,"../../../shared/js/classes/MobileServerBridge":17}],5:[function(require,module,exports){
(function (process){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var childProcess = requireNode('child_process');
var EventEmitter = requireNode('events').EventEmitter;
var path = requireNode('path');

var platform = requireNode('electron').remote.process.platform;
var isWin = /^win/.test(platform);

//kill entire process tree
//http://krasimirtsonev.com/blog/article/Nodejs-managing-child-processes-starting-stopping-exec-spawn
var kill = function kill(pid, signal) {
  signal = signal || 'SIGKILL';
  return new Promise(function (resolve, reject) {
    if (!isWin) {
      var psTree = requireNode('ps-tree');
      var killTree = true;
      if (killTree) {
        psTree(pid, function (err, children) {
          [pid].concat(children.map(function (p) {
            return p.PID;
          })).forEach(function (tpid) {
            try {
              process.kill(tpid, signal);
            } catch (ex) {}
          });
        });
      } else {
        try {
          process.kill(pid, signal);
        } catch (ex) {}
      }
      resolve();
    } else {
      childProcess.exec('taskkill /PID ' + pid + ' /T /F', function (error, stdout, stderr) {
        resolve();
      });
    }
  });
};

var NodeAppRunner = function (_EventEmitter) {
  _inherits(NodeAppRunner, _EventEmitter);

  function NodeAppRunner() {
    _classCallCheck(this, NodeAppRunner);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(NodeAppRunner).call(this));
  }

  _createClass(NodeAppRunner, [{
    key: 'run',
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
          console.log('node ' + applicationPath);
          _this2.runner = childProcess.spawn("node", [applicationPath], { cwd: _this2.cwd });
        }
        _this2.runner.stdout.on('data', function (data) {
          return _this2.onRunnerData(data);
        });
        _this2.runner.stderr.on('data', function (error) {
          return _this2.onRunnerError(error);
        });
        _this2.runner.on('disconnect', function () {
          return _this2.onDisconnect();
        });
        _this2.runner.on('close', function () {
          return _this2.onClose();
        });
        _this2.runner.on('exit', function () {
          return _this2.onExit();
        });
      });
    }
  }, {
    key: 'onRunnerData',
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
      this.emit('stdout-data', data);
    }
  }, {
    key: 'onRunnerError',
    value: function onRunnerError(error) {
      this.emit('stderr-data', error.toString().trim());
    }
  }, {
    key: 'onDisconnect',
    value: function onDisconnect() {
      console.log('[ChildApp] runner disconnected');
      this.runner = false;
    }
  }, {
    key: 'onClose',
    value: function onClose() {
      console.log('[ChildApp] runner closed');
      this.runner = false;
    }
  }, {
    key: 'onExit',
    value: function onExit() {
      console.log('[ChildApp] runner exited');
      this.runner = false;
    }
  }, {
    key: 'stop',
    value: function stop() {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        if (!_this3.runner) {
          resolve();
        }
        _this3.runner.stdout.removeAllListeners();
        _this3.runner.stderr.removeAllListeners();
        _this3.runner.stdin.end();
        //listen for runner events and resolve on the one that occurs
        var cbCalled = false;
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
    key: 'destroy',
    value: function destroy() {
      return this.stop().then(function () {});
    }
  }]);

  return NodeAppRunner;
}(EventEmitter);

exports.default = NodeAppRunner;

}).call(this,require('_process'))

},{"_process":2}],6:[function(require,module,exports){
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

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Presentation).call(this, data, role, settings));

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
    value: function closeHandler(event) {}
  }, {
    key: 'currentSlideIndexChangedHandler',
    value: function currentSlideIndexChangedHandler(slideIndex) {}
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
      src = src.replace(/\\/g, "/");
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
        case _Constants.Constants.CHILD_APP_SAVE_CODE:
          ChildApp.getInstance().saveCode(event.data.code, event.data.type);
          break;
        case _Constants.Constants.CHILD_APP_RUN_CODE:
          ChildApp.getInstance().runCode(event.data.code, event.data.type);
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

},{"../../../shared/js/Constants":15,"../../../shared/js/classes/Presentation":18,"./MobileServerBridge":4,"./SlideBridge":7}],7:[function(require,module,exports){
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

    return _possibleConstructorReturn(this, Object.getPrototypeOf(SlideBridge).apply(this, arguments));
  }

  _createClass(SlideBridge, [{
    key: 'attachToSlideHolder',
    value: function attachToSlideHolder(slideHolder, src, cb) {
      var _this2 = this;

      this.slideHolder = slideHolder;
      //notify the content it is being cleared
      this.tryToPostMessage({ action: 'destroy' });
      //clear the current content
      this.slideHolder.innerHTML = '';
      $(slideHolder).attr('data-name', this.name);
      $(slideHolder).addClass('loading');

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
            this.slideHolder.appendChild(clone);
          }
          $importEl.remove();
          $(slideHolder).removeClass('loading');
          cb();
        }.bind(this));
        $importEl.attr('href', src);
        $(slideHolder).attr('data-src', src);
        $(slideHolder).html($importEl);
      }
    }
  }]);

  return SlideBridge;
}(_SlideBridge2.default);

exports.default = SlideBridge;

},{"../../../shared/js/classes/SlideBridge":19}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fs = requireNode('fs-promise');

var CodeElement = function () {
  function CodeElement(el, options) {
    _classCallCheck(this, CodeElement);

    this.el = el;
    this.$el = $(el);
    //options
    if (!options) {
      options = {};
    }

    var width = $(el).parent()[0].style.width || '100%';
    var height = $(el).parent()[0].style.height || '100%';

    //wrap element in a container
    this.$wrapperEl = $(el).wrap('<div class="live-code-element live-code-code-element"></div>').parent();
    this.wrapperEl = this.$wrapperEl[0];

    this.id = this.$el.attr('data-id');
    this.file = this.$el.data('file');

    if (!this.id && this.file) {
      this.id = this.file;
    }
    if (!this.id) {
      this.id = 'code-' + Math.round(Math.random() * 1000 * new Date().getTime());
    }
    this.$el.attr('data-id', this.id);

    this.runtime = this.$el.data('runtime');
    if (!this.runtime) {
      this.runtime = 'browser';
    }

    this.console = this.$el.data('console');
    this.processor = this.$el.data('processor');

    //language is programming language - used for injecting in html
    this.language = this.$el.data('language');
    if (!this.language) {
      //default to javascript
      this.language = "javascript";
    }

    //mode is mode for codemirror
    this.mode = this.$el.data('mode');
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
    key: 'stop',
    value: function stop() {}
  }, {
    key: 'destroy',
    value: function destroy() {
      this.stop();
    }
  }, {
    key: 'getValue',
    value: function getValue() {
      return this.codeMirror.getValue();
    }
  }, {
    key: 'setValue',
    value: function setValue(value) {
      this.codeMirror.setValue(value);
    }
  }, {
    key: 'saveToFile',
    value: function saveToFile(filePath) {
      return fs.writeFile(filePath, this.getValue());
    }
  }, {
    key: 'readFromFile',
    value: function readFromFile(filePath) {
      var _this = this;

      return fs.readFile(filePath, 'utf8').then(function (data) {
        _this.setValue(data);
        return data;
      });
    }
  }, {
    key: 'layout',
    value: function layout() {
      // this.$wrapperEl.find('.CodeMirror-scroll').css('max-height', this.$wrapperEl.css('height'));
      this.codeMirror.refresh();
    }
  }]);

  return CodeElement;
}();

exports.default = CodeElement;

},{}],9:[function(require,module,exports){
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
  }

  _createClass(ConsoleElement, [{
    key: 'stop',
    value: function stop() {
      this.nodeAppRunner.stop();
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.stop();
    }
  }, {
    key: 'runNodeApp',
    value: function runNodeApp(applicationPath) {
      this.nodeAppRunner.run(applicationPath);
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

},{"../NodeAppRunner":5}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TerminalElement = function () {
  function TerminalElement(el, options) {
    _classCallCheck(this, TerminalElement);

    this.el = el;
    this.$el = $(el);

    //options
    if (!options) {
      options = {};
    }
    //wrap element in a container
    this.$wrapperEl = $(el).wrap('<div class="live-code-element live-code-terminal-element"></div>').parent();
    this.wrapperEl = this.$wrapperEl[0];

    this.id = this.$el.attr('data-id');
    if (!this.id) {
      //generate id
      this.id = 'code-' + Math.round(Math.random() * 1000 * new Date().getTime());
      this.$el.attr('data-id', this.id);
    }

    this.dir = this.$el.data('dir');

    this.$el.css('width', '100%').css('height', '100%');

    //create a webview tag
    if (this.webview) {
      this.webview.parentNode.removeChild(this.webview);
      this.webview = false;
    }
    this.webview = document.createElement('webview');
    this.webview.style.width = '100%';
    this.webview.style.height = '100%';
    this.el.appendChild(this.webview);
    this.webview.setAttribute('src', 'http://localhost:3000?dir=' + this.dir);
  }

  _createClass(TerminalElement, [{
    key: 'stop',
    value: function stop() {
      if (this.webview) {
        this.webview.parentNode.removeChild(this.webview);
        this.webview = false;
      }
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.stop();
    }
  }]);

  return TerminalElement;
}();

exports.default = TerminalElement;

},{}],11:[function(require,module,exports){
'use strict';

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
    this.$wrapperEl = $(el).wrap('<div class="live-code-element live-code-web-preview-element"></div>').parent();
    this.wrapperEl = this.$wrapperEl[0];

    this.id = this.$el.attr('data-id');
    if (!this.id) {
      //generate id
      this.id = 'code-' + Math.round(Math.random() * 1000 * new Date().getTime());
      this.$el.attr('data-id', this.id);
    }

    this.file = this.$el.data('file');

    this.console = this.$el.data('console');

    this.$el.css('width', '100%').css('height', '100%');
  }

  _createClass(WebPreviewElement, [{
    key: 'destroy',
    value: function destroy() {
      this.stop();
    }
  }, {
    key: 'stop',
    value: function stop() {
      if (this.webview) {
        this.webview.parentNode.removeChild(this.webview);
        this.webview = false;
      }
    }
  }, {
    key: '_createWebview',
    value: function _createWebview() {
      //create a webview tag
      if (this.webview) {
        this.webview.parentNode.removeChild(this.webview);
        this.webview = false;
      }
      this.webview = document.createElement('webview');
      this.webview.style.width = '100%';
      this.webview.style.height = '100%';
      this.webview.preload = 'js/webpreview.js';
      this.el.appendChild(this.webview);
    }
  }, {
    key: 'updateUrl',
    value: function updateUrl(url) {
      this._createWebview();
      this.webview.addEventListener("dom-ready", function () {
        //inject console logging code
        console.log('dom-ready');
      }.bind(this));

      this.webview.addEventListener('ipc-message', function (event) {
        if (event.channel === 'console.log') {
          //notify live code editor
          this.$wrapperEl.trigger('console.log', event.args[0]);
        } else if (event.channel === 'console.error') {
          //notify live code editor
          this.$wrapperEl.trigger('console.error', event.args[0]);
        }
      }.bind(this));

      this.webview.setAttribute('nodeintegration', '');
      this.webview.setAttribute('src', url);
    }
  }, {
    key: 'updateCode',
    value: function updateCode(blocks) {
      this._createWebview();

      var htmlSrc = '';
      for (var i = 0; i < blocks.length; i++) {
        htmlSrc += blocks[i].code;
      }

      this.webview.addEventListener("dom-ready", function () {
        if (this.$el.attr('data-open-devtools')) {
          this.webview.openDevTools();
        }
      }.bind(this));

      this.webview.addEventListener('ipc-message', function (event) {
        if (event.channel === 'request-html') {
          this.webview.send('receive-html', htmlSrc);
        } else if (event.channel === 'console.log') {
          //notify live code editor
          this.$wrapperEl.trigger('console.log', event.args[0]);
        } else if (event.channel === 'console.error') {
          //notify live code editor
          this.$wrapperEl.trigger('console.error', event.args[0]);
        }
      }.bind(this));

      this.webview.setAttribute('nodeintegration', '');
      this.webview.setAttribute('src', 'webpreview.html');
    }
  }]);

  return WebPreviewElement;
}();

exports.default = WebPreviewElement;

},{}],12:[function(require,module,exports){
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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var path = requireNode('path');
var fs = requireNode('fs-promise');

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
      var propertyToCheck = 'id';
      if (input.nodeName) {
        propertyToCheck = 'el';
      }
      for (var key in this.codeElements) {
        if (this.codeElements[key][propertyToCheck] === input) {
          return this.codeElements[key];
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
    key: 'stop',
    value: function stop() {
      var key = void 0;
      for (key in this.consoleElements) {
        this.consoleElements[key].stop();
      }
      for (key in this.terminalElements) {
        this.terminalElements[key].stop();
      }
      for (key in this.webPreviewElements) {
        this.webPreviewElements[key].stop();
      }
      for (key in this.codeElements) {
        this.codeElements[key].stop();
      }
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
    key: 'createRunButton',
    value: function createRunButton(runButtonEl) {
      var _this3 = this;

      this.runButtonEls.push(runButtonEl);
      $(runButtonEl).on('click', function (event) {
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
      var self = this;
      this.saveButtonEls.push(saveButtonEl);
      $(saveButtonEl).on('click', function () {
        //get the code element for this reload button
        var codeElement = self.getCodeElement($(saveButtonEl).data('target'));
        if (!codeElement) {
          return;
        }
        var filePath = self.getFilePathForCodeElement(codeElement);
        if (!filePath) {
          return;
        }
        codeElement.saveToFile(filePath).catch(function (err) {
          console.log(err);
        });
      }.bind(this));
    }
  }, {
    key: 'destroySaveButton',
    value: function destroySaveButton(saveButtonEl) {
      $(saveButtonEl).off('click');
    }
  }, {
    key: 'createReloadButton',
    value: function createReloadButton(reloadButtonEl) {
      var self = this;
      this.reloadButtonEls.push(reloadButtonEl);
      $(reloadButtonEl).on('click', function () {
        //get the code element for this reload button
        var codeElement = self.getCodeElement($(reloadButtonEl).data('target'));
        if (!codeElement) {
          return;
        }
        var filePath = self.getFilePathForCodeElement(codeElement);
        if (!filePath) {
          return;
        }
        codeElement.readFromFile(filePath).catch(function (err) {
          console.log(err);
        });
      }.bind(this));
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
        if (this.outputPath) {
          webPreviewElement.updateUrl(path.join(this.outputPath, webPreviewElement.file));
        } else {
          webPreviewElement.updateUrl(webPreviewElement.file);
        }
        return;
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

},{"./CodeElement":8,"./ConsoleElement":9,"./TerminalElement":10,"./WebPreviewElement":11}],13:[function(require,module,exports){
'use strict';

var _Presentation = require('./classes/Presentation');

var _Presentation2 = _interopRequireDefault(_Presentation);

var _SlidesFolderParser = require('../../server/classes/SlidesFolderParser');

var _SlidesFolderParser2 = _interopRequireDefault(_SlidesFolderParser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function () {

  var remote = requireNode('electron').remote;
  var presentationPath = remote.getGlobal('__dirname');
  var path = requireNode('path');

  var init = function init() {
    var settings = {
      presentationPath: presentationPath,
      // mobileServerUrl: 'https://bbridges.herokuapp.com',
      mobileServerUrl: 'http://localhost:5000',
      mobileServerUsername: 'wouter.verweirder@gmail.com',
      mobileServerPassword: 'geheim'
    };
    var slidesFolderParser = new _SlidesFolderParser2.default();
    slidesFolderParser.parse(presentationPath, path.resolve(presentationPath, 'slides')).then(function (data) {
      new _Presentation2.default(data, 'presentation', settings);
    });
  };

  init();
})();

},{"../../server/classes/SlidesFolderParser":14,"./classes/Presentation":6}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

if (!(typeof window !== 'undefined' && window)) {
  var requireNode = require;
} else {
  var requireNode = window.requireNode;
}

var fs = requireNode('fs-promise');
var path = requireNode('path');

var getFileProperties = function getFileProperties(filePath) {
  var _fd = void 0,
      _o = void 0;
  return fs.open(filePath, 'r').then(function (fd) {
    _fd = fd;
    return fd;
  }).then(function (fd) {
    return fs.fstat(fd);
  }).then(function (o) {
    _o = o;
    return _o;
  }).then(function (o) {
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
    key: 'parse',
    value: function parse(presentationPath, slidesFolderPath) {
      var _this = this;

      //read the contents of the slides directory
      return fs.readdir(slidesFolderPath).then(function (result) {
        return result.filter(function (name) {
          return name.indexOf('.') > 0;
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
        console.log(data.slides);
        return data;
      }).catch(function (e) {
        console.error(e);
      });
    }
  }, {
    key: 'parseSlideBaseName',
    value: function parseSlideBaseName(slideBaseName) {
      var parsed = {};
      parsed.ext = path.extname(slideBaseName);
      parsed.name = slideBaseName.substr(0, slideBaseName.length - parsed.ext.length);
      var splitted = parsed.name.split('.');
      var keywords = ['mobile', 'desktop', 'muted', 'loop', 'cover'];
      keywords.forEach(function (keyword) {
        var index = splitted.indexOf(keyword);
        if (index > -1) {
          parsed[keyword] = true;
          splitted.splice(index, 1);
        }
      });
      parsed.name = splitted.join('.');
      return parsed;
    }
  }, {
    key: 'createSlideObjectBasedOnFileProperties',
    value: function createSlideObjectBasedOnFileProperties(fileProperties, presentationPath, slidesByName) {

      var parsed = this.parseSlideBaseName(path.basename(fileProperties.path));
      var url = path.relative(presentationPath, fileProperties.path).replace('\\', '/');
      if (parsed.ext === '.jpg' || parsed.ext === '.jpeg' || parsed.ext === '.gif' || parsed.ext === '.png') {
        url = 'slides-builtin/image.html?image=' + url;
      }
      if (parsed.ext === '.mp4') {
        url = 'slides-builtin/video.html?video=' + url;
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

},{}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var Constants = exports.Constants = {
  GO_TO_PREVIOUS_SLIDE: 'goToPreviousSlide',
  GO_TO_NEXT_SLIDE: 'goToNextSlide',
  SET_SLIDES: 'setSlides',
  SET_CURRENT_SLIDE_INDEX: 'setCurrentSlideIndex',

  MESSAGE: 'message',
  SOCKET_SEND: 'socketSend',
  SOCKET_RECEIVE: 'socketReceive',
  JOIN_SLIDE_ROOM: 'joinSlideRoom',
  LEAVE_SLIDE_ROOM: 'leaveSlideRoom',

  ROLE_PRESENTATION: 'presentation',
  ROLE_MOBILE: 'mobile',

  STATE_ACTIVE: 'active',
  STATE_INACTIVE: 'inactive',

  SET_SUBSTATE: 'setSubstate',

  CHILD_APP_SAVE_CODE: 'childAppSaveCode',
  CHILD_APP_RUN_CODE: 'childAppRunCode',
  CHILD_APP_STDOUT_DATA: 'childAppStdoutData',
  CHILD_APP_STDERR_DATA: 'childAppStderrData',

  OPEN_COMMAND_LINE: 'openCommandLine',
  OPEN_CAMERA: 'openCamera',

  SET_TEAM: 'setTeam',
  UPDATE_MOTION: 'updateMotion',

  YOU_WIN: 'youWin',
  YOU_LOSE: 'youLose',

  SHAKE_YOUR_PHONES_INTRO: 'shakeYourPhonesIntro',
  SHAKE_YOUR_PHONES_GAME: 'shakeYourPhonesGame',
  SHAKE_YOUR_PHONES_FINISHED: 'shakeYourPhonesFinished',

  SHAKE_YOUR_PHONES_CLIENT_ADDED: 'shakeYourPhonesClientAdded',
  SHAKE_YOUR_PHONES_CLIENT_REMOVED: 'shakeYourPhonesClientRemoved',
  SHAKE_YOUR_PHONES_CLIENT_LIST: 'shakeYourPhonesClientList',
  SHAKE_YOUR_PHONES_CLIENT_UPDATE: 'shakeYourPhonesClientUpdate'
};

},{}],16:[function(require,module,exports){
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
    this.src = $slideHolder.attr('data-src');
    this.name = $slideHolder.attr('data-name');
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
    value: function handleMessage(data) {}
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
    value: function receiveSocketMessage(message) {
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
        this.drawLoop(this._delta);
        this._lastTime = this._currentTime - this._delta % this._interval;
      }
    }
  }, {
    key: 'drawLoop',
    value: function drawLoop(delta) {}
  }]);

  return ContentBase;
}();

exports.default = ContentBase;

},{"../Constants":15}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

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
      console.log('MobileServerBridge.connect');
      $.post(this.settings.mobileServerUrl + '/login', this.getLoginCredentials()).done(this.loginHandler.bind(this)).fail(function () {
        //retry after one second
        setTimeout(function () {
          this.connect();
        }.bind(this), 1000);
      }.bind(this));
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

},{}],18:[function(require,module,exports){
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
      window.addEventListener("message", this.slideMessageHandler.bind(this), false);
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
      var that = this;
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
        var src = "slides/" + slideBridge.name + '.html';
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
      //listen for events on this slideHolder
      $(slideHolder).off('message-from-slide');
      $(slideHolder).on('message-from-slide', function (event, message) {
        this.slideMessageHandler({ data: message });
      }.bind(this));
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

},{"../Constants":15,"./SlideBridge":19}],19:[function(require,module,exports){
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

},{"isomorphic-fetch":1}],"LiveCodeSlide":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

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

  function LiveCodeSlide($slideHolder) {
    _classCallCheck(this, LiveCodeSlide);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(LiveCodeSlide).call(this, $slideHolder));

    var remote = requireNode('electron').remote;
    var config = {
      presentationPath: remote.getGlobal('__dirname')
    };

    //find live code element
    _this.liveCode = new _liveCode2.default(_this.$slideHolder.find('.live-code'), config);
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
      _get(Object.getPrototypeOf(LiveCodeSlide.prototype), 'destroy', this).call(this);
      this.liveCode.destroy();
    }
  }, {
    key: 'onStateChanged',
    value: function onStateChanged() {
      if (this.state === _Constants.Constants.STATE_ACTIVE) {} else {
        //stop
        this.liveCode.stop();
      }
    }
  }]);

  return LiveCodeSlide;
}(_ContentBase3.default);

exports.default = LiveCodeSlide;

},{"../../../../shared/js/Constants":15,"../../../../shared/js/classes/ContentBase":16,"../live-code":12}],"VideoSlide":[function(require,module,exports){
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
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(url);
  return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
};

var VideoSlide = function (_ContentBase) {
  _inherits(VideoSlide, _ContentBase);

  function VideoSlide($slideHolder) {
    _classCallCheck(this, VideoSlide);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(VideoSlide).call(this, $slideHolder));

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
      $(_this.video).attr('loop', "loop");
    }
    if (muted) {
      $(_this.video).attr('muted', "muted");
    }
    $(_this.video).attr('src', videoUrl);
    _this._clickHandler = _this.clickHandler.bind(_this);
    $(_this.video).on('click', _this._clickHandler);
    return _this;
  }

  _createClass(VideoSlide, [{
    key: 'destroy',
    value: function destroy() {
      _get(Object.getPrototypeOf(VideoSlide.prototype), 'destroy', this).call(this);
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
    key: 'clickHandler',
    value: function clickHandler(event) {
      this.toggleVideoPlaying();
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

},{"../../../../shared/js/Constants":15,"../../../../shared/js/classes/ContentBase":16}]},{},[13])


//# sourceMappingURL=script.js.map
