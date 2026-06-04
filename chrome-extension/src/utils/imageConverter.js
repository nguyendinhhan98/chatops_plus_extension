import { GIFEncoder, quantize, applyPalette } from './gifenc.js';

// Formats Mattermost/ChatOps displays inline — no conversion needed
// (static PNG is fine; animated GIF is fine; JPEG is fine)
const CHATOPS_NATIVE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/gif', 'image/png']);

// Formats that Chrome's ImageDecoder can handle (for animated-frame detection)
const IMAGEDECODER_TYPES = new Set(['image/webp', 'image/avif', 'image/png', 'image/gif']);

// Formats requiring plain canvas draw (no animated frames possible)
const CANVAS_ONLY_TYPES = new Set([
  'image/svg+xml', 'image/bmp', 'image/x-bmp',
  'image/tiff', 'image/x-tiff', 'image/x-ms-bmp'
]);

/**
 * Returns true if this image needs to be converted before sending to ChatOps.
 * GIF and PNG (static) are native. Animated PNG (APNG) can't be detected here
 * without reading the file — handled in convertForChatOps().
 */
export function needsChatOpsConversion(mimeType = '', filename = '') {
  const type = mimeType.toLowerCase();
  const name = (filename || '').toLowerCase();

  if (type === 'image/jpeg' || type === 'image/jpg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) return false;
  if (type === 'image/gif' || name.endsWith('.gif')) return false;
  // PNG is OK unless it is animated (APNG) — we detect that inside convertForChatOps
  if ((type === 'image/png' || name.endsWith('.png')) && !name.endsWith('.apng')) return false;

  return true; // webp, avif, svg, bmp, tiff, apng, unknown → needs conversion
}

/**
 * Converts any image to a ChatOps-compatible format:
 *  - Animated (any format)  → animated GIF
 *  - Static unsupported     → PNG
 * @param {File|Blob|string} input  File object, Blob, or data-URL string
 * @returns {Promise<{dataUrl:string, type:string, name:string}>}
 */
export async function convertForChatOps(input) {
  let blob;
  let baseName = 'image';
  let mimeType = '';

  if (typeof input === 'string') {
    const m = input.match(/^data:([^;]+);/);
    mimeType = m ? m[1] : 'image/png';
    const res = await fetch(input);
    blob = await res.blob();
  } else if (input instanceof File) {
    blob = input;
    baseName = input.name.replace(/\.[^.]+$/, '');
    mimeType = input.type || detectTypeFromName(input.name);
  } else if (input instanceof Blob) {
    blob = input;
    mimeType = input.type || 'image/png';
  } else {
    throw new Error('[imageConverter] Unsupported input type');
  }

  const type = mimeType.toLowerCase();

  // ── SVG / BMP / TIFF → canvas → PNG (no animation possible) ──────────
  if (CANVAS_ONLY_TYPES.has(type)) {
    return convertViaCanvas(blob, baseName);
  }

  // ── Formats where ImageDecoder can detect animated frames ─────────────
  if (IMAGEDECODER_TYPES.has(type) || type === 'image/webp' || type === 'image/avif') {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const decoder = new ImageDecoder({ data: arrayBuffer, type });
      await decoder.tracks.ready;
      const frameCount = decoder.tracks.selectedTrack.frameCount;

      if (frameCount > 1) {
        // Animated → GIF
        return encodeToGif(decoder, frameCount, baseName);
      } else {
        // Static → PNG via canvas
        const result = await decoder.decode({ frameIndex: 0 });
        const frame = result.image;
        const canvas = document.createElement('canvas');
        canvas.width = frame.displayWidth;
        canvas.height = frame.displayHeight;
        canvas.getContext('2d').drawImage(frame, 0, 0);
        frame.close();
        const dataUrl = canvas.toDataURL('image/png');
        return { dataUrl, type: 'image/png', name: `${baseName}.png` };
      }
    } catch (e) {
      console.warn('[imageConverter] ImageDecoder failed, falling back to canvas:', e);
      return convertViaCanvas(blob, baseName);
    }
  }

  // ── Unknown format → try canvas → PNG ────────────────────────────────
  return convertViaCanvas(blob, baseName);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function detectTypeFromName(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  const map = { webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml',
                bmp: 'image/bmp', tiff: 'image/tiff', tif: 'image/tiff',
                gif: 'image/gif', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
  return map[ext] || 'image/png';
}

function convertViaCanvas(blob, baseName) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: canvas.toDataURL('image/png'), type: 'image/png', name: `${baseName}.png` });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Canvas load failed')); };
    img.src = url;
  });
}

async function encodeToGif(decoder, frameCount, baseName) {
  // Get dimensions from first frame
  const first = await decoder.decode({ frameIndex: 0 });
  const origW = first.image.displayWidth;
  const origH = first.image.displayHeight;
  first.image.close();

  // Only downscale if truly massive — keep quality as close to original as possible
  const MAX = 1024;
  let w = origW, h = origH;
  if (w > MAX || h > MAX) {
    const s = Math.min(MAX / w, MAX / h);
    w = Math.round(w * s);
    h = Math.round(h * s);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  // willReadFrequently: true optimizes repeated getImageData() calls
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // Skip frames only when extremely many — preserve smooth animation
  const MAX_FRAMES = 120;
  const step = frameCount > MAX_FRAMES ? Math.ceil(frameCount / MAX_FRAMES) : 1;

  const gif = GIFEncoder({ auto: false });
  gif.writeHeader();

  for (let i = 0; i < frameCount; i += step) {
    const res = await decoder.decode({ frameIndex: i });
    const frame = res.image;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(frame, 0, 0, w, h);

    // duration is in microseconds → convert to ms
    let delay = (frame.duration || 100000) / 1000;
    if (step > 1) delay *= step;
    frame.close();

    const pixels = ctx.getImageData(0, 0, w, h).data;

    // Detect whether this frame actually uses transparency
    // rgb565 gives better color fidelity when there's no alpha channel
    let hasAlpha = false;
    for (let p = 3; p < pixels.length; p += 4) {
      if (pixels[p] < 255) { hasAlpha = true; break; }
    }

    const format = hasAlpha ? 'rgba4444' : 'rgb565';
    const palette = quantize(pixels, 256, {
      format,
      oneBitAlpha: hasAlpha,
      clearAlpha: hasAlpha,
      clearAlphaColor: 0,
      clearAlphaThreshold: 0
    });
    const transparentIndex = hasAlpha ? palette.findIndex(c => c.length >= 4 && c[3] === 0) : -1;
    const hasTransparent = transparentIndex !== -1;
    const rgbPalette = palette.map(c => [c[0], c[1], c[2]]);
    const index = applyPalette(pixels, palette, format);

    gif.writeFrame(index, w, h, {
      first: i === 0,
      palette: rgbPalette,
      delay,
      transparent: hasTransparent,
      transparentIndex: hasTransparent ? transparentIndex : 0,
      repeat: i === 0 ? 0 : undefined // 0 = loop forever, only on first frame
    });
  }

  gif.finish();
  const gifBlob = new Blob([gif.bytesView()], { type: 'image/gif' });
  const dataUrl = await blobToDataUrl(gifBlob);
  return { dataUrl, type: 'image/gif', name: `${baseName}.gif` };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
