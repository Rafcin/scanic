/**
 * Scanic - Modern Document Scanner for the Web
 * TypeScript Definitions
 *
 * @module scanic
 * @version 0.1.8
 * @license MIT
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Represents a 2D point coordinate
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Represents the four corners of a detected document
 */
export interface DocumentCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

/**
 * Represents a contour as an array of points
 */
export type Contour = Point[];

/**
 * Supported image input types
 */
export type ImageInput = HTMLImageElement | HTMLCanvasElement | ImageData;

/**
 * Output format options for document extraction
 */
export type OutputFormat = 'canvas' | 'imagedata' | 'dataurl';

/**
 * Operation mode for document scanning
 */
export type ScanMode = 'detect' | 'extract';

// ============================================================================
// Detection Presets
// ============================================================================

/**
 * Available detection preset names
 */
export type DetectionPresetName = 'fast' | 'balanced' | 'accurate' | 'idDocument';

/**
 * Gradient operator options for edge detection
 */
export type GradientOperator = 'sobel3x3' | 'sobel3x3_simd' | 'sobel5x5' | 'scharr3x3';

/**
 * Adaptive threshold method options
 */
export type AdaptiveThresholdMethod = 'fixed' | 'otsu' | 'percentile';

/**
 * Preprocessing configuration options
 */
export interface PreprocessingOptions {
  /** Enable CLAHE (Contrast Limited Adaptive Histogram Equalization) */
  enableClahe?: boolean;
  /** CLAHE clip limit (default: 2.0) */
  claheClip?: number;
  /** CLAHE grid size (default: 8) */
  claheGrid?: number;
  /** Enable illumination normalization */
  enableIlluminationNorm?: boolean;
  /** Enable contrast stretching */
  enableContrastStretch?: boolean;
}

/**
 * Edge detection configuration options
 */
export interface EdgeDetectionOptions {
  /** Gradient operator to use */
  gradientOperator?: GradientOperator;
  /** Use adaptive thresholding */
  adaptiveThreshold?: boolean;
  /** Adaptive threshold method */
  adaptiveMethod?: AdaptiveThresholdMethod;
  /** Low threshold for Canny edge detection (default: 50) */
  lowThreshold?: number;
  /** High threshold for Canny edge detection (default: 150) */
  highThreshold?: number;
  /** Gaussian kernel size (default: 5) */
  kernelSize?: number;
  /** Gaussian sigma (default: 0 = auto) */
  sigma?: number;
}

/**
 * Post-processing configuration options
 */
export interface PostprocessingOptions {
  /** Close gaps in detected edges */
  closeGaps?: boolean;
  /** Gap closing size in pixels (default: 5) */
  gapSize?: number;
  /** Remove noise/small components */
  removeNoise?: boolean;
  /** Minimum component area to keep (default: 100) */
  minComponentArea?: number;
  /** Apply edge thinning */
  thinEdges?: boolean;
}

/**
 * Document detection configuration options
 */
export interface DetectionOptions {
  /** Use Hough Line Transform for detection */
  useHoughLines?: boolean;
  /** Hough accumulator threshold (default: 50) */
  houghThreshold?: number;
  /** Minimum line length (default: 30) */
  minLineLength?: number;
  /** Maximum gap between line segments (default: 10) */
  maxLineGap?: number;
  /** Minimum detection confidence (0-1, default: 0.4) */
  minConfidence?: number;
  /** Refine corners with sub-pixel accuracy */
  refineCorners?: boolean;
  /** Validate document aspect ratio */
  validateAspectRatio?: boolean;
  /** Expected aspect ratios for validation */
  expectedAspectRatios?: number[];
  /** Aspect ratio tolerance (default: 0.15) */
  aspectTolerance?: number;
  /** Minimum area ratio (default: 0.05) */
  minAreaRatio?: number;
  /** Maximum area ratio (default: 0.95) */
  maxAreaRatio?: number;
}

/**
 * Complete detection preset configuration
 */
