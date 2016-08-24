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

  function openTab() {
    var tab =  w.tabs[0];
    //open the directory provided in the querystring
    var dir = getParameterByName(window.location, 'dir');
    if(dir && dir.length > 0) {
      tab.socket.emit("data", tab.id, "cd " + dir + "\n");
      tab.socket.emit("data", tab.id, "clear\n");
    }
  }

  function getParameterByName(url, name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(url);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  tty.on('open', init);
  tty.on('open tab', openTab);
})();
