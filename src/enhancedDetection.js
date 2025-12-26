/**
 * Enhanced Document Detection Module
 *
 * Provides OpenCV-level document detection with:
 * - CLAHE preprocessing for handling uneven lighting
 * - Sobel/Scharr gradient operators for better edge detection
 * - Adaptive thresholding
 * - Hough Line Transform for precise edge detection
 * - Document validation and confidence scoring
 * - Multi-candidate ranking
 */

import { DEFAULTS } from './constants.js';
import { convertToGrayscale } from './edgeDetection.js';
import init, {
  // Core functions
  blur as wasmBlur,
  canny_edge_detector_full as wasmFullCanny,
  dilate as wasmDilate,

  // New enhanced functions
  sobel_gradients_3x3 as wasmSobel3x3,
  sobel_gradients_3x3_simd as wasmSobel3x3Simd,
  scharr_gradients_3x3 as wasmScharr3x3,
  sobel_gradients_5x5 as wasmSobel5x5,
  gradient_magnitude_direction as wasmGradientMagDir,
  nms_precise as wasmNmsPrecise,

  // Adaptive thresholding
  adaptive_threshold_mean as wasmAdaptiveThresholdMean,
  adaptive_threshold_gaussian as wasmAdaptiveThresholdGaussian,
  adaptive_threshold_sauvola as wasmAdaptiveThresholdSauvola,
  compute_adaptive_canny_thresholds as wasmComputeCannyThresholds,
  otsu_threshold as wasmOtsuThreshold,

  // CLAHE and preprocessing
  clahe as wasmClahe,
  preprocess_document as wasmPreprocessDocument,
  contrast_stretch as wasmContrastStretch,
  illumination_normalize as wasmIlluminationNormalize,

  // Hough transform
  hough_lines as wasmHoughLines,
  hough_lines_p as wasmHoughLinesP,
  find_line_intersections as wasmFindIntersections,
  find_document_quadrilateral as wasmFindQuadrilateral,

  // Document validation
  validate_quadrilateral as wasmValidateQuadrilateral,
  calculate_edge_strength as wasmCalculateEdgeStrength,
  calculate_size_score as wasmCalculateSizeScore,
  calculate_detection_confidence as wasmCalculateConfidence,
  refine_corners_subpixel as wasmRefineCorners,

  // Morphological operations
  morphological_close as wasmMorphClose,
  morphological_open as wasmMorphOpen,
  close_edge_gaps as wasmCloseEdgeGaps,
  remove_small_components as wasmRemoveSmallComponents,
  thin_edges as wasmThinEdges,
} from '../wasm_blur/pkg/wasm_blur.js';

// Initialize WASM
const wasmReady = init();

/**
 * Detection pipeline configuration
 */
