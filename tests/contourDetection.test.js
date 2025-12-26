/**
 * Contour Detection Unit Tests
 *
 * Tests for the contour detection functions that don't require WASM.
 */
import { describe, it, expect } from 'vitest';
import { detectDocumentContour } from '../src/contourDetection.js';

describe('detectDocumentContour', () => {
  it('should detect document contour from edge image', () => {
    // Create a document-like rectangular edge pattern
    const width = 100;
    const height = 100;
    const edges = new Uint8ClampedArray(width * height);

    // Draw a large rectangle (document boundary)
    for (let x = 10; x <= 90; x++) {
      edges[10 * width + x] = 255;  // Top
      edges[90 * width + x] = 255;  // Bottom
    }
    for (let y = 10; y <= 90; y++) {
      edges[y * width + 10] = 255;  // Left
      edges[y * width + 90] = 255;  // Right
    }

    const contours = detectDocumentContour(edges, {
      minArea: 100,
      width,
      height,
    });

    expect(contours).toBeDefined();
    expect(contours.length).toBeGreaterThan(0);
  });

  it('should filter contours by minimum area', () => {
    const width = 50;
    const height = 50;
    const edges = new Uint8ClampedArray(width * height);

    // Small rectangle (should be filtered)
    for (let x = 5; x <= 10; x++) {
      edges[5 * width + x] = 255;
      edges[10 * width + x] = 255;
    }
    for (let y = 5; y <= 10; y++) {
      edges[y * width + 5] = 255;
      edges[y * width + 10] = 255;
    }

    const contours = detectDocumentContour(edges, {
      minArea: 1000, // Large minimum area
      width,
      height,
    });

    // Should not find any contours meeting the area requirement
    expect(contours.length).toBe(0);
  });

  it('should return empty array for blank image', () => {
    const edges = new Uint8ClampedArray(100);
    const contours = detectDocumentContour(edges, {
      width: 10,
      height: 10,
      minArea: 10,
    });

    expect(contours).toBeDefined();
    expect(contours.length).toBe(0);
  });

  it('should handle single pixel edge', () => {
    const width = 10;
    const height = 10;
    const edges = new Uint8ClampedArray(width * height);
    edges[55] = 255; // Single pixel

    const contours = detectDocumentContour(edges, {
      width,
      height,
      minArea: 1,
    });

    // Should return some result (even if empty for single pixel)
    expect(contours).toBeDefined();
  });
});
