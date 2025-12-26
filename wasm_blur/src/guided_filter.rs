use wasm_bindgen::prelude::*;

/// Guided Filter Module
/// Implements the edge-aware guided filter (He et al., 2010, updated 2013)
/// This is faster than bilateral filter with O(1) complexity regardless of radius.
///
/// Modern improvements include:
/// - Fast box filter using integral images
/// - Multi-scale guided filtering
/// - Color guidance support

/// Fast guided filter for edge-preserving smoothing
/// O(1) complexity regardless of radius - much faster than bilateral filter
///
/// # Arguments
/// * `input` - Input image to filter (grayscale)
/// * `guide` - Guide image for edge preservation (can be same as input)
/// * `width` - Image width
/// * `height` - Image height
/// * `radius` - Filter radius
/// * `eps` - Regularization parameter (higher = more smoothing)
///
/// # Returns
/// Filtered image
#[wasm_bindgen]
pub fn guided_filter(
    input: &[u8],
    guide: &[u8],
    width: usize,
    height: usize,
    radius: usize,
    eps: f64,
) -> Vec<u8> {
    let n = width * height;

    // Convert to f64 for precision
    let p: Vec<f64> = input.iter().map(|&x| x as f64 / 255.0).collect();
    let i: Vec<f64> = guide.iter().map(|&x| x as f64 / 255.0).collect();

    // Compute means using box filter
    let mean_i = box_filter_f64(&i, width, height, radius);
    let mean_p = box_filter_f64(&p, width, height, radius);

    // Compute correlations
    let ip: Vec<f64> = (0..n).map(|idx| i[idx] * p[idx]).collect();
    let ii: Vec<f64> = (0..n).map(|idx| i[idx] * i[idx]).collect();

    let mean_ip = box_filter_f64(&ip, width, height, radius);
    let mean_ii = box_filter_f64(&ii, width, height, radius);

    // Compute covariance and variance
    let cov_ip: Vec<f64> = (0..n).map(|idx| mean_ip[idx] - mean_i[idx] * mean_p[idx]).collect();
    let var_i: Vec<f64> = (0..n).map(|idx| mean_ii[idx] - mean_i[idx] * mean_i[idx]).collect();

    // Compute linear coefficients a, b
    let a: Vec<f64> = (0..n).map(|idx| cov_ip[idx] / (var_i[idx] + eps)).collect();
    let b: Vec<f64> = (0..n).map(|idx| mean_p[idx] - a[idx] * mean_i[idx]).collect();

    // Average coefficients
    let mean_a = box_filter_f64(&a, width, height, radius);
    let mean_b = box_filter_f64(&b, width, height, radius);

    // Output: q = mean_a * I + mean_b
    (0..n)
        .map(|idx| {
            let val = mean_a[idx] * i[idx] + mean_b[idx];
            (val * 255.0).clamp(0.0, 255.0) as u8
        })
        .collect()
}

