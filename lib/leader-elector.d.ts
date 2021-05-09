declare enum MessageType {
    IsLeading = 0,
    LookingForLeader = 1
}
interface MessageData {
    type: MessageType;
    sender_uuid: string;
}
interface Message {
    data: MessageData;
}
declare class LeaderElector {
    #private;
    constructor(base_channel_name: string);
    broadcast_message(msg: MessageData): void;
    message_callback(message: Message): void;
    leader_process(): Promise<void>;
}
export { LeaderElector };
