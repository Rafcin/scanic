/**
 * Image Enhancement Module
 *
 * Provides a comprehensive set of image enhancement filters including:
 * - Color adjustments (brightness, contrast, saturation, hue)
 * - Sharpening (unsharp mask, edge enhancement)
 * - Artistic filters (vintage, sepia, sketch, emboss)
 * - Document-specific enhancements (deskew, auto-levels, binarize)
 * - Noise reduction
 *
 * @module imageEnhancement
 */

import init, {
  // Color adjustments
  adjust_brightness as wasmBrightness,
  adjust_contrast as wasmContrast,
  adjust_saturation as wasmSaturation,
  adjust_hue as wasmHue,
  adjust_temperature as wasmTemperature,
  apply_gamma as wasmGamma,
  auto_levels as wasmAutoLevels,

  // Sharpening
  unsharp_mask as wasmUnsharpMask,
  enhance_edges as wasmEnhanceEdges,

  // Artistic filters
  sepia_filter as wasmSepia,
  vintage_filter as wasmVintage,
  vignette_filter as wasmVignette,
  posterize_filter as wasmPosterize,
  invert_filter as wasmInvert,
  emboss_filter as wasmEmboss,
  sketch_filter as wasmSketch,

  // Document enhancements
  detect_skew_angle as wasmDetectSkew,
  enhance_text_document as wasmEnhanceText,
  binarize_document as wasmBinarize,
  remove_background_white as wasmRemoveBackground,

  // Noise reduction
  denoise_nlm as wasmDenoiseNLM,

  // Existing filters from other modules
  clahe as wasmClahe,
  histogram_equalization as wasmHistogramEq,
  bilateral_filter as wasmBilateral,
  guided_filter as wasmGuided,
  remove_shadows_retinex as wasmShadowRemoval,
  auto_white_balance as wasmWhiteBalance,
  median_filter as wasmMedian,
} from '../wasm_blur/pkg/wasm_blur.js';

// Initialize WASM module
const wasmReady = init();

/**
 * Available filter types
 */
export const FilterType = {
  // Color adjustments
  BRIGHTNESS: 'brightness',
  CONTRAST: 'contrast',
  SATURATION: 'saturation',
  HUE: 'hue',
  TEMPERATURE: 'temperature',
  GAMMA: 'gamma',
  AUTO_LEVELS: 'auto_levels',

  // Blur/Smoothing
  GAUSSIAN_BLUR: 'gaussian_blur',
  BILATERAL: 'bilateral',
  MEDIAN: 'median',
  GUIDED: 'guided',

  // Sharpening
  UNSHARP_MASK: 'unsharp_mask',
  EDGE_ENHANCE: 'edge_enhance',

  // Enhancement
  CLAHE: 'clahe',
  HISTOGRAM_EQ: 'histogram_eq',
  SHADOW_REMOVAL: 'shadow_removal',
  WHITE_BALANCE: 'white_balance',
  DENOISE: 'denoise',

  // Artistic
  SEPIA: 'sepia',
  VINTAGE: 'vintage',
  VIGNETTE: 'vignette',
  POSTERIZE: 'posterize',
  INVERT: 'invert',
  EMBOSS: 'emboss',
  SKETCH: 'sketch',
  GRAYSCALE: 'grayscale',

  // Document
  BINARIZE: 'binarize',
  ENHANCE_TEXT: 'enhance_text',
  REMOVE_BACKGROUND: 'remove_background',
};

/**
 * Document enhancement presets
 */
