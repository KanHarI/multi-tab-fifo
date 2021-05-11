"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Worker = void 0;
const tab_to_leader_interface_1 = require("./tab-to-leader-interface");
const leader_process_1 = require("./leader-process");
const uuid_1 = require("./uuid");
const get_local_storage_1 = require("./get-local-storage");
const sleep_1 = require("./sleep");
class Worker {
    constructor(channel_name, callback) {
        this.callback = callback;
        this.channel_name = channel_name;
        this.id = uuid_1.generate_uuid();
        this.unpushed_messages = [];
        this.is_stopped = false;
        this.leader_process = new leader_process_1.LeaderProcess(channel_name);
        this.thread = this.worker_process();
    }
    async process_message(message) {
        const storageObject = get_local_storage_1.get_local_storage();
        let leader_object = storageObject[this.channel_name];
        leader_object.in_process_messages[this.id].push(message);
        try {
            await this.callback(message.data);
        }
        finally {
            leader_object = storageObject[this.channel_name];
            leader_object.in_process_messages[this.id] = leader_object.in_process_messages[this.id].filter((queued_message) => queued_message.message_id != message.message_id);
        }
        console.log("Exited message processing gracefuly");
    }
    async worker_process() {
        const storageObject = get_local_storage_1.get_local_storage();
        while (!this.is_stopped) {
            const leader_inerface = storageObject[this.channel_name];
            if (leader_inerface != undefined && leader_inerface.is_init) {
                if (leader_inerface.heartbeat[this.id] == undefined) {
                    console.log("Initializing worker info");
                    leader_inerface.incoming_messages[this.id] = [];
                    leader_inerface.ready_messages[this.id] = [];
                    leader_inerface.in_process_messages[this.id] = [];
                }
                leader_inerface.heartbeat[this.id] = Date.now();
                let message = undefined;
                while ((message = this.unpushed_messages.shift()) != undefined) {
                    console.log("Pushed message with data " + message.data);
                    leader_inerface.incoming_messages[this.id].push(message);
                }
                while ((message = leader_inerface.ready_messages[this.id].shift()) !=
                    undefined) {
                    console.log("Processing message with data " + message.data);
                    this.process_message(message);
                }
            }
            await sleep_1.sleep(tab_to_leader_interface_1.TICK_TIME_MS);
        }
    }
    set_max_concurrent_workers(n) {
        this.leader_process.set_max_concurrent_workers(n);
    }
    push_message(data) {
        console.log("Prepushing message with data " + data);
        const message = { message_id: uuid_1.generate_uuid(), data: data };
        this.unpushed_messages.push(message);
    }
    async stop() {
        this.is_stopped = true;
        await this.leader_process.stop();
        await this.thread;
        const storageObject = get_local_storage_1.get_local_storage();
        const leader_inerface = storageObject[this.channel_name];
        if (leader_inerface != undefined) {
            tab_to_leader_interface_1.purge_id(leader_inerface, this.id);
        }
        console.log("Exited worker gracefully");
    }
}
exports.Worker = Worker;
