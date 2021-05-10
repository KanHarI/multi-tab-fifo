declare class Worker<T> {
    private readonly channel_name;
    private readonly id;
    private readonly leader_process;
    private readonly callback;
    private readonly unpushed_messages;
    private is_stopped;
    private readonly thread;
    constructor(channel_name: string, callback: (arg: T) => Promise<void>);
    private process_message;
    private worker_process;
    set_max_concurrent_workers(n: number): void;
    push_message(data: T): void;
    stop(): Promise<void>;
}
export { Worker };
