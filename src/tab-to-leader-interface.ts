import type { uuid } from "./uuid";

const TICK_TIME_MS = 50;
const TICKS_TO_DELETE_DEAD_ID = 10;

type time_ms = number;

interface Message<T> {
  message_id: uuid;
  data: T;
}

interface QueuedMessage<T> {
  worker_id: uuid;
  message: Message<T>;
}

interface TabToLeaderInterface<T> {
  is_init: boolean;
  heartbeat: Record<uuid, time_ms>;
  incoming_messages: Record<uuid, Array<Message<T>>>; // Tabs push, leader pops
  message_queue: Array<QueuedMessage<T>>; // leader push, leader pop
  ready_messages: Record<uuid, Array<Message<T>>>; // leader push, tab pop
  in_process_messages: Record<uuid, Array<Message<T>>>; // tab push, tab pop
}

function purge_id<T>(ttli: TabToLeaderInterface<T>, id: uuid): void {
  delete ttli.heartbeat[id];
  delete ttli.incoming_messages[id];
  ttli.message_queue = ttli.message_queue.filter(
    (message: QueuedMessage<T>) => message.worker_id != id
  );
  delete ttli.ready_messages[id];
  delete ttli.in_process_messages[id];
}

function get_wip_message_count<T>(ttli: TabToLeaderInterface<T>): number {
  let wip_messages_counter = 0;
  for (const id of Object.keys(ttli.ready_messages)) {
    wip_messages_counter += ttli.ready_messages[id].length;
  }
  for (const id of Object.keys(ttli.in_process_messages)) {
    wip_messages_counter += ttli.in_process_messages[id].length;
  }
  return wip_messages_counter;
}

export type { QueuedMessage, TabToLeaderInterface, Message };
export {
  TICK_TIME_MS,
  TICKS_TO_DELETE_DEAD_ID,
  purge_id,
  get_wip_message_count,
};
