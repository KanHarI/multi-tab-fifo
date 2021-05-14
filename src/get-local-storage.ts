// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createLocalStorage(): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let storage_object: Storage | undefined = undefined;
  if (typeof localStorage === "undefined" || localStorage === null) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const local_storage_module = require("node-localstorage");
    storage_object = new local_storage_module.LocalStorage("./scratch");
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storage_object = localStorage;
  }
  return storage_object as Storage;
}

const storageObject = createLocalStorage();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function get_local_storage(): Record<string, any> {
  return storageObject;
}

export { get_local_storage };
