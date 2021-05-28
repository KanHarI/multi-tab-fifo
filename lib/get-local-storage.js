"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_local_storage = void 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createLocalStorage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let storage_object = undefined;
    if (typeof localStorage === "undefined" || localStorage === null) {
        storage_object = {};
    }
    else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        storage_object = localStorage;
    }
    return storage_object;
}
const storageObject = createLocalStorage();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function get_local_storage() {
    return storageObject;
}
exports.get_local_storage = get_local_storage;
