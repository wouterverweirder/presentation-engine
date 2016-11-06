const childProcess = requireNode(`child_process`);
const EventEmitter = requireNode(`events`).EventEmitter;
const path = requireNode(`path`);

const platform = requireNode(`electron`).remote.process.platform;
const isWin = /^win/.test(platform);

//kill entire process tree
//http://krasimirtsonev.com/blog/article/Nodejs-managing-child-processes-starting-stopping-exec-spawn
const kill = (pid, signal) => {
  signal = signal || `SIGKILL`;
  return new Promise(resolve => {
    if(!isWin) {
      const psTree = requireNode(`ps-tree`);
      const killTree = true;
      if(killTree) {
        psTree(pid, (err, children) => {
          [pid].concat(children.map(p => p.PID)).forEach(tpid => {
            try { process.kill(tpid, signal); }
            catch (ex) { console.error(ex); }
          });
        });
      } else {
        try { process.kill(pid, signal); }
        catch (ex) { console.error(ex); }
      }
      resolve();
    } else {
      childProcess.exec(`taskkill /PID ${  pid  } /T /F`, () => {
        resolve();
      });
    }
  });
};

export default class NodeAppRunner extends EventEmitter {
  constructor() {
    super();
  }
  run(applicationPath) {
    return this.stop()
    .then(() => {
      this.cwd = path.dirname(applicationPath);
      this.numDataEventsReceived = 0;
      this.ignoreFirstEventsAmount = 0;
      if(isWin) {
        this.ignoreFirstEventsAmount = 2;
        this.runner = childProcess.spawn(`cmd`, [`nvmw`, `use`, `iojs-v2.3.1`], {cwd: this.cwd});
        setTimeout(() => {
          this.runner.stdin.write(`node ${  applicationPath  }\n`);
        }, 500);
      } else {
        console.log(`node ${  applicationPath}`);
        this.runner = childProcess.spawn(`node`, [applicationPath], {cwd: this.cwd});
      }
      this.runner.stdout.on(`data`, data => this.onRunnerData(data));
      this.runner.stderr.on(`data`, error => this.onRunnerError(error));
      this.runner.on(`disconnect`, () => this.onDisconnect());
      this.runner.on(`close`, () => this.onClose());
      this.runner.on(`exit`, () => this.onExit());
    });
  }
  onRunnerData(data) {
    this.numDataEventsReceived++;
    if(this.numDataEventsReceived <= this.ignoreFirstEventsAmount) {
      //ignore the first x-messages
      return;
    }
    data = data.toString().trim();
    if(data.indexOf(this.cwd) === 0) {
      data = data.substr(this.cwd.length);
      if(data.length === 1) {
        return;
      }
    }
    this.emit(`stdout-data`, data);
  }

  onRunnerError(error) {
    this.emit(`stderr-data`, error.toString().trim());
  }

  onDisconnect() {
    console.log(`[ChildApp] runner disconnected`);
    this.runner = false;
  }

  onClose() {
    console.log(`[ChildApp] runner closed`);
    this.runner = false;
  }

  onExit() {
    console.log(`[ChildApp] runner exited`);
    this.runner = false;
  }

  stop() {
    return new Promise(resolve => {
      if(!this.runner) {
        resolve();
      }
      this.runner.stdout.removeAllListeners();
      this.runner.stderr.removeAllListeners();
      this.runner.stdin.end();
      //listen for runner events and resolve on the one that occurs
      // const cbCalled = false;
      // this.runner.on('disconnect', () => {
      //   console.log('disconnect');
      //   if(!cbCalled) {
      //     resolve();
      //   }
      // });
      // this.runner.on('close', () => {
      //   console.log('close');
      //   if(!cbCalled) {
      //     resolve();
      //   }
      // });
      // this.runner.on('exit', () => {
      //   console.log('exit');
      //   if(!cbCalled) {
      //     resolve();
      //   }
      // });
      kill(this.runner.pid).then(() => {
        resolve();
      });
      this.runner = false;
    });
  }
  destroy() {
    return this.stop()
    .then(() => {
    });
  }
}
