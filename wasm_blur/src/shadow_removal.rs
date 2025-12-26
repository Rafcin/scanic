use wasm_bindgen::prelude::*;

/// Shadow Removal Module
/// Implements modern shadow removal techniques for document scanning:
/// - Retinex-based illumination estimation
/// - Difference of Gaussians background estimation
/// - Adaptive local normalization
/// - Color-space based shadow detection

/// Remove shadows using multi-scale Retinex algorithm
/// Based on modern retinex theory for illumination invariance
///
/// # Arguments
/// * `input` - Grayscale image
/// * `width` - Image width
/// * `height` - Image height
/// * `sigma_list` - List of Gaussian sigmas for multi-scale [small, medium, large]
/// * `gain` - Output gain (typically 1.0-2.0)
/// * `offset` - Output offset (typically 0-50)
///
/// # Returns
/// Shadow-removed image
#[wasm_bindgen]
pub fn remove_shadows_retinex(
    input: &[u8],
    width: usize,
    height: usize,
    gain: f64,
    offset: f64,
) -> Vec<u8> {
    let n = width * height;
    let sigmas = [15.0, 80.0, 250.0]; // Multi-scale sigmas

    // Convert to log domain (add small value to avoid log(0))
    let log_input: Vec<f64> = input.iter().map(|&x| ((x as f64) + 1.0).ln()).collect();

    // Multi-scale Retinex
    let mut log_reflectance = vec![0.0f64; n];

    for sigma in sigmas.iter() {
        // Gaussian blur for illumination estimation
        let illumination = gaussian_blur_f64(&log_input, width, height, *sigma);

        // Subtract illumination (in log domain = divide in linear domain)
        for i in 0..n {
            log_reflectance[i] += log_input[i] - illumination[i];
        }
    }

    // Average and convert back
    let scale = 1.0 / sigmas.len() as f64;

    log_reflectance
        .iter()
        .map(|&v| {
            let reflectance = (v * scale).exp();
            let output = reflectance * gain * 128.0 + offset;
            output.clamp(0.0, 255.0) as u8
        })
        .collect()
}

/// Remove shadows using difference of Gaussians (DoG) background subtraction
/// Effective for document images with uneven lighting
#[wasm_bindgen]
pub fn remove_shadows_dog(
    input: &[u8],
    width: usize,
    height: usize,
    sigma_small: f64,
    sigma_large: f64,
) -> Vec<u8> {
    let n = width * height;

    // Convert to f64
    let input_f: Vec<f64> = input.iter().map(|&x| x as f64).collect();

    // Large sigma blur estimates background/illumination
    let background = gaussian_blur_f64(&input_f, width, height, sigma_large);

    // Small sigma blur for noise reduction
    let smoothed = if sigma_small > 0.5 {
        gaussian_blur_f64(&input_f, width, height, sigma_small)
    } else {
        input_f.clone()
    };

    // Normalize: output = input / background * mean(background)
    let mean_bg: f64 = background.iter().sum::<f64>() / n as f64;

    (0..n)
        .map(|i| {
            let normalized = if background[i] > 1.0 {
                smoothed[i] / background[i] * mean_bg
            } else {
                smoothed[i]
            };
            normalized.clamp(0.0, 255.0) as u8
        })
        .collect()
}

/// Adaptive local normalization for shadow removal
/// Uses local statistics to normalize intensity
#[wasm_bindgen]
pub fn normalize_illumination_local(
    input: &[u8],
    width: usize,
    height: usize,
    block_size: usize,
    clip_limit: f64,
) -> Vec<u8> {
    let n = width * height;

    // Compute local mean and std using integral images
    let input_f: Vec<f64> = input.iter().map(|&x| x as f64).collect();
    let input_sq: Vec<f64> = input.iter().map(|&x| (x as f64) * (x as f64)).collect();

    // Build integral images
    let integral = build_integral_image(&input_f, width, height);
    let integral_sq = build_integral_image(&input_sq, width, height);

    let radius = block_size / 2;

    (0..n)
        .map(|i| {
            let x = i % width;
            let y = i / width;

            let y1 = if y >= radius { y - radius } else { 0 };
            let y2 = (y + radius + 1).min(height);
            let x1 = if x >= radius { x - radius } else { 0 };
            let x2 = (x + radius + 1).min(width);

            let area = ((y2 - y1) * (x2 - x1)) as f64;

            // Get sum and sum of squares from integral images
            let sum = get_integral_sum(&integral, width + 1, x1, y1, x2, y2);
            let sum_sq = get_integral_sum(&integral_sq, width + 1, x1, y1, x2, y2);

            let mean = sum / area;
            let variance = (sum_sq / area) - (mean * mean);
            let std = variance.max(0.0).sqrt().max(1.0);

            // Normalize: (x - mean) / std * target_std + target_mean
            let val = input[i] as f64;
            let normalized = (val - mean) / std.min(std * clip_limit);
            let output = normalized * 64.0 + 128.0; // Target mean=128, std=64

            output.clamp(0.0, 255.0) as u8
        })
        .collect()
}

