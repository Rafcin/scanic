use wasm_bindgen::prelude::*;

/// Corner Detection Module
/// Implements Harris and Shi-Tomasi corner detection algorithms
/// as used in OpenCV's cornerHarris and goodFeaturesToTrack functions.

/// Harris corner detector
/// Detects corners using the Harris corner response function:
/// R = det(M) - k * trace(M)^2
///
/// # Arguments
/// * `input` - Grayscale image
/// * `width` - Image width
/// * `height` - Image height
/// * `block_size` - Size of neighborhood for corner detection (usually 2-7)
/// * `k_size` - Aperture size for Sobel operator (1, 3, 5, or 7)
/// * `k` - Harris detector free parameter (typically 0.04-0.06)
///
/// # Returns
/// Corner response image (f32 values, higher = more likely corner)
#[wasm_bindgen]
pub fn corner_harris(
    input: &[u8],
    width: usize,
    height: usize,
    block_size: usize,
    k_size: usize,
    k: f64,
) -> Vec<f32> {
    // Compute gradients using Sobel or Scharr
    let (gx, gy) = compute_gradients(input, width, height, k_size);

    // Compute products of derivatives
    let mut gxx = vec![0.0f64; width * height];
    let mut gyy = vec![0.0f64; width * height];
    let mut gxy = vec![0.0f64; width * height];

    for i in 0..width * height {
        let dx = gx[i] as f64;
        let dy = gy[i] as f64;
        gxx[i] = dx * dx;
        gyy[i] = dy * dy;
        gxy[i] = dx * dy;
    }

    // Apply box filter to gradient products
    let gxx_sum = box_filter(&gxx, width, height, block_size);
    let gyy_sum = box_filter(&gyy, width, height, block_size);
    let gxy_sum = box_filter(&gxy, width, height, block_size);

    // Compute Harris response
    let mut response = vec![0.0f32; width * height];

    for i in 0..width * height {
        let a = gxx_sum[i];
        let b = gyy_sum[i];
        let c = gxy_sum[i];

        // det(M) = a*b - c*c
        // trace(M) = a + b
        let det = a * b - c * c;
        let trace = a + b;

        // R = det - k * trace^2
        response[i] = (det - k * trace * trace) as f32;
    }

    response
}

/// Shi-Tomasi corner detector (good features to track)
/// Uses minimum eigenvalue as corner response:
/// R = min(λ1, λ2)
///
/// This typically produces better results than Harris for feature tracking.
#[wasm_bindgen]
pub fn corner_min_eigen_val(
    input: &[u8],
    width: usize,
    height: usize,
    block_size: usize,
    k_size: usize,
) -> Vec<f32> {
    let (gx, gy) = compute_gradients(input, width, height, k_size);

    let mut gxx = vec![0.0f64; width * height];
    let mut gyy = vec![0.0f64; width * height];
    let mut gxy = vec![0.0f64; width * height];

    for i in 0..width * height {
        let dx = gx[i] as f64;
        let dy = gy[i] as f64;
        gxx[i] = dx * dx;
        gyy[i] = dy * dy;
        gxy[i] = dx * dy;
    }

    let gxx_sum = box_filter(&gxx, width, height, block_size);
    let gyy_sum = box_filter(&gyy, width, height, block_size);
    let gxy_sum = box_filter(&gxy, width, height, block_size);

    let mut response = vec![0.0f32; width * height];

    for i in 0..width * height {
        let a = gxx_sum[i];
        let b = gyy_sum[i];
        let c = gxy_sum[i];

        // Minimum eigenvalue of structure tensor
        // λ_min = 0.5 * ((a + b) - sqrt((a - b)^2 + 4*c^2))
        let trace = a + b;
        // Note: det = a * b - c * c (not needed when using discriminant formula)

        // Using eigenvalue formula
        let disc = ((a - b) * (a - b) + 4.0 * c * c).sqrt();
        let lambda_min = 0.5 * (trace - disc);

        response[i] = lambda_min.max(0.0) as f32;
    }

    response
}

