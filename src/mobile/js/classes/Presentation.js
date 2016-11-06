import {Constants} from '../../../shared/js/Constants';
import PresentationBase from '../../../shared/js/classes/Presentation';
import MobileServerBridge from '../../../shared/js/classes/MobileServerBridge';

export default class Presentation extends PresentationBase{

  constructor(data, role, settings) {
    super(data, role, settings);
    this.$overlay = $(`#overlay`);
  }

  createMobileServerBridge() {
    return new MobileServerBridge(this, this.settings);
  }

  handleMobileServerMessage(message) {
    if(!message.content) {
      return;
    }
    if(message.content.action === `setCurrentSlideIndex`) {
      this.setCurrentSlideIndex(message.content.currentSlideIndex);
    } else if(message.content.action === Constants.BLINK) {
      this.blink(message.content.text, message.content.backgroundColor);
    }
  }

  setCurrentSlideIndex(index) {
    super.setCurrentSlideIndex(index);
    if(this.$overlay) {
      this.$overlay.removeClass(`active`);
    }
    if(this.blinkInterval) {
      clearInterval(this.blinkInterval);
    }
  }

  blink(text, backgroundColor) {
    //overlay important, blinking text
    this.$overlay.find(`.content`).html(text);
    this.$overlay.addClass(`active`);
    if(this.blinkInterval) {
      clearInterval(this.blinkInterval);
    }
    this.blinkInterval = setInterval(this.blinkToggle.bind(this, backgroundColor), 500);
  }

  blinkToggle(backgroundColor) {
    this.$overlay.toggleClass(`blink-on`);
    if(this.$overlay.hasClass(`blink-on`)) {
      this.$overlay.css(`background-color`, backgroundColor);
    } else {
      this.$overlay.css(`background-color`, ``);
    }
  }

}