export const EnhancementPresets = {
  auto: {
    filters: [
      { filter: FilterType.AUTO_LEVELS },
      { filter: FilterType.CLAHE, params: { clipLimit: 2.0, gridSize: 8 } },
      { filter: FilterType.UNSHARP_MASK, params: { amount: 30, radius: 1, threshold: 3 } },
    ],
  },
  photo: {
    filters: [
      { filter: FilterType.AUTO_LEVELS },
      { filter: FilterType.SATURATION, params: { amount: 10 } },
      { filter: FilterType.CONTRAST, params: { amount: 5 } },
    ],
  },
  text: {
    filters: [
      { filter: FilterType.CLAHE, params: { clipLimit: 3.0, gridSize: 8 } },
      { filter: FilterType.ENHANCE_TEXT },
      { filter: FilterType.UNSHARP_MASK, params: { amount: 50, radius: 1, threshold: 5 } },
    ],
  },
  whiteboard: {
    filters: [
      { filter: FilterType.WHITE_BALANCE },
      { filter: FilterType.REMOVE_BACKGROUND, params: { threshold: 200 } },
      { filter: FilterType.CONTRAST, params: { amount: 30 } },
    ],
  },
  receipt: {
    filters: [
      { filter: FilterType.SHADOW_REMOVAL },
      { filter: FilterType.CLAHE, params: { clipLimit: 2.5, gridSize: 8 } },
      { filter: FilterType.BINARIZE, params: { blockSize: 15 } },
    ],
  },
  handwriting: {
    filters: [
      { filter: FilterType.CLAHE, params: { clipLimit: 2.0, gridSize: 8 } },
      { filter: FilterType.ENHANCE_TEXT },
      { filter: FilterType.UNSHARP_MASK, params: { amount: 40, radius: 1, threshold: 3 } },
    ],
  },
};

/**
 * Get ImageData from various input types
 * @private
 */
