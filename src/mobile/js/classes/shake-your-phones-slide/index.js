import {Constants} from '../../../../shared/js/Constants';
import ContentBase from '../../../../shared/js/classes/ContentBase';

export default class ShakeYourPhonesSlide extends ContentBase{

  constructor($slideHolder) {
    super($slideHolder);
    this.currentMotion = 0;
    this.motion = 0;

    this.$slideHolder.find('.slide').css('background-color', '#c6363d');

    this.$background = this.$slideHolder.find('.background');
    this.$background.css('top', '100%');
    this.$background.css('background-color', 'rgba(255, 255, 255, 0.5)');

    this._motionUpdateHandler = this.motionUpdateHandler.bind(this);
  }

  onStateChanged() {
    if(this.state === Constants.STATE_ACTIVE) {
      if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', this._motionUpdateHandler, false);
      } else {
        this.$slideHolder.find('.acceleration').text('Not supported on your device :-(');
      }
    } else {
      window.removeEventListener('devicemotion', this._motionUpdateHandler);
    }
  }

  receiveSocketMessage(message) {
    if(!message.content) {
      return;
    }
    if(message.content.action === Constants.SET_SUBSTATE) {
      this.setSubstate(message.content.substate);
    }
    // if(message.content.action === Constants.YOU_WIN) {
    //   this.$slideHolder.find('.substate-finished h1').text('Your Team Won!');
    // }
    // if(message.content.action === Constants.YOU_LOSE) {
    //   this.$slideHolder.find('.substate-finished h1').text('Your Team Lost...');
    // }
  }

  setSubstate(substate) {
    if(this.substate !== substate) {
      this.substate = substate;
      this.showCurrentState();
    }
  }

  motionUpdateHandler(event) {
    this.currentMotion = event.interval * (Math.abs(event.acceleration.x) + Math.abs(event.acceleration.y) + Math.abs(event.acceleration.z));
  }

  drawLoop() {
    this.motion += this.currentMotion;
    this.motion *= 0.97;
    this.$background.css('top', 100 - this.motion + '%');
    if(this.currentFrame % 10 === 0) {
      this.postSocketMessage({
        target: {
          client: 'presentation',
          slide: this.name
        },
        content: {
          action: Constants.UPDATE_MOTION,
          motion: this.motion
        }
      });
    }
  }

  showCurrentState() {
    this.$slideHolder.find('.substate').removeClass('active');
    if(this.substate === Constants.SHAKE_YOUR_PHONES_GAME) {
      this.$slideHolder.find('.substate-game').addClass('active');
    } else if(this.substate === Constants.SHAKE_YOUR_PHONES_FINISHED) {
      this.$slideHolder.find('.substate-finished').addClass('active');
    } else {
      this.$slideHolder.find('.substate-intro').addClass('active');
    }
  }

}
