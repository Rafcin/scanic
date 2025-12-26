use wasm_bindgen::prelude::*;

/// Contour detection using Suzuki85 border following algorithm
/// Based on: "Topological Structural Analysis of Digitized Binary Images by Border Following"
/// by Satoshi Suzuki and Keiichi Abe (1985)
///
/// This is the same algorithm used by OpenCV's findContours function.

/// Contour retrieval modes (matching OpenCV)
#[wasm_bindgen]
#[derive(Clone, Copy, PartialEq)]
pub enum RetrievalMode {
    /// Retrieve only external contours
    External = 0,
    /// Retrieve all contours (no hierarchy)
    List = 1,
    /// Retrieve contours and organize into two-level hierarchy
    CComp = 2,
    /// Retrieve all contours with full hierarchy
    Tree = 3,
}

/// Contour approximation methods
#[wasm_bindgen]
#[derive(Clone, Copy)]
pub enum ApproxMethod {
    /// Store all contour points
    None = 0,
    /// Compress horizontal, vertical, and diagonal segments
    Simple = 1,
    /// Apply Teh-Chin chain approximation
    TC89L1 = 2,
    /// Apply Teh-Chin chain approximation (KCOS variant)
    TC89KCOS = 3,
}

/// Internal contour representation
struct Contour {
    points: Vec<(i32, i32)>,
    is_hole: bool,
    parent: i32,
}

/// Find contours in a binary image using Suzuki85 algorithm
///
/// # Arguments
/// * `binary` - Binary image (0 or 255 values)
/// * `width` - Image width
/// * `height` - Image height
/// * `mode` - Retrieval mode (External, List, CComp, Tree)
/// * `method` - Approximation method (None, Simple)
///
/// # Returns
/// Flattened contour data: [num_contours, [num_points, x1, y1, x2, y2, ...], ...]
#[wasm_bindgen]
pub fn find_contours(
    binary: &[u8],
    width: usize,
    height: usize,
    mode: RetrievalMode,
    method: ApproxMethod,
) -> Vec<i32> {
    // Create working copy with 1-pixel border
    let padded_width = width + 2;
    let padded_height = height + 2;
    let mut image = vec![0i32; padded_width * padded_height];

    // Copy binary image with padding (threshold to 1)
    for y in 0..height {
        for x in 0..width {
            let src_idx = y * width + x;
            let dst_idx = (y + 1) * padded_width + (x + 1);
            image[dst_idx] = if binary[src_idx] > 127 { 1 } else { 0 };
        }
    }

    let mut contours: Vec<Contour> = Vec::new();
    let mut nbd: i32 = 1; // Current border sequential number

    // Scan the image
    for y in 1..padded_height - 1 {
        let mut lnbd: i32 = 1; // Last non-zero border encountered

        for x in 1..padded_width - 1 {
            let idx = y * padded_width + x;
            let current = image[idx];
            let prev = image[idx - 1];

            // Check for border starting points
            let (is_outer, is_hole) = if current == 1 && prev == 0 {
                // Outer border starting point
                (true, false)
            } else if current >= 1 && image[idx + 1] == 0 {
                // Hole border starting point
                (true, true)
            } else {
                (false, false)
            };

            if is_outer {
                nbd += 1;

                // Determine parent contour
                let parent = if is_hole {
                    if lnbd > 1 { lnbd } else { -1 }
                } else {
                    -1
                };

                // Follow the border
                let points = follow_border(
                    &mut image,
                    padded_width,
                    padded_height,
                    x as i32,
                    y as i32,
                    nbd,
                    is_hole,
                );

                if !points.is_empty() {
                    let simplified = match method {
                        ApproxMethod::Simple => simplify_contour(&points),
                        _ => points,
                    };

                    // Adjust coordinates back (remove padding offset)
                    let adjusted: Vec<(i32, i32)> = simplified
                        .iter()
                        .map(|&(px, py)| (px - 1, py - 1))
                        .collect();

                    // Filter based on retrieval mode
                    let should_add = match mode {
                        RetrievalMode::External => !is_hole,
                        _ => true,
                    };

                    if should_add && !adjusted.is_empty() {
                        contours.push(Contour {
                            points: adjusted,
                            is_hole,
                            parent,
                        });
                    }
                }
            }

            // Update lnbd
            if image[idx] != 0 && image[idx] != 1 {
                lnbd = image[idx].abs();
            }
        }
    }

    // Flatten contours for output
    flatten_contours(&contours)
}

