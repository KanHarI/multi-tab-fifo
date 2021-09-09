import {
  BroadcastMessage,
  MessageType,
  PopItemMessageBody,
  QueuedItem,
} from "./tab-to-leader-interface";
import { generate_uuid, uuid } from "./uuid";
import { BroadcastChannel } from "broadcast-channel";
import { Deferred } from "ts-deferred";
import { LeaderProcess } from "./leader-process";

class Worker<T> {
  private readonly broadcast_channel: BroadcastChannel<BroadcastMessage>;
  private readonly callback: (arg: T, item_id: uuid) => Promise<unknown>;
  private readonly worker_id: uuid;
  private readonly leader_process: LeaderProcess;
  private readonly processing_messages: Record<uuid, QueuedItem<T>>;
  private readonly queued_items: Record<uuid, QueuedItem<T>>;
  private readonly queued_promiese: Record<uuid, Deferred<unknown>>;
  private registration_thread: Promise<void>;
  private is_stopped: boolean;

  constructor(
    channel_name: string,
    callback: (arg: T, item_id: uuid) => Promise<unknown>
  ) {
    this.queued_promiese = {};
    this.callback = callback;
    this.worker_id = generate_uuid();
    this.queued_items = {};
    this.processing_messages = {};
    this.is_stopped = false;
    this.broadcast_channel = new BroadcastChannel<BroadcastMessage>(
      channel_name
    );
    this.leader_process = new LeaderProcess(channel_name);
    this.broadcast_channel.onmessage = this.broadcast_message_callback.bind(
      this
    );
    this.registration_thread = this.register_worker_in_leader();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const _global_this = require("globalthis")();
    if (typeof _global_this !== "undefined") {
      if (_global_this.addEventListener != undefined) {
        _global_this.addEventListener("beforeunload", this.stop.bind(this));
      }
    }
  }

  private async process_item(item: QueuedItem<T>) {
    try {
      const result = await this.callback(item.data, item.item_id);
      this.queued_promiese[item.item_id].resolve(result);
    } catch (error) {
      this.queued_promiese[item.item_id].reject(error);
    } finally {
      delete this.queued_promiese[item.item_id];
      if (!this.is_stopped) {
        console.debug("Finished processing " + item.item_id + " in worker");
        await this.broadcast_channel.postMessage({
          message_type: MessageType.ITEM_PROCESSING_DONE_FROM_WORKER,
          message_body: { worker_id: this.worker_id, item_id: item.item_id },
        });
      }
    }
  }
  private async pop_item(ev: BroadcastMessage): Promise<void> {
    const pop_item_to_worker_message_body: PopItemMessageBody = ev.message_body as PopItemMessageBody;
    if (pop_item_to_worker_message_body.worker_id != this.worker_id) {
      return;
    }
    const poped_item = this.queued_items[
      pop_item_to_worker_message_body.item_id
    ];
    delete this.queued_items[pop_item_to_worker_message_body.item_id];
    this.processing_messages[poped_item.item_id] = poped_item;
    await this.process_item(poped_item);
  }

  private async register_worker_in_leader(): Promise<void> {
    console.debug("Registering worker " + this.worker_id + " in leader");
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
          priority: this.queued_items[item_id].priority,
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
        await this.pop_item(ev);
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

  public async push_message(
    data: T,
    priority = 0
  ): Promise<Deferred<unknown> | undefined> {
    if (this.is_stopped) {
      return undefined;
    }
    await this.registration_thread; // Do not collide with registration
    const queued_item: QueuedItem<T> = {
      item_id: generate_uuid(),
      date: Date.now(),
      data: data,
      priority: priority,
    };
    console.debug("Prepushing message with id: " + queued_item.item_id);
    this.queued_items[queued_item.item_id] = queued_item;
    this.queued_promiese[queued_item.item_id] = new Deferred<unknown>();
    await this.broadcast_channel.postMessage({
      message_type: MessageType.ADD_ITEM_FROM_WORKER,
      message_body: {
        worker_id: this.worker_id,
        item_id: queued_item.item_id,
        date: queued_item.date,
        priority: queued_item.priority,
      },
    });
    return this.queued_promiese[queued_item.item_id];
  }

  public is_leading(): boolean {
    return this.leader_process.is_leading();
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
    for (const item_id of Object.keys(this.queued_promiese)) {
      await this.queued_promiese[item_id].promise;
    }
    console.debug("Exited worker gracefully");
  }
}

export { Worker };
