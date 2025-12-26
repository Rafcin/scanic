use wasm_bindgen::prelude::*;

/// CLAHE - Contrast Limited Adaptive Histogram Equalization
///
/// This is critical for document scanning as it handles:
/// - Uneven lighting conditions
/// - Shadows and glare
/// - Low contrast documents
///
/// CLAHE divides the image into tiles, computes histogram for each tile,
/// limits contrast (clip limit), and interpolates between tiles.

const NUM_BINS: usize = 256;

/// Standard histogram equalization (global)
#[wasm_bindgen]
pub fn histogram_equalization(input: &[u8], width: usize, height: usize) -> Vec<u8> {
    let size = width * height;

    // Compute histogram
    let mut histogram = [0u32; NUM_BINS];
    for &pixel in input.iter() {
        histogram[pixel as usize] += 1;
    }

    // Compute CDF (cumulative distribution function)
    let mut cdf = [0u32; NUM_BINS];
    cdf[0] = histogram[0];
    for i in 1..NUM_BINS {
        cdf[i] = cdf[i - 1] + histogram[i];
    }

    // Find minimum non-zero CDF value
    let cdf_min = cdf.iter().find(|&&c| c > 0).copied().unwrap_or(0);

    // Create lookup table for mapping
    let mut lut = [0u8; NUM_BINS];
    let scale = 255.0 / (size as f32 - cdf_min as f32).max(1.0);

    for i in 0..NUM_BINS {
        if cdf[i] > cdf_min {
            lut[i] = (((cdf[i] - cdf_min) as f32 * scale).round() as u32).min(255) as u8;
        } else {
            lut[i] = 0;
        }
    }

    // Apply mapping
    let mut output = vec![0u8; size];
    for (i, &pixel) in input.iter().enumerate() {
        output[i] = lut[pixel as usize];
    }

    output
}

/// Clip histogram to limit contrast enhancement
fn clip_histogram(histogram: &mut [u32; NUM_BINS], clip_limit: u32) {
    // Count excess pixels above clip limit
    let mut excess: u32 = 0;
    for &count in histogram.iter() {
        if count > clip_limit {
            excess += count - clip_limit;
        }
    }

    // Redistribute excess pixels evenly
    let bin_incr = excess / NUM_BINS as u32;
    let upper = clip_limit - bin_incr;

    // Clip and redistribute
    for count in histogram.iter_mut() {
        if *count > clip_limit {
            *count = clip_limit;
        } else if *count > upper {
            excess -= clip_limit - *count;
            *count = clip_limit;
        } else {
            excess -= bin_incr;
            *count += bin_incr;
        }
    }

    // Distribute remaining excess pixels one by one
    let mut remaining = excess as usize;
    let mut idx = 0;
    while remaining > 0 {
        let step = NUM_BINS.max(1);
        if histogram[idx] < clip_limit {
            histogram[idx] += 1;
            remaining -= 1;
        }
        idx = (idx + step) % NUM_BINS;
        if idx == 0 {
            break; // Safety valve
        }
    }
}

/// Create CDF lookup table from histogram
fn create_lut_from_histogram(histogram: &[u32; NUM_BINS], tile_pixels: u32) -> [u8; NUM_BINS] {
    let mut cdf = [0u32; NUM_BINS];
    cdf[0] = histogram[0];
    for i in 1..NUM_BINS {
        cdf[i] = cdf[i - 1] + histogram[i];
    }

    let mut lut = [0u8; NUM_BINS];
    let scale = 255.0 / tile_pixels as f32;

    for i in 0..NUM_BINS {
        lut[i] = ((cdf[i] as f32 * scale).round() as u32).min(255) as u8;
    }

    lut
}

