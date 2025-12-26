use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

/// Hough Line Transform implementation for detecting straight lines
///
/// This is essential for document detection because:
/// - ID documents have 4 well-defined straight edges
/// - Line detection is more robust than contour detection for partial edges
/// - Intersection of lines gives precise corner points
///
/// Standard Hough Transform uses polar coordinates: rho = x*cos(theta) + y*sin(theta)

const DEG_TO_RAD: f32 = PI / 180.0;

/// Structure to represent a detected line in polar form
#[derive(Clone, Copy, Debug)]
pub struct PolarLine {
    pub rho: f32,      // Distance from origin
    pub theta: f32,    // Angle in radians
    pub votes: u32,    // Accumulator votes (strength)
}

/// Structure to represent a line segment
#[derive(Clone, Copy, Debug)]
pub struct LineSegment {
    pub x1: f32,
    pub y1: f32,
    pub x2: f32,
    pub y2: f32,
    pub votes: u32,
}

/// Pre-compute sin/cos lookup tables for efficiency
struct TrigTable {
    sin_table: Vec<f32>,
    cos_table: Vec<f32>,
    #[allow(dead_code)]
    theta_step: f32,
    num_angles: usize,
}

impl TrigTable {
    fn new(theta_step: f32) -> Self {
        let num_angles = (PI / theta_step).ceil() as usize;
        let mut sin_table = Vec::with_capacity(num_angles);
        let mut cos_table = Vec::with_capacity(num_angles);

        for i in 0..num_angles {
            let theta = i as f32 * theta_step;
            sin_table.push(theta.sin());
            cos_table.push(theta.cos());
        }

        TrigTable {
            sin_table,
            cos_table,
            theta_step,
            num_angles,
        }
    }
}

/// Standard Hough Line Transform
/// Returns flattened array: [rho0, theta0, votes0, rho1, theta1, votes1, ...]
#[wasm_bindgen]
pub fn hough_lines(
    edges: &[u8],           // Binary edge image
    width: usize,
    height: usize,
    rho_resolution: f32,    // Distance resolution (typically 1.0)
    theta_resolution: f32,  // Angle resolution in degrees (typically 1.0)
    threshold: u32,         // Minimum votes to consider a line
    max_lines: usize,       // Maximum number of lines to return
) -> Vec<f32> {
    let theta_step = theta_resolution * DEG_TO_RAD;
    let trig = TrigTable::new(theta_step);

    // Calculate accumulator dimensions
    let diagonal = ((width * width + height * height) as f32).sqrt();
    let num_rho = ((2.0 * diagonal / rho_resolution) as usize) + 1;
    let rho_offset = diagonal; // Offset to handle negative rho values

    // Initialize accumulator
    let mut accumulator = vec![0u32; num_rho * trig.num_angles];

    // Vote in accumulator for each edge pixel
    for y in 0..height {
        for x in 0..width {
            if edges[y * width + x] == 0 {
                continue;
            }

            let xf = x as f32;
            let yf = y as f32;

            for (theta_idx, (sin_t, cos_t)) in trig
                .sin_table
                .iter()
                .zip(trig.cos_table.iter())
                .enumerate()
            {
                let rho = xf * cos_t + yf * sin_t;
                let rho_idx = ((rho + rho_offset) / rho_resolution) as usize;

                if rho_idx < num_rho {
                    accumulator[rho_idx * trig.num_angles + theta_idx] += 1;
                }
            }
        }
    }

    // Find peaks in accumulator
    let mut lines: Vec<(f32, f32, u32)> = Vec::new();

    for rho_idx in 0..num_rho {
        for theta_idx in 0..trig.num_angles {
            let votes = accumulator[rho_idx * trig.num_angles + theta_idx];

            if votes >= threshold {
                let rho = (rho_idx as f32) * rho_resolution - rho_offset;
                let theta = theta_idx as f32 * theta_step;
                lines.push((rho, theta, votes));
            }
        }
    }

    // Sort by votes (descending)
    lines.sort_by(|a, b| b.2.cmp(&a.2));

    // Non-maximum suppression to remove duplicate lines
    let mut filtered_lines: Vec<(f32, f32, u32)> = Vec::new();
    let rho_thresh = rho_resolution * 20.0;
    let theta_thresh = theta_step * 10.0;

    for line in lines.iter() {
        let mut is_duplicate = false;

        for existing in filtered_lines.iter() {
            let rho_diff = (line.0 - existing.0).abs();
            let theta_diff = (line.1 - existing.1).abs();
            let theta_diff = theta_diff.min(PI - theta_diff); // Handle wrap-around

            if rho_diff < rho_thresh && theta_diff < theta_thresh {
                is_duplicate = true;
                break;
            }
        }

        if !is_duplicate {
            filtered_lines.push(*line);
            if filtered_lines.len() >= max_lines {
                break;
            }
        }
    }

    // Return as flat array
    let mut result = Vec::with_capacity(filtered_lines.len() * 3);
    for (rho, theta, votes) in filtered_lines {
        result.push(rho);
        result.push(theta);
        result.push(votes as f32);
    }

    result
}

