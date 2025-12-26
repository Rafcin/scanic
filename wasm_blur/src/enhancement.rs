//! Image Enhancement Filters Module
//!
//! Provides a comprehensive set of image enhancement filters including:
//! - Color adjustments (brightness, contrast, saturation, hue)
//! - Sharpening (unsharp mask, edge enhancement)
//! - Artistic filters (vintage, sepia, sketch, emboss)
//! - Document-specific enhancements (deskew angle detection, auto-levels)

use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

// ============================================================================
// Color Adjustment Filters
// ============================================================================

/// Adjust brightness of an image
///
/// # Arguments
/// * `input` - RGBA pixel data
/// * `width` - Image width
/// * `height` - Image height
/// * `amount` - Brightness adjustment (-100 to 100)
#[wasm_bindgen]
pub fn adjust_brightness(input: &[u8], width: usize, height: usize, amount: f32) -> Vec<u8> {
    let mut output = input.to_vec();
    let adjustment = (amount / 100.0) * 255.0;

    for i in (0..output.len()).step_by(4) {
        for c in 0..3 {
            let val = input[i + c] as f32 + adjustment;
            output[i + c] = val.clamp(0.0, 255.0) as u8;
        }
    }

    output
}

/// Adjust contrast of an image
///
/// # Arguments
/// * `input` - RGBA pixel data
/// * `width` - Image width
/// * `height` - Image height
/// * `amount` - Contrast adjustment (-100 to 100)
#[wasm_bindgen]
pub fn adjust_contrast(input: &[u8], width: usize, height: usize, amount: f32) -> Vec<u8> {
    let mut output = input.to_vec();
    let factor = (259.0 * (amount + 255.0)) / (255.0 * (259.0 - amount));

    for i in (0..output.len()).step_by(4) {
        for c in 0..3 {
            let val = factor * (input[i + c] as f32 - 128.0) + 128.0;
            output[i + c] = val.clamp(0.0, 255.0) as u8;
        }
    }

    output
}

/// Adjust saturation of an image
///
/// # Arguments
/// * `input` - RGBA pixel data
/// * `width` - Image width
/// * `height` - Image height
/// * `amount` - Saturation adjustment (-100 to 100)
#[wasm_bindgen]
pub fn adjust_saturation(input: &[u8], width: usize, height: usize, amount: f32) -> Vec<u8> {
    let mut output = input.to_vec();
    let factor = 1.0 + (amount / 100.0);

    for i in (0..output.len()).step_by(4) {
        let r = input[i] as f32;
        let g = input[i + 1] as f32;
        let b = input[i + 2] as f32;

        // Calculate luminance
        let lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // Interpolate between grayscale and original color
        output[i] = (lum + factor * (r - lum)).clamp(0.0, 255.0) as u8;
        output[i + 1] = (lum + factor * (g - lum)).clamp(0.0, 255.0) as u8;
        output[i + 2] = (lum + factor * (b - lum)).clamp(0.0, 255.0) as u8;
    }

    output
}

/// Rotate hue of an image
///
/// # Arguments
/// * `input` - RGBA pixel data
/// * `width` - Image width
/// * `height` - Image height
/// * `degrees` - Hue rotation in degrees (0 to 360)
#[wasm_bindgen]
pub fn adjust_hue(input: &[u8], width: usize, height: usize, degrees: f32) -> Vec<u8> {
    let mut output = input.to_vec();
    let angle = degrees * PI / 180.0;
    let cos_a = angle.cos();
    let sin_a = angle.sin();

    // Hue rotation matrix coefficients
    let matrix = [
        0.213 + cos_a * 0.787 - sin_a * 0.213,
        0.715 - cos_a * 0.715 - sin_a * 0.715,
        0.072 - cos_a * 0.072 + sin_a * 0.928,
        0.213 - cos_a * 0.213 + sin_a * 0.143,
        0.715 + cos_a * 0.285 + sin_a * 0.140,
        0.072 - cos_a * 0.072 - sin_a * 0.283,
        0.213 - cos_a * 0.213 - sin_a * 0.787,
        0.715 - cos_a * 0.715 + sin_a * 0.715,
        0.072 + cos_a * 0.928 + sin_a * 0.072,
    ];

    for i in (0..output.len()).step_by(4) {
        let r = input[i] as f32;
        let g = input[i + 1] as f32;
        let b = input[i + 2] as f32;

        output[i] = (matrix[0] * r + matrix[1] * g + matrix[2] * b).clamp(0.0, 255.0) as u8;
        output[i + 1] = (matrix[3] * r + matrix[4] * g + matrix[5] * b).clamp(0.0, 255.0) as u8;
        output[i + 2] = (matrix[6] * r + matrix[7] * g + matrix[8] * b).clamp(0.0, 255.0) as u8;
    }

    output
}

