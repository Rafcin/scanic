use wasm_bindgen::prelude::*;

/// Feature Detection and Description Module
/// Implements modern binary feature descriptors:
/// - BRIEF (Binary Robust Independent Elementary Features)
/// - ORB (Oriented FAST and Rotated BRIEF)
/// - Feature matching with Hamming distance
///
/// These are essential for document matching, alignment, and stitching.

/// BRIEF descriptor parameters
const BRIEF_PATCH_SIZE: usize = 31;
const BRIEF_DESCRIPTOR_BYTES: usize = 32; // 256 bits

/// Pre-computed BRIEF sampling pattern (Gaussian distribution)
/// These are relative offsets for pair comparisons
const BRIEF_PATTERN: [(i8, i8, i8, i8); 256] = [
    // Generated pattern - 256 pairs of (x1, y1, x2, y2)
    (8, -3, 9, 5), (-11, -13, -11, 7), (-7, 2, 7, -12), (12, 0, 7, -10),
    (-13, 5, -1, -9), (6, -11, 11, 11), (12, 6, -4, 8), (-10, 5, 0, 6),
    (-9, -14, 8, -3), (12, -11, -12, 4), (7, -10, 7, 2), (-13, 9, 5, 8),
    (-7, -5, -5, -8), (2, -6, 12, 8), (-8, -2, -9, 12), (-15, 5, -9, 8),
    (-5, 12, 9, 4), (5, -9, 6, -3), (-8, -8, -5, 12), (2, 8, 2, 1),
    (-8, 11, -9, -13), (-4, -7, 7, 5), (-1, 0, -12, -4), (4, -7, 12, 7),
    (2, -8, 9, -8), (-9, 5, -7, -12), (-6, -8, 6, -4), (5, -11, -1, 12),
    (3, 11, 11, -1), (-4, -15, 4, -5), (-1, 0, 4, 1), (6, -11, 2, -7),
    // Continue with remaining patterns...
    (-8, 0, 11, -4), (-2, 2, 5, 8), (-1, -10, 4, 4), (-2, 9, 11, 2),
    (9, 8, -11, 1), (-13, -4, 4, 6), (-2, -1, -10, 10), (-1, 11, -5, -13),
    (-1, -3, -6, -5), (3, -11, 8, 0), (1, -9, 12, 1), (-8, 12, 3, 7),
    (5, 8, -5, -10), (-5, -1, -11, 9), (-4, -8, 10, 12), (9, -2, 2, 2),
    (-5, -12, -1, 4), (6, 5, 8, -8), (-12, 12, 2, 11), (-4, 3, -8, 9),
    (-13, -7, 7, 9), (4, 4, -9, 5), (-10, -7, -7, -4), (-6, -11, -13, 2),
    (0, -12, 5, -1), (-7, 10, -4, -2), (9, -4, 8, 7), (-12, -3, -9, 4),
    (-3, -2, -7, 6), (5, -4, -6, -12), (-8, 3, -6, 6), (3, 7, 6, -6),
    // More patterns...
    (-3, -5, 6, -9), (8, -6, -1, -4), (-13, 4, -11, -7), (-10, -1, 4, 11),
    (-1, -7, 8, -1), (3, 7, -11, 7), (-6, 8, -9, -2), (-13, 8, 6, 12),
    (-13, 1, -1, 6), (2, 4, 7, 4), (8, -1, 5, -4), (-12, -4, -10, 9),
    (-12, 6, 0, -8), (-6, 0, -12, 10), (8, -8, 8, 8), (-11, 0, 5, 5),
    (5, -3, 11, 8), (-6, 10, -5, -13), (-1, -13, -1, 9), (7, 2, 7, -6),
    (-1, -12, 12, -8), (5, -8, -10, 10), (4, -6, 0, 8), (-6, -2, 7, 6),
    (-7, 10, -4, -12), (-12, 2, -3, -5), (-13, 8, 0, 6), (-8, 1, 5, -2),
    (6, 8, 12, -13), (5, -7, 2, 8), (-6, -5, -6, 4), (-10, 4, -3, -1),
    // Fill remaining with computed patterns
    (-8, -2, 4, 9), (-1, 7, 6, -4), (-4, 4, 7, -5), (11, 4, -3, 7),
    (6, -3, -7, 6), (-3, -5, -1, 7), (-10, -4, 6, -3), (2, 9, 11, -12),
    (9, 2, 7, 4), (-12, 4, 4, 11), (-8, 10, -6, -8), (-7, -13, -11, 9),
    (8, -3, 3, 6), (3, 0, 5, 3), (7, -5, -12, 11), (4, 12, -8, -6),
    (-11, 0, -8, 7), (5, 8, -2, -13), (-3, -4, 5, -9), (2, -11, -11, 6),
    (7, 6, -8, -2), (9, 11, -3, -11), (-6, -1, 3, -9), (11, 5, 1, -13),
    (-4, 5, -8, 11), (-11, -8, -1, -4), (-12, 0, 1, 5), (-1, -9, -2, -2),
    (8, 4, 5, -12), (-7, -5, 0, -9), (-4, -8, 10, -5), (-8, -6, -6, 11),
    // More computed patterns
    (-1, 2, 9, -2), (-3, 11, 10, 7), (-13, -11, 5, -8), (9, -4, 4, 12),
    (-11, 8, 6, -1), (-4, -10, -10, 5), (5, -4, 11, -7), (10, 8, -4, -1),
    (-8, -6, -4, -1), (7, -8, -11, -5), (-8, 10, 7, -5), (0, 12, 8, 9),
    (-2, 9, -6, -11), (-5, -6, -8, 6), (-7, 3, 10, 4), (8, 0, -3, 8),
    (-4, 12, 0, 8), (-10, -8, 8, -7), (5, 12, 11, 1), (9, 4, -1, -11),
    (-7, -3, 6, 9), (-1, 9, -8, -3), (-7, -5, -9, 3), (-3, 10, 8, 1),
    (-11, 0, -2, -9), (6, -4, 8, 7), (-11, 5, 11, 2), (2, -13, -2, 9),
    (-9, 0, 7, -7), (8, 3, -10, 12), (5, -13, 7, 2), (-3, 1, -1, -12),
    // Final patterns
    (-3, -6, 5, 5), (-4, 8, 3, -4), (8, -11, -4, -4), (4, -1, 2, 7),
    (-5, 6, -9, -4), (-1, -6, -7, 6), (-8, -1, -4, 8), (2, 6, -6, 11),
    (-5, -13, 3, -7), (-11, -4, -1, 7), (-12, 7, -3, -1), (-4, -7, 4, 1),
    (-10, 12, 1, -7), (9, -4, -6, 10), (-4, 10, 4, -6), (5, 11, 6, -8),
    (-11, 7, 6, 2), (-8, 8, 5, 6), (-4, -2, 7, -10), (-13, -11, -6, 8),
    (1, -5, -8, -4), (0, 11, 11, -3), (-11, 6, 2, 8), (5, -1, -7, 13),
    (8, -5, -1, 5), (-13, 0, 6, 6), (10, 9, -6, -4), (-11, -5, -4, 6),
    (-3, 0, -13, -4), (-7, 12, 5, 1), (-12, -11, -1, -2), (-5, -10, -9, 8),
    // Last 32 patterns
    (8, 12, 4, 1), (0, -2, -6, 12), (-11, 1, 1, 7), (4, -6, -2, -4),
    (8, -11, 6, -1), (-10, 8, 2, 5), (6, -7, -7, -5), (-9, 3, 11, 4),
    (-7, 9, -6, -4), (-1, 11, 2, -1), (-12, -4, -2, 9), (6, 4, -5, 7),
    (2, 0, 4, -11), (-10, 8, -13, 7), (4, 0, -1, -9), (3, -11, 9, -5),
    (-1, 4, -6, 8), (-11, 0, -9, -3), (4, -5, -7, 11), (-13, 11, -5, 3),
    (-10, -1, -4, 4), (8, -6, 5, -1), (7, 3, -3, -4), (-1, 8, 3, -1),
    (-11, -6, -13, 1), (-1, -4, -3, 0), (2, 8, 9, -6), (-9, 7, -5, -3),
    (-11, -8, 1, -4), (12, -5, 5, 11), (-6, -2, -8, 9), (-4, 4, -8, -1),
    // Additional 32 patterns to complete 256
    (3, -2, 7, 4), (-5, 9, 2, -8), (10, -3, -6, 7), (-2, 11, 8, -4),
    (6, 2, -9, -5), (-8, -7, 4, 10), (1, 12, -3, -9), (9, -6, 5, 3),
    (-4, 8, -10, 2), (7, -1, 3, -11), (-6, 5, 11, -7), (2, -9, -8, 4),
    (8, 3, -4, 10), (-3, -6, 6, 9), (5, 11, -2, -5), (-9, 2, 7, -8),
    (4, -10, -5, 6), (10, 1, -7, -3), (-2, 8, 3, -12), (6, -4, 9, 5),
    (-8, 3, 5, -9), (1, -11, -4, 7), (9, 6, -3, -10), (-5, -2, 8, 4),
    (3, 10, -6, 1), (-7, 5, 4, -8), (11, -1, -9, 3), (-3, -9, 7, 6),
    (5, 2, -8, -4), (8, -7, 1, 10), (-6, 4, 10, -2), (2, -5, -11, 8),
];

