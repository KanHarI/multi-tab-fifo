"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var _broadcast_channel, _uuid;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderProcess = void 0;
const uuid_1 = require("./uuid");
const broadcast_channel_1 = require("broadcast-channel");
class LeaderProcess {
    constructor(channel_name) {
        _broadcast_channel.set(this, void 0);
        _uuid.set(this, void 0);
        __classPrivateFieldSet(this, _broadcast_channel, new broadcast_channel_1.BroadcastChannel(channel_name));
        __classPrivateFieldSet(this, _uuid, uuid_1.uuidv4());
    }
}
exports.LeaderProcess = LeaderProcess;
_broadcast_channel = new WeakMap(), _uuid = new WeakMap();
