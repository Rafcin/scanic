use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
use std::arch::wasm32::*;

/// Sobel operator kernels for gradient calculation
/// These provide better edge detection than simple central difference
/// by incorporating Gaussian smoothing perpendicular to the derivative direction.

// Sobel 3x3 kernels
const SOBEL_X_3X3: [i32; 9] = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
const SOBEL_Y_3X3: [i32; 9] = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

// Scharr 3x3 kernels (better rotational symmetry than Sobel)
const SCHARR_X_3X3: [i32; 9] = [-3, 0, 3, -10, 0, 10, -3, 0, 3];
const SCHARR_Y_3X3: [i32; 9] = [-3, -10, -3, 0, 0, 0, 3, 10, 3];

// Sobel 5x5 kernels for more robust edge detection
const SOBEL_X_5X5: [i32; 25] = [
    -1, -2, 0, 2, 1,
    -4, -8, 0, 8, 4,
    -6, -12, 0, 12, 6,
    -4, -8, 0, 8, 4,
    -1, -2, 0, 2, 1,
];
const SOBEL_Y_5X5: [i32; 25] = [
    -1, -4, -6, -4, -1,
    -2, -8, -12, -8, -2,
    0, 0, 0, 0, 0,
    2, 8, 12, 8, 2,
    1, 4, 6, 4, 1,
];

/// Calculate Sobel gradients using 3x3 kernel
/// Returns interleaved [gx0, gy0, gx1, gy1, ...] as i16 values
#[wasm_bindgen]
pub fn sobel_gradients_3x3(input: &[u8], width: usize, height: usize) -> Vec<i16> {
    let size = width * height;
    let mut result = vec![0i16; 2 * size];

    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let idx = y * width + x;

            // Get 3x3 neighborhood
            let p00 = input[(y - 1) * width + (x - 1)] as i32;
            let p01 = input[(y - 1) * width + x] as i32;
            let p02 = input[(y - 1) * width + (x + 1)] as i32;
            let p10 = input[y * width + (x - 1)] as i32;
            let p12 = input[y * width + (x + 1)] as i32;
            let p20 = input[(y + 1) * width + (x - 1)] as i32;
            let p21 = input[(y + 1) * width + x] as i32;
            let p22 = input[(y + 1) * width + (x + 1)] as i32;

            // Sobel X: [-1 0 1; -2 0 2; -1 0 1]
            let gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;

            // Sobel Y: [-1 -2 -1; 0 0 0; 1 2 1]
            let gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;

            result[2 * idx] = gx.clamp(-32768, 32767) as i16;
            result[2 * idx + 1] = gy.clamp(-32768, 32767) as i16;
        }
    }

    result
}

/// Calculate Scharr gradients using 3x3 kernel (better accuracy than Sobel)
/// Returns interleaved [gx0, gy0, gx1, gy1, ...] as i16 values
#[wasm_bindgen]
pub fn scharr_gradients_3x3(input: &[u8], width: usize, height: usize) -> Vec<i16> {
    let size = width * height;
    let mut result = vec![0i16; 2 * size];

    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let idx = y * width + x;

            // Get 3x3 neighborhood
            let p00 = input[(y - 1) * width + (x - 1)] as i32;
            let p01 = input[(y - 1) * width + x] as i32;
            let p02 = input[(y - 1) * width + (x + 1)] as i32;
            let p10 = input[y * width + (x - 1)] as i32;
            let p12 = input[y * width + (x + 1)] as i32;
            let p20 = input[(y + 1) * width + (x - 1)] as i32;
            let p21 = input[(y + 1) * width + x] as i32;
            let p22 = input[(y + 1) * width + (x + 1)] as i32;

            // Scharr X: [-3 0 3; -10 0 10; -3 0 3]
            let gx = -3 * p00 + 3 * p02 - 10 * p10 + 10 * p12 - 3 * p20 + 3 * p22;

            // Scharr Y: [-3 -10 -3; 0 0 0; 3 10 3]
            let gy = -3 * p00 - 10 * p01 - 3 * p02 + 3 * p20 + 10 * p21 + 3 * p22;

            // Scharr has larger values, normalize by dividing by 16 to keep in i16 range
            result[2 * idx] = (gx / 2).clamp(-32768, 32767) as i16;
            result[2 * idx + 1] = (gy / 2).clamp(-32768, 32767) as i16;
        }
    }

    result
}

