import {
  AddItemMessageBody,
  BroadcastMessage,
  ItemProcessingDoneFromWorkerMessageBody,
  LeaderQueuedItem,
  MessageType,
  RegisterWorkerMessageBody,
  UnregisterWorkerMessageBody,
} from "./tab-to-leader-interface";
import {
  BroadcastChannel,
  LeaderElector,
  createLeaderElection,
} from "broadcast-channel";
import { sleep } from "./sleep";
import { uuid } from "./uuid";

class LeaderProcess {
  private readonly broadcast_channel: BroadcastChannel<BroadcastMessage>;
  private readonly leader_channel: BroadcastChannel<BroadcastMessage>;
  private readonly elector: LeaderElector;
  private readonly thread: Promise<void>;
  private readonly worker_ids: Set<uuid>;
  private readonly queued_messages: Array<LeaderQueuedItem>;
  private readonly messages_under_processing: Record<uuid, Set<uuid>>;
  private readonly incoming_messages: Record<uuid, Array<LeaderQueuedItem>>;
  private is_stopped: boolean;
  private is_leading: boolean;
  private max_wip_messages: number;

  constructor(channel_name: string) {
    const leader_channel_name = channel_name + "_leader";
    this.max_wip_messages = 1;
    this.is_stopped = false;
    this.is_leading = false;
    this.messages_under_processing = {};
    this.incoming_messages = {};
    this.queued_messages = new Array<LeaderQueuedItem>();
    this.worker_ids = new Set<uuid>();
    this.broadcast_channel = new BroadcastChannel(channel_name);
    this.leader_channel = new BroadcastChannel(leader_channel_name);
    this.elector = createLeaderElection(this.broadcast_channel);
    this.thread = this.leadership_process();
  }

  private async broadcast_message_callback(
    ev: BroadcastMessage
  ): Promise<void> {
    if (this.is_stopped) {
      return;
    }
    switch (ev.message_type) {
      case MessageType.LEADER_CREATED:
        console.error("Leader collision detected!");
        break;
      case MessageType.REGISTER_WORKER:
        this.register_worker(ev);
        break;
      case MessageType.UNREGISTER_WORKER:
        await this.unregister_worker(ev);
        break;
      case MessageType.ADD_ITEM_FROM_WORKER:
        await this.add_item_from_worker(ev);
        break;
      case MessageType.ITEM_PROCESSING_DONE_FROM_WORKER:
        await this.item_processing_done(ev);
        break;
      case MessageType.POP_ITEM_TO_WORKER:
        console.error("Leader collision detected!");
        break;
    }
  }

  private async item_processing_done(ev: BroadcastMessage): Promise<void> {
    const item_done_message_data: ItemProcessingDoneFromWorkerMessageBody = ev.message_body as ItemProcessingDoneFromWorkerMessageBody;
    if (this.worker_ids.has(item_done_message_data.worker_id)) {
      this.messages_under_processing[item_done_message_data.worker_id].delete(
        item_done_message_data.item_id
      );
      await this.pop_available_items();
    } else {
      console.error("Unknown worker detected");
    }
  }

  private async add_item_from_worker(ev: BroadcastMessage): Promise<void> {
    const add_item_message_data: AddItemMessageBody = ev.message_body as AddItemMessageBody;
    if (this.worker_ids.has(add_item_message_data.worker_id)) {
      this.incoming_messages[add_item_message_data.worker_id].push(
        add_item_message_data
      );
      await this.pop_available_items();
    } else {
      console.error("Unknown worker detected");
    }
  }

  private async unregister_worker(ev: BroadcastMessage): Promise<void> {
    const unregister_worker_message_body: UnregisterWorkerMessageBody = ev.message_body as UnregisterWorkerMessageBody;
    if (this.worker_ids.has(unregister_worker_message_body.worker_id)) {
      this.worker_ids.delete(unregister_worker_message_body.worker_id);
      delete this.messages_under_processing[
        unregister_worker_message_body.worker_id
      ];
      delete this.incoming_messages[unregister_worker_message_body.worker_id];
      await this.pop_available_items();
    } else {
      console.error("Unknown worker detected");
    }
  }

  private register_worker(ev: BroadcastMessage): void {
    const register_worker_message_data: RegisterWorkerMessageBody = ev.message_body as RegisterWorkerMessageBody;
    this.worker_ids.add(register_worker_message_data.worker_id);
    this.messages_under_processing[
      register_worker_message_data.worker_id
    ] = new Set<uuid>();
    this.incoming_messages[
      register_worker_message_data.worker_id
    ] = new Array<LeaderQueuedItem>();
  }

  private async leadership_process(): Promise<void> {
    await this.elector.awaitLeadership();
    console.debug("Initializing leader");
    this.is_leading = true;
    this.broadcast_channel.onmessage = this.broadcast_message_callback.bind(
      this
    );
    if (this.is_stopped) {
      return;
    }
    await this.broadcast_channel.postMessage({
      message_type: MessageType.LEADER_CREATED,
      message_body: {},
    });
    await sleep(100); // Wait for workers to update leader with their tasks
    console.debug("Leader initialized");
  }

  public async set_max_concurrent_workers(n: number): Promise<void> {
    this.max_wip_messages = n;
    if (this.is_leading) {
      await this.pop_available_items();
    }
  }

  private gather_incoming_messages_to_queue(): void {
    let selected_worker: null | uuid = null;
    do {
      selected_worker = null;
      for (const worker_id of Object.keys(this.incoming_messages)) {
        if (this.incoming_messages[worker_id].length == 0) {
          continue;
        }
        if (selected_worker == null) {
          selected_worker = worker_id;
          continue;
        }
        if (
          this.incoming_messages[worker_id][0].date <
          this.incoming_messages[selected_worker][0].date
        ) {
          selected_worker = worker_id;
        }
      }
      if (selected_worker != null) {
        // This is safe as we know this.incoming_messages[selected_worker] is not empty
        this.queued_messages.push(
          this.incoming_messages[selected_worker].shift() as LeaderQueuedItem
        );
      }
    } while (selected_worker != null);
  }

  private count_wip_messages(): number {
    let num_wip_messages = 0;
    for (const worker_id of Object.keys(this.messages_under_processing)) {
      num_wip_messages += this.messages_under_processing[worker_id].size;
    }
    return num_wip_messages;
  }

  private async pop_available_items(): Promise<void> {
    this.gather_incoming_messages_to_queue();
    const num_wip_messages = this.count_wip_messages();
    while (num_wip_messages < this.max_wip_messages) {
      const poped_item = this.queued_messages.shift();
      if (poped_item == undefined) {
        break;
      }
      if (!this.worker_ids.has(poped_item.worker_id)) {
        continue;
      }
      this.messages_under_processing[poped_item.worker_id].add(
        poped_item.item_id
      );
      console.debug("Leader poping item with id: " + poped_item.item_id);
      await this.broadcast_channel.postMessage({
        message_type: MessageType.POP_ITEM_TO_WORKER,
        message_body: {
          worker_id: poped_item.worker_id,
          item_id: poped_item.item_id,
        },
      });
    }
  }

  public async stop(): Promise<void> {
    this.is_stopped = true;
    this.is_leading = false;
    const leader_dying = this.elector.die();
    const broadcast_channel_closing = this.broadcast_channel.close();
    await leader_dying;
    const leader_channel_closing = this.leader_channel.close();
    // await this.thread;
    await broadcast_channel_closing;
    await leader_channel_closing;
    console.debug("Exited leader gracefully");
  }
}

export { LeaderProcess };
