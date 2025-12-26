/**
 * Detection Accuracy Tests
 *
 * These tests compare the document detection results against ground truth
 * annotations created with the annotation tool (dev/annotate.html).
 *
 * To create/update ground truth:
 * 1. Run `bun dev` and navigate to /dev/annotate.html
 * 2. Click on test images and mark the 4 corners
 * 3. Export the JSON file as testData/ground-truth-annotations.json
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';

// Mock browser APIs
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

global.window = dom.window;
global.document = dom.window.document;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
global.HTMLImageElement = dom.window.HTMLImageElement;
global.Image = dom.window.Image;
global.ImageData = dom.window.ImageData;

// Path to ground truth file
const GROUND_TRUTH_PATH = path.join(__dirname, '../testData/ground-truth-annotations.json');

// IoU threshold for passing a test (70% overlap)
const IOU_THRESHOLD = 0.7;

// Corner distance threshold in pixels (for per-corner accuracy)
const CORNER_THRESHOLD = 30;

/**
 * Calculate Intersection over Union (IoU) for two quadrilaterals
 * Uses bounding box approximation for simplicity
 */
function calculateBoundingBoxIoU(corners1, corners2) {
  const getBounds = (corners) => {
    const xs = corners.map(c => c.x);
    const ys = corners.map(c => c.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys)
    };
  };

  const b1 = getBounds(corners1);
  const b2 = getBounds(corners2);

  const intersectX = Math.max(0, Math.min(b1.maxX, b2.maxX) - Math.max(b1.minX, b2.minX));
  const intersectY = Math.max(0, Math.min(b1.maxY, b2.maxY) - Math.max(b1.minY, b2.minY));
  const intersection = intersectX * intersectY;

  const area1 = (b1.maxX - b1.minX) * (b1.maxY - b1.minY);
  const area2 = (b2.maxX - b2.minX) * (b2.maxY - b2.minY);
  const union = area1 + area2 - intersection;

  return union > 0 ? intersection / union : 0;
}

/**
 * Calculate average corner distance between two sets of corners
 */
function calculateCornerDistance(corners1, corners2) {
  if (corners1.length !== 4 || corners2.length !== 4) {
    return Infinity;
  }

  let totalDistance = 0;
  for (let i = 0; i < 4; i++) {
    const dx = corners1[i].x - corners2[i].x;
    const dy = corners1[i].y - corners2[i].y;
    totalDistance += Math.sqrt(dx * dx + dy * dy);
  }

  return totalDistance / 4;
}

/**
 * Normalize corners to standard format
 */
function normalizeCorners(corners) {
  if (Array.isArray(corners) && corners.length === 4) {
    return corners.map(c => ({
      x: typeof c.x === 'number' ? c.x : 0,
      y: typeof c.y === 'number' ? c.y : 0
    }));
  }
  return null;
}

describe('Detection Accuracy Tests', () => {
  let groundTruth = null;
  let scanic = null;

  beforeAll(async () => {
    // Try to load ground truth annotations
    try {
      if (fs.existsSync(GROUND_TRUTH_PATH)) {
        const data = JSON.parse(fs.readFileSync(GROUND_TRUTH_PATH, 'utf-8'));
        groundTruth = data.annotations || {};
        console.log(`Loaded ${Object.keys(groundTruth).length} ground truth annotations`);
      } else {
        console.log('No ground truth file found. Create one using dev/annotate.html');
        groundTruth = {};
      }
    } catch (err) {
      console.error('Failed to load ground truth:', err);
      groundTruth = {};
    }

    // Import scanic module
    try {
      scanic = await import('../src/index.js');
    } catch (err) {
      console.error('Failed to import scanic:', err);
    }
  });

  it('should have ground truth annotations', () => {
    expect(Object.keys(groundTruth).length).toBeGreaterThan(0);
  });

  it('should load scanic module', () => {
    expect(scanic).toBeDefined();
    expect(scanic.detectDocument).toBeDefined();
  });

  // Dynamic tests for each annotated image
  describe('Individual Image Tests', () => {
    it.skip('placeholder for dynamic tests', () => {
      // This is a placeholder - actual tests are generated dynamically
      // Use the annotation tool to create ground truth, then uncomment tests
    });
  });
});

/**
 * Test result summary structure
 */
export const TestResultSchema = {
  imagePath: 'string',
  groundTruth: {
    corners: 'array',
    imageSize: { width: 'number', height: 'number' }
  },
  detected: {
    corners: 'array or null',
    confidence: 'number'
  },
  metrics: {
    iou: 'number (0-1)',
    avgCornerDistance: 'number (pixels)',
    passed: 'boolean'
  }
};

/**
 * Run full detection accuracy test suite
 * This can be called programmatically to get detailed results
 */
export async function runAccuracyTests(groundTruthPath = GROUND_TRUTH_PATH) {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: 0,
    details: []
  };

  // Load ground truth
  let groundTruth;
  try {
    const data = JSON.parse(fs.readFileSync(groundTruthPath, 'utf-8'));
    groundTruth = data.annotations || {};
  } catch (err) {
    return { error: 'Failed to load ground truth: ' + err.message };
  }

  // Import scanic
  let scanic;
  try {
    scanic = await import('../src/index.js');
  } catch (err) {
    return { error: 'Failed to import scanic: ' + err.message };
  }

  // Run tests for each annotated image
  for (const [imagePath, annotation] of Object.entries(groundTruth)) {
    results.total++;

    try {
      // Note: In Node.js environment, we'd need to load the image differently
      // This is a simplified version - full implementation would use canvas or sharp
      const result = {
        imagePath,
        groundTruth: annotation,
        detected: null,
        metrics: {
          iou: 0,
          avgCornerDistance: Infinity,
          passed: false
        }
      };

      // For now, mark as skipped since we can't load images in Node
      result.error = 'Image loading not available in test environment';
      results.errors++;
      results.details.push(result);

    } catch (err) {
      results.errors++;
      results.details.push({
        imagePath,
        error: err.message
      });
    }
  }

  return results;
}