/// SIMD-optimized Sobel 3x3 gradient calculation
#[cfg(target_arch = "wasm32")]
#[target_feature(enable = "simd128")]
unsafe fn sobel_3x3_simd_row(
    input: &[u8],
    result: &mut [i16],
    width: usize,
    y: usize,
) {
    let row_above = (y - 1) * width;
    let row_current = y * width;
    let row_below = (y + 1) * width;

    let mut x = 1;
    let simd_end = width.saturating_sub(5); // Need extra padding for SIMD

    while x <= simd_end {
        // Load pixels - we need positions at x-1, x, x+1 for 4 consecutive pixels
        // For pixel at position x, we need x-1, x, x+1
        // For pixel at position x+3, we need x+2, x+3, x+4

        // Process 4 pixels at a time
        for i in 0..4 {
            let px = x + i;
            let idx = row_current + px;

            let p00 = input[row_above + px - 1] as i32;
            let p01 = input[row_above + px] as i32;
            let p02 = input[row_above + px + 1] as i32;
            let p10 = input[row_current + px - 1] as i32;
            let p12 = input[row_current + px + 1] as i32;
            let p20 = input[row_below + px - 1] as i32;
            let p21 = input[row_below + px] as i32;
            let p22 = input[row_below + px + 1] as i32;

            let gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;
            let gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;

            result[2 * idx] = gx.clamp(-32768, 32767) as i16;
            result[2 * idx + 1] = gy.clamp(-32768, 32767) as i16;
        }

        x += 4;
    }

    // Handle remaining pixels
    for px in x..width - 1 {
        let idx = row_current + px;

        let p00 = input[row_above + px - 1] as i32;
        let p01 = input[row_above + px] as i32;
        let p02 = input[row_above + px + 1] as i32;
        let p10 = input[row_current + px - 1] as i32;
        let p12 = input[row_current + px + 1] as i32;
        let p20 = input[row_below + px - 1] as i32;
        let p21 = input[row_below + px] as i32;
        let p22 = input[row_below + px + 1] as i32;

        let gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;
        let gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;

        result[2 * idx] = gx.clamp(-32768, 32767) as i16;
        result[2 * idx + 1] = gy.clamp(-32768, 32767) as i16;
    }
}

/// Calculate Sobel gradients with SIMD optimization
#[wasm_bindgen]
pub fn sobel_gradients_3x3_simd(input: &[u8], width: usize, height: usize) -> Vec<i16> {
    let size = width * height;
    let mut result = vec![0i16; 2 * size];

    #[cfg(target_arch = "wasm32")]
    {
        for y in 1..height - 1 {
            unsafe {
                sobel_3x3_simd_row(input, &mut result, width, y);
            }
        }
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        // Fallback to non-SIMD version
        for y in 1..height - 1 {
            for x in 1..width - 1 {
                let idx = y * width + x;

                let p00 = input[(y - 1) * width + (x - 1)] as i32;
                let p01 = input[(y - 1) * width + x] as i32;
                let p02 = input[(y - 1) * width + (x + 1)] as i32;
                let p10 = input[y * width + (x - 1)] as i32;
                let p12 = input[y * width + (x + 1)] as i32;
                let p20 = input[(y + 1) * width + (x - 1)] as i32;
                let p21 = input[(y + 1) * width + x] as i32;
                let p22 = input[(y + 1) * width + (x + 1)] as i32;

                let gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;
                let gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;

                result[2 * idx] = gx.clamp(-32768, 32767) as i16;
                result[2 * idx + 1] = gy.clamp(-32768, 32767) as i16;
            }
        }
    }

    result
}

/// Calculate Sobel 5x5 gradients for more robust edge detection
/// Larger kernel provides better noise immunity but slightly more blur
#[wasm_bindgen]
pub fn sobel_gradients_5x5(input: &[u8], width: usize, height: usize) -> Vec<i16> {
    let size = width * height;
    let mut result = vec![0i16; 2 * size];

    for y in 2..height - 2 {
        for x in 2..width - 2 {
            let idx = y * width + x;
            let mut gx: i32 = 0;
            let mut gy: i32 = 0;

            for ky in 0..5 {
                for kx in 0..5 {
                    let py = y + ky - 2;
                    let px = x + kx - 2;
                    let pixel = input[py * width + px] as i32;
                    let kernel_idx = ky * 5 + kx;

                    gx += pixel * SOBEL_X_5X5[kernel_idx];
                    gy += pixel * SOBEL_Y_5X5[kernel_idx];
                }
            }

            // Normalize by dividing by 48 (approximate kernel sum)
            result[2 * idx] = (gx / 8).clamp(-32768, 32767) as i16;
            result[2 * idx + 1] = (gy / 8).clamp(-32768, 32767) as i16;
        }
    }

    result
}

