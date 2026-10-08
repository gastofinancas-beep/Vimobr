const fs = require('fs');
const { execSync } = require('child_process');

console.log('Converting public/mascote.png to raw RGBA...');
execSync('convert public/mascote.png rgba:temp.raw');

const width = 1536;
const height = 1024;
const raw = fs.readFileSync('temp.raw');
console.log('Raw buffer size:', raw.length, 'expected:', width * height * 4);

// Function to check if a pixel matches the checkerboard pattern (white or neutral gray)
function isCheckerboard(r, g, b) {
  const maxDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
  // Neutral gray checkerboard squares (low saturation)
  const isNeutral = maxDiff < 18;
  const isLight = (r > 190 && g > 190 && b > 190);
  return isNeutral && isLight;
}

// 2D visited / alpha map
const alpha = new Uint8Array(width * height).fill(255);
const visited = new Uint8Array(width * height);
const queue = [];

// Seed the queue with all outer boundary pixels
for (let x = 0; x < width; x++) {
  queue.push(x, 0); // top row
  visited[x] = 1;
  queue.push(x, height - 1); // bottom row
  visited[(height - 1) * width + x] = 1;
}
for (let y = 0; y < height; y++) {
  queue.push(0, y); // left col
  visited[y * width] = 1;
  queue.push(width - 1, y); // right col
  visited[y * width + (width - 1)] = 1;
}

console.log('Running BFS flood fill from outer boundaries...');
let head = 0;
while (head < queue.length) {
  const x = queue[head++];
  const y = queue[head++];
  const idx = (y * width + x);
  const rawIdx = idx * 4;
  const r = raw[rawIdx];
  const g = raw[rawIdx + 1];
  const b = raw[rawIdx + 2];

  if (isCheckerboard(r, g, b)) {
    alpha[idx] = 0; // Transparent!

    // Check 4 neighbors
    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nidx = ny * width + nx;
        if (!visited[nidx]) {
          visited[nidx] = 1;
          queue.push(nx, ny);
        }
      }
    }
  }
}

console.log('BFS finished. Applying alpha to buffer...');
for (let i = 0; i < width * height; i++) {
  raw[i * 4 + 3] = alpha[i];
}

fs.writeFileSync('temp_out.raw', raw);
console.log('Writing public/mascote_transparent.png with ImageMagick...');
execSync(`convert -size ${width}x${height} -depth 8 rgba:temp_out.raw public/mascote_transparent.png`);

// Also create trimmed version for perfect card alignment
execSync('convert public/mascote_transparent.png -trim +repage public/mascote_trimmed.png');

// Clean up temp files
fs.unlinkSync('temp.raw');
fs.unlinkSync('temp_out.raw');

console.log('Done! Output files:');
console.log(execSync('ls -lh public/mascote*.png').toString());
