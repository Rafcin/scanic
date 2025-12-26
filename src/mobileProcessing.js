/**
 * Mobile-Optimized Processing Module
 *
 * Provides device-aware processing optimizations for mobile devices:
 * - Automatic device capability detection
 * - Adaptive processing configuration
 * - Frame rate management for live camera feeds
 * - Memory-efficient processing pipelines
 * - Battery-conscious operation modes
 *
 * @module mobileProcessing
 */

import { scanDocument } from './index.js';
import { quickDocumentDetection, DETECTION_PRESETS } from './enhancedDetection.js';

/**
 * Performance tiers for device classification
 */
const PERFORMANCE_TIERS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

/**
 * Mobile quality presets
 */
export const MobileQualityPresets = {
  fastest: {
    maxDimension: 400,
    targetFps: 30,
    qualityLevel: 'low',
    useWasm: true,
    reducedPrecision: true,
    adaptiveFrameSkip: true,
    detectionPreset: 'fast',
  },
  balanced: {
    maxDimension: 600,
    targetFps: 15,
    qualityLevel: 'medium',
    useWasm: true,
    reducedPrecision: false,
    adaptiveFrameSkip: true,
    detectionPreset: 'balanced',
  },
  quality: {
    maxDimension: 800,
    targetFps: 10,
    qualityLevel: 'high',
    useWasm: true,
    reducedPrecision: false,
    adaptiveFrameSkip: false,
    detectionPreset: 'accurate',
  },
};

/**
 * Detect device capabilities
 *
 * @returns {Object} Device capability information
 */
export function detectDeviceCapabilities() {
  const capabilities = {
    cpuCores: navigator.hardwareConcurrency || 4,
    deviceMemory: navigator.deviceMemory || null,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ),
    hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    hasWebGL: false,
    hasWebGPU: false,
    hasSIMD: false,
    pixelRatio: window.devicePixelRatio || 1,
    connectionType: null,
    isSlowConnection: false,
    performanceTier: PERFORMANCE_TIERS.MEDIUM,
    screenWidth: screen.width,
    screenHeight: screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };

  // Check WebGL support
  try {
    const canvas = document.createElement('canvas');
    capabilities.hasWebGL = !!(
      canvas.getContext('webgl2') || canvas.getContext('webgl')
    );
  } catch (e) {
    capabilities.hasWebGL = false;
  }

  // Check WebGPU support
  capabilities.hasWebGPU = 'gpu' in navigator;

  // Check WASM SIMD support
  try {
    capabilities.hasSIMD = WebAssembly.validate(
      new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10,
        1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
      ])
    );
  } catch (e) {
    capabilities.hasSIMD = false;
  }

  // Check network connection
  if ('connection' in navigator) {
    const conn = navigator.connection;
    capabilities.connectionType = conn.effectiveType || conn.type || null;
    capabilities.isSlowConnection =
      conn.effectiveType === 'slow-2g' ||
      conn.effectiveType === '2g' ||
      conn.saveData === true;
  }

  // Determine performance tier
  capabilities.performanceTier = determinePerformanceTier(capabilities);

  return capabilities;
}

/**
 * Determine performance tier based on device capabilities
 * @private
 */
function determinePerformanceTier(capabilities) {
  let score = 0;

  // CPU cores scoring
  if (capabilities.cpuCores >= 8) score += 3;
  else if (capabilities.cpuCores >= 4) score += 2;
  else score += 1;

  // Memory scoring
  if (capabilities.deviceMemory) {
    if (capabilities.deviceMemory >= 8) score += 3;
    else if (capabilities.deviceMemory >= 4) score += 2;
    else score += 1;
  } else {
    score += 1; // Conservative estimate
  }

  // WebGL/GPU scoring
  if (capabilities.hasWebGPU) score += 2;
  else if (capabilities.hasWebGL) score += 1;

  // SIMD scoring
  if (capabilities.hasSIMD) score += 1;

  // Mobile penalty
  if (capabilities.isMobile) score -= 1;

  // Slow connection penalty
  if (capabilities.isSlowConnection) score -= 1;

  // Determine tier
  if (score >= 8) return PERFORMANCE_TIERS.HIGH;
  if (score >= 5) return PERFORMANCE_TIERS.MEDIUM;
  return PERFORMANCE_TIERS.LOW;
}

