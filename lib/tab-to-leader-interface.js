"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_wip_message_count = exports.purge_id = exports.TICKS_TO_DELETE_DEAD_ID = exports.TICK_TIME_MS = void 0;
const TICK_TIME_MS = 50;
exports.TICK_TIME_MS = TICK_TIME_MS;
const TICKS_TO_DELETE_DEAD_ID = 10;
exports.TICKS_TO_DELETE_DEAD_ID = TICKS_TO_DELETE_DEAD_ID;
function purge_id(ttli, id) {
    delete ttli.heartbeat[id];
    delete ttli.incoming_messages[id];
    ttli.message_queue = ttli.message_queue.filter((message) => message.worker_id != id);
    delete ttli.ready_messages[id];
    delete ttli.in_process_messages[id];
}
exports.purge_id = purge_id;
function get_wip_message_count(ttli) {
    let wip_messages_counter = 0;
    for (const id of Object.keys(ttli.ready_messages)) {
        wip_messages_counter += ttli.ready_messages[id].length;
    }
    for (const id of Object.keys(ttli.in_process_messages)) {
        wip_messages_counter += ttli.in_process_messages[id].length;
    }
    return wip_messages_counter;
}
exports.get_wip_message_count = get_wip_message_count;