/// Probabilistic Hough Line Transform (faster, returns line segments)
/// Returns flattened array: [x1_0, y1_0, x2_0, y2_0, votes0, ...]
#[wasm_bindgen]
pub fn hough_lines_p(
    edges: &[u8],
    width: usize,
    height: usize,
    rho_resolution: f32,
    theta_resolution: f32,
    threshold: u32,
    min_line_length: f32,
    max_line_gap: f32,
    max_lines: usize,
) -> Vec<f32> {
    let theta_step = theta_resolution * DEG_TO_RAD;
    let trig = TrigTable::new(theta_step);

    let diagonal = ((width * width + height * height) as f32).sqrt();
    let num_rho = ((2.0 * diagonal / rho_resolution) as usize) + 1;
    let rho_offset = diagonal;

    let mut accumulator = vec![0u32; num_rho * trig.num_angles];

    // Collect edge points
    let mut edge_points: Vec<(usize, usize)> = Vec::new();
    for y in 0..height {
        for x in 0..width {
            if edges[y * width + x] > 0 {
                edge_points.push((x, y));
            }
        }
    }

    // Track which edge pixels have been used
    let mut used = vec![false; width * height];

    let mut segments: Vec<(f32, f32, f32, f32, u32)> = Vec::new();

    // Process edge points (could randomize for probabilistic version)
    for &(x, y) in edge_points.iter() {
        let idx = y * width + x;
        if used[idx] {
            continue;
        }

        let xf = x as f32;
        let yf = y as f32;

        // Vote in accumulator
        for theta_idx in 0..trig.num_angles {
            let rho = xf * trig.cos_table[theta_idx] + yf * trig.sin_table[theta_idx];
            let rho_idx = ((rho + rho_offset) / rho_resolution) as usize;
            if rho_idx < num_rho {
                accumulator[rho_idx * trig.num_angles + theta_idx] += 1;
            }
        }
    }

    // Find peaks and extract line segments
    let mut peaks: Vec<(usize, usize, u32)> = Vec::new();

    for rho_idx in 0..num_rho {
        for theta_idx in 0..trig.num_angles {
            let votes = accumulator[rho_idx * trig.num_angles + theta_idx];
            if votes >= threshold {
                peaks.push((rho_idx, theta_idx, votes));
            }
        }
    }

    peaks.sort_by(|a, b| b.2.cmp(&a.2));

    // For each peak, find the line segment
    for (rho_idx, theta_idx, votes) in peaks.iter().take(max_lines * 2) {
        let rho = (*rho_idx as f32) * rho_resolution - rho_offset;
        let theta = *theta_idx as f32 * theta_step;
        let cos_t = theta.cos();
        let sin_t = theta.sin();

        // Find edge points that lie on this line
        let mut line_points: Vec<(f32, f32)> = Vec::new();

        for &(x, y) in edge_points.iter() {
            let xf = x as f32;
            let yf = y as f32;

            // Distance from point to line
            let d = (xf * cos_t + yf * sin_t - rho).abs();

            if d <= rho_resolution * 2.0 && !used[y * width + x] {
                line_points.push((xf, yf));
            }
        }

        if line_points.len() < 2 {
            continue;
        }

        // Sort points along the line direction
        let perp_x = -sin_t;
        let perp_y = cos_t;

        line_points.sort_by(|a, b| {
            let proj_a = a.0 * perp_x + a.1 * perp_y;
            let proj_b = b.0 * perp_x + b.1 * perp_y;
            proj_a.partial_cmp(&proj_b).unwrap_or(std::cmp::Ordering::Equal)
        });

        // Find continuous segments
        let mut segment_start = 0;
        for i in 1..line_points.len() {
            let dx = line_points[i].0 - line_points[i - 1].0;
            let dy = line_points[i].1 - line_points[i - 1].1;
            let gap = (dx * dx + dy * dy).sqrt();

            if gap > max_line_gap {
                // Check if segment is long enough
                let sdx = line_points[i - 1].0 - line_points[segment_start].0;
                let sdy = line_points[i - 1].1 - line_points[segment_start].1;
                let length = (sdx * sdx + sdy * sdy).sqrt();

                if length >= min_line_length {
                    segments.push((
                        line_points[segment_start].0,
                        line_points[segment_start].1,
                        line_points[i - 1].0,
                        line_points[i - 1].1,
                        *votes,
                    ));

                    // Mark points as used
                    for j in segment_start..i {
                        let px = line_points[j].0.round() as usize;
                        let py = line_points[j].1.round() as usize;
                        if px < width && py < height {
                            used[py * width + px] = true;
                        }
                    }
                }
                segment_start = i;
            }
        }

        // Check final segment
        let last = line_points.len() - 1;
        let sdx = line_points[last].0 - line_points[segment_start].0;
        let sdy = line_points[last].1 - line_points[segment_start].1;
        let length = (sdx * sdx + sdy * sdy).sqrt();

        if length >= min_line_length {
            segments.push((
                line_points[segment_start].0,
                line_points[segment_start].1,
                line_points[last].0,
                line_points[last].1,
                *votes,
            ));
        }

        if segments.len() >= max_lines {
            break;
        }
    }

    // Return as flat array
    let mut result = Vec::with_capacity(segments.len() * 5);
    for (x1, y1, x2, y2, votes) in segments {
        result.push(x1);
        result.push(y1);
        result.push(x2);
        result.push(y2);
        result.push(votes as f32);
    }

    result
}