export const DETECTION_PRESETS = {
  // Fast detection with reasonable accuracy
  fast: {
    preprocessing: {
      enableClahe: false,
      enableIlluminationNorm: false,
    },
    edge: {
      gradientOperator: 'sobel3x3',
      adaptiveThreshold: false,
      lowThreshold: 50,
      highThreshold: 150,
    },
    postprocessing: {
      closeGaps: false,
      removeNoise: false,
    },
    detection: {
      useHoughLines: false,
      minConfidence: 0.3,
    },
  },

  // Balanced detection (recommended for most cases)
  balanced: {
    preprocessing: {
      enableClahe: true,
      claheClip: 2.0,
      claheGrid: 8,
      enableIlluminationNorm: false,
    },
    edge: {
      gradientOperator: 'sobel3x3',
      adaptiveThreshold: true,
      adaptiveMethod: 'percentile', // 'fixed', 'otsu', 'percentile'
    },
    postprocessing: {
      closeGaps: true,
      gapSize: 5,
      removeNoise: true,
      minComponentArea: 100,
    },
    detection: {
      useHoughLines: true,
      houghThreshold: 50,
      minLineLength: 30,
      maxLineGap: 10,
      minConfidence: 0.4,
    },
  },

  // High accuracy detection (slower but more reliable)
  accurate: {
    preprocessing: {
      enableClahe: true,
      claheClip: 2.5,
      claheGrid: 8,
      enableIlluminationNorm: true,
    },
    edge: {
      gradientOperator: 'scharr3x3', // Better rotational accuracy
      adaptiveThreshold: true,
      adaptiveMethod: 'percentile',
    },
    postprocessing: {
      closeGaps: true,
      gapSize: 7,
      removeNoise: true,
      minComponentArea: 150,
      thinEdges: true,
    },
    detection: {
      useHoughLines: true,
      houghThreshold: 30,
      minLineLength: 20,
      maxLineGap: 15,
      minConfidence: 0.5,
      refineCorners: true,
    },
  },

  // ID document optimized (passports, driver's licenses, ID cards)
  idDocument: {
    preprocessing: {
      enableClahe: true,
      claheClip: 3.0,
      claheGrid: 8,
      enableIlluminationNorm: true,
    },
    edge: {
      gradientOperator: 'scharr3x3',
      adaptiveThreshold: true,
      adaptiveMethod: 'percentile',
    },
    postprocessing: {
      closeGaps: true,
      gapSize: 5,
      removeNoise: true,
      minComponentArea: 100,
    },
    detection: {
      useHoughLines: true,
      houghThreshold: 40,
      minLineLength: 25,
      maxLineGap: 10,
      minConfidence: 0.5,
      refineCorners: true,
      // ID documents have specific aspect ratios
      validateAspectRatio: true,
      expectedAspectRatios: [1.586, 1.42], // CR-80, Passport
      aspectTolerance: 0.15,
    },
  },
};

/**
 * Enhanced preprocessing pipeline
 */
async function preprocessImage(grayscale, width, height, options) {
  await wasmReady;

  let processed = grayscale;
  const timings = [];

  // Step 1: Illumination normalization
  if (options.enableIlluminationNorm) {
    const t0 = performance.now();
    const sigma = Math.min(width, height) / 10;
    processed = wasmIlluminationNormalize(processed, width, height, sigma);
    timings.push({ step: 'Illumination Norm', ms: (performance.now() - t0).toFixed(2) });
  }

  // Step 2: CLAHE
  if (options.enableClahe) {
    const t0 = performance.now();
    processed = wasmClahe(
      processed,
      width,
      height,
      options.claheGrid || 8,
      options.claheGrid || 8,
      options.claheClip || 2.0
    );
    timings.push({ step: 'CLAHE', ms: (performance.now() - t0).toFixed(2) });
  }

  // Step 3: Contrast stretch
  if (options.enableContrastStretch) {
    const t0 = performance.now();
    processed = wasmContrastStretch(processed, width, height);
    timings.push({ step: 'Contrast Stretch', ms: (performance.now() - t0).toFixed(2) });
  }

  return { processed, timings };
}

/**
 * Enhanced gradient calculation
 */
async function calculateGradients(blurred, width, height, options) {
  await wasmReady;

  const operator = options.gradientOperator || 'sobel3x3';
  let gradients;

  const t0 = performance.now();

  switch (operator) {
    case 'scharr3x3':
      gradients = wasmScharr3x3(blurred, width, height);
      break;
    case 'sobel5x5':
      gradients = wasmSobel5x5(blurred, width, height);
      break;
    case 'sobel3x3_simd':
      gradients = wasmSobel3x3Simd(blurred, width, height);
      break;
    case 'sobel3x3':
    default:
      gradients = wasmSobel3x3(blurred, width, height);
      break;
  }

  const elapsed = performance.now() - t0;

  return { gradients, elapsed };
}

/**
 * Compute adaptive Canny thresholds
 */
async function computeAdaptiveThresholds(magnitude, width, height, options) {
  await wasmReady;

  const method = options.adaptiveMethod || 'percentile';

  switch (method) {
    case 'otsu': {
      // Use Otsu's method on magnitude histogram
      const magnitudeU8 = new Uint8Array(magnitude.length);
      const maxMag = Math.max(...magnitude);
      for (let i = 0; i < magnitude.length; i++) {
        magnitudeU8[i] = Math.min(255, Math.floor(magnitude[i] / maxMag * 255));
      }
      const otsuThresh = wasmOtsuThreshold(magnitudeU8, width, height);
      return {
        low: otsuThresh * 0.4 * maxMag / 255,
        high: otsuThresh * maxMag / 255,
      };
    }

    case 'percentile':
    default: {
      const thresholds = wasmComputeCannyThresholds(magnitude, width, height, 0.4, 0.7);
      return {
        low: thresholds[0],
        high: thresholds[1],
      };
    }
  }
}

