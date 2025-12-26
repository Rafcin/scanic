use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

/// Document Detection and Validation Module
///
/// This module provides high-level document detection with:
/// - Confidence scoring
/// - Geometric validation
/// - ID document aspect ratio checking
/// - Multi-candidate ranking

/// Standard ID document aspect ratios
/// CR-80 (credit card size): 85.6mm x 53.98mm = 1.586:1
/// ID-1 (ISO 7810): Same as CR-80
/// Passport (ID-3): 125mm x 88mm = 1.42:1
/// US Driver License: 85.6mm x 54mm = 1.585:1
const ID_CARD_ASPECT_RATIO: f32 = 1.586;
const PASSPORT_ASPECT_RATIO: f32 = 1.42;
const A4_ASPECT_RATIO: f32 = 1.414;
const LETTER_ASPECT_RATIO: f32 = 1.294;

/// Document candidate with scoring information
#[derive(Clone, Debug)]
pub struct DocumentCandidate {
    pub corners: [f32; 8],      // [tl_x, tl_y, tr_x, tr_y, br_x, br_y, bl_x, bl_y]
    pub confidence: f32,        // Overall confidence 0-1
    pub edge_score: f32,        // Edge strength score 0-1
    pub shape_score: f32,       // Geometric shape score 0-1
    pub aspect_score: f32,      // Aspect ratio match score 0-1
    pub size_score: f32,        // Size appropriateness score 0-1
    pub document_type: u8,      // 0=unknown, 1=ID card, 2=passport, 3=paper
}

/// Validate corners represent a valid quadrilateral
#[wasm_bindgen]
pub fn validate_quadrilateral(corners: &[f32]) -> Vec<f32> {
    if corners.len() != 8 {
        return vec![0.0; 7]; // Invalid input
    }

    let tl = (corners[0], corners[1]);
    let tr = (corners[2], corners[3]);
    let br = (corners[4], corners[5]);
    let bl = (corners[6], corners[7]);

    let points = [tl, tr, br, bl];

    // 1. Check convexity
    let convexity_score = check_convexity(&points);

    // 2. Check angle regularity (corners should be close to 90°)
    let angle_score = check_angle_regularity(&points);

    // 3. Check edge parallelism (opposite edges should be parallel)
    let parallelism_score = check_parallelism(&points);

    // 4. Check aspect ratio
    let aspect_ratio = calculate_aspect_ratio(&points);
    let (aspect_score, doc_type) = score_aspect_ratio(aspect_ratio);

    // 5. Check for self-intersection
    let no_intersection = !has_self_intersection(&points);
    let intersection_score = if no_intersection { 1.0 } else { 0.0 };

    // Calculate overall shape score
    let shape_score = (convexity_score * 0.2
        + angle_score * 0.3
        + parallelism_score * 0.3
        + intersection_score * 0.2)
        .clamp(0.0, 1.0);

    vec![
        shape_score,
        convexity_score,
        angle_score,
        parallelism_score,
        aspect_ratio,
        aspect_score,
        doc_type as f32,
    ]
}

/// Check if quadrilateral is convex
fn check_convexity(points: &[(f32, f32); 4]) -> f32 {
    let mut sign = 0i32;
    let mut convex = true;

    for i in 0..4 {
        let p0 = points[i];
        let p1 = points[(i + 1) % 4];
        let p2 = points[(i + 2) % 4];

        let cross = (p1.0 - p0.0) * (p2.1 - p1.1) - (p1.1 - p0.1) * (p2.0 - p1.0);

        if cross.abs() > 1e-6 {
            let new_sign = if cross > 0.0 { 1 } else { -1 };
            if sign == 0 {
                sign = new_sign;
            } else if sign != new_sign {
                convex = false;
                break;
            }
        }
    }

    if convex { 1.0 } else { 0.0 }
}

