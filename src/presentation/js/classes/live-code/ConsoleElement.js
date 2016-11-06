import NodeAppRunner from '../NodeAppRunner';

const htmlEscape = str => {
  return String(str).replace(/&/g, `&amp;`)
    .replace(/\"/g, `&quot;`)
    .replace(/'/g, `&#39;`)
    .replace(/</g, `&lt;`)
    .replace(/>/g, `&gt;`);
};

const needsJSONConversion = arg => {
  if(
    typeof arg === `number` ||
    typeof arg === `string` ||
    typeof arg === `boolean`
  ) {
    return false;
  }
  return true;
};

export default class ConsoleElement {

  constructor(el, options) {
    this.el = el;
    this.$el = $(el);

    this.nodeAppRunner = new NodeAppRunner();
    this.nodeAppRunner.on(`stdout-data`, data => this.info([data]));
    this.nodeAppRunner.on(`stderr-data`, error => this.error([error]));

    //options
    if(!options) {
      options = {};
    }
    //wrap element in a container
    this.$wrapperEl = $(el).wrap(`<div class="live-code-element live-code-console-element unreset"></div>`).parent();
    this.wrapperEl = this.$wrapperEl[0];

    this.id = this.$el.attr(`data-id`);
    if(!this.id)
    {
      //generate id
      this.id = `code-${  Math.round(Math.random() * 1000 * new Date().getTime())}`;
      this.$el.attr(`data-id`, this.id);
    }

    this.file = this.$el.data(`file`);

    this.$el.css(`width`, `100%`).css(`height`, `100%`);

    this.logs = [];

    this.isRunning = false;
  }

  pause() {
    if(!this.isRunning) {
      return;
    }
    this.isRunning = false;
    this.nodeAppRunner.stop();
  }

  resume() {
    if(this.isRunning) {
      return;
    }
    if(!this.applicationPath) {
      return;
    }
    this.nodeAppRunner.run(this.applicationPath);
    this.isRunning = true;
  }

  destroy() {
    this.pause();
  }

  runNodeApp(applicationPath) {
    this.pause();
    this.applicationPath = applicationPath;
    this.resume();
  }

  info(args) {
    let str = ``;
    args.forEach(function(arg){
      if(str.length > 0) {
        str += ` `;
      }
      //is it an object or a simple type?
      if(needsJSONConversion(arg)) {
        arg = JSON.stringify(arg);
      }
      str += htmlEscape(arg);
    });
    this.logs.push(`<pre>${  str  }</pre>`);
    while(this.logs.length > 20) {
      this.logs.shift();
    }
    const html = this.logs.join(``);
    this.el.innerHTML = html;
    this.wrapperEl.scrollTop = this.wrapperEl.scrollHeight;
  }

  error(args) {
    let str = ``;
    args.forEach(function(arg){
      if(str.length > 0) {
        str += ` `;
      }
      //is it an object or a simple type?
      if(needsJSONConversion(arg)) {
        arg = JSON.stringify(arg);
      }
      str += htmlEscape(arg);
    });
    this.logs.push(`<pre class="console-error">${  str  }</pre>`);
    while(this.logs.length > 20) {
      this.logs.shift();
    }
    const html = this.logs.join(``);
    this.el.innerHTML = html;
    this.wrapperEl.scrollTop = this.wrapperEl.scrollHeight;
  }
}
