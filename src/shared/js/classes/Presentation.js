import {Constants} from '../Constants';
import SlideBridge from './SlideBridge';

export default class Presentation {
  /*
   * data: json object with slides array property
   * role: mobile or presentation
   */
  constructor(data, role, settings) {
    this.data = data;
    this.role = role;
    this.settings = settings;
    $(`#presentation`).attr(`data-presentation-settings`, JSON.stringify(settings));
    this.currentSlideIndex = -1;
    this.slideHolders = [];
    this.numSlideHolders = 3;
    this.slideBridges = [];
    this.slideBridgesBySlideName = {};

    this.createSlideHolders();
    this.createSlideBridges(this.data);

    this.mobileServerBridge = this.createMobileServerBridge();
    this.startListeningForMessages();

    this.setCurrentSlideIndex(0);
  }

  startListeningForMessages() {
    window.addEventListener(`message`, this.slideMessageHandler.bind(this), false);
  }

  createSlideHolders() {
    for(let i = 0; i < this.numSlideHolders; i++) {
      const $slideHolder = $(`<div class="slide-frame" />`);
      this.slideHolders.push($slideHolder);
      $(`#presentation`).append($slideHolder);
    }
  }

  createSlideBridges(data) {
    const numSlides = data.slides.length;
    for(let i = 0; i < numSlides; i++) {
      const slideBridge = this.createSlideBridge(data.slides[i]);
      this.slideBridges.push(slideBridge);
      this.slideBridgesBySlideName[slideBridge.name] = slideBridge;
    }
  }

  createSlideBridge(slide) {
    return new SlideBridge(slide);
  }

  slideMessageHandler(event) {
    if(!event.data) {
      return;
    }
    switch(event.data.action) {
    case Constants.SOCKET_SEND:
      if(this.mobileServerBridge) {
        this.mobileServerBridge.tryToSend(Constants.MESSAGE, event.data.message);
      }
      break;
    }
  }

  mobileServerBridgeConnected() {
    //join the rooms of the slideHolders
    for(let i = 0; i < this.numSlideHolders; i++) {
      this.mobileServerBridge.tryToSend(Constants.JOIN_SLIDE_ROOM, $(this.slideHolders[i]).attr(`data-name`));
    }
  }

  mobileServerMessageHandler(message) {
    if(message.target.slide) {
      //slide has to handle the message
      const slideBridge = this.getSlideBridgeByName(message.target.slide);
      if(slideBridge) {
        slideBridge.tryToPostMessage({
          action: Constants.SOCKET_RECEIVE,
          message: message
        });
      }
    } else {
      //presentation has to handle the message
      this.handleMobileServerMessage(message);
    }
  }

  handleMobileServerMessage(message) {
    console.log(`[shared/Presentation] handleMobileServerMessage`, message);
  }

  getSlideBridgeByIndex(index) {
    if(index >= 0 && index < this.slideBridges.length) {
      return this.slideBridges[index];
    }
    return false;
  }

  getSlideBridgeByName(slideName) {
    return this.slideBridgesBySlideName[slideName];
  }

  getSlideHolderForSlide(slide, slidesNotToClear) {
    if(slide) {
      let $slideHolder = $(`.slide-frame[data-name="${  slide.name  }"]`);
      if($slideHolder.length > 0) {
        return $slideHolder[0];
      }
      //get a free slideHolder
      const slideNamesNotToClear = [];
      $(slidesNotToClear).each(function(index, obj){
        slideNamesNotToClear.push(obj.name);
      });
      const $slideHolders = $(`.slide-frame`);
      for (let i = $slideHolders.length - 1; i >= 0; i--) {
        $slideHolder = $($slideHolders[i]);
        const name = $slideHolder.attr(`data-name`);
        if(!name || slideNamesNotToClear.indexOf(name) === -1) {
          return $slideHolder[0];
        }
      }
    }
    return false;
  }

  goToPreviousSlide() {
    this.setCurrentSlideIndex(this.currentSlideIndex - 1);
  }

  goToNextSlide() {
    this.setCurrentSlideIndex(this.currentSlideIndex + 1);
  }