/// Adjust color temperature (warm/cool)
///
/// # Arguments
/// * `input` - RGBA pixel data
/// * `width` - Image width
/// * `height` - Image height
/// * `temperature` - Temperature adjustment (-100 cool to 100 warm)
#[wasm_bindgen]
pub fn adjust_temperature(input: &[u8], width: usize, height: usize, temperature: f32) -> Vec<u8> {
    let mut output = input.to_vec();
    let t = temperature / 100.0;

    for i in (0..output.len()).step_by(4) {
        let r = input[i] as f32;
        let b = input[i + 2] as f32;

        // Warm: increase red, decrease blue
        // Cool: decrease red, increase blue
        output[i] = (r + t * 30.0).clamp(0.0, 255.0) as u8;
        output[i + 2] = (b - t * 30.0).clamp(0.0, 255.0) as u8;
    }

    output
}

/// Apply gamma correction
///
/// # Arguments
/// * `input` - RGBA pixel data
/// * `width` - Image width
/// * `height` - Image height
/// * `gamma` - Gamma value (0.1 to 10.0, 1.0 = no change)
#[wasm_bindgen]
pub fn apply_gamma(input: &[u8], width: usize, height: usize, gamma: f32) -> Vec<u8> {
    let mut output = input.to_vec();
    let inv_gamma = 1.0 / gamma;

    // Build lookup table for performance
    let mut lut = [0u8; 256];
    for i in 0..256 {
        lut[i] = (255.0 * (i as f32 / 255.0).powf(inv_gamma)) as u8;
    }

    for i in (0..output.len()).step_by(4) {
        output[i] = lut[input[i] as usize];
        output[i + 1] = lut[input[i + 1] as usize];
        output[i + 2] = lut[input[i + 2] as usize];
    }

    output
}

/// Auto-levels adjustment (stretch histogram)
#[wasm_bindgen]
pub fn auto_levels(input: &[u8], width: usize, height: usize) -> Vec<u8> {
    let mut output = input.to_vec();
    let mut min_vals = [255u8; 3];
    let mut max_vals = [0u8; 3];

    // Find min/max for each channel
    for i in (0..input.len()).step_by(4) {
        for c in 0..3 {
            min_vals[c] = min_vals[c].min(input[i + c]);
            max_vals[c] = max_vals[c].max(input[i + c]);
        }
    }

    // Apply stretch for each channel
    for c in 0..3 {
        let range = (max_vals[c] - min_vals[c]) as f32;
        if range > 0.0 {
            for i in (0..output.len()).step_by(4) {
                let val = (input[i + c] - min_vals[c]) as f32 / range * 255.0;
                output[i + c] = val.clamp(0.0, 255.0) as u8;
            }
        }
    }

    output
}

// ============================================================================
// Sharpening Filters
// ============================================================================

/// Apply unsharp mask for sharpening
///
/// # Arguments
/// * `input` - RGBA pixel data
/// * `width` - Image width
/// * `height` - Image height
/// * `amount` - Sharpening amount (0 to 100)
/// * `radius` - Blur radius for mask
/// * `threshold` - Threshold to apply sharpening (0-255)
#[wasm_bindgen]
pub fn unsharp_mask(
    input: &[u8],
    width: usize,
    height: usize,
    amount: f32,
    radius: usize,
    threshold: u8
) -> Vec<u8> {
    let mut output = input.to_vec();
    let factor = amount / 100.0;

    // Create blurred version using box blur (faster than Gaussian for large radius)
    let blurred = box_blur_rgba(input, width, height, radius);

    for i in (0..output.len()).step_by(4) {
        for c in 0..3 {
            let original = input[i + c] as f32;
            let blur = blurred[i + c] as f32;
            let diff = (original - blur).abs();

            // Only sharpen if difference exceeds threshold
            if diff > threshold as f32 {
                let sharpened = original + factor * (original - blur);
                output[i + c] = sharpened.clamp(0.0, 255.0) as u8;
            }
        }
    }

    output
}

