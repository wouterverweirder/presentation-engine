import fetch from 'isomorphic-fetch';

export default class SlideBridge {
  constructor(data) {
    this.data = data;
    this.name = this.data.name;
  }

  isAlreadyCorrectlyAttached(slideHolder, src) {
    return (this.slideHolder === slideHolder && $(slideHolder).attr(`data-name`) === this.name && $(slideHolder).attr(`data-src`) === src);
  }

  attachToSlideHolder(slideHolder, src, cb) {
    this.slideHolder = slideHolder;
    //notify the content it is being cleared
    this.tryToPostMessage({action: `destroy`});
    //clear the current content
    this.slideHolder.innerHTML = ``;
    $(slideHolder).attr(`data-name`, this.name);
    $(slideHolder).addClass(`loading`);

    $(slideHolder).off(`load`);
    $(slideHolder).on(`load`, () => {
      this.tryToPostMessage({
        action: `setState`,
        state: this.state
      });
      $(slideHolder).off(`load`);
    });

    if(src !== $(slideHolder).attr(`data-src`)) {
      //fetch the html
      fetch(src)
        .then(result => result.text())
        .then(result => $(result))
        .then($result => {
          $(slideHolder).html($result.html());
          $(slideHolder).removeClass(`loading`);
          cb();
        })
        .catch(err => {
          console.error(err);
          $(slideHolder).removeClass(`loading`);
          cb();
        });
      $(slideHolder).attr(`data-src`, src);
    }
  }

  tryToPostMessage(message) {
    if(!this.slideHolder)
    {
      console.log(`${this.name  } post fail`);
      return;
    }
    //trigger with jquery
    $(this.slideHolder).trigger(`message-to-slide`, message);
  }

  setState(state) {
    this.state = state;
    this.tryToPostMessage({
      action: `setState`,
      state: this.state
    });
  }
}
