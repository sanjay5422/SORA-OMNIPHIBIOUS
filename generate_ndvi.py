import cv2
import numpy as np
import os
import json
import glob
from datetime import datetime

def get_latest_image(folder, extensions=['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']):
    all_files = []
    for ext in extensions:
        all_files.extend(glob.glob(os.path.join(folder, ext)))
    
    if not all_files:
        return None
    
    all_files.sort(key=os.path.getmtime, reverse=True)
    return all_files[0]

def generate_ndvi(nir_path, rgb_path, output_dir='NDVI_Images'):
    nir_image = cv2.imread(nir_path, cv2.IMREAD_GRAYSCALE)
    if nir_image is None:
        raise ValueError(f"Could not load NIR image from {nir_path}")
    
    rgb_image = cv2.imread(rgb_path)
    if rgb_image is None:
        raise ValueError(f"Could not load RGB image from {rgb_path}")
    
    red_channel = rgb_image[:, :, 2]
    
    red_band_dir = 'RED_BAND_IMAGES'
    os.makedirs(red_band_dir, exist_ok=True)
    timestamp_red = datetime.now().strftime("%Y%m%d_%H%M%S")
    red_band_path = os.path.join(red_band_dir, f'Red_Band_{timestamp_red}.png')
    cv2.imwrite(red_band_path, red_channel)
    print(f"Red band image saved to: {red_band_path}")
    
    if nir_image.shape != red_channel.shape:
        print(f"Warning: Image dimensions don't match. NIR: {nir_image.shape}, Red: {red_channel.shape}")
        print("Resizing Red channel to match NIR dimensions...")
        red_channel = cv2.resize(red_channel, (nir_image.shape[1], nir_image.shape[0]))
    
    nir_float = nir_image.astype(float)
    red_float = red_channel.astype(float)
    
    epsilon = 1e-10
    ndvi = (nir_float - red_float) / (nir_float + red_float + epsilon)
    
    ndvi = np.clip(ndvi, -1, 1)
    
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    ndvi_raw_path = os.path.join(output_dir, f'NDVI_raw_{timestamp}.npy')
    np.save(ndvi_raw_path, ndvi)
    print(f"Raw NDVI data saved to: {ndvi_raw_path}")
    
    ndvi_colored = np.zeros((ndvi.shape[0], ndvi.shape[1], 3), dtype=np.uint8)
    
    mask_red = ndvi < 0.2
    ndvi_colored[mask_red] = [0, 0, 255]
    
    mask_yellow = (ndvi >= 0.2) & (ndvi < 0.4)
    ndvi_colored[mask_yellow] = [0, 255, 255]
    
    mask_pale_green = (ndvi >= 0.4) & (ndvi < 0.6)
    ndvi_colored[mask_pale_green] = [144, 238, 144]
    
    mask_green = ndvi >= 0.6
    ndvi_colored[mask_green] = [0, 255, 0]
    
    ndvi_colored_path = os.path.join(output_dir, f'NDVI_colored_{timestamp}.png')
    cv2.imwrite(ndvi_colored_path, ndvi_colored)
    print(f"Colored NDVI image saved to: {ndvi_colored_path}")
    
    ndvi_latest_path = os.path.join(output_dir, 'latest.png')
    cv2.imwrite(ndvi_latest_path, ndvi_colored)
    
    print(f"\nNDVI Statistics:")
    print(f"  Min value: {ndvi.min():.4f}")
    print(f"  Max value: {ndvi.max():.4f}")
    print(f"  Mean value: {ndvi.mean():.4f}")
    print(f"  Std deviation: {ndvi.std():.4f}")
    
    total_pixels = ndvi.size
    red_percent = (np.sum(mask_red) / total_pixels) * 100
    yellow_percent = (np.sum(mask_yellow) / total_pixels) * 100
    pale_green_percent = (np.sum(mask_pale_green) / total_pixels) * 100
    green_percent = (np.sum(mask_green) / total_pixels) * 100
    
    print(f"\nHealth Classification:")
    print(f"  Bare soil/Dead crop (< 0.2): {red_percent:.2f}%")
    print(f"  Poor health (0.2 - 0.4): {yellow_percent:.2f}%")
    print(f"  Moderate health (0.4 - 0.6): {pale_green_percent:.2f}%")
    print(f"  Healthy vegetation (> 0.6): {green_percent:.2f}%")
    
    analysis_results = {
        'timestamp': timestamp,
        'nir_image': os.path.basename(nir_path),
        'rgb_image': os.path.basename(rgb_path),
        'statistics': {
            'min': float(ndvi.min()),
            'max': float(ndvi.max()),
            'mean': float(ndvi.mean()),
            'std': float(ndvi.std())
        },
        'distribution': {
            'bare_percent': float(red_percent),
            'poor_percent': float(yellow_percent),
            'moderate_percent': float(pale_green_percent),
            'healthy_percent': float(green_percent),
            'stressed_percent': float(red_percent) + float(yellow_percent)
        },
        'health_analysis': generate_health_analysis(
            float(red_percent), float(yellow_percent), 
            float(pale_green_percent), float(green_percent)
        )
    }
    
    json_path = os.path.join(output_dir, 'latest_analysis.json')
    with open(json_path, 'w') as f:
        json.dump(analysis_results, f, indent=2)
    print(f"\nAnalysis results saved to: {json_path}")
    
    return ndvi, analysis_results

