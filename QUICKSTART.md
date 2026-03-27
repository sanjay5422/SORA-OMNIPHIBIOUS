# NDVI Analysis Pipeline - Quick Start Guide

## Automated NDVI Analysis System

This system automatically processes the latest RGB and NIR images to generate NDVI analysis and displays results in a professional dashboard.

## Quick Start

### Step 1: Process Images
```bash
python generate_ndvi.py
```

This will:
- Automatically find the latest RGB image in `RGB_Images/`
- Automatically find the latest NIR image in `NIR_Images/`
- Extract the red band and save to `RED_BAND_IMAGES/`
- Calculate NDVI using formula: (NIR - Red) / (NIR + Red)
- Generate false-color NDVI image with health classification
- Save analysis results and statistics

### Step 2: Start Dashboard Server
```bash
python server.py
```

### Step 3: View Dashboard
Open your browser and navigate to:
```
http://localhost:8000/dashboard.html
```

## What You'll See

### Dashboard Features:
- **Image Viewer**: Toggle between NDVI, RGB, NIR, and Red Band images
- **Zoom & Pan**: Interactive image navigation with synchronized views
- **Pixel Inspector**: Hover to see NDVI values at any location
- **Health Statistics**: 
  - Average, Min, Max NDVI values
  - Stressed area percentage
  - Distribution across health categories
- **Visual Analysis**: Bar chart showing health distribution
- **Crop Health Report**:
  - Overall field status
  - Identified stress zones
  - Spatial patterns
  - Actionable recommendations
  - Priority inspection zones
- **Temporal Comparison**: Compare current vs previous NDVI
- **Export**: Download full analysis report

### NDVI Color Scale:
- **Red**: < 0.2 (Bare soil/Dead crop)
- **Yellow**: 0.2 - 0.4 (Poor health)
- **Pale Green**: 0.4 - 0.6 (Moderate health)
- **Green**: > 0.6 (Healthy vegetation)

## File Structure

```
CODE/
├── generate_ndvi.py          # Main NDVI processing script
├── server.py                 # Dashboard web server
├── dashboard.html            # Dashboard interface
├── dashboard.css             # Dashboard styling
├── dashboard.js              # Dashboard functionality
├── RGB_Images/               # Input: RGB images
├── NIR_Images/               # Input: NIR images
├── RED_BAND_IMAGES/          # Output: Extracted red bands
└── NDVI_Images/              # Output: NDVI images and data
    ├── latest.png            # Latest NDVI visualization
    └── latest_analysis.json  # Analysis results
```

## Workflow

1. **Place Images**: Add RGB and NIR images to their respective folders
2. **Run Pipeline**: Execute `python generate_ndvi.py`
3. **Start Server**: Run `python server.py`
4. **View Results**: Open dashboard in browser
5. **Analyze**: Review statistics, health analysis, and recommendations
6. **Export**: Download report for field teams

## Automation

The system is fully automated:
- No need to specify image filenames
- Always processes the most recent images
- Automatically saves all outputs
- Dashboard updates immediately after processing
- No pop-up windows during analysis

## Troubleshooting

**"No images found" error:**
- Ensure RGB images are in `RGB_Images/` folder
- Ensure NIR images are in `NIR_Images/` folder
- Supported formats: jpg, jpeg, png

**Dashboard shows "Error Loading Data":**
- Run `python generate_ndvi.py` first
- Make sure `server.py` is running
- Check that port 8000 is not in use

**Images not aligned:**
- The system automatically resizes images to match dimensions
- Original aspect ratios are preserved

## Advanced Usage

### Custom Output Directory:
```python
generate_ndvi(nir_path, rgb_path, output_dir='custom_output')
```

### Different Server Port:
```python
run_server(port=8080)
```

## Requirements

- Python 3.7+
- OpenCV (cv2)
- NumPy
- Modern web browser (Chrome, Firefox, Edge)

## Support

For issues or questions:
1. Check that all required packages are installed
2. Verify image files are in correct folders
3. Ensure images are valid and readable
4. Check console output for detailed error messages