/// Find intersections between lines (for corner detection)
/// Input: array from hough_lines [rho0, theta0, votes0, ...]
/// Returns: [x0, y0, line1_idx, line2_idx, ...]
#[wasm_bindgen]
pub fn find_line_intersections(
    lines: &[f32],
    width: usize,
    height: usize,
    min_angle_diff: f32, // Minimum angle difference between lines (degrees)
) -> Vec<f32> {
    let num_lines = lines.len() / 3;
    let min_angle_rad = min_angle_diff * DEG_TO_RAD;
    let mut intersections: Vec<f32> = Vec::new();

    for i in 0..num_lines {
        let rho1 = lines[i * 3];
        let theta1 = lines[i * 3 + 1];

        for j in (i + 1)..num_lines {
            let rho2 = lines[j * 3];
            let theta2 = lines[j * 3 + 1];

            // Check angle difference
            let angle_diff = (theta1 - theta2).abs();
            let angle_diff = angle_diff.min(PI - angle_diff);

            if angle_diff < min_angle_rad {
                continue; // Lines are too parallel
            }

            // Compute intersection
            // x*cos(t1) + y*sin(t1) = r1
            // x*cos(t2) + y*sin(t2) = r2

            let cos1 = theta1.cos();
            let sin1 = theta1.sin();
            let cos2 = theta2.cos();
            let sin2 = theta2.sin();

            let det = cos1 * sin2 - cos2 * sin1;
            if det.abs() < 1e-6 {
                continue; // Lines are parallel
            }

            let x = (sin2 * rho1 - sin1 * rho2) / det;
            let y = (cos1 * rho2 - cos2 * rho1) / det;

            // Check if intersection is within image bounds (with margin)
            let margin = 50.0;
            if x >= -margin
                && x < (width as f32) + margin
                && y >= -margin
                && y < (height as f32) + margin
            {
                intersections.push(x);
                intersections.push(y);
                intersections.push(i as f32);
                intersections.push(j as f32);
            }
        }
    }

    intersections
}

