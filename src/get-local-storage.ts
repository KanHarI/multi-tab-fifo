// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createLocalStorage(): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let storage_object: Record<string, any> | undefined = undefined;
  if (typeof localStorage === "undefined" || localStorage === null) {
    storage_object = {};
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storage_object = (localStorage as unknown) as Record<string, any>;
  }
  return storage_object;
}

const storageObject = createLocalStorage();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function get_local_storage(): Record<string, any> {
  return storageObject;
}

export { get_local_storage };
