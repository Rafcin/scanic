use wasm_bindgen::prelude::*;

/// Adaptive thresholding methods
/// These automatically determine thresholds based on local image statistics,
/// which is crucial for documents with uneven lighting.

/// Calculate integral image for efficient local statistics computation
/// This allows O(1) computation of any rectangular sum
#[wasm_bindgen]
pub fn compute_integral_image(input: &[u8], width: usize, height: usize) -> Vec<u32> {
    let mut integral = vec![0u32; width * height];

    // First pixel
    integral[0] = input[0] as u32;

    // First row
    for x in 1..width {
        integral[x] = integral[x - 1] + input[x] as u32;
    }

    // First column
    for y in 1..height {
        integral[y * width] = integral[(y - 1) * width] + input[y * width] as u32;
    }

    // Rest of the image
    for y in 1..height {
        for x in 1..width {
            let idx = y * width + x;
            integral[idx] = input[idx] as u32 + integral[idx - 1] + integral[idx - width]
                - integral[idx - width - 1];
        }
    }

    integral
}

/// Compute squared integral image for variance calculation
pub fn compute_integral_image_sq(input: &[u8], width: usize, height: usize) -> Vec<u64> {
    let mut integral_sq = vec![0u64; width * height];

    // First pixel
    integral_sq[0] = (input[0] as u64) * (input[0] as u64);

    // First row
    for x in 1..width {
        let val = input[x] as u64;
        integral_sq[x] = integral_sq[x - 1] + val * val;
    }

    // First column
    for y in 1..height {
        let val = input[y * width] as u64;
        integral_sq[y * width] = integral_sq[(y - 1) * width] + val * val;
    }

    // Rest of the image
    for y in 1..height {
        for x in 1..width {
            let idx = y * width + x;
            let val = input[idx] as u64;
            integral_sq[idx] =
                val * val + integral_sq[idx - 1] + integral_sq[idx - width] - integral_sq[idx - width - 1];
        }
    }

    integral_sq
}

/// Get sum of rectangular region using integral image in O(1)
#[inline]
fn get_rect_sum(integral: &[u32], width: usize, x1: usize, y1: usize, x2: usize, y2: usize) -> u32 {
    let a = if x1 > 0 && y1 > 0 {
        integral[(y1 - 1) * width + (x1 - 1)]
    } else {
        0
    };
    let b = if y1 > 0 {
        integral[(y1 - 1) * width + x2]
    } else {
        0
    };
    let c = if x1 > 0 {
        integral[y2 * width + (x1 - 1)]
    } else {
        0
    };
    let d = integral[y2 * width + x2];

    d + a - b - c
}

/// Get squared sum of rectangular region
#[inline]
fn get_rect_sum_sq(integral_sq: &[u64], width: usize, x1: usize, y1: usize, x2: usize, y2: usize) -> u64 {
    let a = if x1 > 0 && y1 > 0 {
        integral_sq[(y1 - 1) * width + (x1 - 1)]
    } else {
        0
    };
    let b = if y1 > 0 {
        integral_sq[(y1 - 1) * width + x2]
    } else {
        0
    };
    let c = if x1 > 0 {
        integral_sq[y2 * width + (x1 - 1)]
    } else {
        0
    };
    let d = integral_sq[y2 * width + x2];

    d + a - b - c
}

/// Adaptive mean thresholding (similar to OpenCV's ADAPTIVE_THRESH_MEAN_C)
/// For each pixel, threshold is the mean of block_size x block_size neighborhood minus C
#[wasm_bindgen]
pub fn adaptive_threshold_mean(
    input: &[u8],
    width: usize,
    height: usize,
    block_size: usize,
    c: f32,
) -> Vec<u8> {
    let integral = compute_integral_image(input, width, height);
    let mut output = vec![0u8; width * height];
    let half_block = block_size / 2;

    for y in 0..height {
        for x in 0..width {
            let idx = y * width + x;

            // Define the neighborhood bounds
            let x1 = x.saturating_sub(half_block);
            let y1 = y.saturating_sub(half_block);
            let x2 = (x + half_block).min(width - 1);
            let y2 = (y + half_block).min(height - 1);

            let sum = get_rect_sum(&integral, width, x1, y1, x2, y2);
            let count = ((x2 - x1 + 1) * (y2 - y1 + 1)) as f32;
            let mean = sum as f32 / count;
            let threshold = mean - c;

            output[idx] = if input[idx] as f32 > threshold { 255 } else { 0 };
        }
    }

    output
}