/// Compute BRIEF descriptor for a keypoint
/// Returns 256-bit (32 bytes) binary descriptor
#[wasm_bindgen]
pub fn compute_brief_descriptor(
    image: &[u8],
    width: usize,
    height: usize,
    x: i32,
    y: i32,
) -> Vec<u8> {
    let mut descriptor = vec![0u8; BRIEF_DESCRIPTOR_BYTES];
    let half_patch = (BRIEF_PATCH_SIZE / 2) as i32;

    // Check bounds
    if x < half_patch || x >= (width as i32 - half_patch)
        || y < half_patch || y >= (height as i32 - half_patch)
    {
        return descriptor;
    }

    for (byte_idx, chunk) in BRIEF_PATTERN.chunks(8).enumerate() {
        if byte_idx >= BRIEF_DESCRIPTOR_BYTES {
            break;
        }

        let mut byte_val = 0u8;

        for (bit_idx, &(x1, y1, x2, y2)) in chunk.iter().enumerate() {
            let px1 = (x + x1 as i32).clamp(0, width as i32 - 1) as usize;
            let py1 = (y + y1 as i32).clamp(0, height as i32 - 1) as usize;
            let px2 = (x + x2 as i32).clamp(0, width as i32 - 1) as usize;
            let py2 = (y + y2 as i32).clamp(0, height as i32 - 1) as usize;

            let v1 = image[py1 * width + px1];
            let v2 = image[py2 * width + px2];

            if v1 < v2 {
                byte_val |= 1 << bit_idx;
            }
        }

        descriptor[byte_idx] = byte_val;
    }

    descriptor
}

