import {Constants} from '../Constants';

export default class ContentBase{

  constructor($slideHolder) {
    this.$slideHolder = $slideHolder;
    this.src = $slideHolder.attr('data-src');
    this.name = $slideHolder.attr('data-name');
    this.fps = 60;
    this._animationFrameId = false;
    this._currentTime = 0;
    this._delta = 0;
    this._interval = false;
    this._lastTime = new Date().getTime();
    this.currentFrame = 0;

    this.startListeningForMessages();

    this.__drawLoop = this._drawLoop.bind(this);
    this._interval = 1000 / this.fps;

    window.requestAnimationFrame(() => {
      $slideHolder.trigger('load');
    });
  }

  startListeningForMessages() {
    this._slideHolderMessageToSlideHandler = this.slideHolderMessageToSlideHandler.bind(this);
    this.$slideHolder.on('message-to-slide', this._slideHolderMessageToSlideHandler);
  }

  stopListeningForMessages() {
    this.$slideHolder.off('message-to-slide', this._slideHolderMessageToSlideHandler);
  }

  slideHolderMessageToSlideHandler(event, message) {
    this.receiveMessage({data: message});
  }

  receiveMessage(event) {
    if(!event.data) {
      return;
    }
    switch(event.data.action) {
      case 'setState':
        this.setState(event.data.state);
        break;
      case 'destroy':
        this.destroy();
        break;
      case Constants.SOCKET_RECEIVE:
        this.receiveSocketMessage(event.data.message);
        break;
      default:
        this.handleMessage(event.data);
        break;
    }
  }

  destroy() {
    this.stopListeningForMessages();
    window.cancelAnimationFrame(this._animationFrameId);
  }

  postMessage(data) {
    this.$slideHolder.trigger('message-from-slide', data);
  }

  handleMessage(data) {
  }

  postSocketMessage(message) {
    this.postMessage({
      action: Constants.SOCKET_SEND,
      message: message
    });
  }

  receiveSocketMessage(message) {
    //console.log('receiveSocketMessageame, message);
  }

  setState(state) {
    if(state !== this.state) {
      this.state = state;
      this.onStateChanged();
      if(this.state === Constants.STATE_ACTIVE) {
        this.currentFrame = 0;
        this._drawLoop();
      } else {
        window.cancelAnimationFrame(this._animationFrameId);
      }
    }
  }

  onStateChanged() {
  }

  _drawLoop() {
    this._animationFrameId = window.requestAnimationFrame(this.__drawLoop);
    this._currentTime = (new Date()).getTime();
      this._delta = (this._currentTime - this._lastTime);
      if(this._delta > this._interval) {
        this.currentFrame++;
        this.drawLoop(this._delta);
        this._lastTime = this._currentTime - (this._delta % this._interval);
      }
  }

  drawLoop(delta) {
  }

}
