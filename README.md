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

Scanic is a blazing-fast, lightweight, and modern document scanner library written in JavaScript and rust (WASM). It enables developers to detect, scan, and process documents from images directly in the browser or Node.js, with no dependencies or external services.

## Why Scanic?

I always wanted to use document scanning features within web environments for years. While OpenCV makes this easy, it comes at the cost of a **30+ MB** download.

Scanic combines pure JavaScript algorithms with **Rust-compiled WebAssembly** for performance-critical operations like Gaussian blur, Canny edge detection, and gradient calculations. This hybrid approach delivers near-native performance while maintaining JavaScript's accessibility and a lightweight footprint.

Performance-wise, I'm working to match OpenCV solutions while maintaining the lightweight footprint - this is an ongoing area of improvement.

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

## Usage

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

// Manual extraction with custom corner points (for image editors)
const corners = {
  topLeft: { x: 100, y: 50 },
  topRight: { x: 400, y: 60 },
  bottomRight: { x: 390, y: 300 },
  bottomLeft: { x: 110, y: 290 }
};
const manualExtract = await extractDocument(imageElement, corners);
if (manualExtract.success) {
  document.body.appendChild(manualExtract.output);
}
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

## Examples

```js
const options = {
  mode: 'extract',
  maxProcessingDimension: 1000,  // Higher quality, slower processing
  lowThreshold: 50,              // More sensitive edge detection
  highThreshold: 150,
  dilationKernelSize: 5,         // Larger dilation kernel
  minArea: 2000,                 // Larger minimum document area
  debug: true                    // Enable debug information
};

const result = await scanDocument(imageElement, options);
```

### Different Modes and Output Formats

```js
// Just detect (no image processing)
const detection = await scanDocument(imageElement, { mode: 'detect' });

// Extract as canvas
const extracted = await scanDocument(imageElement, { 
  mode: 'extract',
  output: 'canvas' 
});

// Extract as ImageData
const rawData = await scanDocument(imageElement, { 
  mode: 'extract',
  output: 'imagedata' 
});

// Extract as DataURI
const rawData = await scanDocument(imageElement, { 
  mode: 'extract',
  output: 'dataurl' 
});

```

## Framework Examples


👉 **[Vue.js Example & Guide](docs/vue-example.md)**

👉 **[React Example & Guide](docs/react-example.md)**


## Development

Clone the repository and set up the development environment:

```bash
git clone https://github.com/marquaye/scanic.git
cd scanic
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

The built files will be available in the `dist/` directory.

### Building the WebAssembly Module

The Rust WASM module is pre-compiled and included in the repository. If you need to rebuild it:

```bash
npm run build:wasm
```

This uses Docker to build the WASM module without requiring local Rust installation.


### Performance Architecture

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

Please ensure your code follows the existing style.

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

## Roadmap

- [x] ~~Enhanced WASM module with additional Rust-optimized algorithms~~
- [x] ~~CLAHE preprocessing for uneven lighting~~
- [x] ~~Hough Line Transform for precise edge detection~~
- [x] ~~ID document detection with aspect ratio validation~~
- [x] ~~Confidence scoring and document validation~~
- [ ] TypeScript definitions
- [ ] Additional image enhancement filters
- [ ] Mobile-optimized processing
- [ ] WebGPU acceleration for supported browsers
- [ ] Barcode/QR code detection integration

## License

MIT License © [marquaye](https://github.com/marquaye)

