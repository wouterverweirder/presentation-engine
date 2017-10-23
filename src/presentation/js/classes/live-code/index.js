import ConsoleElement from './ConsoleElement';
import TerminalElement from './TerminalElement';
import CodeElement from './CodeElement';
import WebPreviewElement from './WebPreviewElement';
import WebcamElement from './WebcamElement';

const path = requireNode(`path`);
const fs = requireNode(`fs-extra`);

export default class LiveCode {

  constructor($el, config, readyCallback) {
    this.$el = $el;
    this.el = this.$el[0];

    if(this.$el.attr(`data-entry-path`)) {
      this.entryPath = path.join(config.presentationPath, this.$el.attr(`data-entry-path`));
    }
    if(this.$el.attr(`data-output-path`)) {
      this.outputPath = path.join(config.presentationPath, this.$el.attr(`data-output-path`));
    } else {
      if(this.entryPath) {
        this.outputPath = this.entryPath;
      }
    }

    const p = Promise.resolve();
    p.then(() => {
      if(this.entryPath && this.entryPath !== this.outputPath) {
        return fs.copy(this.entryPath, this.outputPath);
      }
    })
    .then(() => {
      //create the consoles
      this.consoleElements = {};
      this.$el.find(`[data-type="console"]`).each(((index, consoleEl) => this.createConsoleElement(consoleEl)));

      //create the terminals
      this.terminalElements = {};
      this.$el.find(`[data-type="terminal"]`).each(((index, terminalEl) => this.createTerminalElement(terminalEl)));

      //create the previews
      this.webPreviewElements = {};
      this.$el.find(`[data-type="web-preview"]`).each(((index, webPreviewEl) => this.createWebPreviewElement(webPreviewEl)));

      //create the code editors
      this.codeElements = {};
      this.$el.find(`[data-type="code"]`).each(((index, codeEl) => this.createCodeElement(codeEl)));

      //create the webcam elements
      this.webcamElements = {};
      this.$el.find(`[data-type="webcam"]`).each(((index, webcamEl) => this.createWebcamElement(webcamEl)));

      //create run buttons
      this.runButtonEls = [];
      this.$el.find(`[data-type="run-button"]`).each(((index, runButtonEl) => this.createRunButton(runButtonEl)));

      //create save buttons
      this.saveButtonEls = [];
      this.$el.find(`[data-type="save-button"]`).each(((index, saveButtonEl) => this.createSaveButton(saveButtonEl)));

      //create reload buttons
      this.reloadButtonEls = [];
      this.$el.find(`[data-type="reload-button"]`).each(((index, reloadButtonEl) => this.createReloadButton(reloadButtonEl)));

      //create reload buttons
      this.devToolsButtonEls = [];
      this.$el.find(`[data-type="devtools-button"]`).each(((index, devToolsButtonEl) => this.createDevToolsButton(devToolsButtonEl)));

    })
    .then(() => this.setCodeElementValuesFromFiles())
    .then(() => {
      this.loaded = true;
      if(this.isRunning) {
        this.isRunning = false;
        this.resume();
      }
    })
    .then(readyCallback).catch(err => console.log(err));

    //disable keyboard bubbling up
    $(window).on(`keydown`, event => this.keyDownHandler(event));
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
  getWebPreviewElement(input) {
    return this.getElement(this.webPreviewElements, input);
  }

  getElement(elementsCollection, input) {
    let propertyToCheck = `id`;
    if(input.nodeName) {
      propertyToCheck = `el`;
    }
    for(const key in elementsCollection)
    {
      if(elementsCollection[key][propertyToCheck] === input) {
        return elementsCollection[key];
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
    const tasks = [];
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

  autoStartWebpreviewElementsWhenNeeded() {
    for(const key in this.webPreviewElements)
    {
      const webPreviewElement = this.webPreviewElements[key];
      if(webPreviewElement.autoload) {
        this.reloadWebPreviewElement(webPreviewElement);
      }
    }
  }

  saveCodeElementsToFiles() {
    const tasks = [];
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
    for(key in this.webcamElements)
    {
      this.destroyWebcamElement(this.webcamElements[key]);
    }
    this.runButtonEls.forEach(el => this.destroyRunButton(el));
    this.saveButtonEls.forEach(el => this.destroySaveButton(el));
    this.reloadButtonEls.forEach(el => this.destroyReloadButton(el));
    this.devToolsButtonEls.forEach(el => this.destroyDevToolsButton(el));
    //TODO: destroy the tmp directory for this instance
  }

  pause() {
    this.isRunning = false;
    if(!this.loaded) {
      return;
    }
    let key;
    for(key in this.consoleElements)
    {
      this.consoleElements[key].pause();
    }
    for(key in this.terminalElements)
    {
      this.terminalElements[key].pause();
    }
    for(key in this.webPreviewElements)
    {
      this.webPreviewElements[key].pause();
    }
    for(key in this.codeElements)
    {
      this.codeElements[key].pause();
    }
    for(key in this.webcamElements)
    {
      this.webcamElements[key].pause();
    }
  }

  resume() {
    this.isRunning = true;
    if(!this.loaded) {
      return;
    }
    let key;
    for(key in this.consoleElements)
    {
      this.consoleElements[key].resume();
    }
    for(key in this.terminalElements)
    {
      this.terminalElements[key].resume();
    }
    for(key in this.webPreviewElements)
    {
      this.webPreviewElements[key].resume();
    }
    for(key in this.codeElements)
    {
      this.codeElements[key].resume();
    }
    for(key in this.webcamElements)
    {
      this.webcamElements[key].resume();
    }
    this.autoStartWebpreviewElementsWhenNeeded();
  }

  layout() {
    //might be triggered after split pane resize or tab switch
    //codemirror instances need to be updated
    for(const key in this.codeElements)
    {
      this.codeElements[key].layout();
    }
  }

  createConsoleElement(consoleEl) {
    const consoleElement = new ConsoleElement(consoleEl);
    this.consoleElements[consoleElement.id] = consoleElement;
  }

  destroyConsoleElement(consoleElement) {
    consoleElement.destroy();
  }

  createTerminalElement(terminalEl) {
    const terminalElement = new TerminalElement(terminalEl);
    this.terminalElements[terminalElement.id] = terminalElement;
  }

  destroyTerminalElement(terminalElement) {
    terminalElement.destroy();
  }

  createWebPreviewElement(webPreviewEl) {
    const webPreviewElement = new WebPreviewElement(webPreviewEl);
    webPreviewElement.$wrapperEl.on(`console-message`, this.webPreviewConsoleMessageHandler.bind(this, webPreviewElement));
    this.webPreviewElements[webPreviewElement.id] = webPreviewElement;
  }

  destroyWebPreviewElement(webPreviewElement) {
    webPreviewElement.$wrapperEl.off(`console-message`);
    webPreviewElement.destroy();
  }

  createCodeElement(codeEl) {
    const codeElement = new CodeElement(codeEl);
    this.codeElements[codeElement.id] = codeElement;
  }

  destroyCodeElement(codeElement) {
    codeElement.destroy();
  }

  createWebcamElement(webcamEl) {
    const webcamElement = new WebcamElement(webcamEl);
    this.webcamElements[webcamElement.id] = webcamElement;
  }

  destroyWebcamElement(webcamElement) {
    webcamElement.destroy();
  }

  createRunButton(runButtonEl) {
    this.runButtonEls.push(runButtonEl);
    $(runButtonEl).on(`click`, e => {
      if(this.webPreviewElements[$(runButtonEl).data(`target`)]) {
        //save the files first
        this.saveCodeElementsToFiles()
          .catch(err => console.log(err))
          .then(() => {
            //update the web preview
            this.updateWebPreviewElement(this.webPreviewElements[$(runButtonEl).data(`target`)]);
          });
      } else if(this.consoleElements[$(runButtonEl).data(`target`)]) {
        const applicationPath = this.getFilePath(this.consoleElements[$(runButtonEl).data(`target`)].file);
        this.consoleElements[$(runButtonEl).data(`target`)].runNodeApp(applicationPath);
      }
      e.preventDefault();
      e.stopImmediatePropagation();
    });
  }

  destroyRunButton(runButtonEl) {
    $(runButtonEl).off(`click`);
  }

  createSaveButton(saveButtonEl) {
    this.saveButtonEls.push(saveButtonEl);
    $(saveButtonEl).on(`click`, e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      //get the target element for this button
      const targetString = $(saveButtonEl).data(`target`);
      if(targetString === `all`) {
        return this.saveCodeElementsToFiles();
      }
      const codeElement = this.getCodeElement(targetString);
      if(!codeElement) {
        return;
      }
      const filePath = this.getFilePathForCodeElement(codeElement);
      if(!filePath) {
        return;
      }
      codeElement.saveToFile(filePath).catch(function(err) { console.log(err); });
    });
  }

  destroySaveButton(saveButtonEl) {
    $(saveButtonEl).off(`click`);
  }

  createReloadButton(reloadButtonEl) {
    this.reloadButtonEls.push(reloadButtonEl);
    $(reloadButtonEl).on(`click`, e => {
      //get the reload button target
      let reloadTargetElement = this.getCodeElement($(reloadButtonEl).data(`target`));
      if(reloadTargetElement) {
        this.reloadCodeElement(reloadTargetElement);
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      reloadTargetElement = this.getWebPreviewElement($(reloadButtonEl).data(`target`));
      if(reloadTargetElement) {
        this.reloadWebPreviewElement(reloadTargetElement);
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      // reload all elements
      this.reloadAllCodeElements().then(() => this.reloadAllWebPreviewElements());
    });
  }

  reloadAllCodeElements() {
    const tasks = [];
    for(const key in this.codeElements)
    {
      tasks.push(this.reloadCodeElement(this.codeElements[key]));
    }
    return Promise.all(tasks);
  }

  reloadCodeElement(codeElement) {
    const filePath = this.getFilePathForCodeElement(codeElement);
    if(!filePath) {
      return;
    }
    return codeElement.readFromFile(filePath).catch(err => console.log(err));
  }

  reloadAllWebPreviewElements() {
    const tasks = [];
    for(const key in this.webPreviewElements)
    {
      tasks.push(this.reloadWebPreviewElement(this.webPreviewElements[key]));
    }
    return Promise.all(tasks);
  }

  reloadWebPreviewElement(webPreviewElement) {
    return this.updateWebPreviewElement(webPreviewElement);
  }

  destroyReloadButton(reloadButtonEl) {
    $(reloadButtonEl).off(`click`);
  }

  createDevToolsButton(devToolsButtonEl) {
    this.devToolsButtonEls.push(devToolsButtonEl);
    $(devToolsButtonEl).on(`click`, e => {
      //get the target element for this button
      const webPreviewElement = this.getWebPreviewElement($(devToolsButtonEl).data(`target`));
      if (!webPreviewElement) {
        return;
      }
      webPreviewElement.openDevTools();
      e.preventDefault();
      e.stopImmediatePropagation();
    });
  }

  destroyDevToolsButton(devToolsButtonEl) {
    $(devToolsButtonEl).off(`click`);
  }

  webPreviewConsoleMessageHandler(webPreviewElement, jqEvent, event) {
    //get the console element for this web preview
    const consoleElement = this.getConsoleElementForWebPreview(webPreviewElement);
    if(consoleElement)
    {
      consoleElement.message(event);
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
      if(this.outputPath && webPreviewElement.needsOutputPathPrefix) {
        return webPreviewElement.updateUrl(path.join(this.outputPath, webPreviewElement.file));
      }
      return webPreviewElement.updateUrl(webPreviewElement.file);
    }

    //gather all the code for this element
    const blocks = [];
    for(const key in this.codeElements)
    {
      const codeElement = this.codeElements[key];
      if(codeElement.processor === webPreviewElement.id)
      {
        const block = {
          language: codeElement.language,
          code: codeElement.getValue()
        };
        blocks.push(block);
      }
    }
    webPreviewElement.updateCode(blocks);
  }

}
