export default class TerminalElement {

  constructor(el, options) {
    this.el = el;
    this.$el = $(el);

    //options
    if(!options) {
      options = {};
    }
    //wrap element in a container
    this.$wrapperEl = $(el).wrap('<div class="live-code-element live-code-terminal-element"></div>').parent();
    this.wrapperEl = this.$wrapperEl[0];

    this.id = this.$el.attr('data-id');
    if(!this.id)
    {
      //generate id
      this.id = 'code-' + Math.round(Math.random() * 1000 * new Date().getTime());
      this.$el.attr('data-id', this.id);
    }

    this.dir = this.$el.data('dir');

    this.$el.css('width', '100%').css('height', '100%');

    this.isRunning = false;
    this.resume();
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
      this.webview.parentNode.removeChild(this.webview);
      this.webview = false;
    }
    this.webview = document.createElement('webview');
    this.webview.style.width = '100%';
    this.webview.style.height = '100%';
    this.el.appendChild(this.webview);
    this.webview.setAttribute('src', 'http://localhost:3000?dir=' + this.dir);
  }

  destroy() {
    this.pause();
  }
}
