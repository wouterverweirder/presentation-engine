export default class MobileServerBridge {

  constructor(presentation, settings) {
    this.presentation = presentation;
    this.settings = settings;
    this.connect();
  }

  connect() {
    console.log('MobileServerBridge.connect');
    $.post(this.settings.mobileServerUrl + '/login', this.getLoginCredentials()).done(this.loginHandler.bind(this))
    .fail((function() {
      //retry after one second
      setTimeout((function(){
        this.connect();
      }).bind(this), 1000);
    }).bind(this));
  }

  getLoginCredentials() {
    return {
      email: this.settings.mobileServerUsername,
      password: this.settings.mobileServerPassword,
    };
  }

  loginHandler(result) {
    this.token = result.token;
    this.socket = io(this.settings.mobileServerUrl, {
      query: 'token=' + this.token,
      reconnection: false,
      forceNew: true
    });
    this.socket.on('connect', this.socketConnectHandler.bind(this));
    this.socket.on('disconnect', this.socketDisconnectHandler.bind(this));
    this.socket.on('message', this.socketMessageHandler.bind(this));
  }

  socketConnectHandler() {
    console.log('MobileServerBridge.socketConnectHandler');
    this.presentation.mobileServerBridgeConnected();
  }

  socketDisconnectHandler() {
    this.connect();
  }

  tryToSend() {
    if(this.socket) {
      this.socket.emit.apply(this.socket, arguments);
    }
  }

  socketMessageHandler(message) {
    this.presentation.mobileServerMessageHandler(message);
  }
}
