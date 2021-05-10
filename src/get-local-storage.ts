// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createLocalStorage(): Record<string, any> {
  if (typeof localStorage === "undefined" || localStorage === null) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const LocalStorage = require("node-localstorage").LocalStorage;
    localStorage = new LocalStorage("./scratch");
  }
  return localStorage;
}

const storageObject = createLocalStorage();

export { storageObject };
