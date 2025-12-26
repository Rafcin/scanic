// Core modules
pub mod non_maximum_suppression;
pub mod dilation;
pub mod gradient_calculation;
pub mod canny;
pub mod gaussian_blur;
pub mod hysteresis;

// Enhanced document detection modules
pub mod sobel;
pub mod adaptive_threshold;
pub mod clahe;
pub mod hough;
pub mod document_detection;
pub mod morphology;

// Re-export the blur function from gaussian_blur module for backward compatibility
pub use gaussian_blur::blur;

// Re-export key functions from new modules for easy access
pub use sobel::{
    sobel_gradients_3x3,
    sobel_gradients_3x3_simd,
    sobel_gradients_5x5,
    scharr_gradients_3x3,
    gradient_magnitude_direction,
    nms_precise,
    edge_direction_map,
};

pub use adaptive_threshold::{
    adaptive_threshold_mean,
    adaptive_threshold_gaussian,
    adaptive_threshold_sauvola,
    adaptive_threshold_niblack,
    compute_adaptive_canny_thresholds,
    otsu_threshold,
    multi_otsu_threshold,
    compute_integral_image,
};

pub use clahe::{
    histogram_equalization,
    clahe,
    contrast_stretch,
    percentile_contrast_stretch,
    gamma_correction,
    illumination_normalize,
    preprocess_document,
};

pub use hough::{
    hough_lines,
    hough_lines_p,
    find_line_intersections,
    find_document_quadrilateral,
};

pub use document_detection::{
    validate_quadrilateral,
    calculate_edge_strength,
    calculate_size_score,
    calculate_detection_confidence,
    rank_document_candidates,
    refine_corners_subpixel,
};

pub use morphology::{
    erode,
    dilate_enhanced,
    morphological_open,
    morphological_close,
    morphological_gradient,
    top_hat,
    black_hat,
    hit_or_miss,
    skeletonize,
    close_edge_gaps,
    remove_small_components,
    thin_edges,
};
