use wasm_bindgen::prelude::*;

/// Perspective Transform Module
/// Implements OpenCV's getPerspectiveTransform and warpPerspective algorithms
/// for high-quality document extraction with bilinear/bicubic interpolation.

/// Compute 3x3 perspective transformation matrix from 4 source to 4 destination points
/// Equivalent to OpenCV's getPerspectiveTransform
///
/// # Arguments
/// * `src` - Source quadrilateral points [x1,y1, x2,y2, x3,y3, x4,y4]
/// * `dst` - Destination quadrilateral points [x1,y1, x2,y2, x3,y3, x4,y4]
///
/// # Returns
/// 3x3 transformation matrix as flat array [m00,m01,m02, m10,m11,m12, m20,m21,m22]
#[wasm_bindgen]
pub fn get_perspective_transform(src: &[f64], dst: &[f64]) -> Vec<f64> {
    // Solve the system of linear equations for perspective transform
    // For each point pair (x,y) -> (x',y'):
    // x' = (m00*x + m01*y + m02) / (m20*x + m21*y + 1)
    // y' = (m10*x + m11*y + m12) / (m20*x + m21*y + 1)

    // Set up 8x8 matrix equation A * h = b
    // where h = [m00, m01, m02, m10, m11, m12, m20, m21]

    let mut a = [[0.0f64; 8]; 8];
    let mut b = [0.0f64; 8];

    for i in 0..4 {
        let sx = src[i * 2];
        let sy = src[i * 2 + 1];
        let dx = dst[i * 2];
        let dy = dst[i * 2 + 1];

        // For x' equation
        a[i * 2][0] = sx;
        a[i * 2][1] = sy;
        a[i * 2][2] = 1.0;
        a[i * 2][3] = 0.0;
        a[i * 2][4] = 0.0;
        a[i * 2][5] = 0.0;
        a[i * 2][6] = -dx * sx;
        a[i * 2][7] = -dx * sy;
        b[i * 2] = dx;

        // For y' equation
        a[i * 2 + 1][0] = 0.0;
        a[i * 2 + 1][1] = 0.0;
        a[i * 2 + 1][2] = 0.0;
        a[i * 2 + 1][3] = sx;
        a[i * 2 + 1][4] = sy;
        a[i * 2 + 1][5] = 1.0;
        a[i * 2 + 1][6] = -dy * sx;
        a[i * 2 + 1][7] = -dy * sy;
        b[i * 2 + 1] = dy;
    }

    // Solve using Gaussian elimination with partial pivoting
    let h = solve_linear_system(&mut a, &mut b);

    // Return as 3x3 matrix
    vec![
        h[0], h[1], h[2],
        h[3], h[4], h[5],
        h[6], h[7], 1.0,
    ]
}

/// Solve 8x8 linear system using Gaussian elimination with partial pivoting
fn solve_linear_system(a: &mut [[f64; 8]; 8], b: &mut [f64; 8]) -> [f64; 8] {
    let n = 8;

    // Forward elimination with partial pivoting
    for col in 0..n {
        // Find pivot
        let mut max_row = col;
        let mut max_val = a[col][col].abs();

        for row in (col + 1)..n {
            if a[row][col].abs() > max_val {
                max_val = a[row][col].abs();
                max_row = row;
            }
        }

        // Swap rows
        if max_row != col {
            a.swap(col, max_row);
            b.swap(col, max_row);
        }

        // Check for singular matrix
        if a[col][col].abs() < 1e-10 {
            continue;
        }

        // Eliminate column
        for row in (col + 1)..n {
            let factor = a[row][col] / a[col][col];
            for k in col..n {
                a[row][k] -= factor * a[col][k];
            }
            b[row] -= factor * b[col];
        }
    }

    // Back substitution
    let mut x = [0.0f64; 8];
    for i in (0..n).rev() {
        let mut sum = b[i];
        for j in (i + 1)..n {
            sum -= a[i][j] * x[j];
        }
        if a[i][i].abs() > 1e-10 {
            x[i] = sum / a[i][i];
        }
    }

    x
}