function getImageData(image) {
  if (image instanceof ImageData) {
    return image;
  }

  const canvas = document.createElement('canvas');
  canvas.width = image.width || image.naturalWidth;
  canvas.height = image.height || image.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Create ImageData from processed pixels
 * @private
 */
function createImageData(pixels, width, height) {
  const imageData = new ImageData(width, height);
  imageData.data.set(new Uint8ClampedArray(pixels));
  return imageData;
}

/**
 * Apply a single image filter
 *
 * @param {ImageInput} image - Image to process
 * @param {string} filter - Filter type from FilterType enum
 * @param {Object} [params={}] - Filter parameters
 * @returns {Promise<ImageData>} Processed image data
 *
 * @example
 * const result = await applyFilter(img, 'brightness', { amount: 20 });
 */
export async function applyFilter(image, filter, params = {}) {
  await wasmReady;

  const imageData = getImageData(image);
  const { data, width, height } = imageData;
  const input = new Uint8Array(data);

  let result;

  switch (filter) {
    // Color adjustments
    case FilterType.BRIGHTNESS:
      result = wasmBrightness(input, width, height, params.amount || 0);
      break;

    case FilterType.CONTRAST:
      result = wasmContrast(input, width, height, params.amount || 0);
      break;

    case FilterType.SATURATION:
      result = wasmSaturation(input, width, height, params.amount || 0);
      break;

    case FilterType.HUE:
      result = wasmHue(input, width, height, params.degrees || 0);
      break;

    case FilterType.TEMPERATURE:
      result = wasmTemperature(input, width, height, params.amount || 0);
      break;

    case FilterType.GAMMA:
      result = wasmGamma(input, width, height, params.gamma || 1.0);
      break;

    case FilterType.AUTO_LEVELS:
      result = wasmAutoLevels(input, width, height);
      break;

    // Sharpening
    case FilterType.UNSHARP_MASK:
      result = wasmUnsharpMask(
        input,
        width,
        height,
        params.amount || 50,
        params.radius || 1,
        params.threshold || 3
      );
      break;

    case FilterType.EDGE_ENHANCE:
      result = wasmEnhanceEdges(input, width, height, params.strength || 50);
      break;

    // Artistic filters
    case FilterType.SEPIA:
      result = wasmSepia(input, width, height, params.intensity || 100);
      break;

    case FilterType.VINTAGE:
      result = wasmVintage(input, width, height);
      break;

    case FilterType.VIGNETTE:
      result = wasmVignette(
        input,
        width,
        height,
        params.strength || 50,
        params.radius || 80
      );
      break;

    case FilterType.POSTERIZE:
      result = wasmPosterize(input, width, height, params.levels || 4);
      break;

    case FilterType.INVERT:
      result = wasmInvert(input, width, height);
      break;

    case FilterType.EMBOSS:
      result = wasmEmboss(input, width, height, params.strength || 100);
      break;

    case FilterType.SKETCH:
      result = wasmSketch(input, width, height, params.edgeStrength || 100);
      break;

    case FilterType.GRAYSCALE: {
      // Simple grayscale conversion
      result = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i += 4) {
        const gray = Math.round(
          0.299 * input[i] + 0.587 * input[i + 1] + 0.114 * input[i + 2]
        );
        result[i] = gray;
        result[i + 1] = gray;
        result[i + 2] = gray;
        result[i + 3] = input[i + 3];
      }
      break;
    }

    // Enhancement
    case FilterType.CLAHE: {
      // Need to convert to grayscale first for CLAHE
      const gray = new Uint8Array(width * height);
      for (let i = 0; i < gray.length; i++) {
        const idx = i * 4;
        gray[i] = Math.round(
          0.299 * input[idx] + 0.587 * input[idx + 1] + 0.114 * input[idx + 2]
        );
      }
      const claheResult = wasmClahe(
        gray,
        width,
        height,
        params.gridSize || 8,
        params.gridSize || 8,
        params.clipLimit || 2.0
      );
      result = new Uint8Array(input.length);
      for (let i = 0; i < claheResult.length; i++) {
        const idx = i * 4;
        // Apply CLAHE to all channels proportionally
        const scale = claheResult[i] / Math.max(1, gray[i]);
        result[idx] = Math.min(255, Math.round(input[idx] * scale));
        result[idx + 1] = Math.min(255, Math.round(input[idx + 1] * scale));
        result[idx + 2] = Math.min(255, Math.round(input[idx + 2] * scale));
        result[idx + 3] = input[idx + 3];
      }
      break;
    }

    case FilterType.HISTOGRAM_EQ: {
      const gray = new Uint8Array(width * height);
      for (let i = 0; i < gray.length; i++) {
        const idx = i * 4;
        gray[i] = Math.round(
          0.299 * input[idx] + 0.587 * input[idx + 1] + 0.114 * input[idx + 2]
        );
      }
      const histResult = wasmHistogramEq(gray, width, height);
      result = new Uint8Array(input.length);
      for (let i = 0; i < histResult.length; i++) {
        const idx = i * 4;
        const scale = histResult[i] / Math.max(1, gray[i]);
        result[idx] = Math.min(255, Math.round(input[idx] * scale));
        result[idx + 1] = Math.min(255, Math.round(input[idx + 1] * scale));
        result[idx + 2] = Math.min(255, Math.round(input[idx + 2] * scale));
        result[idx + 3] = input[idx + 3];
      }
      break;
    }

    case FilterType.SHADOW_REMOVAL: {
      const gray = new Uint8Array(width * height);
      for (let i = 0; i < gray.length; i++) {
        const idx = i * 4;
        gray[i] = Math.round(
          0.299 * input[idx] + 0.587 * input[idx + 1] + 0.114 * input[idx + 2]
        );
      }
      const shadowResult = wasmShadowRemoval(
        gray,
        width,
        height,
        params.sigma1 || 15.0,
        params.sigma2 || 80.0,
        params.sigma3 || 250.0
      );
      result = new Uint8Array(input.length);
      for (let i = 0; i < shadowResult.length; i++) {
        const idx = i * 4;
        const scale = shadowResult[i] / Math.max(1, gray[i]);
        result[idx] = Math.min(255, Math.round(input[idx] * scale));
        result[idx + 1] = Math.min(255, Math.round(input[idx + 1] * scale));
        result[idx + 2] = Math.min(255, Math.round(input[idx + 2] * scale));
        result[idx + 3] = input[idx + 3];
      }
      break;
    }

    case FilterType.WHITE_BALANCE:
      result = wasmWhiteBalance(input, width, height);
      break;

    case FilterType.BILATERAL: {
      const gray = new Uint8Array(width * height);
      for (let i = 0; i < gray.length; i++) {
        const idx = i * 4;
        gray[i] = Math.round(
          0.299 * input[idx] + 0.587 * input[idx + 1] + 0.114 * input[idx + 2]
        );
      }
      const bilateralResult = wasmBilateral(
        gray,
        width,
        height,
        params.d || 9,
        params.sigmaColor || 75,
        params.sigmaSpace || 75
      );
      result = new Uint8Array(input.length);
      for (let i = 0; i < bilateralResult.length; i++) {
        const idx = i * 4;
        result[idx] = bilateralResult[i];
        result[idx + 1] = bilateralResult[i];
        result[idx + 2] = bilateralResult[i];
        result[idx + 3] = input[idx + 3];
      }
      break;
    }

    case FilterType.MEDIAN: {
      const gray = new Uint8Array(width * height);
      for (let i = 0; i < gray.length; i++) {
        const idx = i * 4;
        gray[i] = Math.round(
          0.299 * input[idx] + 0.587 * input[idx + 1] + 0.114 * input[idx + 2]
        );
      }
      const medianResult = wasmMedian(gray, width, height, params.kernelSize || 3);
      result = new Uint8Array(input.length);
      for (let i = 0; i < medianResult.length; i++) {
        const idx = i * 4;
        result[idx] = medianResult[i];
        result[idx + 1] = medianResult[i];
        result[idx + 2] = medianResult[i];
        result[idx + 3] = input[idx + 3];
      }
      break;
    }

    case FilterType.GUIDED: {
      const gray = new Uint8Array(width * height);
      for (let i = 0; i < gray.length; i++) {
        const idx = i * 4;
        gray[i] = Math.round(
          0.299 * input[idx] + 0.587 * input[idx + 1] + 0.114 * input[idx + 2]
        );
      }
      const guidedResult = wasmGuided(
        gray,
        gray,
        width,
        height,
        params.radius || 8,
        params.eps || 0.01
      );
      result = new Uint8Array(input.length);
      for (let i = 0; i < guidedResult.length; i++) {
        const idx = i * 4;
        result[idx] = Math.min(255, Math.max(0, Math.round(guidedResult[i])));
        result[idx + 1] = result[idx];
        result[idx + 2] = result[idx];
        result[idx + 3] = input[idx + 3];
      }
      break;
    }

    case FilterType.DENOISE:
      result = wasmDenoiseNLM(
        input,
        width,
        height,
        params.strength || 10,
        params.patchSize || 7,
        params.searchSize || 21
      );
      break;

    // Document-specific
    case FilterType.BINARIZE:
      result = wasmBinarize(input, width, height, params.blockSize || 11);
      break;

    case FilterType.ENHANCE_TEXT:
      result = wasmEnhanceText(input, width, height);
      break;

    case FilterType.REMOVE_BACKGROUND:
      result = wasmRemoveBackground(input, width, height, params.threshold || 220);
      break;

    default:
      throw new Error(`Unknown filter type: ${filter}`);
  }

  return createImageData(result, width, height);
}

