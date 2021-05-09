"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var _channel, _is_leader, _uuid;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderElector = void 0;
const uuid_1 = require("./uuid");
class LeaderElector {
    constructor(base_channel_name) {
        _channel.set(this, void 0);
        _is_leader.set(this, void 0);
        _uuid.set(this, void 0);
        const leader_channel_name = base_channel_name + "_leader";
        __classPrivateFieldSet(this, _channel, new BroadcastChannel(leader_channel_name));
        __classPrivateFieldSet(this, _is_leader, false);
        __classPrivateFieldSet(this, _uuid, uuid_1.uuidv4());
    }
}
exports.LeaderElector = LeaderElector;
_channel = new WeakMap(), _is_leader = new WeakMap(), _uuid = new WeakMap();