/// White balance / color cast removal for document images
/// Useful when document is photographed under colored lighting
#[wasm_bindgen]
pub fn auto_white_balance(
    rgba: &[u8],
    width: usize,
    height: usize,
) -> Vec<u8> {
    let n = width * height;

    // Compute channel averages
    let mut sum_r = 0u64;
    let mut sum_g = 0u64;
    let mut sum_b = 0u64;

    for i in 0..n {
        sum_r += rgba[i * 4] as u64;
        sum_g += rgba[i * 4 + 1] as u64;
        sum_b += rgba[i * 4 + 2] as u64;
    }

    let avg_r = sum_r as f64 / n as f64;
    let avg_g = sum_g as f64 / n as f64;
    let avg_b = sum_b as f64 / n as f64;

    // Gray world assumption: adjust so all channels have same average
    let avg_gray = (avg_r + avg_g + avg_b) / 3.0;

    let scale_r = if avg_r > 0.0 { avg_gray / avg_r } else { 1.0 };
    let scale_g = if avg_g > 0.0 { avg_gray / avg_g } else { 1.0 };
    let scale_b = if avg_b > 0.0 { avg_gray / avg_b } else { 1.0 };

    let mut output = vec![0u8; n * 4];

    for i in 0..n {
        output[i * 4] = ((rgba[i * 4] as f64 * scale_r).clamp(0.0, 255.0)) as u8;
        output[i * 4 + 1] = ((rgba[i * 4 + 1] as f64 * scale_g).clamp(0.0, 255.0)) as u8;
        output[i * 4 + 2] = ((rgba[i * 4 + 2] as f64 * scale_b).clamp(0.0, 255.0)) as u8;
        output[i * 4 + 3] = rgba[i * 4 + 3]; // Preserve alpha
    }

    output
}

/// Detect shadow regions in an image
/// Returns a binary mask where 255 = shadow region
#[wasm_bindgen]
pub fn detect_shadows(
    rgba: &[u8],
    width: usize,
    height: usize,
    threshold: f64,
) -> Vec<u8> {
    let n = width * height;

    // Convert to HSV-like representation
    // Shadows have low value but potentially high saturation
    let mut mask = vec![0u8; n];

    for i in 0..n {
        let r = rgba[i * 4] as f64 / 255.0;
        let g = rgba[i * 4 + 1] as f64 / 255.0;
        let b = rgba[i * 4 + 2] as f64 / 255.0;

        let max = r.max(g).max(b);
        let min = r.min(g).min(b);

        let value = max;
        let saturation = if max > 0.0 { (max - min) / max } else { 0.0 };

        // Shadow detection criteria:
        // - Low value (dark)
        // - OR high saturation with moderate value (colored shadow)
        let is_shadow = value < threshold || (saturation > 0.3 && value < threshold * 1.5);

        mask[i] = if is_shadow { 255 } else { 0 };
    }

    // Apply morphological closing to fill gaps
    let closed = morphological_close_simple(&mask, width, height, 3);

    closed
}

/// Document background flattening
/// Makes background uniform white/gray
#[wasm_bindgen]
pub fn flatten_background(
    input: &[u8],
    width: usize,
    height: usize,
    smoothness: f64,
    target_white: u8,
) -> Vec<u8> {
    let n = width * height;
    let input_f: Vec<f64> = input.iter().map(|&x| x as f64).collect();

    // Estimate background using large morphological opening
    // (approximated with large Gaussian for speed)
    let sigma = smoothness * (width.min(height) as f64) / 10.0;
    let background = gaussian_blur_f64(&input_f, width, height, sigma);

    // Find the max of background (assumed to be document white point)
    // Note: max_bg could be used for adaptive scaling but we use target_white directly
    let _max_bg = background.iter().cloned().fold(0.0f64, f64::max).max(1.0);

    // Flatten: output = input * (target / background)
    (0..n)
        .map(|i| {
            let scale = if background[i] > 1.0 {
                target_white as f64 / background[i]
            } else {
                1.0
            };
            (input[i] as f64 * scale).clamp(0.0, 255.0) as u8
        })
        .collect()
}