/**
 * Apply multiple filters in sequence
 *
 * @param {ImageInput} image - Image to process
 * @param {Array<{filter: string, params?: Object}>} filters - Array of filters to apply
 * @returns {Promise<ImageData>} Processed image data
 *
 * @example
 * const result = await applyFilters(img, [
 *   { filter: 'brightness', params: { amount: 20 } },
 *   { filter: 'contrast', params: { amount: 10 } },
 *   { filter: 'sepia', params: { intensity: 50 } }
 * ]);
 */
export async function applyFilters(image, filters) {
  let result = getImageData(image);

  for (const { filter, params } of filters) {
    result = await applyFilter(result, filter, params || {});
  }

  return result;
}

/**
 * Auto-enhance a document image using a preset
 *
 * @param {ImageInput} image - Document image to enhance
 * @param {Object} [options={}] - Enhancement options
 * @param {string} [options.preset='auto'] - Enhancement preset name
 * @param {boolean} [options.autoRotate=false] - Auto-rotate based on text
 * @param {boolean} [options.deskew=false] - Correct skew angle
 * @returns {Promise<{image: ImageData, angle?: number}>} Enhanced image and detected angle
 *
 * @example
 * const { image, angle } = await autoEnhanceDocument(img, {
 *   preset: 'text',
 *   deskew: true
 * });
 */
