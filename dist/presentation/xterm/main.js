{
  let term,
      protocol,
      socketURL,
      socket,
      pid;

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
        socket.send(o.value + "\n");
        break;
      default:
        console.warn('received unknown command object');
        console.warn(o);
        break;
    }
  });

  const terminalContainer = document.getElementById('terminal-container');

  const init = () => {
    // Clean terminal
    while (terminalContainer.children.length) {
      terminalContainer.removeChild(terminalContainer.children[0]);
    }
    term = new Terminal({});
    term.on('resize', size => {
      if (!pid) {
        return;
      }
      const cols = size.cols,
          rows = size.rows,
          url = '/terminals/' + pid + '/size?cols=' + cols + '&rows=' + rows;

      fetch(url, {method: 'POST'});
    });

    protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
    socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + '/terminals/';

    term.open(terminalContainer, false);
    term.fit();
    term.fit();

    setTimeout(() => {
      fetch('/terminals?cols=' + term.cols + '&rows=' + term.rows, {method: 'POST'})
        .then(res => res.text())
        .then(pidValue => {
          pid = pidValue;
          socketURL += pid;
          socket = new WebSocket(socketURL);
          socket.onopen = runRealTerminal;
        });
    }, 0);

    window.addEventListener('resize', e => {
      if (term._initialized) {
        term.fit();
        term.fit();
      }
    });
  };

  const runRealTerminal = () => {
    term.attach(socket);
    term._initialized = true;
    ipcRenderer.sendToHost('message-from-terminal', {
      command: 'init'
    });
  };

  init();
}
