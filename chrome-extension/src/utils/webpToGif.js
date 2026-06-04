import { GIFEncoder, quantize, applyPalette } from './gifenc.js';

/**
 * Converts a WebP file or data URL to PNG (if static) or GIF (if animated).
 * @param {File|Blob|string} webpFileOrDataUrl - The input webp image.
 * @returns {Promise<{ dataUrl: string, type: string, name: string }>} Resolves with the new data URL, type, and name.
 */
export async function convertWebpToGifOrPng(webpFileOrDataUrl) {
  let blob;
  let originalName = 'image.webp';

  if (typeof webpFileOrDataUrl === 'string') {
    // It's a data URL
    const response = await fetch(webpFileOrDataUrl);
    blob = await response.blob();
  } else if (webpFileOrDataUrl instanceof File) {
    blob = webpFileOrDataUrl;
    originalName = webpFileOrDataUrl.name;
  } else if (webpFileOrDataUrl instanceof Blob) {
    blob = webpFileOrDataUrl;
  } else {
    throw new Error('Unsupported input type for WebP conversion');
  }

  // Set up ImageDecoder
  const arrayBuffer = await blob.arrayBuffer();
  const decoder = new ImageDecoder({
    data: arrayBuffer,
    type: 'image/webp'
  });

  await decoder.tracks.ready;
  const track = decoder.tracks.selectedTrack;
  const frameCount = track.frameCount;

  if (frameCount <= 1) {
    // Static WebP -> convert to PNG
    const result = await decoder.decode({ frameIndex: 0 });
    const imageBitmap = result.image;
    
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.displayWidth;
    canvas.height = imageBitmap.displayHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0);
    imageBitmap.close();

    const dataUrl = canvas.toDataURL('image/png');
    const newName = originalName.replace(/\.webp$/i, '.png');
    return {
      dataUrl,
      type: 'image/png',
      name: newName
    };
  }

  // Animated WebP -> convert to GIF
  // Step 1: Decode first frame to get size
  const firstFrame = await decoder.decode({ frameIndex: 0 });
  const origW = firstFrame.image.displayWidth;
  const origH = firstFrame.image.displayHeight;
  firstFrame.image.close();

  // Resize if too large to save memory/time
  const maxDim = 500;
  let width = origW;
  let height = origH;
  if (width > maxDim || height > maxDim) {
    const scale = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  // Setup canvas for drawing frames
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Frame skipping if too many frames
  const maxFrames = 60;
  let step = 1;
  if (frameCount > maxFrames) {
    step = Math.ceil(frameCount / maxFrames);
  }

  const gif = GIFEncoder({ auto: false });
  gif.writeHeader();

  for (let i = 0; i < frameCount; i += step) {
    const result = await decoder.decode({ frameIndex: i });
    const frame = result.image;

    // Draw frame to canvas (resizing automatically if dimensions changed)
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(frame, 0, 0, width, height);

    // Get delay and frame duration
    let delay = (frame.duration || 100000) / 1000; // in milliseconds
    frame.close();

    // Multiply delay if we skipped frames to maintain correct animation speed
    if (step > 1) {
      delay = delay * step;
    }

    const imgData = ctx.getImageData(0, 0, width, height);
    const pixels = imgData.data;

    // Quantize with alpha support
    const palette = quantize(pixels, 256, { format: 'rgba4444', oneBitAlpha: true, clearAlpha: true });
    const transparentIndex = palette.findIndex(color => color[3] === 0);
    const hasTransparent = transparentIndex !== -1;

    // Convert palette to RGB for GIF
    const rgbPalette = palette.map(c => [c[0], c[1], c[2]]);
    const index = applyPalette(pixels, palette, 'rgba4444');

    gif.writeFrame(index, width, height, {
      first: i === 0,
      palette: rgbPalette,
      delay,
      transparent: hasTransparent,
      transparentIndex: hasTransparent ? transparentIndex : 0,
      repeat: i === 0 ? 0 : undefined // 0 = loop infinitely, only on first frame
    });
  }

  gif.finish();
  const gifBytes = gif.bytesView();
  const gifBlob = new Blob([gifBytes], { type: 'image/gif' });
  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(gifBlob);
  });

  const newName = originalName.replace(/\.webp$/i, '.gif');
  return {
    dataUrl,
    type: 'image/gif',
    name: newName
  };
}
