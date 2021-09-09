"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create_tab_shared_threadpool_for_browser = exports.create_tab_shared_threadpool_with_global_this = exports.TabSharedThreadpool = void 0;
const worker_1 = require("./worker");
class TabSharedThreadpool {
    constructor(threadpool_name, _global_this) {
        this.fifo_worker = new worker_1.Worker(threadpool_name + "_threadpool", TabSharedThreadpool.wrapped_callback, _global_this);
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
function create_tab_shared_threadpool_with_global_this(threadpool_name) {
    return new TabSharedThreadpool(threadpool_name, globalThis);
}
exports.create_tab_shared_threadpool_with_global_this = create_tab_shared_threadpool_with_global_this;
function create_tab_shared_threadpool_for_browser(threadpool_name) {
    // @ts-ignore
    return new TabSharedThreadpool(threadpool_name, window);
}
exports.create_tab_shared_threadpool_for_browser = create_tab_shared_threadpool_for_browser;
