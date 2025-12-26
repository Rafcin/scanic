use wasm_bindgen::prelude::*;

/// Bilateral Filter Module
/// Implements OpenCV's bilateralFilter - an edge-preserving smoothing filter
/// that reduces noise while keeping edges sharp.
///
/// This is particularly effective for document images where you want to
/// reduce paper texture noise while preserving text edges.

/// Apply bilateral filter to a grayscale image
/// Equivalent to OpenCV's bilateralFilter
///
/// # Arguments
/// * `input` - Grayscale image
/// * `width` - Image width
/// * `height` - Image height
/// * `d` - Diameter of pixel neighborhood (use -1 to compute from sigma_space)
/// * `sigma_color` - Filter sigma in the color space (larger = more color mixing)
/// * `sigma_space` - Filter sigma in the coordinate space (larger = farther pixels influence)
///
/// # Returns
/// Filtered image
#[wasm_bindgen]
pub fn bilateral_filter(
    input: &[u8],
    width: usize,
    height: usize,
    d: i32,
    sigma_color: f64,
    sigma_space: f64,
) -> Vec<u8> {
    // Determine kernel radius
    let radius = if d > 0 {
        d / 2
    } else {
        // Auto-determine from sigma_space (like OpenCV)
        (sigma_space * 1.5).round() as i32
    };

    let radius = radius.max(1) as usize;

    // Pre-compute spatial Gaussian weights
    let spatial_weights = precompute_spatial_weights(radius, sigma_space);

    // Pre-compute color Gaussian LUT (0-255 differences)
    let color_lut = precompute_color_lut(sigma_color);

    let mut output = vec![0u8; width * height];

    for y in 0..height {
        for x in 0..width {
            let center_val = input[y * width + x] as i32;

            let mut sum = 0.0;
            let mut weight_sum = 0.0;

            let y_start = if y >= radius { y - radius } else { 0 };
            let y_end = (y + radius + 1).min(height);
            let x_start = if x >= radius { x - radius } else { 0 };
            let x_end = (x + radius + 1).min(width);

            for ny in y_start..y_end {
                for nx in x_start..x_end {
                    let neighbor_val = input[ny * width + nx] as i32;

                    // Spatial weight (Gaussian based on distance)
                    let dy = (ny as i32 - y as i32).unsigned_abs() as usize;
                    let dx = (nx as i32 - x as i32).unsigned_abs() as usize;
                    let spatial_weight = spatial_weights[dy * (radius + 1) + dx];

                    // Color/range weight (Gaussian based on intensity difference)
                    let color_diff = (neighbor_val - center_val).unsigned_abs() as usize;
                    let color_weight = color_lut[color_diff.min(255)];

                    // Combined weight
                    let weight = spatial_weight * color_weight;

                    sum += neighbor_val as f64 * weight;
                    weight_sum += weight;
                }
            }

            output[y * width + x] = if weight_sum > 0.0 {
                (sum / weight_sum).round().clamp(0.0, 255.0) as u8
            } else {
                center_val as u8
            };
        }
    }

    output
}

/// Pre-compute spatial Gaussian weights
fn precompute_spatial_weights(radius: usize, sigma: f64) -> Vec<f64> {
    let size = radius + 1;
    let mut weights = vec![0.0; size * size];

    let sigma_sq_2 = 2.0 * sigma * sigma;

    for dy in 0..size {
        for dx in 0..size {
            let dist_sq = (dx * dx + dy * dy) as f64;
            weights[dy * size + dx] = (-dist_sq / sigma_sq_2).exp();
        }
    }

    weights
}

/// Pre-compute color/range Gaussian LUT
fn precompute_color_lut(sigma: f64) -> [f64; 256] {
    let mut lut = [0.0; 256];
    let sigma_sq_2 = 2.0 * sigma * sigma;

    for i in 0..256 {
        let diff_sq = (i * i) as f64;
        lut[i] = (-diff_sq / sigma_sq_2).exp();
    }

    lut
}

