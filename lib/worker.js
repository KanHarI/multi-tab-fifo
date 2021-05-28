"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Worker = void 0;
const tab_to_leader_interface_1 = require("./tab-to-leader-interface");
const uuid_1 = require("./uuid");
const broadcast_channel_1 = require("broadcast-channel");
const leader_process_1 = require("./leader-process");
class Worker {
    constructor(channel_name, callback) {
        this.callback = callback;
        this.broadcast_channel = new broadcast_channel_1.BroadcastChannel(channel_name);
        this.worker_id = uuid_1.generate_uuid();
        this.queued_items = {};
        this.processing_messages = {};
        this.is_stopped = false;
        this.leader_process = new leader_process_1.LeaderProcess(channel_name);
        this.broadcast_channel.onmessage = this.broadcast_message_callback.bind(this);
        this.registration_thread = this.register_worker_in_leader();
        if (globalThis.addEventListener != undefined) {
            globalThis.addEventListener("beforeunload", this.stop.bind(this));
        }
    }
    async process_item(item) {
        try {
            await this.callback(item.data);
        }
        finally {
            this.broadcast_channel.postMessage({
                message_type: tab_to_leader_interface_1.MessageType.ITEM_PROCESSING_DONE_FROM_WORKER,
                message_body: { worker_id: this.worker_id, item_id: item.item_id },
            });
        }
        console.log("Exited message processing gracefuly");
    }
    pop_item(ev) {
        console.log(ev);
        const pop_item_to_worker_message_body = ev.message_body;
        if (pop_item_to_worker_message_body.worker_id != this.worker_id) {
            return;
        }
        const poped_item = this.queued_items[pop_item_to_worker_message_body.item_id];
        delete this.queued_items[pop_item_to_worker_message_body.item_id];
        this.processing_messages[poped_item.item_id] = poped_item;
        this.process_item(poped_item);
    }
    async register_worker_in_leader() {
        await this.broadcast_channel.postMessage({
            message_type: tab_to_leader_interface_1.MessageType.REGISTER_WORKER,
            message_body: { worker_id: this.worker_id },
        });
        for (const item_id of Object.keys(this.queued_items)) {
            await this.broadcast_channel.postMessage({
                message_type: tab_to_leader_interface_1.MessageType.ADD_ITEM_FROM_WORKER,
                message_body: {
                    worker_id: this.worker_id,
                    item_id: item_id,
                    date: this.queued_items[item_id].date,
                },
            });
        }
        for (const item_id of Object.keys(this.processing_messages)) {
            await this.broadcast_channel.postMessage({
                message_type: tab_to_leader_interface_1.MessageType.INFORM_WIP_IN_WORKER,
                message_body: { worker_id: this.worker_id, item_id: item_id },
            });
        }
    }
    async broadcast_message_callback(ev) {
        await this.registration_thread; // Do not collide with registration
        switch (ev.message_type) {
            case tab_to_leader_interface_1.MessageType.ITEM_PROCESSING_DONE_FROM_WORKER:
            case tab_to_leader_interface_1.MessageType.REGISTER_WORKER:
            case tab_to_leader_interface_1.MessageType.UNREGISTER_WORKER:
            case tab_to_leader_interface_1.MessageType.ADD_ITEM_FROM_WORKER:
            case tab_to_leader_interface_1.MessageType.INFORM_WIP_IN_WORKER:
                break;
            case tab_to_leader_interface_1.MessageType.LEADER_CREATED:
                this.registration_thread = this.register_worker_in_leader();
                break;
            case tab_to_leader_interface_1.MessageType.POP_ITEM_TO_WORKER:
                this.pop_item(ev);
                break;
        }
    }
    async set_max_concurrent_workers(n) {
        if (this.is_stopped) {
            return;
        }
        await this.registration_thread; // Do not collide with registration
        await this.leader_process.set_max_concurrent_workers(n);
    }
    async push_message(data) {
        if (this.is_stopped) {
            return;
        }
        await this.registration_thread; // Do not collide with registration
        console.log("Prepushing message with data " + data);
        const queued_item = {
            item_id: uuid_1.generate_uuid(),
            date: Date.now(),
            data: data,
        };
        this.queued_items[queued_item.item_id] = queued_item;
        this.broadcast_channel.postMessage({
            message_type: tab_to_leader_interface_1.MessageType.ADD_ITEM_FROM_WORKER,
            message_body: {
                worker_id: this.worker_id,
                item_id: queued_item.item_id,
                date: queued_item.date,
            },
        });
    }
    async stop() {
        if (this.is_stopped) {
            return;
        }
        this.is_stopped = true;
        await this.broadcast_channel.postMessage({
            message_type: tab_to_leader_interface_1.MessageType.UNREGISTER_WORKER,
            message_body: { worker_id: this.worker_id },
        });
        const broadcast_channel_stop = this.broadcast_channel.close();
        const leader_process_stop = this.leader_process.stop();
        await this.registration_thread;
        await broadcast_channel_stop;
        await leader_process_stop;
        console.log("Exited worker gracefully");
    }
}
exports.Worker = Worker;
