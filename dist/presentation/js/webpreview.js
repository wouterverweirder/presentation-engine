console.log = function(){
  args = [];
  [].forEach.call(arguments, function(argument){
    args.push(argument);
  });
  require('ipc').sendToHost('console.log', JSON.stringify({args: args}));
}
console.error = function(){
  args = [];
  [].forEach.call(arguments, function(argument){
    args.push(argument);
  });
  require('ipc').sendToHost('console.error', JSON.stringify({args: args}));
}
window.onerror = function(msg, url, line, col, error) {
  console.error(msg);
}