/// Invert a 3x3 perspective transformation matrix
#[wasm_bindgen]
pub fn invert_perspective_matrix(matrix: &[f64]) -> Vec<f64> {
    let m = matrix;

    // Calculate determinant
    let det = m[0] * (m[4] * m[8] - m[5] * m[7])
            - m[1] * (m[3] * m[8] - m[5] * m[6])
            + m[2] * (m[3] * m[7] - m[4] * m[6]);

    if det.abs() < 1e-10 {
        // Return identity if singular
        return vec![1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];
    }

    let inv_det = 1.0 / det;

    // Calculate adjugate matrix
    vec![
        (m[4] * m[8] - m[5] * m[7]) * inv_det,
        (m[2] * m[7] - m[1] * m[8]) * inv_det,
        (m[1] * m[5] - m[2] * m[4]) * inv_det,
        (m[5] * m[6] - m[3] * m[8]) * inv_det,
        (m[0] * m[8] - m[2] * m[6]) * inv_det,
        (m[2] * m[3] - m[0] * m[5]) * inv_det,
        (m[3] * m[7] - m[4] * m[6]) * inv_det,
        (m[1] * m[6] - m[0] * m[7]) * inv_det,
        (m[0] * m[4] - m[1] * m[3]) * inv_det,
    ]
}

/// Apply perspective transformation to warp an image
/// Equivalent to OpenCV's warpPerspective with bilinear interpolation
///
/// # Arguments
/// * `src` - Source image pixels (grayscale or RGBA flattened)
/// * `src_width` - Source image width
/// * `src_height` - Source image height
/// * `matrix` - 3x3 perspective transformation matrix
/// * `dst_width` - Destination image width
/// * `dst_height` - Destination image height
/// * `channels` - Number of color channels (1 for grayscale, 4 for RGBA)
///
/// # Returns
/// Warped image pixels
#[wasm_bindgen]
pub fn warp_perspective(
    src: &[u8],
    src_width: usize,
    src_height: usize,
    matrix: &[f64],
    dst_width: usize,
    dst_height: usize,
    channels: usize,
) -> Vec<u8> {
    // Invert matrix (we need to map from dst to src)
    let inv = invert_perspective_matrix(matrix);

    let mut dst = vec![0u8; dst_width * dst_height * channels];

    for dy in 0..dst_height {
        for dx in 0..dst_width {
            let dx_f = dx as f64;
            let dy_f = dy as f64;

            // Apply inverse transform: (dx, dy) -> (sx, sy)
            let w = inv[6] * dx_f + inv[7] * dy_f + inv[8];

            if w.abs() < 1e-10 {
                continue;
            }

            let sx = (inv[0] * dx_f + inv[1] * dy_f + inv[2]) / w;
            let sy = (inv[3] * dx_f + inv[4] * dy_f + inv[5]) / w;

            // Bilinear interpolation
            if sx >= 0.0 && sx < (src_width - 1) as f64 && sy >= 0.0 && sy < (src_height - 1) as f64 {
                let x0 = sx.floor() as usize;
                let y0 = sy.floor() as usize;
                let x1 = x0 + 1;
                let y1 = y0 + 1;

                let fx = sx - x0 as f64;
                let fy = sy - y0 as f64;

                for c in 0..channels {
                    let p00 = src[(y0 * src_width + x0) * channels + c] as f64;
                    let p10 = src[(y0 * src_width + x1) * channels + c] as f64;
                    let p01 = src[(y1 * src_width + x0) * channels + c] as f64;
                    let p11 = src[(y1 * src_width + x1) * channels + c] as f64;

                    let value = p00 * (1.0 - fx) * (1.0 - fy)
                              + p10 * fx * (1.0 - fy)
                              + p01 * (1.0 - fx) * fy
                              + p11 * fx * fy;

                    dst[(dy * dst_width + dx) * channels + c] = value.round().clamp(0.0, 255.0) as u8;
                }
            }
        }
    }

    dst
}