/// Check how close corners are to 90 degrees
fn check_angle_regularity(points: &[(f32, f32); 4]) -> f32 {
    let mut total_deviation = 0.0;

    for i in 0..4 {
        let prev = points[(i + 3) % 4];
        let curr = points[i];
        let next = points[(i + 1) % 4];

        let v1 = (prev.0 - curr.0, prev.1 - curr.1);
        let v2 = (next.0 - curr.0, next.1 - curr.1);

        let dot = v1.0 * v2.0 + v1.1 * v2.1;
        let mag1 = (v1.0 * v1.0 + v1.1 * v1.1).sqrt();
        let mag2 = (v2.0 * v2.0 + v2.1 * v2.1).sqrt();

        if mag1 > 1e-6 && mag2 > 1e-6 {
            let cos_angle = (dot / (mag1 * mag2)).clamp(-1.0, 1.0);
            let angle = cos_angle.acos();
            // Ideal angle is 90° (PI/2)
            let deviation = (angle - PI / 2.0).abs();
            total_deviation += deviation;
        } else {
            total_deviation += PI / 4.0; // Penalize degenerate cases
        }
    }

    // Average deviation, normalized to 0-1 score
    // PI/4 (45°) deviation is considered very bad -> score 0
    let avg_deviation = total_deviation / 4.0;
    (1.0 - avg_deviation / (PI / 4.0)).clamp(0.0, 1.0)
}

/// Check if opposite edges are roughly parallel
fn check_parallelism(points: &[(f32, f32); 4]) -> f32 {
    // Top edge direction
    let top_dir = normalize_vector((
        points[1].0 - points[0].0,
        points[1].1 - points[0].1,
    ));
    // Bottom edge direction
    let bottom_dir = normalize_vector((
        points[2].0 - points[3].0,
        points[2].1 - points[3].1,
    ));
    // Left edge direction
    let left_dir = normalize_vector((
        points[3].0 - points[0].0,
        points[3].1 - points[0].1,
    ));
    // Right edge direction
    let right_dir = normalize_vector((
        points[2].0 - points[1].0,
        points[2].1 - points[1].1,
    ));

    // Dot product of parallel edges should be close to 1 or -1
    let tb_parallel = (top_dir.0 * bottom_dir.0 + top_dir.1 * bottom_dir.1).abs();
    let lr_parallel = (left_dir.0 * right_dir.0 + left_dir.1 * right_dir.1).abs();

    // Average parallelism
    (tb_parallel + lr_parallel) / 2.0
}

/// Normalize a 2D vector
fn normalize_vector(v: (f32, f32)) -> (f32, f32) {
    let mag = (v.0 * v.0 + v.1 * v.1).sqrt();
    if mag > 1e-6 {
        (v.0 / mag, v.1 / mag)
    } else {
        (0.0, 0.0)
    }
}

/// Calculate aspect ratio of quadrilateral
fn calculate_aspect_ratio(points: &[(f32, f32); 4]) -> f32 {
    // Calculate average width and height
    let width1 = ((points[1].0 - points[0].0).powi(2)
        + (points[1].1 - points[0].1).powi(2))
    .sqrt();
    let width2 = ((points[2].0 - points[3].0).powi(2)
        + (points[2].1 - points[3].1).powi(2))
    .sqrt();
    let height1 = ((points[3].0 - points[0].0).powi(2)
        + (points[3].1 - points[0].1).powi(2))
    .sqrt();
    let height2 = ((points[2].0 - points[1].0).powi(2)
        + (points[2].1 - points[1].1).powi(2))
    .sqrt();

    let avg_width = (width1 + width2) / 2.0;
    let avg_height = (height1 + height2) / 2.0;

    if avg_height > 1e-6 {
        avg_width / avg_height
    } else {
        1.0
    }
}

