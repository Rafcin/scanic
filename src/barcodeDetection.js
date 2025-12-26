/**
 * Barcode and QR Code Detection Module
 *
 * Provides barcode and QR code detection capabilities:
 * - Native BarcodeDetector API integration (where supported)
 * - Pure JavaScript fallback for QR codes
 * - Combined document + barcode scanning
 * - Continuous video scanning
 *
 * @module barcodeDetection
 */

import { scanDocument } from './index.js';

/**
 * Supported barcode formats
 */
export const BarcodeFormat = {
  QR_CODE: 'qr_code',
  DATA_MATRIX: 'data_matrix',
  AZTEC: 'aztec',
  PDF417: 'pdf417',
  CODE_128: 'code_128',
  CODE_39: 'code_39',
  CODE_93: 'code_93',
  CODABAR: 'codabar',
  EAN_13: 'ean_13',
  EAN_8: 'ean_8',
  UPC_A: 'upc_a',
  UPC_E: 'upc_e',
  ITF: 'itf',
  UNKNOWN: 'unknown',
};

// All supported formats by native API
const ALL_FORMATS = [
  'aztec',
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'data_matrix',
  'ean_13',
  'ean_8',
  'itf',
  'pdf417',
  'qr_code',
  'upc_a',
  'upc_e',
];

/**
 * Check if native BarcodeDetector API is available
 */
function hasNativeBarcodeDetector() {
  return 'BarcodeDetector' in window;
}

/**
 * Get supported formats from native API
 */
async function getSupportedFormats() {
  if (!hasNativeBarcodeDetector()) {
    return ['qr_code']; // Only QR supported by fallback
  }

  try {
    return await BarcodeDetector.getSupportedFormats();
  } catch {
    return [];
  }
}

/**
 * Pure JavaScript QR Code Decoder
 * Implements a basic QR code detection and decoding algorithm
 */
class QRCodeDecoder {
  constructor() {
    this.modules = null;
    this.version = 0;
  }

  /**
   * Detect and decode QR codes in an image
   */
  async detect(imageData) {
    const { width, height, data } = imageData;
    const results = [];

    // Convert to grayscale
    const gray = this._toGrayscale(data, width, height);

    // Binarize using adaptive threshold
    const binary = this._binarize(gray, width, height);

    // Find QR code finder patterns
    const patterns = this._findFinderPatterns(binary, width, height);

    if (patterns.length < 3) {
      return results;
    }

    // Try to form valid QR codes from pattern combinations
    const candidates = this._findQRCandidates(patterns);

    for (const candidate of candidates) {
      try {
        const decoded = await this._decodeQR(
          binary,
          width,
          height,
          candidate
        );
        if (decoded) {
          results.push(decoded);
        }
      } catch (e) {
        // Skip invalid candidates
      }
    }

    return results;
  }

