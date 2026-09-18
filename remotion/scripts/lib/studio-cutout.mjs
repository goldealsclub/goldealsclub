import { PNG } from "pngjs";

const DEFAULT_DISTANCE = 42;

export const CUTOUT_LIMITS = Object.freeze({
  minTransparentRatio: 0.08,
  minOpaqueRatio: 0.02,
  maxSemiTransparentRatio: 0.01,
  maxOpaqueBorderRatio: 0,
});

/**
 * Retire uniquement le fond clair connecté aux bords du packshot.
 * Les pixels du bord extérieur restent totalement transparents : le feather
 * est calculé contre le produit, jamais contre les limites de l'image.
 */
export function removeConnectedStudioBackground(buf, distanceThreshold = DEFAULT_DISTANCE) {
  const png = PNG.sync.read(buf);
  const { width, height, data } = png;
  const total = width * height;
  const visited = new Uint8Array(total);
  const background = new Uint8Array(total);
  const queue = new Int32Array(total);
  const cornerSize = Math.max(8, Math.min(32, Math.floor(Math.min(width, height) * 0.02)));
  let br = 0;
  let bg = 0;
  let bb = 0;
  let samples = 0;

  for (const [x0, y0] of [[0, 0], [width - cornerSize, 0], [0, height - cornerSize], [width - cornerSize, height - cornerSize]]) {
    for (let y = y0; y < y0 + cornerSize; y++) {
      for (let x = x0; x < x0 + cornerSize; x++) {
        const i = (y * width + x) * 4;
        br += data[i];
        bg += data[i + 1];
        bb += data[i + 2];
        samples++;
      }
    }
  }

  br /= samples;
  bg /= samples;
  bb /= samples;
  if ((br + bg + bb) / 3 < 210) {
    throw new Error("fond studio insuffisamment clair");
  }

  const threshold2 = distanceThreshold * distanceThreshold;
  const distance = (pixel) => {
    const i = pixel * 4;
    const dr = data[i] - br;
    const dg = data[i + 1] - bg;
    const db = data[i + 2] - bb;
    return dr * dr + dg * dg + db * db;
  };
  let head = 0;
  let tail = 0;
  const push = (pixel) => {
    if (visited[pixel]) return;
    visited[pixel] = 1;
    if (distance(pixel) <= threshold2) {
      background[pixel] = 1;
      queue[tail++] = pixel;
    }
  };

  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) push(pixel - 1);
    if (x + 1 < width) push(pixel + 1);
    if (y > 0) push(pixel - width);
    if (y + 1 < height) push(pixel + width);
  }

  for (let pixel = 0; pixel < total; pixel++) {
    if (!background[pixel]) continue;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    let foregroundNeighbours = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue;
        const nx = x + ox;
        const ny = y + oy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !background[ny * width + nx]) {
          foregroundNeighbours++;
        }
      }
    }
    data[pixel * 4 + 3] = foregroundNeighbours >= 3 ? 150 : foregroundNeighbours > 0 ? 48 : 0;
  }

  return PNG.sync.write(png);
}

export function measureCutout(buf) {
  const png = PNG.sync.read(buf);
  const { width, height, data } = png;
  let transparent = 0;
  let opaque = 0;
  let semiTransparent = 0;
  for (let pixel = 0; pixel < width * height; pixel++) {
    const alpha = data[pixel * 4 + 3];
    if (alpha === 0) transparent++;
    if (alpha >= 250) opaque++;
    if (alpha > 0 && alpha < 250) semiTransparent++;
  }
  let opaqueBorder = 0;
  let borderPixels = 0;
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      borderPixels++;
      if (data[(y * width + x) * 4 + 3] !== 0) opaqueBorder++;
    }
  }
  for (let y = 1; y < height - 1; y++) {
    for (const x of [0, width - 1]) {
      borderPixels++;
      if (data[(y * width + x) * 4 + 3] !== 0) opaqueBorder++;
    }
  }
  const total = width * height;
  return {
    width,
    height,
    transparentRatio: transparent / total,
    opaqueRatio: opaque / total,
    semiTransparentRatio: semiTransparent / total,
    opaqueBorderRatio: opaqueBorder / borderPixels,
  };
}

export function assertCleanCutout(buf, limits = CUTOUT_LIMITS) {
  const metrics = measureCutout(buf);
  if (metrics.opaqueBorderRatio > limits.maxOpaqueBorderRatio) {
    throw new Error("cadre résiduel détecté");
  }
  if (metrics.transparentRatio < limits.minTransparentRatio || metrics.opaqueRatio < limits.minOpaqueRatio) {
    throw new Error(`détourage non fiable (${Math.round(metrics.transparentRatio * 100)} % transparent)`);
  }
  if (metrics.semiTransparentRatio > limits.maxSemiTransparentRatio) {
    throw new Error(`halo excessif (${(metrics.semiTransparentRatio * 100).toFixed(2)} % semi-transparent)`);
  }
  return metrics;
}