/**
 * Enhanced edge detection with all improvements
 */
export async function enhancedEdgeDetection(imageData, options = {}) {
  await wasmReady;

  const { width, height } = imageData;
  const config = options.preset ? DETECTION_PRESETS[options.preset] : options;
  const preprocessing = config.preprocessing || {};
  const edgeConfig = config.edge || {};
  const postConfig = config.postprocessing || {};

  const timings = [];
  const debug = options.debug ? {} : null;

  // Step 1: Convert to grayscale
  let t0 = performance.now();
  const grayscale = convertToGrayscale(imageData);
  timings.push({ step: 'Grayscale', ms: (performance.now() - t0).toFixed(2) });

  if (debug) debug.grayscale = grayscale;

  // Step 2: Preprocessing
  const { processed, timings: prepTimings } = await preprocessImage(
    grayscale, width, height, preprocessing
  );
  timings.push(...prepTimings);

  if (debug) debug.preprocessed = processed;

  // Step 3: Gaussian blur
  t0 = performance.now();
  const kernelSize = edgeConfig.kernelSize || 5;
  const sigma = edgeConfig.sigma || 0;
  const blurred = wasmBlur(processed, width, height, kernelSize, sigma);
  timings.push({ step: 'Gaussian Blur', ms: (performance.now() - t0).toFixed(2) });

  if (debug) debug.blurred = blurred;

  // Step 4: Calculate gradients using enhanced operators
  const { gradients, elapsed: gradientTime } = await calculateGradients(
    blurred, width, height, edgeConfig
  );
  timings.push({ step: 'Gradients', ms: gradientTime.toFixed(2) });

  // Step 5: Compute magnitude and direction
  t0 = performance.now();
  const magDir = wasmGradientMagDir(gradients, width, height, true);
  const magnitude = new Float32Array(width * height);
  const direction = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    magnitude[i] = magDir[2 * i];
    direction[i] = magDir[2 * i + 1];
  }
  timings.push({ step: 'Magnitude/Direction', ms: (performance.now() - t0).toFixed(2) });

  if (debug) {
    debug.magnitude = magnitude;
    debug.direction = direction;
    debug.gradients = gradients;
  }

  // Step 6: Non-maximum suppression with precise direction
  t0 = performance.now();
  const suppressed = wasmNmsPrecise(magnitude, direction, width, height);
  timings.push({ step: 'NMS (Precise)', ms: (performance.now() - t0).toFixed(2) });

  if (debug) debug.suppressed = suppressed;

  // Step 7: Compute adaptive thresholds or use fixed
  let lowThreshold = edgeConfig.lowThreshold || 50;
  let highThreshold = edgeConfig.highThreshold || 150;

  if (edgeConfig.adaptiveThreshold) {
    t0 = performance.now();
    const adaptive = await computeAdaptiveThresholds(suppressed, width, height, edgeConfig);
    lowThreshold = adaptive.low;
    highThreshold = adaptive.high;
    timings.push({ step: 'Adaptive Threshold', ms: (performance.now() - t0).toFixed(2) });

    if (debug) {
      debug.adaptiveThresholds = { low: lowThreshold, high: highThreshold };
    }
  }

  // Step 8: Hysteresis thresholding (use full Canny from this point)
  t0 = performance.now();

  // Create binary edge map from suppressed
  const edgeMap = new Uint8Array(width * height);
  for (let i = 0; i < suppressed.length; i++) {
    if (suppressed[i] >= highThreshold) {
      edgeMap[i] = 255;
    } else if (suppressed[i] >= lowThreshold) {
      edgeMap[i] = 128; // Weak edge
    }
  }

  // Connect weak edges to strong edges (simple hysteresis)
  const finalEdges = performHysteresis(edgeMap, width, height);
  timings.push({ step: 'Hysteresis', ms: (performance.now() - t0).toFixed(2) });

  if (debug) debug.beforePost = new Uint8Array(finalEdges);

  // Step 9: Post-processing
  let postProcessed = finalEdges;

  if (postConfig.closeGaps) {
    t0 = performance.now();
    postProcessed = wasmCloseEdgeGaps(postProcessed, width, height, postConfig.gapSize || 5);
    timings.push({ step: 'Close Gaps', ms: (performance.now() - t0).toFixed(2) });
  }

  if (postConfig.removeNoise) {
    t0 = performance.now();
    postProcessed = wasmRemoveSmallComponents(
      postProcessed, width, height, postConfig.minComponentArea || 100
    );
    timings.push({ step: 'Remove Noise', ms: (performance.now() - t0).toFixed(2) });
  }

  if (postConfig.thinEdges) {
    t0 = performance.now();
    postProcessed = wasmThinEdges(postProcessed, width, height);
    timings.push({ step: 'Thin Edges', ms: (performance.now() - t0).toFixed(2) });
  }

  if (debug) {
    debug.finalEdges = postProcessed;
    debug.timings = timings;
  }

  console.table(timings);

  return {
    edges: new Uint8ClampedArray(postProcessed),
    gradients,
    magnitude,
    direction,
    debug,
  };
}

