/**
 * Mock WASM module for testing
 * Provides stub implementations of WASM functions
 */

// Mock init function - returns a resolved promise
export default async function init() {
  return Promise.resolve();
}

// === Core edge detection functions ===

// Mock blur function
export function blur(grayscale, width, height, kernelSize, sigma) {
  return new Uint8ClampedArray(grayscale);
}

// Mock gradients calculation
export function calculate_gradients(grayscale, width, height) {
  const size = width * height;
  return {
    magnitude: new Float32Array(size),
    direction: new Float32Array(size),
  };
}

// Mock dilate function
export function dilate(data, width, height, kernelSize) {
  return new Uint8ClampedArray(data);
}

// Mock non-maximum suppression
export function non_maximum_suppression(magnitude, direction, width, height) {
  return new Float32Array(magnitude.length);
}

// Mock full canny edge detector
export function canny_edge_detector_full(grayscale, width, height, lowThreshold, highThreshold, kernelSize, sigma) {
  return new Uint8ClampedArray(grayscale.length);
}

// Mock hysteresis thresholding
export function hysteresis_thresholding(nms, width, height, lowThreshold, highThreshold) {
  return new Uint8ClampedArray(nms.length);
}

// Mock binary hysteresis thresholding
export function hysteresis_thresholding_binary(nms, width, height, lowThreshold, highThreshold) {
  return new Uint8ClampedArray(nms.length);
}

// === Enhanced gradient functions ===

export function sobel_gradients_3x3(grayscale, width, height) {
  const size = width * height;
  return { gx: new Float32Array(size), gy: new Float32Array(size) };
}

export function sobel_gradients_3x3_simd(grayscale, width, height) {
  const size = width * height;
  return { gx: new Float32Array(size), gy: new Float32Array(size) };
}

export function scharr_gradients_3x3(grayscale, width, height) {
  const size = width * height;
  return { gx: new Float32Array(size), gy: new Float32Array(size) };
}

export function sobel_gradients_5x5(grayscale, width, height) {
  const size = width * height;
  return { gx: new Float32Array(size), gy: new Float32Array(size) };
}

export function gradient_magnitude_direction(gx, gy, width, height) {
  const size = width * height;
  return { magnitude: new Float32Array(size), direction: new Float32Array(size) };
}

export function nms_precise(magnitude, direction, width, height) {
  return new Float32Array(magnitude.length);
}

// === Adaptive thresholding ===

export function adaptive_threshold_mean(grayscale, width, height, blockSize, c) {
  return new Uint8ClampedArray(grayscale.length);
}

export function adaptive_threshold_gaussian(grayscale, width, height, blockSize, c, sigma) {
  return new Uint8ClampedArray(grayscale.length);
}

export function adaptive_threshold_sauvola(grayscale, width, height, blockSize, k, r) {
  return new Uint8ClampedArray(grayscale.length);
}

export function compute_adaptive_canny_thresholds(grayscale, width, height) {
  return { low: 50, high: 150 };
}

export function otsu_threshold(grayscale, width, height) {
  return 128;
}

// === CLAHE and preprocessing ===

export function clahe(grayscale, width, height, clipLimit, gridSize) {
  return new Uint8ClampedArray(grayscale);
}

export function preprocess_document(grayscale, width, height, options) {
  return new Uint8ClampedArray(grayscale);
}

export function contrast_stretch(grayscale, width, height, lowPct, highPct) {
  return new Uint8ClampedArray(grayscale);
}

export function illumination_normalize(grayscale, width, height, kernelSize) {
  return new Uint8ClampedArray(grayscale);
}

// === Hough transform ===

export function hough_lines(edges, width, height, threshold, rhoResolution, thetaResolution) {
  return [];
}

export function hough_lines_p(edges, width, height, threshold, minLineLength, maxLineGap) {
  return [];
}

export function find_line_intersections(lines, width, height) {
  return [];
}

export function find_document_quadrilateral(lines, width, height, minArea) {
  return null;
}

// === Document validation ===

export function validate_quadrilateral(cornersArray) {
  // Returns [shapeScore, convexityScore, angleScore, parallelismScore, aspectRatio, aspectScore, docType]
  return new Float32Array([0.8, 1.0, 0.9, 0.85, 1.586, 0.9, 1]);
}

export function calculate_edge_strength(gradients, width, height, corners, samplePoints) {
  return 0.7;
}

export function calculate_size_score(corners, width, height, minRatio, maxRatio, targetRatio) {
  return 0.8;
}

export function calculate_detection_confidence(edgeScore, shapeScore, aspectScore, sizeScore) {
  return 0.75;
}

export function refine_corners_subpixel(corners, gradients, width, height, windowSize) {
  return corners;
}

// === Morphological operations ===

export function morphological_close(edges, width, height, kernelSize) {
  return new Uint8ClampedArray(edges);
}

export function morphological_open(edges, width, height, kernelSize) {
  return new Uint8ClampedArray(edges);
}

export function close_edge_gaps(edges, width, height, maxGapSize) {
  return new Uint8ClampedArray(edges);
}

export function remove_small_components(edges, width, height, minSize) {
  return new Uint8ClampedArray(edges);
}

export function thin_edges(edges, width, height) {
  return new Uint8ClampedArray(edges);
}