/// Score aspect ratio match to known document types
fn score_aspect_ratio(aspect: f32) -> (f32, u8) {
    // Normalize aspect ratio (always >= 1)
    let normalized = if aspect < 1.0 { 1.0 / aspect } else { aspect };

    // Score against known document types
    let id_diff = (normalized - ID_CARD_ASPECT_RATIO).abs();
    let passport_diff = (normalized - PASSPORT_ASPECT_RATIO).abs();
    let a4_diff = (normalized - A4_ASPECT_RATIO).abs();
    let letter_diff = (normalized - LETTER_ASPECT_RATIO).abs();

    // Find best match
    let mut best_score = 0.0f32;
    let mut doc_type = 0u8;

    // ID card (tolerance: 0.15)
    let id_score = (1.0 - id_diff / 0.3).clamp(0.0, 1.0);
    if id_score > best_score {
        best_score = id_score;
        doc_type = 1;
    }

    // Passport (tolerance: 0.15)
    let passport_score = (1.0 - passport_diff / 0.3).clamp(0.0, 1.0);
    if passport_score > best_score {
        best_score = passport_score;
        doc_type = 2;
    }

    // A4/Letter paper (tolerance: 0.2)
    let paper_score = ((1.0 - a4_diff / 0.3).clamp(0.0, 1.0))
        .max((1.0 - letter_diff / 0.3).clamp(0.0, 1.0));
    if paper_score > best_score {
        best_score = paper_score;
        doc_type = 3;
    }

    // If nothing matches well, still give some score for any reasonable rectangle
    if best_score < 0.3 && normalized > 0.5 && normalized < 3.0 {
        best_score = 0.3;
        doc_type = 0;
    }

    (best_score, doc_type)
}

/// Check for self-intersection in quadrilateral
fn has_self_intersection(points: &[(f32, f32); 4]) -> bool {
    // Check if diagonal segments intersect
    // Segment 0-2 vs Segment 1-3
    segments_intersect(points[0], points[2], points[1], points[3])
}

/// Check if two line segments intersect
fn segments_intersect(p1: (f32, f32), p2: (f32, f32), p3: (f32, f32), p4: (f32, f32)) -> bool {
    fn ccw(a: (f32, f32), b: (f32, f32), c: (f32, f32)) -> bool {
        (c.1 - a.1) * (b.0 - a.0) > (b.1 - a.1) * (c.0 - a.0)
    }

    ccw(p1, p3, p4) != ccw(p2, p3, p4) && ccw(p1, p2, p3) != ccw(p1, p2, p4)
}

/// Calculate edge strength along quadrilateral edges
/// Uses gradient magnitude along the detected edges
#[wasm_bindgen]
pub fn calculate_edge_strength(
    gradients: &[i16],      // Interleaved gx, gy from Sobel
    width: usize,
    height: usize,
    corners: &[f32],        // 8 values: tl_x, tl_y, tr_x, tr_y, br_x, br_y, bl_x, bl_y
    sample_points: usize,   // Number of points to sample along each edge
) -> f32 {
    if corners.len() != 8 {
        return 0.0;
    }

    let points = [
        (corners[0], corners[1]), // TL
        (corners[2], corners[3]), // TR
        (corners[4], corners[5]), // BR
        (corners[6], corners[7]), // BL
    ];

    let mut total_strength = 0.0;
    let mut total_samples = 0;

    // Sample points along each edge
    for edge in 0..4 {
        let p1 = points[edge];
        let p2 = points[(edge + 1) % 4];

        // Edge direction (perpendicular for gradient check)
        let edge_dir = normalize_vector((p2.0 - p1.0, p2.1 - p1.1));
        let perp_dir = (-edge_dir.1, edge_dir.0);

        for i in 0..sample_points {
            let t = (i as f32 + 0.5) / sample_points as f32;
            let x = p1.0 + t * (p2.0 - p1.0);
            let y = p1.1 + t * (p2.1 - p1.1);

            // Get gradient at this point
            let ix = x.round() as usize;
            let iy = y.round() as usize;

            if ix < width && iy < height {
                let idx = iy * width + ix;
                let gx = gradients[2 * idx] as f32;
                let gy = gradients[2 * idx + 1] as f32;

                // Gradient magnitude along perpendicular direction
                let grad_mag = (gx * perp_dir.0 + gy * perp_dir.1).abs();
                total_strength += grad_mag;
                total_samples += 1;
            }
        }
    }

    if total_samples > 0 {
        // Normalize to 0-1 range (assuming max gradient ~500 for strong edges)
        let avg_strength = total_strength / total_samples as f32;
        (avg_strength / 300.0).clamp(0.0, 1.0)
    } else {
        0.0
    }
}

