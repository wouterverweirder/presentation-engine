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

var fs = requireNode("fs-promise");
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