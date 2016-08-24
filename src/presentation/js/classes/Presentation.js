import {Constants} from '../../../shared/js/Constants';
import PresentationBase from '../../../shared/js/classes/Presentation';
import SlideBridge from './SlideBridge';
import MobileServerBridge from './MobileServerBridge';

const path = requireNode('path');

const KEYCODE_LEFT = 37;
const KEYCODE_RIGHT = 39;
const KEYCODE_SPACE = 32;

export default class Presentation extends PresentationBase {
  constructor(data, role, settings) {
    super(data, role, settings);

    window.onbeforeunload = event => this.closeHandler(event);
    $(window).on('keydown', event => this.keydownHandler(event));
    bean.on(this, Constants.SET_CURRENT_SLIDE_INDEX, this.currentSlideIndexChangedHandler.bind(this));

    $('body').on(Constants.GO_TO_PREVIOUS_SLIDE, this.goToPreviousSlide.bind(this));
    $('body').on(Constants.GO_TO_NEXT_SLIDE, this.goToNextSlide.bind(this));
    $('body').on(Constants.OPEN_COMMAND_LINE, this.openCommandLine.bind(this));
    $('body').on(Constants.OPEN_CAMERA, this.openCamera.bind(this));
  }

  closeHandler(event) {
  }

  currentSlideIndexChangedHandler(slideIndex) {
  }

  createMobileServerBridge() {
    return new MobileServerBridge(this, this.settings);
  }

  toggleElevatorMusic() {
    this.elevatorMusicPlaying = !this.elevatorMusicPlaying;
    if(this.elevatorMusicPlaying) {
      this.elevatorMusic.play();
    } else {
      this.elevatorMusic.pause();
    }
  }

  //prepend urls with file:/// (faster?)
  processSlideSrc(src) {
    src = 'file:///' + path.resolve(this.settings.presentationPath, src);
    src = src.replace(/\\/g,"/");
    return src;
  }

  createSlideBridges(data) {
    PresentationBase.prototype.createSlideBridges.call(this, data);
    var that = this;
    var $slideMenu = $('#slideMenu');
    var numSlideBridges = this.slideBridges.length;
    for(var i = 0; i < numSlideBridges; i++) {
      var slideBridge = this.slideBridges[i];
      $slideMenu.append('<button type="button" data-slidenr="' + i + '" class="dropdown-item">' + (i + 1) + ' ' + slideBridge.name + '</button>');
    }
    $slideMenu.find('button').on('click', function(event){
      event.preventDefault();
      that.setCurrentSlideIndex(parseInt($(this).data('slidenr')));
    });
  }

  createSlideBridge(slide) {
    //use our own bridge which doesn't use fetch
    return new SlideBridge(slide);
  }

  slideMessageHandler(event) {
    PresentationBase.prototype.slideMessageHandler.call(this, event);
    if(!event.data) {
      return;
    }
    switch(event.data.action) {
      case Constants.GO_TO_PREVIOUS_SLIDE:
        this.goToPreviousSlide();
        break;
      case Constants.GO_TO_NEXT_SLIDE:
        this.goToNextSlide();
        break;
      case Constants.OPEN_COMMAND_LINE:
        this.openCommandLine();
        break;
      case Constants.OPEN_CAMERA:
        this.openCamera();
        break;
      case Constants.CHILD_APP_SAVE_CODE:
        ChildApp.getInstance().saveCode(event.data.code, event.data.type);
        break;
      case Constants.CHILD_APP_RUN_CODE:
        ChildApp.getInstance().runCode(event.data.code, event.data.type);
        break;
    }
  }

  keydownHandler(event) {
    //one frame delay
    window.requestAnimationFrame(() => {
      if(event.isImmediatePropagationStopped()) {
        return;
      }
      switch(event.keyCode) {
        case KEYCODE_LEFT:
          this.goToPreviousSlide();
          break;
        case KEYCODE_RIGHT:
          this.goToNextSlide();
          break;
        case KEYCODE_SPACE:
          $('#presentation-controls').toggle();
          break;
      }
    });
  }

  childAppDataHandler(data) {
    var currentSlideBridge = this.getSlideBridgeByIndex(this.currentSlideIndex);
    if(currentSlideBridge) {
      currentSlideBridge.tryToPostMessage({
        action: Constants.CHILD_APP_STDOUT_DATA,
        data: data
      });
    }
  }

  childAppErrorHandler(data) {
    var currentSlideBridge = this.getSlideBridgeByIndex(this.currentSlideIndex);
    if(currentSlideBridge) {
      currentSlideBridge.tryToPostMessage({
        action: Constants.CHILD_APP_STDERR_DATA,
        data: data
      });
    }
  }

  openCommandLine() {
    $('#consoleModal').modal('show');
  }

  openCamera() {
    $('#webcamModal').modal('show');
  }

  handleMobileServerMessage(message) {
    if(message.content) {
      if(message.content.action === 'goToNextSlide') {
        this.goToNextSlide();
      } else if(message.content.action === 'goToPreviousSlide') {
        this.goToPreviousSlide();
      }
    }
  }
}
