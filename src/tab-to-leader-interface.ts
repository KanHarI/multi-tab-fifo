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

enum MessageType {
  LEADER_CREATED,
  REGISTER_WORKER,
  UNREGISTER_WORKER,
  ADD_ITEM_FROM_WORKER,
  POP_ITEM_TO_WORKER,
  ITEM_PROCESSING_DONE_FROM_WORKER,
  INFORM_WIP_IN_WORKER,
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LeaderCreatedMessageBody {}

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
  message_body:
    | LeaderCreatedMessageBody
    | RegisterWorkerMessageBody
    | UnregisterWorkerMessageBody
    | AddItemMessageBody
    | PopItemMessageBody
    | ItemProcessingDoneFromWorkerMessageBody
    | InformWipInWorkerMessageBody;
}

export {
  QueuedItem,
  LeaderQueuedItem,
  MessageType,
  LeaderCreatedMessageBody,
  RegisterWorkerMessageBody,
  UnregisterWorkerMessageBody,
  AddItemMessageBody,
  PopItemMessageBody,
  ItemProcessingDoneFromWorkerMessageBody,
  BroadcastMessage,
  InformWipInWorkerMessageBody,
};
