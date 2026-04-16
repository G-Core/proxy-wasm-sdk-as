import * as imports from "../imports";

import { globalArrayBufferReference, WasmResultValues } from "../runtime";

/**
 * Reads an environment variable by name using the WASI environment interface.
 *
 * Use this for normal-sized environment variables (under 64 KB). For values
 * that may exceed the WASI 64 KB limit, use {@link getDictionary} instead.
 *
 * @param {string} name - The name of the environment variable.
 * @returns {string} The value, or an empty string if not found.
 */
function getEnv(name: string): string {
  const hasKey = process.env.has(name);
  if (hasKey) {
    return process.env.get(name);
  }
  return "";
}

/**
 * Reads a dictionary value by name using the proxy-wasm dictionary API
 * (`proxy_dictionary_get`).
 *
 * This bypasses the WASI 64 KB environment variable size limit and should
 * be used when a value may be larger than 64 KB (e.g. large JSON configs,
 * PEM certificates, policy documents).
 *
 * For normal-sized environment variables, prefer {@link getEnv}.
 *
 * @param {string} name - The dictionary key to look up.
 * @returns {string} The value, or an empty string if not found.
 */
function getDictionary(name: string): string {
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

export { getEnv, getDictionary };
