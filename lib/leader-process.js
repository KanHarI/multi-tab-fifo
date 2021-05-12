"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderProcess = void 0;
const broadcast_channel_1 = require("broadcast-channel");
const tab_to_leader_interface_1 = require("./tab-to-leader-interface");
const get_local_storage_1 = require("./get-local-storage");
const sleep_1 = require("./sleep");
class LeaderProcess {
    constructor(channel_name) {
        this.channel_name = channel_name;
        this.unknown_ids = {};
        this.max_wip_messages = 1;
        this.is_stopped = false;
        this.broadcast_channel = new broadcast_channel_1.BroadcastChannel(channel_name);
        this.elector = broadcast_channel_1.createLeaderElection(this.broadcast_channel);
        this.thread = this.leadership_process();
    }
    gather_known_ids_and_purge_expired(leader_store_object) {
        const known_ids = {};
        for (const id of Object.keys(this.unknown_ids)) {
            this.unknown_ids[id]++;
        }
        const current_time = Date.now();
        for (const id of Object.keys(leader_store_object.heartbeat)) {
            if (leader_store_object.heartbeat[id] <
                current_time - tab_to_leader_interface_1.TICKS_TO_DELETE_DEAD_ID * tab_to_leader_interface_1.TICK_TIME_MS) {
                tab_to_leader_interface_1.purge_id(leader_store_object, id);
                delete known_ids[id];
                delete this.unknown_ids[id];
            }
            else {
                known_ids[id] = true;
                delete this.unknown_ids[id];
            }
        }
        return known_ids;
    }
    gather_messages_to_shared_queue(leader_store_object, known_ids) {
        for (const id of Object.keys(leader_store_object.incoming_messages)) {
            if (known_ids[id] == undefined) {
                if (this.unknown_ids[id] == undefined) {
                    this.unknown_ids[id] = 0;
                }
            }
            else {
                const incomming_message_queue = leader_store_object.incoming_messages[id];
                let message;
                while ((message = incomming_message_queue.shift()) != undefined) {
                    console.log("Leader got message with data " + message.data);
                    leader_store_object.message_queue.push({
                        worker_id: id,
                        message: message,
                    });
                }
            }
        }
    }
    pop_messages_from_shared_queue(leader_store_object, known_ids) {
        let num_messages = tab_to_leader_interface_1.get_wip_message_count(leader_store_object);
        while (num_messages++ < this.max_wip_messages) {
            const poped_queued_message = leader_store_object.message_queue.shift();
            if (poped_queued_message == undefined) {
                break;
            }
            if (known_ids[poped_queued_message.worker_id] == undefined) {
                if (this.unknown_ids[poped_queued_message.worker_id] == undefined) {
                    this.unknown_ids[poped_queued_message.worker_id] = 0;
                }
            }
            console.log("Leader poped message with data " + poped_queued_message.message.data);
            leader_store_object.ready_messages[poped_queued_message.worker_id].push(poped_queued_message.message);
        }
    }
    purge_unknown_ids(leader_store_object) {
        for (const id of Object.keys(this.unknown_ids)) {
            if (this.unknown_ids[id] > tab_to_leader_interface_1.TICKS_TO_DELETE_DEAD_ID) {
                tab_to_leader_interface_1.purge_id(leader_store_object, id);
                delete this.unknown_ids[id];
            }
        }
    }
    async leadership_process() {
        await this.elector.awaitLeadership();
        console.log("Initializing leader");
        const leader_store_object = {
            is_init: true,
            heartbeat: {},
            incoming_messages: {},
            message_queue: [],
            ready_messages: {},
            in_process_messages: {},
        };
        const shared_object = get_local_storage_1.get_local_storage();
        shared_object[this.channel_name] = leader_store_object;
        await sleep_1.sleep(tab_to_leader_interface_1.TICK_TIME_MS * 2); // Wait for existing workers to update info
        console.log("Leader initialized");
        while (!this.is_stopped) {
            const known_ids = this.gather_known_ids_and_purge_expired(leader_store_object);
            this.gather_messages_to_shared_queue(leader_store_object, known_ids);
            this.pop_messages_from_shared_queue(leader_store_object, known_ids);
            this.purge_unknown_ids(leader_store_object);
            await sleep_1.sleep(tab_to_leader_interface_1.TICK_TIME_MS);
        }
        await this.elector.die();
    }
    set_max_concurrent_workers(n) {
        this.max_wip_messages = n;
    }
    async stop() {
        this.is_stopped = true;
        await this.thread;
        await this.broadcast_channel.close();
        console.log("Exited leader gracefully");
    }
}
exports.LeaderProcess = LeaderProcess;