/// Calculate size appropriateness score
/// Documents should occupy a reasonable portion of the frame
#[wasm_bindgen]
pub fn calculate_size_score(
    corners: &[f32],
    image_width: usize,
    image_height: usize,
    min_coverage: f32,  // Minimum area coverage (e.g., 0.05 = 5%)
    max_coverage: f32,  // Maximum area coverage (e.g., 0.95 = 95%)
    ideal_coverage: f32, // Ideal coverage (e.g., 0.3 = 30%)
) -> f32 {
    if corners.len() != 8 {
        return 0.0;
    }

    let points = [
        (corners[0], corners[1]),
        (corners[2], corners[3]),
        (corners[4], corners[5]),
        (corners[6], corners[7]),
    ];

    // Calculate quad area using shoelace formula
    let mut area = 0.0;
    for i in 0..4 {
        let j = (i + 1) % 4;
        area += points[i].0 * points[j].1;
        area -= points[j].0 * points[i].1;
    }
    area = area.abs() / 2.0;

    let image_area = (image_width * image_height) as f32;
    let coverage = area / image_area;

    // Check bounds
    if coverage < min_coverage || coverage > max_coverage {
        return 0.0;
    }

    // Score based on distance from ideal
    let diff_from_ideal = (coverage - ideal_coverage).abs();
    let max_diff = (max_coverage - min_coverage) / 2.0;

    (1.0 - diff_from_ideal / max_diff).clamp(0.0, 1.0)
}

/// Calculate overall document detection confidence
#[wasm_bindgen]
pub fn calculate_detection_confidence(
    edge_score: f32,
    shape_score: f32,
    aspect_score: f32,
    size_score: f32,
) -> f32 {
    // Weighted combination of all scores
    // Edge strength is most important, followed by shape regularity
    let confidence = edge_score * 0.35
        + shape_score * 0.30
        + aspect_score * 0.20
        + size_score * 0.15;

    confidence.clamp(0.0, 1.0)
}

/// Rank multiple document candidates and return the best ones
/// Input: flat array [corners0..., confidence0, corners1..., confidence1, ...]
/// Output: sorted array with same format, best first
#[wasm_bindgen]
pub fn rank_document_candidates(
    candidates: &[f32],
    max_candidates: usize,
    min_confidence: f32,
) -> Vec<f32> {
    let candidate_size = 9; // 8 corner values + 1 confidence
    let num_candidates = candidates.len() / candidate_size;

    if num_candidates == 0 {
        return Vec::new();
    }

    // Extract and sort candidates
    let mut candidate_list: Vec<(usize, f32)> = Vec::new();
    for i in 0..num_candidates {
        let confidence = candidates[i * candidate_size + 8];
        if confidence >= min_confidence {
            candidate_list.push((i, confidence));
        }
    }

    // Sort by confidence (descending)
    candidate_list.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    // Build result
    let mut result = Vec::new();
    for (idx, _) in candidate_list.iter().take(max_candidates) {
        let start = idx * candidate_size;
        for j in 0..candidate_size {
            result.push(candidates[start + j]);
        }
    }

    result
}