  setCurrentSlideIndex(value) {
    value = Math.max(0, Math.min(value, this.slideBridges.length - 1));
    if(value !== this.currentSlideIndex) {
      this.currentSlideIndex = value;

      const currentSlideBridge = this.getSlideBridgeByIndex(this.currentSlideIndex);
      const previousSlideBridge = this.getSlideBridgeByIndex(this.currentSlideIndex - 1);
      const nextSlideBridge = this.getSlideBridgeByIndex(this.currentSlideIndex + 1);

      //remove "used" class from slide holders
      $(`.slide-frame`).removeAttr(`data-used`, false);

      const currentSlideHolder = this.getSlideHolderForSlide(currentSlideBridge, [previousSlideBridge, nextSlideBridge]);
      this.setupSlideHolder(currentSlideHolder, currentSlideBridge, Constants.STATE_ACTIVE, 0);

      const previousSlideHolder = this.getSlideHolderForSlide(previousSlideBridge, [currentSlideBridge, nextSlideBridge]);
      this.setupSlideHolder(previousSlideHolder, previousSlideBridge, Constants.STATE_INACTIVE, `-100%`);

      const nextSlideHolder = this.getSlideHolderForSlide(nextSlideBridge, [previousSlideBridge, currentSlideBridge]);
      this.setupSlideHolder(nextSlideHolder, nextSlideBridge, Constants.STATE_INACTIVE, `100%`);

      //clear attributes of unused slide frames
      $(`.slide-frame`).each(function(index, slideHolder){
        if(!$(slideHolder).attr(`data-used`)) {
          $(slideHolder).removeAttr(`data-used`).removeAttr(`data-name`).removeAttr(`data-src`);
        }
      });

      //all other slideHolder bridges should be unlinked from their slideHolder
      this.slideBridges.forEach(function(slideBridge){
        if(slideBridge === currentSlideBridge) {
          return;
        }
        if(slideBridge === previousSlideBridge) {
          return;
        }
        if(slideBridge === nextSlideBridge) {
          return;
        }
        slideBridge.slideHolder = null;
      });

      bean.fire(this, Constants.SET_CURRENT_SLIDE_INDEX, [this.currentSlideIndex]);
    }
  }

  setupSlideHolder(slideHolder, slideBridge, state, left) {
    if(slideHolder) {
      let src = `slides/${  slideBridge.name  }.html`;
      if(slideBridge.data[this.role] && slideBridge.data[this.role].url) {
        src = slideBridge.data[this.role].url;
      }
      src = this.processSlideSrc(src);
      if(slideBridge.isAlreadyCorrectlyAttached(slideHolder, src)) {
        //console.log(slideBridge.name + ' already attached');
      } else {
        this.attachToSlideHolder(slideHolder, slideBridge, src);
      }
      slideBridge.setState(state);
      $(slideHolder).css(`left`, left);
      $(slideHolder).attr(`data-used`, 1);
    }
  }

  attachToSlideHolder(slideHolder, slideBridge, src) {
    //listen for events on this slideHolder
    $(slideHolder).off(`message-from-slide`);
    $(slideHolder).on(`message-from-slide`, (event, message) =>  {
      this.slideMessageHandler({data: message});
    });
    //leave previous channel of this slideHolder
    if(this.mobileServerBridge) {
      this.mobileServerBridge.tryToSend(Constants.LEAVE_SLIDE_ROOM, $(slideHolder).attr(`data-name`));
    }
    //add the join as a callback for the onload event
    slideBridge.attachToSlideHolder(slideHolder, src, this.slideLoaded.bind(this, slideHolder, slideBridge, src));
  }

  slideLoaded(slideHolder, slideBridge) { // eslint-disable-line no-unused-vars
    //join new channel
    if(this.mobileServerBridge) {
      this.mobileServerBridge.tryToSend(Constants.JOIN_SLIDE_ROOM, $(slideHolder).attr(`data-name`));
    }
  }

  processSlideSrc(src) {
    return src;
  }

  createMobileServerBridge() {
    //to implement in extending classes
  }
}