export async function autoEnhanceDocument(image, options = {}) {
  await wasmReady;

  const preset = options.preset || 'auto';
  const presetConfig = EnhancementPresets[preset] || EnhancementPresets.auto;

  let imageData = getImageData(image);
  const { width, height } = imageData;

  // Detect skew angle if requested
  let angle = 0;
  if (options.deskew || options.autoRotate) {
    const input = new Uint8Array(imageData.data);
    angle = wasmDetectSkew(input, width, height);
  }

  // Apply preset filters
  let result = await applyFilters(imageData, presetConfig.filters);

  // Apply custom color adjustments if provided
  if (options.colorAdjust) {
    const adj = options.colorAdjust;
    if (adj.brightness) {
      result = await applyFilter(result, FilterType.BRIGHTNESS, { amount: adj.brightness });
    }
    if (adj.contrast) {
      result = await applyFilter(result, FilterType.CONTRAST, { amount: adj.contrast });
    }
    if (adj.saturation) {
      result = await applyFilter(result, FilterType.SATURATION, { amount: adj.saturation });
    }
    if (adj.hue) {
      result = await applyFilter(result, FilterType.HUE, { degrees: adj.hue });
    }
    if (adj.gamma) {
      result = await applyFilter(result, FilterType.GAMMA, { gamma: adj.gamma });
    }
    if (adj.temperature) {
      result = await applyFilter(result, FilterType.TEMPERATURE, { amount: adj.temperature });
    }
  }

  // Apply sharpening if provided
  if (options.sharpen) {
    result = await applyFilter(result, FilterType.UNSHARP_MASK, options.sharpen);
  }

  // Apply noise reduction if provided
  if (options.noiseReduction) {
    if (options.noiseReduction.useBilateral) {
      result = await applyFilter(result, FilterType.BILATERAL, options.noiseReduction);
    } else {
      result = await applyFilter(result, FilterType.DENOISE, options.noiseReduction);
    }
  }

  // Convert to black and white if requested
  if (options.blackAndWhite) {
    result = await applyFilter(result, FilterType.BINARIZE, { blockSize: 15 });
  }

  return {
    image: result,
    angle: angle !== 0 ? angle : undefined,
  };
}

/**
 * Adjust colors of an image
 *
 * @param {ImageInput} image - Image to adjust
 * @param {Object} options - Color adjustment options
 * @returns {Promise<ImageData>} Adjusted image
 */
export async function adjustColors(image, options) {
  let result = getImageData(image);

  if (options.brightness !== undefined) {
    result = await applyFilter(result, FilterType.BRIGHTNESS, { amount: options.brightness });
  }
  if (options.contrast !== undefined) {
    result = await applyFilter(result, FilterType.CONTRAST, { amount: options.contrast });
  }
  if (options.saturation !== undefined) {
    result = await applyFilter(result, FilterType.SATURATION, { amount: options.saturation });
  }
  if (options.hue !== undefined) {
    result = await applyFilter(result, FilterType.HUE, { degrees: options.hue });
  }
  if (options.gamma !== undefined) {
    result = await applyFilter(result, FilterType.GAMMA, { gamma: options.gamma });
  }
  if (options.temperature !== undefined) {
    result = await applyFilter(result, FilterType.TEMPERATURE, { amount: options.temperature });
  }

  return result;
}

/**
 * Sharpen an image
 *
 * @param {ImageInput} image - Image to sharpen
 * @param {Object} [options={}] - Sharpening options
 * @returns {Promise<ImageData>} Sharpened image
 */
