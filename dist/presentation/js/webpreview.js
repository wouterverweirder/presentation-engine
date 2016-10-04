console.log = function(){
  args = [];
  [].forEach.call(arguments, function(argument){
    args.push(argument);
  });
  require('electron').ipcRenderer.sendToHost('console.log', JSON.stringify({args: args}));
}
console.error = function(){
  args = [];
  [].forEach.call(arguments, function(argument){
    args.push(argument);
  });
  require('electron').ipcRenderer.sendToHost('console.error', JSON.stringify({args: args}));
}
window.onerror = function(msg, url, line, col, error) {
  console.error(`${msg} (line: ${line})`);
}