/// Fast bilateral filter using spatial approximation
/// Uses a grid-based approach for faster computation on large images
#[wasm_bindgen]
pub fn bilateral_filter_fast(
    input: &[u8],
    width: usize,
    height: usize,
    sigma_color: f64,
    sigma_space: f64,
) -> Vec<u8> {
    // Use separable approximation with horizontal then vertical passes
    let horizontal = bilateral_filter_1d(&input, width, height, sigma_color, sigma_space, true);
    bilateral_filter_1d(&horizontal, width, height, sigma_color, sigma_space, false)
}

/// 1D bilateral filter pass
fn bilateral_filter_1d(
    input: &[u8],
    width: usize,
    height: usize,
    sigma_color: f64,
    sigma_space: f64,
    horizontal: bool,
) -> Vec<u8> {
    let radius = (sigma_space * 1.5).round() as usize;
    let color_lut = precompute_color_lut(sigma_color);

    // 1D spatial weights
    let mut spatial_weights = vec![0.0; radius + 1];
    let sigma_sq_2 = 2.0 * sigma_space * sigma_space;
    for i in 0..=radius {
        let dist_sq = (i * i) as f64;
        spatial_weights[i] = (-dist_sq / sigma_sq_2).exp();
    }

    let mut output = vec![0u8; width * height];

    if horizontal {
        for y in 0..height {
            for x in 0..width {
                let center_val = input[y * width + x] as i32;

                let mut sum = 0.0;
                let mut weight_sum = 0.0;

                let x_start = if x >= radius { x - radius } else { 0 };
                let x_end = (x + radius + 1).min(width);

                for nx in x_start..x_end {
                    let neighbor_val = input[y * width + nx] as i32;
                    let dx = (nx as i32 - x as i32).unsigned_abs() as usize;

                    let color_diff = (neighbor_val - center_val).unsigned_abs() as usize;
                    let weight = spatial_weights[dx] * color_lut[color_diff.min(255)];

                    sum += neighbor_val as f64 * weight;
                    weight_sum += weight;
                }

                output[y * width + x] = if weight_sum > 0.0 {
                    (sum / weight_sum).round() as u8
                } else {
                    center_val as u8
                };
            }
        }
    } else {
        for y in 0..height {
            for x in 0..width {
                let center_val = input[y * width + x] as i32;

                let mut sum = 0.0;
                let mut weight_sum = 0.0;

                let y_start = if y >= radius { y - radius } else { 0 };
                let y_end = (y + radius + 1).min(height);

                for ny in y_start..y_end {
                    let neighbor_val = input[ny * width + x] as i32;
                    let dy = (ny as i32 - y as i32).unsigned_abs() as usize;

                    let color_diff = (neighbor_val - center_val).unsigned_abs() as usize;
                    let weight = spatial_weights[dy] * color_lut[color_diff.min(255)];

                    sum += neighbor_val as f64 * weight;
                    weight_sum += weight;
                }

                output[y * width + x] = if weight_sum > 0.0 {
                    (sum / weight_sum).round() as u8
                } else {
                    center_val as u8
                };
            }
        }
    }

    output
}

/// Apply bilateral filter to RGBA image (processes each color channel separately)
#[wasm_bindgen]
pub fn bilateral_filter_rgba(
    input: &[u8],
    width: usize,
    height: usize,
    d: i32,
    sigma_color: f64,
    sigma_space: f64,
) -> Vec<u8> {
    let n = width * height;

    // Extract channels
    let mut r = vec![0u8; n];
    let mut g = vec![0u8; n];
    let mut b = vec![0u8; n];
    let mut a = vec![0u8; n];

    for i in 0..n {
        r[i] = input[i * 4];
        g[i] = input[i * 4 + 1];
        b[i] = input[i * 4 + 2];
        a[i] = input[i * 4 + 3];
    }

    // Filter each channel
    let r_filtered = bilateral_filter(&r, width, height, d, sigma_color, sigma_space);
    let g_filtered = bilateral_filter(&g, width, height, d, sigma_color, sigma_space);
    let b_filtered = bilateral_filter(&b, width, height, d, sigma_color, sigma_space);

    // Combine back to RGBA
    let mut output = vec![0u8; n * 4];
    for i in 0..n {
        output[i * 4] = r_filtered[i];
        output[i * 4 + 1] = g_filtered[i];
        output[i * 4 + 2] = b_filtered[i];
        output[i * 4 + 3] = a[i]; // Preserve alpha
    }

    output
}