/// Apply perspective transformation with bicubic interpolation for higher quality
#[wasm_bindgen]
pub fn warp_perspective_bicubic(
    src: &[u8],
    src_width: usize,
    src_height: usize,
    matrix: &[f64],
    dst_width: usize,
    dst_height: usize,
    channels: usize,
) -> Vec<u8> {
    let inv = invert_perspective_matrix(matrix);
    let mut dst = vec![0u8; dst_width * dst_height * channels];

    for dy in 0..dst_height {
        for dx in 0..dst_width {
            let dx_f = dx as f64;
            let dy_f = dy as f64;

            let w = inv[6] * dx_f + inv[7] * dy_f + inv[8];

            if w.abs() < 1e-10 {
                continue;
            }

            let sx = (inv[0] * dx_f + inv[1] * dy_f + inv[2]) / w;
            let sy = (inv[3] * dx_f + inv[4] * dy_f + inv[5]) / w;

            // Need 2 pixels of padding for bicubic
            if sx >= 1.0 && sx < (src_width - 2) as f64 && sy >= 1.0 && sy < (src_height - 2) as f64 {
                for c in 0..channels {
                    let value = bicubic_sample(src, src_width, src_height, channels, sx, sy, c);
                    dst[(dy * dst_width + dx) * channels + c] = value.round().clamp(0.0, 255.0) as u8;
                }
            }
        }
    }

    dst
}

/// Bicubic interpolation kernel
fn cubic_weight(t: f64) -> f64 {
    let t = t.abs();
    if t < 1.0 {
        (1.5 * t - 2.5) * t * t + 1.0
    } else if t < 2.0 {
        ((-0.5 * t + 2.5) * t - 4.0) * t + 2.0
    } else {
        0.0
    }
}

/// Sample with bicubic interpolation
fn bicubic_sample(
    src: &[u8],
    width: usize,
    height: usize,
    channels: usize,
    x: f64,
    y: f64,
    channel: usize,
) -> f64 {
    let x0 = x.floor() as i32;
    let y0 = y.floor() as i32;

    let fx = x - x0 as f64;
    let fy = y - y0 as f64;

    let mut sum = 0.0;
    let mut weight_sum = 0.0;

    for j in -1..=2 {
        let wy = cubic_weight(fy - j as f64);
        let py = (y0 + j).clamp(0, height as i32 - 1) as usize;

        for i in -1..=2 {
            let wx = cubic_weight(fx - i as f64);
            let px = (x0 + i).clamp(0, width as i32 - 1) as usize;

            let weight = wx * wy;
            let pixel = src[(py * width + px) * channels + channel] as f64;

            sum += pixel * weight;
            weight_sum += weight;
        }
    }

    if weight_sum > 0.0 {
        sum / weight_sum
    } else {
        0.0
    }
}

/// Calculate optimal output dimensions for a document warp
/// based on the source quadrilateral
///
/// # Arguments
/// * `corners` - Document corners [tl_x,tl_y, tr_x,tr_y, br_x,br_y, bl_x,bl_y]
/// * `aspect_ratio` - Optional forced aspect ratio (0 = auto-detect)
///
/// # Returns
/// [width, height]
#[wasm_bindgen]
pub fn calculate_output_size(corners: &[f64], aspect_ratio: f64) -> Vec<f64> {
    // Calculate edge lengths
    let top_width = ((corners[2] - corners[0]).powi(2) + (corners[3] - corners[1]).powi(2)).sqrt();
    let bottom_width = ((corners[4] - corners[6]).powi(2) + (corners[5] - corners[7]).powi(2)).sqrt();
    let left_height = ((corners[6] - corners[0]).powi(2) + (corners[7] - corners[1]).powi(2)).sqrt();
    let right_height = ((corners[4] - corners[2]).powi(2) + (corners[5] - corners[3]).powi(2)).sqrt();

    // Use average dimensions
    let avg_width = (top_width + bottom_width) / 2.0;
    let avg_height = (left_height + right_height) / 2.0;

    if aspect_ratio > 0.0 {
        // Use forced aspect ratio
        let detected_ratio = avg_width / avg_height;

        if detected_ratio > aspect_ratio {
            // Width is limiting factor
            vec![avg_width.round(), (avg_width / aspect_ratio).round()]
        } else {
            // Height is limiting factor
            vec![(avg_height * aspect_ratio).round(), avg_height.round()]
        }
    } else {
        vec![avg_width.round(), avg_height.round()]
    }
}

