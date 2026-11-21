import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { randomUUID } from 'node:crypto';

// ZIP timestamps use the DOS calendar. A fixed valid date keeps builds reproducible.
const DOS_EPOCH_DATE = (1 << 5) | 1; // 1980-01-01

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function localHeader(name, data, compressed, crc) {
  const nameBuf = Buffer.from(name, 'utf8');
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(DOS_EPOCH_DATE, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(nameBuf.length, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, nameBuf, compressed]);
}

function centralHeader(name, data, compressed, crc, offset) {
  const nameBuf = Buffer.from(name, 'utf8');
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(8, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(DOS_EPOCH_DATE, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(compressed.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(nameBuf.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  return Buffer.concat([header, nameBuf]);
}

export function writeZip(outFile, entries) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const compressed = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = localHeader(name, data, compressed, crc);
    chunks.push(local);
    central.push(centralHeader(name, data, compressed, crc, offset));
    offset += local.length;
  }

  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const staging = outFile + '.' + randomUUID() + '.tmp';
  try {
    fs.writeFileSync(staging, Buffer.concat([...chunks, centralBuffer, end]), { flag: 'wx' });
    fs.renameSync(staging, outFile);
  } finally {
    fs.rmSync(staging, { force: true });
  }
}
