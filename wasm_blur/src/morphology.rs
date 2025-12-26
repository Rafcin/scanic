use wasm_bindgen::prelude::*;

/// Enhanced Morphological Operations for Document Detection
///
/// These operations are essential for:
/// - Noise removal (opening)
/// - Gap filling in edges (closing)
/// - Edge enhancement
/// - Contour smoothing

/// Structuring element types
pub enum StructuringElement {
    Rectangle,
    Ellipse,
    Cross,
}

/// Create a rectangular structuring element
fn create_rect_element(width: usize, height: usize) -> Vec<u8> {
    vec![1u8; width * height]
}

/// Create an elliptical structuring element
fn create_ellipse_element(width: usize, height: usize) -> Vec<u8> {
    let mut element = vec![0u8; width * height];
    let cx = width as f32 / 2.0;
    let cy = height as f32 / 2.0;
    let rx = width as f32 / 2.0;
    let ry = height as f32 / 2.0;

    for y in 0..height {
        for x in 0..width {
            let dx = (x as f32 + 0.5 - cx) / rx;
            let dy = (y as f32 + 0.5 - cy) / ry;
            if dx * dx + dy * dy <= 1.0 {
                element[y * width + x] = 1;
            }
        }
    }

    element
}

/// Create a cross-shaped structuring element
fn create_cross_element(size: usize) -> Vec<u8> {
    let mut element = vec![0u8; size * size];
    let center = size / 2;

    // Vertical line
    for y in 0..size {
        element[y * size + center] = 1;
    }
    // Horizontal line
    for x in 0..size {
        element[center * size + x] = 1;
    }

    element
}

/// Erosion operation
/// Each pixel becomes the minimum of its neighborhood defined by the structuring element
#[wasm_bindgen]
pub fn erode(
    input: &[u8],
    width: usize,
    height: usize,
    kernel_size: usize,
    element_type: u8, // 0=rect, 1=ellipse, 2=cross
) -> Vec<u8> {
    let element = match element_type {
        1 => create_ellipse_element(kernel_size, kernel_size),
        2 => create_cross_element(kernel_size),
        _ => create_rect_element(kernel_size, kernel_size),
    };

    erode_with_element(input, width, height, &element, kernel_size, kernel_size)
}

/// Erosion with custom structuring element
pub fn erode_with_element(
    input: &[u8],
    width: usize,
    height: usize,
    element: &[u8],
    elem_width: usize,
    elem_height: usize,
) -> Vec<u8> {
    let mut output = vec![0u8; width * height];
    let half_w = elem_width / 2;
    let half_h = elem_height / 2;

    for y in 0..height {
        for x in 0..width {
            let mut min_val = 255u8;

            for ey in 0..elem_height {
                for ex in 0..elem_width {
                    if element[ey * elem_width + ex] == 0 {
                        continue;
                    }

                    let ny = (y as i32 + ey as i32 - half_h as i32).clamp(0, height as i32 - 1) as usize;
                    let nx = (x as i32 + ex as i32 - half_w as i32).clamp(0, width as i32 - 1) as usize;

                    let val = input[ny * width + nx];
                    if val < min_val {
                        min_val = val;
                    }
                }
            }

            output[y * width + x] = min_val;
        }
    }

    output
}

/// Dilation operation (enhanced version of existing)
/// Each pixel becomes the maximum of its neighborhood
#[wasm_bindgen]
pub fn dilate_enhanced(
    input: &[u8],
    width: usize,
    height: usize,
    kernel_size: usize,
    element_type: u8, // 0=rect, 1=ellipse, 2=cross
) -> Vec<u8> {
    let element = match element_type {
        1 => create_ellipse_element(kernel_size, kernel_size),
        2 => create_cross_element(kernel_size),
        _ => create_rect_element(kernel_size, kernel_size),
    };

    dilate_with_element(input, width, height, &element, kernel_size, kernel_size)
}

