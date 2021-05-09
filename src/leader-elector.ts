import { uuidv4 } from "./uuid";

enum MessageType {
  IsLeading,
  LookingForLeader,
}

interface MessageData {
  type: MessageType;
  sender_uuid: string;
}

interface Message {
  data: MessageData;
}

class LeaderElector {
  #channel: BroadcastChannel;
  #is_leader: boolean;
  #uuid: string;

  constructor(base_channel_name: string) {
    const leader_channel_name = base_channel_name + "_leader";
    this.#channel = new BroadcastChannel(leader_channel_name);
    this.#is_leader = false;
    this.#uuid = uuidv4();
    this.#channel.addEventListener("message", this.message_callback);
    this.leader_process();
  }

  broadcast_message(msg: MessageData): void {
    this.#channel.postMessage(msg);
  }

  message_callback(message: Message): void {
    const type = message.data.type;
    switch (type) {
      case MessageType.IsLeading:
        this.#is_leader = false;
        break;
      case MessageType.LookingForLeader:
        if (this.#is_leader) {
          this.broadcast_message({
            type: MessageType.IsLeading,
            sender_uuid: this.#uuid,
          });
        }
    }
  }

  async leader_process(): Promise<void> {
    while (true) {
      if (!this.#is_leader) {
        this.broadcast_message({
          type: MessageType.LookingForLeader,
          sender_uuid: this.#uuid,
        });
      }
    }
  }
}

export { LeaderElector };