/// Apply edge enhancement filter
#[wasm_bindgen]
pub fn enhance_edges(input: &[u8], width: usize, height: usize, strength: f32) -> Vec<u8> {
    let mut output = input.to_vec();
    let factor = strength / 100.0;

    // Edge enhancement kernel (Laplacian-based)
    let kernel = [
        0.0, -1.0, 0.0,
        -1.0, 5.0, -1.0,
        0.0, -1.0, 0.0,
    ];

    for y in 1..(height - 1) {
        for x in 1..(width - 1) {
            let idx = (y * width + x) * 4;

            for c in 0..3 {
                let mut sum = 0.0;
                for ky in 0..3 {
                    for kx in 0..3 {
                        let px = (x + kx - 1) as usize;
                        let py = (y + ky - 1) as usize;
                        let pidx = (py * width + px) * 4 + c;
                        sum += input[pidx] as f32 * kernel[ky * 3 + kx];
                    }
                }

                // Blend enhanced edge with original
                let original = input[idx + c] as f32;
                let enhanced = original + factor * (sum - original);
                output[idx + c] = enhanced.clamp(0.0, 255.0) as u8;
            }
        }
    }

    output
}

// ============================================================================
// Artistic Filters
// ============================================================================

/// Convert to sepia tone
#[wasm_bindgen]
pub fn sepia_filter(input: &[u8], width: usize, height: usize, intensity: f32) -> Vec<u8> {
    let mut output = input.to_vec();
    let factor = intensity / 100.0;

    for i in (0..output.len()).step_by(4) {
        let r = input[i] as f32;
        let g = input[i + 1] as f32;
        let b = input[i + 2] as f32;

        // Sepia transformation
        let sepia_r = 0.393 * r + 0.769 * g + 0.189 * b;
        let sepia_g = 0.349 * r + 0.686 * g + 0.168 * b;
        let sepia_b = 0.272 * r + 0.534 * g + 0.131 * b;

        // Blend with original
        output[i] = (r + factor * (sepia_r - r)).clamp(0.0, 255.0) as u8;
        output[i + 1] = (g + factor * (sepia_g - g)).clamp(0.0, 255.0) as u8;
        output[i + 2] = (b + factor * (sepia_b - b)).clamp(0.0, 255.0) as u8;
    }

    output
}

/// Apply vintage/retro filter
#[wasm_bindgen]
pub fn vintage_filter(input: &[u8], width: usize, height: usize) -> Vec<u8> {
    let mut output = input.to_vec();

    for i in (0..output.len()).step_by(4) {
        let r = input[i] as f32;
        let g = input[i + 1] as f32;
        let b = input[i + 2] as f32;

        // Reduce saturation
        let lum = 0.299 * r + 0.587 * g + 0.114 * b;
        let nr = lum + 0.7 * (r - lum);
        let ng = lum + 0.7 * (g - lum);
        let nb = lum + 0.7 * (b - lum);

        // Add warm tint
        let nr = nr * 1.1 + 10.0;
        let ng = ng * 1.0 + 5.0;
        let nb = nb * 0.9;

        // Add slight fade (raise blacks)
        output[i] = (nr * 0.9 + 25.0).clamp(0.0, 255.0) as u8;
        output[i + 1] = (ng * 0.9 + 20.0).clamp(0.0, 255.0) as u8;
        output[i + 2] = (nb * 0.9 + 15.0).clamp(0.0, 255.0) as u8;
    }

    output
}