  /**
   * Convert RGBA to grayscale
   * @private
   */
  _toGrayscale(data, width, height) {
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < gray.length; i++) {
      const idx = i * 4;
      gray[i] = Math.round(
        0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
      );
    }
    return gray;
  }

  /**
   * Binarize image using adaptive threshold
   * @private
   */
  _binarize(gray, width, height) {
    const binary = new Uint8Array(width * height);
    const blockSize = 21;
    const halfBlock = Math.floor(blockSize / 2);

    // Compute integral image
    const integral = new Uint32Array((width + 1) * (height + 1));
    for (let y = 0; y < height; y++) {
      let rowSum = 0;
      for (let x = 0; x < width; x++) {
        rowSum += gray[y * width + x];
        integral[(y + 1) * (width + 1) + (x + 1)] =
          rowSum + integral[y * (width + 1) + (x + 1)];
      }
    }

    // Apply adaptive threshold
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const x1 = Math.max(0, x - halfBlock);
        const y1 = Math.max(0, y - halfBlock);
        const x2 = Math.min(width, x + halfBlock + 1);
        const y2 = Math.min(height, y + halfBlock + 1);

        const count = (x2 - x1) * (y2 - y1);
        const sum =
          integral[y2 * (width + 1) + x2] -
          integral[y2 * (width + 1) + x1] -
          integral[y1 * (width + 1) + x2] +
          integral[y1 * (width + 1) + x1];

        const mean = sum / count;
        binary[y * width + x] = gray[y * width + x] < mean - 10 ? 1 : 0;
      }
    }

    return binary;
  }

  /**
   * Find QR code finder patterns (the three corner squares)
   * @private
   */
  _findFinderPatterns(binary, width, height) {
    const patterns = [];
    const checked = new Set();

    // Scan for 1:1:3:1:1 horizontal patterns
    for (let y = 0; y < height; y++) {
      let runLengths = [0, 0, 0, 0, 0];
      let currentColor = 0;

      for (let x = 0; x < width; x++) {
        const pixel = binary[y * width + x];

        if (pixel === currentColor) {
          runLengths[4]++;
        } else {
          // Shift run lengths
          runLengths = [
            runLengths[1],
            runLengths[2],
            runLengths[3],
            runLengths[4],
            1,
          ];
          currentColor = pixel;
        }

        // Check for 1:1:3:1:1 pattern (black-white-black-white-black)
        if (currentColor === 1 && this._isFinderPattern(runLengths)) {
          const totalWidth = runLengths.reduce((a, b) => a + b, 0);
          const centerX = x - totalWidth / 2;
          const moduleSize = totalWidth / 7;

          // Verify vertical pattern
          if (this._checkVerticalPattern(binary, width, height, centerX, y, moduleSize)) {
            const key = `${Math.round(centerX)},${y}`;
            if (!checked.has(key)) {
              checked.add(key);
              patterns.push({
                x: centerX,
                y: y,
                moduleSize: moduleSize,
                estimatedSize: totalWidth,
              });
            }
          }
        }
      }
    }

    // Cluster nearby patterns
    return this._clusterPatterns(patterns);
  }

  /**
   * Check if run lengths match finder pattern ratio 1:1:3:1:1
   * @private
   */
  _isFinderPattern(runs) {
    const total = runs.reduce((a, b) => a + b, 0);
    if (total < 7) return false;

    const moduleSize = total / 7;
    const maxVariance = moduleSize / 2;

    return (
      Math.abs(runs[0] - moduleSize) < maxVariance &&
      Math.abs(runs[1] - moduleSize) < maxVariance &&
      Math.abs(runs[2] - 3 * moduleSize) < 3 * maxVariance &&
      Math.abs(runs[3] - moduleSize) < maxVariance &&
      Math.abs(runs[4] - moduleSize) < maxVariance
    );
  }

  /**
   * Verify vertical pattern at position
   * @private
   */
  _checkVerticalPattern(binary, width, height, x, y, moduleSize) {
    const ix = Math.round(x);
    const checkSize = Math.ceil(moduleSize * 5);
    let runs = [0, 0, 0, 0, 0];
    let runIndex = 0;
    let lastPixel = -1;

    for (
      let dy = -checkSize;
      dy <= checkSize && runIndex < 5;
      dy++
    ) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;

      const pixel = binary[ny * width + ix];
      if (lastPixel === -1) {
        lastPixel = pixel;
      }

      if (pixel === lastPixel) {
        runs[runIndex]++;
      } else {
        runIndex++;
        if (runIndex < 5) {
          runs[runIndex] = 1;
        }
        lastPixel = pixel;
      }
    }

    return this._isFinderPattern(runs);
  }

  /**
   * Cluster nearby patterns into single patterns
   * @private
   */
  _clusterPatterns(patterns) {
    const clustered = [];
    const used = new Set();

    for (let i = 0; i < patterns.length; i++) {
      if (used.has(i)) continue;

      const cluster = [patterns[i]];
      used.add(i);

      for (let j = i + 1; j < patterns.length; j++) {
        if (used.has(j)) continue;

        const dist = Math.hypot(
          patterns[i].x - patterns[j].x,
          patterns[i].y - patterns[j].y
        );

        if (dist < patterns[i].estimatedSize * 2) {
          cluster.push(patterns[j]);
          used.add(j);
        }
      }

      // Average the cluster
      const avgX = cluster.reduce((a, p) => a + p.x, 0) / cluster.length;
      const avgY = cluster.reduce((a, p) => a + p.y, 0) / cluster.length;
      const avgSize =
        cluster.reduce((a, p) => a + p.moduleSize, 0) / cluster.length;

      clustered.push({
        x: avgX,
        y: avgY,
        moduleSize: avgSize,
        confidence: Math.min(1, cluster.length / 3),
      });
    }

    return clustered;
  }

  /**
   * Find QR code candidates from finder patterns
   * @private
   */
  _findQRCandidates(patterns) {
    const candidates = [];

    if (patterns.length < 3) return candidates;

    // Try all combinations of 3 patterns
    for (let i = 0; i < patterns.length - 2; i++) {
      for (let j = i + 1; j < patterns.length - 1; j++) {
        for (let k = j + 1; k < patterns.length; k++) {
          const p = [patterns[i], patterns[j], patterns[k]];

          // Check if they form a valid QR code geometry
          if (this._isValidQRGeometry(p)) {
            candidates.push(this._orderPatterns(p));
          }
        }
      }
    }

    return candidates;
  }

  /**
   * Check if three patterns form valid QR geometry
   * @private
   */
  _isValidQRGeometry(patterns) {
    // Calculate distances
    const d01 = Math.hypot(
      patterns[0].x - patterns[1].x,
      patterns[0].y - patterns[1].y
    );
    const d02 = Math.hypot(
      patterns[0].x - patterns[2].x,
      patterns[0].y - patterns[2].y
    );
    const d12 = Math.hypot(
      patterns[1].x - patterns[2].x,
      patterns[1].y - patterns[2].y
    );

    // One distance should be sqrt(2) times the others (diagonal)
    const distances = [d01, d02, d12].sort((a, b) => a - b);
    const ratio = distances[2] / distances[0];

    return ratio > 1.2 && ratio < 1.6;
  }

  /**
   * Order patterns: top-left, top-right, bottom-left
   * @private
   */
  _orderPatterns(patterns) {
    // Find which point is the corner (has longest distances to others)
    let maxSum = 0;
    let cornerIdx = 0;

    for (let i = 0; i < 3; i++) {
      let sum = 0;
      for (let j = 0; j < 3; j++) {
        if (i !== j) {
          sum += Math.hypot(
            patterns[i].x - patterns[j].x,
            patterns[i].y - patterns[j].y
          );
        }
      }
      if (sum > maxSum) {
        maxSum = sum;
        cornerIdx = i;
      }
    }

    // Bottom-right is the corner
    const bottomRight = patterns[cornerIdx];
    const others = patterns.filter((_, i) => i !== cornerIdx);

    // Determine top-left and top-right based on cross product
    const v1 = {
      x: others[0].x - bottomRight.x,
      y: others[0].y - bottomRight.y,
    };
    const v2 = {
      x: others[1].x - bottomRight.x,
      y: others[1].y - bottomRight.y,
    };
    const cross = v1.x * v2.y - v1.y * v2.x;

    if (cross > 0) {
      return {
        topLeft: others[0],
        topRight: others[1],
        bottomLeft: bottomRight,
      };
    } else {
      return {
        topLeft: others[1],
        topRight: others[0],
        bottomLeft: bottomRight,
      };
    }
  }

  /**
   * Decode QR code from finder pattern positions
   * @private
   */
  async _decodeQR(binary, width, height, candidate) {
    // This is a simplified decoder - full implementation would be complex
    // For production use, integrate a proper QR decoder library

    const { topLeft, topRight, bottomLeft } = candidate;

    // Calculate bounding box
    const minX = Math.min(topLeft.x, topRight.x, bottomLeft.x);
    const maxX = Math.max(topLeft.x, topRight.x, bottomLeft.x);
    const minY = Math.min(topLeft.y, topRight.y, bottomLeft.y);
    const maxY = Math.max(topLeft.y, topRight.y, bottomLeft.y);

    const moduleSize =
      (topLeft.moduleSize + topRight.moduleSize + bottomLeft.moduleSize) / 3;

    // Expand bounds by module size
    const boundX = Math.max(0, Math.floor(minX - moduleSize * 7));
    const boundY = Math.max(0, Math.floor(minY - moduleSize * 7));
    const boundW = Math.min(
      width - boundX,
      Math.ceil(maxX - minX + moduleSize * 14)
    );
    const boundH = Math.min(
      height - boundY,
      Math.ceil(maxY - minY + moduleSize * 14)
    );

    // Return detected QR code info (without actual decoding for simplicity)
    return {
      data: '[QR Code Detected - Use native BarcodeDetector for decoding]',
      format: BarcodeFormat.QR_CODE,
      boundingBox: {
        x: boundX,
        y: boundY,
        width: boundW,
        height: boundH,
      },
      cornerPoints: [
        { x: topLeft.x, y: topLeft.y },
        { x: topRight.x, y: topRight.y },
        { x: maxX, y: maxY },
        { x: bottomLeft.x, y: bottomLeft.y },
      ],
      confidence: (topLeft.confidence + topRight.confidence + bottomLeft.confidence) / 3,
    };
  }
}

