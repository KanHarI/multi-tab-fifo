import { uuidv4 } from "./uuid";
import { BroadcastChannel } from "broadcast-channel";

class LeaderProcess {
  #broadcast_channel: BroadcastChannel;
  #uuid: string;

  constructor(channel_name: string) {
    this.#broadcast_channel = new BroadcastChannel(channel_name);
    this.#uuid = uuidv4();
  }
}

export { LeaderProcess };