/**
 * Simple hysteresis implementation
 */
function performHysteresis(edgeMap, width, height) {
  const output = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const stack = [];

  // Find strong edges
  for (let i = 0; i < edgeMap.length; i++) {
    if (edgeMap[i] === 255) {
      output[i] = 255;
      stack.push(i);
    }
  }

  // Propagate to connected weak edges
  const offsets = [-width - 1, -width, -width + 1, -1, 1, width - 1, width, width + 1];

  while (stack.length > 0) {
    const idx = stack.pop();
    const x = idx % width;
    const y = Math.floor(idx / width);

    for (const offset of offsets) {
      const nidx = idx + offset;
      const nx = nidx % width;

      // Check bounds and avoid wrap-around
      if (nidx >= 0 && nidx < edgeMap.length &&
          Math.abs(nx - x) <= 1 && !visited[nidx]) {
        visited[nidx] = 1;

        if (edgeMap[nidx] === 128) { // Weak edge
          output[nidx] = 255;
          stack.push(nidx);
        }
      }
    }
  }

  return output;
}

/**
 * Detect document using Hough Line Transform
 */
export async function detectDocumentHough(edges, width, height, options = {}) {
  await wasmReady;

  const config = options.detection || options;
  const timings = [];

  // Step 1: Hough Line Transform
  let t0 = performance.now();
  const lines = wasmHoughLines(
    edges,
    width,
    height,
    1.0, // rho resolution
    1.0, // theta resolution (degrees)
    config.houghThreshold || 50,
    100  // max lines
  );
  timings.push({ step: 'Hough Lines', ms: (performance.now() - t0).toFixed(2) });

  const numLines = lines.length / 3;
  console.log(`Detected ${numLines} lines`);

  if (numLines < 4) {
    return {
      success: false,
      message: 'Not enough lines detected',
      timings,
    };
  }

  // Step 2: Find document quadrilateral
  t0 = performance.now();
  const quad = wasmFindQuadrilateral(
    lines,
    width,
    height,
    config.minAreaRatio || 0.05,
    config.maxAreaRatio || 0.95
  );
  timings.push({ step: 'Find Quadrilateral', ms: (performance.now() - t0).toFixed(2) });

  if (quad.length === 0) {
    return {
      success: false,
      message: 'No valid quadrilateral found',
      lines: parseLines(lines),
      timings,
    };
  }

  // Extract corners and confidence
  const corners = {
    topLeft: { x: quad[0], y: quad[1] },
    topRight: { x: quad[2], y: quad[3] },
    bottomRight: { x: quad[4], y: quad[5] },
    bottomLeft: { x: quad[6], y: quad[7] },
  };
  const lineConfidence = quad[8];

  // Step 3: Validate quadrilateral
  t0 = performance.now();
  const validation = wasmValidateQuadrilateral(new Float32Array([
    quad[0], quad[1], quad[2], quad[3], quad[4], quad[5], quad[6], quad[7]
  ]));
  timings.push({ step: 'Validate Quad', ms: (performance.now() - t0).toFixed(2) });

  const validationResult = {
    shapeScore: validation[0],
    convexityScore: validation[1],
    angleScore: validation[2],
    parallelismScore: validation[3],
    aspectRatio: validation[4],
    aspectScore: validation[5],
    documentType: ['unknown', 'id_card', 'passport', 'paper'][validation[6]] || 'unknown',
  };

  // Step 4: Calculate size score
  const sizeScore = wasmCalculateSizeScore(
    new Float32Array([quad[0], quad[1], quad[2], quad[3], quad[4], quad[5], quad[6], quad[7]]),
    width,
    height,
    0.05, // min coverage
    0.95, // max coverage
    0.3   // ideal coverage
  );

  // Step 5: Calculate overall confidence
  const confidence = wasmCalculateConfidence(
    lineConfidence / 100, // Normalize line confidence
    validationResult.shapeScore,
    validationResult.aspectScore,
    sizeScore
  );

  console.table(timings);

  return {
    success: confidence >= (config.minConfidence || 0.4),
    corners,
    confidence,
    validation: validationResult,
    sizeScore,
    lines: parseLines(lines),
    timings,
  };
}