/// Apply vignette effect
///
/// # Arguments
/// * `input` - RGBA pixel data
/// * `width` - Image width
/// * `height` - Image height
/// * `strength` - Vignette strength (0 to 100)
/// * `radius` - Vignette radius (0 to 100, percentage of image size)
#[wasm_bindgen]
pub fn vignette_filter(
    input: &[u8],
    width: usize,
    height: usize,
    strength: f32,
    radius: f32
) -> Vec<u8> {
    let mut output = input.to_vec();
    let cx = width as f32 / 2.0;
    let cy = height as f32 / 2.0;
    let max_dist = ((cx * cx + cy * cy) as f32).sqrt();
    let radius_norm = radius / 100.0;
    let strength_norm = strength / 100.0;

    for y in 0..height {
        for x in 0..width {
            let dx = x as f32 - cx;
            let dy = y as f32 - cy;
            let dist = (dx * dx + dy * dy).sqrt() / max_dist;

            // Calculate vignette factor
            let vignette = 1.0 - strength_norm * ((dist / radius_norm).clamp(0.0, 1.0).powf(2.0));

            let idx = (y * width + x) * 4;
            output[idx] = (input[idx] as f32 * vignette).clamp(0.0, 255.0) as u8;
            output[idx + 1] = (input[idx + 1] as f32 * vignette).clamp(0.0, 255.0) as u8;
            output[idx + 2] = (input[idx + 2] as f32 * vignette).clamp(0.0, 255.0) as u8;
        }
    }

    output
}

/// Apply posterize effect (reduce color levels)
#[wasm_bindgen]
pub fn posterize_filter(input: &[u8], width: usize, height: usize, levels: u8) -> Vec<u8> {
    let mut output = input.to_vec();
    let levels = levels.max(2).min(255) as f32;
    let step = 255.0 / (levels - 1.0);

    for i in (0..output.len()).step_by(4) {
        for c in 0..3 {
            let val = input[i + c] as f32;
            let quantized = ((val / step).round() * step) as u8;
            output[i + c] = quantized;
        }
    }

    output
}

/// Invert colors
#[wasm_bindgen]
pub fn invert_filter(input: &[u8], width: usize, height: usize) -> Vec<u8> {
    let mut output = input.to_vec();

    for i in (0..output.len()).step_by(4) {
        output[i] = 255 - input[i];
        output[i + 1] = 255 - input[i + 1];
        output[i + 2] = 255 - input[i + 2];
    }

    output
}

/// Apply emboss effect
#[wasm_bindgen]
pub fn emboss_filter(input: &[u8], width: usize, height: usize, strength: f32) -> Vec<u8> {
    let mut output = vec![128u8; input.len()]; // Start with gray

    // Emboss kernel
    let kernel = [
        -2.0, -1.0, 0.0,
        -1.0, 1.0, 1.0,
        0.0, 1.0, 2.0,
    ];

    for y in 1..(height - 1) {
        for x in 1..(width - 1) {
            let idx = (y * width + x) * 4;

            for c in 0..3 {
                let mut sum = 0.0;
                for ky in 0..3 {
                    for kx in 0..3 {
                        let px = x + kx - 1;
                        let py = y + ky - 1;
                        let pidx = (py * width + px) * 4 + c;
                        sum += input[pidx] as f32 * kernel[ky * 3 + kx];
                    }
                }

                let val = 128.0 + sum * (strength / 100.0);
                output[idx + c] = val.clamp(0.0, 255.0) as u8;
            }
            output[idx + 3] = input[idx + 3]; // Preserve alpha
        }
    }

    output
}

/// Convert to sketch/pencil effect
#[wasm_bindgen]
pub fn sketch_filter(input: &[u8], width: usize, height: usize, edge_strength: f32) -> Vec<u8> {
    let mut output = vec![255u8; input.len()]; // Start with white

    // Convert to grayscale first
    let mut gray = vec![0u8; width * height];
    for y in 0..height {
        for x in 0..width {
            let idx = (y * width + x) * 4;
            gray[y * width + x] = (0.299 * input[idx] as f32 +
                                    0.587 * input[idx + 1] as f32 +
                                    0.114 * input[idx + 2] as f32) as u8;
        }
    }

    // Apply edge detection
    for y in 1..(height - 1) {
        for x in 1..(width - 1) {
            let idx = y * width + x;

            // Sobel-like edge detection
            let gx = -gray[(y - 1) * width + (x - 1)] as f32
                   + gray[(y - 1) * width + (x + 1)] as f32
                   - 2.0 * gray[y * width + (x - 1)] as f32
                   + 2.0 * gray[y * width + (x + 1)] as f32
                   - gray[(y + 1) * width + (x - 1)] as f32
                   + gray[(y + 1) * width + (x + 1)] as f32;

            let gy = -gray[(y - 1) * width + (x - 1)] as f32
                   - 2.0 * gray[(y - 1) * width + x] as f32
                   - gray[(y - 1) * width + (x + 1)] as f32
                   + gray[(y + 1) * width + (x - 1)] as f32
                   + 2.0 * gray[(y + 1) * width + x] as f32
                   + gray[(y + 1) * width + (x + 1)] as f32;

            let mag = (gx * gx + gy * gy).sqrt();
            let edge = 255.0 - (mag * edge_strength / 100.0).min(255.0);

            let out_idx = idx * 4;
            output[out_idx] = edge as u8;
            output[out_idx + 1] = edge as u8;
            output[out_idx + 2] = edge as u8;
            output[out_idx + 3] = 255;
        }
    }

    output
}

