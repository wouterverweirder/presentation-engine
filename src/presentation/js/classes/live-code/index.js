import ConsoleElement from './ConsoleElement';
import TerminalElement from './TerminalElement';
import CodeElement from './CodeElement';
import WebPreviewElement from './WebPreviewElement';

const path = requireNode('path');
const fs = requireNode('fs-promise');

export default class LiveCode {

  constructor($el, config, readyCallback) {
    this.$el = $el;
    this.el = this.$el[0];

    if(this.$el.attr('data-entry-path')) {
      this.entryPath = path.join(config.presentationPath, this.$el.attr('data-entry-path'));
    }
    if(this.$el.attr('data-output-path')) {
      this.outputPath = path.join(config.presentationPath, this.$el.attr('data-output-path'));
    } else {
      if(this.entryPath) {
        this.outputPath = this.entryPath;
      }
    }

    let p = Promise.resolve();
    p.then(() => {
      if(this.entryPath && this.entryPath !== this.outputPath) {
        return fs.copy(this.entryPath, this.outputPath);
      }
    })
    .then(() => {
      //create the consoles
      this.consoleElements = {};
      this.$el.find('[data-type="console"]').each(((index, consoleEl) => this.createConsoleElement(consoleEl)));

      //create the terminals
      this.terminalElements = {};
      this.$el.find('[data-type="terminal"]').each(((index, terminalEl) => this.createTerminalElement(terminalEl)));

      //create the previews
      this.webPreviewElements = {};
      this.$el.find('[data-type="web-preview"]').each(((index, webPreviewEl) => this.createWebPreviewElement(webPreviewEl)));

      //create the code editors
      this.codeElements = {};
      this.$el.find('[data-type="code"]').each(((index, codeEl) => this.createCodeElement(codeEl)));

      //create run buttons
      this.runButtonEls = [];
      this.$el.find('[data-type="run-button"]').each(((index, runButtonEl) => this.createRunButton(runButtonEl)));

      //create save buttons
      this.saveButtonEls = [];
      this.$el.find('[data-type="save-button"]').each(((index, saveButtonEl) => this.createSaveButton(saveButtonEl)));

      //create reload buttons
      this.reloadButtonEls = [];
      this.$el.find('[data-type="reload-button"]').each(((index, reloadButtonEl) => this.createReloadButton(reloadButtonEl)));

    })
    .then(() => this.setCodeElementValuesFromFiles())
    .then(readyCallback).catch(err => console.log(err));

    //disable keyboard bubbling up
    $(window).on('keydown', event => this.keyDownHandler(event));
  }

