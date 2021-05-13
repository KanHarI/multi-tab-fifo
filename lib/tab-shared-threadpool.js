"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabSharedThreadpool = void 0;
const worker_1 = require("./worker");
class TabSharedThreadpool {
    constructor(threadpool_name) {
        this.fifo_worker = new worker_1.Worker(threadpool_name + "_threadpool_channel", TabSharedThreadpool.wrapped_callback);
    }
    static async wrapped_callback(origin_callback) {
        await origin_callback();
    }
    push_task(callback) {
        this.fifo_worker.push_message(callback);
    }
    async stop() {
        await this.fifo_worker.stop();
    }
}
exports.TabSharedThreadpool = TabSharedThreadpool;