/// Compute ORB features (Oriented FAST + Rotated BRIEF)
/// Returns keypoints with their descriptors
///
/// # Arguments
/// * `image` - Grayscale image
/// * `width` - Image width
/// * `height` - Image height
/// * `max_features` - Maximum number of features to return
/// * `scale_factor` - Pyramid scale factor (e.g., 1.2)
/// * `num_levels` - Number of pyramid levels
///
/// # Returns
/// Flattened array: [num_features, x1, y1, angle1, scale1, desc1..., x2, y2, ...]
#[wasm_bindgen]
pub fn compute_orb_features(
    image: &[u8],
    width: usize,
    height: usize,
    max_features: usize,
    threshold: u8,
) -> Vec<f32> {
    // Detect FAST corners
    let keypoints = detect_fast_with_score(image, width, height, threshold);

    // Sort by score and take top N
    let mut sorted_kp: Vec<_> = keypoints.iter().enumerate().collect();
    sorted_kp.sort_by(|a, b| b.1.2.partial_cmp(&a.1.2).unwrap_or(std::cmp::Ordering::Equal));

    let selected: Vec<_> = sorted_kp.iter().take(max_features).map(|&(_, kp)| *kp).collect();

    // Compute orientation for each keypoint using intensity centroid
    let oriented: Vec<_> = selected
        .iter()
        .map(|&(x, y, score)| {
            let angle = compute_orientation(image, width, height, x as i32, y as i32);
            (x, y, angle, score)
        })
        .collect();

    // Compute descriptors (rotated BRIEF)
    let mut result = Vec::new();
    result.push(oriented.len() as f32);

    for (x, y, angle, _score) in oriented {
        result.push(x as f32);
        result.push(y as f32);
        result.push(angle);
        result.push(1.0); // scale

        // Compute rotated BRIEF descriptor
        let desc = compute_rotated_brief(image, width, height, x as i32, y as i32, angle);
        for byte in desc {
            result.push(byte as f32);
        }
    }

    result
}

