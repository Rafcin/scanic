/**
 * Edge Detection Unit Tests
 *
 * Tests for edge detection utility functions that don't require WASM.
 */
import { describe, it, expect } from 'vitest';
import { convertToGrayscale } from '../src/edgeDetection.js';

describe('convertToGrayscale', () => {
  it('should convert RGBA image data to grayscale', () => {
    // Create a simple 2x2 RGBA image
    const imageData = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        255, 0, 0, 255,     // Red pixel
        0, 255, 0, 255,     // Green pixel
        0, 0, 255, 255,     // Blue pixel
        255, 255, 255, 255, // White pixel
      ]),
    };

    const grayscale = convertToGrayscale(imageData);

    // Can be Uint8Array or Uint8ClampedArray
    expect(grayscale.length).toBe(4); // 2x2 pixels

    // Implementation uses Rec. 709/sRGB: (R*54 + G*183 + B*19) >> 8
    // Red (255,0,0): (255*54)>>8 = 53
    expect(grayscale[0]).toBeGreaterThan(45);
    expect(grayscale[0]).toBeLessThan(60);

    // Green (0,255,0): (255*183)>>8 = 182
    expect(grayscale[1]).toBeGreaterThan(175);
    expect(grayscale[1]).toBeLessThan(190);

    // Blue (0,0,255): (255*19)>>8 = 18
    expect(grayscale[2]).toBeGreaterThan(10);
    expect(grayscale[2]).toBeLessThan(25);

    // White should stay ~255
    expect(grayscale[3]).toBeGreaterThan(250);
  });

  it('should handle black image', () => {
    const imageData = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray(16).fill(0),
    };
    // Set alpha to 255
    for (let i = 3; i < 16; i += 4) {
      imageData.data[i] = 255;
    }

    const grayscale = convertToGrayscale(imageData);

    expect(Array.from(grayscale).every(v => v === 0)).toBe(true);
  });

  it('should handle uniform gray image', () => {
    const grayValue = 128;
    const imageData = {
      width: 3,
      height: 3,
      data: new Uint8ClampedArray(36),
    };
    for (let i = 0; i < 36; i += 4) {
      imageData.data[i] = grayValue;
      imageData.data[i + 1] = grayValue;
      imageData.data[i + 2] = grayValue;
      imageData.data[i + 3] = 255;
    }

    const grayscale = convertToGrayscale(imageData);

    // All values should be approximately equal to input gray value
    Array.from(grayscale).forEach(v => {
      expect(Math.abs(v - grayValue)).toBeLessThan(2);
    });
  });

  it('should handle large images', () => {
    const width = 100;
    const height = 100;
    const imageData = {
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    };
    // Fill with random colors
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = Math.floor(Math.random() * 256);
      imageData.data[i + 1] = Math.floor(Math.random() * 256);
      imageData.data[i + 2] = Math.floor(Math.random() * 256);
      imageData.data[i + 3] = 255;
    }

    const grayscale = convertToGrayscale(imageData);

    expect(grayscale.length).toBe(width * height);
    // All values should be in valid range
    Array.from(grayscale).forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    });
  });
});
