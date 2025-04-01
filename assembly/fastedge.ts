import * as imports from "./imports";

import {
  get_current_time_nanoseconds,
  globalArrayBufferReference,
  LogLevelValues,
} from "./runtime";

let logLevel: LogLevelValues = LogLevelValues.info;

function setLogLevel(level: LogLevelValues): void {
  logLevel = level;
}

function log(level: LogLevelValues, logMessage: string): void {
  // Temporary fix for proxy_log not being implemented in fastedge:
  // relies on @assemblyscript/wasi-shim to print to standard output
  if (level >= logLevel) {
    process.stdout.write(logMessage + "\n");
  }
}

function getCurrentTime(): u64 {
  return get_current_time_nanoseconds() / 1_000_000; // Convert nanoseconds to milliseconds
}

function getEnvVar(key: string): string {
  const hasKey = process.env.has(key);
  if (hasKey) {
    return process.env.get(key);
  }
  return "";
}

function getSecretVar(key: string): string {
  const buffer = String.UTF8.encode(key);
  const status = imports.proxy_get_secret(
    changetype<usize>(buffer),
    buffer.byteLength,
    globalArrayBufferReference.bufferPtr(),
    globalArrayBufferReference.sizePtr()
  );
  if (status != 0) {
    // Something went wrong - returns 0 with an empty ArrayBuffer if not found
    return "";
  }
  const arrBuff = globalArrayBufferReference.toArrayBuffer();
  if (arrBuff.byteLength == 0) {
    return ""; // Not found
  }
  return String.UTF8.decode(arrBuff);
}

function getSecretVarEffectiveAt(key: string, at: u32): string {
  const buffer = String.UTF8.encode(key);
  const status = imports.proxy_get_effective_at_secret(
    changetype<usize>(buffer),
    buffer.byteLength,
    at,
    globalArrayBufferReference.bufferPtr(),
    globalArrayBufferReference.sizePtr()
  );
  if (status != 0) {
    // Something went wrong - returns 0 with an empty ArrayBuffer if not found
    return "";
  }
  const arrBuff = globalArrayBufferReference.toArrayBuffer();
  if (arrBuff.byteLength == 0) {
    return ""; // Not found
  }
  return String.UTF8.decode(arrBuff);
}

export {
  getCurrentTime,
  getEnvVar,
  getSecretVar,
  getSecretVarEffectiveAt,
  log,
  LogLevelValues,
  setLogLevel,
};