// ============================================================================
// Document-Specific Enhancements
// ============================================================================

/// Detect skew angle of document text
/// Returns angle in degrees
#[wasm_bindgen]
pub fn detect_skew_angle(input: &[u8], width: usize, height: usize) -> f32 {
    // Convert to grayscale
    let mut gray = vec![0u8; width * height];
    for y in 0..height {
        for x in 0..width {
            let idx = (y * width + x) * 4;
            gray[y * width + x] = (0.299 * input[idx] as f32 +
                                    0.587 * input[idx + 1] as f32 +
                                    0.114 * input[idx + 2] as f32) as u8;
        }
    }

    // Apply edge detection
    let mut edges = vec![0u8; width * height];
    for y in 1..(height - 1) {
        for x in 1..(width - 1) {
            let idx = y * width + x;
            let gx = gray[idx + 1] as i32 - gray[idx - 1] as i32;
            let gy = gray[idx + width] as i32 - gray[idx - width] as i32;
            let mag = ((gx * gx + gy * gy) as f32).sqrt();
            edges[idx] = if mag > 50.0 { 255 } else { 0 };
        }
    }

    // Hough transform for line detection (simplified)
    let max_angle = 15.0_f32; // degrees
    let angle_step = 0.5_f32;
    let num_angles = ((2.0 * max_angle) / angle_step) as usize + 1;
    let mut accumulator = vec![0u32; num_angles];

    for y in 0..height {
        for x in 0..width {
            if edges[y * width + x] > 0 {
                for i in 0..num_angles {
                    let angle = (-max_angle + i as f32 * angle_step) * PI / 180.0;
                    let rho = x as f32 * angle.cos() + y as f32 * angle.sin();
                    if rho > 0.0 {
                        accumulator[i] += 1;
                    }
                }
            }
        }
    }

    // Find the angle with the most votes
    let max_idx = accumulator.iter().enumerate()
        .max_by_key(|(_, &val)| val)
        .map(|(idx, _)| idx)
        .unwrap_or(num_angles / 2);

    -max_angle + max_idx as f32 * angle_step
}

/// Enhance document for better text readability
#[wasm_bindgen]
pub fn enhance_text_document(input: &[u8], width: usize, height: usize) -> Vec<u8> {
    let mut output = input.to_vec();

    // Step 1: Convert to LAB-like space for better processing
    // (simplified - working in RGB)

    // Step 2: Increase local contrast
    let block_size = 32;
    for by in (0..height).step_by(block_size) {
        for bx in (0..width).step_by(block_size) {
            // Calculate local min/max for the block
            let mut min_l = 255u8;
            let mut max_l = 0u8;

            for y in by..((by + block_size).min(height)) {
                for x in bx..((bx + block_size).min(width)) {
                    let idx = (y * width + x) * 4;
                    let lum = (0.299 * input[idx] as f32 +
                               0.587 * input[idx + 1] as f32 +
                               0.114 * input[idx + 2] as f32) as u8;
                    min_l = min_l.min(lum);
                    max_l = max_l.max(lum);
                }
            }

            // Apply local contrast stretch
            let range = (max_l - min_l) as f32;
            if range > 10.0 {
                for y in by..((by + block_size).min(height)) {
                    for x in bx..((bx + block_size).min(width)) {
                        let idx = (y * width + x) * 4;
                        for c in 0..3 {
                            let val = input[idx + c] as f32;
                            let stretched = ((val - min_l as f32) / range * 255.0) as u8;
                            output[idx + c] = stretched;
                        }
                    }
                }
            }
        }
    }

    // Step 3: Sharpen text edges
    let sharpened = enhance_edges(&output, width, height, 50.0);

    sharpened
}