/// Combined document enhancement pipeline
/// Applies shadow removal, white balance, and contrast enhancement
#[wasm_bindgen]
pub fn enhance_document_lighting(
    rgba: &[u8],
    width: usize,
    height: usize,
) -> Vec<u8> {
    let n = width * height;

    // Step 1: White balance
    let balanced = auto_white_balance(rgba, width, height);

    // Step 2: Extract luminance and apply shadow removal
    let mut luminance = vec![0u8; n];
    for i in 0..n {
        let r = balanced[i * 4] as f64;
        let g = balanced[i * 4 + 1] as f64;
        let b = balanced[i * 4 + 2] as f64;
        luminance[i] = (0.299 * r + 0.587 * g + 0.114 * b).clamp(0.0, 255.0) as u8;
    }

    let normalized_lum = remove_shadows_dog(&luminance, width, height, 2.0, 50.0);

    // Step 3: Apply luminance correction to color image
    let mut output = vec![0u8; n * 4];

    for i in 0..n {
        let orig_lum = luminance[i] as f64;
        let new_lum = normalized_lum[i] as f64;

        let ratio = if orig_lum > 1.0 {
            new_lum / orig_lum
        } else {
            1.0
        };

        output[i * 4] = (balanced[i * 4] as f64 * ratio).clamp(0.0, 255.0) as u8;
        output[i * 4 + 1] = (balanced[i * 4 + 1] as f64 * ratio).clamp(0.0, 255.0) as u8;
        output[i * 4 + 2] = (balanced[i * 4 + 2] as f64 * ratio).clamp(0.0, 255.0) as u8;
        output[i * 4 + 3] = rgba[i * 4 + 3]; // Preserve alpha
    }

    output
}

// Helper functions

fn gaussian_blur_f64(input: &[f64], width: usize, height: usize, sigma: f64) -> Vec<f64> {
    // Create 1D Gaussian kernel
    let radius = (sigma * 3.0).ceil() as usize;
    let size = 2 * radius + 1;
    let mut kernel = vec![0.0f64; size];
    let mut sum = 0.0f64;

    for i in 0..size {
        let x = i as f64 - radius as f64;
        kernel[i] = (-x * x / (2.0 * sigma * sigma)).exp();
        sum += kernel[i];
    }

    // Normalize
    for k in kernel.iter_mut() {
        *k /= sum;
    }

    // Separable convolution: horizontal pass
    let mut temp = vec![0.0f64; width * height];

    for y in 0..height {
        for x in 0..width {
            let mut val = 0.0f64;
            for i in 0..size {
                let kx = x as i32 + i as i32 - radius as i32;
                let kx = kx.clamp(0, width as i32 - 1) as usize;
                val += input[y * width + kx] * kernel[i];
            }
            temp[y * width + x] = val;
        }
    }

    // Vertical pass
    let mut output = vec![0.0f64; width * height];

    for y in 0..height {
        for x in 0..width {
            let mut val = 0.0f64;
            for i in 0..size {
                let ky = y as i32 + i as i32 - radius as i32;
                let ky = ky.clamp(0, height as i32 - 1) as usize;
                val += temp[ky * width + x] * kernel[i];
            }
            output[y * width + x] = val;
        }
    }

    output
}

fn build_integral_image(input: &[f64], width: usize, height: usize) -> Vec<f64> {
    let mut integral = vec![0.0f64; (width + 1) * (height + 1)];

    for y in 0..height {
        for x in 0..width {
            let idx = y * width + x;
            let int_idx = (y + 1) * (width + 1) + (x + 1);
            integral[int_idx] = input[idx]
                + integral[int_idx - 1]
                + integral[int_idx - width - 1]
                - integral[int_idx - width - 2];
        }
    }

    integral
}

fn get_integral_sum(integral: &[f64], int_width: usize, x1: usize, y1: usize, x2: usize, y2: usize) -> f64 {
    integral[y2 * int_width + x2]
        - integral[y2 * int_width + x1]
        - integral[y1 * int_width + x2]
        + integral[y1 * int_width + x1]
}

fn morphological_close_simple(input: &[u8], width: usize, height: usize, kernel_size: usize) -> Vec<u8> {
    // Dilate then erode
    let dilated = dilate_simple(input, width, height, kernel_size);
    erode_simple(&dilated, width, height, kernel_size)
}