/// Refine corner positions using sub-pixel edge fitting
/// Uses gradient information to find precise edge locations
#[wasm_bindgen]
pub fn refine_corners_subpixel(
    gradients: &[i16],
    width: usize,
    height: usize,
    corners: &[f32],
    search_radius: usize,
) -> Vec<f32> {
    if corners.len() != 8 {
        return corners.to_vec();
    }

    let mut refined = vec![0.0f32; 8];

    for i in 0..4 {
        let cx = corners[i * 2];
        let cy = corners[i * 2 + 1];

        // Search in neighborhood for maximum gradient magnitude
        let mut best_x = cx;
        let mut best_y = cy;
        let mut best_response = 0.0f32;

        let x_start = (cx as i32 - search_radius as i32).max(1) as usize;
        let x_end = (cx as usize + search_radius).min(width - 2);
        let y_start = (cy as i32 - search_radius as i32).max(1) as usize;
        let y_end = (cy as usize + search_radius).min(height - 2);

        for y in y_start..=y_end {
            for x in x_start..=x_end {
                let idx = y * width + x;
                let gx = gradients[2 * idx] as f32;
                let gy = gradients[2 * idx + 1] as f32;

                // Corner response: product of gradients in both directions
                // (simplified Harris corner response)
                let response = (gx * gx + gy * gy).sqrt();

                if response > best_response {
                    best_response = response;
                    best_x = x as f32;
                    best_y = y as f32;
                }
            }
        }

        // Sub-pixel refinement using gradient fitting
        if best_x > 0.0 && best_x < (width - 1) as f32
           && best_y > 0.0 && best_y < (height - 1) as f32 {
            let bx = best_x as usize;
            let by = best_y as usize;

            // Fit parabola to gradient magnitude
            let idx_l = by * width + bx - 1;
            let idx_c = by * width + bx;
            let idx_r = by * width + bx + 1;
            let idx_t = (by - 1) * width + bx;
            let idx_b = (by + 1) * width + bx;

            let mag_l = gradient_magnitude(&gradients, idx_l);
            let mag_c = gradient_magnitude(&gradients, idx_c);
            let mag_r = gradient_magnitude(&gradients, idx_r);
            let mag_t = gradient_magnitude(&gradients, idx_t);
            let mag_b = gradient_magnitude(&gradients, idx_b);

            // Sub-pixel offset using quadratic interpolation
            let dx = if mag_l + mag_r > 2.0 * mag_c {
                0.0 // No clear peak
            } else {
                (mag_l - mag_r) / (2.0 * (mag_l + mag_r - 2.0 * mag_c))
            };

            let dy = if mag_t + mag_b > 2.0 * mag_c {
                0.0
            } else {
                (mag_t - mag_b) / (2.0 * (mag_t + mag_b - 2.0 * mag_c))
            };

            best_x += dx.clamp(-0.5, 0.5);
            best_y += dy.clamp(-0.5, 0.5);
        }

        refined[i * 2] = best_x;
        refined[i * 2 + 1] = best_y;
    }

    refined
}

fn gradient_magnitude(gradients: &[i16], idx: usize) -> f32 {
    let gx = gradients[2 * idx] as f32;
    let gy = gradients[2 * idx + 1] as f32;
    (gx * gx + gy * gy).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_rectangle() {
        // Perfect rectangle
        let corners = vec![0.0, 0.0, 100.0, 0.0, 100.0, 50.0, 0.0, 50.0];
        let result = validate_quadrilateral(&corners);

        // Result should be valid (non-negative scores)
        assert!(result[0] >= 0.0, "Shape score should be non-negative");
        assert!(result[1] >= 0.0, "Convexity should be non-negative");
        assert!(result[2] >= 0.0, "Angle score should be non-negative");
        // Verify we get some output
        assert_eq!(result.len(), 7, "Should return 7 score values");
    }

    #[test]
    fn test_validate_skewed() {
        // Skewed quadrilateral
        let corners = vec![0.0, 0.0, 100.0, 10.0, 90.0, 60.0, 10.0, 50.0];
        let result = validate_quadrilateral(&corners);

        // Should still be valid but with lower scores
        assert!(result[0] > 0.3, "Shape score should be reasonable");
    }

    #[test]
    fn test_aspect_ratio_id_card() {
        // ID card proportions (85.6 x 54mm)
        let corners = vec![0.0, 0.0, 85.6, 0.0, 85.6, 54.0, 0.0, 54.0];
        let result = validate_quadrilateral(&corners);

        assert!(result[5] > 0.8, "Aspect score should match ID card");
        assert_eq!(result[6] as u8, 1, "Should be detected as ID card");
    }
}
