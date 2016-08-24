import SlideBridgeBase from '../../../shared/js/classes/SlideBridge';

export default class SlideBridge extends SlideBridgeBase {

  attachToSlideHolder(slideHolder, src, cb) {
    this.slideHolder = slideHolder;
    //notify the content it is being cleared
    this.tryToPostMessage({action: 'destroy'});
    //clear the current content
    this.slideHolder.innerHTML = '';
    $(slideHolder).attr('data-name', this.name);
    $(slideHolder).addClass('loading');

    $(slideHolder).on('load', () => {
      this.tryToPostMessage({
        action: 'setState',
        state: this.state
      });
      $(slideHolder).off('load');
    });

    if(src !== $(slideHolder).attr('data-src')) {
      //create html import
      var $importEl = $('<link rel="import">');
      var importEl = $importEl[0];
      $importEl.on('load', (function(){
        var template = importEl.import.querySelector('template');
        if(template) {
          var clone = document.importNode(template.content, true);
          this.slideHolder.appendChild(clone);
        }
        $importEl.remove();
        $(slideHolder).removeClass('loading');
        cb();
      }).bind(this));
      $importEl.attr('href', src);
      $(slideHolder).attr('data-src', src);
      $(slideHolder).html($importEl);
    }
  };
}
