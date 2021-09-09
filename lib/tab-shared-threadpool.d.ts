import { Deferred } from "ts-deferred";
declare class TabSharedThreadpool {
    private readonly fifo_worker;
    constructor(threadpool_name: string);
    private static wrapped_callback;
    push_task(callback: () => Promise<unknown>, priority?: number): Promise<Deferred<unknown> | undefined>;
    push_task_and_await_completion<U>(callback: () => Promise<U>, priority?: number): Promise<U | undefined>;
    is_leading(): boolean;
    stop(): Promise<void>;
    set_num_workers(n: number): void;
}
export { TabSharedThreadpool };
