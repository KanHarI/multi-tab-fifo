"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageObject = void 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createLocalStorage() {
    if (typeof localStorage === "undefined" || localStorage === null) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const LocalStorage = require("node-localstorage").LocalStorage;
        localStorage = new LocalStorage("./scratch");
    }
    return localStorage;
}
const storageObject = createLocalStorage();
exports.storageObject = storageObject;
