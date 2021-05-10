import type { uuid } from "./uuid";
declare const TICK_TIME_MS = 50;
declare const TICKS_TO_DELETE_DEAD_ID = 10;
declare type time_ms = number;
interface Message<T> {
    message_uuid: uuid;
    data: T;
}
interface QueuedMessage<T> {
    sender_uuid: uuid;
    message: Message<T>;
}
interface TabToLeaderInterface<T> {
    is_init: boolean;
    heartbeat: Record<uuid, time_ms>;
    incoming_messages: Record<uuid, Array<Message<T>>>;
    message_queue: Array<QueuedMessage<T>>;
    ready_messages: Record<uuid, Array<Message<T>>>;
    in_process_messages: Record<uuid, Array<Message<T>>>;
}
declare function purge_id<T>(ttli: TabToLeaderInterface<T>, id: uuid): void;
declare function get_wip_message_count<T>(ttli: TabToLeaderInterface<T>): number;
export type { QueuedMessage, TabToLeaderInterface, Message };
export { TICK_TIME_MS, TICKS_TO_DELETE_DEAD_ID, purge_id, get_wip_message_count, };
