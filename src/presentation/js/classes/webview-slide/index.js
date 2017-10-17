import {Constants} from '../../../../shared/js/Constants';
import ContentBase from '../../../../shared/js/classes/ContentBase';

export default class WebviewSlide extends ContentBase {

  constructor($slideHolder) {
    super($slideHolder);

    this.webviewMuted = false;

    this.webview = this.$slideHolder.find(`webview`)[0];
  }

  destroy() {
    super.destroy();
  }

  reload() {
    this.webview.reload();
  }

  openDevTools() {
    this.webview.openDevTools();
  }

  onStateChanged() {
    if(this.state === Constants.STATE_ACTIVE) {
      this.setWebviewMuted(false);
    } else {
      this.setWebviewMuted(true);
    }
  }

  setWebviewMuted(value) {
    if(value !== this.webviewMuted) {
      this.webviewMuted = value;
      if (!this.webview) {
        return;
      }
      if(this.webviewMuted) {
        this.webview.setAudioMuted(true);
      } else {
        this.webview.setAudioMuted(false);
      }
    }
  }

}
