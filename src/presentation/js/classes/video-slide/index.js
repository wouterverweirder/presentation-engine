import {Constants} from '../../../../shared/js/Constants';
import ContentBase from '../../../../shared/js/classes/ContentBase';

const getParameterByName = (url, name) => {
  name = name.replace(/[\[]/, `\\[`).replace(/[\]]/, `\\]`);
  const regex = new RegExp(`[\\?&]${  name  }=([^&#]*)`),
    results = regex.exec(url);
  return results == null ? `` : decodeURIComponent(results[1].replace(/\+/g, ` `));
};

export default class VideoSlide extends ContentBase {

  constructor($slideHolder) {
    super($slideHolder);

    this.videoPlaying = false;
    const videoUrl = getParameterByName(this.src, `video`);

    //check for extra config in the filename
    let loop = false;
    let muted = false;
    let controls = false;
    const videoUrlSplitted = videoUrl.split(`.`);
    videoUrlSplitted.forEach(part => {
      if(part === `loop`) {
        loop = true;
      }
      if(part === `muted`) {
        muted = true;
      }
      if(part === `controls`) {
        controls = true;
      }
    });

    this.video = this.$slideHolder.find(`video`)[0];
    if(loop) {
      $(this.video).attr(`loop`, `loop`);
    }
    if(muted) {
      $(this.video).attr(`muted`, `muted`);
    }
    if(controls) {
      $(this.video).attr(`controls`, `controls`);
    }
    $(this.video).attr(`src`, videoUrl);
    this._clickHandler = () => this.toggleVideoPlaying();
    $(this.video).on(`click`, this._clickHandler);
  }

  destroy() {
    super.destroy();
    $(this.video).off(`click`, this._clickHandler);
  }

  onStateChanged() {
    if(this.state === Constants.STATE_ACTIVE) {
      this.setVideoPlaying(true);
    } else {
      this.setVideoPlaying(false);
    }
  }

  setVideoPlaying(value) {
    if(value !== this.videoPlaying) {
      this.videoPlaying = value;
      if(this.videoPlaying) {
        this.video.play();
      } else {
        this.video.pause();
      }
    }
  }

  toggleVideoPlaying() {
    this.setVideoPlaying(!this.videoPlaying);
  }

}
