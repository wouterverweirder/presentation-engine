const TERMINAL_URL = `http://localhost:3000`;

export default class TerminalElement {

  constructor(el, options) {
    this.el = el;
    this.$el = $(el);

    this._ipcMessageHandler = e => this.ipcMessageHandler(e);

    //options
    if(!options) {
      options = {};
    }
    //wrap element in a container
    this.$wrapperEl = $(el).wrap(`<div class="live-code-element live-code-terminal-element"></div>`).parent();
    this.wrapperEl = this.$wrapperEl[0];

    this.id = this.$el.attr(`data-id`);
    if(!this.id)
    {
      //generate id
      this.id = `code-${  Math.round(Math.random() * 1000 * new Date().getTime())}`;
      this.$el.attr(`data-id`, this.id);
    }

    this.dir = this.$el.data(`dir`);
    this.autorun = this.$el.data(`autorun`);

    this.$el.css(`width`, `100%`).css(`height`, `100%`);

    this.isRunning = false;
  }

  pause() {
    this.isRunning = false;
    if(this.webview) {
      this.webview.parentNode.removeChild(this.webview);
      this.webview = false;
    }
  }

  resume() {
    if(this.isRunning) {
      return;
    }
    this.isRunning = true;
    //create a webview tag
    if(this.webview) {
      this.webview.removeEventListener(`ipc-message`, this._ipcMessageHandler);
      this.webview.parentNode.removeChild(this.webview);
      this.webview = false;
    }
    this.webview = document.createElement(`webview`);
    // this.webview.addEventListener('dom-ready', () => {
    //   this.webview.openDevTools();
    // });
    this.webview.addEventListener(`ipc-message`, this._ipcMessageHandler);
    this.webview.style.width = `100%`;
    this.webview.style.height = `100%`;
    this.webview.setAttribute(`nodeintegration`, ``);
    this.webview.setAttribute(`src`, TERMINAL_URL);
    this.el.appendChild(this.webview);
  }

  ipcMessageHandler(e) {
    if(e.channel !== `message-from-terminal`) {
      return;
    }
    if(e.args.length < 1) {
      return;
    }
    const o = e.args[0];
    if(!o.command) {
      return;
    }
    switch(o.command) {
    case `init`:
      if(this.dir) {
        this.executeCommand(`cd ${this.dir}`);
        this.executeCommand(`clear`);
      }
      if(this.autorun) {
        this.executeCommand(this.autorun);
      }
      break;
    default:
      console.warn(`unknow command object from terminal`);
      console.warn(o);
      break;
    }
  }

  executeCommand(commandString) {
    this.webview.send(`message-to-terminal`, {
      command: `execute`,
      value: commandString
    });
  }

  destroy() {
    this.pause();
  }
}
