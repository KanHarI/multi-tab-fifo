// @ts-ignore
import getRandomValues from "get-random-values";

type uuid = string;

// Black magic from https://stackoverflow.com/a/2117523
function generate_uuid(): uuid {
  // @ts-ignore
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (c ^ (getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}

export { generate_uuid };
export type { uuid };