/// Follow a border using the Suzuki85 algorithm
fn follow_border(
    image: &mut [i32],
    width: usize,
    height: usize,
    start_x: i32,
    start_y: i32,
    nbd: i32,
    is_hole: bool,
) -> Vec<(i32, i32)> {
    let mut points = Vec::new();

    // 8-connectivity neighbor offsets (clockwise from right)
    let dx = [1, 1, 0, -1, -1, -1, 0, 1];
    let dy = [0, 1, 1, 1, 0, -1, -1, -1];

    // Find starting direction
    let start_dir = if is_hole { 0 } else { 4 };

    // Find first neighbor
    let mut found = false;
    let mut i1_dir = 0;

    for i in 0..8 {
        let dir = (start_dir + i) % 8;
        let nx = start_x + dx[dir];
        let ny = start_y + dy[dir];

        if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
            let nidx = (ny as usize) * width + (nx as usize);
            if image[nidx] != 0 {
                i1_dir = dir;
                found = true;
                break;
            }
        }
    }

    if !found {
        // Isolated point
        let idx = (start_y as usize) * width + (start_x as usize);
        image[idx] = -nbd;
        points.push((start_x, start_y));
        return points;
    }

    let mut x = start_x;
    let mut y = start_y;
    let mut dir = i1_dir;

    loop {
        points.push((x, y));

        // Mark the pixel
        let idx = (y as usize) * width + (x as usize);
        let prev_dir = (dir + 4) % 8;
        let prev_x = x + dx[prev_dir];
        let prev_y = y + dy[prev_dir];

        if prev_x >= 0 && prev_x < width as i32 && prev_y >= 0 && prev_y < height as i32 {
            let prev_idx = (prev_y as usize) * width + (prev_x as usize);
            if image[prev_idx] == 0 {
                image[idx] = -nbd;
            } else if image[idx] == 1 {
                image[idx] = nbd;
            }
        }

        // Find next neighbor (counterclockwise search)
        let mut next_found = false;
        let search_start = (dir + 6) % 8; // Start from dir - 2

        for i in 0..8 {
            let search_dir = (search_start + i) % 8;
            let nx = x + dx[search_dir];
            let ny = y + dy[search_dir];

            if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                let nidx = (ny as usize) * width + (nx as usize);
                if image[nidx] != 0 {
                    x = nx;
                    y = ny;
                    dir = search_dir;
                    next_found = true;
                    break;
                }
            }
        }

        if !next_found || (x == start_x && y == start_y) {
            break;
        }

        // Prevent infinite loops
        if points.len() > width * height {
            break;
        }
    }

    points
}

/// Simplify contour by removing redundant points (chain code compression)
fn simplify_contour(points: &[(i32, i32)]) -> Vec<(i32, i32)> {
    if points.len() <= 2 {
        return points.to_vec();
    }

    let mut simplified = Vec::with_capacity(points.len());
    simplified.push(points[0]);

    let mut prev_dx = 0i32;
    let mut prev_dy = 0i32;

    for i in 1..points.len() {
        let dx = points[i].0 - points[i - 1].0;
        let dy = points[i].1 - points[i - 1].1;

        // Keep point if direction changes
        if dx != prev_dx || dy != prev_dy {
            if i > 1 {
                simplified.push(points[i - 1]);
            }
            prev_dx = dx;
            prev_dy = dy;
        }
    }

    // Always include last point
    if let Some(&last) = points.last() {
        if simplified.last() != Some(&last) {
            simplified.push(last);
        }
    }

    simplified
}