/// Warp document using corner points
/// Convenience function that computes transform and warps in one call
///
/// # Arguments
/// * `src` - Source image pixels (RGBA)
/// * `src_width` - Source image width
/// * `src_height` - Source image height
/// * `corners` - Document corners [tl_x,tl_y, tr_x,tr_y, br_x,br_y, bl_x,bl_y]
/// * `dst_width` - Output width (0 = auto)
/// * `dst_height` - Output height (0 = auto)
/// * `use_bicubic` - Use bicubic interpolation for higher quality
///
/// # Returns
/// Warped document pixels (RGBA)
#[wasm_bindgen]
pub fn warp_document(
    src: &[u8],
    src_width: usize,
    src_height: usize,
    corners: &[f64],
    dst_width: usize,
    dst_height: usize,
    use_bicubic: bool,
) -> Vec<u8> {
    // Determine output size
    let (out_width, out_height) = if dst_width == 0 || dst_height == 0 {
        let size = calculate_output_size(corners, 0.0);
        (size[0] as usize, size[1] as usize)
    } else {
        (dst_width, dst_height)
    };

    // Create destination corners (rectangular)
    let dst_corners = vec![
        0.0, 0.0,                               // top-left
        out_width as f64 - 1.0, 0.0,            // top-right
        out_width as f64 - 1.0, out_height as f64 - 1.0, // bottom-right
        0.0, out_height as f64 - 1.0,           // bottom-left
    ];

    // Get transformation matrix
    let matrix = get_perspective_transform(corners, &dst_corners);

    // Warp the image
    if use_bicubic {
        warp_perspective_bicubic(src, src_width, src_height, &matrix, out_width, out_height, 4)
    } else {
        warp_perspective(src, src_width, src_height, &matrix, out_width, out_height, 4)
    }
}

/// Apply affine transformation (subset of perspective - no keystone correction)
#[wasm_bindgen]
pub fn get_affine_transform(src: &[f64], dst: &[f64]) -> Vec<f64> {
    // For 3 points, solve for 2x3 affine matrix
    // x' = m00*x + m01*y + m02
    // y' = m10*x + m11*y + m12

    let mut a = [[0.0f64; 6]; 6];
    let mut b = [0.0f64; 6];

    for i in 0..3 {
        a[i * 2][0] = src[i * 2];
        a[i * 2][1] = src[i * 2 + 1];
        a[i * 2][2] = 1.0;
        b[i * 2] = dst[i * 2];

        a[i * 2 + 1][3] = src[i * 2];
        a[i * 2 + 1][4] = src[i * 2 + 1];
        a[i * 2 + 1][5] = 1.0;
        b[i * 2 + 1] = dst[i * 2 + 1];
    }

    // Solve using simplified Gaussian elimination
    let m = solve_affine_system(&mut a, &mut b);

    // Return as 2x3 matrix
    vec![m[0], m[1], m[2], m[3], m[4], m[5]]
}