/**
 * Get recommended processing configuration for device
 *
 * @param {Object} [capabilities] - Device capabilities (auto-detected if not provided)
 * @returns {Object} Recommended processing configuration
 */
export function getRecommendedConfig(capabilities = null) {
  const caps = capabilities || detectDeviceCapabilities();

  const config = {
    maxDimension: 800,
    targetFps: 15,
    useWasm: true,
    reducedPrecision: false,
    qualityLevel: 'medium',
    workerCount: Math.max(1, Math.floor(caps.cpuCores / 2)),
    adaptiveFrameSkip: true,
    memoryLimitMB: 256,
  };

  // Adjust based on performance tier
  switch (caps.performanceTier) {
    case PERFORMANCE_TIERS.HIGH:
      config.maxDimension = 1024;
      config.targetFps = 30;
      config.qualityLevel = 'high';
      config.workerCount = Math.max(2, caps.cpuCores - 2);
      config.memoryLimitMB = 512;
      config.adaptiveFrameSkip = false;
      break;

    case PERFORMANCE_TIERS.LOW:
      config.maxDimension = 400;
      config.targetFps = 10;
      config.qualityLevel = 'low';
      config.reducedPrecision = true;
      config.workerCount = 1;
      config.memoryLimitMB = 128;
      config.adaptiveFrameSkip = true;
      break;

    default: // MEDIUM
      config.maxDimension = 600;
      config.targetFps = 15;
      config.qualityLevel = 'medium';
      break;
  }

  // Adjust for mobile
  if (caps.isMobile) {
    config.maxDimension = Math.min(config.maxDimension, 600);
    config.targetFps = Math.min(config.targetFps, 20);
    config.memoryLimitMB = Math.min(config.memoryLimitMB, 256);
  }

  // Adjust for slow connection
  if (caps.isSlowConnection) {
    config.maxDimension = Math.min(config.maxDimension, 400);
    config.qualityLevel = 'low';
  }

  return config;
}

/**
 * Mobile processor class for optimized document scanning
 */
export class MobileProcessor {
  constructor(options = {}) {
    this.capabilities = detectDeviceCapabilities();
    this.config = getRecommendedConfig(this.capabilities);

    // Apply preset if provided
    if (options.preset && MobileQualityPresets[options.preset]) {
      Object.assign(this.config, MobileQualityPresets[options.preset]);
    }

    // Apply custom options
    if (options.targetFps) this.config.targetFps = options.targetFps;
    if (options.maxDimension) this.config.maxDimension = options.maxDimension;
    if (options.batterySaver) {
      this.config.maxDimension = Math.min(this.config.maxDimension, 400);
      this.config.targetFps = Math.min(this.config.targetFps, 10);
      this.config.adaptiveFrameSkip = true;
    }

    // Processing state
    this.isRunning = false;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.processingTimes = [];
    this.skipFrames = 0;
    this.currentFps = 0;
    this.videoElement = null;
    this.animationFrameId = null;
    this.callback = null;

    // Adaptive quality state
    this.adaptiveQuality = options.adaptiveQuality !== false;
    this.qualityHistory = [];
    this.lastQualityAdjust = 0;
  }

  /**
   * Get current device capabilities
   */
  getCapabilities() {
    return { ...this.capabilities };
  }

  /**
   * Get current processing configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update processing options
   */
  setOptions(options) {
    if (options.preset && MobileQualityPresets[options.preset]) {
      Object.assign(this.config, MobileQualityPresets[options.preset]);
    }
    if (options.targetFps) this.config.targetFps = options.targetFps;
    if (options.maxDimension) this.config.maxDimension = options.maxDimension;
    if (options.batterySaver !== undefined) {
      if (options.batterySaver) {
        this.config.maxDimension = Math.min(this.config.maxDimension, 400);
        this.config.targetFps = Math.min(this.config.targetFps, 10);
      }
    }
    if (options.adaptiveQuality !== undefined) {
      this.adaptiveQuality = options.adaptiveQuality;
    }
  }