/// Fast guided filter using subsampling for large images
/// Reduces computation by working on downsampled images
#[wasm_bindgen]
pub fn guided_filter_fast(
    input: &[u8],
    guide: &[u8],
    width: usize,
    height: usize,
    radius: usize,
    eps: f64,
    subsample: usize,
) -> Vec<u8> {
    if subsample <= 1 {
        return guided_filter(input, guide, width, height, radius, eps);
    }

    // Downsample
    let small_w = width / subsample;
    let small_h = height / subsample;
    let small_r = (radius / subsample).max(1);

    let input_small = downsample(input, width, height, subsample);
    let guide_small = downsample(guide, width, height, subsample);

    // Apply guided filter on small image
    let n = small_w * small_h;
    let p: Vec<f64> = input_small.iter().map(|&x| x as f64 / 255.0).collect();
    let i: Vec<f64> = guide_small.iter().map(|&x| x as f64 / 255.0).collect();

    let mean_i = box_filter_f64(&i, small_w, small_h, small_r);
    let mean_p = box_filter_f64(&p, small_w, small_h, small_r);

    let ip: Vec<f64> = (0..n).map(|idx| i[idx] * p[idx]).collect();
    let ii: Vec<f64> = (0..n).map(|idx| i[idx] * i[idx]).collect();

    let mean_ip = box_filter_f64(&ip, small_w, small_h, small_r);
    let mean_ii = box_filter_f64(&ii, small_w, small_h, small_r);

    let cov_ip: Vec<f64> = (0..n).map(|idx| mean_ip[idx] - mean_i[idx] * mean_p[idx]).collect();
    let var_i: Vec<f64> = (0..n).map(|idx| mean_ii[idx] - mean_i[idx] * mean_i[idx]).collect();

    let a: Vec<f64> = (0..n).map(|idx| cov_ip[idx] / (var_i[idx] + eps)).collect();
    let b: Vec<f64> = (0..n).map(|idx| mean_p[idx] - a[idx] * mean_i[idx]).collect();

    let mean_a = box_filter_f64(&a, small_w, small_h, small_r);
    let mean_b = box_filter_f64(&b, small_w, small_h, small_r);

    // Upsample coefficients
    let mean_a_up = upsample(&mean_a, small_w, small_h, width, height);
    let mean_b_up = upsample(&mean_b, small_w, small_h, width, height);

    // Apply to full resolution guide
    let full_n = width * height;
    (0..full_n)
        .map(|idx| {
            let guide_val = guide[idx] as f64 / 255.0;
            let val = mean_a_up[idx] * guide_val + mean_b_up[idx];
            (val * 255.0).clamp(0.0, 255.0) as u8
        })
        .collect()
}

/// Box filter using integral images for O(1) per pixel
fn box_filter_f64(input: &[f64], width: usize, height: usize, radius: usize) -> Vec<f64> {
    // Build integral image
    let mut integral = vec![0.0f64; (width + 1) * (height + 1)];

    for y in 0..height {
        for x in 0..width {
            let idx = y * width + x;
            let int_idx = (y + 1) * (width + 1) + (x + 1);
            integral[int_idx] = input[idx]
                + integral[int_idx - 1]
                + integral[int_idx - width - 1]
                - integral[int_idx - width - 2];
        }
    }

    // Apply box filter using integral image
    let mut output = vec![0.0f64; width * height];

    for y in 0..height {
        for x in 0..width {
            let y1 = if y >= radius { y - radius } else { 0 };
            let y2 = (y + radius + 1).min(height);
            let x1 = if x >= radius { x - radius } else { 0 };
            let x2 = (x + radius + 1).min(width);

            let area = ((y2 - y1) * (x2 - x1)) as f64;

            // Sum from integral image
            let sum = integral[(y2) * (width + 1) + x2]
                - integral[(y2) * (width + 1) + x1]
                - integral[(y1) * (width + 1) + x2]
                + integral[(y1) * (width + 1) + x1];

            output[y * width + x] = sum / area;
        }
    }

    output
}

/// Downsample image by factor
fn downsample(input: &[u8], width: usize, height: usize, factor: usize) -> Vec<u8> {
    let new_w = width / factor;
    let new_h = height / factor;
    let mut output = vec![0u8; new_w * new_h];

    for y in 0..new_h {
        for x in 0..new_w {
            let mut sum = 0u32;
            for dy in 0..factor {
                for dx in 0..factor {
                    sum += input[(y * factor + dy) * width + (x * factor + dx)] as u32;
                }
            }
            output[y * new_w + x] = (sum / (factor * factor) as u32) as u8;
        }
    }

    output
}

/// Upsample f64 array using bilinear interpolation
fn upsample(input: &[f64], in_w: usize, in_h: usize, out_w: usize, out_h: usize) -> Vec<f64> {
    let mut output = vec![0.0f64; out_w * out_h];

    let scale_x = in_w as f64 / out_w as f64;
    let scale_y = in_h as f64 / out_h as f64;

    for y in 0..out_h {
        for x in 0..out_w {
            let src_x = x as f64 * scale_x;
            let src_y = y as f64 * scale_y;

            let x0 = (src_x.floor() as usize).min(in_w - 1);
            let y0 = (src_y.floor() as usize).min(in_h - 1);
            let x1 = (x0 + 1).min(in_w - 1);
            let y1 = (y0 + 1).min(in_h - 1);

            let fx = src_x - x0 as f64;
            let fy = src_y - y0 as f64;

            let p00 = input[y0 * in_w + x0];
            let p10 = input[y0 * in_w + x1];
            let p01 = input[y1 * in_w + x0];
            let p11 = input[y1 * in_w + x1];

            output[y * out_w + x] = p00 * (1.0 - fx) * (1.0 - fy)
                + p10 * fx * (1.0 - fy)
                + p01 * (1.0 - fx) * fy
                + p11 * fx * fy;
        }
    }

    output
}

