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
	}

	destroy() {
    this.stop();
	}

  stop() {
    if(this.webview) {
      this.webview.parentNode.removeChild(this.webview);
      this.webview = false;
    }
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
  }

  updateUrl(url) {
    this._createWebview();
    this.webview.addEventListener("dom-ready", (function(){
      //inject console logging code
      console.log('dom-ready');
    }).bind(this));

    this.webview.addEventListener('ipc-message', (function(event) {
      if(event.channel === 'console.log')
      {
        //notify live code editor
        this.$wrapperEl.trigger('console.log', event.args[0]);
      }
      else if(event.channel === 'console.error')
      {
        //notify live code editor
        this.$wrapperEl.trigger('console.error', event.args[0]);
      }
    }).bind(this));

    this.webview.setAttribute('nodeintegration', '');
    this.webview.setAttribute('src', url);
  }

	updateCode(blocks) {
		this._createWebview();

		var htmlSrc = '';
		for(var i = 0; i < blocks.length; i++)
		{
			htmlSrc += blocks[i].code;
		}

		this.webview.addEventListener("dom-ready", (function(){
      if(this.$el.attr('data-open-devtools')) {
        this.webview.openDevTools();
      }
		}).bind(this));

		this.webview.addEventListener('ipc-message', (function(event) {
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
    }).bind(this));

		this.webview.setAttribute('nodeintegration', '');
		this.webview.setAttribute('src', 'webpreview.html');
	}
}
