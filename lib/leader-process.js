"use strict";
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
var _broadcast_channel, _channel_name, _elector, _unknown_ids, _max_wip_messages;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderProcess = void 0;
const broadcast_channel_1 = require("broadcast-channel");
const get_local_storage_1 = require("./get-local-storage");
const tab_to_leader_interface_1 = require("./tab-to-leader-interface");
class LeaderProcess {
    constructor(channel_name) {
        // https://www.amitmerchant.com/typescript-private-modifier-vs-ecmascript-hash-private-fields/
        _broadcast_channel.set(this, void 0);
        _channel_name.set(this, void 0);
        _elector.set(this, void 0);
        _unknown_ids.set(this, void 0);
        _max_wip_messages.set(this, void 0);
        __classPrivateFieldSet(this, _channel_name, channel_name);
        __classPrivateFieldSet(this, _broadcast_channel, new broadcast_channel_1.BroadcastChannel(channel_name + "_leader"));
        __classPrivateFieldSet(this, _unknown_ids, {});
        __classPrivateFieldSet(this, _max_wip_messages, 1);
        __classPrivateFieldSet(this, _elector, broadcast_channel_1.createLeaderElection(__classPrivateFieldGet(this, _broadcast_channel)));
        this.leadership_process();
    }
    gather_known_ids_and_purge_expired(leader_store_object) {
        const known_ids = {};
        for (const id in Object.keys(__classPrivateFieldGet(this, _unknown_ids))) {
            __classPrivateFieldGet(this, _unknown_ids)[id]++;
        }
        const current_time = Date.now();
        for (const id in Object.keys(leader_store_object.heartbeat)) {
            if (leader_store_object.heartbeat[id] <
                current_time + tab_to_leader_interface_1.TICKS_TO_DELETE_DEAD_ID * tab_to_leader_interface_1.TICK_TIME_MS) {
                tab_to_leader_interface_1.purge_id(leader_store_object, id);
                delete known_ids[id];
                delete __classPrivateFieldGet(this, _unknown_ids)[id];
            }
            else {
                known_ids[id] = true;
                delete __classPrivateFieldGet(this, _unknown_ids)[id];
            }
        }
        return known_ids;
    }
    gather_messages_to_shared_queue(leader_store_object, known_ids) {
        for (const id in Object.keys(leader_store_object.incoming_messages)) {
            if (known_ids[id] == undefined) {
                if (__classPrivateFieldGet(this, _unknown_ids)[id] == undefined) {
                    __classPrivateFieldGet(this, _unknown_ids)[id] = 0;
                }
            }
            else {
                const incomming_message_queue = leader_store_object.incoming_messages[id];
                let message;
                while ((message = incomming_message_queue.shift()) != undefined) {
                    leader_store_object.message_queue.push({
                        sender_uuid: id,
                        message: message,
                    });
                }
            }
        }
    }
    pop_messages_from_shared_queue(leader_store_object, known_ids) {
        let num_messages = tab_to_leader_interface_1.get_wip_message_count(leader_store_object);
        while (num_messages++ < __classPrivateFieldGet(this, _max_wip_messages)) {
            const poped_queued_message = leader_store_object.message_queue.shift();
            if (poped_queued_message == undefined) {
                break;
            }
            if (known_ids[poped_queued_message.sender_uuid] == undefined) {
                if (__classPrivateFieldGet(this, _unknown_ids)[poped_queued_message.sender_uuid] == undefined) {
                    __classPrivateFieldGet(this, _unknown_ids)[poped_queued_message.sender_uuid] = 0;
                }
            }
            leader_store_object.ready_messages[poped_queued_message.sender_uuid].push(poped_queued_message.message);
        }
    }
    purge_unknown_ids(leader_store_object) {
        for (const id in Object.keys(__classPrivateFieldGet(this, _unknown_ids))) {
            if (__classPrivateFieldGet(this, _unknown_ids)[id] > tab_to_leader_interface_1.TICKS_TO_DELETE_DEAD_ID) {
                tab_to_leader_interface_1.purge_id(leader_store_object, id);
                delete __classPrivateFieldGet(this, _unknown_ids)[id];
            }
        }
    }
    async leadership_process() {
        await __classPrivateFieldGet(this, _elector).awaitLeadership();
        const leader_store_object = {
            is_init: true,
            heartbeat: {},
            incoming_messages: {},
            message_queue: [],
            ready_messages: {},
            in_process_messages: {},
        };
        get_local_storage_1.storageObject[__classPrivateFieldGet(this, _channel_name)] = leader_store_object;
        while (true) {
            const known_ids = this.gather_known_ids_and_purge_expired(leader_store_object);
            this.gather_messages_to_shared_queue(leader_store_object, known_ids);
            this.pop_messages_from_shared_queue(leader_store_object, known_ids);
        }
    }
}
exports.LeaderProcess = LeaderProcess;
_broadcast_channel = new WeakMap(), _channel_name = new WeakMap(), _elector = new WeakMap(), _unknown_ids = new WeakMap(), _max_wip_messages = new WeakMap();