export interface DetectionPreset {
  preprocessing: PreprocessingOptions;
  edge: EdgeDetectionOptions;
  postprocessing: PostprocessingOptions;
  detection: DetectionOptions;
}

/**
 * Detection presets map
 */
export interface DetectionPresetsMap {
  fast: DetectionPreset;
  balanced: DetectionPreset;
  accurate: DetectionPreset;
  idDocument: DetectionPreset;
}

/**
 * Exported detection presets
 */
export const DETECTION_PRESETS: DetectionPresetsMap;

// ============================================================================
// Scan Options
// ============================================================================

/**
 * Options for the scanDocument function
 */
export interface ScanDocumentOptions {
  /** Operation mode: 'detect' for corners only, 'extract' for warped document */
  mode?: ScanMode;
  /** Output format when mode is 'extract' */
  output?: OutputFormat;
  /** Enable debug information */
  debug?: boolean;
  /** Maximum image dimension for processing (default: 800) */
  maxProcessingDimension?: number;
  /** Lower threshold for Canny edge detection (default: 75) */
  lowThreshold?: number;
  /** Upper threshold for Canny edge detection (default: 200) */
  highThreshold?: number;
  /** Kernel size for edge dilation (default: 3) */
  dilationKernelSize?: number;
  /** Number of dilation iterations (default: 1) */
  dilationIterations?: number;
  /** Minimum contour area to consider as document (default: 1000) */
  minArea?: number;
  /** Epsilon for polygon approximation */
  epsilon?: number;
}

/**
 * Options for extractDocument function
 */
export interface ExtractDocumentOptions {
  /** Output format */
  output?: OutputFormat;
}

/**
 * Options for enhanced detection functions
 */