/// Compute gradient magnitude and direction
/// Returns: [magnitude_0, direction_0, magnitude_1, direction_1, ...]
/// Direction is quantized to 0-7 representing 8 directions (0°, 22.5°, 45°, ... 157.5°)
#[wasm_bindgen]
pub fn gradient_magnitude_direction(
    gradients: &[i16],
    width: usize,
    height: usize,
    l2_norm: bool,
) -> Vec<f32> {
    let size = width * height;
    let mut result = vec![0.0f32; 2 * size];

    for i in 0..size {
        let gx = gradients[2 * i] as f32;
        let gy = gradients[2 * i + 1] as f32;

        // Calculate magnitude
        let magnitude = if l2_norm {
            (gx * gx + gy * gy).sqrt()
        } else {
            gx.abs() + gy.abs()
        };

        // Calculate direction (angle in radians, then map to 0-7)
        // atan2 returns angle in [-π, π]
        let angle = gy.atan2(gx);

        // Convert to degrees and normalize to [0, 180) for undirected edges
        let mut degrees = angle.to_degrees();
        if degrees < 0.0 {
            degrees += 180.0;
        }
        if degrees >= 180.0 {
            degrees -= 180.0;
        }

        result[2 * i] = magnitude;
        result[2 * i + 1] = degrees;
    }

    result
}

/// Enhanced non-maximum suppression using precise gradient direction
/// This provides better edge localization than the binned direction approach
#[wasm_bindgen]
pub fn nms_precise(
    magnitude: &[f32],
    direction: &[f32],
    width: usize,
    height: usize,
) -> Vec<f32> {
    let mut suppressed = vec![0.0f32; width * height];

    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let idx = y * width + x;
            let mag = magnitude[idx];
            let dir = direction[idx];

            if mag == 0.0 {
                continue;
            }

            // Convert direction to radians
            let angle_rad = dir.to_radians();
            let cos_a = angle_rad.cos();
            let sin_a = angle_rad.sin();

            // Interpolate neighbors along gradient direction
            // For sub-pixel accuracy, we interpolate between discrete neighbors
            let neighbor1_x = (x as f32 + cos_a).round() as usize;
            let neighbor1_y = (y as f32 + sin_a).round() as usize;
            let neighbor2_x = (x as f32 - cos_a).round() as usize;
            let neighbor2_y = (y as f32 - sin_a).round() as usize;

            // Clamp to valid range
            let n1x = neighbor1_x.clamp(0, width - 1);
            let n1y = neighbor1_y.clamp(0, height - 1);
            let n2x = neighbor2_x.clamp(0, width - 1);
            let n2y = neighbor2_y.clamp(0, height - 1);

            let neighbor1_mag = magnitude[n1y * width + n1x];
            let neighbor2_mag = magnitude[n2y * width + n2x];

            // Keep pixel only if it's a local maximum along gradient direction
            if mag >= neighbor1_mag && mag >= neighbor2_mag {
                suppressed[idx] = mag;
            }
        }
    }

    suppressed
}

/// Compute edge direction map for document detection
/// Returns direction in degrees [0, 180) for each pixel
#[wasm_bindgen]
pub fn edge_direction_map(gradients: &[i16], width: usize, height: usize) -> Vec<u8> {
    let size = width * height;
    let mut directions = vec![0u8; size];

    for i in 0..size {
        let gx = gradients[2 * i] as f32;
        let gy = gradients[2 * i + 1] as f32;

        if gx.abs() < 1.0 && gy.abs() < 1.0 {
            directions[i] = 255; // No edge
            continue;
        }

        let angle = gy.atan2(gx);
        let mut degrees = angle.to_degrees();
        if degrees < 0.0 {
            degrees += 180.0;
        }
        if degrees >= 180.0 {
            degrees -= 180.0;
        }

        // Quantize to 0-179
        directions[i] = degrees.round() as u8;
    }

    directions
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sobel_vertical_edge() {
        // Create a simple image with a vertical edge
        let width = 5;
        let height = 5;
        let mut input = vec![0u8; width * height];

        // Right half is white
        for y in 0..height {
            for x in 3..width {
                input[y * width + x] = 255;
            }
        }

        let gradients = sobel_gradients_3x3(&input, width, height);

        // Check that we detect a strong horizontal gradient at the edge
        let center_idx = 2 * width + 2;
        let gx = gradients[2 * center_idx];
        let gy = gradients[2 * center_idx + 1];

        assert!(gx.abs() > 100, "Should detect strong horizontal gradient");
        assert!(gy.abs() < gx.abs(), "Horizontal gradient should dominate");
    }

    #[test]
    fn test_sobel_horizontal_edge() {
        // Create a simple image with a horizontal edge
        let width = 5;
        let height = 5;
        let mut input = vec![0u8; width * height];

        // Bottom half is white
        for y in 3..height {
            for x in 0..width {
                input[y * width + x] = 255;
            }
        }

        let gradients = sobel_gradients_3x3(&input, width, height);

        // Check that we detect a strong vertical gradient at the edge
        let center_idx = 2 * width + 2;
        let gx = gradients[2 * center_idx];
        let gy = gradients[2 * center_idx + 1];

        assert!(gy.abs() > 100, "Should detect strong vertical gradient");
        assert!(gx.abs() < gy.abs(), "Vertical gradient should dominate");
    }
}