  /**
   * Process a single frame
   */
  async processFrame(image) {
    const startTime = performance.now();

    // Scale image if needed
    const scaledImage = await this._scaleImage(image);

    // Get detection preset based on quality level
    let preset = 'fast';
    if (this.config.qualityLevel === 'medium') preset = 'balanced';
    if (this.config.qualityLevel === 'high') preset = 'accurate';

    // Run document detection
    let result;
    try {
      if (this.config.qualityLevel === 'low') {
        // Use quick detection for low quality
        result = await quickDocumentDetection(scaledImage, {
          preset: 'fast',
          debug: false,
        });

        // Convert to scanDocument format
        result = {
          success: result.success,
          corners: result.corners || null,
          contour: null,
          output: null,
          debug: null,
          message: result.success ? 'Document detected' : 'No document detected',
        };
      } else {
        result = await scanDocument(image, {
          mode: 'detect',
          maxProcessingDimension: this.config.maxDimension,
          debug: false,
        });
      }
    } catch (error) {
      result = {
        success: false,
        corners: null,
        contour: null,
        output: null,
        debug: null,
        message: error.message,
      };
    }

    const processingTime = performance.now() - startTime;
    this._updateStats(processingTime);

    return {
      ...result,
      processingTimeMs: processingTime,
      currentFps: this.currentFps,
      wasSkipped: false,
      qualityLevel: this.config.qualityLevel,
    };
  }

  /**
   * Scale image to target dimension
   * @private
   */
  async _scaleImage(image) {
    let sourceWidth, sourceHeight;

    if (image instanceof ImageData) {
      sourceWidth = image.width;
      sourceHeight = image.height;
    } else if (image instanceof HTMLVideoElement) {
      sourceWidth = image.videoWidth;
      sourceHeight = image.videoHeight;
    } else {
      sourceWidth = image.width || image.naturalWidth;
      sourceHeight = image.height || image.naturalHeight;
    }

    const maxDim = Math.max(sourceWidth, sourceHeight);
    if (maxDim <= this.config.maxDimension) {
      // No scaling needed
      if (image instanceof ImageData) {
        return image;
      }
      const canvas = document.createElement('canvas');
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      return ctx.getImageData(0, 0, sourceWidth, sourceHeight);
    }

    // Scale down
    const scale = this.config.maxDimension / maxDim;
    const newWidth = Math.round(sourceWidth * scale);
    const newHeight = Math.round(sourceHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');

    // Use fast scaling for low quality
    if (this.config.qualityLevel === 'low') {
      ctx.imageSmoothingEnabled = false;
    } else {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = this.config.qualityLevel === 'high' ? 'high' : 'medium';
    }

    if (image instanceof ImageData) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = sourceWidth;
      tempCanvas.height = sourceHeight;
      tempCanvas.getContext('2d').putImageData(image, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
    } else {
      ctx.drawImage(image, 0, 0, newWidth, newHeight);
    }

    return ctx.getImageData(0, 0, newWidth, newHeight);
  }

  /**
   * Update processing statistics
   * @private
   */
  _updateStats(processingTime) {
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 30) {
      this.processingTimes.shift();
    }

    const avgTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    this.currentFps = Math.round(1000 / avgTime);

    // Adaptive quality adjustment
    if (this.adaptiveQuality) {
      this._adjustQuality(avgTime);
    }
  }

