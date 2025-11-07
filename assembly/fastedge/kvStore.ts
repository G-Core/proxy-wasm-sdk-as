import * as imports from "../imports";

import {
  globalArrayBufferReference,
  Reference,
  WasmResultValues,
} from "../runtime";
import { ItemParser, StringParser, parseBufferToList } from "./utils";

/**
 * KvStore provides access to the FastEdge Key-Value store
 */
export class KvStore {
  private handle: u32;

  private constructor(handle: u32) {
    this.handle = handle;
  }

  /**
   * Opens a connection to the specified KV store
   * @param storeName - The name of the KV store to open
   * @returns A new KvStore instance or null if the store cannot be opened
   */
  static open(storeName: string): KvStore | null {
    const buffer = String.UTF8.encode(storeName);
    const returnHandlerRef = new Reference<u32>();

    const status = imports.proxy_kv_store_open(
      changetype<usize>(buffer),
      buffer.byteLength,
      returnHandlerRef.ptr() as u32
    );

    if (status == WasmResultValues.Ok) {
      return new KvStore(returnHandlerRef.data);
    }
    return null;
  }

  /**
   * Retrieves the value associated with the given key from the KV store.
   * @param {string} key  The key to retrieve the value for.
   * @returns {ArrayBuffer | null} The value associated with the key, or null if not found.
   */
  get(key: string): ArrayBuffer | null {
    const buffer = String.UTF8.encode(key);
    const status = imports.proxy_kv_store_get(
      this.getHandle(),
      changetype<usize>(buffer),
      buffer.byteLength,
      globalArrayBufferReference.bufferPtr(),
      globalArrayBufferReference.sizePtr()
    );
    if (status == WasmResultValues.Ok) {
      return globalArrayBufferReference.toArrayBuffer();
    }
    return null;
  }

  /**
   * Retrieves all key prefix matches from the KV store.
   * @param {string} pattern  The prefix pattern to match keys against. e.g. 'foo*' ( Must include wildcard )
   * @returns {Array<string>} The keys matching the pattern, or empty array if none found.
   */
  scan(pattern: string): Array<string> {
    const match = String.UTF8.encode(pattern);
    const status = imports.proxy_kv_store_scan(
      this.getHandle(),
      changetype<usize>(match),
      match.byteLength,
      globalArrayBufferReference.bufferPtr(),
      globalArrayBufferReference.sizePtr()
    );
    if (status == WasmResultValues.Ok) {
      return parseBufferToList<string>(
        globalArrayBufferReference.toArrayBuffer(),
        new StringParser()
      );
    }
    return new Array<string>();
  }

  /**
   * Retrieves all the values from ZSet with scores between the given range.
   * @param {string} key  The key for the Sorted Set.
   * @param {f64} min  The minimum score for the range.
   * @param {f64} max  The maximum score for the range.
   * @returns {Array<ValueScoreTuple>} Array of [value, score] tuples within range for the key, or an empty array if none found.
   */
  zrangeByScore(key: string, min: f64, max: f64): Array<ValueScoreTuple> {
    const keyBuffer = String.UTF8.encode(key);
    const status = imports.proxy_kv_store_zrange_by_score(
      this.getHandle(),
      changetype<usize>(keyBuffer),
      keyBuffer.byteLength,
      min,
      max,
      globalArrayBufferReference.bufferPtr(),
      globalArrayBufferReference.sizePtr()
    );
    if (status == WasmResultValues.Ok) {
      return parseBufferToList<ValueScoreTuple>(
        globalArrayBufferReference.toArrayBuffer(),
        new ValueScoreTupleParser()
      );
    }
    return new Array<ValueScoreTuple>();
  }

  /**
   * Retrieves all value prefix matches from the KV ZSet.
   * @param {string} key  The key for the Sorted Set.
   * @param {string} pattern  The prefix pattern to match values against. e.g. 'foo*' ( Must include wildcard )
   * @returns {Array<ValueScoreTuple>} Array of [value, score] tuples which match the prefix pattern, or an empty array if none found.
   */
  zscan(key: string, pattern: string): Array<ValueScoreTuple> {
    const match = String.UTF8.encode(pattern);
    const keyBuffer = String.UTF8.encode(key);
    const status = imports.proxy_kv_store_zscan(
      this.getHandle(),
      changetype<usize>(keyBuffer),
      keyBuffer.byteLength,
      changetype<usize>(match),
      match.byteLength,
      globalArrayBufferReference.bufferPtr(),
      globalArrayBufferReference.sizePtr()
    );
    if (status == WasmResultValues.Ok) {
      return parseBufferToList<ValueScoreTuple>(
        globalArrayBufferReference.toArrayBuffer(),
        new ValueScoreTupleParser()
      );
    }
    return new Array<ValueScoreTuple>();
  }

  /**
   * Checks if a given item exists within the KV stores Bloom Filter.
   * @param {string} key  The key for the Bloom Filter.
   * @param {string} item  The item to check for existence.
   * @returns {boolean} True if the item exists, false otherwise.
   */
  bfExists(key: string, item: string): boolean {
    const keyBuffer = String.UTF8.encode(key);
    const itemBuffer = String.UTF8.encode(item);
    const returnHandlerRef = new Reference<u32>();

    const status = imports.proxy_kv_store_bf_exists(
      this.getHandle(),
      changetype<usize>(keyBuffer),
      keyBuffer.byteLength,
      changetype<usize>(itemBuffer),
      itemBuffer.byteLength,
      returnHandlerRef.ptr() as u32
    );

    if (status == WasmResultValues.Ok) {
      return returnHandlerRef.data != 0;
    }
    return false;
  }

  /**
   * Gets the handle of this KV store instance
   * @returns The handle
   */
  getHandle(): u32 {
    return this.handle;
  }
}

export class ValueScoreTuple {
  value: ArrayBuffer;
  score: number;

  constructor(value: ArrayBuffer, score: number) {
    this.value = value;
    this.score = score;
  }
}

// ValueScoreTuple parser implementation
class ValueScoreTupleParser extends ItemParser<ValueScoreTuple> {
  parseItem(
    buffer: ArrayBuffer,
    dataIndex: u32,
    itemSize: u32
  ): ValueScoreTuple | null {
    // Each item contains value bytes + 8-byte f64 score
    const scoreSize: u32 = 8; // f64 = 8 bytes
    if (itemSize < scoreSize) {
      // Invalid item, skip
      return null;
    }

    const valueSize = itemSize - scoreSize;

    // Extract value data
    const valueData = buffer.slice(
      <i32>dataIndex,
      <i32>(dataIndex + valueSize)
    );

    // Extract score data (last 8 bytes of the item)
    const scoreData = buffer.slice(
      <i32>(dataIndex + valueSize),
      <i32>(dataIndex + itemSize)
    );

    // Convert score bytes to f64 (little-endian)
    const scoreBytes = new Uint8Array(scoreSize);
    const sourceScoreBytes = Uint8Array.wrap(scoreData);
    for (let j: u32 = 0; j < scoreSize; j++) {
      scoreBytes[j] = sourceScoreBytes[j];
    }

    // Convert little-endian bytes to f64
    const scoreView = new DataView(scoreBytes.buffer);
    const score = scoreView.getFloat64(0, true); // true = little-endian

    return new ValueScoreTuple(valueData, score);
  }

  createEmptyArray(): Array<ValueScoreTuple> {
    return new Array<ValueScoreTuple>();
  }
}
