export default class WebPreviewElement {

  constructor(el, options) {
    this.el = el;
    this.$el = $(el);
    //options
    if(!options) {
      options = {};
    }
		//wrap element in a container
    this.$wrapperEl = $(el).wrap(`<div class="live-code-element live-code-web-preview-element"></div>`).parent();
    this.wrapperEl = this.$wrapperEl[0];

    this.id = this.$el.attr(`data-id`);
    if(!this.id)
		{
			//generate id
      this.id = `code-${  Math.round(Math.random() * 1000 * new Date().getTime())}`;
      this.$el.attr(`data-id`, this.id);
    }

    this.file = this.$el.data(`file`) || this.$el.data(`url`);
    this.autoload = this.$el.data(`autoload`) || false;
    this.zoomfactor = this.$el.data(`zoomfactor`) || false;

    this.console = this.$el.data(`console`) || false;

    this.$el.css(`width`, `100%`).css(`height`, `100%`);

    this.url = false;
    this.blocks = false;
    this.isRunning = false;
		//webview gets created by calling updateUrl or updateCode
  }

  get needsOutputPathPrefix() {
    return !(this.$el.data(`url`));
  }

  destroy() {
    this.pause();
  }

  pause() {
    this.isRunning = false;
    if(this.webview) {
      this.webview.removeEventListener(`did-get-response-details`, this._didGetResponseDetailsHandler);
      this.webview.removeEventListener(`dom-ready`, this._domReadyHandler);
      this.webview.removeEventListener(`did-fail-load`, this._didFailLoadHandler);
      this.webview.removeEventListener(`ipc-message`, this._ipcMessageHandler);
      this.webview.removeEventListener(`console-message`, this._consoleMessageHandler);
      this.webview.parentNode.removeChild(this.webview);
      this.webview = false;
      clearTimeout(this.retryTimeout);
    }
  }

  resume() {
    if(this.isRunning) {
      return;
    }
    if(this.url === false && this.blocks === false) {
      return;
    }
    this.isRunning = true;
    this._createWebview();
  }

  _createWebview() {
    //create a webview tag
    if(this.webview) {
      this.webview.parentNode.removeChild(this.webview);
      this.webview = false;
    }
    this.webview = document.createElement(`webview`);
    this.webview.style.width = `100%`;
    this.webview.style.height = `100%`;
    this.webview.preload = `js/livecode-webpreview.js`;
    this.el.appendChild(this.webview);

    const url = (this.url !== false) ? this.url : `webpreview.html`;
    let htmlSrc = ``;
    if(this.blocks !== false) {
      for(let i = 0; i < this.blocks.length; i++)
			{
        htmlSrc += this.blocks[i].code;
      }
    }

		//add listeners
    this._didGetResponseDetailsHandler = e => {
      if(e.originalURL !== this.webview.src) {
        return;
      }
      if(this.$el.attr(`data-open-devtools`)) {
        this.webview.openDevTools();
      }
    };
    this.webview.addEventListener(`did-get-response-details`, this._didGetResponseDetailsHandler);

    this._domReadyHandler = () => {
      if (this.zoomfactor) {
        const zoomfactor = parseFloat(this.zoomfactor);
        this.webview.setZoomFactor(zoomfactor);
      }
    };
    this.webview.addEventListener(`dom-ready`, this._domReadyHandler);

    this._didFailLoadHandler = () => {
      this.retryTimeout = setTimeout(() => {
        this.pause();
        this.resume();
      }, 1000);
    };
    this.webview.addEventListener(`did-fail-load`, this._didFailLoadHandler);

    this._consoleMessageHandler = e => {
      this.$wrapperEl.trigger(`console-message`, e);
    };
    this.webview.addEventListener(`console-message`, this._consoleMessageHandler);

    this._ipcMessageHandler = event => {
      if(event.channel === `request-html`)
      {
        this.webview.send(`receive-html`, htmlSrc);
      }
    };
    this.webview.addEventListener(`ipc-message`, this._ipcMessageHandler);

    if(!this.$el.attr(`data-disable-nodeintegration`)) {
      this.webview.setAttribute(`nodeintegration`, ``);
    }
    this.webview.setAttribute(`src`, url);
  }

  updateUrl(url) {
    this.pause();
    this.url = url;
    this.blocks = false;
    this.resume();
  }

  updateCode(blocks) {
    this.pause();
    this.url = false;
    this.blocks = blocks;
    this.resume();
  }

  openDevTools() {
    this.webview.openDevTools();
  }
}