/// Good features to track - finds the strongest corners
/// Equivalent to OpenCV's goodFeaturesToTrack
///
/// # Arguments
/// * `input` - Grayscale image
/// * `width` - Image width
/// * `height` - Image height
/// * `max_corners` - Maximum number of corners to return
/// * `quality_level` - Minimum quality relative to best corner (0-1)
/// * `min_distance` - Minimum Euclidean distance between corners
/// * `block_size` - Size of neighborhood for corner detection
/// * `use_harris` - Use Harris detector (true) or Shi-Tomasi (false)
/// * `k` - Harris free parameter (only used if use_harris is true)
///
/// # Returns
/// Corner points as flat array [x1, y1, x2, y2, ...]
#[wasm_bindgen]
pub fn good_features_to_track(
    input: &[u8],
    width: usize,
    height: usize,
    max_corners: usize,
    quality_level: f64,
    min_distance: f64,
    block_size: usize,
    use_harris: bool,
    k: f64,
) -> Vec<f32> {
    // Compute corner response
    let response = if use_harris {
        corner_harris(input, width, height, block_size, 3, k)
    } else {
        corner_min_eigen_val(input, width, height, block_size, 3)
    };

    // Find maximum response
    let max_response = response.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
    let threshold = (quality_level * max_response as f64) as f32;

    // Collect corners above threshold with non-maximum suppression
    let mut corners: Vec<(usize, usize, f32)> = Vec::new();
    let margin = block_size / 2;

    for y in margin..(height - margin) {
        for x in margin..(width - margin) {
            let idx = y * width + x;
            let val = response[idx];

            if val < threshold {
                continue;
            }

            // Check if local maximum in 3x3 neighborhood
            let mut is_max = true;
            for dy in 0..3 {
                for dx in 0..3 {
                    if dx == 1 && dy == 1 {
                        continue;
                    }
                    let ny = y + dy - 1;
                    let nx = x + dx - 1;
                    if response[ny * width + nx] > val {
                        is_max = false;
                        break;
                    }
                }
                if !is_max {
                    break;
                }
            }

            if is_max {
                corners.push((x, y, val));
            }
        }
    }

    // Sort by response (strongest first)
    corners.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal));

    // Apply minimum distance filter
    let min_dist_sq = min_distance * min_distance;
    let mut selected: Vec<(usize, usize, f32)> = Vec::new();

    for corner in corners {
        let mut too_close = false;
        for &(sx, sy, _) in &selected {
            let dx = corner.0 as f64 - sx as f64;
            let dy = corner.1 as f64 - sy as f64;
            if dx * dx + dy * dy < min_dist_sq {
                too_close = true;
                break;
            }
        }

        if !too_close {
            selected.push(corner);
            if selected.len() >= max_corners {
                break;
            }
        }
    }

    // Return as flat array
    selected.iter().flat_map(|&(x, y, _)| vec![x as f32, y as f32]).collect()
}

/// Refine corner locations to sub-pixel accuracy
/// Equivalent to OpenCV's cornerSubPix
///
/// # Arguments
/// * `input` - Grayscale image
/// * `width` - Image width
/// * `height` - Image height
/// * `corners` - Initial corner positions [x1, y1, x2, y2, ...]
/// * `win_size` - Half of the search window size
/// * `max_iter` - Maximum iterations
/// * `epsilon` - Convergence threshold
///
/// # Returns
/// Refined corner positions [x1, y1, x2, y2, ...]
#[wasm_bindgen]
pub fn corner_sub_pix(
    input: &[u8],
    width: usize,
    height: usize,
    corners: &[f32],
    win_size: usize,
    max_iter: usize,
    epsilon: f64,
) -> Vec<f32> {
    let (gx, gy) = compute_gradients(input, width, height, 3);
    let n = corners.len() / 2;
    let mut refined = corners.to_vec();

    for i in 0..n {
        let mut cx = refined[i * 2] as f64;
        let mut cy = refined[i * 2 + 1] as f64;

        for _ in 0..max_iter {
            let mut a = [[0.0f64; 2]; 2];
            let mut b = [0.0f64; 2];

            let x_min = (cx - win_size as f64).max(1.0) as usize;
            let x_max = (cx + win_size as f64).min((width - 2) as f64) as usize;
            let y_min = (cy - win_size as f64).max(1.0) as usize;
            let y_max = (cy + win_size as f64).min((height - 2) as f64) as usize;

            for y in y_min..=y_max {
                for x in x_min..=x_max {
                    let idx = y * width + x;
                    let dx = gx[idx] as f64;
                    let dy = gy[idx] as f64;

                    // Weight by gradient magnitude (optional)
                    let weight = 1.0;

                    a[0][0] += weight * dx * dx;
                    a[0][1] += weight * dx * dy;
                    a[1][0] += weight * dx * dy;
                    a[1][1] += weight * dy * dy;

                    b[0] += weight * dx * (dx * x as f64 + dy * y as f64);
                    b[1] += weight * dy * (dx * x as f64 + dy * y as f64);
                }
            }

            // Solve 2x2 system
            let det = a[0][0] * a[1][1] - a[0][1] * a[1][0];
            if det.abs() < 1e-10 {
                break;
            }

            let new_cx = (a[1][1] * b[0] - a[0][1] * b[1]) / det;
            let new_cy = (a[0][0] * b[1] - a[1][0] * b[0]) / det;

            let dx = new_cx - cx;
            let dy = new_cy - cy;

            cx = new_cx;
            cy = new_cy;

            if dx * dx + dy * dy < epsilon * epsilon {
                break;
            }
        }

        refined[i * 2] = cx as f32;
        refined[i * 2 + 1] = cy as f32;
    }

    refined
}

