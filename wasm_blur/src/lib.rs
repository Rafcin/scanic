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

// New OpenCV-inspired modules
pub mod contours;
pub mod perspective;
pub mod bilateral;
pub mod corners;

// Modern 2025 vision techniques
pub mod guided_filter;
pub mod shadow_removal;
pub mod features;

// Image enhancement filters
pub mod enhancement;

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

// Contour detection (Suzuki85 algorithm like OpenCV)
pub use contours::{
    find_contours,
    approx_poly_dp,
    contour_area,
    arc_length,
    is_contour_convex,
    convex_hull,
    bounding_rect,
    contour_moments,
    RetrievalMode,
    ApproxMethod,
};

// Perspective transform (like OpenCV's warpPerspective)
pub use perspective::{
    get_perspective_transform,
    invert_perspective_matrix,
    warp_perspective,
    warp_perspective_bicubic,
    calculate_output_size,
    warp_document,
    get_affine_transform,
};

// Bilateral filter (edge-preserving smoothing)
pub use bilateral::{
    bilateral_filter,
    bilateral_filter_fast,
    bilateral_filter_rgba,
    joint_bilateral_filter,
    median_filter,
    median_filter_fast,
};

// Corner detection (Harris, Shi-Tomasi, FAST)
pub use corners::{
    corner_harris,
    corner_min_eigen_val,
    good_features_to_track,
    corner_sub_pix,
    fast_corners,
};

// Guided filter (faster O(1) edge-aware smoothing)
pub use guided_filter::{
    guided_filter,
    guided_filter_fast,
    guided_filter_multiscale,
    guided_filter_color,
};

// Shadow removal and document lighting enhancement
pub use shadow_removal::{
    remove_shadows_retinex,
    remove_shadows_dog,
    normalize_illumination_local,
    auto_white_balance,
    detect_shadows,
    flatten_background,
    enhance_document_lighting,
};

// Feature detection and matching (ORB, BRIEF)
pub use features::{
    compute_brief_descriptor,
    compute_orb_features,
    match_descriptors,
    find_homography_ransac,
};

// Image enhancement filters
pub use enhancement::{
    adjust_brightness,
    adjust_contrast,
    adjust_saturation,
    adjust_hue,
    adjust_temperature,
    apply_gamma,
    auto_levels,
    unsharp_mask,
    enhance_edges,
    sepia_filter,
    vintage_filter,
    vignette_filter,
    posterize_filter,
    invert_filter,
    emboss_filter,
    sketch_filter,
    detect_skew_angle,
    enhance_text_document,
    binarize_document,
    remove_background_white,
    denoise_nlm,
};