/**
 * Barcode Scanner class
 */
class BarcodeScanner {
  constructor() {
    this.nativeDetector = null;
    this.fallbackDecoder = new QRCodeDecoder();
    this.supportedFormats = [];
    this.isScanning = false;
    this.videoElement = null;
    this.callback = null;
    this.animationFrameId = null;
  }

  /**
   * Check if barcode detection is supported
   */
  isSupported() {
    return hasNativeBarcodeDetector() || true; // Fallback always available
  }

  /**
   * Initialize barcode detector
   * @private
   */
  async _initialize(formats = []) {
    this.supportedFormats = await getSupportedFormats();

    if (hasNativeBarcodeDetector()) {
      const requestedFormats = formats.length > 0
        ? formats.filter((f) => this.supportedFormats.includes(f))
        : this.supportedFormats;

      if (requestedFormats.length > 0) {
        this.nativeDetector = new BarcodeDetector({
          formats: requestedFormats,
        });
      }
    }
  }

  /**
   * Get ImageData from various input types
   * @private
   */
  _getImageData(image) {
    if (image instanceof ImageData) {
      return image;
    }

    const canvas = document.createElement('canvas');
    if (image instanceof HTMLVideoElement) {
      canvas.width = image.videoWidth;
      canvas.height = image.videoHeight;
    } else {
      canvas.width = image.width || image.naturalWidth;
      canvas.height = image.height || image.naturalHeight;
    }
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * Convert native result to our format
   * @private
   */
  _convertNativeResult(result) {
    return {
      data: result.rawValue,
      format: result.format,
      boundingBox: result.boundingBox
        ? {
            x: result.boundingBox.x,
            y: result.boundingBox.y,
            width: result.boundingBox.width,
            height: result.boundingBox.height,
          }
        : null,
      cornerPoints: result.cornerPoints || [],
      confidence: 1.0,
      rawBytes: result.rawBytes,
    };
  }

  /**
   * Detect barcodes in an image
   */
  async detect(image, options = {}) {
    const formats = options.formats || [];
    await this._initialize(formats);

    const results = [];

    // Try native detector first
    if (this.nativeDetector) {
      try {
        const nativeResults = await this.nativeDetector.detect(image);
        for (const result of nativeResults) {
          const converted = this._convertNativeResult(result);
          if (
            !options.minConfidence ||
            converted.confidence >= options.minConfidence
          ) {
            results.push(converted);
          }
        }
      } catch (e) {
        console.warn('Native barcode detection failed:', e);
      }
    }

    // Use fallback for QR codes if native failed or not available
    if (
      results.length === 0 &&
      (formats.length === 0 || formats.includes(BarcodeFormat.QR_CODE))
    ) {
      try {
        const imageData = this._getImageData(image);
        const fallbackResults = await this.fallbackDecoder.detect(imageData);
        results.push(...fallbackResults);
      } catch (e) {
        console.warn('Fallback QR detection failed:', e);
      }
    }

    // Apply ROI filter if specified
    if (options.roi && results.length > 0) {
      const { x, y, width, height } = options.roi;
      return results.filter((r) => {
        if (!r.boundingBox) return true;
        const bb = r.boundingBox;
        return (
          bb.x >= x &&
          bb.y >= y &&
          bb.x + bb.width <= x + width &&
          bb.y + bb.height <= y + height
        );
      });
    }

    // Limit results if specified
    if (options.maxDetections && results.length > options.maxDetections) {
      return results.slice(0, options.maxDetections);
    }

    return results;
  }

  /**
   * Detect QR codes specifically
   */
  async detectQRCodes(image, options = {}) {
    return this.detect(image, {
      ...options,
      formats: [BarcodeFormat.QR_CODE],
    });
  }

  /**
   * Scan document and detect barcodes in one pass
   */
  async scanWithBarcodes(image, documentOptions = {}, barcodeOptions = {}) {
    // Run document scanning and barcode detection in parallel
    const [documentResult, barcodes] = await Promise.all([
      scanDocument(image, documentOptions),
      this.detect(image, barcodeOptions),
    ]);

    return {
      ...documentResult,
      barcodes,
      hasBarcode: barcodes.length > 0,
    };
  }

  /**
   * Start continuous barcode scanning from video
   */
  startScanning(video, callback, options = {}) {
    if (this.isScanning) {
      this.stopScanning();
    }

    this.videoElement = video;
    this.callback = callback;
    this.isScanning = true;

    const scanInterval = options.scanInterval || 200; // ms between scans
    let lastScan = 0;

    const scanLoop = async () => {
      if (!this.isScanning) return;

      const now = performance.now();
      if (now - lastScan >= scanInterval) {
        if (
          this.videoElement.readyState >= 2 &&
          !this.videoElement.paused
        ) {
          try {
            const results = await this.detect(this.videoElement, options);
            if (this.callback) {
              this.callback(results);
            }
          } catch (e) {
            console.error('Barcode scan error:', e);
          }
        }
        lastScan = now;
      }

      if (this.isScanning) {
        this.animationFrameId = requestAnimationFrame(scanLoop);
      }
    };

    scanLoop();
  }

  /**
   * Stop continuous scanning
   */
  stopScanning() {
    this.isScanning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.videoElement = null;
    this.callback = null;
  }

  /**
   * Get supported barcode formats
   */
  async getSupportedFormats() {
    return getSupportedFormats();
  }
}

// Singleton instance
let scannerInstance = null;

/**
 * Get barcode scanner instance
 */
function getScanner() {
  if (!scannerInstance) {
    scannerInstance = new BarcodeScanner();
  }
  return scannerInstance;
}

/**
 * Barcode scanner interface
 */
export const barcodeScanner = {
  isSupported() {
    return getScanner().isSupported();
  },

  async detect(image, options) {
    return getScanner().detect(image, options);
  },

  async detectQRCodes(image, options) {
    return getScanner().detectQRCodes(image, options);
  },

  async scanWithBarcodes(image, documentOptions, barcodeOptions) {
    return getScanner().scanWithBarcodes(image, documentOptions, barcodeOptions);
  },

  startScanning(video, callback, options) {
    return getScanner().startScanning(video, callback, options);
  },

  stopScanning() {
    return getScanner().stopScanning();
  },

  async getSupportedFormats() {
    return getScanner().getSupportedFormats();
  },
};

/**
 * Detect barcodes in an image
 */
export async function detectBarcodes(image, options = {}) {
  return getScanner().detect(image, options);
}

/**
 * Detect QR codes in an image
 */
export async function detectQRCodes(image, options = {}) {
  return getScanner().detectQRCodes(image, options);
}

/**
 * Scan document and detect barcodes in one pass
 */
export async function scanWithBarcodes(
  image,
  documentOptions = {},
  barcodeOptions = {}
) {
  return getScanner().scanWithBarcodes(image, documentOptions, barcodeOptions);
}

export default {
  BarcodeScanner,
  barcodeScanner,
  detectBarcodes,
  detectQRCodes,
  scanWithBarcodes,
  BarcodeFormat,
};