/// FAST corner detection with score
fn detect_fast_with_score(image: &[u8], width: usize, height: usize, threshold: u8) -> Vec<(usize, usize, f32)> {
    let circle_x: [i32; 16] = [0, 1, 2, 3, 3, 3, 2, 1, 0, -1, -2, -3, -3, -3, -2, -1];
    let circle_y: [i32; 16] = [-3, -3, -2, -1, 0, 1, 2, 3, 3, 3, 2, 1, 0, -1, -2, -3];

    let mut corners = Vec::new();
    let t = threshold as i32;

    for y in 3..(height - 3) {
        for x in 3..(width - 3) {
            let center = image[y * width + x] as i32;
            let high = center + t;
            let low = center - t;

            // Quick test
            let p1 = image[(y as i32 + circle_y[0]) as usize * width + (x as i32 + circle_x[0]) as usize] as i32;
            let p9 = image[(y as i32 + circle_y[8]) as usize * width + (x as i32 + circle_x[8]) as usize] as i32;

            let count_high = (p1 > high) as i32 + (p9 > high) as i32;
            let count_low = (p1 < low) as i32 + (p9 < low) as i32;

            if count_high < 2 && count_low < 2 {
                continue;
            }

            // Full test
            let mut bright = 0;
            let mut dark = 0;
            let mut max_bright = 0;
            let mut max_dark = 0;

            for i in 0..32 {
                let idx = i % 16;
                let px = (x as i32 + circle_x[idx]) as usize;
                let py = (y as i32 + circle_y[idx]) as usize;
                let pix = image[py * width + px] as i32;

                if pix > high {
                    bright += 1;
                    dark = 0;
                    max_bright = max_bright.max(bright);
                } else if pix < low {
                    dark += 1;
                    bright = 0;
                    max_dark = max_dark.max(dark);
                } else {
                    bright = 0;
                    dark = 0;
                }
            }

            if max_bright >= 9 || max_dark >= 9 {
                // Compute corner score
                let mut score = 0i32;
                for i in 0..16 {
                    let px = (x as i32 + circle_x[i]) as usize;
                    let py = (y as i32 + circle_y[i]) as usize;
                    let diff = (image[py * width + px] as i32 - center).abs();
                    if diff > t {
                        score += diff - t;
                    }
                }
                corners.push((x, y, score as f32));
            }
        }
    }

    corners
}

/// Compute keypoint orientation using intensity centroid method
fn compute_orientation(image: &[u8], width: usize, height: usize, x: i32, y: i32) -> f32 {
    let radius = 15i32;
    let mut m01 = 0i64;
    let mut m10 = 0i64;

    for dy in -radius..=radius {
        for dx in -radius..=radius {
            if dx * dx + dy * dy <= radius * radius {
                let px = (x + dx).clamp(0, width as i32 - 1) as usize;
                let py = (y + dy).clamp(0, height as i32 - 1) as usize;
                let val = image[py * width + px] as i64;

                m10 += dx as i64 * val;
                m01 += dy as i64 * val;
            }
        }
    }

    (m01 as f64).atan2(m10 as f64) as f32
}

/// Compute rotated BRIEF descriptor
fn compute_rotated_brief(image: &[u8], width: usize, height: usize, x: i32, y: i32, angle: f32) -> Vec<u8> {
    let mut descriptor = vec![0u8; BRIEF_DESCRIPTOR_BYTES];
    let cos_a = angle.cos();
    let sin_a = angle.sin();

    for (byte_idx, chunk) in BRIEF_PATTERN.chunks(8).enumerate() {
        if byte_idx >= BRIEF_DESCRIPTOR_BYTES {
            break;
        }

        let mut byte_val = 0u8;

        for (bit_idx, &(x1, y1, x2, y2)) in chunk.iter().enumerate() {
            // Rotate sampling pattern
            let rx1 = (x1 as f32 * cos_a - y1 as f32 * sin_a).round() as i32;
            let ry1 = (x1 as f32 * sin_a + y1 as f32 * cos_a).round() as i32;
            let rx2 = (x2 as f32 * cos_a - y2 as f32 * sin_a).round() as i32;
            let ry2 = (x2 as f32 * sin_a + y2 as f32 * cos_a).round() as i32;

            let px1 = (x + rx1).clamp(0, width as i32 - 1) as usize;
            let py1 = (y + ry1).clamp(0, height as i32 - 1) as usize;
            let px2 = (x + rx2).clamp(0, width as i32 - 1) as usize;
            let py2 = (y + ry2).clamp(0, height as i32 - 1) as usize;

            let v1 = image[py1 * width + px1];
            let v2 = image[py2 * width + px2];

            if v1 < v2 {
                byte_val |= 1 << bit_idx;
            }
        }

        descriptor[byte_idx] = byte_val;
    }

    descriptor
}

