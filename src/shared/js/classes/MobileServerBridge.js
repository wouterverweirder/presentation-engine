import fetch from 'isomorphic-fetch';

export default class MobileServerBridge {

  constructor(presentation, settings) {
    this.presentation = presentation;
    this.settings = settings;
    this.connect();
  }

  connect() {
    console.log('MobileServerBridge.connect');
    //post to the api
    fetch(`${this.settings.mobileServerUrl}/login`, {
      method: 'POST',
      body: JSON.stringify(this.getLoginCredentials()),
      headers: new Headers({'Content-Type': 'application/json'})
    })
    .then(response => response.json())
    .then(result => this.loginHandler(result))
    .catch(e => {
      //retry after one second
      setTimeout(() => this.connect(), 1000);
    });
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
