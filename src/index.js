/**
 * Created by arolave on 19/09/2016.
 */
import Redlock from 'redlock';

export default class RedisExclusiveTask {
    constructor(taskName, task, interval) {
        this.taskName = taskName;
        this.task = task;
        this.interval = interval;
    }

    extendAndRun(lock) {
        return lock
          .extend(this.interval * 2)
          .then(() => this.task())
          .delay(this.interval)
          .then(() => this.extendAndRun(lock)) // recurse
          .catch(() => this.log.info(`@RedisExclusiveTask(${this.taskName}): Unable to extend lock`))
          .finally(() => this.log.warn(`@RedisExclusiveTask(${this.taskName}): Leaving extendAndUpdate`));
                        // only on error bail out
    }

    lockAndRun() {
        return this.redlock.lock(`${this.taskName}:run`, this.interval * 2)
            .then((lock) => {
                log.info(`@RedisExclusiveTask(${this.taskName}): I have the lock!`);
                return this.extendAndRun(lock);
            })
            .catch(() => {});
    }

    static configure(clients, log = console) {
        this.log = log;
        this.redlock = new Redlock(clients, { retryCount: 0 });
    }

    static run(taskName, task, interval) {
        const executor = new RedisExclusiveTask(taskName, task, interval);
        executor.lockAndRun();
        setInterval(() => executor.lockAndRun(), interval * 2.5); // max outage should be 120s
    }
}
