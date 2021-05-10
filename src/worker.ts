import type { Message, TabToLeaderInterface } from "./tab-to-leader-interface";
import { TICK_TIME_MS, purge_id } from "./tab-to-leader-interface";
import { LeaderProcess } from "./leader-process";
import { generate_uuid } from "./uuid";
import { get_local_storage } from "./get-local-storage";
import { sleep } from "./sleep";
import type { uuid } from "./uuid";

class Worker<T> {
  private readonly channel_name: string;
  private readonly id: uuid;
  private readonly leader_process: LeaderProcess<T>;
  private readonly callback: (arg: T) => Promise<void>;
  private readonly unpushed_messages: Array<Message<T>>;
  private is_stopped: boolean;
  private readonly thread: Promise<void>;

  constructor(channel_name: string, callback: (arg: T) => Promise<void>) {
    this.callback = callback;
    this.channel_name = channel_name;
    this.id = generate_uuid();
    this.unpushed_messages = [];
    this.is_stopped = false;
    this.leader_process = new LeaderProcess<T>(channel_name);
    this.thread = this.worker_process();
  }

  private async process_message(message: Message<T>) {
    const storageObject = get_local_storage();
    let leader_object: TabToLeaderInterface<T> =
      storageObject[this.channel_name];
    leader_object.in_process_messages[this.id].push(message);
    try {
      await this.callback(message.data);
    } finally {
      leader_object = storageObject[this.channel_name];
      leader_object.in_process_messages[
        this.id
      ] = leader_object.in_process_messages[this.id].filter(
        (queued_message: Message<T>) =>
          queued_message.message_id != message.message_id
      );
    }
    console.log("Exited message processing gracefuly");
  }

  private async worker_process(): Promise<void> {
    const storageObject = get_local_storage();
    while (!this.is_stopped) {
      const leader_inerface: TabToLeaderInterface<T> | undefined =
        storageObject[this.channel_name];
      if (leader_inerface != undefined && leader_inerface.is_init) {
        if (leader_inerface.heartbeat[this.id] == undefined) {
          console.log("Initializing worker info");
          leader_inerface.incoming_messages[this.id] = [];
          leader_inerface.ready_messages[this.id] = [];
          leader_inerface.in_process_messages[this.id] = [];
        }
        leader_inerface.heartbeat[this.id] = Date.now();
        let message: Message<T> | undefined = undefined;
        while ((message = this.unpushed_messages.shift()) != undefined) {
          console.log("Pushed message with data " + message.data);
          leader_inerface.incoming_messages[this.id].push(message);
        }
        while (
          (message = leader_inerface.ready_messages[this.id].shift()) !=
          undefined
        ) {
          console.log("Processing message with data " + message.data);
          this.process_message(message);
        }
      }
      await sleep(TICK_TIME_MS);
    }
  }

  public set_max_concurrent_workers(n: number): void {
    this.leader_process.set_max_concurrent_workers(n);
  }

  public push_message(data: T): void {
    console.log("Prepushing message with data " + data);
    const message: Message<T> = { message_id: generate_uuid(), data: data };
    this.unpushed_messages.push(message);
  }

  public async stop(): Promise<void> {
    this.is_stopped = true;
    await this.leader_process.stop();
    await this.thread;
    const storageObject = get_local_storage();
    const leader_inerface: TabToLeaderInterface<T> | undefined =
      storageObject[this.channel_name];
    if (leader_inerface != undefined) {
      purge_id(leader_inerface, this.id);
    }
    console.log("Exited worker gracefully");
  }
}

export { Worker };
