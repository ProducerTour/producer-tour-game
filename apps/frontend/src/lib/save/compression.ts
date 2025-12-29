// Compression utilities for save data
// Uses LZ-string-like compression for localStorage efficiency

// Simple RLE + Base64 compression
export function compress(input: string): string {
  try {
    // Convert to UTF-16 for better compression of JSON
    const compressed = compressToUTF16(input);
    return compressed;
  } catch {
    // Fallback to base64
    return btoa(encodeURIComponent(input));
  }
}

export function decompress(compressed: string): string {
  try {
    // Try UTF-16 decompression first
    const decompressed = decompressFromUTF16(compressed);
    if (decompressed) return decompressed;

    // Fallback to base64
    return decodeURIComponent(atob(compressed));
  } catch {
    return compressed;
  }
}

// UTF-16 compression (similar to lz-string)
function compressToUTF16(input: string): string {
  if (!input) return '';

  const context: CompressionContext = {
    dictionary: new Map(),
    dictionaryToCreate: new Map(),
    w: '',
    enlargeIn: 2,
    dictSize: 3,
    numBits: 2,
    data: [],
    dataVal: 0,
    dataPosition: 0,
  };

  for (let i = 0; i < input.length; i++) {
    const c = input.charAt(i);
    if (!context.dictionary.has(c)) {
      context.dictionary.set(c, context.dictSize++);
      context.dictionaryToCreate.set(c, true);
    }

    const wc = context.w + c;
    if (context.dictionary.has(wc)) {
      context.w = wc;
    } else {
      produceOutput(context);
      context.dictionary.set(wc, context.dictSize++);
      context.w = c;
    }
  }

  if (context.w !== '') {
    produceOutput(context);
  }

  // Mark end
  writeBits(context, 2, context.numBits);

  // Final flush
  while (true) {
    context.dataVal = context.dataVal << 1;
    if (context.dataPosition === 14) {
      context.data.push(String.fromCharCode(context.dataVal + 32));
      break;
    }
    context.dataPosition++;
  }

  return context.data.join('');
}

function decompressFromUTF16(compressed: string): string | null {
  if (!compressed) return '';

  const dictionary: string[] = ['', '', ''];
  let enlargeIn = 4;
  let dictSize = 4;
  let numBits = 3;
  let entry = '';
  let result: string[] = [];
  let w = '';
  let bits = 0;
  let maxPower = 2;
  let power = 0;
  let data = { val: compressed.charCodeAt(0) - 32, position: 32768, index: 1 };

  // Read first entry
  bits = 0;
  maxPower = 4;
  power = 0;
  while (power < maxPower) {
    const resb = data.val & data.position;
    data.position >>= 1;
    if (data.position === 0) {
      data.position = 32768;
      data.val = compressed.charCodeAt(data.index++) - 32;
    }
    bits |= (resb > 0 ? 1 : 0) * power;
    power *= 2;
  }

  switch (bits) {
    case 0:
      bits = 0;
      maxPower = 256;
      power = 0;
      while (power < maxPower) {
        const resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = 32768;
          data.val = compressed.charCodeAt(data.index++) - 32;
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power *= 2;
      }
      dictionary[3] = String.fromCharCode(bits);
      dictSize = 4;
      w = dictionary[3];
      break;
    case 1:
      bits = 0;
      maxPower = 65536;
      power = 0;
      while (power < maxPower) {
        const resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = 32768;
          data.val = compressed.charCodeAt(data.index++) - 32;
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power *= 2;
      }
      dictionary[3] = String.fromCharCode(bits);
      dictSize = 4;
      w = dictionary[3];
      break;
    case 2:
      return '';
  }

  result.push(w);

  while (true) {
    if (data.index > compressed.length) return null;

    bits = 0;
    maxPower = Math.pow(2, numBits);
    power = 0;
    while (power < maxPower) {
      const resb = data.val & data.position;
      data.position >>= 1;
      if (data.position === 0) {
        data.position = 32768;
        data.val = compressed.charCodeAt(data.index++) - 32;
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power *= 2;
    }

    let c = bits;
    switch (c) {
      case 0:
        bits = 0;
        maxPower = 256;
        power = 0;
        while (power < maxPower) {
          const resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = 32768;
            data.val = compressed.charCodeAt(data.index++) - 32;
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power *= 2;
        }
        dictionary[dictSize++] = String.fromCharCode(bits);
        c = dictSize - 1;
        enlargeIn--;
        break;
      case 1:
        bits = 0;
        maxPower = 65536;
        power = 0;
        while (power < maxPower) {
          const resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = 32768;
            data.val = compressed.charCodeAt(data.index++) - 32;
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power *= 2;
        }
        dictionary[dictSize++] = String.fromCharCode(bits);
        c = dictSize - 1;
        enlargeIn--;
        break;
      case 2:
        return result.join('');
    }

    if (enlargeIn === 0) {
      enlargeIn = Math.pow(2, numBits);
      numBits++;
    }

    if (dictionary[c]) {
      entry = dictionary[c];
    } else {
      if (c === dictSize) {
        entry = w + w.charAt(0);
      } else {
        return null;
      }
    }

    result.push(entry);
    dictionary[dictSize++] = w + entry.charAt(0);
    enlargeIn--;

    if (enlargeIn === 0) {
      enlargeIn = Math.pow(2, numBits);
      numBits++;
    }

    w = entry;
  }
}

interface CompressionContext {
  dictionary: Map<string, number>;
  dictionaryToCreate: Map<string, boolean>;
  w: string;
  enlargeIn: number;
  dictSize: number;
  numBits: number;
  data: string[];
  dataVal: number;
  dataPosition: number;
}

function produceOutput(context: CompressionContext): void {
  if (context.dictionaryToCreate.has(context.w)) {
    if (context.w.charCodeAt(0) < 256) {
      writeBits(context, 0, context.numBits);
      writeBits(context, context.w.charCodeAt(0), 8);
    } else {
      writeBits(context, 1, context.numBits);
      writeBits(context, context.w.charCodeAt(0), 16);
    }
    decrementEnlargeIn(context);
    context.dictionaryToCreate.delete(context.w);
  } else {
    writeBits(context, context.dictionary.get(context.w)!, context.numBits);
  }
  decrementEnlargeIn(context);
}

function writeBits(context: CompressionContext, value: number, numBits: number): void {
  for (let i = 0; i < numBits; i++) {
    context.dataVal = (context.dataVal << 1) | (value & 1);
    if (context.dataPosition === 14) {
      context.dataPosition = 0;
      context.data.push(String.fromCharCode(context.dataVal + 32));
      context.dataVal = 0;
    } else {
      context.dataPosition++;
    }
    value = value >> 1;
  }
}

function decrementEnlargeIn(context: CompressionContext): void {
  context.enlargeIn--;
  if (context.enlargeIn === 0) {
    context.enlargeIn = Math.pow(2, context.numBits);
    context.numBits++;
  }
}