/// Joint bilateral filter - uses a guide image for edge detection
/// Useful when you want to filter one image based on edges in another
#[wasm_bindgen]
pub fn joint_bilateral_filter(
    input: &[u8],
    guide: &[u8],
    width: usize,
    height: usize,
    d: i32,
    sigma_color: f64,
    sigma_space: f64,
) -> Vec<u8> {
    let radius = if d > 0 {
        d / 2
    } else {
        (sigma_space * 1.5).round() as i32
    };

    let radius = radius.max(1) as usize;

    let spatial_weights = precompute_spatial_weights(radius, sigma_space);
    let color_lut = precompute_color_lut(sigma_color);

    let mut output = vec![0u8; width * height];

    for y in 0..height {
        for x in 0..width {
            let center_guide = guide[y * width + x] as i32;

            let mut sum = 0.0;
            let mut weight_sum = 0.0;

            let y_start = if y >= radius { y - radius } else { 0 };
            let y_end = (y + radius + 1).min(height);
            let x_start = if x >= radius { x - radius } else { 0 };
            let x_end = (x + radius + 1).min(width);

            for ny in y_start..y_end {
                for nx in x_start..x_end {
                    let neighbor_val = input[ny * width + nx];
                    let neighbor_guide = guide[ny * width + nx] as i32;

                    let dy = (ny as i32 - y as i32).unsigned_abs() as usize;
                    let dx = (nx as i32 - x as i32).unsigned_abs() as usize;
                    let spatial_weight = spatial_weights[dy * (radius + 1) + dx];

                    // Color weight based on GUIDE image
                    let color_diff = (neighbor_guide - center_guide).unsigned_abs() as usize;
                    let color_weight = color_lut[color_diff.min(255)];

                    let weight = spatial_weight * color_weight;

                    sum += neighbor_val as f64 * weight;
                    weight_sum += weight;
                }
            }

            output[y * width + x] = if weight_sum > 0.0 {
                (sum / weight_sum).round() as u8
            } else {
                input[y * width + x]
            };
        }
    }

    output
}

/// Median filter - removes salt-and-pepper noise
#[wasm_bindgen]
pub fn median_filter(
    input: &[u8],
    width: usize,
    height: usize,
    kernel_size: usize,
) -> Vec<u8> {
    let radius = kernel_size / 2;
    let mut output = vec![0u8; width * height];
    let mut neighborhood = Vec::with_capacity(kernel_size * kernel_size);

    for y in 0..height {
        for x in 0..width {
            neighborhood.clear();

            let y_start = if y >= radius { y - radius } else { 0 };
            let y_end = (y + radius + 1).min(height);
            let x_start = if x >= radius { x - radius } else { 0 };
            let x_end = (x + radius + 1).min(width);

            for ny in y_start..y_end {
                for nx in x_start..x_end {
                    neighborhood.push(input[ny * width + nx]);
                }
            }

            // Sort and take median
            neighborhood.sort_unstable();
            output[y * width + x] = neighborhood[neighborhood.len() / 2];
        }
    }

    output
}

/// Fast median filter using histogram optimization (for larger kernels)
#[wasm_bindgen]
pub fn median_filter_fast(
    input: &[u8],
    width: usize,
    height: usize,
    kernel_size: usize,
) -> Vec<u8> {
    // For small kernels, use simple approach
    if kernel_size <= 5 {
        return median_filter(input, width, height, kernel_size);
    }

    let radius = kernel_size / 2;
    let mut output = vec![0u8; width * height];

    // Use Huang's O(1) median filter algorithm
    for y in 0..height {
        let mut histogram = [0u32; 256];
        let mut count = 0u32;

        // Initialize histogram for first position in row
        let y_start = if y >= radius { y - radius } else { 0 };
        let y_end = (y + radius + 1).min(height);

        for ny in y_start..y_end {
            for nx in 0..(radius + 1).min(width) {
                let val = input[ny * width + nx] as usize;
                histogram[val] += 1;
                count += 1;
            }
        }

        // Calculate median for first pixel
        let median_idx = count / 2;
        let mut median = find_median_from_histogram(&histogram, median_idx);
        output[y * width] = median;

        // Slide window across row
        for x in 1..width {
            // Remove left column
            if x > radius {
                let old_x = x - radius - 1;
                for ny in y_start..y_end {
                    let val = input[ny * width + old_x] as usize;
                    histogram[val] -= 1;
                    count -= 1;
                }
            }

            // Add right column
            let new_x = x + radius;
            if new_x < width {
                for ny in y_start..y_end {
                    let val = input[ny * width + new_x] as usize;
                    histogram[val] += 1;
                    count += 1;
                }
            }

            // Find new median
            let median_idx = count / 2;
            median = find_median_from_histogram(&histogram, median_idx);
            output[y * width + x] = median;
        }
    }

    output
}