/// CLAHE - Contrast Limited Adaptive Histogram Equalization
///
/// Parameters:
/// - input: grayscale image
/// - width, height: image dimensions
/// - tile_grid_x, tile_grid_y: number of tiles in x and y directions (typically 8x8)
/// - clip_limit: contrast limit (1.0 = no clipping, 2.0-4.0 typical for documents)
#[wasm_bindgen]
pub fn clahe(
    input: &[u8],
    width: usize,
    height: usize,
    tile_grid_x: usize,
    tile_grid_y: usize,
    clip_limit: f32,
) -> Vec<u8> {
    let size = width * height;
    let tile_width = width / tile_grid_x;
    let tile_height = height / tile_grid_y;
    let tile_pixels = (tile_width * tile_height) as u32;

    // Calculate actual clip limit based on tile size
    let actual_clip = if clip_limit > 0.0 {
        ((clip_limit * tile_pixels as f32) / NUM_BINS as f32).max(1.0) as u32
    } else {
        u32::MAX // No clipping
    };

    // Compute histogram and LUT for each tile
    let num_tiles = tile_grid_x * tile_grid_y;
    let mut tile_luts = vec![[0u8; NUM_BINS]; num_tiles];

    for ty in 0..tile_grid_y {
        for tx in 0..tile_grid_x {
            let tile_idx = ty * tile_grid_x + tx;

            // Compute histogram for this tile
            let mut histogram = [0u32; NUM_BINS];

            let y_start = ty * tile_height;
            let y_end = if ty == tile_grid_y - 1 { height } else { y_start + tile_height };
            let x_start = tx * tile_width;
            let x_end = if tx == tile_grid_x - 1 { width } else { x_start + tile_width };

            for y in y_start..y_end {
                for x in x_start..x_end {
                    let pixel = input[y * width + x];
                    histogram[pixel as usize] += 1;
                }
            }

            // Clip histogram
            if actual_clip < tile_pixels {
                clip_histogram(&mut histogram, actual_clip);
            }

            // Create LUT for this tile
            let actual_tile_pixels = (y_end - y_start) * (x_end - x_start);
            tile_luts[tile_idx] = create_lut_from_histogram(&histogram, actual_tile_pixels as u32);
        }
    }

    // Apply CLAHE with bilinear interpolation between tiles
    let mut output = vec![0u8; size];

    for y in 0..height {
        for x in 0..width {
            let idx = y * width + x;
            let pixel = input[idx] as usize;

            // Find which tiles this pixel belongs to (for interpolation)
            let tx_f = (x as f32 / tile_width as f32).min((tile_grid_x - 1) as f32);
            let ty_f = (y as f32 / tile_height as f32).min((tile_grid_y - 1) as f32);

            let tx0 = tx_f.floor() as usize;
            let ty0 = ty_f.floor() as usize;
            let tx1 = (tx0 + 1).min(tile_grid_x - 1);
            let ty1 = (ty0 + 1).min(tile_grid_y - 1);

            // Interpolation weights
            let wx = tx_f - tx0 as f32;
            let wy = ty_f - ty0 as f32;

            // Get LUT values from 4 surrounding tiles
            let v00 = tile_luts[ty0 * tile_grid_x + tx0][pixel] as f32;
            let v01 = tile_luts[ty0 * tile_grid_x + tx1][pixel] as f32;
            let v10 = tile_luts[ty1 * tile_grid_x + tx0][pixel] as f32;
            let v11 = tile_luts[ty1 * tile_grid_x + tx1][pixel] as f32;

            // Bilinear interpolation
            let v0 = v00 * (1.0 - wx) + v01 * wx;
            let v1 = v10 * (1.0 - wx) + v11 * wx;
            let result = v0 * (1.0 - wy) + v1 * wy;

            output[idx] = result.round().clamp(0.0, 255.0) as u8;
        }
    }

    output
}

/// Simple contrast stretch (normalization)
/// Stretches histogram to use full 0-255 range
#[wasm_bindgen]
pub fn contrast_stretch(input: &[u8], width: usize, height: usize) -> Vec<u8> {
    let size = width * height;

    // Find min and max values
    let mut min_val = 255u8;
    let mut max_val = 0u8;

    for &pixel in input.iter() {
        if pixel < min_val {
            min_val = pixel;
        }
        if pixel > max_val {
            max_val = pixel;
        }
    }

    // Avoid division by zero
    if max_val == min_val {
        return input.to_vec();
    }

    let range = (max_val - min_val) as f32;

    // Apply stretch
    let mut output = vec![0u8; size];
    for (i, &pixel) in input.iter().enumerate() {
        let normalized = ((pixel - min_val) as f32 / range * 255.0).round();
        output[i] = normalized.clamp(0.0, 255.0) as u8;
    }

    output
}

