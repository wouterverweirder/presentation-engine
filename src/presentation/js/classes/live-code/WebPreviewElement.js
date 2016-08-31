export default class WebPreviewElement {

	constructor(el, options) {
    this.el = el;
    this.$el = $(el);
    //options
    if(!options) {
      options = {};
    }
		//wrap element in a container
		this.$wrapperEl = $(el).wrap('<div class="live-code-element live-code-web-preview-element"></div>').parent();
		this.wrapperEl = this.$wrapperEl[0];

		this.id = this.$el.attr('data-id');
		if(!this.id)
		{
			//generate id
			this.id = 'code-' + Math.round(Math.random() * 1000 * new Date().getTime());
			this.$el.attr('data-id', this.id);
		}

    this.file = this.$el.data('file');

		this.console = this.$el.data('console');

		this.$el.css('width', '100%').css('height', '100%');

		this.url = false;
		this.blocks = false;
		this.isRunning = false;
		//webview gets created by calling updateUrl or updateCode
	}

	destroy() {
    this.pause();
	}

  pause() {
		this.isRunning = false;
    if(this.webview) {
			//TODO: remove all listeners?
      this.webview.parentNode.removeChild(this.webview);
      this.webview = false;
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
    this.webview = document.createElement('webview');
    this.webview.style.width = '100%';
    this.webview.style.height = '100%';
    this.webview.preload = 'js/webpreview.js';
    this.el.appendChild(this.webview);

		let url = (this.url !== false) ? this.url : 'webpreview.html';
		let htmlSrc = '';
		if(this.blocks !== false) {
			for(let i = 0; i < blocks.length; i++)
			{
				htmlSrc += blocks[i].code;
			}
		}

		//add listeners
		this.webview.addEventListener("dom-ready", () => {
			if(this.$el.attr('data-open-devtools')) {
        this.webview.openDevTools();
      }
    });

    this.webview.addEventListener('ipc-message', event => {
			if(event.channel === 'request-html')
      {
        this.webview.send('receive-html', htmlSrc);
      }
      else if(event.channel === 'console.log')
      {
        //notify live code editor
        this.$wrapperEl.trigger('console.log', event.args[0]);
      }
      else if(event.channel === 'console.error')
      {
        //notify live code editor
        this.$wrapperEl.trigger('console.error', event.args[0]);
      }
    });

    this.webview.setAttribute('nodeintegration', '');
    this.webview.setAttribute('src', url);
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
}
