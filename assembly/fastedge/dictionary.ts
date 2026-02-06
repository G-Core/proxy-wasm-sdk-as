import * as imports from "../imports";

import { globalArrayBufferReference, WasmResultValues } from "../runtime";

/**
 * Function to get the value for the provided environment variable name.
 * @param {string} name - The name of the environment variable.
 * @returns {string} The value of the environment variable.
 */
function getEnv(name: string): string {
  const buffer = String.UTF8.encode(name);
  const status = imports.proxy_dictionary_get(
    changetype<usize>(buffer),
    buffer.byteLength,
    globalArrayBufferReference.bufferPtr(),
    globalArrayBufferReference.sizePtr(),
  );
  if (status == WasmResultValues.Ok) {
    const arrBuff = globalArrayBufferReference.toArrayBuffer();
    if (arrBuff.byteLength > 0) {
      return String.UTF8.decode(arrBuff);
    }
  }
  return "";
}

export { getEnv };