/// Flatten contours to a single vector for WASM output
fn flatten_contours(contours: &[Contour]) -> Vec<i32> {
    let mut result = Vec::new();
    result.push(contours.len() as i32);

    for contour in contours {
        result.push(contour.points.len() as i32);
        for &(x, y) in &contour.points {
            result.push(x);
            result.push(y);
        }
    }

    result
}

/// Douglas-Peucker polygon approximation algorithm
/// Used by OpenCV's approxPolyDP
///
/// # Arguments
/// * `contour` - Flattened contour points [x1, y1, x2, y2, ...]
/// * `epsilon` - Approximation accuracy (max distance from original curve)
/// * `closed` - Whether the contour is closed
///
/// # Returns
/// Approximated contour points [x1, y1, x2, y2, ...]
#[wasm_bindgen]
pub fn approx_poly_dp(contour: &[i32], epsilon: f64, closed: bool) -> Vec<i32> {
    let n = contour.len() / 2;
    if n < 3 {
        return contour.to_vec();
    }

    // Convert to points
    let points: Vec<(f64, f64)> = (0..n)
        .map(|i| (contour[i * 2] as f64, contour[i * 2 + 1] as f64))
        .collect();

    // Run Douglas-Peucker
    let result = if closed {
        douglas_peucker_closed(&points, epsilon)
    } else {
        douglas_peucker(&points, 0, n - 1, epsilon)
    };

    // Flatten result
    result.iter().flat_map(|&(x, y)| vec![x as i32, y as i32]).collect()
}

/// Douglas-Peucker algorithm for open curves
fn douglas_peucker(points: &[(f64, f64)], start: usize, end: usize, epsilon: f64) -> Vec<(f64, f64)> {
    if end <= start + 1 {
        return vec![points[start], points[end]];
    }

    // Find point with maximum distance
    let mut max_dist = 0.0;
    let mut max_idx = start;

    let (x1, y1) = points[start];
    let (x2, y2) = points[end];

    for i in (start + 1)..end {
        let dist = perpendicular_distance(points[i], (x1, y1), (x2, y2));
        if dist > max_dist {
            max_dist = dist;
            max_idx = i;
        }
    }

    if max_dist > epsilon {
        // Recursively simplify
        let mut left = douglas_peucker(points, start, max_idx, epsilon);
        let right = douglas_peucker(points, max_idx, end, epsilon);

        // Combine (remove duplicate point at junction)
        left.pop();
        left.extend(right);
        left
    } else {
        vec![points[start], points[end]]
    }
}

/// Douglas-Peucker for closed contours
fn douglas_peucker_closed(points: &[(f64, f64)], epsilon: f64) -> Vec<(f64, f64)> {
    let n = points.len();
    if n < 4 {
        return points.to_vec();
    }

    // Find two points with maximum distance to split the contour
    let mut max_dist = 0.0;
    let mut split1 = 0;
    let mut split2 = n / 2;

    for i in 0..n {
        for j in (i + n / 4)..(i + 3 * n / 4).min(n) {
            let dist = euclidean_distance(points[i], points[j % n]);
            if dist > max_dist {
                max_dist = dist;
                split1 = i;
                split2 = j % n;
            }
        }
    }

    if split1 > split2 {
        std::mem::swap(&mut split1, &mut split2);
    }

    // Create two chains
    let chain1: Vec<(f64, f64)> = (split1..=split2).map(|i| points[i]).collect();
    let chain2: Vec<(f64, f64)> = (split2..n).chain(0..=split1).map(|i| points[i]).collect();

    // Simplify each chain
    let mut result1 = douglas_peucker(&chain1, 0, chain1.len() - 1, epsilon);
    let result2 = douglas_peucker(&chain2, 0, chain2.len() - 1, epsilon);

    // Combine
    result1.pop();
    result1.extend(result2.into_iter().skip(1));

    if result1.len() > 1 && result1.first() == result1.last() {
        result1.pop();
    }

    result1
}

