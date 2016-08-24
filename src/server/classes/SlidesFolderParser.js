if(!(typeof window !== 'undefined' && window)) {
  var requireNode = require;
} else {
  var requireNode = window.requireNode;
}

const fs = requireNode('fs-promise');
const path = requireNode('path');

const getFileProperties = filePath => {
  let _fd, _o;
  return fs.open(filePath, 'r')
    .then(fd => {
      _fd = fd;
      return fd;
    })
    .then(fd => fs.fstat(fd))
    .then(o => {
      _o = o;
      return _o;
    })
    .then(o => fs.close(_fd))
    .then(() => {
      return {
        path: filePath,
        isDirectory: _o.isDirectory(),
        isFile: _o.isFile()
      };
    });
};
export default class SlidesFolderParser {
  constructor() {
  }
  parse(presentationPath, slidesFolderPath) {
    //read the contents of the slides directory
    return fs.readdir(slidesFolderPath)
      .then(result => result.filter(name => name.indexOf('.') > 0))
      .then(result => result.map(name => path.resolve(slidesFolderPath, name)))
      .then(result => Promise.all(result.map(filePath => getFileProperties(filePath))))
      .then(result => {
        let data = {
          slides: []
        };
        let slidesByName = {};
        result.forEach(props => {
          let slide = this.createSlideObjectBasedOnFileProperties(props, presentationPath, slidesByName);
          if(!slidesByName[slide.name]) {
            data.slides.push(slide);
          }
          slidesByName[slide.name] = slide;
        });
        console.log(data.slides);
        return data;
      })
      .catch(e => {
        console.error(e);
      });
  }

  parseSlideBaseName(slideBaseName) {
    let parsed = {};
    parsed.ext = path.extname(slideBaseName);
    parsed.name = slideBaseName.substr(0, slideBaseName.length - parsed.ext.length);
    let splitted = parsed.name.split('.');
    let keywords = ['mobile', 'desktop', 'muted', 'loop', 'cover'];
    keywords.forEach(keyword => {
      let index = splitted.indexOf(keyword);
      if(index > -1) {
        parsed[keyword] = true;
        splitted.splice(index, 1);
      }
    });
    parsed.name = splitted.join('.');
    return parsed;
  }

  createSlideObjectBasedOnFileProperties(fileProperties, presentationPath, slidesByName) {

    let parsed = this.parseSlideBaseName(path.basename(fileProperties.path));
    let url = path.relative(presentationPath, fileProperties.path).replace('\\', '/');
    if(parsed.ext === '.jpg' || parsed.ext === '.jpeg' || parsed.ext === '.gif' || parsed.ext === '.png') {
      url = 'slides-builtin/image.html?image=' + url;
    }
    if(parsed.ext === '.mp4') {
      url = 'slides-builtin/video.html?video=' + url;
    }
    if(slidesByName[parsed.name]) {
      if(parsed.mobile) {
        slidesByName[parsed.name].mobile.url = url;
        slidesByName[parsed.name].mobile.explicit = true;
      } else if(parsed.desktop) {
        slidesByName[parsed.name].presentation.url = url;
        slidesByName[parsed.name].presentation.explicit = true;
      } else {
        //set the one which is not set explicitly
        if(slidesByName[parsed.name].mobile.explicit) {
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
}