/// Find the best quadrilateral from detected lines
/// Returns: [tl_x, tl_y, tr_x, tr_y, br_x, br_y, bl_x, bl_y, confidence]
#[wasm_bindgen]
pub fn find_document_quadrilateral(
    lines: &[f32],
    width: usize,
    height: usize,
    min_area_ratio: f32,  // Minimum area as ratio of image area (e.g., 0.1)
    max_area_ratio: f32,  // Maximum area as ratio of image area (e.g., 0.95)
) -> Vec<f32> {
    let num_lines = lines.len() / 3;
    if num_lines < 4 {
        return Vec::new();
    }

    // Group lines by angle (approximately horizontal vs vertical)
    let mut horizontal_lines: Vec<usize> = Vec::new();
    let mut vertical_lines: Vec<usize> = Vec::new();

    for i in 0..num_lines {
        let theta = lines[i * 3 + 1];
        // Horizontal lines have theta near 90° (PI/2)
        // Vertical lines have theta near 0° or 180°
        let angle_from_horizontal = (theta - PI / 2.0).abs();

        if angle_from_horizontal < PI / 4.0 {
            horizontal_lines.push(i);
        } else {
            vertical_lines.push(i);
        }
    }

    if horizontal_lines.len() < 2 || vertical_lines.len() < 2 {
        return Vec::new();
    }

    let image_area = (width * height) as f32;
    let min_area = image_area * min_area_ratio;
    let max_area = image_area * max_area_ratio;

    let mut best_quad: Option<([f32; 8], f32)> = None;

    // Try all combinations of 2 horizontal + 2 vertical lines
    for h1_idx in 0..horizontal_lines.len() {
        for h2_idx in (h1_idx + 1)..horizontal_lines.len() {
            for v1_idx in 0..vertical_lines.len() {
                for v2_idx in (v1_idx + 1)..vertical_lines.len() {
                    let h1 = horizontal_lines[h1_idx];
                    let h2 = horizontal_lines[h2_idx];
                    let v1 = vertical_lines[v1_idx];
                    let v2 = vertical_lines[v2_idx];

                    // Find 4 intersection points
                    let corners = [
                        line_intersection(&lines, h1, v1),
                        line_intersection(&lines, h1, v2),
                        line_intersection(&lines, h2, v1),
                        line_intersection(&lines, h2, v2),
                    ];

                    // Check if all corners are valid
                    if corners.iter().any(|c| c.is_none()) {
                        continue;
                    }

                    let corners: Vec<(f32, f32)> =
                        corners.iter().filter_map(|&c| c).collect();

                    // Order corners clockwise from top-left
                    let ordered = order_corners(&corners);
                    if ordered.is_none() {
                        continue;
                    }
                    let ordered = ordered.unwrap();

                    // Check if quad is within image bounds
                    let margin = 50.0;
                    let in_bounds = ordered.iter().all(|&(x, y)| {
                        x >= -margin
                            && x < (width as f32) + margin
                            && y >= -margin
                            && y < (height as f32) + margin
                    });
                    if !in_bounds {
                        continue;
                    }

                    // Calculate area
                    let area = quad_area(&ordered);
                    if area < min_area || area > max_area {
                        continue;
                    }

                    // Calculate confidence based on:
                    // 1. Line votes (stronger lines = higher confidence)
                    // 2. Aspect ratio (should be reasonable for ID documents)
                    // 3. Angle regularity (corners should be close to 90°)

                    let total_votes = lines[h1 * 3 + 2]
                        + lines[h2 * 3 + 2]
                        + lines[v1 * 3 + 2]
                        + lines[v2 * 3 + 2];

                    let aspect_ratio = calculate_aspect_ratio(&ordered);
                    let aspect_score = if aspect_ratio > 0.5 && aspect_ratio < 2.0 {
                        1.0
                    } else {
                        0.5
                    };

                    let angle_score = calculate_angle_regularity(&ordered);

                    let confidence = (total_votes / 1000.0) * aspect_score * angle_score;

                    if best_quad.is_none() || confidence > best_quad.unwrap().1 {
                        best_quad = Some((
                            [
                                ordered[0].0, ordered[0].1,
                                ordered[1].0, ordered[1].1,
                                ordered[2].0, ordered[2].1,
                                ordered[3].0, ordered[3].1,
                            ],
                            confidence,
                        ));
                    }
                }
            }
        }
    }

    match best_quad {
        Some((corners, confidence)) => {
            let mut result = corners.to_vec();
            result.push(confidence);
            result
        }
        None => Vec::new(),
    }
}

/// Helper: Find intersection of two lines given by their indices
fn line_intersection(lines: &[f32], idx1: usize, idx2: usize) -> Option<(f32, f32)> {
    let rho1 = lines[idx1 * 3];
    let theta1 = lines[idx1 * 3 + 1];
    let rho2 = lines[idx2 * 3];
    let theta2 = lines[idx2 * 3 + 1];

    let cos1 = theta1.cos();
    let sin1 = theta1.sin();
    let cos2 = theta2.cos();
    let sin2 = theta2.sin();

    let det = cos1 * sin2 - cos2 * sin1;
    if det.abs() < 1e-6 {
        return None;
    }

    let x = (sin2 * rho1 - sin1 * rho2) / det;
    let y = (cos1 * rho2 - cos2 * rho1) / det;

    Some((x, y))
}