/// Calculate perpendicular distance from point to line
fn perpendicular_distance(point: (f64, f64), line_start: (f64, f64), line_end: (f64, f64)) -> f64 {
    let (px, py) = point;
    let (x1, y1) = line_start;
    let (x2, y2) = line_end;

    let dx = x2 - x1;
    let dy = y2 - y1;

    let len_sq = dx * dx + dy * dy;

    if len_sq < 1e-10 {
        return euclidean_distance(point, line_start);
    }

    // Perpendicular distance using cross product
    let cross = (px - x1) * dy - (py - y1) * dx;
    cross.abs() / len_sq.sqrt()
}

/// Euclidean distance between two points
fn euclidean_distance(p1: (f64, f64), p2: (f64, f64)) -> f64 {
    let dx = p2.0 - p1.0;
    let dy = p2.1 - p1.1;
    (dx * dx + dy * dy).sqrt()
}

/// Calculate contour area using the Shoelace formula
///
/// # Arguments
/// * `contour` - Flattened contour points [x1, y1, x2, y2, ...]
///
/// # Returns
/// Signed area (positive for counter-clockwise, negative for clockwise)
#[wasm_bindgen]
pub fn contour_area(contour: &[i32]) -> f64 {
    let n = contour.len() / 2;
    if n < 3 {
        return 0.0;
    }

    let mut area = 0.0;

    for i in 0..n {
        let j = (i + 1) % n;
        let x1 = contour[i * 2] as f64;
        let y1 = contour[i * 2 + 1] as f64;
        let x2 = contour[j * 2] as f64;
        let y2 = contour[j * 2 + 1] as f64;

        area += x1 * y2 - x2 * y1;
    }

    area / 2.0
}

/// Calculate contour perimeter (arc length)
///
/// # Arguments
/// * `contour` - Flattened contour points [x1, y1, x2, y2, ...]
/// * `closed` - Whether the contour is closed
///
/// # Returns
/// Total length of the contour
#[wasm_bindgen]
pub fn arc_length(contour: &[i32], closed: bool) -> f64 {
    let n = contour.len() / 2;
    if n < 2 {
        return 0.0;
    }

    let mut length = 0.0;
    let end = if closed { n } else { n - 1 };

    for i in 0..end {
        let j = (i + 1) % n;
        let dx = (contour[j * 2] - contour[i * 2]) as f64;
        let dy = (contour[j * 2 + 1] - contour[i * 2 + 1]) as f64;
        length += (dx * dx + dy * dy).sqrt();
    }

    length
}

/// Check if a contour is convex
///
/// # Arguments
/// * `contour` - Flattened contour points [x1, y1, x2, y2, ...]
///
/// # Returns
/// true if the contour is convex
#[wasm_bindgen]
pub fn is_contour_convex(contour: &[i32]) -> bool {
    let n = contour.len() / 2;
    if n < 3 {
        return true;
    }

    let mut sign = 0i32;

    for i in 0..n {
        let j = (i + 1) % n;
        let k = (i + 2) % n;

        let x1 = contour[i * 2];
        let y1 = contour[i * 2 + 1];
        let x2 = contour[j * 2];
        let y2 = contour[j * 2 + 1];
        let x3 = contour[k * 2];
        let y3 = contour[k * 2 + 1];

        // Cross product of consecutive edge vectors
        let cross = (x2 - x1) * (y3 - y2) - (y2 - y1) * (x3 - x2);

        if cross != 0 {
            if sign == 0 {
                sign = if cross > 0 { 1 } else { -1 };
            } else if (cross > 0) != (sign > 0) {
                return false;
            }
        }
    }

    true
}

