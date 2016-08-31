import {Constants} from '../../../../shared/js/Constants';
import ContentBase from '../../../../shared/js/classes/ContentBase';

import LiveCode from '../live-code';

export default class LiveCodeSlide extends ContentBase {

  constructor($slideHolder, config, readyCallback) {
    super($slideHolder);

    let remote = requireNode('electron').remote;
    let config2 = {...config, presentationPath: remote.getGlobal('__dirname')};

    //find live code element
    this.liveCode = new LiveCode(this.$slideHolder.find('.live-code'), config2, readyCallback);
  }

  layout() {
    this.liveCode.layout();
  }

  destroy() {
    super.destroy();
    this.liveCode.destroy();
  }

  onStateChanged() {
    if(this.state === Constants.STATE_ACTIVE) {
      this.liveCode.resume();
    } else {
      //stop
      this.liveCode.pause();
    }
  }

}