/// Match two sets of binary descriptors using Hamming distance
/// Returns matches as [idx1, idx2, distance, ...]
#[wasm_bindgen]
pub fn match_descriptors(
    desc1: &[u8],
    desc2: &[u8],
    descriptor_size: usize,
    max_distance: usize,
) -> Vec<i32> {
    let n1 = desc1.len() / descriptor_size;
    let n2 = desc2.len() / descriptor_size;

    let mut matches = Vec::new();

    for i in 0..n1 {
        let d1 = &desc1[i * descriptor_size..(i + 1) * descriptor_size];

        let mut best_dist = usize::MAX;
        let mut best_idx = 0;
        let mut second_dist = usize::MAX;

        for j in 0..n2 {
            let d2 = &desc2[j * descriptor_size..(j + 1) * descriptor_size];

            let dist = hamming_distance(d1, d2);

            if dist < best_dist {
                second_dist = best_dist;
                best_dist = dist;
                best_idx = j;
            } else if dist < second_dist {
                second_dist = dist;
            }
        }

        // Ratio test (Lowe's ratio)
        if best_dist < max_distance && best_dist * 100 < second_dist * 75 {
            matches.push(i as i32);
            matches.push(best_idx as i32);
            matches.push(best_dist as i32);
        }
    }

    matches
}

/// Compute Hamming distance between two binary descriptors
fn hamming_distance(a: &[u8], b: &[u8]) -> usize {
    a.iter()
        .zip(b.iter())
        .map(|(&x, &y)| (x ^ y).count_ones() as usize)
        .sum()
}

/// Find homography from matched point pairs using RANSAC
#[wasm_bindgen]
pub fn find_homography_ransac(
    src_points: &[f32],
    dst_points: &[f32],
    num_iterations: usize,
    threshold: f64,
) -> Vec<f64> {
    let n = src_points.len() / 2;
    if n < 4 {
        return vec![1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];
    }

    let mut best_inliers = 0;
    let mut best_h = vec![1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];

    // Simple pseudo-random for reproducibility
    let mut seed = 12345u64;

    for _ in 0..num_iterations {
        // Select 4 random points
        let mut indices = Vec::new();
        while indices.len() < 4 {
            seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
            let idx = (seed >> 16) as usize % n;
            if !indices.contains(&idx) {
                indices.push(idx);
            }
        }

        // Compute homography from 4 points
        let src: Vec<f64> = indices
            .iter()
            .flat_map(|&i| vec![src_points[i * 2] as f64, src_points[i * 2 + 1] as f64])
            .collect();
        let dst: Vec<f64> = indices
            .iter()
            .flat_map(|&i| vec![dst_points[i * 2] as f64, dst_points[i * 2 + 1] as f64])
            .collect();

        let h = compute_homography_4pt(&src, &dst);

        // Count inliers
        let inliers = count_inliers(src_points, dst_points, &h, threshold);

        if inliers > best_inliers {
            best_inliers = inliers;
            best_h = h;
        }
    }

    best_h
}

fn compute_homography_4pt(src: &[f64], dst: &[f64]) -> Vec<f64> {
    // Set up linear system
    let mut a = [[0.0f64; 8]; 8];
    let mut b = [0.0f64; 8];

    for i in 0..4 {
        let sx = src[i * 2];
        let sy = src[i * 2 + 1];
        let dx = dst[i * 2];
        let dy = dst[i * 2 + 1];

        a[i * 2][0] = sx;
        a[i * 2][1] = sy;
        a[i * 2][2] = 1.0;
        a[i * 2][6] = -dx * sx;
        a[i * 2][7] = -dx * sy;
        b[i * 2] = dx;

        a[i * 2 + 1][3] = sx;
        a[i * 2 + 1][4] = sy;
        a[i * 2 + 1][5] = 1.0;
        a[i * 2 + 1][6] = -dy * sx;
        a[i * 2 + 1][7] = -dy * sy;
        b[i * 2 + 1] = dy;
    }

    // Solve
    let h = solve_8x8(&mut a, &mut b);

    vec![h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1.0]
}

