'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * Created by arolave on 19/09/2016.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      */


var _redlock = require('redlock');

var _redlock2 = _interopRequireDefault(_redlock);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var RedisExclusiveTask = function () {
    function RedisExclusiveTask(taskName, task, interval) {
        _classCallCheck(this, RedisExclusiveTask);

        this.taskName = taskName;
        this.task = task;
        this.interval = interval;
    }

    _createClass(RedisExclusiveTask, [{
        key: 'extendAndRun',
        value: function extendAndRun(lock) {
            var _this = this;

            return lock.extend(this.interval * 2).then(function () {
                return _this.task();
            }).delay(this.interval).then(function () {
                return _this.extendAndRun(lock);
            }) // recurse
            .catch(function () {
                return RedisExclusiveTask.log.info('@RedisExclusiveTask(' + _this.taskName + '): Unable to extend lock');
            }).finally(function () {
                return RedisExclusiveTask.log.warn('@RedisExclusiveTask(' + _this.taskName + '): Leaving extendAndUpdate');
            });
            // only on error bail out
        }
    }, {
        key: 'lockAndRun',
        value: function lockAndRun() {
            var _this2 = this;

            return RedisExclusiveTask.redlockInstance.lock(this.taskName + ':run', this.interval * 2).then(function (lock) {
                RedisExclusiveTask.log.info('@RedisExclusiveTask(' + _this2.taskName + '): I have the lock!');
                return _this2.extendAndRun(lock);
            }).catch(function () {});
        }
    }], [{
        key: 'configure',
        value: function configure(clients) {
            var log = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : console;

            this.log = log;
            this.redlockInstance = new _redlock2.default(clients, { retryCount: 0 });
        }
    }, {
        key: 'run',
        value: function run(taskName, task, interval) {
            var executor = new RedisExclusiveTask(taskName, task, interval);
            executor.lockAndRun();
            setInterval(function () {
                return executor.lockAndRun();
            }, interval * 2.5); // max outage should be 120s
        }
    }]);

    return RedisExclusiveTask;
}();

exports.default = RedisExclusiveTask;
