import { uuid } from "./uuid";
declare class Worker<T> {
    private readonly broadcast_channel;
    private readonly callback;
    private readonly worker_id;
    private readonly leader_process;
    private readonly processing_messages;
    private readonly queued_items;
    private readonly queued_promiese;
    private registration_thread;
    private is_stopped;
    constructor(channel_name: string, callback: (arg: T, item_id: uuid) => Promise<unknown>);
    private process_item;
    private pop_item;
    private register_worker_in_leader;
    private broadcast_message_callback;
    set_max_concurrent_workers(n: number): Promise<void>;
    push_message(data: T, priority?: number): Promise<Promise<unknown> | undefined>;
    push_message_and_wait_for_completion(data: T): Promise<unknown | undefined>;
    stop(): Promise<void>;
}
export { Worker };
