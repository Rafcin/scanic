<p align="center">
  <a href="#">
    <img src="public/scanic-logo-bg.png" alt="scanic logo" height="400">
  </a>
</p>

<p align="center">
    <a href="https://npmjs.com/package/scanic"><img src="https://badgen.net/npm/dw/scanic"></a>
    <br />
    <a href="https://github.com/marquaye/scanic/blob/master/LICENSE"><img src="https://img.shields.io/github/license/marquaye/scanic.svg"></a>
    <a href="https://npmjs.com/package/scanic"><img src="https://badgen.net/npm/v/scanic"></a>
</p>

# Scanic

**Modern Document Scanner for the Web**

Scanic is a blazing-fast, lightweight, and modern document scanner library written in JavaScript and Rust (WASM). It enables developers to detect, scan, and process documents from images directly in the browser or Node.js, with no dependencies or external services.

## Table of Contents

- [Why Scanic?](#why-scanic)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [WASM Module Documentation](#wasm-module-documentation)
- [Development Guide](#development-guide)
- [Testing](#testing)
- [Framework Examples](#framework-examples)
- [Contributing](#contributing)
- [License](#license)

## Why Scanic?

I always wanted to use document scanning features within web environments for years. While OpenCV makes this easy, it comes at the cost of a **30+ MB** download.

Scanic combines pure JavaScript algorithms with **Rust-compiled WebAssembly** for performance-critical operations like Gaussian blur, Canny edge detection, and gradient calculations. This hybrid approach delivers near-native performance while maintaining JavaScript's accessibility and a lightweight footprint.

This library is heavily inspired by [jscanify](https://github.com/puffinsoft/jscanify)

## Features

- 📄 **Document Detection**: Accurately finds and extracts document contours from images
- 🆔 **ID Document Optimized**: Special detection mode for passports, driver's licenses, and ID cards
- ⚡ **Pure JavaScript**: Works everywhere JavaScript runs
- 🦀 **Rust WebAssembly**: Performance-critical operations optimized with Rust-compiled WASM
- 🔬 **OpenCV-Level Accuracy**: Advanced algorithms including CLAHE, Sobel/Scharr gradients, and Hough Line Transform
- 🛠️ **Easy Integration**: Simple API for web apps, Electron, or Node.js applications
- 🏷️ **MIT Licensed**: Free for personal and commercial use
- 📦 **Lightweight**: Small bundle size (~250kb) compared to OpenCV-based solutions (+30 mb)

## Demo

Try the live demo: [Open Demo](https://marquaye.github.io/scanic/demo.html)

## Installation

```bash
npm install scanic
```

Or use via CDN:

```html
<script src="https://unpkg.com/scanic/dist/scanic.js"></script>
```

## Quick Start

```js
import { scanDocument, extractDocument, detectIDDocument, enhancedDocumentDetection } from 'scanic';

// Simple usage - just detect document
const result = await scanDocument(imageElement);
if (result.success) {
  console.log('Document found at corners:', result.corners);
}

// Extract the document (with perspective correction)
const extracted = await scanDocument(imageElement, { mode: 'extract' });
if (extracted.success) {
  document.body.appendChild(extracted.output); // Display extracted document
}

// Detect ID documents (passports, driver's licenses) with optimized settings
const idResult = await detectIDDocument(imageElement);
if (idResult.success) {
  console.log('ID document detected with', idResult.confidence, 'confidence');
  console.log('Document type:', idResult.validation.documentType); // 'id_card', 'passport', etc.
}

// Enhanced detection with custom presets
const enhanced = await enhancedDocumentDetection(imageElement, { preset: 'accurate' });
// Presets: 'fast', 'balanced', 'accurate', 'idDocument'
```

### Complete Example

```js
import { scanDocument } from 'scanic';

async function processDocument() {
  // Get image from file input or any source
  const imageFile = document.getElementById('fileInput').files[0];
  const img = new Image();

  img.onload = async () => {
    try {
      // Extract and display the scanned document
      const result = await scanDocument(img, {
        mode: 'extract',
        output: 'canvas'
      });

      if (result.success) {
        // Add the extracted document to the page
        document.getElementById('output').appendChild(result.output);

        // Or get as data URL for download/display
        const dataUrl = result.output.toDataURL('image/png');
        console.log('Extracted document as data URL:', dataUrl);
      }
    } catch (error) {
      console.error('Error processing document:', error);
    }
  };

  img.src = URL.createObjectURL(imageFile);
}

// HTML setup
// <input type="file" id="fileInput" accept="image/*" onchange="processDocument()">
// <div id="output"></div>
```

## API Reference

### Core Functions

#### `scanDocument(image, options?)`
Main entry point for document scanning with flexible modes and output options.

**Parameters:**
- `image`: HTMLImageElement, HTMLCanvasElement, or ImageData
- `options`: Optional configuration object
  - `mode`: String - 'detect' (default), or 'extract'
    - `'detect'`: Only detect document, return corners/contour info (no image processing)
    - `'extract'`: Extract/warp the document region
  - `output`: String - 'canvas' (default), 'imagedata', or 'dataurl'
  - `debug`: Boolean (default: false) - Enable debug information
  - Detection options:
    - `maxProcessingDimension`: Number (default: 800) - Maximum dimension for processing in pixels
    - `lowThreshold`: Number (default: 75) - Lower threshold for Canny edge detection
    - `highThreshold`: Number (default: 200) - Upper threshold for Canny edge detection
    - `dilationKernelSize`: Number (default: 3) - Kernel size for dilation
    - `dilationIterations`: Number (default: 1) - Number of dilation iterations
    - `minArea`: Number (default: 1000) - Minimum contour area for document detection
    - `epsilon`: Number - Epsilon for polygon approximation

**Returns:** `Promise<{ output, corners, contour, debug, success, message }>`

- `output`: Processed image (null for 'detect' mode)
- `corners`: Object with `{ topLeft, topRight, bottomRight, bottomLeft }` coordinates
- `contour`: Array of contour points
- `success`: Boolean indicating if document was detected
- `message`: Status message

#### `enhancedDocumentDetection(image, options?)`
Advanced document detection with OpenCV-level algorithms and confidence scoring.

**Parameters:**
- `image`: HTMLImageElement, HTMLCanvasElement, or ImageData
- `options`: Configuration object
  - `preset`: String - 'fast', 'balanced' (default), 'accurate', or 'idDocument'
  - `debug`: Boolean - Enable debug information

**Returns:** `Promise<{ corners, confidence, validation, edges, success, message }>`

- `confidence`: Number (0-1) indicating detection confidence
- `validation`: Object with shape scores, aspect ratio analysis, and document type
- `edges`: Edge detection result

#### `detectIDDocument(image, options?)`
Specialized detection for ID documents (passports, driver's licenses, ID cards).

Uses optimized settings for rectangular ID documents with specific aspect ratios (CR-80: 1.586:1, Passport: 1.42:1).

#### `quickDocumentDetection(image, options?)`
Fast detection mode optimized for real-time camera preview.

### Detection Presets

```js
import { DETECTION_PRESETS } from 'scanic';

// Available presets:
// - 'fast': Minimal processing, best for real-time preview
// - 'balanced': Good accuracy with reasonable performance (default)
// - 'accurate': Maximum accuracy, slower processing
// - 'idDocument': Optimized for passports and ID cards
```

---

## WASM Module Documentation

Scanic includes a powerful Rust-based WebAssembly module that provides OpenCV-level image processing capabilities. The WASM module is located in `wasm_blur/` and can be used directly for advanced use cases.

### WASM Module Overview

The WASM module provides **96+ tested functions** across multiple categories:

| Category | Functions | Description |
|----------|-----------|-------------|
| **Edge Detection** | 8 | Canny, Sobel (3x3, 5x5), Scharr, Gradient magnitude |
| **Thresholding** | 8 | Otsu, Adaptive (mean, Gaussian, Sauvola, Niblack) |
| **Enhancement** | 7 | CLAHE, Histogram EQ, Gamma, Contrast stretch |
| **Smoothing** | 10 | Gaussian, Bilateral, Guided filter, Median |
| **Shadow Removal** | 7 | Retinex, DoG, Local normalization, White balance |
| **Contours** | 8 | Suzuki85 findContours, Douglas-Peucker approximation |
| **Corner Detection** | 5 | Harris, Shi-Tomasi, FAST, Sub-pixel refinement |
| **Perspective** | 7 | warpPerspective, bicubic interpolation |
| **Features** | 4 | ORB, BRIEF, Hamming matching, RANSAC homography |
| **Morphology** | 12 | Erode, Dilate, Open, Close, Skeletonize, Top-hat |

### Using WASM Directly

You can import and use the WASM module directly for advanced image processing:

```js
// Import the WASM module
import init, {
  // Gaussian blur
  blur,

  // Edge detection
  canny_edge_detector_full,
  sobel_gradients_3x3,
  sobel_gradients_5x5,
  scharr_gradients_3x3,

  // Enhancement
  clahe,
  histogram_equalization,
  gamma_correction,
  contrast_stretch,

  // Shadow removal
  remove_shadows_retinex,
  remove_shadows_dog,
  auto_white_balance,
  enhance_document_lighting,

  // Corner detection
  corner_harris,
  good_features_to_track,
  fast_corners,

  // Contours
  find_contours,
  approx_poly_dp,
  convex_hull,

  // Perspective transform
  get_perspective_transform,
  warp_perspective,
  warp_document,

  // Morphology
  erode,
  dilate_enhanced,
  morphological_open,
  morphological_close,

  // Features
  compute_orb_features,
  match_descriptors,
  find_homography_ransac,

  // Guided filter
  guided_filter,
  guided_filter_fast,

} from './wasm_blur/pkg/wasm_blur.js';

// Initialize WASM
await init();

// Example: Apply CLAHE to improve contrast
const enhanced = clahe(grayscaleData, width, height, 8, 8, 40.0);

// Example: Detect corners using Harris
const response = corner_harris(grayscaleData, width, height, 3, 3, 0.04);

// Example: Remove shadows from document
const shadowFree = remove_shadows_dog(grayscaleData, width, height, 2.0, 50.0);
```

### WASM Function Reference

#### Edge Detection

```js
// Full Canny edge detection
const edges = canny_edge_detector_full(
  grayscale,    // Uint8Array
  width,        // number
  height,       // number
  lowThreshold, // number (e.g., 50)
  highThreshold,// number (e.g., 150)
  kernelSize,   // number (3 or 5)
  sigma,        // number (e.g., 1.4)
  l2Gradient,   // boolean
  applyDilation,// boolean
  dilationSize  // number
);

// Sobel gradients
const gradients = sobel_gradients_3x3(grayscale, width, height);
// Returns interleaved [gx1, gy1, gx2, gy2, ...]
```

#### Enhancement

```js
// CLAHE (Contrast Limited Adaptive Histogram Equalization)
const enhanced = clahe(
  grayscale,    // Uint8Array
  width,        // number
  height,       // number
  tileGridX,    // number (e.g., 8)
  tileGridY,    // number (e.g., 8)
  clipLimit     // number (e.g., 40.0)
);

// Gamma correction
const corrected = gamma_correction(grayscale, width, height, gamma);
// gamma < 1 = brighter, gamma > 1 = darker
```

#### Shadow Removal

```js
// Remove shadows using Difference of Gaussians
const clean = remove_shadows_dog(
  grayscale,    // Uint8Array
  width,        // number
  height,       // number
  sigmaSmall,   // number (e.g., 2.0)
  sigmaLarge    // number (e.g., 50.0)
);

// Multi-scale Retinex for illumination invariance
const normalized = remove_shadows_retinex(
  grayscale,    // Uint8Array
  width,        // number
  height,       // number
  gain,         // number (e.g., 1.0)
  offset        // number (e.g., 0.0)
);

// Complete document lighting enhancement (RGBA)
const enhanced = enhance_document_lighting(rgba, width, height);
```

#### Corner Detection

```js
// Harris corner detector
const response = corner_harris(
  grayscale,    // Uint8Array
  width,        // number
  height,       // number
  blockSize,    // number (e.g., 3)
  kSize,        // number (3, 5, or 7)
  k             // number (e.g., 0.04)
);

// Good features to track (Shi-Tomasi)
const corners = good_features_to_track(
  grayscale,    // Uint8Array
  width,        // number
  height,       // number
  maxCorners,   // number (e.g., 100)
  qualityLevel, // number (0-1, e.g., 0.1)
  minDistance,  // number (e.g., 10)
  blockSize,    // number (e.g., 3)
  useHarris,    // boolean
  k             // number (for Harris)
);
// Returns [x1, y1, x2, y2, ...]

// FAST corner detector
const corners = fast_corners(grayscale, width, height, threshold, nonmaxSuppression);
```

#### Contour Detection

```js
// Find contours (Suzuki85 algorithm)
const contours = find_contours(
  binary,       // Uint8Array (0 or 255)
  width,        // number
  height,       // number
  mode,         // RetrievalMode (0=External, 1=List, 2=CComp, 3=Tree)
  method        // ApproxMethod (0=None, 1=Simple)
);
// Returns [numContours, numPoints1, x1, y1, x2, y2, ..., numPoints2, ...]

// Douglas-Peucker approximation
const simplified = approx_poly_dp(
  contour,      // Int32Array [x1, y1, x2, y2, ...]
  epsilon,      // number
  closed        // boolean
);
```

#### Perspective Transform

```js
// Compute perspective transformation matrix
const matrix = get_perspective_transform(
  srcPoints,    // [x1,y1, x2,y2, x3,y3, x4,y4]
  dstPoints     // [x1,y1, x2,y2, x3,y3, x4,y4]
);
// Returns 3x3 matrix as flat array

// Warp image with perspective transform
const warped = warp_perspective(
  src,          // Uint8Array
  srcWidth,     // number
  srcHeight,    // number
  matrix,       // Float64Array (3x3)
  dstWidth,     // number
  dstHeight,    // number
  channels      // number (1 or 4)
);

// Convenience: Warp document by corners
const extracted = warp_document(
  rgba,         // Uint8Array (RGBA)
  srcWidth,     // number
  srcHeight,    // number
  corners,      // [tl_x,tl_y, tr_x,tr_y, br_x,br_y, bl_x,bl_y]
  dstWidth,     // number (0 = auto)
  dstHeight,    // number (0 = auto)
  useBicubic    // boolean
);
```

#### Guided Filter

```js
// Fast edge-aware smoothing (O(1) complexity)
const smoothed = guided_filter(
  input,        // Uint8Array (grayscale)
  guide,        // Uint8Array (edge guide, can be same as input)
  width,        // number
  height,       // number
  radius,       // number
  eps           // number (regularization, e.g., 0.01)
);

// Fast variant using subsampling
const smoothed = guided_filter_fast(
  input, guide, width, height, radius, eps,
  subsample     // number (e.g., 4)
);
```

#### Feature Matching

```js
// Compute ORB features
const features = compute_orb_features(
  grayscale,    // Uint8Array
  width,        // number
  height,       // number
  maxFeatures,  // number
  threshold     // number
);
// Returns [numFeatures, x1, y1, angle1, scale1, desc1..., x2, ...]

// Match descriptors using Hamming distance
const matches = match_descriptors(
  desc1,        // Uint8Array
  desc2,        // Uint8Array
  descSize,     // number (32 for BRIEF)
  maxDistance   // number
);
// Returns [idx1, idx2, distance, ...]

// Find homography with RANSAC
const homography = find_homography_ransac(
  srcPoints,    // Float32Array
  dstPoints,    // Float32Array
  iterations,   // number (e.g., 1000)
  threshold     // number (e.g., 3.0)
);
```

---

## Development Guide

### Prerequisites

- **Node.js** 18+ and npm
- **Rust** 1.70+ (for WASM development)
- **wasm-pack** (for building WASM)

### Setting Up the Development Environment

```bash
# Clone the repository
git clone https://github.com/marquaye/scanic.git
cd scanic

# Install JavaScript dependencies
npm install

# Start the development server
npm run dev
```

### Project Structure

```
scanic/
├── src/                    # JavaScript source files
│   ├── index.js           # Main entry point
│   ├── scanner.js         # Core scanning logic
│   ├── edgeDetection.js   # Edge detection algorithms
│   ├── cornerDetection.js # Corner detection
│   ├── contourDetection.js# Contour finding
│   └── enhancedDetection.js # Advanced detection
├── wasm_blur/             # Rust WASM module
│   ├── src/
│   │   ├── lib.rs         # Module exports
│   │   ├── gaussian_blur.rs
│   │   ├── canny.rs
│   │   ├── sobel.rs
│   │   ├── clahe.rs
│   │   ├── adaptive_threshold.rs
│   │   ├── hough.rs
│   │   ├── morphology.rs
│   │   ├── contours.rs
│   │   ├── perspective.rs
│   │   ├── bilateral.rs
│   │   ├── corners.rs
│   │   ├── guided_filter.rs
│   │   ├── shadow_removal.rs
│   │   └── features.rs
│   ├── Cargo.toml
│   └── pkg/               # Built WASM package
├── tests/                 # JavaScript tests
├── dist/                  # Built distribution files
└── demo.html             # Interactive demo
```

### Building the JavaScript Bundle

```bash
# Development build with watch
npm run dev

# Production build
npm run build
```

The built files will be available in the `dist/` directory.

### Building the WebAssembly Module

The Rust WASM module is pre-compiled and included in the repository. To rebuild it:

#### Option 1: Using wasm-pack directly (requires Rust)

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install wasm-pack
cargo install wasm-pack

# Build the WASM module
cd wasm_blur
wasm-pack build --target web

# The output will be in wasm_blur/pkg/
```

#### Option 2: Using Docker (no Rust installation required)

```bash
npm run build:wasm
```

This uses Docker to build the WASM module without requiring a local Rust installation.

### WASM Build Options

```bash
# Build for web (ES modules)
wasm-pack build --target web

# Build for bundlers (webpack, rollup)
wasm-pack build --target bundler

# Build for Node.js
wasm-pack build --target nodejs

# Release build with optimizations
wasm-pack build --target web --release
```

### Adding New WASM Functions

1. Create or edit a Rust file in `wasm_blur/src/`:

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn my_new_function(input: &[u8], width: usize, height: usize) -> Vec<u8> {
    // Implementation
    let mut output = vec![0u8; width * height];
    // ... processing ...
    output
}
```

2. Export in `lib.rs`:

```rust
pub mod my_module;
pub use my_module::my_new_function;
```

3. Rebuild WASM:

```bash
cd wasm_blur
wasm-pack build --target web
```

4. Use in JavaScript:

```js
import init, { my_new_function } from './wasm_blur/pkg/wasm_blur.js';
await init();
const result = my_new_function(data, width, height);
```

---

## Testing

Scanic includes comprehensive tests for both JavaScript and Rust code.

### Running JavaScript Tests

```bash
# Run all JavaScript tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Running Rust Tests

```bash
# Run all Rust tests
npm run test:rust

# Or directly with cargo
cd wasm_blur
cargo test
```

### Running All Tests

```bash
# Run both JavaScript and Rust tests
npm run test:all
```

### Test Coverage

The test suite includes:

- **JavaScript Tests (14 tests)**
  - Edge detection (grayscale conversion)
  - Corner detection (distance calculation, corner finding)
  - Contour detection (document contour detection)

- **Rust Tests (96 tests)**
  - CLAHE: histogram equalization, gamma correction, contrast stretch
  - Adaptive thresholding: Otsu's method, mean/gaussian thresholding
  - Hysteresis: edge tracking, binary conversion
  - Sobel: gradient detection for horizontal/vertical edges
  - Document detection: rectangle validation, aspect ratios
  - Morphology: erosion, dilation, gap closing
  - Contours: Suzuki85 algorithm, Douglas-Peucker
  - Corners: Harris, Shi-Tomasi, FAST
  - Perspective: matrix computation, warping
  - Bilateral: edge-preserving smoothing
  - Guided filter: O(1) smoothing
  - Shadow removal: Retinex, DoG, white balance
  - Features: ORB, BRIEF, matching

### Writing Tests

#### JavaScript Tests (Vitest)

```js
// tests/myFeature.test.js
import { describe, it, expect } from 'vitest';
import { myFunction } from '../src/myModule.js';

describe('myFunction', () => {
  it('should process data correctly', () => {
    const input = new Uint8Array([128, 128, 128, 128]);
    const result = myFunction(input, 2, 2);
    expect(result.length).toBe(4);
  });
});
```

#### Rust Tests

```rust
// wasm_blur/src/my_module.rs

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_my_function() {
        let input = vec![128u8; 100];
        let output = my_function(&input, 10, 10);
        assert_eq!(output.len(), 100);
    }
}
```

---

## Framework Examples

👉 **[Vue.js Example & Guide](docs/vue-example.md)**

👉 **[React Example & Guide](docs/react-example.md)**

---

## Performance Architecture

Scanic uses a **hybrid JavaScript + WebAssembly approach**:

- **JavaScript Layer**: High-level API, DOM manipulation, and workflow coordination
- **WebAssembly Layer**: CPU-intensive operations including:
  - Gaussian blur with SIMD optimizations
  - Canny edge detection with hysteresis thresholding
  - Gradient calculations using Sobel/Scharr operators
  - Non-maximum suppression for edge thinning
  - Morphological operations (dilation, erosion, opening, closing)
  - **CLAHE** (Contrast Limited Adaptive Histogram Equalization)
  - **Adaptive thresholding** (Mean, Gaussian, Sauvola, Niblack, Otsu)
  - **Hough Line Transform** for precise edge detection
  - **Document validation** with confidence scoring
  - **Sub-pixel corner refinement**
  - **Guided filter** for O(1) edge-aware smoothing
  - **Shadow removal** (Retinex, DoG, local normalization)
  - **ORB/BRIEF features** for document matching

---

## Contributing

Contributions are welcome! Here's how you can help:

1. **Report Issues**: Found a bug? Open an issue with details and reproduction steps
2. **Feature Requests**: Have an idea? Create an issue to discuss it
3. **Pull Requests**: Ready to contribute code?
   - Fork the repository
   - Create a feature branch (`git checkout -b feature/amazing-feature`)
   - Commit your changes (`git commit -m 'Add amazing feature'`)
   - Push to the branch (`git push origin feature/amazing-feature`)
   - Open a Pull Request

Please ensure your code follows the existing style and includes tests.

### Development Workflow

```bash
# 1. Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/scanic.git
cd scanic

# 2. Install dependencies
npm install

# 3. Create a feature branch
git checkout -b feature/my-feature

# 4. Make changes and test
npm test
npm run test:rust

# 5. Build and verify
npm run build
wasm-pack build --target web

# 6. Commit and push
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature

# 7. Open a Pull Request on GitHub
```

---

## 💖 Sponsors

<p align="center">
  <strong>Special thanks to our amazing sponsors who make this project possible!</strong>
</p>

<div align="center">

### 🏆 Gold Sponsors

<table>
  <tr style="color: black;">
    <td align="center" width="300">
      <a href="https://zeugnisprofi.com" target="_blank">
        <br/>
        <strong>ZeugnisProfi</strong>
      </a>
      <br/>
      <em>Professional certificate and document services</em>
    </td>
    <td align="center" width="300">
      <a href="https://zeugnisprofi.de" target="_blank">
        <br/>
        <strong>ZeugnisProfi.de</strong>
      </a>
      <br/>
      <em>German document processing specialists</em>
    </td>
    <td align="center" width="250">
      <a href="https://www.verlingo.de" target="_blank">
        <br/>
        <strong>Verlingo</strong>
      </a>
      <br/>
      <em>Language and translation services</em>
    </td>
  </tr>
</table>

</div>

---

## Roadmap

- [x] ~~Enhanced WASM module with additional Rust-optimized algorithms~~
- [x] ~~CLAHE preprocessing for uneven lighting~~
- [x] ~~Hough Line Transform for precise edge detection~~
- [x] ~~ID document detection with aspect ratio validation~~
- [x] ~~Confidence scoring and document validation~~
- [x] ~~Comprehensive unit testing (96+ Rust tests, 14 JS tests)~~
- [x] ~~Shadow removal and document lighting enhancement~~
- [x] ~~ORB/BRIEF feature detection and matching~~
- [x] ~~Guided filter for edge-aware smoothing~~
- [ ] TypeScript definitions
- [ ] Additional image enhancement filters
- [ ] Mobile-optimized processing
- [ ] WebGPU acceleration for supported browsers
- [ ] Barcode/QR code detection integration

---

## License

MIT License © [marquaye](https://github.com/marquaye)