/// Dilation with custom structuring element
pub fn dilate_with_element(
    input: &[u8],
    width: usize,
    height: usize,
    element: &[u8],
    elem_width: usize,
    elem_height: usize,
) -> Vec<u8> {
    let mut output = vec![0u8; width * height];
    let half_w = elem_width / 2;
    let half_h = elem_height / 2;

    for y in 0..height {
        for x in 0..width {
            let mut max_val = 0u8;

            for ey in 0..elem_height {
                for ex in 0..elem_width {
                    if element[ey * elem_width + ex] == 0 {
                        continue;
                    }

                    let ny = (y as i32 + ey as i32 - half_h as i32).clamp(0, height as i32 - 1) as usize;
                    let nx = (x as i32 + ex as i32 - half_w as i32).clamp(0, width as i32 - 1) as usize;

                    let val = input[ny * width + nx];
                    if val > max_val {
                        max_val = val;
                    }
                }
            }

            output[y * width + x] = max_val;
        }
    }

    output
}

/// Morphological opening (erosion followed by dilation)
/// Removes small bright spots (noise) while preserving shape
#[wasm_bindgen]
pub fn morphological_open(
    input: &[u8],
    width: usize,
    height: usize,
    kernel_size: usize,
    element_type: u8,
) -> Vec<u8> {
    let eroded = erode(input, width, height, kernel_size, element_type);
    dilate_enhanced(&eroded, width, height, kernel_size, element_type)
}

/// Morphological closing (dilation followed by erosion)
/// Fills small dark holes while preserving shape
/// Excellent for closing gaps in document edges
#[wasm_bindgen]
pub fn morphological_close(
    input: &[u8],
    width: usize,
    height: usize,
    kernel_size: usize,
    element_type: u8,
) -> Vec<u8> {
    let dilated = dilate_enhanced(input, width, height, kernel_size, element_type);
    erode(&dilated, width, height, kernel_size, element_type)
}

/// Morphological gradient (dilation - erosion)
/// Highlights edges
#[wasm_bindgen]
pub fn morphological_gradient(
    input: &[u8],
    width: usize,
    height: usize,
    kernel_size: usize,
    element_type: u8,
) -> Vec<u8> {
    let dilated = dilate_enhanced(input, width, height, kernel_size, element_type);
    let eroded = erode(input, width, height, kernel_size, element_type);

    let mut output = vec![0u8; width * height];
    for i in 0..output.len() {
        output[i] = dilated[i].saturating_sub(eroded[i]);
    }

    output
}

/// Top-hat transform (original - opening)
/// Extracts bright features smaller than the structuring element
#[wasm_bindgen]
pub fn top_hat(
    input: &[u8],
    width: usize,
    height: usize,
    kernel_size: usize,
    element_type: u8,
) -> Vec<u8> {
    let opened = morphological_open(input, width, height, kernel_size, element_type);

    let mut output = vec![0u8; width * height];
    for i in 0..output.len() {
        output[i] = input[i].saturating_sub(opened[i]);
    }

    output
}

/// Black-hat transform (closing - original)
/// Extracts dark features smaller than the structuring element
#[wasm_bindgen]
pub fn black_hat(
    input: &[u8],
    width: usize,
    height: usize,
    kernel_size: usize,
    element_type: u8,
) -> Vec<u8> {
    let closed = morphological_close(input, width, height, kernel_size, element_type);

    let mut output = vec![0u8; width * height];
    for i in 0..output.len() {
        output[i] = closed[i].saturating_sub(input[i]);
    }

    output
}

/// Hit-or-miss transform for detecting specific patterns
/// Useful for finding corners and line endpoints
#[wasm_bindgen]
pub fn hit_or_miss(
    input: &[u8],
    width: usize,
    height: usize,
    hit_element: &[u8],    // Must-match pattern
    miss_element: &[u8],   // Must-not-match pattern
    elem_size: usize,
) -> Vec<u8> {
    // Erode with hit element
    let hit_eroded = erode_with_element(input, width, height, hit_element, elem_size, elem_size);

    // Create complement of input
    let mut complement = vec![0u8; width * height];
    for i in 0..complement.len() {
        complement[i] = 255 - input[i];
    }

    // Erode complement with miss element
    let miss_eroded = erode_with_element(&complement, width, height, miss_element, elem_size, elem_size);

    // Intersection
    let mut output = vec![0u8; width * height];
    for i in 0..output.len() {
        output[i] = hit_eroded[i].min(miss_eroded[i]);
    }

    output
}

