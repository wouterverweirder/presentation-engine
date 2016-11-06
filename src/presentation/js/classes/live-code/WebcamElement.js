export default class WebcamElement {

  constructor(el, options) {
    this.el = el;
    this.$el = $(el);

    //options
    if(!options) {
      options = {};
    }

    this.id = this.$el.attr(`data-id`);
    if(!this.id)
    {
      //generate id
      this.id = `webcam-${  Math.round(Math.random() * 1000 * new Date().getTime())}`;
      this.$el.attr(`data-id`, this.id);
    }

    this.source = this.$el.attr(`data-source`);
    if(this.source) {
      this.sourceEl = document.querySelector(this.source);
    }

    this.ctx = this.el.getContext(`2d`);

    this.isRunning = false;
  }

  destroy() {
    this.pause();
  }

  pause() {
    this.isRunning = false;
    window.cancelAnimationFrame(this.animationFrameId);
  }

  resume() {
    if(this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.animationFrameId = window.requestAnimationFrame(() => this.drawLoop());
  }

  drawLoop() {
    if(this.isRunning) {
      window.requestAnimationFrame(() => this.drawLoop());
    }
    if(!this.sourceEl) {
      return;
    }
    this.el.width = this.sourceEl.width;
    this.el.height = this.sourceEl.height;
    this.ctx.clearRect(0, 0, this.el.width, this.el.height);
    this.ctx.drawImage(this.sourceEl, 0, 0);
  }
}
