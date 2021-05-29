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
        this.is_leading = false;
        this.messages_under_processing = {};
        this.incoming_messages_by_priority_then_worker_id = {};
        this.queued_messages_by_priority = {};
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
            if (this.incoming_messages_by_priority_then_worker_id[add_item_message_data.priority] == undefined) {
                this.incoming_messages_by_priority_then_worker_id[add_item_message_data.priority] = {};
            }
            if (this.incoming_messages_by_priority_then_worker_id[add_item_message_data.priority][add_item_message_data.worker_id] == undefined) {
                this.incoming_messages_by_priority_then_worker_id[add_item_message_data.priority][add_item_message_data.worker_id] = new Array();
            }
            this.incoming_messages_by_priority_then_worker_id[add_item_message_data.priority][add_item_message_data.worker_id].push(add_item_message_data);
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
    }
    async leadership_process() {
        await this.elector.awaitLeadership();
        console.debug("Initializing leader");
        this.is_leading = true;
        this.broadcast_channel.onmessage = this.broadcast_message_callback.bind(this);
        if (this.is_stopped) {
            return;
        }
        await this.broadcast_channel.postMessage({
            message_type: tab_to_leader_interface_1.MessageType.LEADER_CREATED,
            message_body: {},
        });
        console.debug("Leader initialized");
    }
    async set_max_concurrent_workers(n) {
        this.max_wip_messages = n;
        if (this.is_leading) {
            await this.pop_available_items();
        }
    }
    gather_single_item() {
        const priorities = Object.keys(this.incoming_messages_by_priority_then_worker_id).map((x) => Number(x));
        priorities.sort();
        for (const priority of priorities) {
            let poped_worker = undefined;
            for (const worker_id of Object.keys(this.incoming_messages_by_priority_then_worker_id[priority])) {
                if (this.incoming_messages_by_priority_then_worker_id[priority][worker_id]
                    .length == 0) {
                    delete this.incoming_messages_by_priority_then_worker_id[priority][worker_id];
                    continue;
                }
                if (poped_worker == undefined) {
                    poped_worker = worker_id;
                    continue;
                }
                if (this.incoming_messages_by_priority_then_worker_id[priority][worker_id][0].date <
                    this.incoming_messages_by_priority_then_worker_id[priority][poped_worker][0].date) {
                    poped_worker = worker_id;
                }
            }
            if (poped_worker == undefined) {
                delete this.incoming_messages_by_priority_then_worker_id[priority];
                continue;
            }
            if (this.queued_messages_by_priority[priority] == undefined) {
                this.queued_messages_by_priority[priority] = new Array();
            }
            // This is OK as we know this.incoming_messages[priority][poped_worker] is not empty
            this.queued_messages_by_priority[priority].push(this.incoming_messages_by_priority_then_worker_id[priority][poped_worker].shift());
            return true;
        }
        return false;
    }
    gather_incoming_messages_to_queue() {
        while (this.gather_single_item()) {
            // Blank on purpose
        }
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
        let num_wip_messages = this.count_wip_messages();
        const poped_callbacks = new Array();
        while (num_wip_messages < this.max_wip_messages) {
            const current_priorities = Object.keys(this.queued_messages_by_priority).map((x) => Number(x));
            if (current_priorities.length == 0) {
                // No messages to pop
                break;
            }
            current_priorities.sort();
            for (const priority of current_priorities) {
                if (this.queued_messages_by_priority[priority].length == 0) {
                    delete this.queued_messages_by_priority[priority];
                    continue;
                }
                // Safe as we know this.queued_messages[priority] is not empty
                const poped_item = this.queued_messages_by_priority[priority].shift();
                if (!this.worker_ids.has(poped_item.worker_id)) {
                    continue;
                }
                console.debug("Leader popping item with id: " + poped_item.item_id);
                this.messages_under_processing[poped_item.worker_id].add(poped_item.item_id);
                poped_callbacks.push(this.broadcast_channel.postMessage({
                    message_type: tab_to_leader_interface_1.MessageType.POP_ITEM_TO_WORKER,
                    message_body: {
                        worker_id: poped_item.worker_id,
                        item_id: poped_item.item_id,
                    },
                }));
                num_wip_messages++;
            }
        }
        for (const callback of poped_callbacks) {
            await callback;
        }
    }
    async stop() {
        this.is_stopped = true;
        this.is_leading = false;
        const leader_dying = this.elector.die();
        const broadcast_channel_closing = this.broadcast_channel.close();
        await leader_dying;
        const leader_channel_closing = this.leader_channel.close();
        // await this.thread;
        await broadcast_channel_closing;
        await leader_channel_closing;
        console.debug("Exited leader gracefully");
    }
}
exports.LeaderProcess = LeaderProcess;