  /**
   * Adjust quality based on performance
   * @private
   */
  _adjustQuality(avgProcessingTime) {
    const now = performance.now();
    if (now - this.lastQualityAdjust < 2000) return; // Adjust every 2 seconds max

    const targetFrameTime = 1000 / this.config.targetFps;

    this.qualityHistory.push(avgProcessingTime);
    if (this.qualityHistory.length > 10) {
      this.qualityHistory.shift();
    }

    const recentAvg =
      this.qualityHistory.reduce((a, b) => a + b, 0) / this.qualityHistory.length;

    // If processing is too slow, reduce quality
    if (recentAvg > targetFrameTime * 1.5) {
      if (this.config.qualityLevel === 'high') {
        this.config.qualityLevel = 'medium';
        this.config.maxDimension = Math.min(this.config.maxDimension, 600);
      } else if (this.config.qualityLevel === 'medium') {
        this.config.qualityLevel = 'low';
        this.config.maxDimension = Math.min(this.config.maxDimension, 400);
      }
      this.lastQualityAdjust = now;
    }
    // If processing is fast enough, increase quality
    else if (recentAvg < targetFrameTime * 0.5) {
      if (this.config.qualityLevel === 'low') {
        this.config.qualityLevel = 'medium';
        this.config.maxDimension = Math.min(600, this.config.maxDimension * 1.2);
      } else if (this.config.qualityLevel === 'medium') {
        this.config.qualityLevel = 'high';
        this.config.maxDimension = Math.min(800, this.config.maxDimension * 1.2);
      }
      this.lastQualityAdjust = now;
    }
  }

  /**
   * Start continuous processing from video element
   */
  startContinuousProcessing(video, callback) {
    if (this.isRunning) {
      this.stopContinuousProcessing();
    }

    this.videoElement = video;
    this.callback = callback;
    this.isRunning = true;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.processingTimes = [];
    this.skipFrames = 0;

    this._processLoop();
  }

  /**
   * Process loop for continuous processing
   * @private
   */
  async _processLoop() {
    if (!this.isRunning) return;

    const now = performance.now();
    const frameInterval = 1000 / this.config.targetFps;
    const elapsed = now - this.lastFrameTime;

    // Frame rate limiting
    if (elapsed < frameInterval) {
      this.animationFrameId = requestAnimationFrame(() => this._processLoop());
      return;
    }

    // Adaptive frame skipping
    if (this.config.adaptiveFrameSkip && this.skipFrames > 0) {
      this.skipFrames--;
      this.lastFrameTime = now;

      if (this.callback) {
        this.callback({
          success: false,
          corners: null,
          contour: null,
          output: null,
          debug: null,
          message: 'Frame skipped',
          processingTimeMs: 0,
          currentFps: this.currentFps,
          wasSkipped: true,
          qualityLevel: this.config.qualityLevel,
        });
      }

      this.animationFrameId = requestAnimationFrame(() => this._processLoop());
      return;
    }

    // Check if video is ready
    if (
      !this.videoElement ||
      this.videoElement.readyState < 2 ||
      this.videoElement.paused
    ) {
      this.animationFrameId = requestAnimationFrame(() => this._processLoop());
      return;
    }

    try {
      const result = await this.processFrame(this.videoElement);

      // Adjust frame skipping based on performance
      if (this.config.adaptiveFrameSkip) {
        const targetFrameTime = 1000 / this.config.targetFps;
        if (result.processingTimeMs > targetFrameTime * 2) {
          this.skipFrames = Math.min(
            5,
            Math.floor(result.processingTimeMs / targetFrameTime) - 1
          );
        }
      }

      if (this.callback) {
        this.callback(result);
      }
    } catch (error) {
      console.error('Processing error:', error);
      if (this.callback) {
        this.callback({
          success: false,
          corners: null,
          contour: null,
          output: null,
          debug: null,
          message: error.message,
          processingTimeMs: 0,
          currentFps: this.currentFps,
          wasSkipped: false,
          qualityLevel: this.config.qualityLevel,
        });
      }
    }

    this.lastFrameTime = now;
    this.frameCount++;

    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(() => this._processLoop());
    }
  }

  /**
   * Stop continuous processing
   */
  stopContinuousProcessing() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.videoElement = null;
    this.callback = null;
  }

  /**
   * Check if continuous processing is active
   */
  isProcessing() {
    return this.isRunning;
  }

  /**
   * Get current performance statistics
   */
  getStats() {
    const avgTime =
      this.processingTimes.length > 0
        ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
        : 0;

    return {
      frameCount: this.frameCount,
      averageProcessingTime: avgTime,
      currentFps: this.currentFps,
      qualityLevel: this.config.qualityLevel,
      maxDimension: this.config.maxDimension,
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopContinuousProcessing();
    this.processingTimes = [];
    this.qualityHistory = [];
  }
}