/// Adaptive Gaussian-weighted mean thresholding (similar to OpenCV's ADAPTIVE_THRESH_GAUSSIAN_C)
/// Weights decrease with distance from center pixel
#[wasm_bindgen]
pub fn adaptive_threshold_gaussian(
    input: &[u8],
    width: usize,
    height: usize,
    block_size: usize,
    c: f32,
) -> Vec<u8> {
    // Pre-compute Gaussian weights
    let half_block = block_size / 2;
    let sigma = (block_size as f32) / 6.0; // Standard deviation
    let sigma_sq_2 = 2.0 * sigma * sigma;

    let mut weights = vec![0.0f32; block_size * block_size];
    let mut weight_sum = 0.0f32;

    for dy in 0..block_size {
        for dx in 0..block_size {
            let y_dist = (dy as i32 - half_block as i32) as f32;
            let x_dist = (dx as i32 - half_block as i32) as f32;
            let weight = (-(x_dist * x_dist + y_dist * y_dist) / sigma_sq_2).exp();
            weights[dy * block_size + dx] = weight;
            weight_sum += weight;
        }
    }

    // Normalize weights
    for w in weights.iter_mut() {
        *w /= weight_sum;
    }

    let mut output = vec![0u8; width * height];

    for y in 0..height {
        for x in 0..width {
            let idx = y * width + x;
            let mut weighted_sum = 0.0f32;

            for dy in 0..block_size {
                for dx in 0..block_size {
                    let ny = (y as i32 + dy as i32 - half_block as i32).clamp(0, height as i32 - 1) as usize;
                    let nx = (x as i32 + dx as i32 - half_block as i32).clamp(0, width as i32 - 1) as usize;
                    weighted_sum += input[ny * width + nx] as f32 * weights[dy * block_size + dx];
                }
            }

            let threshold = weighted_sum - c;
            output[idx] = if input[idx] as f32 > threshold { 255 } else { 0 };
        }
    }

    output
}

/// Sauvola's adaptive thresholding - excellent for document images
/// T(x,y) = mean(x,y) * (1 + k * (stddev(x,y) / R - 1))
/// where R is the dynamic range of standard deviation (128 for 8-bit images)
/// k is typically 0.5 for document images
#[wasm_bindgen]
pub fn adaptive_threshold_sauvola(
    input: &[u8],
    width: usize,
    height: usize,
    block_size: usize,
    k: f32,
    r: f32, // Usually 128.0 for 8-bit images
) -> Vec<u8> {
    let integral = compute_integral_image(input, width, height);
    let integral_sq = compute_integral_image_sq(input, width, height);
    let mut output = vec![0u8; width * height];
    let half_block = block_size / 2;

    for y in 0..height {
        for x in 0..width {
            let idx = y * width + x;

            // Define the neighborhood bounds
            let x1 = x.saturating_sub(half_block);
            let y1 = y.saturating_sub(half_block);
            let x2 = (x + half_block).min(width - 1);
            let y2 = (y + half_block).min(height - 1);

            let sum = get_rect_sum(&integral, width, x1, y1, x2, y2) as f64;
            let sum_sq = get_rect_sum_sq(&integral_sq, width, x1, y1, x2, y2) as f64;
            let count = ((x2 - x1 + 1) * (y2 - y1 + 1)) as f64;

            let mean = sum / count;
            let variance = (sum_sq / count) - (mean * mean);
            let stddev = variance.max(0.0).sqrt();

            // Sauvola's formula
            let threshold = mean * (1.0 + k as f64 * (stddev / r as f64 - 1.0));

            output[idx] = if (input[idx] as f64) > threshold { 255 } else { 0 };
        }
    }

    output
}

/// Niblack's adaptive thresholding
/// T(x,y) = mean(x,y) + k * stddev(x,y)
/// k is typically -0.2 for document images
#[wasm_bindgen]
pub fn adaptive_threshold_niblack(
    input: &[u8],
    width: usize,
    height: usize,
    block_size: usize,
    k: f32,
) -> Vec<u8> {
    let integral = compute_integral_image(input, width, height);
    let integral_sq = compute_integral_image_sq(input, width, height);
    let mut output = vec![0u8; width * height];
    let half_block = block_size / 2;

    for y in 0..height {
        for x in 0..width {
            let idx = y * width + x;

            // Define the neighborhood bounds
            let x1 = x.saturating_sub(half_block);
            let y1 = y.saturating_sub(half_block);
            let x2 = (x + half_block).min(width - 1);
            let y2 = (y + half_block).min(height - 1);

            let sum = get_rect_sum(&integral, width, x1, y1, x2, y2) as f64;
            let sum_sq = get_rect_sum_sq(&integral_sq, width, x1, y1, x2, y2) as f64;
            let count = ((x2 - x1 + 1) * (y2 - y1 + 1)) as f64;

            let mean = sum / count;
            let variance = (sum_sq / count) - (mean * mean);
            let stddev = variance.max(0.0).sqrt();

            // Niblack's formula
            let threshold = mean + k as f64 * stddev;

            output[idx] = if (input[idx] as f64) > threshold { 255 } else { 0 };
        }
    }

    output
}

