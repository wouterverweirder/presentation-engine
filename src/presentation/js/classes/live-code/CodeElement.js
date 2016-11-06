const fs = requireNode(`fs-promise`);

export default class CodeElement {
  constructor(el, options) {
    this.el = el;
    this.$el = $(el);
    //options
    if(!options)
    {
      options = {};
    }

    const width = $(el).parent()[0].style.width || `100%`;
    const height = $(el).parent()[0].style.height || `100%`;

    //wrap element in a container
    this.$wrapperEl = $(el).wrap(`<div class="live-code-element live-code-code-element"></div>`).parent();
    this.wrapperEl = this.$wrapperEl[0];

    this.id = this.$el.attr(`data-id`);
    this.file = this.$el.data(`file`);

    if(!this.id && this.file)
    {
      this.id = this.file;
    }
    if(!this.id)
    {
      this.id = `code-${  Math.round(Math.random() * 1000 * new Date().getTime())}`;
    }
    this.$el.attr(`data-id`, this.id);

    this.runtime = this.$el.data(`runtime`);
    if(!this.runtime)
    {
      this.runtime = `browser`;
    }

    this.console = this.$el.data(`console`);
    this.processor = this.$el.data(`processor`);

    //language is programming language - used for injecting in html
    this.language = this.$el.data(`language`);
    if(!this.language)
    {
      //default to javascript
      this.language = `javascript`;
    }

    //mode is mode for codemirror
    this.mode = this.$el.data(`mode`);
    if(!this.mode)
    {
      //default to the language
      this.mode = this.language;
    }

    this.codeMirror = CodeMirror.fromTextArea(this.el, {
      lineNumbers: true,
      mode: this.mode,
      extraKeys: {"Ctrl-Space": `autocomplete`}
    });

    this.codeMirror.setSize(width, height);

    //this.$el.css('width', '100%').css('height', '100%');
    this.layout();
  }

  pause() {
    //no real reason to do pause / resume
  }

  resume() {
    //no real reason to do pause / resume
  }

  destroy() {
    this.pause();
  }

  getValue() {
    return this.codeMirror.getValue();
  }

  setValue(value) {
    this.codeMirror.setValue(value);
  }

  saveToFile(filePath) {
    return fs.writeFile(filePath, this.getValue());
  }

  readFromFile(filePath) {
    return fs.readFile(filePath, `utf8`)
      .then(data => {
        this.setValue(data);
        return data;
      });
  }

  layout() {
    // this.$wrapperEl.find('.CodeMirror-scroll').css('max-height', this.$wrapperEl.css('height'));
    this.codeMirror.refresh();
  }
}
