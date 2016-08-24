import {Constants} from '../../../../shared/js/Constants';
import ContentBase from '../../../../shared/js/classes/ContentBase';

import LiveCode from '../live-code';

export default class LiveCodeSlide extends ContentBase {

  constructor($slideHolder) {
    super($slideHolder);

    var remote = requireNode('electron').remote;
    var config = {
      presentationPath: remote.getGlobal('__dirname')
    };

    //find live code element
    this.liveCode = new LiveCode(this.$slideHolder.find('.live-code'), config);
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
    } else {
      //stop
      this.liveCode.stop();
    }
  }

}
