import { uuid } from "./uuid";
import { Deferred } from "ts-deferred";
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
    push_message(data: T, priority?: number): Promise<Deferred<unknown> | undefined>;
    is_leading(): boolean;
    stop(): Promise<void>;
}
export { Worker };
