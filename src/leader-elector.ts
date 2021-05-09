import { uuidv4 } from "./uuid";

class LeaderElector {
  #channel: BroadcastChannel;
  #is_leader: boolean;
  #uuid: string;

  constructor(base_channel_name: string) {
    const leader_channel_name = base_channel_name + "_leader";
    this.#channel = new BroadcastChannel(leader_channel_name);
    this.#is_leader = false;
    this.#uuid = uuidv4();
  }
}

export { LeaderElector };