/**
 * Parse flat line array into structured format
 */
function parseLines(lines) {
  const result = [];
  for (let i = 0; i < lines.length; i += 3) {
    result.push({
      rho: lines[i],
      theta: lines[i + 1],
      thetaDegrees: lines[i + 1] * 180 / Math.PI,
      votes: lines[i + 2],
    });
  }
  return result;
}

/**
 * Complete enhanced document detection pipeline
 */
export async function enhancedDocumentDetection(imageData, options = {}) {
  await wasmReady;

  const preset = options.preset || 'balanced';
  const config = DETECTION_PRESETS[preset] || DETECTION_PRESETS.balanced;

  // Merge options with preset
  const mergedConfig = {
    ...config,
    ...options,
    preprocessing: { ...config.preprocessing, ...options.preprocessing },
    edge: { ...config.edge, ...options.edge },
    postprocessing: { ...config.postprocessing, ...options.postprocessing },
    detection: { ...config.detection, ...options.detection },
  };

  const { width, height } = imageData;
  const debug = options.debug ? {} : null;

  // Step 1: Enhanced edge detection
  const edgeResult = await enhancedEdgeDetection(imageData, {
    ...mergedConfig,
    debug: debug ? {} : null,
  });

  if (debug) {
    debug.edgeDetection = edgeResult.debug;
  }

  // Step 2: Document detection using Hough or contour method
  let detection;

  if (mergedConfig.detection.useHoughLines) {
    detection = await detectDocumentHough(
      edgeResult.edges,
      width,
      height,
      mergedConfig
    );

    // If Hough fails, fall back to contour detection
    if (!detection.success) {
      console.log('Hough detection failed, trying contour detection...');
      // Import and use the existing contour detection
      const { detectDocumentContour } = await import('./contourDetection.js');
      const { findCornerPoints } = await import('./cornerDetection.js');

      const contours = detectDocumentContour(edgeResult.edges, {
        minArea: 1000,
        width,
        height,
      });

      if (contours && contours.length > 0) {
        const corners = findCornerPoints(contours[0]);

        // Validate the contour-detected corners
        const cornersArray = new Float32Array([
          corners.topLeft.x, corners.topLeft.y,
          corners.topRight.x, corners.topRight.y,
          corners.bottomRight.x, corners.bottomRight.y,
          corners.bottomLeft.x, corners.bottomLeft.y,
        ]);

        const validation = wasmValidateQuadrilateral(cornersArray);
        const sizeScore = wasmCalculateSizeScore(cornersArray, width, height, 0.05, 0.95, 0.3);

        // Calculate edge strength using gradients
        const edgeScore = wasmCalculateEdgeStrength(
          edgeResult.gradients,
          width,
          height,
          cornersArray,
          20 // sample points
        );

        const confidence = wasmCalculateConfidence(edgeScore, validation[0], validation[5], sizeScore);

        detection = {
          success: confidence >= (mergedConfig.detection.minConfidence || 0.4),
          corners,
          confidence,
          validation: {
            shapeScore: validation[0],
            convexityScore: validation[1],
            angleScore: validation[2],
            parallelismScore: validation[3],
            aspectRatio: validation[4],
            aspectScore: validation[5],
            documentType: ['unknown', 'id_card', 'passport', 'paper'][validation[6]] || 'unknown',
          },
          sizeScore,
          edgeScore,
          method: 'contour',
        };
      }
    } else {
      detection.method = 'hough';
    }
  } else {
    // Use contour detection directly
    const { detectDocumentContour } = await import('./contourDetection.js');
    const { findCornerPoints } = await import('./cornerDetection.js');

    const contours = detectDocumentContour(edgeResult.edges, {
      minArea: 1000,
      width,
      height,
    });

    if (contours && contours.length > 0) {
      const corners = findCornerPoints(contours[0]);

      const cornersArray = new Float32Array([
        corners.topLeft.x, corners.topLeft.y,
        corners.topRight.x, corners.topRight.y,
        corners.bottomRight.x, corners.bottomRight.y,
        corners.bottomLeft.x, corners.bottomLeft.y,
      ]);

      const validation = wasmValidateQuadrilateral(cornersArray);
      const sizeScore = wasmCalculateSizeScore(cornersArray, width, height, 0.05, 0.95, 0.3);
      const edgeScore = wasmCalculateEdgeStrength(edgeResult.gradients, width, height, cornersArray, 20);
      const confidence = wasmCalculateConfidence(edgeScore, validation[0], validation[5], sizeScore);

      detection = {
        success: confidence >= (mergedConfig.detection.minConfidence || 0.4),
        corners,
        confidence,
        validation: {
          shapeScore: validation[0],
          convexityScore: validation[1],
          angleScore: validation[2],
          parallelismScore: validation[3],
          aspectRatio: validation[4],
          aspectScore: validation[5],
          documentType: ['unknown', 'id_card', 'passport', 'paper'][validation[6]] || 'unknown',
        },
        sizeScore,
        edgeScore,
        method: 'contour',
      };
    } else {
      detection = {
        success: false,
        message: 'No document contours found',
      };
    }
  }

  // Step 3: Refine corners if enabled and detection succeeded
  if (detection.success && mergedConfig.detection.refineCorners && detection.corners) {
    const cornersArray = new Float32Array([
      detection.corners.topLeft.x, detection.corners.topLeft.y,
      detection.corners.topRight.x, detection.corners.topRight.y,
      detection.corners.bottomRight.x, detection.corners.bottomRight.y,
      detection.corners.bottomLeft.x, detection.corners.bottomLeft.y,
    ]);

    const refined = wasmRefineCorners(edgeResult.gradients, width, height, cornersArray, 5);

    detection.corners = {
      topLeft: { x: refined[0], y: refined[1] },
      topRight: { x: refined[2], y: refined[3] },
      bottomRight: { x: refined[4], y: refined[5] },
      bottomLeft: { x: refined[6], y: refined[7] },
    };
    detection.cornersRefined = true;
  }

  if (debug) {
    debug.detection = detection;
    debug.edges = edgeResult.edges;
  }

  return {
    ...detection,
    edges: edgeResult.edges,
    debug,
  };
}

/**
 * Quick document detection for live camera preview
 * Uses fastest settings for real-time performance
 */
export async function quickDocumentDetection(imageData, options = {}) {
  return enhancedDocumentDetection(imageData, {
    preset: 'fast',
    ...options,
  });
}

/**
 * ID document detection optimized for passports and ID cards
 */
export async function detectIDDocument(imageData, options = {}) {
  return enhancedDocumentDetection(imageData, {
    preset: 'idDocument',
    ...options,
  });
}

// Export presets for customization
export { DETECTION_PRESETS as presets };
