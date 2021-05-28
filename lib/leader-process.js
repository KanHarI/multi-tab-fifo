"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderProcess = void 0;
const tab_to_leader_interface_1 = require("./tab-to-leader-interface");
const broadcast_channel_1 = require("broadcast-channel");
class LeaderProcess {
    constructor(channel_name) {
        const leader_channel_name = channel_name + "_leader";
        this.max_wip_messages = 1;
        this.is_stopped = false;
        this.messages_under_processing = {};
        this.incoming_messages = {};
        this.queued_messages = new Array();
        this.worker_ids = new Set();
        this.broadcast_channel = new broadcast_channel_1.BroadcastChannel(channel_name);
        this.leader_channel = new broadcast_channel_1.BroadcastChannel(leader_channel_name);
        this.elector = broadcast_channel_1.createLeaderElection(this.broadcast_channel);
        this.thread = this.leadership_process();
    }
    async broadcast_message_callback(ev) {
        if (this.is_stopped) {
            return;
        }
        switch (ev.message_type) {
            case tab_to_leader_interface_1.MessageType.LEADER_CREATED:
                console.error("Leader collision detected!");
                break;
            case tab_to_leader_interface_1.MessageType.REGISTER_WORKER:
                this.register_worker(ev);
                break;
            case tab_to_leader_interface_1.MessageType.UNREGISTER_WORKER:
                await this.unregister_worker(ev);
                break;
            case tab_to_leader_interface_1.MessageType.ADD_ITEM_FROM_WORKER:
                await this.add_item_from_worker(ev);
                break;
            case tab_to_leader_interface_1.MessageType.ITEM_PROCESSING_DONE_FROM_WORKER:
                await this.item_processing_done(ev);
                break;
            case tab_to_leader_interface_1.MessageType.POP_ITEM_TO_WORKER:
                console.error("Leader collision detected!");
                break;
        }
    }
    async item_processing_done(ev) {
        const item_done_message_data = ev.message_body;
        if (this.worker_ids.has(item_done_message_data.worker_id)) {
            this.messages_under_processing[item_done_message_data.worker_id].delete(item_done_message_data.item_id);
            await this.pop_available_items();
        }
        else {
            console.error("Unknown worker detected");
        }
    }
    async add_item_from_worker(ev) {
        const add_item_message_data = ev.message_body;
        if (this.worker_ids.has(add_item_message_data.worker_id)) {
            this.incoming_messages[add_item_message_data.worker_id].push(add_item_message_data);
            await this.pop_available_items();
        }
        else {
            console.error("Unknown worker detected");
        }
    }
    async unregister_worker(ev) {
        const unregister_worker_message_body = ev.message_body;
        if (this.worker_ids.has(unregister_worker_message_body.worker_id)) {
            this.worker_ids.delete(unregister_worker_message_body.worker_id);
            delete this.messages_under_processing[unregister_worker_message_body.worker_id];
            delete this.incoming_messages[unregister_worker_message_body.worker_id];
            await this.pop_available_items();
        }
        else {
            console.error("Unknown worker detected");
        }
    }
    register_worker(ev) {
        const register_worker_message_data = ev.message_body;
        this.worker_ids.add(register_worker_message_data.worker_id);
        this.messages_under_processing[register_worker_message_data.worker_id] = new Set();
        this.incoming_messages[register_worker_message_data.worker_id] = new Array();
    }
    async leadership_process() {
        await this.elector.awaitLeadership();
        console.log("Initializing leader");
        this.broadcast_channel.onmessage = this.broadcast_message_callback.bind(this);
        if (this.is_stopped) {
            return;
        }
        await this.broadcast_channel.postMessage({
            message_type: tab_to_leader_interface_1.MessageType.LEADER_CREATED,
            message_body: {},
        });
        console.log("Leader initialized");
    }
    async set_max_concurrent_workers(n) {
        this.max_wip_messages = n;
        await this.pop_available_items();
    }
    gather_incoming_messages_to_queue() {
        let selected_worker = null;
        do {
            selected_worker = null;
            for (const worker_id of Object.keys(this.incoming_messages)) {
                if (this.incoming_messages[worker_id].length == 0) {
                    continue;
                }
                if (selected_worker == null) {
                    selected_worker = worker_id;
                    continue;
                }
                if (this.incoming_messages[worker_id][0].date <
                    this.incoming_messages[selected_worker][0].date) {
                    selected_worker = worker_id;
                }
            }
            if (selected_worker != null) {
                // This is safe as we know this.incoming_messages[selected_worker] is not empty
                this.queued_messages.push(this.incoming_messages[selected_worker].shift());
            }
        } while (selected_worker != null);
    }
    count_wip_messages() {
        let num_wip_messages = 0;
        for (const worker_id of Object.keys(this.messages_under_processing)) {
            num_wip_messages += this.messages_under_processing[worker_id].size;
        }
        return num_wip_messages;
    }
    async pop_available_items() {
        this.gather_incoming_messages_to_queue();
        const num_wip_messages = this.count_wip_messages();
        while (num_wip_messages < this.max_wip_messages) {
            const poped_item = this.queued_messages.shift();
            if (poped_item == undefined) {
                break;
            }
            if (!this.worker_ids.has(poped_item.worker_id)) {
                continue;
            }
            this.messages_under_processing[poped_item.worker_id].add(poped_item.item_id);
            console.log(poped_item);
            await this.broadcast_channel.postMessage({
                message_type: tab_to_leader_interface_1.MessageType.POP_ITEM_TO_WORKER,
                message_body: {
                    worker_id: poped_item.worker_id,
                    item_id: poped_item.item_id,
                },
            });
        }
    }
    async stop() {
        this.is_stopped = true;
        const leader_dying = this.elector.die();
        const broadcast_channel_closing = this.broadcast_channel.close();
        await leader_dying;
        const leader_channel_closing = this.leader_channel.close();
        // await this.thread;
        await broadcast_channel_closing;
        await leader_channel_closing;
        console.log("Exited leader gracefully");
    }
}
exports.LeaderProcess = LeaderProcess;
