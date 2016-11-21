'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _redlock = require('redlock');

var _redlock2 = _interopRequireDefault(_redlock);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class RedisExclusiveTask {
    constructor(taskName, task, interval) {
        this.taskName = taskName;
        this.task = task;
        this.interval = interval;
    }

    extendAndRun(lock) {
        return lock.extend(this.interval * 2).then(() => this.task()).delay(this.interval).then(() => this.extendAndRun(lock)) // recurse
        .catch(() => this.log.info(`@RedisExclusiveTask(${ this.taskName }): Unable to extend lock`)).finally(() => this.log.warn(`@RedisExclusiveTask(${ this.taskName }): Leaving extendAndUpdate`));
        // only on error bail out
    }

    lockAndRun() {
        return this.redlock.lock(`${ this.taskName }:run`, this.interval * 2).then(lock => {
            log.info(`@RedisExclusiveTask(${ this.taskName }): I have the lock!`);
            return this.extendAndRun(lock);
        }).catch(() => {});
    }

    static configure(clients, log = console) {
        this.log = log;
        this.redlock = new _redlock2.default(clients, { retryCount: 0 });
    }

    static run(taskName, task, interval) {
        const executor = new RedisExclusiveTask(taskName, task, interval);
        executor.lockAndRun();
        setInterval(() => executor.lockAndRun(), interval * 2.5); // max outage should be 120s
    }
}
exports.default = RedisExclusiveTask; /**
                                       * Created by arolave on 19/09/2016.
                                       */