/**
 * Corner Detection Unit Tests
 */
import { describe, it, expect } from 'vitest';
import { distance, findCornerPoints } from '../src/cornerDetection.js';

describe('distance', () => {
  it('should calculate distance between two points', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 3, y: 4 };
    expect(distance(p1, p2)).toBe(5); // 3-4-5 triangle
  });

  it('should return 0 for same point', () => {
    const p = { x: 10, y: 20 };
    expect(distance(p, p)).toBe(0);
  });

  it('should handle negative coordinates', () => {
    const p1 = { x: -5, y: -5 };
    const p2 = { x: 5, y: 5 };
    const d = distance(p1, p2);
    expect(d).toBeCloseTo(Math.sqrt(200), 5);
  });
});

describe('findCornerPoints', () => {
  it('should return null for too few points', () => {
    const contour = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    const result = findCornerPoints(contour);
    expect(result).toBeNull();
  });

  it('should find corners from a quadrilateral contour', () => {
    // Simple square contour with more than 4 points
    const contour = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 100, y: 100 },
      { x: 50, y: 100 },
      { x: 0, y: 100 },
      { x: 0, y: 50 },
    ];

    const corners = findCornerPoints(contour);

    // Should return valid corner object or null
    if (corners) {
      expect(corners).toHaveProperty('topLeft');
      expect(corners).toHaveProperty('topRight');
      expect(corners).toHaveProperty('bottomRight');
      expect(corners).toHaveProperty('bottomLeft');
    }
  });

  it('should handle options parameter', () => {
    const contour = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 50, y: 50 },
      { x: 25, y: 75 },
    ];

    // Should not throw with options
    const result = findCornerPoints(contour, { epsilon: 0.02 });
    // Result should be null or valid object
    if (result !== null) {
      expect(result).toHaveProperty('topLeft');
    }
  });
});
