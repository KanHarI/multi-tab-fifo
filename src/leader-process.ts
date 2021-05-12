import { BroadcastChannel, createLeaderElection } from "broadcast-channel";
import type { Message, TabToLeaderInterface } from "./tab-to-leader-interface";
import {
  TICKS_TO_DELETE_DEAD_ID,
  TICK_TIME_MS,
  get_wip_message_count,
  purge_id,
} from "./tab-to-leader-interface";
import type { LeaderElector } from "broadcast-channel";
import { get_local_storage } from "./get-local-storage";
import { sleep } from "./sleep";
import type { uuid } from "./uuid";

class LeaderProcess<T> {
  // https://www.amitmerchant.com/typescript-private-modifier-vs-ecmascript-hash-private-fields/
  private readonly broadcast_channel: BroadcastChannel;
  private readonly channel_name: string;
  private readonly elector: LeaderElector;
  private readonly unknown_ids: Record<uuid, number>;
  private max_wip_messages: number;
  private is_stopped: boolean;
  private readonly thread: Promise<void>;

  constructor(channel_name: string) {
    this.channel_name = channel_name;
    this.unknown_ids = {};
    this.max_wip_messages = 1;
    this.is_stopped = false;
    this.broadcast_channel = new BroadcastChannel(channel_name);
    this.elector = createLeaderElection(this.broadcast_channel);
    this.thread = this.leadership_process();
  }

  private gather_known_ids_and_purge_expired(
    leader_store_object: TabToLeaderInterface<T>
  ): Record<uuid, boolean> {
    const known_ids: Record<uuid, boolean> = {};
    for (const id of Object.keys(this.unknown_ids)) {
      this.unknown_ids[id]++;
    }
    const current_time = Date.now();
    for (const id of Object.keys(leader_store_object.heartbeat)) {
      if (
        leader_store_object.heartbeat[id] <
        current_time - TICKS_TO_DELETE_DEAD_ID * TICK_TIME_MS
      ) {
        purge_id(leader_store_object, id);
        delete known_ids[id];
        delete this.unknown_ids[id];
      } else {
        known_ids[id] = true;
        delete this.unknown_ids[id];
      }
    }
    return known_ids;
  }

  private gather_messages_to_shared_queue(
    leader_store_object: TabToLeaderInterface<T>,
    known_ids: Record<string, boolean>
  ): void {
    for (const id of Object.keys(leader_store_object.incoming_messages)) {
      if (known_ids[id] == undefined) {
        if (this.unknown_ids[id] == undefined) {
          this.unknown_ids[id] = 0;
        }
      } else {
        const incomming_message_queue: Array<Message<T>> =
          leader_store_object.incoming_messages[id];
        let message: Message<T> | undefined;
        while ((message = incomming_message_queue.shift()) != undefined) {
          console.log("Leader got message with data " + message.data);
          leader_store_object.message_queue.push({
            worker_id: id,
            message: message,
          });
        }
      }
    }
  }

  private pop_messages_from_shared_queue(
    leader_store_object: TabToLeaderInterface<T>,
    known_ids: Record<string, boolean>
  ): void {
    let num_messages = get_wip_message_count(leader_store_object);
    while (num_messages++ < this.max_wip_messages) {
      const poped_queued_message = leader_store_object.message_queue.shift();
      if (poped_queued_message == undefined) {
        break;
      }
      if (known_ids[poped_queued_message.worker_id] == undefined) {
        if (this.unknown_ids[poped_queued_message.worker_id] == undefined) {
          this.unknown_ids[poped_queued_message.worker_id] = 0;
        }
      }
      console.log(
        "Leader poped message with data " + poped_queued_message.message.data
      );
      leader_store_object.ready_messages[poped_queued_message.worker_id].push(
        poped_queued_message.message
      );
    }
  }

  private purge_unknown_ids(leader_store_object: TabToLeaderInterface<T>) {
    for (const id of Object.keys(this.unknown_ids)) {
      if (this.unknown_ids[id] > TICKS_TO_DELETE_DEAD_ID) {
        purge_id(leader_store_object, id);
        delete this.unknown_ids[id];
      }
    }
  }

  private async leadership_process(): Promise<void> {
    await this.elector.awaitLeadership();
    console.log("Initializing leader");
    const leader_store_object: TabToLeaderInterface<T> = {
      is_init: true,
      heartbeat: {},
      incoming_messages: {},
      message_queue: [],
      ready_messages: {},
      in_process_messages: {},
    };
    const shared_object = get_local_storage();
    shared_object[this.channel_name] = leader_store_object;
    await sleep(TICK_TIME_MS * 2); // Wait for existing workers to update info
    console.log("Leader initialized");
    while (!this.is_stopped) {
      const known_ids: Record<
        uuid,
        boolean
      > = this.gather_known_ids_and_purge_expired(leader_store_object);
      this.gather_messages_to_shared_queue(leader_store_object, known_ids);
      this.pop_messages_from_shared_queue(leader_store_object, known_ids);
      this.purge_unknown_ids(leader_store_object);
      await sleep(TICK_TIME_MS);
    }
    await this.elector.die();
  }

  public set_max_concurrent_workers(n: number): void {
    this.max_wip_messages = n;
  }

  public async stop(): Promise<void> {
    this.is_stopped = true;
    await this.thread;
    await this.broadcast_channel.close();
    console.log("Exited leader gracefully");
  }
}

export { LeaderProcess };