/// Helper: Order corners clockwise starting from top-left
fn order_corners(corners: &[(f32, f32)]) -> Option<[(f32, f32); 4]> {
    if corners.len() != 4 {
        return None;
    }

    // Find centroid
    let cx: f32 = corners.iter().map(|c| c.0).sum::<f32>() / 4.0;
    let cy: f32 = corners.iter().map(|c| c.1).sum::<f32>() / 4.0;

    // Sort by angle from centroid
    let mut sorted: Vec<(f32, f32, f32)> = corners
        .iter()
        .map(|&(x, y)| {
            let angle = (y - cy).atan2(x - cx);
            (x, y, angle)
        })
        .collect();

    sorted.sort_by(|a, b| a.2.partial_cmp(&b.2).unwrap_or(std::cmp::Ordering::Equal));

    // Find top-left (smallest x+y)
    let mut min_sum = f32::MAX;
    let mut tl_idx = 0;
    for (i, &(x, y, _)) in sorted.iter().enumerate() {
        if x + y < min_sum {
            min_sum = x + y;
            tl_idx = i;
        }
    }

    // Reorder so top-left is first
    let ordered = [
        (sorted[tl_idx].0, sorted[tl_idx].1),
        (sorted[(tl_idx + 1) % 4].0, sorted[(tl_idx + 1) % 4].1),
        (sorted[(tl_idx + 2) % 4].0, sorted[(tl_idx + 2) % 4].1),
        (sorted[(tl_idx + 3) % 4].0, sorted[(tl_idx + 3) % 4].1),
    ];

    Some(ordered)
}

/// Helper: Calculate quadrilateral area using shoelace formula
fn quad_area(corners: &[(f32, f32); 4]) -> f32 {
    let mut area = 0.0;
    for i in 0..4 {
        let j = (i + 1) % 4;
        area += corners[i].0 * corners[j].1;
        area -= corners[j].0 * corners[i].1;
    }
    area.abs() / 2.0
}

/// Helper: Calculate aspect ratio of quadrilateral
fn calculate_aspect_ratio(corners: &[(f32, f32); 4]) -> f32 {
    let width1 = ((corners[1].0 - corners[0].0).powi(2)
        + (corners[1].1 - corners[0].1).powi(2))
    .sqrt();
    let width2 = ((corners[2].0 - corners[3].0).powi(2)
        + (corners[2].1 - corners[3].1).powi(2))
    .sqrt();
    let height1 = ((corners[3].0 - corners[0].0).powi(2)
        + (corners[3].1 - corners[0].1).powi(2))
    .sqrt();
    let height2 = ((corners[2].0 - corners[1].0).powi(2)
        + (corners[2].1 - corners[1].1).powi(2))
    .sqrt();

    let avg_width = (width1 + width2) / 2.0;
    let avg_height = (height1 + height2) / 2.0;

    if avg_height > avg_width {
        avg_width / avg_height
    } else {
        avg_height / avg_width
    }
}

/// Helper: Calculate angle regularity (how close to 90° the corners are)
fn calculate_angle_regularity(corners: &[(f32, f32); 4]) -> f32 {
    let mut total_deviation = 0.0;

    for i in 0..4 {
        let prev = corners[(i + 3) % 4];
        let curr = corners[i];
        let next = corners[(i + 1) % 4];

        let v1 = (prev.0 - curr.0, prev.1 - curr.1);
        let v2 = (next.0 - curr.0, next.1 - curr.1);

        let dot = v1.0 * v2.0 + v1.1 * v2.1;
        let mag1 = (v1.0 * v1.0 + v1.1 * v1.1).sqrt();
        let mag2 = (v2.0 * v2.0 + v2.1 * v2.1).sqrt();

        if mag1 > 0.0 && mag2 > 0.0 {
            let cos_angle = dot / (mag1 * mag2);
            let angle = cos_angle.clamp(-1.0, 1.0).acos();
            let deviation = (angle - PI / 2.0).abs();
            total_deviation += deviation;
        }
    }

    // Convert to score (1.0 for perfect 90° angles, 0.0 for very skewed)
    let avg_deviation = total_deviation / 4.0;
    (1.0 - avg_deviation / (PI / 4.0)).max(0.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_line_intersection() {
        // Two perpendicular lines through origin
        let lines = vec![
            0.0, 0.0, 100.0,          // Vertical line at x=0
            0.0, PI / 2.0, 100.0,     // Horizontal line at y=0
        ];

        let intersection = line_intersection(&lines, 0, 1);
        assert!(intersection.is_some());
        let (x, y) = intersection.unwrap();
        assert!((x).abs() < 0.01);
        assert!((y).abs() < 0.01);
    }

    #[test]
    fn test_quad_area() {
        // Unit square
        let corners = [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)];
        let area = quad_area(&corners);
        assert!((area - 1.0).abs() < 0.01);
    }
}
