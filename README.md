#Presentation Engine

Interactive presentation built with electron & nodejs. (Using electron 1.3.4 on node 4.2.2)

## building

```bash
npm run develop
```

## running

Presentation:

```bash
npm run presentation
```

Server (optional):

```bash
npm start
```

People can surf to http://REPLACE_WITH_YOUR_IP:5000 and follow the slides on their screen.


## slides

The content of the dist/presentation/slides folder will be used for the slides, configuration happens via the file names.

- Content is read alphabetically (images, videos or html files)
- Use .desktop or .mobile in the filename, to host a different version of a slide for desktop or mobile:
  - slide.jpg and slide.mobile.jpg (slide.jpg will be shown on desktop, mobile version is the .mobile.jpg)
  - slide.jpg and slide.desktop.jpg (slide.jpg will be shown on mobile, slide.desktop.jpg on desktop)
- Image slides can have the following options in the filename:
  - image.jpg (show entire image, letterboxed by default)
  - image.cover.jpg (fill the entire slide)
- Video slides can have a couple of options in the filename:
  - video.mp4
  - video.loop.mp4
  - video.muted.mp4

## live code

You can add slides with support for live coding & running html/js, nodejs and embedding terminal windows.

Example:

```html
<template>
  <article class="slide">
    <div class="slide-content">
      <div class="live-code" data-entry-path="demos/kinect-skeleton-websockets" data-output-path="tmp/kinect-skeleton-websockets">
        <ul class="nav nav-tabs" role="tablist">
          <li class="nav-item"><a class="nav-link" href="#" aria-controls="nodejs" role="tab">nodejs</a></li>
          <li class="nav-item"><a class="nav-link" href="#" aria-controls="html-code" role="tab">html code</a></li>
          <li class="nav-item"><a class="nav-link" href="#" aria-controls="html-output" role="tab">html output</a></li>
        </ul>
        <div class="tab-content">
          <div role="tabpanel" class="tab-pane" data-tab-id="nodejs" style="height: 66rem; position: relative;">
            <div class="split-pane fixed-bottom">
              <div class="split-pane-component top-pane" style="bottom: 3em; margin-bottom: 5px; min-height: 5em;">
                <textarea data-type="code" data-mode="javascript" data-language="javascript" data-file="server.js"></textarea>
                <div class="btn-group" role="group" style="position: absolute; top: 1em; right: 1em; z-index: 10;">
                  <button type="button" data-target="server.js" data-type="reload-button" class="btn btn-secondary"><i class="fa fa-4x fa-refresh"></i></button>
                  <button type="button" data-target="server.js" data-type="save-button" class="btn btn-secondary"><i class="fa fa-4x fa-save"></i></button>
                  <button type="button" data-target="node-console" data-type="run-button" class="btn btn-secondary"><i class="fa fa-4x fa-play"></i></button>
                </div>
              </div>
              <div class="split-pane-divider divider" style="background: #aaa; bottom: 3em; height: 5px;"></div>
              <div class="split-pane-component bottom-pane" style="height: 3em; min-height: 3em;">
                <div data-id="node-console" style="height: 100%" data-type="console" data-file="server.js"></div>
              </div>
            </div>
          </div>
          <div role="tabpanel" class="tab-pane" data-tab-id="html-code" style="height: 66rem; position: relative;">
            <textarea data-type="code" data-mode="htmlmixed" data-language="html" data-file="index.html"></textarea>
            <div class="btn-group" role="group" style="position: absolute; top: 1em; right: 1em; z-index: 10;">
              <button type="button" data-target="index.html" data-type="reload-button" class="btn btn-secondary"><i class="fa fa-4x fa-refresh"></i></button>
              <button type="button" data-target="index.html" data-type="save-button" class="btn btn-secondary"><i class="fa fa-4x fa-save"></i></button>
              <button type="button" data-target="web-preview" data-type="run-button" class="btn btn-secondary"><i class="fa fa-4x fa-play"></i></button>
            </div>
          </div>
          <div role="tabpanel" class="tab-pane" data-tab-id="html-output" style="height: 66rem; position: relative;">
            <div class="split-pane fixed-bottom">
              <div class="split-pane-component top-pane" style="bottom: 3em; margin-bottom: 5px; min-height: 5em;">
                <div data-id="web-preview" data-type="web-preview" data-console="web-preview-console" data-file="index.html"></div>
              </div>
              <div class="split-pane-divider divider" style="background: #aaa; bottom: 3em; height: 5px;"></div>
              <div class="split-pane-component bottom-pane" style="height: 3em; min-height: 3em;">
                <div data-id="web-preview-console" style="height: 100%" data-type="console"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
<script type="text/template">
(function($slideHolder){

  var LiveCodeSlide = require('LiveCodeSlide').default;

  function init() {
    var liveCode = new LiveCodeSlide($slideHolder);

    //manual manage tabs, as we don't want to work with element ids
    $slideHolder.find('a[role=tab]').click(function (e) {
      e.preventDefault();
      var tabId = $(e.target).attr('aria-controls');
      var $tab = $slideHolder.find('[data-tab-id="' + tabId + '"]');
      $slideHolder.find(".nav-tabs .active, .tab-content .active").removeClass("active");
      $(e.target).addClass('active');
      $tab.addClass("active");
      liveCode.layout();
    });

    $slideHolder.find('div.split-pane').splitPane();
    $slideHolder.find('div.split-pane').on('resize', function(){
      liveCode.layout();
    });

    //focus webpreview tab on run click
    $slideHolder.find('[data-tab-id="html-code"] [data-type="run-button"]').on('click', function(){
      $slideHolder.find('a[role=tab][aria-controls="html-output"]').click();
    });

    requestAnimationFrame(function(){
      $slideHolder.find('a[role=tab]').first().click();
    });
  }

  init();

})(document.$slideHolder);
</script><img onLoad="var s = document.createElement('script'); s.innerHTML = this.previousSibling.innerHTML; document.$slideHolder = $(this).closest('.slide-frame'); this.parentNode.appendChild(s);" style="display: none;" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="/>
  </article>
</template>
```
