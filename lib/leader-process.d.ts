declare class LeaderProcess {
    private readonly broadcast_channel;
    private readonly leader_channel;
    private readonly elector;
    private readonly startup_thread;
    private readonly worker_ids;
    private readonly queued_messages_by_priority;
    private readonly messages_under_processing;
    private readonly incoming_messages_by_priority_then_worker_id;
    private is_stopped;
    private _is_leading;
    private max_wip_messages;
    private readonly stopper_deferred;
    constructor(channel_name: string);
    private broadcast_message_callback;
    private item_processing_done;
    private add_item_from_worker;
    private unregister_worker;
    private register_worker;
    private leadership_process;
    set_max_concurrent_workers(n: number): Promise<void>;
    private gather_single_item;
    private gather_incoming_messages_to_queue;
    private count_wip_messages;
    private pop_available_items;
    is_leading(): boolean;
    stop(): Promise<void>;
}
export { LeaderProcess };
