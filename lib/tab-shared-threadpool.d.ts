declare class TabSharedThreadpool {
    private readonly fifo_worker;
    constructor(threadpool_name: string);
    private static wrapped_callback;
    push_task(callback: () => Promise<unknown>): void;
}
export { TabSharedThreadpool };