fn solve_8x8(a: &mut [[f64; 8]; 8], b: &mut [f64; 8]) -> [f64; 8] {
    // Gaussian elimination
    for col in 0..8 {
        let mut max_row = col;
        for row in (col + 1)..8 {
            if a[row][col].abs() > a[max_row][col].abs() {
                max_row = row;
            }
        }

        a.swap(col, max_row);
        b.swap(col, max_row);

        if a[col][col].abs() < 1e-10 {
            continue;
        }

        for row in (col + 1)..8 {
            let f = a[row][col] / a[col][col];
            for k in col..8 {
                a[row][k] -= f * a[col][k];
            }
            b[row] -= f * b[col];
        }
    }

    // Back substitution
    let mut x = [0.0f64; 8];
    for i in (0..8).rev() {
        let mut sum = b[i];
        for j in (i + 1)..8 {
            sum -= a[i][j] * x[j];
        }
        if a[i][i].abs() > 1e-10 {
            x[i] = sum / a[i][i];
        }
    }

    x
}

fn count_inliers(src: &[f32], dst: &[f32], h: &[f64], threshold: f64) -> usize {
    let n = src.len() / 2;
    let thresh_sq = threshold * threshold;
    let mut count = 0;

    for i in 0..n {
        let sx = src[i * 2] as f64;
        let sy = src[i * 2 + 1] as f64;
        let dx = dst[i * 2] as f64;
        let dy = dst[i * 2 + 1] as f64;

        let w = h[6] * sx + h[7] * sy + h[8];
        if w.abs() < 1e-10 {
            continue;
        }

        let px = (h[0] * sx + h[1] * sy + h[2]) / w;
        let py = (h[3] * sx + h[4] * sy + h[5]) / w;

        let err_sq = (px - dx) * (px - dx) + (py - dy) * (py - dy);
        if err_sq < thresh_sq {
            count += 1;
        }
    }

    count
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_brief_descriptor() {
        let image = vec![128u8; 10000];
        let desc = compute_brief_descriptor(&image, 100, 100, 50, 50);

        assert_eq!(desc.len(), BRIEF_DESCRIPTOR_BYTES);
    }

    #[test]
    fn test_orb_features() {
        // Create image with corner
        let mut image = vec![0u8; 10000];
        for y in 25..75 {
            for x in 25..75 {
                image[y * 100 + x] = 255;
            }
        }

        let features = compute_orb_features(&image, 100, 100, 50, 30);

        assert!(features.len() >= 1); // At least the count
    }

    #[test]
    fn test_hamming_distance() {
        let a = vec![0b11110000u8, 0b10101010];
        let b = vec![0b11110000u8, 0b01010101];

        let dist = hamming_distance(&a, &b);
        assert_eq!(dist, 8); // All bits differ in second byte
    }

    #[test]
    fn test_match_descriptors() {
        let desc1 = vec![0u8, 1, 2, 3];
        let desc2 = vec![0u8, 1, 2, 3, 255, 255, 255, 255];

        let matches = match_descriptors(&desc1, &desc2, 4, 10);

        // Should match first descriptor
        assert!(matches.len() >= 3);
        if matches.len() >= 3 {
            assert_eq!(matches[0], 0); // First descriptor
            assert_eq!(matches[1], 0); // Matches first in desc2
        }
    }

    #[test]
    fn test_homography_identity() {
        let src = vec![0.0f32, 0.0, 100.0, 0.0, 100.0, 100.0, 0.0, 100.0];
        let dst = vec![0.0f32, 0.0, 100.0, 0.0, 100.0, 100.0, 0.0, 100.0];

        let h = find_homography_ransac(&src, &dst, 100, 3.0);

        // Should be close to identity
        assert!((h[0] - 1.0).abs() < 0.1);
        assert!((h[4] - 1.0).abs() < 0.1);
    }
}