fn solve_affine_system(a: &mut [[f64; 6]; 6], b: &mut [f64; 6]) -> [f64; 6] {
    let n = 6;

    for col in 0..n {
        let mut max_row = col;
        for row in (col + 1)..n {
            if a[row][col].abs() > a[max_row][col].abs() {
                max_row = row;
            }
        }

        if max_row != col {
            a.swap(col, max_row);
            b.swap(col, max_row);
        }

        if a[col][col].abs() < 1e-10 {
            continue;
        }

        for row in (col + 1)..n {
            let factor = a[row][col] / a[col][col];
            for k in col..n {
                a[row][k] -= factor * a[col][k];
            }
            b[row] -= factor * b[col];
        }
    }

    let mut x = [0.0f64; 6];
    for i in (0..n).rev() {
        let mut sum = b[i];
        for j in (i + 1)..n {
            sum -= a[i][j] * x[j];
        }
        if a[i][i].abs() > 1e-10 {
            x[i] = sum / a[i][i];
        }
    }

    x
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_identity_transform() {
        // Points that should result in identity matrix
        let src = vec![0.0, 0.0, 100.0, 0.0, 100.0, 100.0, 0.0, 100.0];
        let dst = vec![0.0, 0.0, 100.0, 0.0, 100.0, 100.0, 0.0, 100.0];

        let matrix = get_perspective_transform(&src, &dst);

        // Should be close to identity
        assert!((matrix[0] - 1.0).abs() < 0.001);
        assert!(matrix[1].abs() < 0.001);
        assert!(matrix[2].abs() < 0.001);
        assert!(matrix[3].abs() < 0.001);
        assert!((matrix[4] - 1.0).abs() < 0.001);
        assert!(matrix[5].abs() < 0.001);
    }

    #[test]
    fn test_translation_transform() {
        let src = vec![0.0, 0.0, 100.0, 0.0, 100.0, 100.0, 0.0, 100.0];
        let dst = vec![50.0, 50.0, 150.0, 50.0, 150.0, 150.0, 50.0, 150.0];

        let matrix = get_perspective_transform(&src, &dst);

        // Translation should be in m02 and m12
        assert!((matrix[2] - 50.0).abs() < 0.1);
        assert!((matrix[5] - 50.0).abs() < 0.1);
    }

    #[test]
    fn test_scale_transform() {
        let src = vec![0.0, 0.0, 100.0, 0.0, 100.0, 100.0, 0.0, 100.0];
        let dst = vec![0.0, 0.0, 200.0, 0.0, 200.0, 200.0, 0.0, 200.0];

        let matrix = get_perspective_transform(&src, &dst);

        // Scale should be 2x
        assert!((matrix[0] - 2.0).abs() < 0.01);
        assert!((matrix[4] - 2.0).abs() < 0.01);
    }

    #[test]
    fn test_matrix_inversion() {
        let matrix = vec![
            2.0, 0.0, 10.0,
            0.0, 2.0, 20.0,
            0.0, 0.0, 1.0,
        ];

        let inv = invert_perspective_matrix(&matrix);

        // inv * matrix should be identity
        assert!((inv[0] - 0.5).abs() < 0.001);
        assert!((inv[4] - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_output_size_calculation() {
        // 100x100 square rotated slightly
        let corners = vec![
            10.0, 0.0,   // top-left
            110.0, 10.0, // top-right
            100.0, 110.0, // bottom-right
            0.0, 100.0,  // bottom-left
        ];

        let size = calculate_output_size(&corners, 0.0);

        // Should be approximately 100x100
        assert!(size[0] > 90.0 && size[0] < 110.0);
        assert!(size[1] > 90.0 && size[1] < 110.0);
    }

    #[test]
    fn test_warp_perspective_simple() {
        // Create a simple 4x4 grayscale image
        let src = vec![
            100, 100, 150, 150,
            100, 100, 150, 150,
            200, 200, 250, 250,
            200, 200, 250, 250,
        ];

        // Identity transform
        let matrix = vec![
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0,
        ];

        let result = warp_perspective(&src, 4, 4, &matrix, 4, 4, 1);

        // Should be similar to input
        assert_eq!(result.len(), 16);
        assert!(result[0] > 90 && result[0] < 110);
    }

    #[test]
    fn test_affine_transform() {
        let src = vec![0.0, 0.0, 100.0, 0.0, 0.0, 100.0];
        let dst = vec![0.0, 0.0, 100.0, 0.0, 0.0, 100.0];

        let matrix = get_affine_transform(&src, &dst);

        // Should be identity affine
        assert!((matrix[0] - 1.0).abs() < 0.001);
        assert!((matrix[4] - 1.0).abs() < 0.001);
    }
}
