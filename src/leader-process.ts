import type { LeaderElector } from "broadcast-channel";
import { BroadcastChannel, createLeaderElection } from "broadcast-channel";
import { storageObject } from "./get-local-storage";
import type { Message, TabToLeaderInterface } from "./tab-to-leader-interface";
import {
  get_wip_message_count,
  purge_id,
  TICK_TIME_MS,
  TICKS_TO_DELETE_DEAD_ID,
} from "./tab-to-leader-interface";
import type { uuid } from "./uuid";

class LeaderProcess<T> {
  // https://www.amitmerchant.com/typescript-private-modifier-vs-ecmascript-hash-private-fields/
  readonly #broadcast_channel: BroadcastChannel;
  readonly #channel_name: string;
  readonly #elector: LeaderElector;
  readonly #unknown_ids: Record<uuid, number>;
  #max_wip_messages: number;

  constructor(channel_name: string) {
    this.#channel_name = channel_name;
    this.#broadcast_channel = new BroadcastChannel(channel_name + "_leader");
    this.#unknown_ids = {};
    this.#max_wip_messages = 1;
    this.#elector = createLeaderElection(this.#broadcast_channel);
    this.leadership_process();
  }

  private gather_known_ids_and_purge_expired(
    leader_store_object: TabToLeaderInterface<T>
  ): Record<uuid, boolean> {
    const known_ids: Record<uuid, boolean> = {};
    for (const id in Object.keys(this.#unknown_ids)) {
      this.#unknown_ids[id]++;
    }
    const current_time = Date.now();
    for (const id in Object.keys(leader_store_object.heartbeat)) {
      if (
        leader_store_object.heartbeat[id] <
        current_time + TICKS_TO_DELETE_DEAD_ID * TICK_TIME_MS
      ) {
        purge_id(leader_store_object, id);
        delete known_ids[id];
        delete this.#unknown_ids[id];
      } else {
        known_ids[id] = true;
        delete this.#unknown_ids[id];
      }
    }
    return known_ids;
  }

  private gather_messages_to_shared_queue(
    leader_store_object: TabToLeaderInterface<T>,
    known_ids: Record<string, boolean>
  ): void {
    for (const id in Object.keys(leader_store_object.incoming_messages)) {
      if (known_ids[id] == undefined) {
        if (this.#unknown_ids[id] == undefined) {
          this.#unknown_ids[id] = 0;
        }
      } else {
        const incomming_message_queue: Array<Message<T>> =
          leader_store_object.incoming_messages[id];
        let message: Message<T> | undefined;
        while ((message = incomming_message_queue.shift()) != undefined) {
          leader_store_object.message_queue.push({
            sender_uuid: id,
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
    while (num_messages++ < this.#max_wip_messages) {
      const poped_queued_message = leader_store_object.message_queue.shift();
      if (poped_queued_message == undefined) {
        break;
      }
      if (known_ids[poped_queued_message.sender_uuid] == undefined) {
        if (this.#unknown_ids[poped_queued_message.sender_uuid] == undefined) {
          this.#unknown_ids[poped_queued_message.sender_uuid] = 0;
        }
      }
      leader_store_object.ready_messages[poped_queued_message.sender_uuid].push(
        poped_queued_message.message
      );
    }
  }

  private purge_unknown_ids(leader_store_object: TabToLeaderInterface<T>) {
    for (const id in Object.keys(this.#unknown_ids)) {
      if (this.#unknown_ids[id] > TICKS_TO_DELETE_DEAD_ID) {
        purge_id(leader_store_object, id);
        delete this.#unknown_ids[id];
      }
    }
  }

  private async leadership_process(): Promise<never> {
    await this.#elector.awaitLeadership();
    const leader_store_object: TabToLeaderInterface<T> = {
      is_init: true,
      heartbeat: {},
      incoming_messages: {},
      message_queue: [],
      ready_messages: {},
      in_process_messages: {},
    };
    storageObject[this.#channel_name] = leader_store_object;
    while (true) {
      const known_ids: Record<
        uuid,
        boolean
      > = this.gather_known_ids_and_purge_expired(leader_store_object);
      this.gather_messages_to_shared_queue(leader_store_object, known_ids);
      this.pop_messages_from_shared_queue(leader_store_object, known_ids);
    }
  }
}

export { LeaderProcess };