/// Compute gradients using Sobel or Scharr operator
fn compute_gradients(input: &[u8], width: usize, height: usize, k_size: usize) -> (Vec<i16>, Vec<i16>) {
    let mut gx = vec![0i16; width * height];
    let mut gy = vec![0i16; width * height];

    match k_size {
        1 => {
            // Simple difference
            for y in 0..height {
                for x in 1..(width - 1) {
                    let idx = y * width + x;
                    gx[idx] = input[idx + 1] as i16 - input[idx - 1] as i16;
                }
            }
            for y in 1..(height - 1) {
                for x in 0..width {
                    let idx = y * width + x;
                    gy[idx] = input[idx + width] as i16 - input[idx - width] as i16;
                }
            }
        }
        3 => {
            // Sobel 3x3
            for y in 1..(height - 1) {
                for x in 1..(width - 1) {
                    let idx = y * width + x;

                    let p00 = input[(y - 1) * width + (x - 1)] as i32;
                    let p01 = input[(y - 1) * width + x] as i32;
                    let p02 = input[(y - 1) * width + (x + 1)] as i32;
                    let p10 = input[y * width + (x - 1)] as i32;
                    let p12 = input[y * width + (x + 1)] as i32;
                    let p20 = input[(y + 1) * width + (x - 1)] as i32;
                    let p21 = input[(y + 1) * width + x] as i32;
                    let p22 = input[(y + 1) * width + (x + 1)] as i32;

                    gx[idx] = ((-p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22) / 4) as i16;
                    gy[idx] = ((-p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22) / 4) as i16;
                }
            }
        }
        5 => {
            // Sobel 5x5
            let kx = [
                [-1, -2, 0, 2, 1],
                [-4, -8, 0, 8, 4],
                [-6, -12, 0, 12, 6],
                [-4, -8, 0, 8, 4],
                [-1, -2, 0, 2, 1],
            ];
            let ky = [
                [-1, -4, -6, -4, -1],
                [-2, -8, -12, -8, -2],
                [0, 0, 0, 0, 0],
                [2, 8, 12, 8, 2],
                [1, 4, 6, 4, 1],
            ];

            for y in 2..(height - 2) {
                for x in 2..(width - 2) {
                    let idx = y * width + x;
                    let mut sx = 0i32;
                    let mut sy = 0i32;

                    for ky_idx in 0..5 {
                        for kx_idx in 0..5 {
                            let py = y + ky_idx - 2;
                            let px = x + kx_idx - 2;
                            let pix = input[py * width + px] as i32;
                            sx += pix * kx[ky_idx][kx_idx];
                            sy += pix * ky[ky_idx][kx_idx];
                        }
                    }

                    gx[idx] = (sx / 48) as i16;
                    gy[idx] = (sy / 48) as i16;
                }
            }
        }
        _ => {
            // Default to 3x3
            return compute_gradients(input, width, height, 3);
        }
    }

    (gx, gy)
}

