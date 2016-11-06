/**
 * Custom init script: only one fullscreen terminal
 * CWD is in the querystring
 */
(function(){
  var w;

  function init() {
    tty.on('connect', createWindow);
  }

  function createWindow() {
    w = new tty.Window;
    w.maximize();
  }

  function linkToPresentation() {
    var tab =  w.tabs[0];
    const {ipcRenderer} = require('electron');
    ipcRenderer.on('message-to-terminal', (sender, ...args) => {
      if(args.length < 1) {
        return;
      }
      const o = args[0];
      if(!o.command) {
        return;
      }
      switch(o.command) {
        case 'execute':
          if(!o.value) {
            return;
          }
          tab.socket.emit("data", tab.id, o.value + "\n");
          break;
        default:
          console.warn('received unknown command object');
          console.warn(o);
          break;
      }
    });
    ipcRenderer.sendToHost('message-from-terminal', {
      command: 'init'
    });
  }

  tty.on('open', init);
  tty.on('open tab', linkToPresentation);
})();