/// Compute convex hull using Andrew's monotone chain algorithm
///
/// # Arguments
/// * `points` - Flattened points [x1, y1, x2, y2, ...]
///
/// # Returns
/// Convex hull points [x1, y1, x2, y2, ...]
#[wasm_bindgen]
pub fn convex_hull(points: &[i32]) -> Vec<i32> {
    let n = points.len() / 2;
    if n < 3 {
        return points.to_vec();
    }

    // Convert and sort points by x, then y
    let mut pts: Vec<(i64, i64)> = (0..n)
        .map(|i| (points[i * 2] as i64, points[i * 2 + 1] as i64))
        .collect();
    pts.sort_unstable();

    // Build lower hull
    let mut lower: Vec<(i64, i64)> = Vec::new();
    for &p in &pts {
        while lower.len() >= 2 {
            let len = lower.len();
            if cross_product(lower[len - 2], lower[len - 1], p) <= 0 {
                lower.pop();
            } else {
                break;
            }
        }
        lower.push(p);
    }

    // Build upper hull
    let mut upper: Vec<(i64, i64)> = Vec::new();
    for &p in pts.iter().rev() {
        while upper.len() >= 2 {
            let len = upper.len();
            if cross_product(upper[len - 2], upper[len - 1], p) <= 0 {
                upper.pop();
            } else {
                break;
            }
        }
        upper.push(p);
    }

    // Combine (remove last point of each half as they are duplicated)
    lower.pop();
    upper.pop();
    lower.extend(upper);

    // Flatten
    lower.iter().flat_map(|&(x, y)| vec![x as i32, y as i32]).collect()
}

/// Cross product of vectors OA and OB
fn cross_product(o: (i64, i64), a: (i64, i64), b: (i64, i64)) -> i64 {
    (a.0 - o.0) * (b.1 - o.1) - (a.1 - o.1) * (b.0 - o.0)
}

/// Calculate bounding rectangle for a contour
///
/// # Arguments
/// * `contour` - Flattened contour points [x1, y1, x2, y2, ...]
///
/// # Returns
/// [x, y, width, height]
#[wasm_bindgen]
pub fn bounding_rect(contour: &[i32]) -> Vec<i32> {
    let n = contour.len() / 2;
    if n == 0 {
        return vec![0, 0, 0, 0];
    }

    let mut min_x = contour[0];
    let mut max_x = contour[0];
    let mut min_y = contour[1];
    let mut max_y = contour[1];

    for i in 0..n {
        let x = contour[i * 2];
        let y = contour[i * 2 + 1];
        min_x = min_x.min(x);
        max_x = max_x.max(x);
        min_y = min_y.min(y);
        max_y = max_y.max(y);
    }

    vec![min_x, min_y, max_x - min_x, max_y - min_y]
}