/// Multi-scale guided filter for enhanced detail preservation
#[wasm_bindgen]
pub fn guided_filter_multiscale(
    input: &[u8],
    guide: &[u8],
    width: usize,
    height: usize,
    base_radius: usize,
    eps: f64,
    num_scales: usize,
) -> Vec<u8> {
    if num_scales <= 1 {
        return guided_filter(input, guide, width, height, base_radius, eps);
    }

    let n = width * height;
    let mut result = vec![0.0f64; n];

    // Process at multiple scales
    for scale in 0..num_scales {
        let scale_factor = 1 << scale;
        let radius = base_radius * scale_factor;
        let weight = 1.0 / (scale + 1) as f64;

        let filtered = guided_filter(input, guide, width, height, radius, eps * scale_factor as f64);

        for i in 0..n {
            result[i] += filtered[i] as f64 * weight;
        }
    }

    // Normalize
    let total_weight: f64 = (1..=num_scales).map(|s| 1.0 / s as f64).sum();

    result
        .iter()
        .map(|&v| (v / total_weight).clamp(0.0, 255.0) as u8)
        .collect()
}

/// Color-guided filter for RGBA images
/// Uses all color channels for guidance
#[wasm_bindgen]
pub fn guided_filter_color(
    input: &[u8],
    guide_rgba: &[u8],
    width: usize,
    height: usize,
    radius: usize,
    eps: f64,
) -> Vec<u8> {
    let n = width * height;

    // Extract RGB channels from guide (normalized)
    let r: Vec<f64> = (0..n).map(|i| guide_rgba[i * 4] as f64 / 255.0).collect();
    let g: Vec<f64> = (0..n).map(|i| guide_rgba[i * 4 + 1] as f64 / 255.0).collect();
    let b: Vec<f64> = (0..n).map(|i| guide_rgba[i * 4 + 2] as f64 / 255.0).collect();

    let p: Vec<f64> = input.iter().map(|&x| x as f64 / 255.0).collect();

    // Compute mean of each channel
    let mean_r = box_filter_f64(&r, width, height, radius);
    let mean_g = box_filter_f64(&g, width, height, radius);
    let mean_b = box_filter_f64(&b, width, height, radius);
    let mean_p = box_filter_f64(&p, width, height, radius);

    // Compute covariances
    let rp: Vec<f64> = (0..n).map(|i| r[i] * p[i]).collect();
    let gp: Vec<f64> = (0..n).map(|i| g[i] * p[i]).collect();
    let bp: Vec<f64> = (0..n).map(|i| b[i] * p[i]).collect();

    let mean_rp = box_filter_f64(&rp, width, height, radius);
    let mean_gp = box_filter_f64(&gp, width, height, radius);
    let mean_bp = box_filter_f64(&bp, width, height, radius);

    let cov_rp: Vec<f64> = (0..n).map(|i| mean_rp[i] - mean_r[i] * mean_p[i]).collect();
    let cov_gp: Vec<f64> = (0..n).map(|i| mean_gp[i] - mean_g[i] * mean_p[i]).collect();
    let cov_bp: Vec<f64> = (0..n).map(|i| mean_bp[i] - mean_b[i] * mean_p[i]).collect();

    // Compute variance matrix (simplified: use sum of variances)
    let rr: Vec<f64> = (0..n).map(|i| r[i] * r[i]).collect();
    let gg: Vec<f64> = (0..n).map(|i| g[i] * g[i]).collect();
    let bb: Vec<f64> = (0..n).map(|i| b[i] * b[i]).collect();

    let mean_rr = box_filter_f64(&rr, width, height, radius);
    let mean_gg = box_filter_f64(&gg, width, height, radius);
    let mean_bb = box_filter_f64(&bb, width, height, radius);

    let var_r: Vec<f64> = (0..n).map(|i| mean_rr[i] - mean_r[i] * mean_r[i]).collect();
    let var_g: Vec<f64> = (0..n).map(|i| mean_gg[i] - mean_g[i] * mean_g[i]).collect();
    let var_b: Vec<f64> = (0..n).map(|i| mean_bb[i] - mean_b[i] * mean_b[i]).collect();

    // Compute coefficients (simplified using diagonal approximation)
    let a_r: Vec<f64> = (0..n).map(|i| cov_rp[i] / (var_r[i] + eps)).collect();
    let a_g: Vec<f64> = (0..n).map(|i| cov_gp[i] / (var_g[i] + eps)).collect();
    let a_b: Vec<f64> = (0..n).map(|i| cov_bp[i] / (var_b[i] + eps)).collect();
    let b_coef: Vec<f64> = (0..n)
        .map(|i| mean_p[i] - a_r[i] * mean_r[i] - a_g[i] * mean_g[i] - a_b[i] * mean_b[i])
        .collect();

    // Average coefficients
    let mean_a_r = box_filter_f64(&a_r, width, height, radius);
    let mean_a_g = box_filter_f64(&a_g, width, height, radius);
    let mean_a_b = box_filter_f64(&a_b, width, height, radius);
    let mean_b_coef = box_filter_f64(&b_coef, width, height, radius);

    // Output
    (0..n)
        .map(|i| {
            let val = mean_a_r[i] * r[i] + mean_a_g[i] * g[i] + mean_a_b[i] * b[i] + mean_b_coef[i];
            (val * 255.0).clamp(0.0, 255.0) as u8
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_guided_filter_uniform() {
        let input = vec![128u8; 100];
        let guide = vec![128u8; 100];

        let output = guided_filter(&input, &guide, 10, 10, 2, 0.01);

        assert_eq!(output.len(), 100);
        // Uniform image should stay uniform
        for &v in &output {
            assert!((v as i32 - 128).abs() <= 2);
        }
    }

    #[test]
    fn test_guided_filter_edge_preservation() {
        // Create image with sharp edge
        let mut input = vec![0u8; 100];
        for i in 50..100 {
            input[i] = 255;
        }
        let guide = input.clone();

        let output = guided_filter(&input, &guide, 10, 10, 2, 0.001);

        // Edge should be preserved (small eps = edge preserving)
        assert!(output[0] < 50);
        assert!(output[99] > 200);
    }

    #[test]
    fn test_guided_filter_fast() {
        let input = vec![128u8; 400];
        let guide = vec![128u8; 400];

        let regular = guided_filter(&input, &guide, 20, 20, 3, 0.01);
        let fast = guided_filter_fast(&input, &guide, 20, 20, 3, 0.01, 2);

        assert_eq!(regular.len(), fast.len());
    }

    #[test]
    fn test_box_filter_uniform() {
        let input = vec![1.0f64; 100];
        let output = box_filter_f64(&input, 10, 10, 2);

        for &v in &output {
            assert!((v - 1.0).abs() < 0.001);
        }
    }

    #[test]
    fn test_downsample() {
        let input = vec![100u8; 100];
        let output = downsample(&input, 10, 10, 2);

        assert_eq!(output.len(), 25);
        for &v in &output {
            assert_eq!(v, 100);
        }
    }

    #[test]
    fn test_multiscale() {
        let input = vec![128u8; 100];
        let guide = vec![128u8; 100];

        let output = guided_filter_multiscale(&input, &guide, 10, 10, 2, 0.01, 2);

        assert_eq!(output.len(), 100);
    }

    #[test]
    fn test_color_guided() {
        // Create RGBA guide
        let guide: Vec<u8> = (0..100).flat_map(|_| vec![128, 128, 128, 255]).collect();
        let input = vec![128u8; 100];

        let output = guided_filter_color(&input, &guide, 10, 10, 2, 0.01);

        assert_eq!(output.len(), 100);
    }
}