/**
 * Create a mobile-optimized processor instance
 *
 * @param {Object} [options] - Processing options
 * @returns {MobileProcessor} Mobile processor instance
 */
export function createMobileProcessor(options = {}) {
  return new MobileProcessor(options);
}

/**
 * Process a single frame with mobile-optimized settings
 *
 * @param {ImageInput} image - Image to process
 * @param {Object} [options] - Processing options
 * @returns {Promise<Object>} Processing result
 */
export async function processMobileFrame(image, options = {}) {
  const processor = new MobileProcessor(options);
  const result = await processor.processFrame(image);
  processor.destroy();
  return result;
}

/**
 * Get optimal camera constraints for device
 *
 * @param {Object} [capabilities] - Device capabilities
 * @returns {Object} MediaStreamConstraints for getUserMedia
 */
export function getOptimalCameraConstraints(capabilities = null) {
  const caps = capabilities || detectDeviceCapabilities();
  const config = getRecommendedConfig(caps);

  const constraints = {
    video: {
      facingMode: { ideal: 'environment' }, // Prefer back camera
      width: { ideal: config.maxDimension * 2 }, // Request higher than needed
      height: { ideal: config.maxDimension * 2 },
    },
    audio: false,
  };

  // Adjust for performance tier
  if (caps.performanceTier === PERFORMANCE_TIERS.HIGH) {
    constraints.video.width.ideal = 1920;
    constraints.video.height.ideal = 1080;
    constraints.video.frameRate = { ideal: 30 };
  } else if (caps.performanceTier === PERFORMANCE_TIERS.LOW) {
    constraints.video.width.ideal = 640;
    constraints.video.height.ideal = 480;
    constraints.video.frameRate = { ideal: 15, max: 15 };
  } else {
    constraints.video.width.ideal = 1280;
    constraints.video.height.ideal = 720;
    constraints.video.frameRate = { ideal: 24 };
  }

  return constraints;
}

/**
 * Check if device is suitable for real-time processing
 *
 * @param {Object} [capabilities] - Device capabilities
 * @returns {Object} Suitability assessment
 */
export function checkRealtimeSuitability(capabilities = null) {
  const caps = capabilities || detectDeviceCapabilities();

  return {
    suitable: caps.performanceTier !== PERFORMANCE_TIERS.LOW,
    performanceTier: caps.performanceTier,
    recommendedFps:
      caps.performanceTier === PERFORMANCE_TIERS.HIGH
        ? 30
        : caps.performanceTier === PERFORMANCE_TIERS.MEDIUM
        ? 15
        : 10,
    warnings: [
      ...(caps.isSlowConnection ? ['Slow network connection detected'] : []),
      ...(caps.isMobile && caps.performanceTier === PERFORMANCE_TIERS.LOW
        ? ['Device may struggle with real-time processing']
        : []),
      ...(!caps.hasWebGL ? ['WebGL not available, performance may be limited'] : []),
    ],
    recommendations: [
      ...(caps.performanceTier === PERFORMANCE_TIERS.LOW
        ? ['Use lower quality preset for better performance']
        : []),
      ...(caps.isMobile ? ['Ensure good lighting for best results'] : []),
      ...(!caps.hasSIMD
        ? ['WASM SIMD not supported, processing may be slower']
        : []),
    ],
  };
}

// Default export
export default {
  MobileProcessor,
  createMobileProcessor,
  processMobileFrame,
  detectDeviceCapabilities,
  getRecommendedConfig,
  getOptimalCameraConstraints,
  checkRealtimeSuitability,
  MobileQualityPresets,
  PERFORMANCE_TIERS,
};