export async function sharpen(image, options = {}) {
  return applyFilter(image, FilterType.UNSHARP_MASK, {
    amount: options.amount || 50,
    radius: options.radius || 1,
    threshold: options.threshold || 3,
  });
}

/**
 * Reduce noise in an image
 *
 * @param {ImageInput} image - Image to denoise
 * @param {Object} [options={}] - Noise reduction options
 * @returns {Promise<ImageData>} Denoised image
 */
export async function reduceNoise(image, options = {}) {
  if (options.useBilateral) {
    return applyFilter(image, FilterType.BILATERAL, {
      d: options.d || 9,
      sigmaColor: options.sigmaColor || 75,
      sigmaSpace: options.sigmaSpace || 75,
    });
  }
  return applyFilter(image, FilterType.DENOISE, {
    strength: options.strength || 10,
    patchSize: options.patchSize || 7,
    searchSize: options.searchSize || 21,
  });
}

/**
 * Remove shadows from an image
 *
 * @param {ImageInput} image - Image to process
 * @returns {Promise<ImageData>} Image with shadows removed
 */
export async function removeShadows(image) {
  return applyFilter(image, FilterType.SHADOW_REMOVAL);
}

/**
 * Apply automatic white balance
 *
 * @param {ImageInput} image - Image to process
 * @returns {Promise<ImageData>} White-balanced image
 */
export async function autoWhiteBalance(image) {
  return applyFilter(image, FilterType.WHITE_BALANCE);
}

/**
 * Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
 *
 * @param {ImageInput} image - Image to process
 * @param {number} [clipLimit=2.0] - Clip limit for histogram
 * @param {number} [gridSize=8] - Grid size for tiles
 * @returns {Promise<ImageData>} Enhanced image
 */
export async function applyCLAHE(image, clipLimit = 2.0, gridSize = 8) {
  return applyFilter(image, FilterType.CLAHE, { clipLimit, gridSize });
}

/**
 * Detect and return skew angle of document
 *
 * @param {ImageInput} image - Document image
 * @returns {Promise<number>} Skew angle in degrees
 */
export async function detectSkewAngle(image) {
  await wasmReady;
  const imageData = getImageData(image);
  const input = new Uint8Array(imageData.data);
  return wasmDetectSkew(input, imageData.width, imageData.height);
}

/**
 * Deskew a document image
 *
 * @param {ImageInput} image - Document image to deskew
 * @returns {Promise<{image: ImageData, angle: number}>} Deskewed image and angle
 */
export async function deskew(image) {
  await wasmReady;
  const imageData = getImageData(image);
  const input = new Uint8Array(imageData.data);
  const angle = wasmDetectSkew(input, imageData.width, imageData.height);

  // If angle is very small, don't rotate
  if (Math.abs(angle) < 0.5) {
    return { image: imageData, angle: 0 };
  }

  // Rotate the image to correct skew
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Calculate new canvas size to fit rotated image
  const radians = angle * Math.PI / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const newWidth = Math.ceil(imageData.width * cos + imageData.height * sin);
  const newHeight = Math.ceil(imageData.width * sin + imageData.height * cos);

  canvas.width = newWidth;
  canvas.height = newHeight;

  // Create temporary canvas with original image
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(imageData, 0, 0);

  // Rotate and draw
  ctx.translate(newWidth / 2, newHeight / 2);
  ctx.rotate(-radians); // Negative to correct the skew
  ctx.translate(-imageData.width / 2, -imageData.height / 2);
  ctx.drawImage(tempCanvas, 0, 0);

  return {
    image: ctx.getImageData(0, 0, newWidth, newHeight),
    angle: -angle,
  };
}

/**
 * Image enhancement operations object for easy access
 */
export const imageEnhancement = {
  applyFilter,
  applyFilters,
  autoEnhanceDocument,
  adjustColors,
  sharpen,
  reduceNoise,
  removeShadows,
  autoWhiteBalance,
  applyCLAHE,
  detectSkewAngle,
  deskew,
  FilterType,
  EnhancementPresets,
};

export default imageEnhancement;
