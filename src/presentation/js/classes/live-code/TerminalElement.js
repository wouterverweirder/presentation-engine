const remote = requireNode('electron').remote;
const env = remote.getGlobal('process').env;
const path = requireNode('path');
const os = requireNode('os');
const pty = requireNode('node-pty');
const Terminal = requireNode('xterm').Terminal;
const fit = requireNode('xterm/lib/addons/fit/fit');

Terminal.applyAddon(fit);

export default class TerminalElement {

  constructor(el, options) {
    this.el = el;
    this.$el = $(el);

    //options
    if(!options) {
      options = {};
    }
    //wrap element in a container
    this.$wrapperEl = $(el).wrap(`<div class="live-code-element live-code-terminal-element"></div>`).parent();
    this.wrapperEl = this.$wrapperEl[0];

    this.id = this.$el.attr(`data-id`);
    if(!this.id)
    {
      //generate id
      this.id = `code-${  Math.round(Math.random() * 1000 * new Date().getTime())}`;
      this.$el.attr(`data-id`, this.id);
    }

    this.dir = this.$el.data(`dir`);
    if (this.dir) {
      this.dir = path.resolve(remote.getGlobal(`__dirname`), this.dir);
    } else {
      this.dir = remote.getGlobal(`__dirname`);
    }
    this.autorun = this.$el.data(`autorun`);

    this.$el.css(`width`, `100%`).css(`height`, `100%`);

    this.isRunning = false;

    // Initialize node-pty with an appropriate shell
    this.shell = env[os.platform() === 'win32' ? 'COMSPEC' : 'SHELL'];
    this.ptyProcess = pty.spawn(this.shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: this.dir,
      env: env
    });

    // Initialize xterm.js and attach it to the DOM
    this.xterm = new Terminal();
    this.xterm.setOption('fontSize', '24');
    this.xterm.open(this.el);

    this.xterm.on('data', (data) => {
      this.ptyProcess.write(data);
    });
    this.ptyProcess.on('data', (data) => {
      this.xterm.write(data);
    });

    if(this.autorun) {
      this.executeCommand(this.autorun + "\n");
    }
  }

  layout() {
    this.xterm.fit();
  }

  pause() {
    this.isRunning = false;
  }

  resume() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
  }

  executeCommand(commandString) {
    this.ptyProcess.write(commandString);
  }

  destroy() {
    this.pause();
    this.xterm.off('data');
    this.ptyProcess.off('data');
    this.ptyProcess.kill();
    this.xterm.destroy();
  }
}
