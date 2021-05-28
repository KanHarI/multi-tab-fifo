declare class TabSharedThreadpool {
    private readonly fifo_worker;
    constructor(threadpool_name: string);
    private static wrapped_callback;
    push_task(callback: () => Promise<unknown>): Promise<Promise<unknown> | undefined>;
    push_task_and_await_completion(callback: () => Promise<unknown>): Promise<unknown | undefined>;
    stop(): Promise<void>;
    set_num_workers(n: number): void;
}
export { TabSharedThreadpool };
