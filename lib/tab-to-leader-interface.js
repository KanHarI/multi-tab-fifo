"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    MessageType[MessageType["LEADER_CREATED"] = 0] = "LEADER_CREATED";
    MessageType[MessageType["REGISTER_WORKER"] = 1] = "REGISTER_WORKER";
    MessageType[MessageType["UNREGISTER_WORKER"] = 2] = "UNREGISTER_WORKER";
    MessageType[MessageType["ADD_ITEM_FROM_WORKER"] = 3] = "ADD_ITEM_FROM_WORKER";
    MessageType[MessageType["POP_ITEM_TO_WORKER"] = 4] = "POP_ITEM_TO_WORKER";
    MessageType[MessageType["ITEM_PROCESSING_DONE_FROM_WORKER"] = 5] = "ITEM_PROCESSING_DONE_FROM_WORKER";
    MessageType[MessageType["INFORM_WIP_IN_WORKER"] = 6] = "INFORM_WIP_IN_WORKER";
})(MessageType || (MessageType = {}));
exports.MessageType = MessageType;