export interface EnhancedDetectionOptions {
  /** Detection preset name */
  preset?: DetectionPresetName;
  /** Enable debug information */
  debug?: boolean;
  /** Preprocessing options (merged with preset) */
  preprocessing?: PreprocessingOptions;
  /** Edge detection options (merged with preset) */
  edge?: EdgeDetectionOptions;
  /** Post-processing options (merged with preset) */
  postprocessing?: PostprocessingOptions;
  /** Detection options (merged with preset) */
  detection?: DetectionOptions;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Debug information from preprocessing
 */
export interface PreprocessingDebug {
  originalDimensions: { width: number; height: number };
  scaledDimensions: { width: number; height: number };
  scaleFactor: number;
  maxProcessingDimension: number;
}

/**
 * Debug information collection
 */
export interface DebugInfo {
  preprocessing?: PreprocessingDebug;
  grayscale?: Uint8Array;
  preprocessed?: Uint8Array;
  blurred?: Uint8Array;
  magnitude?: Float32Array;
  direction?: Float32Array;
  gradients?: Float32Array;
  suppressed?: Float32Array;
  adaptiveThresholds?: { low: number; high: number };
  beforePost?: Uint8Array;
  finalEdges?: Uint8Array;
  timings?: Array<{ step: string; ms: string }>;
  edgeDetection?: DebugInfo;
  detection?: EnhancedDetectionResult;
  edges?: Uint8ClampedArray;
}

/**
 * Result from scanDocument function
 */
export interface ScanDocumentResult {
  /** Whether a document was successfully detected */
  success: boolean;
  /** Detected corner points (null if detection failed) */
  corners: DocumentCorners | null;
  /** Detected contour points (null if detection failed) */
  contour: Contour | null;
  /** Extracted document image (null if mode is 'detect' or detection failed) */
  output: HTMLCanvasElement | ImageData | string | null;
  /** Debug information (null if debug option is false) */
  debug: DebugInfo | null;
  /** Status message */
  message: string;
}

/**
 * Result from extractDocument function
 */
export interface ExtractDocumentResult {
  /** Whether extraction was successful */
  success: boolean;
  /** Extracted document image (null if extraction failed) */
  output: HTMLCanvasElement | ImageData | string | null;
  /** Corner points used for extraction */
  corners: DocumentCorners | null;
  /** Status message */
  message: string;
}

/**
 * Validation result from quadrilateral analysis
 */
export interface ValidationResult {
  /** Overall shape quality score (0-1) */
  shapeScore: number;
  /** Convexity score (0-1) */
  convexityScore: number;
  /** Angle quality score (0-1) */
  angleScore: number;
  /** Parallelism score (0-1) */
  parallelismScore: number;
  /** Detected aspect ratio */
  aspectRatio: number;
  /** Aspect ratio quality score (0-1) */
  aspectScore: number;
  /** Detected document type */
  documentType: 'unknown' | 'id_card' | 'passport' | 'paper';
}

/**
 * Detected line from Hough transform
 */
export interface DetectedLine {
  /** Distance from origin to line */
  rho: number;
  /** Angle in radians */
  theta: number;
  /** Angle in degrees */
  thetaDegrees: number;
  /** Accumulator votes */
  votes: number;
}

/**
 * Result from enhanced document detection
 */
export interface EnhancedDetectionResult {
  /** Whether a document was successfully detected */
  success: boolean;
  /** Detected corner points */
  corners?: DocumentCorners;
  /** Overall detection confidence (0-1) */
  confidence?: number;
  /** Validation results */
  validation?: ValidationResult;
  /** Size coverage score (0-1) */
  sizeScore?: number;
  /** Edge strength score (0-1) */
  edgeScore?: number;
  /** Detection method used */
  method?: 'hough' | 'contour';
  /** Whether corners were refined */
  cornersRefined?: boolean;
  /** Detected lines (if Hough method used) */
  lines?: DetectedLine[];
  /** Processing timing information */
  timings?: Array<{ step: string; ms: string }>;
  /** Edge detection result */
  edges?: Uint8ClampedArray;
  /** Debug information */
  debug?: DebugInfo;
  /** Status message */
  message?: string;
}

/**
 * Result from edge detection
 */
export interface EdgeDetectionResult {
  /** Binary edge map */
  edges: Uint8ClampedArray;
  /** Gradient values */
  gradients: Float32Array;
  /** Gradient magnitude */
  magnitude: Float32Array;
  /** Gradient direction */
  direction: Float32Array;
  /** Debug information */
  debug: DebugInfo | null;
}

// ============================================================================
// Mobile Processing Types
// ============================================================================

/**
 * Device capability information
 */
export interface DeviceCapabilities {
  /** Number of logical CPU cores */
  cpuCores: number;
  /** Device memory in GB (if available) */
  deviceMemory: number | null;
  /** Whether device is mobile */
  isMobile: boolean;
  /** Whether device has touch support */
  hasTouch: boolean;
  /** Whether device supports WebGL */
  hasWebGL: boolean;
  /** Whether device supports WebGPU */
  hasWebGPU: boolean;
  /** Whether device supports WASM SIMD */
  hasSIMD: boolean;
  /** Screen pixel density */
  pixelRatio: number;
  /** Network connection type (if available) */
  connectionType: string | null;
  /** Whether on slow connection */
  isSlowConnection: boolean;
  /** Device performance tier */
  performanceTier: 'low' | 'medium' | 'high';
}

/**
 * Mobile-optimized processing configuration
 */
export interface MobileProcessingConfig {
  /** Maximum processing dimension based on device */
  maxDimension: number;
  /** Target frame rate for live processing */
  targetFps: number;
  /** Whether to enable WASM acceleration */
  useWasm: boolean;
  /** Whether to use reduced precision */
  reducedPrecision: boolean;
  /** Quality level for processing */
  qualityLevel: 'low' | 'medium' | 'high';
  /** Number of worker threads to use */
  workerCount: number;
  /** Enable adaptive frame skipping */
  adaptiveFrameSkip: boolean;
  /** Memory limit in MB */
  memoryLimitMB: number;
}

/**
 * Processing quality preset
 */
export type MobileQualityPreset = 'fastest' | 'balanced' | 'quality';

/**
 * Mobile processing options
 */
export interface MobileProcessingOptions {
  /** Quality preset */
  preset?: MobileQualityPreset;
  /** Target frame rate */
  targetFps?: number;
  /** Maximum processing dimension */
  maxDimension?: number;
  /** Enable battery saving mode */
  batterySaver?: boolean;
  /** Enable adaptive quality adjustment */
  adaptiveQuality?: boolean;
}

/**
 * Frame processing result for mobile
 */
export interface MobileFrameResult extends ScanDocumentResult {
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Current FPS estimate */
  currentFps: number;
  /** Whether frame was skipped */
  wasSkipped: boolean;
  /** Current quality level */
  qualityLevel: 'low' | 'medium' | 'high';
}

/**
 * Mobile processor instance
 */
export interface MobileProcessor {
  /** Get current device capabilities */
  getCapabilities(): DeviceCapabilities;
  /** Get current processing configuration */
  getConfig(): MobileProcessingConfig;
  /** Update processing options */
  setOptions(options: MobileProcessingOptions): void;
  /** Process a single frame */
  processFrame(image: ImageInput): Promise<MobileFrameResult>;
  /** Start continuous processing from video element */
  startContinuousProcessing(
    video: HTMLVideoElement,
    callback: (result: MobileFrameResult) => void
  ): void;
  /** Stop continuous processing */
  stopContinuousProcessing(): void;
  /** Check if continuous processing is active */
  isProcessing(): boolean;
  /** Cleanup resources */
  destroy(): void;
}

// ============================================================================
// WebGPU Types
// ============================================================================

/**
 * WebGPU availability status
 */
export interface WebGPUStatus {
  /** Whether WebGPU is available */
  available: boolean;
  /** GPU adapter info (if available) */
  adapterInfo: GPUAdapterInfo | null;
  /** Reason for unavailability */
  reason?: string;
}

/**
 * WebGPU processing options
 */
export interface WebGPUProcessingOptions {
  /** Preferred power preference */
  powerPreference?: 'low-power' | 'high-performance';
  /** Enable async processing */
  asyncProcessing?: boolean;
  /** Workgroup size for compute shaders */
  workgroupSize?: number;
}

/**
 * WebGPU accelerated operations
 */
export interface WebGPUOperations {
  /** Check WebGPU availability */
  checkAvailability(): Promise<WebGPUStatus>;
  /** Initialize WebGPU context */
  initialize(options?: WebGPUProcessingOptions): Promise<boolean>;
  /** Perform Gaussian blur on GPU */
  gaussianBlur(
    imageData: ImageData,
    kernelSize: number,
    sigma?: number
  ): Promise<ImageData>;
  /** Perform Sobel edge detection on GPU */
  sobelEdgeDetection(imageData: ImageData): Promise<ImageData>;
  /** Convert to grayscale on GPU */
  grayscale(imageData: ImageData): Promise<ImageData>;
  /** Apply adaptive threshold on GPU */
  adaptiveThreshold(
    imageData: ImageData,
    blockSize: number,
    c: number
  ): Promise<ImageData>;
  /** Perform morphological operations on GPU */
  morphology(
    imageData: ImageData,
    operation: 'erode' | 'dilate' | 'open' | 'close',
    kernelSize: number
  ): Promise<ImageData>;
  /** Full document detection pipeline on GPU */
  detectDocument(
    imageData: ImageData,
    options?: EnhancedDetectionOptions
  ): Promise<EnhancedDetectionResult>;
  /** Check if operation is supported on GPU */
  isOperationSupported(operation: string): boolean;
  /** Get GPU memory usage estimate */
  getMemoryUsage(): { used: number; limit: number };
  /** Release GPU resources */
  dispose(): void;
}

// ============================================================================
// Barcode/QR Code Types
// ============================================================================

/**
 * Supported barcode formats
 */
export type BarcodeFormat =
  | 'qr_code'
  | 'data_matrix'
  | 'aztec'
  | 'pdf417'
  | 'code_128'
  | 'code_39'
  | 'code_93'
  | 'codabar'
  | 'ean_13'
  | 'ean_8'
  | 'upc_a'
  | 'upc_e'
  | 'itf'
  | 'unknown';

/**
 * Barcode detection result
 */
export interface BarcodeResult {
  /** Decoded data from the barcode */
  data: string;
  /** Format of the detected barcode */
  format: BarcodeFormat;
  /** Bounding box of the barcode */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Corner points of the barcode */
  cornerPoints: Point[];
  /** Detection confidence (0-1) */
  confidence: number;
  /** Raw bytes (if available) */
  rawBytes?: Uint8Array;
}

/**
 * QR code specific result with additional data
 */
export interface QRCodeResult extends BarcodeResult {
  format: 'qr_code';
  /** QR code version (1-40) */
  version?: number;
  /** Error correction level */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  /** Encoding mode */
  mode?: 'numeric' | 'alphanumeric' | 'byte' | 'kanji';
}

/**
 * Barcode detection options
 */
export interface BarcodeDetectionOptions {
  /** Formats to detect (empty = all) */
  formats?: BarcodeFormat[];
  /** Maximum number of barcodes to detect */
  maxDetections?: number;
  /** Enable tryHarder mode for difficult barcodes */
  tryHarder?: boolean;
  /** Enable pure barcode mode (no surrounding whitespace) */
  pureBarcode?: boolean;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Region of interest for detection */
  roi?: { x: number; y: number; width: number; height: number };
}

/**
 * Combined document and barcode scan result
 */
export interface CombinedScanResult extends ScanDocumentResult {
  /** Detected barcodes in the image */
  barcodes: BarcodeResult[];
  /** Whether any barcodes were found */
  hasBarcode: boolean;
}

/**
 * Barcode scanner interface
 */
export interface BarcodeScanner {
  /** Check if barcode detection is supported */
  isSupported(): boolean;
  /** Detect barcodes in an image */
  detect(
    image: ImageInput,
    options?: BarcodeDetectionOptions
  ): Promise<BarcodeResult[]>;
  /** Detect QR codes specifically */
  detectQRCodes(
    image: ImageInput,
    options?: Omit<BarcodeDetectionOptions, 'formats'>
  ): Promise<QRCodeResult[]>;
  /** Scan document and detect barcodes in one pass */
  scanWithBarcodes(
    image: ImageInput,
    documentOptions?: ScanDocumentOptions,
    barcodeOptions?: BarcodeDetectionOptions
  ): Promise<CombinedScanResult>;
  /** Start continuous barcode scanning from video */
  startScanning(
    video: HTMLVideoElement,
    callback: (results: BarcodeResult[]) => void,
    options?: BarcodeDetectionOptions
  ): void;
  /** Stop continuous scanning */
  stopScanning(): void;
}

// ============================================================================
// Image Enhancement Types
// ============================================================================

/**
 * Color adjustment options
 */
export interface ColorAdjustmentOptions {
  /** Brightness adjustment (-100 to 100) */
  brightness?: number;
  /** Contrast adjustment (-100 to 100) */
  contrast?: number;
  /** Saturation adjustment (-100 to 100) */
  saturation?: number;
  /** Hue rotation (0 to 360 degrees) */
  hue?: number;
  /** Gamma correction (0.1 to 10) */
  gamma?: number;
  /** Temperature adjustment (-100 to 100) */
  temperature?: number;
  /** Tint adjustment (-100 to 100) */
  tint?: number;
}

/**
 * Sharpening options
 */
export interface SharpenOptions {
  /** Sharpening amount (0 to 100) */
  amount?: number;
  /** Radius for sharpening kernel */
  radius?: number;
  /** Threshold for sharpening (0-255) */
  threshold?: number;
}

/**
 * Noise reduction options
 */
export interface NoiseReductionOptions {
  /** Strength of noise reduction (0 to 100) */
  strength?: number;
  /** Preserve edge details */
  preserveDetails?: boolean;
  /** Use bilateral filter for edge preservation */
  useBilateral?: boolean;
}

/**
 * Document enhancement preset
 */
export type DocumentEnhancementPreset =
  | 'auto'
  | 'photo'
  | 'text'
  | 'whiteboard'
  | 'receipt'
  | 'handwriting';

/**
 * Document enhancement options
 */
export interface DocumentEnhancementOptions {
  /** Enhancement preset */
  preset?: DocumentEnhancementPreset;
  /** Auto-rotate based on text orientation */
  autoRotate?: boolean;
  /** Remove background */
  removeBackground?: boolean;
  /** Enhance text readability */
  enhanceText?: boolean;
  /** Color adjustment options */
  colorAdjust?: ColorAdjustmentOptions;
  /** Sharpening options */
  sharpen?: SharpenOptions;
  /** Noise reduction options */
  noiseReduction?: NoiseReductionOptions;
  /** Convert to black and white */
  blackAndWhite?: boolean;
  /** Deskew document */
  deskew?: boolean;
}

/**
 * Image enhancement filter types
 */
export type FilterType =
  | 'gaussian_blur'
  | 'bilateral'
  | 'median'
  | 'guided'
  | 'unsharp_mask'
  | 'clahe'
  | 'histogram_eq'
  | 'gamma'
  | 'auto_levels'
  | 'shadow_removal'
  | 'white_balance'
  | 'denoise'
  | 'edge_enhance'
  | 'vintage'
  | 'sepia'
  | 'grayscale'
  | 'invert'
  | 'posterize'
  | 'vignette'
  | 'emboss'
  | 'sketch';

/**
 * Filter parameters vary by filter type
 */
export interface FilterParams {
  [key: string]: number | boolean | string;
}

/**
 * Image enhancement operations
 */
export interface ImageEnhancement {
  /** Apply a single filter */
  applyFilter(
    image: ImageInput,
    filter: FilterType,
    params?: FilterParams
  ): Promise<ImageData>;
  /** Apply multiple filters in sequence */
  applyFilters(
    image: ImageInput,
    filters: Array<{ filter: FilterType; params?: FilterParams }>
  ): Promise<ImageData>;
  /** Auto-enhance document */
  autoEnhance(
    image: ImageInput,
    options?: DocumentEnhancementOptions
  ): Promise<ImageData>;
  /** Adjust colors */
  adjustColors(
    image: ImageInput,
    options: ColorAdjustmentOptions
  ): Promise<ImageData>;
  /** Sharpen image */
  sharpen(image: ImageInput, options?: SharpenOptions): Promise<ImageData>;
  /** Reduce noise */
  reduceNoise(
    image: ImageInput,
    options?: NoiseReductionOptions
  ): Promise<ImageData>;
  /** Remove shadows */
  removeShadows(image: ImageInput): Promise<ImageData>;
  /** Auto white balance */
  autoWhiteBalance(image: ImageInput): Promise<ImageData>;
  /** Apply CLAHE */
  applyCLAHE(
    image: ImageInput,
    clipLimit?: number,
    gridSize?: number
  ): Promise<ImageData>;
  /** Deskew document */
  deskew(image: ImageInput): Promise<{ image: ImageData; angle: number }>;
}

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * Main entry point for document scanning.
 * Detects and optionally extracts documents from images with automatic contour detection.
 *
 * @param image - The source image to scan
 * @param options - Scanning options
 * @returns Promise resolving to scan result
 *
 * @example
 * // Detect document (returns corners only)
 * const detection = await scanDocument(img, { mode: 'detect' });
 * if (detection.success) {
 *   console.log('Found at:', detection.corners);
 * }
 *
 * @example
 * // Extract with perspective correction
 * const extracted = await scanDocument(img, { mode: 'extract', output: 'canvas' });
 */
export function scanDocument(
  image: ImageInput,
  options?: ScanDocumentOptions
): Promise<ScanDocumentResult>;

/**
 * Extract document with manual corner points (no detection).
 * Use this when you already have the corner points.
 *
 * @param image - The source image
 * @param corners - Corner points defining the document quadrilateral
 * @param options - Extraction options
 * @returns Promise resolving to extraction result
 *
 * @example
 * const corners = {
 *   topLeft: { x: 100, y: 50 },
 *   topRight: { x: 400, y: 60 },
 *   bottomRight: { x: 390, y: 300 },
 *   bottomLeft: { x: 110, y: 290 }
 * };
 * const result = await extractDocument(img, corners);
 */
export function extractDocument(
  image: ImageInput,
  corners: DocumentCorners,
  options?: ExtractDocumentOptions
): Promise<ExtractDocumentResult>;

/**
 * Enhanced document detection with advanced preprocessing and multiple detection methods.
 *
 * @param imageData - Image data to process
 * @param options - Detection options with preset support
 * @returns Promise resolving to enhanced detection result
 */
export function enhancedDocumentDetection(
  imageData: ImageData,
  options?: EnhancedDetectionOptions
): Promise<EnhancedDetectionResult>;

/**
 * Quick document detection for live camera preview.
 * Uses fastest settings for real-time performance.
 *
 * @param imageData - Image data to process
 * @param options - Additional options (merged with 'fast' preset)
 * @returns Promise resolving to detection result
 */
export function quickDocumentDetection(
  imageData: ImageData,
  options?: EnhancedDetectionOptions
): Promise<EnhancedDetectionResult>;

/**
 * ID document detection optimized for passports and ID cards.
 *
 * @param imageData - Image data to process
 * @param options - Additional options (merged with 'idDocument' preset)
 * @returns Promise resolving to detection result
 */
export function detectIDDocument(
  imageData: ImageData,
  options?: EnhancedDetectionOptions
): Promise<EnhancedDetectionResult>;

/**
 * Enhanced edge detection with all improvements.
 *
 * @param imageData - Image data to process
 * @param options - Edge detection options
 * @returns Promise resolving to edge detection result
 */
export function enhancedEdgeDetection(
  imageData: ImageData,
  options?: EnhancedDetectionOptions
): Promise<EdgeDetectionResult>;

/**
 * Detect document using Hough Line Transform.
 *
 * @param edges - Binary edge image
 * @param width - Image width
 * @param height - Image height
 * @param options - Detection options
 * @returns Promise resolving to Hough detection result
 */
export function detectDocumentHough(
  edges: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  options?: DetectionOptions
): Promise<EnhancedDetectionResult>;

// ============================================================================
// Mobile Processing API
// ============================================================================

/**
 * Detect device capabilities for optimal processing configuration.
 *
 * @returns Device capability information
 */
export function detectDeviceCapabilities(): DeviceCapabilities;

/**
 * Get recommended processing configuration for current device.
 *
 * @param capabilities - Device capabilities (optional, auto-detected if not provided)
 * @returns Recommended processing configuration
 */
export function getRecommendedConfig(
  capabilities?: DeviceCapabilities
): MobileProcessingConfig;

/**
 * Create a mobile-optimized processor instance.
 *
 * @param options - Processing options
 * @returns Mobile processor instance
 */
export function createMobileProcessor(
  options?: MobileProcessingOptions
): MobileProcessor;

/**
 * Process image with mobile-optimized settings.
 *
 * @param image - Image to process
 * @param options - Processing options
 * @returns Promise resolving to mobile frame result
 */
export function processMobileFrame(
  image: ImageInput,
  options?: MobileProcessingOptions
): Promise<MobileFrameResult>;

// ============================================================================
// WebGPU API
// ============================================================================

/**
 * WebGPU operations namespace.
 * Provides GPU-accelerated image processing when available.
 */
export const webgpu: WebGPUOperations;

/**
 * Check if WebGPU is available and get status.
 *
 * @returns Promise resolving to WebGPU status
 */
export function checkWebGPU(): Promise<WebGPUStatus>;

/**
 * Create GPU-accelerated processor.
 *
 * @param options - WebGPU options
 * @returns Promise resolving to WebGPU operations interface
 */
export function createGPUProcessor(
  options?: WebGPUProcessingOptions
): Promise<WebGPUOperations>;

// ============================================================================
// Barcode/QR Code API
// ============================================================================

/**
 * Barcode scanner instance.
 * Provides barcode and QR code detection capabilities.
 */
export const barcodeScanner: BarcodeScanner;

/**
 * Detect barcodes in an image.
 *
 * @param image - Image to scan
 * @param options - Detection options
 * @returns Promise resolving to array of detected barcodes
 */
export function detectBarcodes(
  image: ImageInput,
  options?: BarcodeDetectionOptions
): Promise<BarcodeResult[]>;

/**
 * Detect QR codes in an image.
 *
 * @param image - Image to scan
 * @param options - Detection options
 * @returns Promise resolving to array of detected QR codes
 */
export function detectQRCodes(
  image: ImageInput,
  options?: Omit<BarcodeDetectionOptions, 'formats'>
): Promise<QRCodeResult[]>;

/**
 * Scan document and detect barcodes in one pass.
 *
 * @param image - Image to process
 * @param documentOptions - Document scanning options
 * @param barcodeOptions - Barcode detection options
 * @returns Promise resolving to combined scan result
 */
export function scanWithBarcodes(
  image: ImageInput,
  documentOptions?: ScanDocumentOptions,
  barcodeOptions?: BarcodeDetectionOptions
): Promise<CombinedScanResult>;

// ============================================================================
// Image Enhancement API
// ============================================================================

/**
 * Image enhancement operations namespace.
 */
export const imageEnhancement: ImageEnhancement;

/**
 * Apply an image enhancement filter.
 *
 * @param image - Image to enhance
 * @param filter - Filter type to apply
 * @param params - Filter parameters
 * @returns Promise resolving to enhanced image data
 */
export function applyFilter(
  image: ImageInput,
  filter: FilterType,
  params?: FilterParams
): Promise<ImageData>;

/**
 * Auto-enhance a document image.
 *
 * @param image - Image to enhance
 * @param options - Enhancement options
 * @returns Promise resolving to enhanced image data
 */
export function autoEnhanceDocument(
  image: ImageInput,
  options?: DocumentEnhancementOptions
): Promise<ImageData>;

// ============================================================================
// Utility Types and Functions
// ============================================================================

/**
 * Library version string
 */
export const version: string;

/**
 * Check if WASM module is loaded and ready
 */
export function isWasmReady(): Promise<boolean>;

/**
 * Preload WASM module for faster first use
 */
export function preloadWasm(): Promise<void>;

/**
 * Get library configuration and capabilities
 */
export function getCapabilities(): {
  wasm: boolean;
  webgpu: boolean;
  barcodeDetection: boolean;
  simd: boolean;
  threads: boolean;
};

// ============================================================================
// Default Export
// ============================================================================

declare const scanic: {
  // Core functions
  scanDocument: typeof scanDocument;
  extractDocument: typeof extractDocument;
  enhancedDocumentDetection: typeof enhancedDocumentDetection;
  quickDocumentDetection: typeof quickDocumentDetection;
  detectIDDocument: typeof detectIDDocument;
  enhancedEdgeDetection: typeof enhancedEdgeDetection;
  detectDocumentHough: typeof detectDocumentHough;

  // Presets
  DETECTION_PRESETS: DetectionPresetsMap;

  // Mobile processing
  detectDeviceCapabilities: typeof detectDeviceCapabilities;
  getRecommendedConfig: typeof getRecommendedConfig;
  createMobileProcessor: typeof createMobileProcessor;
  processMobileFrame: typeof processMobileFrame;

  // WebGPU
  webgpu: WebGPUOperations;
  checkWebGPU: typeof checkWebGPU;
  createGPUProcessor: typeof createGPUProcessor;

  // Barcode/QR
  barcodeScanner: BarcodeScanner;
  detectBarcodes: typeof detectBarcodes;
  detectQRCodes: typeof detectQRCodes;
  scanWithBarcodes: typeof scanWithBarcodes;

  // Image enhancement
  imageEnhancement: ImageEnhancement;
  applyFilter: typeof applyFilter;
  autoEnhanceDocument: typeof autoEnhanceDocument;

  // Utilities
  version: string;
  isWasmReady: typeof isWasmReady;
  preloadWasm: typeof preloadWasm;
  getCapabilities: typeof getCapabilities;
};

export default scanic;
