import * as imports from "../imports";

import { globalArrayBufferReference, WasmResultValues } from "../runtime";

/**
 * Function to get the value for the provided secret variable name.
 * @param {string} name - The name of the secret variable.
 * @returns {string} The value of the secret variable.
 */
function getSecret(name: string): string {
  const buffer = String.UTF8.encode(name);
  const status = imports.proxy_get_secret(
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

/**
 * Function to get the value for the provided secret variable name from a specific slot.
 * @param {string} name - The name of the secret variable.
 * @param {u32} effectiveAt - The numeric slot index to retrieve. Slots are defined in the FastEdge UI and are always numeric (e.g. incremental integers, or Date.now()-style values to represent a point in time).
 * @returns {string} The value of the secret variable.
 */
function getSecretEffectiveAt(name: string, effectiveAt: u32): string {
  const buffer = String.UTF8.encode(name);
  const status = imports.proxy_get_effective_at_secret(
    changetype<usize>(buffer),
    buffer.byteLength,
    effectiveAt,
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

/**
 * @deprecated Use {@link getSecret} instead. This function will be removed in a future version.
 * @param {string} name - The name of the secret variable.
 * @returns {string} The value of the secret variable.
 */
function getSecretVar(name: string): string {
  return getSecret(name);
}

/**
 * @deprecated Use {@link getSecretEffectiveAt} instead. This function will be removed in a future version.
 * @param {string} name - The name of the secret variable.
 * @param {u32} effectiveAt - The numeric slot index to retrieve. Slots are defined in the FastEdge UI and are always numeric (e.g. incremental integers, or Date.now()-style values to represent a point in time).
 * @returns {string} The value of the secret variable.
 */
function getSecretVarEffectiveAt(name: string, effectiveAt: u32): string {
  return getSecretEffectiveAt(name, effectiveAt);
}

export {
  getSecret,
  getSecretEffectiveAt,
  getSecretVar,
  getSecretVarEffectiveAt,
};