/// Compute adaptive Canny thresholds based on image statistics
/// Returns (low_threshold, high_threshold) computed from gradient magnitude histogram
#[wasm_bindgen]
pub fn compute_adaptive_canny_thresholds(
    magnitude: &[f32],
    _width: usize,
    _height: usize,
    low_ratio: f32,  // Typically 0.4
    high_ratio: f32, // Typically 0.7
) -> Vec<f32> {
    // Compute histogram of non-zero magnitudes
    let mut magnitudes: Vec<f32> = magnitude.iter().filter(|&&m| m > 0.0).cloned().collect();

    if magnitudes.is_empty() {
        return vec![50.0, 150.0]; // Default fallback
    }

    magnitudes.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let low_idx = ((magnitudes.len() as f32) * low_ratio) as usize;
    let high_idx = ((magnitudes.len() as f32) * high_ratio) as usize;

    let low_threshold = magnitudes[low_idx.min(magnitudes.len() - 1)];
    let high_threshold = magnitudes[high_idx.min(magnitudes.len() - 1)];

    vec![low_threshold, high_threshold]
}

/// Otsu's method for automatic threshold selection
/// Returns the optimal threshold that minimizes intra-class variance
#[wasm_bindgen]
pub fn otsu_threshold(input: &[u8], width: usize, height: usize) -> u8 {
    let size = width * height;

    // Compute histogram
    let mut histogram = [0u32; 256];
    for &pixel in input.iter() {
        histogram[pixel as usize] += 1;
    }

    // Compute total mean
    let mut total_sum: f64 = 0.0;
    for (i, &count) in histogram.iter().enumerate() {
        total_sum += i as f64 * count as f64;
    }
    let _total_mean = total_sum / size as f64;

    // Find optimal threshold using Otsu's method
    let mut best_threshold = 0u8;
    let mut max_variance = 0.0f64;

    let mut w0: f64 = 0.0; // Weight of background class
    let mut sum0: f64 = 0.0; // Sum of background class

    for t in 0..256 {
        w0 += histogram[t] as f64;
        if w0 == 0.0 {
            continue;
        }

        let w1 = size as f64 - w0;
        if w1 == 0.0 {
            break;
        }

        sum0 += t as f64 * histogram[t] as f64;
        let mean0 = sum0 / w0;
        let mean1 = (total_sum - sum0) / w1;

        // Between-class variance
        let variance = w0 * w1 * (mean0 - mean1) * (mean0 - mean1);

        if variance > max_variance {
            max_variance = variance;
            best_threshold = t as u8;
        }
    }

    best_threshold
}

/// Multi-level Otsu thresholding for images with multiple intensity regions
/// Returns multiple thresholds for separating different regions
#[wasm_bindgen]
pub fn multi_otsu_threshold(input: &[u8], width: usize, height: usize, levels: usize) -> Vec<u8> {
    if levels < 2 {
        return vec![otsu_threshold(input, width, height)];
    }

    // For simplicity, implement 2-level (3-class) Otsu
    // This is useful for documents with background, paper, and text

    let size = width * height;

    // Compute histogram
    let mut histogram = [0u32; 256];
    for &pixel in input.iter() {
        histogram[pixel as usize] += 1;
    }

    // Normalize histogram
    let mut p = [0.0f64; 256];
    for i in 0..256 {
        p[i] = histogram[i] as f64 / size as f64;
    }

    // Compute cumulative sums
    let mut omega = [0.0f64; 256];
    let mut mu = [0.0f64; 256];

    omega[0] = p[0];
    mu[0] = 0.0;

    for i in 1..256 {
        omega[i] = omega[i - 1] + p[i];
        mu[i] = mu[i - 1] + i as f64 * p[i];
    }

    let mu_t = mu[255];

    // Find optimal thresholds for 3 classes
    let mut best_t1 = 0u8;
    let mut best_t2 = 0u8;
    let mut max_variance = 0.0f64;

    for t1 in 0..254 {
        for t2 in (t1 + 1)..255 {
            let w0 = omega[t1];
            let w1 = omega[t2] - omega[t1];
            let w2 = 1.0 - omega[t2];

            if w0 <= 0.0 || w1 <= 0.0 || w2 <= 0.0 {
                continue;
            }

            let mu0 = mu[t1] / w0;
            let mu1 = (mu[t2] - mu[t1]) / w1;
            let mu2 = (mu_t - mu[t2]) / w2;

            let variance = w0 * (mu0 - mu_t).powi(2)
                + w1 * (mu1 - mu_t).powi(2)
                + w2 * (mu2 - mu_t).powi(2);

            if variance > max_variance {
                max_variance = variance;
                best_t1 = t1 as u8;
                best_t2 = t2 as u8;
            }
        }
    }

    vec![best_t1, best_t2]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_integral_image() {
        let input = vec![1u8, 2, 3, 4, 5, 6, 7, 8, 9];
        let width = 3;
        let height = 3;
        let integral = compute_integral_image(&input, width, height);

        // Sum of entire image should be sum of all pixels
        assert_eq!(integral[8], 45);
    }

    #[test]
    fn test_otsu_bimodal() {
        // Create a bimodal image with values around 50 and 200
        let mut input = vec![50u8; 100];
        for i in 50..100 {
            input[i] = 200;
        }

        let threshold = otsu_threshold(&input, 10, 10);

        // Threshold should be between the two modes
        assert!(threshold >= 50 && threshold <= 200,
            "Expected threshold between 50 and 200, got {}", threshold);
    }
}