/// Binarize document (convert to black and white)
/// Uses adaptive thresholding for uneven lighting
#[wasm_bindgen]
pub fn binarize_document(input: &[u8], width: usize, height: usize, block_size: usize) -> Vec<u8> {
    let mut output = input.to_vec();
    let block_size = block_size.max(3) | 1; // Ensure odd
    let half_block = block_size / 2;

    // Convert to grayscale
    let mut gray = vec![0u8; width * height];
    for y in 0..height {
        for x in 0..width {
            let idx = (y * width + x) * 4;
            gray[y * width + x] = (0.299 * input[idx] as f32 +
                                    0.587 * input[idx + 1] as f32 +
                                    0.114 * input[idx + 2] as f32) as u8;
        }
    }

    // Compute integral image for fast mean calculation
    let mut integral = vec![0u64; (width + 1) * (height + 1)];
    for y in 0..height {
        for x in 0..width {
            let idx = (y + 1) * (width + 1) + (x + 1);
            integral[idx] = gray[y * width + x] as u64
                + integral[idx - 1]
                + integral[idx - width - 1]
                - integral[idx - width - 2];
        }
    }

    // Apply adaptive threshold
    for y in 0..height {
        for x in 0..width {
            let x1 = if x >= half_block { x - half_block } else { 0 };
            let y1 = if y >= half_block { y - half_block } else { 0 };
            let x2 = (x + half_block + 1).min(width);
            let y2 = (y + half_block + 1).min(height);

            let count = ((x2 - x1) * (y2 - y1)) as u64;
            let sum = integral[y2 * (width + 1) + x2]
                    - integral[y2 * (width + 1) + x1]
                    - integral[y1 * (width + 1) + x2]
                    + integral[y1 * (width + 1) + x1];

            let mean = (sum / count) as u8;
            let threshold = if mean > 10 { mean - 10 } else { 0 };

            let idx = (y * width + x) * 4;
            let pixel = gray[y * width + x];
            let binary = if pixel > threshold { 255 } else { 0 };

            output[idx] = binary;
            output[idx + 1] = binary;
            output[idx + 2] = binary;
        }
    }

    output
}

/// Remove background and make it white
#[wasm_bindgen]
pub fn remove_background_white(input: &[u8], width: usize, height: usize, threshold: u8) -> Vec<u8> {
    let mut output = input.to_vec();

    for i in (0..output.len()).step_by(4) {
        let r = input[i] as u32;
        let g = input[i + 1] as u32;
        let b = input[i + 2] as u32;

        // Calculate luminance
        let lum = (0.299 * r as f32 + 0.587 * g as f32 + 0.114 * b as f32) as u8;

        // If pixel is bright enough, make it white
        if lum > threshold {
            output[i] = 255;
            output[i + 1] = 255;
            output[i + 2] = 255;
        }
    }

    output
}

// ============================================================================
// Noise Reduction
// ============================================================================

