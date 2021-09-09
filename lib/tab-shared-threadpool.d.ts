import { Deferred } from "ts-deferred";
declare class TabSharedThreadpool {
    private readonly fifo_worker;
    constructor(threadpool_name: string, _global_this: Record<string, unknown>);
    private static wrapped_callback;
    push_task(callback: () => Promise<unknown>, priority?: number): Promise<Deferred<unknown> | undefined>;
    push_task_and_await_completion<U>(callback: () => Promise<U>, priority?: number): Promise<U | undefined>;
    is_leading(): boolean;
    stop(): Promise<void>;
    set_num_workers(n: number): void;
}
declare function create_tab_shared_threadpool_with_global_this(threadpool_name: string): TabSharedThreadpool;
declare function create_tab_shared_threadpool_for_browser(threadpool_name: string): TabSharedThreadpool;
export { TabSharedThreadpool, create_tab_shared_threadpool_with_global_this, create_tab_shared_threadpool_for_browser, };