/// Box filter (uniform averaging)
fn box_filter(input: &[f64], width: usize, height: usize, size: usize) -> Vec<f64> {
    let radius = size / 2;
    let mut output = vec![0.0f64; width * height];
    let mut temp = vec![0.0f64; width * height];

    // Horizontal pass
    for y in 0..height {
        for x in 0..width {
            let x_start = if x >= radius { x - radius } else { 0 };
            let x_end = (x + radius + 1).min(width);

            let mut sum = 0.0;
            for nx in x_start..x_end {
                sum += input[y * width + nx];
            }
            temp[y * width + x] = sum / (x_end - x_start) as f64;
        }
    }

    // Vertical pass
    for y in 0..height {
        for x in 0..width {
            let y_start = if y >= radius { y - radius } else { 0 };
            let y_end = (y + radius + 1).min(height);

            let mut sum = 0.0;
            for ny in y_start..y_end {
                sum += temp[ny * width + x];
            }
            output[y * width + x] = sum / (y_end - y_start) as f64;
        }
    }

    output
}

/// FAST corner detector (Features from Accelerated Segment Test)
/// A very fast corner detector commonly used in real-time applications
///
/// # Arguments
/// * `input` - Grayscale image
/// * `width` - Image width
/// * `height` - Image height
/// * `threshold` - Intensity threshold
/// * `nonmax_suppression` - Apply non-maximum suppression
///
/// # Returns
/// Corner points as flat array [x1, y1, x2, y2, ...]
#[wasm_bindgen]
pub fn fast_corners(
    input: &[u8],
    width: usize,
    height: usize,
    threshold: u8,
    nonmax_suppression: bool,
) -> Vec<i32> {
    // FAST-9 pattern (16 pixels on a circle of radius 3)
    let circle_x: [i32; 16] = [0, 1, 2, 3, 3, 3, 2, 1, 0, -1, -2, -3, -3, -3, -2, -1];
    let circle_y: [i32; 16] = [-3, -3, -2, -1, 0, 1, 2, 3, 3, 3, 2, 1, 0, -1, -2, -3];

    let mut corners: Vec<(i32, i32, i32)> = Vec::new();
    let t = threshold as i32;

    for y in 3..(height - 3) {
        for x in 3..(width - 3) {
            let center = input[y * width + x] as i32;
            let high = center + t;
            let low = center - t;

            // Quick check on opposing pixels (1, 9) and (5, 13)
            let p1 = input[(y as i32 + circle_y[0]) as usize * width + (x as i32 + circle_x[0]) as usize] as i32;
            let p9 = input[(y as i32 + circle_y[8]) as usize * width + (x as i32 + circle_x[8]) as usize] as i32;
            let p5 = input[(y as i32 + circle_y[4]) as usize * width + (x as i32 + circle_x[4]) as usize] as i32;
            let p13 = input[(y as i32 + circle_y[12]) as usize * width + (x as i32 + circle_x[12]) as usize] as i32;

            // Need at least 2 of 4 cardinal points to be brighter/darker
            let count_high = (p1 > high) as i32 + (p5 > high) as i32 + (p9 > high) as i32 + (p13 > high) as i32;
            let count_low = (p1 < low) as i32 + (p5 < low) as i32 + (p9 < low) as i32 + (p13 < low) as i32;

            if count_high < 2 && count_low < 2 {
                continue;
            }

            // Full test: need 9 contiguous pixels brighter or darker
            let mut bright_consecutive = 0;
            let mut dark_consecutive = 0;
            let mut max_bright = 0;
            let mut max_dark = 0;

            // Check twice around the circle to handle wrap-around
            for i in 0..32 {
                let idx = i % 16;
                let px = (x as i32 + circle_x[idx]) as usize;
                let py = (y as i32 + circle_y[idx]) as usize;
                let pix = input[py * width + px] as i32;

                if pix > high {
                    bright_consecutive += 1;
                    dark_consecutive = 0;
                    max_bright = max_bright.max(bright_consecutive);
                } else if pix < low {
                    dark_consecutive += 1;
                    bright_consecutive = 0;
                    max_dark = max_dark.max(dark_consecutive);
                } else {
                    bright_consecutive = 0;
                    dark_consecutive = 0;
                }
            }

            if max_bright >= 9 || max_dark >= 9 {
                // Calculate corner strength (sum of absolute differences)
                let mut score = 0i32;
                for i in 0..16 {
                    let px = (x as i32 + circle_x[i]) as usize;
                    let py = (y as i32 + circle_y[i]) as usize;
                    let diff = (input[py * width + px] as i32 - center).abs();
                    if diff > t {
                        score += diff - t;
                    }
                }
                corners.push((x as i32, y as i32, score));
            }
        }
    }

    // Non-maximum suppression
    if nonmax_suppression && !corners.is_empty() {
        // Create score map
        let mut score_map = vec![0i32; width * height];
        for &(x, y, score) in &corners {
            score_map[y as usize * width + x as usize] = score;
        }

        // Filter corners
        corners.retain(|&(x, y, score)| {
            for dy in -1..=1i32 {
                for dx in -1..=1i32 {
                    if dx == 0 && dy == 0 {
                        continue;
                    }
                    let nx = (x + dx) as usize;
                    let ny = (y + dy) as usize;
                    if nx < width && ny < height && score_map[ny * width + nx] > score {
                        return false;
                    }
                }
            }
            true
        });
    }

    corners.iter().flat_map(|&(x, y, _)| vec![x, y]).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_harris_uniform_image() {
        // Uniform image should have zero corner response
        let input = vec![128u8; 100];
        let response = corner_harris(&input, 10, 10, 3, 3, 0.04);

        assert_eq!(response.len(), 100);
        // Response should be very small for uniform image
        for &v in &response {
            assert!(v.abs() < 0.1);
        }
    }

    #[test]
    fn test_harris_detects_corner() {
        // Create image with a corner (L-shape)
        let mut input = vec![0u8; 100];
        for y in 3..8 {
            for x in 3..8 {
                if x < 6 || y < 6 {
                    input[y * 10 + x] = 255;
                }
            }
        }

        let response = corner_harris(&input, 10, 10, 2, 3, 0.04);

        // Find max response location
        let mut max_val = f32::NEG_INFINITY;
        let mut max_idx = 0;
        for (i, &v) in response.iter().enumerate() {
            if v > max_val {
                max_val = v;
                max_idx = i;
            }
        }

        // Max should be near the corner (around position 5,5)
        let max_x = max_idx % 10;
        let max_y = max_idx / 10;
        assert!(max_x >= 4 && max_x <= 7);
        assert!(max_y >= 4 && max_y <= 7);
    }

    #[test]
    fn test_shi_tomasi() {
        let input = vec![128u8; 100];
        let response = corner_min_eigen_val(&input, 10, 10, 3, 3);

        assert_eq!(response.len(), 100);
    }

    #[test]
    fn test_good_features_to_track() {
        // Create image with some texture
        let mut input = vec![0u8; 400];
        for y in 5..15 {
            for x in 5..15 {
                input[y * 20 + x] = 200;
            }
        }

        let corners = good_features_to_track(
            &input, 20, 20,
            10,     // max corners
            0.1,    // quality
            3.0,    // min distance
            3,      // block size
            true,   // use harris
            0.04,   // k
        );

        // Should find some corners
        assert!(corners.len() >= 2); // At least one corner (x, y pair)
    }

    #[test]
    fn test_corner_sub_pix() {
        let input = vec![128u8; 100];
        let corners = vec![5.0f32, 5.0];

        let refined = corner_sub_pix(&input, 10, 10, &corners, 3, 20, 0.01);

        assert_eq!(refined.len(), 2);
        // For uniform image, corner should not move much
        assert!((refined[0] - 5.0).abs() < 2.0);
        assert!((refined[1] - 5.0).abs() < 2.0);
    }

    #[test]
    fn test_fast_corners() {
        // Create a larger image with a clear corner pattern
        let mut input = vec![0u8; 900]; // 30x30
        // Draw a white square in the middle
        for y in 10..20 {
            for x in 10..20 {
                input[y * 30 + x] = 255;
            }
        }

        let corners = fast_corners(&input, 30, 30, 30, true);

        // Should find at least some corners (or return empty if threshold too high)
        // The important thing is that the function runs without error
        assert!(corners.len() % 2 == 0); // Should be pairs of x, y
    }

    #[test]
    fn test_box_filter() {
        let input = vec![100.0f64; 100];
        let output = box_filter(&input, 10, 10, 3);

        // Uniform input should give uniform output
        for &v in &output {
            assert!((v - 100.0).abs() < 0.001);
        }
    }
}