/// Apply noise reduction using non-local means (simplified)
#[wasm_bindgen]
pub fn denoise_nlm(
    input: &[u8],
    width: usize,
    height: usize,
    strength: f32,
    patch_size: usize,
    search_size: usize
) -> Vec<u8> {
    let mut output = input.to_vec();
    let patch_half = patch_size / 2;
    let search_half = search_size / 2;
    let h2 = strength * strength;

    for y in search_half..(height - search_half) {
        for x in search_half..(width - search_half) {
            let idx = (y * width + x) * 4;

            for c in 0..3 {
                let mut weighted_sum = 0.0;
                let mut weight_sum = 0.0;

                // Search in neighborhood
                for sy in (y - search_half)..(y + search_half + 1) {
                    for sx in (x - search_half)..(x + search_half + 1) {
                        if sy < patch_half || sy >= height - patch_half ||
                           sx < patch_half || sx >= width - patch_half {
                            continue;
                        }

                        // Calculate patch distance
                        let mut dist = 0.0;
                        let mut count = 0;
                        for py in 0..patch_size {
                            for px in 0..patch_size {
                                let dy1 = y + py - patch_half;
                                let dx1 = x + px - patch_half;
                                let dy2 = sy + py - patch_half;
                                let dx2 = sx + px - patch_half;

                                if dy1 < height && dx1 < width && dy2 < height && dx2 < width {
                                    let p1 = input[(dy1 * width + dx1) * 4 + c] as f32;
                                    let p2 = input[(dy2 * width + dx2) * 4 + c] as f32;
                                    dist += (p1 - p2) * (p1 - p2);
                                    count += 1;
                                }
                            }
                        }

                        if count > 0 {
                            dist /= count as f32;
                            let weight = (-dist / h2).exp();
                            weighted_sum += weight * input[(sy * width + sx) * 4 + c] as f32;
                            weight_sum += weight;
                        }
                    }
                }

                if weight_sum > 0.0 {
                    output[idx + c] = (weighted_sum / weight_sum).clamp(0.0, 255.0) as u8;
                }
            }
        }
    }

    output
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Fast box blur for RGBA images
fn box_blur_rgba(input: &[u8], width: usize, height: usize, radius: usize) -> Vec<u8> {
    let mut output = input.to_vec();
    let mut temp = input.to_vec();
    let kernel_size = radius * 2 + 1;

    // Horizontal pass
    for y in 0..height {
        for x in 0..width {
            let idx = (y * width + x) * 4;

            for c in 0..3 {
                let mut sum = 0u32;
                let mut count = 0u32;

                for kx in 0..kernel_size {
                    let nx = x as isize + kx as isize - radius as isize;
                    if nx >= 0 && nx < width as isize {
                        sum += input[(y * width + nx as usize) * 4 + c] as u32;
                        count += 1;
                    }
                }

                temp[idx + c] = (sum / count) as u8;
            }
            temp[idx + 3] = input[idx + 3];
        }
    }

    // Vertical pass
    for y in 0..height {
        for x in 0..width {
            let idx = (y * width + x) * 4;

            for c in 0..3 {
                let mut sum = 0u32;
                let mut count = 0u32;

                for ky in 0..kernel_size {
                    let ny = y as isize + ky as isize - radius as isize;
                    if ny >= 0 && ny < height as isize {
                        sum += temp[(ny as usize * width + x) * 4 + c] as u32;
                        count += 1;
                    }
                }

                output[idx + c] = (sum / count) as u8;
            }
            output[idx + 3] = input[idx + 3];
        }
    }

    output
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_image(width: usize, height: usize) -> Vec<u8> {
        let mut data = vec![0u8; width * height * 4];
        for i in (0..data.len()).step_by(4) {
            data[i] = 128;     // R
            data[i + 1] = 128; // G
            data[i + 2] = 128; // B
            data[i + 3] = 255; // A
        }
        data
    }

    #[test]
    fn test_brightness() {
        let input = create_test_image(10, 10);
        let result = adjust_brightness(&input, 10, 10, 50.0);
        assert!(result[0] > input[0]);
    }

    #[test]
    fn test_contrast() {
        let input = create_test_image(10, 10);
        let result = adjust_contrast(&input, 10, 10, 50.0);
        assert_eq!(result.len(), input.len());
    }

    #[test]
    fn test_saturation() {
        let input = create_test_image(10, 10);
        let result = adjust_saturation(&input, 10, 10, 50.0);
        assert_eq!(result.len(), input.len());
    }

    #[test]
    fn test_sepia() {
        let input = create_test_image(10, 10);
        let result = sepia_filter(&input, 10, 10, 100.0);
        assert_eq!(result.len(), input.len());
    }

    #[test]
    fn test_invert() {
        let input = create_test_image(10, 10);
        let result = invert_filter(&input, 10, 10);
        assert_eq!(result[0], 127); // 255 - 128
    }

    #[test]
    fn test_posterize() {
        let input = create_test_image(10, 10);
        let result = posterize_filter(&input, 10, 10, 4);
        assert_eq!(result.len(), input.len());
    }

    #[test]
    fn test_auto_levels() {
        let mut input = create_test_image(10, 10);
        input[0] = 50;
        input[4] = 200;
        let result = auto_levels(&input, 10, 10);
        assert!(result[0] < result[4]);
    }

    #[test]
    fn test_skew_detection() {
        let input = create_test_image(100, 100);
        let angle = detect_skew_angle(&input, 100, 100);
        assert!(angle >= -15.0 && angle <= 15.0);
    }

    #[test]
    fn test_binarize() {
        let input = create_test_image(10, 10);
        let result = binarize_document(&input, 10, 10, 11);
        assert!(result[0] == 0 || result[0] == 255);
    }
}
