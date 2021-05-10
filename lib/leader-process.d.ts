declare class LeaderProcess<T> {
    #private;
    constructor(channel_name: string);
    private gather_known_ids_and_purge_expired;
    private gather_messages_to_shared_queue;
    private pop_messages_from_shared_queue;
    private purge_unknown_ids;
    private leadership_process;
}
export { LeaderProcess };