  keyDownHandler(e) {
    if(this.el.contains(document.activeElement)) {
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
  getCodeElement(input) {
    let propertyToCheck = 'id';
    if(input.nodeName) {
      propertyToCheck = 'el';
    }
    for(let key in this.codeElements)
    {
      if(this.codeElements[key][propertyToCheck] === input) {
        return this.codeElements[key];
      }
    }
    return false;
  }

  setCodeElementValueFromFile(codeElement, filePath) {
    return codeElement.readFromFile(filePath);
  }

  saveCodeElementToFile(codeElement, filePath) {
    return codeElement.saveToFile(filePath);
  }

  getFilePath(file) {
    if(!file) {
      return false;
    }
    if(this.outputPath) {
      return path.join(this.outputPath, file);
    }
    return file;
  }

  getFilePathForCodeElement(codeElement) {
    if(!codeElement.file) {
      return false;
    }
    return this.getFilePath(codeElement.file);
  }

  setCodeElementValuesFromFiles() {
    let tasks = [];
    let key;
    let codeElement;
    let filePath;
    for(key in this.codeElements)
    {
      codeElement = this.codeElements[key];
      filePath = this.getFilePathForCodeElement(codeElement);
      if(filePath)
      {
        tasks.push(this.setCodeElementValueFromFile(codeElement, filePath));
      }
    }
    return Promise.all(tasks);
  }

  saveCodeElementsToFiles() {
    let tasks = [];
    let key;
    let codeElement;
    let filePath;
    for(key in this.codeElements)
    {
      codeElement = this.codeElements[key];
      filePath = this.getFilePathForCodeElement(codeElement);
      if(filePath)
      {
        tasks.push(this.saveCodeElementToFile(codeElement, filePath));
      }
    }
    return Promise.all(tasks);
  }

  destroy() {
    let key;
    for(key in this.consoleElements)
    {
      this.destroyConsoleElement(this.consoleElements[key]);
    }
    for(key in this.terminalElements)
    {
      this.destroyTerminalElement(this.terminalElements[key]);
    }
    for(key in this.webPreviewElements)
    {
      this.destroyWebPreviewElement(this.webPreviewElements[key]);
    }
    for(key in this.codeElements)
    {
      this.destroyCodeElement(this.codeElements[key]);
    }
    this.runButtonEls.forEach(el => this.destroyRunButton(el));
    this.saveButtonEls.forEach(el => this.destroySaveButton(el));
    this.reloadButtonEls.forEach(el => this.destroyReloadButton(el));
    //TODO: destroy the tmp directory for this instance
  }

  stop() {
    let key;
    for(key in this.consoleElements)
    {
      this.consoleElements[key].stop();
    }
    for(key in this.terminalElements)
    {
      this.terminalElements[key].stop();
    }
    for(key in this.webPreviewElements)
    {
      this.webPreviewElements[key].stop();
    }
    for(key in this.codeElements)
    {
      this.codeElements[key].stop();
    }
  }

  layout() {
    //might be triggered after split pane resize or tab switch
    //codemirror instances need to be updated
    for(let key in this.codeElements)
    {
      this.codeElements[key].layout();
    }
  }

  createConsoleElement(consoleEl) {
    let consoleElement = new ConsoleElement(consoleEl);
    this.consoleElements[consoleElement.id] = consoleElement;
  }

  destroyConsoleElement(consoleElement) {
    consoleElement.destroy();
  }

  createTerminalElement(terminalEl) {
    let terminalElement = new TerminalElement(terminalEl);
    this.terminalElements[terminalElement.id] = terminalElement;
  }

  destroyTerminalElement(terminalElement) {
    terminalElement.destroy();
  }

  createWebPreviewElement(webPreviewEl) {
    let webPreviewElement = new WebPreviewElement(webPreviewEl);
    webPreviewElement.$wrapperEl.on('console.log', this.webPreviewConsoleLogHandler.bind(this, webPreviewElement));
    webPreviewElement.$wrapperEl.on('console.error', this.webPreviewConsoleErrorHandler.bind(this, webPreviewElement));
    this.webPreviewElements[webPreviewElement.id] = webPreviewElement;
  }

  destroyWebPreviewElement(webPreviewElement) {
    webPreviewElement.$wrapperEl.off('console.log');
    webPreviewElement.$wrapperEl.off('console.error');
    webPreviewElement.destroy();
  }

  createCodeElement(codeEl) {
    let codeElement = new CodeElement(codeEl);
    this.codeElements[codeElement.id] = codeElement;
  }

  destroyCodeElement(codeElement) {
    codeElement.destroy();
  }

  createRunButton(runButtonEl) {
    this.runButtonEls.push(runButtonEl);
    console.log('createRunButton', $(runButtonEl));
    $(runButtonEl).on('click', (event => {
      console.log('run button clicky');
      if(this.webPreviewElements[$(runButtonEl).data('target')]) {
        //save the files first
        this.saveCodeElementsToFiles()
          .catch(err =>console.log(err))
          .then(() => {
            //update the web preview
            this.updateWebPreviewElement(this.webPreviewElements[$(runButtonEl).data('target')]);
          });
      } else if(this.consoleElements[$(runButtonEl).data('target')]) {
        let applicationPath = this.getFilePath(this.consoleElements[$(runButtonEl).data('target')].file);
        this.consoleElements[$(runButtonEl).data('target')].runNodeApp(applicationPath);
      }
    }));
  }

  destroyRunButton(runButtonEl) {
    $(runButtonEl).off('click');
  }

  createSaveButton(saveButtonEl) {
    var self = this;
    this.saveButtonEls.push(saveButtonEl);
    $(saveButtonEl).on('click', (function(){
      //get the code element for this reload button
      var codeElement = self.getCodeElement($(saveButtonEl).data('target'));
      if(!codeElement) {
        return;
      }
      var filePath = self.getFilePathForCodeElement(codeElement);
      if(!filePath) {
        return;
      }
      codeElement.saveToFile(filePath).catch(function(err) { console.log(err); });
    }).bind(this));
  }

  destroySaveButton(saveButtonEl) {
    $(saveButtonEl).off('click');
  }

  createReloadButton(reloadButtonEl) {
    var self = this;
    this.reloadButtonEls.push(reloadButtonEl);
    $(reloadButtonEl).on('click', (function(){
      //get the code element for this reload button
      var codeElement = self.getCodeElement($(reloadButtonEl).data('target'));
      if(!codeElement) {
        return;
      }
      var filePath = self.getFilePathForCodeElement(codeElement);
      if(!filePath) {
        return;
      }
      codeElement.readFromFile(filePath).catch(function(err) { console.log(err); });
    }).bind(this));
  }

  destroyReloadButton(reloadButtonEl) {
    $(reloadButtonEl).off('click');
  }

  webPreviewConsoleLogHandler(webPreviewElement, event, message) {
    //get the console element for this web preview
    var consoleElement = this.getConsoleElementForWebPreview(webPreviewElement);
    if(consoleElement)
    {
      consoleElement.info(JSON.parse(message).args);
    }
  }

  webPreviewConsoleErrorHandler(webPreviewElement, event, message) {
    //get the console element for this web preview
    var consoleElement = this.getConsoleElementForWebPreview(webPreviewElement);
    if(consoleElement)
    {
      consoleElement.error(JSON.parse(message).args);
    }
  }

  getConsoleElementForWebPreview(webPreviewElement) {
    return this.consoleElements[webPreviewElement.console];
  }

  getWebPreviewElementForCodeElement(codeElement) {
    return this.webPreviewElements[codeElement.processor];
  }

  updateWebPreviewElement(webPreviewElement) {
    //load a file or code blocks?
    if(webPreviewElement.file) {
      if(this.outputPath) {
        webPreviewElement.updateUrl(path.join(this.outputPath, webPreviewElement.file));
      } else {
        webPreviewElement.updateUrl(webPreviewElement.file);
      }
      return;
    }

    //gather all the code for this element
    var blocks = [];
    for(var key in this.codeElements)
    {
      var codeElement = this.codeElements[key];
      if(codeElement.processor === webPreviewElement.id)
      {
        var block = {
          language: codeElement.language,
          code: codeElement.getValue()
        };
        blocks.push(block);
      }
    }
    webPreviewElement.updateCode(blocks);
  }

}
