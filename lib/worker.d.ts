declare class Worker<T> {
    private readonly broadcast_channel;
    private readonly callback;
    private readonly worker_id;
    private readonly leader_process;
    private readonly processing_messages;
    private readonly queued_items;
    private registration_thread;
    private is_stopped;
    constructor(channel_name: string, callback: (arg: T) => Promise<void>);
    private process_item;
    private pop_item;
    private register_worker_in_leader;
    private broadcast_message_callback;
    set_max_concurrent_workers(n: number): Promise<void>;
    push_message(data: T): Promise<void>;
    stop(): Promise<void>;
}
export { Worker };