/// Skeletonization using morphological operations
/// Useful for finding the central line of thick edges
#[wasm_bindgen]
pub fn skeletonize(
    input: &[u8],
    width: usize,
    height: usize,
    max_iterations: usize,
) -> Vec<u8> {
    let mut current = input.to_vec();
    let mut skeleton = vec![0u8; width * height];
    let element = create_cross_element(3);

    for _ in 0..max_iterations {
        // Erode
        let eroded = erode_with_element(&current, width, height, &element, 3, 3);

        // Open
        let opened = dilate_with_element(&eroded, width, height, &element, 3, 3);

        // Subtract: current - opened
        let mut subtracted = vec![0u8; width * height];
        for i in 0..subtracted.len() {
            subtracted[i] = current[i].saturating_sub(opened[i]);
        }

        // Union with skeleton
        for i in 0..skeleton.len() {
            skeleton[i] = skeleton[i].max(subtracted[i]);
        }

        // Check if eroded is empty
        let sum: u32 = eroded.iter().map(|&x| x as u32).sum();
        if sum == 0 {
            break;
        }

        current = eroded;
    }

    skeleton
}

/// Close gaps in edge lines
/// Specialized for document edge enhancement
#[wasm_bindgen]
pub fn close_edge_gaps(
    edges: &[u8],
    width: usize,
    height: usize,
    gap_size: usize,
) -> Vec<u8> {
    // Use directional closing to preserve edge direction

    // Horizontal closing
    let h_element = create_rect_element(gap_size, 1);
    let h_closed = {
        let dilated = dilate_with_element(edges, width, height, &h_element, gap_size, 1);
        erode_with_element(&dilated, width, height, &h_element, gap_size, 1)
    };

    // Vertical closing
    let v_element = create_rect_element(1, gap_size);
    let v_closed = {
        let dilated = dilate_with_element(edges, width, height, &v_element, 1, gap_size);
        erode_with_element(&dilated, width, height, &v_element, 1, gap_size)
    };

    // Diagonal closing (45°)
    let mut d1_element = vec![0u8; gap_size * gap_size];
    for i in 0..gap_size {
        d1_element[i * gap_size + i] = 1;
    }
    let d1_closed = {
        let dilated = dilate_with_element(edges, width, height, &d1_element, gap_size, gap_size);
        erode_with_element(&dilated, width, height, &d1_element, gap_size, gap_size)
    };

    // Diagonal closing (135°)
    let mut d2_element = vec![0u8; gap_size * gap_size];
    for i in 0..gap_size {
        d2_element[i * gap_size + (gap_size - 1 - i)] = 1;
    }
    let d2_closed = {
        let dilated = dilate_with_element(edges, width, height, &d2_element, gap_size, gap_size);
        erode_with_element(&dilated, width, height, &d2_element, gap_size, gap_size)
    };

    // Combine all directions
    let mut output = vec![0u8; width * height];
    for i in 0..output.len() {
        output[i] = edges[i]
            .max(h_closed[i])
            .max(v_closed[i])
            .max(d1_closed[i])
            .max(d2_closed[i]);
    }

    output
}

/// Remove small connected components (noise)
/// Keeps only components larger than min_area
#[wasm_bindgen]
pub fn remove_small_components(
    binary: &[u8],
    width: usize,
    height: usize,
    min_area: usize,
) -> Vec<u8> {
    let mut labels = vec![0u32; width * height];
    let mut label_areas: Vec<usize> = vec![0]; // label 0 is background
    let mut current_label = 0u32;

    // First pass: label connected components using flood fill
    for y in 0..height {
        for x in 0..width {
            let idx = y * width + x;
            if binary[idx] > 0 && labels[idx] == 0 {
                current_label += 1;
                let area = flood_fill(&binary, &mut labels, width, height, x, y, current_label);
                label_areas.push(area);
            }
        }
    }

    // Second pass: keep only large components
    let mut output = vec![0u8; width * height];
    for i in 0..output.len() {
        let label = labels[i] as usize;
        if label > 0 && label_areas[label] >= min_area {
            output[i] = 255;
        }
    }

    output
}

/// Flood fill helper for connected component labeling
fn flood_fill(
    binary: &[u8],
    labels: &mut [u32],
    width: usize,
    height: usize,
    start_x: usize,
    start_y: usize,
    label: u32,
) -> usize {
    let mut stack = vec![(start_x, start_y)];
    let mut area = 0usize;

    while let Some((x, y)) = stack.pop() {
        let idx = y * width + x;

        if labels[idx] != 0 || binary[idx] == 0 {
            continue;
        }

        labels[idx] = label;
        area += 1;

        // 8-connectivity
        for dy in -1i32..=1 {
            for dx in -1i32..=1 {
                if dx == 0 && dy == 0 {
                    continue;
                }
                let nx = x as i32 + dx;
                let ny = y as i32 + dy;

                if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                    let nidx = ny as usize * width + nx as usize;
                    if labels[nidx] == 0 && binary[nidx] > 0 {
                        stack.push((nx as usize, ny as usize));
                    }
                }
            }
        }
    }

    area
}

