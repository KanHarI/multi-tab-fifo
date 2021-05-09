"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _channel, _is_leader, _uuid;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderElector = void 0;
const uuid_1 = require("./uuid");
var MessageType;
(function (MessageType) {
    MessageType[MessageType["IsLeading"] = 0] = "IsLeading";
    MessageType[MessageType["LookingForLeader"] = 1] = "LookingForLeader";
})(MessageType || (MessageType = {}));
class LeaderElector {
    constructor(base_channel_name) {
        _channel.set(this, void 0);
        _is_leader.set(this, void 0);
        _uuid.set(this, void 0);
        const leader_channel_name = base_channel_name + "_leader";
        __classPrivateFieldSet(this, _channel, new BroadcastChannel(leader_channel_name));
        __classPrivateFieldSet(this, _is_leader, false);
        __classPrivateFieldSet(this, _uuid, uuid_1.uuidv4());
        __classPrivateFieldGet(this, _channel).addEventListener("message", this.message_callback);
        this.leader_process();
    }
    broadcast_message(msg) {
        __classPrivateFieldGet(this, _channel).postMessage(msg);
    }
    message_callback(message) {
        const type = message.data.type;
        switch (type) {
            case MessageType.IsLeading:
                __classPrivateFieldSet(this, _is_leader, false);
                break;
            case MessageType.LookingForLeader:
                if (__classPrivateFieldGet(this, _is_leader)) {
                    this.broadcast_message({
                        type: MessageType.IsLeading,
                        sender_uuid: __classPrivateFieldGet(this, _uuid),
                    });
                }
        }
    }
    leader_process() {
        return __awaiter(this, void 0, void 0, function* () {
            while (true) {
                if (!__classPrivateFieldGet(this, _is_leader)) {
                    this.broadcast_message({
                        type: MessageType.LookingForLeader,
                        sender_uuid: __classPrivateFieldGet(this, _uuid),
                    });
                }
            }
        });
    }
}
exports.LeaderElector = LeaderElector;
_channel = new WeakMap(), _is_leader = new WeakMap(), _uuid = new WeakMap();
