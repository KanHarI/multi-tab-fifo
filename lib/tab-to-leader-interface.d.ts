import type { uuid } from "./uuid";
interface QueuedItem<T> {
    item_id: uuid;
    data: T;
    date: number;
}
interface LeaderQueuedItem {
    worker_id: uuid;
    item_id: uuid;
    date: number;
}
declare enum MessageType {
    LEADER_CREATED = 0,
    REGISTER_WORKER = 1,
    UNREGISTER_WORKER = 2,
    ADD_ITEM_FROM_WORKER = 3,
    POP_ITEM_TO_WORKER = 4,
    ITEM_PROCESSING_DONE_FROM_WORKER = 5,
    INFORM_WIP_IN_WORKER = 6
}
interface LeaderCreatedMessageBody {
}
interface RegisterWorkerMessageBody {
    worker_id: uuid;
}
interface UnregisterWorkerMessageBody {
    worker_id: uuid;
}
interface AddItemMessageBody {
    date: number;
    worker_id: uuid;
    item_id: uuid;
}
interface PopItemMessageBody {
    worker_id: uuid;
    item_id: uuid;
}
interface ItemProcessingDoneFromWorkerMessageBody {
    worker_id: uuid;
    item_id: uuid;
}
interface InformWipInWorkerMessageBody {
    worker_id: uuid;
    item_id: uuid;
}
interface BroadcastMessage {
    message_type: MessageType;
    message_body: LeaderCreatedMessageBody | RegisterWorkerMessageBody | UnregisterWorkerMessageBody | AddItemMessageBody | PopItemMessageBody | ItemProcessingDoneFromWorkerMessageBody | InformWipInWorkerMessageBody;
}
export { QueuedItem, LeaderQueuedItem, MessageType, LeaderCreatedMessageBody, RegisterWorkerMessageBody, UnregisterWorkerMessageBody, AddItemMessageBody, PopItemMessageBody, ItemProcessingDoneFromWorkerMessageBody, BroadcastMessage, InformWipInWorkerMessageBody, };
