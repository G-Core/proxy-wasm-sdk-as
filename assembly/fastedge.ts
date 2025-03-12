import * as imports from "./imports";

import { globalArrayBufferReference, LogLevelValues } from "./runtime";

let logLevel: LogLevelValues = LogLevelValues.info;

export function setLogLevel(level: LogLevelValues): void {
  logLevel = level;
}

export function log(level: LogLevelValues, logMessage: string): void {
  // Temporary fix for proxy_log not being implemented in fastedge:
  // relies on @assemblyscript/wasi-shim to print to standard output
  if (level >= logLevel) {
    process.stdout.write(logMessage + "\n");
  }
}

export function getEnvVar(key: string): string {
  const hasKey = process.env.has(key);
  if (hasKey) {
    return process.env.get(key);
  }
  return "";
}

export function getSecretVar(key: string): string {
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

export { LogLevelValues };