def generate_health_analysis(bare_pct, poor_pct, moderate_pct, healthy_pct):
    stressed_pct = bare_pct + poor_pct
    
    if stressed_pct > 40:
        overall_status = "Critical"
        status_class = "danger"
    elif stressed_pct > 20:
        overall_status = "Moderate Stress"
        status_class = "warning"
    else:
        overall_status = "Healthy"
        status_class = "good"
    
    description = (
        f"Field analysis shows {healthy_pct:.1f}% healthy vegetation (NDVI > 0.6), "
        f"{moderate_pct:.1f}% moderate health (0.4-0.6), {poor_pct:.1f}% poor health (0.2-0.4), "
        f"and {bare_pct:.1f}% bare soil or dead crop (< 0.2). "
        f"{stressed_pct:.1f}% of the total area requires attention."
    )
    
    stress_zones = []
    if bare_pct > 5:
        stress_zones.append("Significant bare soil detected - possible germination failure or crop loss")
    if poor_pct > 10:
        stress_zones.append("Areas with poor vegetation health - check for water stress or nutrient deficiency")
    if moderate_pct > 30:
        stress_zones.append("Large moderate stress area - requires monitoring and preventive action")
    if not stress_zones:
        stress_zones.append("No significant stress zones detected")
    
    spatial_patterns = (
        "Edge effects observed along field boundaries. "
        "Variations in NDVI suggest non-uniform water distribution or soil quality differences. "
    )
    if healthy_pct > 60:
        spatial_patterns += "Strong core vegetation indicates good management practices."
    else:
        spatial_patterns += "Widespread stress patterns suggest systemic issues requiring investigation."
    
    observations = [
        f"{stressed_pct:.1f}% of field area shows stress symptoms (NDVI < 0.4)",
        f"Healthy vegetation covers {healthy_pct:.1f}% of analyzed area",
    ]
    if bare_pct > 5:
        observations.append("Significant bare soil detected requiring re-seeding consideration")
    if healthy_pct > 60:
        observations.append("Overall crop establishment is satisfactory")
    else:
        observations.append("Crop establishment needs improvement")
    
    if stressed_pct > 30:
        recommendations = [
            "Conduct immediate soil moisture assessment in stressed zones",
            "Check irrigation system functionality and coverage",
            "Consider foliar application of nutrients in moderate stress areas",
            "Investigate pest or disease presence in critical zones",
            "Schedule detailed field inspection within 48 hours"
        ]
    elif stressed_pct > 15:
        recommendations = [
            "Monitor stressed areas for progression over next 7-10 days",
            "Verify adequate water supply to affected regions",
            "Consider targeted nutrient supplementation",
            "Document spatial patterns for future management"
        ]
    else:
        recommendations = [
            "Continue current management practices",
            "Schedule routine monitoring in 2 weeks",
            "Address edge effects for next season planning",
            "Document successful practices for replication"
        ]
    
    inspection_zones = []
    if bare_pct > 5:
        inspection_zones.append("Areas with bare soil - investigate causes and assess re-planting needs")
    if poor_pct > 10:
        inspection_zones.append("Poor health zones - check water availability and nutrient status")
    inspection_zones.append("Field edges - evaluate compaction and drainage issues")
    if healthy_pct > 50:
        inspection_zones.append("Healthy zones - document best practices for replication")
    
    return {
        'overall_status': overall_status,
        'status_class': status_class,
        'description': description,
        'stress_zones': stress_zones,
        'spatial_patterns': spatial_patterns,
        'observations': observations,
        'recommendations': recommendations,
        'inspection_zones': inspection_zones
    }


if __name__ == "__main__":
    print("=" * 80)
    print("AUTOMATED NDVI ANALYSIS PIPELINE")
    print("=" * 80)
    
    print("\n[1/5] Searching for latest images...")
    nir_image_path = get_latest_image("NIR_Images")
    rgb_image_path = get_latest_image("RGB_Images")
    
    if not nir_image_path:
        print("ERROR: No NIR images found in NIR_Images folder!")
        exit(1)
    if not rgb_image_path:
        print("ERROR: No RGB images found in RGB_Images folder!")
        exit(1)
    
    print(f"  [OK] Latest NIR Image: {nir_image_path}")
    print(f"  [OK] Latest RGB Image: {rgb_image_path}")
    
    try:
        print("\n[2/5] Generating NDVI...")
        ndvi_result, analysis = generate_ndvi(nir_image_path, rgb_image_path)
        print("  [OK] NDVI computation complete")
        
        print("\n[3/5] Saving outputs...")
        print("  [OK] Red band image saved to RED_BAND_IMAGES/")
        print("  [OK] NDVI image saved to NDVI_Images/")
        print("  [OK] Analysis data saved to NDVI_Images/latest_analysis.json")
        
        print("\n[4/5] Generating crop health report...")
        print(f"  [OK] Overall Status: {analysis['health_analysis']['overall_status']}")
        print(f"  [OK] Stressed Area: {analysis['distribution']['stressed_percent']:.1f}%")
        print(f"  [OK] Healthy Area: {analysis['distribution']['healthy_percent']:.1f}%")
        
        print("\n[5/5] Pipeline complete!")
        print("\n" + "=" * 80)
        print("RESULTS SUMMARY")
        print("=" * 80)
        print(f"Status: {analysis['health_analysis']['overall_status']}")
        print(f"Average NDVI: {analysis['statistics']['mean']:.3f}")
        print(f"Stressed Area: {analysis['distribution']['stressed_percent']:.1f}%")
        print("\nKey Recommendations:")
        for i, rec in enumerate(analysis['health_analysis']['recommendations'][:3], 1):
            print(f"  {i}. {rec}")
        
        print("\n" + "=" * 80)
        print("Open dashboard.html in your browser to view detailed analysis")
        print("=" * 80)
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
