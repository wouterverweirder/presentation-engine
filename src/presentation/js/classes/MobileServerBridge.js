import MobileServerBridgeBase from '../../../shared/js/classes/MobileServerBridge';
import {Constants} from '../../../shared/js/Constants';

export default class MobileServerBridge extends MobileServerBridgeBase{

  constructor(presentation, settings) {
    super(presentation, settings);
    bean.on(this.presentation, Constants.SET_CURRENT_SLIDE_INDEX, this.currentSlideIndexChanged.bind(this));
  }

  socketConnectHandler() {
    super.socketConnectHandler();
    this.tryToSend(Constants.MESSAGE, {
      target: {
        client: `mobile`,
      },
      content: {
        action: Constants.SET_CURRENT_SLIDE_INDEX,
        currentSlideIndex: this.presentation.currentSlideIndex
      }
    });
  }

  currentSlideIndexChanged(currentSlideIndex) {
    this.tryToSend(Constants.MESSAGE, {
      target: {
        client: `mobile`,
      },
      content: {
        action: Constants.SET_CURRENT_SLIDE_INDEX,
        currentSlideIndex: currentSlideIndex
      }
    });
  }

}
