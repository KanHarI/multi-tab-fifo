"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabSharedThreadpool = void 0;
const worker_1 = require("./worker");
class TabSharedThreadpool {
    constructor(threadpool_name) {
        this.fifo_worker = new worker_1.Worker(threadpool_name + "_threadpool", TabSharedThreadpool.wrapped_callback);
    }
    static async wrapped_callback(origin_callback) {
        return await origin_callback();
    }
    async push_task(callback, priority = 0) {
        return this.fifo_worker.push_message(callback, priority);
    }
    async push_task_and_await_completion(callback, priority = 0) {
        const deferred = await this.push_task(callback, priority);
        if (deferred == undefined) {
            return undefined;
        }
        return (await deferred.promise);
    }
    is_leading() {
        return this.fifo_worker.is_leading();
    }
    async stop() {
        await this.fifo_worker.stop();
    }
    set_num_workers(n) {
        this.fifo_worker.set_max_concurrent_workers(n);
    }
}
exports.TabSharedThreadpool = TabSharedThreadpool;