/// Percentile-based contrast stretch
/// More robust to outliers than simple min-max stretch
#[wasm_bindgen]
pub fn percentile_contrast_stretch(
    input: &[u8],
    width: usize,
    height: usize,
    low_percentile: f32,  // e.g., 1.0 for 1%
    high_percentile: f32, // e.g., 99.0 for 99%
) -> Vec<u8> {
    let size = width * height;

    // Compute histogram
    let mut histogram = [0u32; NUM_BINS];
    for &pixel in input.iter() {
        histogram[pixel as usize] += 1;
    }

    // Compute CDF
    let mut cdf = [0u32; NUM_BINS];
    cdf[0] = histogram[0];
    for i in 1..NUM_BINS {
        cdf[i] = cdf[i - 1] + histogram[i];
    }

    // Find percentile values
    let low_count = (size as f32 * low_percentile / 100.0) as u32;
    let high_count = (size as f32 * high_percentile / 100.0) as u32;

    let mut min_val = 0u8;
    let mut max_val = 255u8;

    for i in 0..NUM_BINS {
        if cdf[i] >= low_count && min_val == 0 {
            min_val = i as u8;
        }
        if cdf[i] >= high_count {
            max_val = i as u8;
            break;
        }
    }

    // Avoid division by zero
    if max_val <= min_val {
        return input.to_vec();
    }

    let range = (max_val - min_val) as f32;

    // Apply stretch
    let mut output = vec![0u8; size];
    for (i, &pixel) in input.iter().enumerate() {
        let clamped = pixel.clamp(min_val, max_val);
        let normalized = ((clamped - min_val) as f32 / range * 255.0).round();
        output[i] = normalized.clamp(0.0, 255.0) as u8;
    }

    output
}

/// Gamma correction for adjusting overall brightness
#[wasm_bindgen]
pub fn gamma_correction(input: &[u8], width: usize, height: usize, gamma: f32) -> Vec<u8> {
    let size = width * height;
    let inv_gamma = 1.0 / gamma;

    // Create lookup table
    let mut lut = [0u8; NUM_BINS];
    for i in 0..NUM_BINS {
        let normalized = i as f32 / 255.0;
        let corrected = normalized.powf(inv_gamma);
        lut[i] = (corrected * 255.0).round().clamp(0.0, 255.0) as u8;
    }

    // Apply correction
    let mut output = vec![0u8; size];
    for (i, &pixel) in input.iter().enumerate() {
        output[i] = lut[pixel as usize];
    }

    output
}

/// Illumination normalization using large-scale Gaussian
/// Removes low-frequency illumination variations
#[wasm_bindgen]
pub fn illumination_normalize(
    input: &[u8],
    width: usize,
    height: usize,
    sigma: f32,
) -> Vec<u8> {
    // Compute large-scale blur to estimate illumination
    let blurred = crate::blur(input, width, height,
        (sigma * 6.0).round() as usize | 1, // Ensure odd kernel size
        sigma);

    let size = width * height;
    let mut output = vec![0u8; size];

    // Divide original by blur to remove illumination
    for i in 0..size {
        let original = input[i] as f32;
        let illumination = blurred[i] as f32;

        if illumination > 1.0 {
            // Normalize: output = 128 * (original / illumination)
            // This centers the result around 128
            let normalized = 128.0 * original / illumination;
            output[i] = normalized.clamp(0.0, 255.0) as u8;
        } else {
            output[i] = input[i];
        }
    }

    output
}

/// Combined preprocessing for document images
/// Applies: illumination normalization -> CLAHE -> contrast stretch
#[wasm_bindgen]
pub fn preprocess_document(
    input: &[u8],
    width: usize,
    height: usize,
    clahe_clip: f32,
    clahe_grid: usize,
) -> Vec<u8> {
    // Step 1: Illumination normalization (remove uneven lighting)
    let illumination_sigma = (width.min(height) as f32) / 10.0;
    let normalized = illumination_normalize(input, width, height, illumination_sigma);

    // Step 2: CLAHE for local contrast enhancement
    let clahe_result = clahe(&normalized, width, height, clahe_grid, clahe_grid, clahe_clip);

    // Step 3: Percentile-based contrast stretch
    let final_result = percentile_contrast_stretch(&clahe_result, width, height, 1.0, 99.0);

    final_result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_histogram_equalization() {
        // Create a low-contrast image
        let mut input = vec![100u8; 100];
        for i in 50..100 {
            input[i] = 150;
        }

        let output = histogram_equalization(&input, 10, 10);

        // Output should have better contrast
        let min_out = *output.iter().min().unwrap();
        let max_out = *output.iter().max().unwrap();

        assert!(max_out - min_out > 150 - 100, "Contrast should be enhanced");
    }

    #[test]
    fn test_clahe() {
        // Create a simple test image
        let input = vec![128u8; 64 * 64];

        let output = clahe(&input, 64, 64, 8, 8, 2.0);

        // Output should be valid
        assert_eq!(output.len(), 64 * 64);
    }

    #[test]
    fn test_gamma_correction() {
        let input = vec![128u8; 100];

        // Gamma < 1 should brighten
        let brightened = gamma_correction(&input, 10, 10, 0.5);
        assert!(brightened[0] > 128);

        // Gamma > 1 should darken
        let darkened = gamma_correction(&input, 10, 10, 2.0);
        assert!(darkened[0] < 128);
    }
}