/// Thin edges to single pixel width
/// Uses Zhang-Suen thinning algorithm
#[wasm_bindgen]
pub fn thin_edges(
    binary: &[u8],
    width: usize,
    height: usize,
) -> Vec<u8> {
    let mut current: Vec<bool> = binary.iter().map(|&b| b > 0).collect();
    let mut changed = true;

    while changed {
        changed = false;

        // Sub-iteration 1
        let to_remove1 = zhang_suen_iteration(&current, width, height, true);
        for &idx in &to_remove1 {
            if current[idx] {
                current[idx] = false;
                changed = true;
            }
        }

        // Sub-iteration 2
        let to_remove2 = zhang_suen_iteration(&current, width, height, false);
        for &idx in &to_remove2 {
            if current[idx] {
                current[idx] = false;
                changed = true;
            }
        }
    }

    current.iter().map(|&b| if b { 255u8 } else { 0u8 }).collect()
}

/// Zhang-Suen thinning iteration
fn zhang_suen_iteration(
    image: &[bool],
    width: usize,
    height: usize,
    first_subiteration: bool,
) -> Vec<usize> {
    let mut to_remove = Vec::new();

    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let idx = y * width + x;

            if !image[idx] {
                continue;
            }

            // Get 8 neighbors (P2..P9 in clockwise order starting from top)
            let p2 = image[(y - 1) * width + x] as u8;
            let p3 = image[(y - 1) * width + x + 1] as u8;
            let p4 = image[y * width + x + 1] as u8;
            let p5 = image[(y + 1) * width + x + 1] as u8;
            let p6 = image[(y + 1) * width + x] as u8;
            let p7 = image[(y + 1) * width + x - 1] as u8;
            let p8 = image[y * width + x - 1] as u8;
            let p9 = image[(y - 1) * width + x - 1] as u8;

            // Count non-zero neighbors (B)
            let b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;

            // Count 0->1 transitions (A)
            let neighbors = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
            let a: u8 = neighbors.windows(2).map(|w| if w[0] == 0 && w[1] == 1 { 1 } else { 0 }).sum();

            // Conditions
            let cond1 = b >= 2 && b <= 6;
            let cond2 = a == 1;

            let cond3 = if first_subiteration {
                p2 * p4 * p6 == 0
            } else {
                p2 * p4 * p8 == 0
            };

            let cond4 = if first_subiteration {
                p4 * p6 * p8 == 0
            } else {
                p2 * p6 * p8 == 0
            };

            if cond1 && cond2 && cond3 && cond4 {
                to_remove.push(idx);
            }
        }
    }

    to_remove
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_erode_dilate() {
        // Create a small white square in center
        let mut input = vec![0u8; 10 * 10];
        for y in 3..7 {
            for x in 3..7 {
                input[y * 10 + x] = 255;
            }
        }

        // Erode should shrink it
        let eroded = erode(&input, 10, 10, 3, 0);
        let eroded_sum: u32 = eroded.iter().map(|&x| x as u32).sum();

        let input_sum: u32 = input.iter().map(|&x| x as u32).sum();
        assert!(eroded_sum < input_sum, "Erosion should reduce white area");

        // Dilate eroded should roughly restore
        let restored = dilate_enhanced(&eroded, 10, 10, 3, 0);
        let restored_sum: u32 = restored.iter().map(|&x| x as u32).sum();
        assert!(restored_sum > eroded_sum, "Dilation should increase white area");
    }

    #[test]
    fn test_close_gaps() {
        // Create two separate lines with a gap
        let mut input = vec![0u8; 10 * 10];
        for x in 0..3 {
            input[5 * 10 + x] = 255;
        }
        for x in 5..10 {
            input[5 * 10 + x] = 255;
        }

        let closed = close_edge_gaps(&input, 10, 10, 5);

        // Gap should be filled
        assert!(closed[5 * 10 + 4] > 0, "Gap should be filled");
    }
}