fn dilate_simple(input: &[u8], width: usize, height: usize, kernel_size: usize) -> Vec<u8> {
    let radius = kernel_size / 2;
    let mut output = vec![0u8; width * height];

    for y in 0..height {
        for x in 0..width {
            let mut max_val = 0u8;

            let y_start = if y >= radius { y - radius } else { 0 };
            let y_end = (y + radius + 1).min(height);
            let x_start = if x >= radius { x - radius } else { 0 };
            let x_end = (x + radius + 1).min(width);

            for ny in y_start..y_end {
                for nx in x_start..x_end {
                    max_val = max_val.max(input[ny * width + nx]);
                }
            }

            output[y * width + x] = max_val;
        }
    }

    output
}

fn erode_simple(input: &[u8], width: usize, height: usize, kernel_size: usize) -> Vec<u8> {
    let radius = kernel_size / 2;
    let mut output = vec![0u8; width * height];

    for y in 0..height {
        for x in 0..width {
            let mut min_val = 255u8;

            let y_start = if y >= radius { y - radius } else { 0 };
            let y_end = (y + radius + 1).min(height);
            let x_start = if x >= radius { x - radius } else { 0 };
            let x_end = (x + radius + 1).min(width);

            for ny in y_start..y_end {
                for nx in x_start..x_end {
                    min_val = min_val.min(input[ny * width + nx]);
                }
            }

            output[y * width + x] = min_val;
        }
    }

    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_retinex_uniform() {
        let input = vec![128u8; 100];
        let output = remove_shadows_retinex(&input, 10, 10, 1.0, 0.0);

        assert_eq!(output.len(), 100);
    }

    #[test]
    fn test_dog_uniform() {
        let input = vec![128u8; 100];
        let output = remove_shadows_dog(&input, 10, 10, 1.0, 10.0);

        assert_eq!(output.len(), 100);
        // Uniform should stay roughly uniform
        for &v in &output {
            assert!((v as i32 - 128).abs() < 30);
        }
    }

    #[test]
    fn test_local_normalization() {
        let input = vec![100u8; 100];
        let output = normalize_illumination_local(&input, 10, 10, 5, 2.0);

        assert_eq!(output.len(), 100);
    }

    #[test]
    fn test_white_balance() {
        // Create image with color cast (more red)
        let rgba: Vec<u8> = (0..100).flat_map(|_| vec![200, 100, 100, 255]).collect();

        let output = auto_white_balance(&rgba, 10, 10);

        assert_eq!(output.len(), 400);

        // After white balance, channels should be more balanced
        let mut sum_r = 0u64;
        let mut sum_g = 0u64;
        let mut sum_b = 0u64;

        for i in 0..100 {
            sum_r += output[i * 4] as u64;
            sum_g += output[i * 4 + 1] as u64;
            sum_b += output[i * 4 + 2] as u64;
        }

        // Channels should be closer together
        let avg_r = sum_r / 100;
        let avg_g = sum_g / 100;
        let avg_b = sum_b / 100;

        let max_diff = (avg_r as i64 - avg_g as i64)
            .abs()
            .max((avg_g as i64 - avg_b as i64).abs())
            .max((avg_r as i64 - avg_b as i64).abs());

        assert!(max_diff < 50); // Should be more balanced than before
    }

    #[test]
    fn test_shadow_detection() {
        let rgba: Vec<u8> = (0..100).flat_map(|i| {
            if i < 50 {
                vec![50, 50, 50, 255] // Dark (shadow)
            } else {
                vec![200, 200, 200, 255] // Light
            }
        }).collect();

        let mask = detect_shadows(&rgba, 10, 10, 0.3);

        assert_eq!(mask.len(), 100);
        // First half should be detected as shadow
        assert!(mask[0] > 0 || mask[25] > 0);
    }

    #[test]
    fn test_flatten_background() {
        let input = vec![128u8; 100];
        let output = flatten_background(&input, 10, 10, 0.5, 240);

        assert_eq!(output.len(), 100);
    }

    #[test]
    fn test_enhance_document() {
        let rgba: Vec<u8> = (0..400).map(|i| if i % 4 == 3 { 255 } else { 128 }).collect();

        let output = enhance_document_lighting(&rgba, 10, 10);

        assert_eq!(output.len(), 400);
        // Alpha should be preserved
        for i in 0..100 {
            assert_eq!(output[i * 4 + 3], 255);
        }
    }
}
