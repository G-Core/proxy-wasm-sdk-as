// Abstract base class for item parsers
abstract class ItemParser<T> {
  abstract parseItem(
    buffer: ArrayBuffer,
    dataIndex: u32,
    itemSize: u32
  ): T | null;
  abstract createEmptyArray(): Array<T>;
}

// String parser implementation
class StringParser extends ItemParser<string> {
  parseItem(buffer: ArrayBuffer, dataIndex: u32, itemSize: u32): string | null {
    // Extract string data
    const stringData = buffer.slice(
      <i32>dataIndex,
      <i32>(dataIndex + itemSize)
    );
    return String.UTF8.decode(stringData);
  }

  createEmptyArray(): Array<string> {
    return new Array<string>();
  }
}

// Generic deserialization function
function parseBufferToList<T>(
  buffer: ArrayBuffer,
  parser: ItemParser<T>
): Array<T> {
  // Check if buffer is valid
  if (!buffer || buffer.byteLength === 0) {
    return parser.createEmptyArray();
  }

  // Read number of items
  const numItems = Uint32Array.wrap(buffer, 0, 1)[0];

  if (numItems === 0) {
    return parser.createEmptyArray();
  }

  // Read sizes array
  const sizes = Uint32Array.wrap(buffer, sizeof<u32>(), numItems);

  // Start of actual data
  let dataIndex: u32 = sizeof<u32>() * (1 + numItems);
  const result = parser.createEmptyArray();

  for (let i: u32 = 0; i < numItems; i++) {
    const itemSize = sizes[i];

    if (dataIndex + itemSize > <u32>buffer.byteLength) {
      break;
    }

    const item = parser.parseItem(buffer, dataIndex, itemSize);
    if (item !== null) {
      result.push(item);
    }

    // Move to next item (including null terminator if present)
    dataIndex += itemSize + 1; // +1 for null terminator
  }

  return result;
}

export { ItemParser, StringParser, parseBufferToList };
