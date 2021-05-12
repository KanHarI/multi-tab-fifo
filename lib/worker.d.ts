declare class Worker<T> {
    private readonly callback;
    private readonly channel_name;
    private readonly id;
    private readonly leader_process;
    private readonly thread;
    private readonly waiting_for_leader;
    private is_stopped;
    private processing_messages;
    private queued_messages;
    constructor(channel_name: string, callback: (arg: T) => Promise<void>);
    private process_message;
    private worker_process;
    set_max_concurrent_workers(n: number): void;
    push_message(data: T): void;
    stop(): Promise<void>;
}
export { Worker };
