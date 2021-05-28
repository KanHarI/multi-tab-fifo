import {
  BroadcastMessage,
  MessageType,
  PopItemMessageBody,
  QueuedItem,
} from "./tab-to-leader-interface";
import { generate_uuid, uuid } from "./uuid";
import { BroadcastChannel } from "broadcast-channel";
import { LeaderProcess } from "./leader-process";

class Worker<T> {
  private readonly broadcast_channel: BroadcastChannel<BroadcastMessage>;
  private readonly callback: (arg: T) => Promise<void>;
  private readonly worker_id: uuid;
  private readonly leader_process: LeaderProcess;
  private readonly processing_messages: Record<uuid, QueuedItem<T>>;
  private readonly queued_items: Record<uuid, QueuedItem<T>>;
  private registration_thread: Promise<void>;
  private is_stopped: boolean;

  constructor(channel_name: string, callback: (arg: T) => Promise<void>) {
    this.callback = callback;
    this.broadcast_channel = new BroadcastChannel<BroadcastMessage>(
      channel_name
    );
    this.worker_id = generate_uuid();
    this.queued_items = {};
    this.processing_messages = {};
    this.is_stopped = false;
    this.leader_process = new LeaderProcess(channel_name);
    this.broadcast_channel.onmessage = this.broadcast_message_callback.bind(
      this
    );
    this.registration_thread = this.register_worker_in_leader();
    if (globalThis.addEventListener != undefined) {
      globalThis.addEventListener("beforeunload", this.stop.bind(this));
    }
  }

  private async process_item(item: QueuedItem<T>) {
    try {
      await this.callback(item.data);
    } finally {
      this.broadcast_channel.postMessage({
        message_type: MessageType.ITEM_PROCESSING_DONE_FROM_WORKER,
        message_body: { worker_id: this.worker_id, item_id: item.item_id },
      });
    }
    console.log("Exited message processing gracefuly");
  }
  private pop_item(ev: BroadcastMessage): void {
    console.log(ev);
    const pop_item_to_worker_message_body: PopItemMessageBody = ev.message_body as PopItemMessageBody;
    if (pop_item_to_worker_message_body.worker_id != this.worker_id) {
      return;
    }
    const poped_item = this.queued_items[
      pop_item_to_worker_message_body.item_id
    ];
    delete this.queued_items[pop_item_to_worker_message_body.item_id];
    this.processing_messages[poped_item.item_id] = poped_item;
    this.process_item(poped_item);
  }

  private async register_worker_in_leader(): Promise<void> {
    await this.broadcast_channel.postMessage({
      message_type: MessageType.REGISTER_WORKER,
      message_body: { worker_id: this.worker_id },
    });
    for (const item_id of Object.keys(this.queued_items)) {
      await this.broadcast_channel.postMessage({
        message_type: MessageType.ADD_ITEM_FROM_WORKER,
        message_body: {
          worker_id: this.worker_id,
          item_id: item_id,
          date: this.queued_items[item_id].date,
        },
      });
    }
    for (const item_id of Object.keys(this.processing_messages)) {
      await this.broadcast_channel.postMessage({
        message_type: MessageType.INFORM_WIP_IN_WORKER,
        message_body: { worker_id: this.worker_id, item_id: item_id },
      });
    }
  }

  private async broadcast_message_callback(ev: BroadcastMessage) {
    await this.registration_thread; // Do not collide with registration
    switch (ev.message_type) {
      case MessageType.ITEM_PROCESSING_DONE_FROM_WORKER:
      case MessageType.REGISTER_WORKER:
      case MessageType.UNREGISTER_WORKER:
      case MessageType.ADD_ITEM_FROM_WORKER:
      case MessageType.INFORM_WIP_IN_WORKER:
        break;
      case MessageType.LEADER_CREATED:
        this.registration_thread = this.register_worker_in_leader();
        break;
      case MessageType.POP_ITEM_TO_WORKER:
        this.pop_item(ev);
        break;
    }
  }

  public async set_max_concurrent_workers(n: number): Promise<void> {
    if (this.is_stopped) {
      return;
    }
    await this.registration_thread; // Do not collide with registration
    await this.leader_process.set_max_concurrent_workers(n);
  }

  public async push_message(data: T): Promise<void> {
    if (this.is_stopped) {
      return;
    }
    await this.registration_thread; // Do not collide with registration
    console.log("Prepushing message with data " + data);
    const queued_item: QueuedItem<T> = {
      item_id: generate_uuid(),
      date: Date.now(),
      data: data,
    };
    this.queued_items[queued_item.item_id] = queued_item;
    this.broadcast_channel.postMessage({
      message_type: MessageType.ADD_ITEM_FROM_WORKER,
      message_body: {
        worker_id: this.worker_id,
        item_id: queued_item.item_id,
        date: queued_item.date,
      },
    });
  }

  public async stop(): Promise<void> {
    if (this.is_stopped) {
      return;
    }
    this.is_stopped = true;
    await this.broadcast_channel.postMessage({
      message_type: MessageType.UNREGISTER_WORKER,
      message_body: { worker_id: this.worker_id },
    });
    const broadcast_channel_stop = this.broadcast_channel.close();
    const leader_process_stop = this.leader_process.stop();
    await this.registration_thread;
    await broadcast_channel_stop;
    await leader_process_stop;
    console.log("Exited worker gracefully");
  }
}

export { Worker };
