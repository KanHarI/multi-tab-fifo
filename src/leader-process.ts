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
import { Deferred } from "ts-deferred";
import { sleep } from "./sleep";
import { uuid } from "./uuid";

class LeaderProcess {
  private readonly broadcast_channel: BroadcastChannel<BroadcastMessage>;
  private readonly leader_channel: BroadcastChannel<BroadcastMessage>;
  private readonly elector: LeaderElector;
  private readonly startup_thread: Promise<void>;
  private readonly worker_ids: Set<uuid>;
  private readonly queued_messages_by_priority: Record<
    number,
    Array<LeaderQueuedItem>
  >;
  private readonly messages_under_processing: Record<uuid, Set<uuid>>;
  private readonly incoming_messages_by_priority_then_worker_id: Record<
    number,
    Record<uuid, Array<LeaderQueuedItem>>
  >;
  private is_stopped: boolean;
  private _is_leading: boolean;
  private max_wip_messages: number;
  private readonly stopper_deferred: Deferred<void>;

  constructor(channel_name: string) {
    const leader_channel_name = channel_name + "_leader";
    this.max_wip_messages = 1;
    this.is_stopped = false;
    this._is_leading = false;
    this.messages_under_processing = {};
    this.incoming_messages_by_priority_then_worker_id = {};
    this.queued_messages_by_priority = {};
    this.worker_ids = new Set<uuid>();
    this.broadcast_channel = new BroadcastChannel(channel_name);
    this.leader_channel = new BroadcastChannel(leader_channel_name);
    this.elector = createLeaderElection(this.broadcast_channel);
    this.stopper_deferred = new Deferred<void>();
    this.startup_thread = this.leadership_process();
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
      console.debug("God done message for: " + item_done_message_data.item_id);
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
      if (
        this.incoming_messages_by_priority_then_worker_id[
          add_item_message_data.priority
        ] == undefined
      ) {
        this.incoming_messages_by_priority_then_worker_id[
          add_item_message_data.priority
        ] = {};
      }
      if (
        this.incoming_messages_by_priority_then_worker_id[
          add_item_message_data.priority
        ][add_item_message_data.worker_id] == undefined
      ) {
        this.incoming_messages_by_priority_then_worker_id[
          add_item_message_data.priority
        ][add_item_message_data.worker_id] = new Array<LeaderQueuedItem>();
      }
      this.incoming_messages_by_priority_then_worker_id[
        add_item_message_data.priority
      ][add_item_message_data.worker_id].push(add_item_message_data);
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
  }

  private async leadership_process(): Promise<void> {
    await Promise.race([
      this.elector.awaitLeadership(),
      this.stopper_deferred.promise,
    ]);
    if (this.is_stopped) {
      return;
    }
    console.debug("Initializing leader");
    this._is_leading = true;
    this.broadcast_channel.onmessage = this.broadcast_message_callback.bind(
      this
    );
    await this.broadcast_channel.postMessage({
      message_type: MessageType.LEADER_CREATED,
      message_body: {},
    });
    await sleep(100); // Wait for workers to update leader with their tasks
    console.debug("Leader initialized");
  }

  public async set_max_concurrent_workers(n: number): Promise<void> {
    this.max_wip_messages = n;
    if (this._is_leading) {
      await this.pop_available_items();
    }
  }

  private gather_single_item(): boolean {
    const priorities: Array<number> = Object.keys(
      this.incoming_messages_by_priority_then_worker_id
    ).map((x) => Number(x));
    priorities.sort();
    for (const priority of priorities) {
      let poped_worker: undefined | uuid = undefined;
      for (const worker_id of Object.keys(
        this.incoming_messages_by_priority_then_worker_id[priority]
      )) {
        if (
          this.incoming_messages_by_priority_then_worker_id[priority][worker_id]
            .length == 0
        ) {
          delete this.incoming_messages_by_priority_then_worker_id[priority][
            worker_id
          ];
          continue;
        }
        if (poped_worker == undefined) {
          poped_worker = worker_id;
          continue;
        }
        if (
          this.incoming_messages_by_priority_then_worker_id[priority][
            worker_id
          ][0].date <
          this.incoming_messages_by_priority_then_worker_id[priority][
            poped_worker
          ][0].date
        ) {
          poped_worker = worker_id;
        }
      }
      if (poped_worker == undefined) {
        delete this.incoming_messages_by_priority_then_worker_id[priority];
        continue;
      }
      if (this.queued_messages_by_priority[priority] == undefined) {
        this.queued_messages_by_priority[
          priority
        ] = new Array<LeaderQueuedItem>();
      }
      // This is OK as we know this.incoming_messages[priority][poped_worker] is not empty
      this.queued_messages_by_priority[priority].push(
        this.incoming_messages_by_priority_then_worker_id[priority][
          poped_worker
        ].shift() as LeaderQueuedItem
      );
      return true;
    }
    return false;
  }

  private gather_incoming_messages_to_queue(): void {
    while (this.gather_single_item()) {
      // Blank on purpose
    }
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
    let num_wip_messages = this.count_wip_messages();
    const poped_callbacks: Array<Promise<void>> = new Array<Promise<void>>();
    while (num_wip_messages < this.max_wip_messages) {
      const current_priorities: Array<number> = Object.keys(
        this.queued_messages_by_priority
      ).map((x) => Number(x));
      if (current_priorities.length == 0) {
        // No messages to pop
        break;
      }
      current_priorities.sort();
      for (const priority of current_priorities) {
        if (this.queued_messages_by_priority[priority].length == 0) {
          delete this.queued_messages_by_priority[priority];
          continue;
        }
        // Safe as we know this.queued_messages[priority] is not empty
        const poped_item = this.queued_messages_by_priority[
          priority
        ].shift() as LeaderQueuedItem;
        if (!this.worker_ids.has(poped_item.worker_id)) {
          continue;
        }
        console.debug("Leader popping item with id: " + poped_item.item_id);
        this.messages_under_processing[poped_item.worker_id].add(
          poped_item.item_id
        );
        poped_callbacks.push(
          this.broadcast_channel.postMessage({
            message_type: MessageType.POP_ITEM_TO_WORKER,
            message_body: {
              worker_id: poped_item.worker_id,
              item_id: poped_item.item_id,
            },
          })
        );
        num_wip_messages++;
        break;
      }
    }
    for (const callback of poped_callbacks) {
      await callback;
    }
  }

  public is_leading(): boolean {
    return this._is_leading;
  }

  public async stop(): Promise<void> {
    this.is_stopped = true;
    this.stopper_deferred.resolve();
    await this.startup_thread;
    this._is_leading = false;
    await this.elector.die();
    const broadcast_channel_closing = this.broadcast_channel.close();
    const leader_channel_closing = this.leader_channel.close();
    // await this.thread;
    await broadcast_channel_closing;
    await leader_channel_closing;
    console.debug("Exited leader gracefully");
  }
}

export { LeaderProcess };