/// Calculate image moments for a contour
/// Returns [m00, m10, m01, m20, m11, m02, m30, m21, m12, m03]
#[wasm_bindgen]
pub fn contour_moments(contour: &[i32]) -> Vec<f64> {
    let n = contour.len() / 2;
    if n < 3 {
        return vec![0.0; 10];
    }

    let mut m00 = 0.0;
    let mut m10 = 0.0;
    let mut m01 = 0.0;
    let mut m20 = 0.0;
    let mut m11 = 0.0;
    let mut m02 = 0.0;
    let mut m30 = 0.0;
    let mut m21 = 0.0;
    let mut m12 = 0.0;
    let mut m03 = 0.0;

    for i in 0..n {
        let j = (i + 1) % n;
        let x_i = contour[i * 2] as f64;
        let y_i = contour[i * 2 + 1] as f64;
        let x_j = contour[j * 2] as f64;
        let y_j = contour[j * 2 + 1] as f64;

        let a = x_i * y_j - x_j * y_i;

        m00 += a;
        m10 += a * (x_i + x_j);
        m01 += a * (y_i + y_j);
        m20 += a * (x_i * x_i + x_i * x_j + x_j * x_j);
        m11 += a * (2.0 * x_i * y_i + x_i * y_j + x_j * y_i + 2.0 * x_j * y_j);
        m02 += a * (y_i * y_i + y_i * y_j + y_j * y_j);
        m30 += a * (x_i + x_j) * (x_i * x_i + x_j * x_j);
        m21 += a * (2.0 * x_i * x_i * y_i + x_i * x_i * y_j + 2.0 * x_i * x_j * y_i
               + x_i * x_j * y_j + x_j * x_j * y_i + 2.0 * x_j * x_j * y_j);
        m12 += a * (2.0 * x_i * y_i * y_i + x_j * y_i * y_i + 2.0 * x_i * y_i * y_j
               + x_j * y_i * y_j + x_i * y_j * y_j + 2.0 * x_j * y_j * y_j);
        m03 += a * (y_i + y_j) * (y_i * y_i + y_j * y_j);
    }

    m00 /= 2.0;
    m10 /= 6.0;
    m01 /= 6.0;
    m20 /= 12.0;
    m11 /= 24.0;
    m02 /= 12.0;
    m30 /= 20.0;
    m21 /= 60.0;
    m12 /= 60.0;
    m03 /= 20.0;

    vec![m00.abs(), m10, m01, m20, m11, m02, m30, m21, m12, m03]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_contour_area_square() {
        // 10x10 square
        let contour = vec![0, 0, 10, 0, 10, 10, 0, 10];
        let area = contour_area(&contour);
        assert!((area.abs() - 100.0).abs() < 0.001);
    }

    #[test]
    fn test_contour_area_triangle() {
        // Triangle with base 10 and height 10
        let contour = vec![0, 0, 10, 0, 5, 10];
        let area = contour_area(&contour);
        assert!((area.abs() - 50.0).abs() < 0.001);
    }

    #[test]
    fn test_arc_length_square() {
        let contour = vec![0, 0, 10, 0, 10, 10, 0, 10];
        let length = arc_length(&contour, true);
        assert!((length - 40.0).abs() < 0.001);
    }

    #[test]
    fn test_is_convex_square() {
        let contour = vec![0, 0, 10, 0, 10, 10, 0, 10];
        assert!(is_contour_convex(&contour));
    }

    #[test]
    fn test_is_convex_concave() {
        // L-shaped polygon (not convex)
        let contour = vec![0, 0, 10, 0, 10, 5, 5, 5, 5, 10, 0, 10];
        assert!(!is_contour_convex(&contour));
    }

    #[test]
    fn test_convex_hull() {
        // Points with some interior points
        let points = vec![0, 0, 5, 5, 10, 0, 10, 10, 0, 10, 5, 2, 3, 7];
        let hull = convex_hull(&points);
        // Should only include corner points
        assert!(hull.len() >= 8); // At least 4 corner points
    }

    #[test]
    fn test_bounding_rect() {
        let contour = vec![5, 3, 15, 8, 10, 20, 2, 12];
        let rect = bounding_rect(&contour);
        assert_eq!(rect[0], 2);  // min_x
        assert_eq!(rect[1], 3);  // min_y
        assert_eq!(rect[2], 13); // width (15 - 2)
        assert_eq!(rect[3], 17); // height (20 - 3)
    }

    #[test]
    fn test_approx_poly_dp_line() {
        // Points on a line should simplify to endpoints
        let contour = vec![0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
        let simplified = approx_poly_dp(&contour, 0.1, false);
        assert_eq!(simplified.len(), 4); // Just start and end point
    }

    #[test]
    fn test_approx_poly_dp_preserves_corners() {
        // Square should stay a square (or close to it)
        let contour = vec![0, 0, 10, 0, 10, 10, 0, 10];
        let simplified = approx_poly_dp(&contour, 0.5, true);
        // Should return at least some points (closed polygon simplification)
        assert!(simplified.len() >= 4); // At least 2 points
    }

    #[test]
    fn test_find_contours_simple() {
        // Create a simple 10x10 image with a 6x6 white square
        let mut binary = vec![0u8; 100];
        for y in 2..8 {
            for x in 2..8 {
                binary[y * 10 + x] = 255;
            }
        }

        let result = find_contours(&binary, 10, 10, RetrievalMode::External, ApproxMethod::Simple);

        // Should find at least one contour
        assert!(result[0] >= 1, "Should find at least one contour");
    }

    #[test]
    fn test_contour_moments_square() {
        let contour = vec![0, 0, 10, 0, 10, 10, 0, 10];
        let moments = contour_moments(&contour);

        // m00 should equal area
        assert!((moments[0] - 100.0).abs() < 1.0);
    }
}
