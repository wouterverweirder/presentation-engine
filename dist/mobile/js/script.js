(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// the whatwg-fetch polyfill installs the fetch() function
// on the global object (window or self)
//
// Return that as the export for use in Webpack, Browserify etc.
require('whatwg-fetch');
module.exports = self.fetch.bind(self);

},{"whatwg-fetch":2}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _Constants = require('../../../shared/js/Constants');

var _Presentation = require('../../../shared/js/classes/Presentation');

var _Presentation2 = _interopRequireDefault(_Presentation);

var _MobileServerBridge = require('../../../shared/js/classes/MobileServerBridge');

var _MobileServerBridge2 = _interopRequireDefault(_MobileServerBridge);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Presentation = function (_PresentationBase) {
  _inherits(Presentation, _PresentationBase);

  function Presentation(data, role, settings) {
    _classCallCheck(this, Presentation);

    var _this = _possibleConstructorReturn(this, (Presentation.__proto__ || Object.getPrototypeOf(Presentation)).call(this, data, role, settings));

    _this.$overlay = $('#overlay');
    return _this;
  }

  _createClass(Presentation, [{
    key: 'createMobileServerBridge',
    value: function createMobileServerBridge() {
      return new _MobileServerBridge2.default(this, this.settings);
    }
  }, {
    key: 'handleMobileServerMessage',
    value: function handleMobileServerMessage(message) {
      if (!message.content) {
        return;
      }
      if (message.content.action === 'setCurrentSlideIndex') {
        this.setCurrentSlideIndex(message.content.currentSlideIndex);
      } else if (message.content.action === _Constants.Constants.BLINK) {
        this.blink(message.content.text, message.content.backgroundColor);
      }
    }
  }, {
    key: 'setCurrentSlideIndex',
    value: function setCurrentSlideIndex(index) {
      _get(Presentation.prototype.__proto__ || Object.getPrototypeOf(Presentation.prototype), 'setCurrentSlideIndex', this).call(this, index);
      if (this.$overlay) {
        this.$overlay.removeClass('active');
      }
      if (this.blinkInterval) {
        clearInterval(this.blinkInterval);
      }
    }
  }, {
    key: 'blink',
    value: function blink(text, backgroundColor) {
      //overlay important, blinking text
      this.$overlay.find('.content').html(text);
      this.$overlay.addClass('active');
      if (this.blinkInterval) {
        clearInterval(this.blinkInterval);
      }
      this.blinkInterval = setInterval(this.blinkToggle.bind(this, backgroundColor), 500);
    }
  }, {
    key: 'blinkToggle',
    value: function blinkToggle(backgroundColor) {
      this.$overlay.toggleClass('blink-on');
      if (this.$overlay.hasClass('blink-on')) {
        this.$overlay.css('background-color', backgroundColor);
      } else {
        this.$overlay.css('background-color', '');
      }
    }
  }]);

  return Presentation;
}(_Presentation2.default);

exports.default = Presentation;

},{"../../../shared/js/Constants":5,"../../../shared/js/classes/MobileServerBridge":6,"../../../shared/js/classes/Presentation":7}],4:[function(require,module,exports){
'use strict';

var _Presentation = require('./classes/Presentation');

var _Presentation2 = _interopRequireDefault(_Presentation);

var _isomorphicFetch = require('isomorphic-fetch');

var _isomorphicFetch2 = _interopRequireDefault(_isomorphicFetch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function () {

  var init = function init() {
    var settings = {
      presentationPath: '/',
      mobileServerUrl: ''
    };
    //get slides by xmlhttprequest
    (0, _isomorphicFetch2.default)('/data.json?t=' + Date.now()).then(function (data) {
      return data.json();
    }).then(function (data) {
      new _Presentation2.default(data, 'mobile', settings);
    });
  };

  init();
})();

},{"./classes/Presentation":3,"isomorphic-fetch":1}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{"isomorphic-fetch":1}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

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
        var _ret = function () {
          var $slideHolder = $('.slide-frame[data-name="' + slide.name + '"]');
          if ($slideHolder.length > 0) {
            return {
              v: $slideHolder[0]
            };
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
              return {
                v: $slideHolder[0]
              };
            }
          }
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
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
      var _this = this;

      value = Math.max(0, Math.min(value, this.slideBridges.length - 1));
      if (value !== this.currentSlideIndex) {
        (function () {
          _this.currentSlideIndex = value;

          var currentSlideBridge = _this.getSlideBridgeByIndex(_this.currentSlideIndex);
          var previousSlideBridge = _this.getSlideBridgeByIndex(_this.currentSlideIndex - 1);
          var nextSlideBridge = _this.getSlideBridgeByIndex(_this.currentSlideIndex + 1);

          //remove "used" class from slide holders
          $('.slide-frame').removeAttr('data-used', false);

          var currentSlideHolder = _this.getSlideHolderForSlide(currentSlideBridge, [previousSlideBridge, nextSlideBridge]);
          _this.setupSlideHolder(currentSlideHolder, currentSlideBridge, _Constants.Constants.STATE_ACTIVE, 0);

          var previousSlideHolder = _this.getSlideHolderForSlide(previousSlideBridge, [currentSlideBridge, nextSlideBridge]);
          _this.setupSlideHolder(previousSlideHolder, previousSlideBridge, _Constants.Constants.STATE_INACTIVE, '-100%');

          var nextSlideHolder = _this.getSlideHolderForSlide(nextSlideBridge, [previousSlideBridge, currentSlideBridge]);
          _this.setupSlideHolder(nextSlideHolder, nextSlideBridge, _Constants.Constants.STATE_INACTIVE, '100%');

          //clear attributes of unused slide frames
          $('.slide-frame').each(function (index, slideHolder) {
            if (!$(slideHolder).attr('data-used')) {
              $(slideHolder).removeAttr('data-used').removeAttr('data-name').removeAttr('data-src');
            }
          });

          //all other slideHolder bridges should be unlinked from their slideHolder
          _this.slideBridges.forEach(function (slideBridge) {
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

          bean.fire(_this, _Constants.Constants.SET_CURRENT_SLIDE_INDEX, [_this.currentSlideIndex]);
        })();
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
      var _this2 = this;

      //listen for events on this slideHolder
      $(slideHolder).off('message-from-slide');
      $(slideHolder).on('message-from-slide', function (event, message) {
        _this2.slideMessageHandler({ data: message });
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

},{"../Constants":5,"./SlideBridge":8}],8:[function(require,module,exports){
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

},{"isomorphic-fetch":1}]},{},[4])


//# sourceMappingURL=script.js.map
