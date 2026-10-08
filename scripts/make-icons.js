import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, r, g, b, a = 255) {
  // Simple uncompressed or deflated truecolor PNG with alpha
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Draw subtle fork silhouette or amber circle
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = width * 0.42;

      if (dist <= radius) {
        // Inside circle
        if (Math.abs(dx) < width * 0.04 && dy > -height * 0.1 && dy < height * 0.3) {
          // Fork stem (amber)
          rawData[pxOffset] = 245;
          rawData[pxOffset + 1] = 165;
          rawData[pxOffset + 2] = 36;
          rawData[pxOffset + 3] = 255;
        } else if (dy <= -height * 0.1 && dy >= -height * 0.3 && (Math.abs(dx) < width * 0.16)) {
          // Fork prongs
          rawData[pxOffset] = 245;
          rawData[pxOffset + 1] = 165;
          rawData[pxOffset + 2] = 36;
          rawData[pxOffset + 3] = 255;
        } else {
          // Dark background #1A1714
          rawData[pxOffset] = 26;
          rawData[pxOffset + 1] = 23;
          rawData[pxOffset + 2] = 20;
          rawData[pxOffset + 3] = 255;
        }
      } else {
        // Deep background #0F0D0B
        rawData[pxOffset] = 15;
        rawData[pxOffset + 1] = 13;
        rawData[pxOffset + 2] = 11;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', deflated);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

if (!fs.existsSync('public')) fs.mkdirSync('public');

fs.writeFileSync('public/icon-192.png', createPNG(192, 192));
fs.writeFileSync('public/icon-512.png', createPNG(512, 512));
fs.writeFileSync('public/icon-maskable-512.png', createPNG(512, 512));
console.log('PNG icons created successfully');