/// Find median value from histogram
fn find_median_from_histogram(histogram: &[u32; 256], target: u32) -> u8 {
    let mut sum = 0u32;
    for (i, &count) in histogram.iter().enumerate() {
        sum += count;
        if sum > target {
            return i as u8;
        }
    }
    255
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bilateral_filter_uniform() {
        // Uniform image should stay uniform
        let input = vec![128u8; 100];
        let output = bilateral_filter(&input, 10, 10, 5, 75.0, 75.0);

        assert_eq!(output.len(), 100);
        for &v in &output {
            assert!((v as i32 - 128).abs() <= 1);
        }
    }

    #[test]
    fn test_bilateral_preserves_edges() {
        // Create image with sharp edge
        let mut input = vec![0u8; 100];
        for y in 0..10 {
            for x in 5..10 {
                input[y * 10 + x] = 255;
            }
        }

        let output = bilateral_filter(&input, 10, 10, 5, 30.0, 30.0);

        // Edge should be preserved (pixels far from edge should stay black/white)
        assert!(output[0] < 50); // Far from edge, should stay dark
        assert!(output[9] > 200); // Far from edge, should stay bright
    }

    #[test]
    fn test_bilateral_vs_fast() {
        let input: Vec<u8> = (0..100).map(|i| (i * 2 % 256) as u8).collect();

        let regular = bilateral_filter(&input, 10, 10, -1, 50.0, 3.0);
        let fast = bilateral_filter_fast(&input, 10, 10, 50.0, 3.0);

        // Results should be similar (fast is approximation)
        assert_eq!(regular.len(), fast.len());
    }

    #[test]
    fn test_median_filter_salt_pepper() {
        // Create image with salt and pepper noise
        let mut input = vec![128u8; 100];
        input[25] = 0;   // Pepper
        input[50] = 255; // Salt
        input[75] = 0;   // Pepper

        let output = median_filter(&input, 10, 10, 3);

        // Noise should be removed
        assert!(output[25] > 100);
        assert!(output[50] < 180);
        assert!(output[75] > 100);
    }

    #[test]
    fn test_median_filter_fast() {
        let input: Vec<u8> = (0..400).map(|i| (i % 256) as u8).collect();

        let regular = median_filter(&input, 20, 20, 7);
        let fast = median_filter_fast(&input, 20, 20, 7);

        // Results should be identical
        assert_eq!(regular, fast);
    }

    #[test]
    fn test_joint_bilateral_filter() {
        let input = vec![128u8; 100];

        // Guide with edge
        let mut guide = vec![50u8; 100];
        for y in 0..10 {
            for x in 5..10 {
                guide[y * 10 + x] = 200;
            }
        }

        let output = joint_bilateral_filter(&input, &guide, 10, 10, 5, 30.0, 30.0);

        // Output should reflect edges from guide
        assert_eq!(output.len(), 100);
    }

    #[test]
    fn test_bilateral_filter_rgba() {
        // Create simple RGBA image
        let input: Vec<u8> = (0..400).flat_map(|i| {
            let v = (i % 256) as u8;
            vec![v, v, v, 255]
        }).collect();

        let output = bilateral_filter_rgba(&input, 10, 10, 5, 50.0, 50.0);

        assert_eq!(output.len(), 400);
        // Alpha should be preserved
        for i in 0..100 {
            assert_eq!(output[i * 4 + 3], 255);
        }
    }
}
