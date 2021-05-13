declare class LeaderProcess<T> {
    private readonly broadcast_channel;
    private readonly channel_name;
    private readonly elector;
    private readonly thread;
    private readonly unknown_ids;
    private is_stopped;
    private max_wip_messages;
    constructor(channel_name: string);
    private gather_known_ids_and_purge_expired;
    private gather_messages_to_shared_queue;
    private pop_messages_from_shared_queue;
    private purge_unknown_ids;
    private leadership_process;
    set_max_concurrent_workers(n: number): void;
    stop(): Promise<void>;
}
export { LeaderProcess };
