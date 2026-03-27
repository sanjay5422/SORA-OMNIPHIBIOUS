// Dashboard State
const dashboardState = {
    currentImage: 'ndvi',
    images: {
        ndvi: null,
        rgb: null,
        nir: null,
        red: null
    },
    ndviData: null,
    previousNdviData: null,
    zoomLevel: 1,
    panX: 0,
    panY: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    stats: {
        min: 0,
        max: 0,
        mean: 0,
        stressed: 0,
        barePercent: 0,
        poorPercent: 0,
        moderatePercent: 0,
        healthyPercent: 0
    },
    charts: {
        donut: null,
        gauge: null,
        radar: null,
        trend: null,
        stress: null,
        zoneHeatmap: null
    }
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupEventListeners();
    loadRealData();
});

function initializeDashboard() {
    // Set current date
    const dateElement = document.getElementById('currentDate');
    const today = new Date();
    dateElement.textContent = today.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function setupEventListeners() {
    // Tab switching - Updated for compact tabs
    const tabButtons = document.querySelectorAll('.tab-btn-compact');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchImage(btn.dataset.image));
    });

    // Zoom controls
    document.getElementById('zoomIn').addEventListener('click', () => zoom(1.2));
    document.getElementById('zoomOut').addEventListener('click', () => zoom(0.8));
    document.getElementById('resetView').addEventListener('click', resetView);

    // Canvas interactions
    const canvas = document.getElementById('imageCanvas');
    canvas.addEventListener('mousedown', startDrag);
    canvas.addEventListener('mousemove', drag);
    canvas.addEventListener('mouseup', endDrag);
    canvas.addEventListener('mouseleave', endDrag);
    canvas.addEventListener('mousemove', showPixelInfo);

    // Export report
    document.getElementById('exportReport').addEventListener('click', exportReport);
}

async function loadRealData() {
    try {
        console.log('=== Starting to load dashboard data ===');
        
        // Fetch analysis data
        const response = await fetch('/api/latest');
        console.log('API Response status:', response.status);
        
        const data = await response.json();
        console.log('Analysis data received:', data);
        
        if (data.error) {
            showError(data.error);
            return;
        }
        
        // Load actual images
        console.log('Loading images...');
        await loadActualImages(data);
        console.log('Images loaded, updating display...');
        
        // Make sure NDVI image is displayed
        switchImage('ndvi');
        
        // Update statistics first to populate dashboardState.stats
        updateStatisticsFromData(data);
        
        // Then update compact UI which depends on dashboardState.stats
        updateCompactUI(data);
        
        // Update analysis sections
        updateHealthAnalysis(data);
        
        console.log('=== Dashboard loaded successfully ===');
        
    } catch (error) {
        console.error('Failed to load data:', error);
        showError('Failed to load analysis data. Error: ' + error.message);
        // Fall back to demo data
        console.log('Falling back to demo data');
        loadImages();
    }
}

async function loadActualImages(data) {
    console.log('Loading actual images...', data);
    
    // Load NDVI image
    await new Promise((resolve, reject) => {
        const ndviImg = new Image();
        ndviImg.onload = () => {
            const canvas = document.getElementById('imageCanvas');
            canvas.width = ndviImg.width;
            canvas.height = ndviImg.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(ndviImg, 0, 0);
            dashboardState.images.ndvi = canvas.toDataURL();
            console.log('NDVI image loaded');
            resolve();
        };
        ndviImg.onerror = () => {
            console.error('Failed to load NDVI image');
            reject();
        };
        ndviImg.src = '/NDVI_Images/latest.png?' + Date.now();
    });
    
    // Load RGB image
    await new Promise((resolve) => {
        const rgbImg = new Image();
        rgbImg.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = rgbImg.width;
            canvas.height = rgbImg.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(rgbImg, 0, 0);
            dashboardState.images.rgb = canvas.toDataURL();
            console.log('RGB image loaded');
            resolve();
        };
        rgbImg.onerror = () => {
            console.error('Failed to load RGB image:', data.rgb_image);
            resolve(); // Continue even if this fails
        };
        rgbImg.src = '/RGB_Images/' + data.rgb_image + '?' + Date.now();
    });
    
    // Load NIR image
    await new Promise((resolve) => {
        const nirImg = new Image();
        nirImg.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = nirImg.width;
            canvas.height = nirImg.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(nirImg, 0, 0);
            dashboardState.images.nir = canvas.toDataURL();
            console.log('NIR image loaded');
            resolve();
        };
        nirImg.onerror = () => {
            console.error('Failed to load NIR image:', data.nir_image);
            resolve();
        };
        nirImg.src = '/NIR_Images/' + data.nir_image + '?' + Date.now();
    });
    
    // Load Red band image
    await new Promise((resolve) => {
        const redBandImg = new Image();
        redBandImg.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = redBandImg.width;
            canvas.height = redBandImg.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(redBandImg, 0, 0);
            dashboardState.images.red = canvas.toDataURL();
            console.log('Red band image loaded');
            resolve();
        };
        redBandImg.onerror = () => {
            console.error('Failed to load red band image, trying fallback');
            loadRedBandFromRGB(data.rgb_image);
            resolve();
        };
        redBandImg.src = '/RED_BAND_IMAGES/Red_Band_' + data.timestamp + '.png?' + Date.now();
    });
    
    console.log('All images loaded successfully');
    
    // Update debug info
    updateDebugInfo(data);
}

function updateDebugInfo(data) {
    const debugDiv = document.getElementById('debugInfo');
    const debugContent = document.getElementById('debugContent');
    
    if (debugDiv && debugContent) {
        debugDiv.style.display = 'block';
        debugContent.innerHTML = `
            <div>Timestamp: ${data.timestamp}</div>
            <div>RGB: ${data.rgb_image} - ${dashboardState.images.rgb ? '✓ Loaded' : '✗ Not loaded'}</div>
            <div>NIR: ${data.nir_image} - ${dashboardState.images.nir ? '✓ Loaded' : '✗ Not loaded'}</div>
            <div>Red Band: Red_Band_${data.timestamp}.png - ${dashboardState.images.red ? '✓ Loaded' : '✗ Not loaded'}</div>
            <div>NDVI: latest.png - ${dashboardState.images.ndvi ? '✓ Loaded' : '✗ Not loaded'}</div>
            <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #ddd;">
                <a href="/test_images.html" target="_blank" style="color: #4CAF50;">Open Image Test Page</a> | 
                <a href="javascript:void(0)" onclick="document.getElementById('debugInfo').style.display='none'" style="color: #f44336;">Hide Debug</a>
            </div>
        `;
    }
}

function loadRedBandFromRGB(rgbFilename) {
    const rgbImg = new Image();
    rgbImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = rgbImg.width;
        canvas.height = rgbImg.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(rgbImg, 0, 0);
        
        // Extract red channel
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const red = imageData.data[i];
            imageData.data[i] = red;     // R
            imageData.data[i + 1] = red; // G
            imageData.data[i + 2] = red; // B
        }
        ctx.putImageData(imageData, 0, 0);
        dashboardState.images.red = canvas.toDataURL();
    };
    rgbImg.src = '/RGB_Images/' + rgbFilename + '?' + Date.now();
}

function showError(message) {
    console.error('Error:', message);
    const viewer = document.getElementById('imageViewer');
    if (!viewer) {
        console.warn('Image viewer element not found');
        return;
    }
    viewer.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: #e74c3c;">
            <h3>Error Loading Data</h3>
            <p style="margin-top: 1rem;">${message}</p>
            <p style="margin-top: 1rem; font-size: 0.9rem; color: #7f8c8d;">
                To generate data:<br>
                1. Run: <code>python generate_ndvi.py</code><br>
                2. Refresh this page
            </p>
        </div>
    `;
}

function updateStatisticsFromData(data) {
    const stats = data.statistics;
    const dist = data.distribution;
    
    dashboardState.stats = {
        min: stats.min,
        max: stats.max,
        mean: stats.mean,
        std: stats.std || 0,
        stressed: dist.stressed_percent,
        barePercent: dist.bare_percent.toFixed(1),
        poorPercent: dist.poor_percent.toFixed(1),
        moderatePercent: dist.moderate_percent.toFixed(1),
        healthyPercent: dist.healthy_percent.toFixed(1)
    };
    
    updateStatisticsDisplay();
    drawDistributionChart();
}

function updateHealthAnalysis(data) {
    const analysis = data.health_analysis;
    
    // Overall status
    const overallHealth = document.getElementById('overallHealth');
    const overallStatusBadge = document.getElementById('overallStatusBadge');
    if (overallHealth) {
        overallHealth.textContent = analysis.overall_status;
    }
    if (overallStatusBadge) {
        overallStatusBadge.className = 'status-badge ' + analysis.status_class;
    }
    
    // Update zone descriptions
    updateZoneDescriptions(data);
    
    // Update action cards
    updateActionCards(data);
}

// Image Loading and Rendering (Fallback Demo Mode)
function loadImages() {
    // Simulate loading NDVI image
    // This is fallback demo mode
    loadNDVIImage();
    loadRGBImage();
    loadNIRImage();
    loadRedBandImage();
}

function loadNDVIImage() {
    // Generate sample NDVI data for demonstration
    const width = 400;
    const height = 300;
    const ndviData = new Float32Array(width * height);
    
    // Simulate realistic NDVI distribution
    for (let i = 0; i < ndviData.length; i++) {
        const x = i % width;
        const y = Math.floor(i / width);
        
        // Create varied patterns
        let value = 0.5 + Math.random() * 0.3;
        
        // Add some stress zones
        if (x < 80 && y < 80) {
            value = 0.15 + Math.random() * 0.15; // Stressed corner
        } else if (x > width - 100 && y < 60) {
            value = 0.25 + Math.random() * 0.15; // Poor health zone
        } else if (y > height - 80) {
            value = 0.7 + Math.random() * 0.2; // Healthy zone
        }
        
        // Edge effects
        if (x < 20 || x > width - 20 || y < 20 || y > height - 20) {
            value *= 0.7;
        }
        
        ndviData[i] = Math.max(-1, Math.min(1, value));
    }
    
    dashboardState.ndviData = { data: ndviData, width, height };
    renderNDVIImage(ndviData, width, height);
    calculateStatistics(ndviData);
    analyzeHealth(ndviData, width, height);
}

function renderNDVIImage(data, width, height) {
    const canvas = document.getElementById('imageCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    
    for (let i = 0; i < data.length; i++) {
        const ndvi = data[i];
        const color = getNDVIColor(ndvi);
        const idx = i * 4;
        imageData.data[idx] = color.r;
        imageData.data[idx + 1] = color.g;
        imageData.data[idx + 2] = color.b;
        imageData.data[idx + 3] = 255;
    }
    
    ctx.putImageData(imageData, 0, 0);
    dashboardState.images.ndvi = canvas.toDataURL();
}

function getNDVIColor(ndvi) {
    // Color scale matching the legend
    if (ndvi < 0.2) {
        // Red for bare/dead
        return { r: 255, g: 107, b: 107 };
    } else if (ndvi < 0.4) {
        // Yellow for poor
        return { r: 255, g: 217, b: 61 };
    } else if (ndvi < 0.6) {
        // Pale green for moderate
        return { r: 149, g: 225, b: 211 };
    } else {
        // Green for healthy
        return { r: 56, g: 176, b: 0 };
    }
}

function loadRGBImage() {
    // Placeholder for RGB image
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    // Create gradient as placeholder
    const gradient = ctx.createLinearGradient(0, 0, 400, 300);
    gradient.addColorStop(0, '#8b7355');
    gradient.addColorStop(0.5, '#6b8e23');
    gradient.addColorStop(1, '#228b22');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 300);
    
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RGB Image', 200, 150);
    
    dashboardState.images.rgb = canvas.toDataURL();
}

function loadNIRImage() {
    // Placeholder for NIR image
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#505050';
    ctx.fillRect(0, 0, 400, 300);
    
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('NIR Image', 200, 150);
    
    dashboardState.images.nir = canvas.toDataURL();
}

function loadRedBandImage() {
    // Placeholder for Red band image
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(0, 0, 400, 300);
    
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Red Band Image', 200, 150);
    
    dashboardState.images.red = canvas.toDataURL();
}

// Image Switching
function switchImage(imageType) {
    dashboardState.currentImage = imageType;
    
    // Update active tab - Updated for compact tabs
    document.querySelectorAll('.tab-btn-compact').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.image === imageType);
    });
    
    // Show/hide NDVI legend - Updated for compact legend
    const legend = document.getElementById('ndviLegend');
    if (legend) {
        legend.style.display = imageType === 'ndvi' ? 'block' : 'none';
    }
    
    // Render appropriate image
    const canvas = document.getElementById('imageCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    if (!dashboardState.images[imageType]) {
        console.log('Image not available yet:', imageType);
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Loading ${imageType.toUpperCase()} image...`, canvas.width/2, canvas.height/2);
        return;
    }
    
    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        console.log(`Displayed ${imageType} image`);
    };
    img.onerror = () => {
        console.error(`Failed to display ${imageType} image`);
        ctx.fillStyle = '#ffebee';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#c62828';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Error loading ${imageType.toUpperCase()} image`, canvas.width/2, canvas.height/2);
    };
    img.src = dashboardState.images[imageType];
}

// Zoom and Pan
function zoom(factor) {
    dashboardState.zoomLevel *= factor;
    dashboardState.zoomLevel = Math.max(0.5, Math.min(3, dashboardState.zoomLevel));
    updateZoomDisplay();
    applyTransform();
}

function resetView() {
    dashboardState.zoomLevel = 1;
    dashboardState.panX = 0;
    dashboardState.panY = 0;
    updateZoomDisplay();
    applyTransform();
}

function updateZoomDisplay() {
    document.getElementById('zoomLevel').textContent = 
        Math.round(dashboardState.zoomLevel * 100) + '%';
}

function applyTransform() {
    const canvas = document.getElementById('imageCanvas');
    canvas.style.transform = 
        `translate(${dashboardState.panX}px, ${dashboardState.panY}px) scale(${dashboardState.zoomLevel})`;
}

function startDrag(e) {
    dashboardState.isDragging = true;
    dashboardState.lastX = e.clientX;
    dashboardState.lastY = e.clientY;
}

function drag(e) {
    if (!dashboardState.isDragging) return;
    
    const dx = e.clientX - dashboardState.lastX;
    const dy = e.clientY - dashboardState.lastY;
    
    dashboardState.panX += dx;
    dashboardState.panY += dy;
    dashboardState.lastX = e.clientX;
    dashboardState.lastY = e.clientY;
    
    applyTransform();
}

function endDrag() {
    dashboardState.isDragging = false;
}

// Pixel Information
function showPixelInfo(e) {
    if (dashboardState.currentImage !== 'ndvi' || !dashboardState.ndviData) return;
    
    const canvas = document.getElementById('imageCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
    
    if (x >= 0 && x < dashboardState.ndviData.width && 
        y >= 0 && y < dashboardState.ndviData.height) {
        const idx = y * dashboardState.ndviData.width + x;
        const ndvi = dashboardState.ndviData.data[idx];
        
        const pixelInfo = document.getElementById('pixelInfo');
        pixelInfo.innerHTML = `
            <strong>Position:</strong> (${x}, ${y}) | 
            <strong>NDVI:</strong> ${ndvi.toFixed(3)} | 
            <strong>Status:</strong> ${getNDVIStatus(ndvi)}
        `;
    }
}

function getNDVIStatus(ndvi) {
    if (ndvi < 0.2) return 'Bare/Dead';
    if (ndvi < 0.4) return 'Poor';
    if (ndvi < 0.6) return 'Moderate';
    return 'Healthy';
}

// Statistics Calculation
function calculateStatistics(data) {
    const stats = {
        min: Math.min(...data),
        max: Math.max(...data),
        mean: data.reduce((a, b) => a + b, 0) / data.length,
        bare: 0,
        poor: 0,
        moderate: 0,
        healthy: 0
    };
    
    // Calculate distribution
    data.forEach(ndvi => {
        if (ndvi < 0.2) stats.bare++;
        else if (ndvi < 0.4) stats.poor++;
        else if (ndvi < 0.6) stats.moderate++;
        else stats.healthy++;
    });
    
    const total = data.length;
    stats.barePercent = (stats.bare / total * 100).toFixed(1);
    stats.poorPercent = (stats.poor / total * 100).toFixed(1);
    stats.moderatePercent = (stats.moderate / total * 100).toFixed(1);
    stats.healthyPercent = (stats.healthy / total * 100).toFixed(1);
    stats.stressed = (parseFloat(stats.barePercent) + parseFloat(stats.poorPercent)).toFixed(1);
    
    dashboardState.stats = stats;
    updateStatisticsDisplay();
    drawDistributionChart();
    updateVisualCharts(); // Add visual charts update
}

function updateStatisticsDisplay() {
    const stats = dashboardState.stats;
    
    const avgNDVI = document.getElementById('avgNDVI');
    const minNDVI = document.getElementById('minNDVI');
    const maxNDVI = document.getElementById('maxNDVI');
    const stressedArea = document.getElementById('stressedArea');
    const barePercent = document.getElementById('barePercent');
    const poorPercent = document.getElementById('poorPercent');
    const moderatePercent = document.getElementById('moderatePercent');
    const healthyPercent = document.getElementById('healthyPercent');
    
    if (avgNDVI) avgNDVI.textContent = stats.mean.toFixed(3);
    if (minNDVI) minNDVI.textContent = stats.min.toFixed(3);
    if (maxNDVI) maxNDVI.textContent = stats.max.toFixed(3);
    if (stressedArea) stressedArea.textContent = stats.stressed + '%';
    
    if (barePercent) barePercent.textContent = stats.barePercent + '%';
    if (poorPercent) poorPercent.textContent = stats.poorPercent + '%';
    if (moderatePercent) moderatePercent.textContent = stats.moderatePercent + '%';
    if (healthyPercent) healthyPercent.textContent = stats.healthyPercent + '%';
    
    // Update progress bars
    updateProgressBars(stats);
    
    // Update insights
    updateInsights(stats);
}

function drawDistributionChart() {
    const canvas = document.getElementById('distributionChart');
    if (!canvas) {
        console.warn('Distribution chart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    const stats = dashboardState.stats;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;
    
    const values = [
        parseFloat(stats.barePercent),
        parseFloat(stats.poorPercent),
        parseFloat(stats.moderatePercent),
        parseFloat(stats.healthyPercent)
    ];
    
    const colors = ['#ff6b6b', '#ffd93d', '#95e1d3', '#38b000'];
    const total = values.reduce((a, b) => a + b, 0);
    const barWidth = canvas.width / values.length;
    const maxHeight = canvas.height - 40;
    
    values.forEach((value, i) => {
        const height = (value / 100) * maxHeight;
        const x = i * barWidth + 10;
        const y = canvas.height - height - 20;
        
        ctx.fillStyle = colors[i];
        ctx.fillRect(x, y, barWidth - 20, height);
        
        ctx.fillStyle = '#2c3e50';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(value + '%', x + barWidth / 2 - 10, y - 5);
    });
}

// Health Analysis Section
function generateReport() {
    const stats = dashboardState.stats;
    
    // Observations
    const observations = [
        `${stats.stressed}% of field area shows stress symptoms (NDVI < 0.4)`,
        `Healthy vegetation covers ${stats.healthyPercent}% of analyzed area`,
        `Edge effects present along field boundaries reducing productivity`,
        stats.barePercent > 5 ? 'Significant bare soil detected in northwest corner' : 'Minimal bare soil coverage',
        stats.healthyPercent > 60 ? 'Overall crop establishment is satisfactory' : 'Crop establishment needs improvement'
    ];
    
    document.getElementById('observationsList').innerHTML = 
        observations.map(obs => `<li>${obs}</li>`).join('');
    
    // Recommendations
    let recommendations = '';
    if (parseFloat(stats.stressed) > 30) {
        recommendations = `<p><strong>Priority Actions:</strong></p>
            <ul>
                <li>Conduct soil moisture assessment in stressed zones</li>
                <li>Check irrigation system functionality and coverage</li>
                <li>Consider foliar application of nutrients in moderate stress areas</li>
                <li>Investigate pest or disease presence in critical zones</li>
            </ul>`;
    } else if (parseFloat(stats.stressed) > 15) {
        recommendations = `<p><strong>Recommended Actions:</strong></p>
            <ul>
                <li>Monitor stressed areas for progression over next 7-10 days</li>
                <li>Verify adequate water supply to affected regions</li>
                <li>Consider targeted nutrient supplementation</li>
            </ul>`;
    } else {
        recommendations = `<p><strong>Maintenance Actions:</strong></p>
            <ul>
                <li>Continue current management practices</li>
                <li>Schedule routine monitoring in 2 weeks</li>
                <li>Address edge effects for next season planning</li>
            </ul>`;
    }
    
    document.getElementById('recommendationsList').innerHTML = recommendations;
    
    // Inspection zones
    const zones = [
        'Northwest corner (0-80m x 0-80m) - bare soil investigation',
        'Northeast section (320-400m x 0-60m) - poor health assessment',
        'Field edges - compaction and drainage evaluation',
        'Southern healthy zone - document best practices for replication'
    ];
    
    document.getElementById('inspectionZones').innerHTML = 
        zones.map(zone => `<li>${zone}</li>`).join('');
}

// Temporal Comparison
function loadPreviousNDVI() {
    // Create/update trend chart
    createTrendChart();
}

// Export Report
function exportReport() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('PDF export library is not loaded. Please refresh the page and try again.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const stats = dashboardState.stats || {};
    const soilTestData = {
        primaryNutrients: [
            { label: 'Nitrogen (N) [mg/kg]', value: '84 (Medium)' },
            { label: 'Phosphorus (P) [mg/kg]', value: '21 (Low)' },
            { label: 'Potassium (K) [mg/kg]', value: '176 (Good)' },
            { label: 'Magnesium (Mg) [mg/kg]', value: '62 (Good)' }
        ],
        soilChemistry: [
            { label: 'pH', value: '6.8 (Optimal)' },
            { label: 'Electrical Conductivity (dS/m)', value: '0.42 (Low Salinity)' },
            { label: 'Organic Carbon (%)', value: '0.56 (Medium)' },
            { label: 'Soil Moisture (%)', value: '24 (Moderate)' }
        ],
        weatherConditions: [
            { label: 'Temperature (C)', value: '31.4 (High)' },
            { label: 'Humidity (%)', value: '67 (Moderate)' },
            { label: 'Soil Temperature (C)', value: '28.1 (Warm)' },
            { label: 'Rainfall Last 24h (mm)', value: '2.3 (Low)' }
        ]
    };
    const W = 210;
    const H = 297;
    const margin = 14;
    const contentBottom = H - 16;
    let y = 0;

    const parseNumber = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    };

    const formatNumber = (value, digits = 3) => {
        const n = parseNumber(value);
        return n === null ? 'N/A' : n.toFixed(digits);
    };

    const cleanText = (text, fallback = 'N/A') => {
        if (!text) return fallback;
        const compact = String(text).replace(/\s+/g, ' ').trim();
        if (!compact || /undefined|nan/i.test(compact)) return fallback;
        return compact || fallback;
    };

    const getElText = (id, fallback = 'N/A') => {
        const el = document.getElementById(id);
        return cleanText(el ? el.innerText : '', fallback);
    };

    const getListItems = (id) => {
        const el = document.getElementById(id);
        if (!el) return [];
        const items = Array.from(el.querySelectorAll('li')).map((li) => cleanText(li.innerText, '')).filter(Boolean);
        if (items.length > 0) return items;
        const raw = cleanText(el.innerText, '');
        if (!raw) return [];
        return raw
            .split(/\n|\||\u2022|•/)
            .map((s) => cleanText(s, ''))
            .filter(Boolean);
    };

    const getPriorityActions = () => {
        const container = document.getElementById('actionList');
        if (!container) return [];

        const structured = Array.from(container.querySelectorAll('.priority-item')).map((item) => {
            const tag = cleanText(item.querySelector('.priority-tag')?.innerText || '', '');
            const text = cleanText(item.querySelector('.priority-text')?.innerText || item.innerText, '');
            if (!text) return null;
            return tag ? `${tag}: ${text}` : text;
        }).filter(Boolean);

        if (structured.length > 0) return structured;

        const raw = cleanText(container.innerText, '');
        return raw ? [raw] : [];
    };

    const addPageIfNeeded = (neededHeight = 8) => {
        if (y + neededHeight <= contentBottom) return;
        doc.addPage();
        y = margin;
    };

    const addWrappedLine = (text, x, maxWidth, lineHeight = 5) => {
        const lines = doc.splitTextToSize(String(text), maxWidth);
        const blockHeight = lines.length * lineHeight;
        addPageIfNeeded(blockHeight + 1);
        doc.text(lines, x, y);
        y += blockHeight;
    };

    const addBulletList = (items, fallback = 'N/A') => {
        const list = items && items.length ? items : [fallback];
        list.forEach((item) => {
            addPageIfNeeded(6);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(70, 70, 70);
            const bulletText = `- ${cleanText(item)}`;
            addWrappedLine(bulletText, margin + 4, W - margin * 2 - 6, 5);
            y += 1;
        });
    };

    // Header
    doc.setFillColor(44, 62, 80);
    doc.rect(0, 0, W, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SORA Crop Health Monitoring Report', margin, 14);
    y = 30;

    // Meta
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    doc.text('Location: Coimbatore, Tamil Nadu', W - margin, y, { align: 'right' });
    y += 8;

    // NDVI image + legend
    if (dashboardState.images && dashboardState.images.ndvi) {
        const imgData = dashboardState.images.ndvi;
        const imgW = 90;
        const imgH = 65;
        doc.addImage(imgData, 'PNG', margin, y, imgW, imgH);

        const lx = margin + imgW + 8;
        const ly = y;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(44, 62, 80);
        doc.text('NDVI Color Legend', lx, ly + 4);

        const legendItems = [
            { color: [255, 107, 107], label: 'Bare / Dead (< 0.2)' },
            { color: [255, 217, 61], label: 'Poor Health (0.2 - 0.4)' },
            { color: [149, 225, 211], label: 'Moderate (0.4 - 0.6)' },
            { color: [56, 176, 0], label: 'Healthy (> 0.6)' }
        ];

        legendItems.forEach((item, i) => {
            const iy = ly + 12 + i * 9;
            doc.setFillColor(item.color[0], item.color[1], item.color[2]);
            doc.rect(lx, iy - 4, 6, 5, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(60, 60, 60);
            doc.text(item.label, lx + 8, iy);
        });

        y += imgH + 8;
    }

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, W - margin, y);
    y += 6;

    const sectionTitle = (title) => {
        addPageIfNeeded(12);
        doc.setFillColor(240, 244, 248);
        doc.rect(margin, y - 4, W - margin * 2, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(44, 62, 80);
        doc.text(title, margin + 2, y + 1);
        y += 10;
    };

    const row = (label, value, highlight = false) => {
        addPageIfNeeded(7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(label, margin + 4, y);
        doc.setFont('helvetica', 'bold');
        if (highlight) {
            doc.setTextColor(231, 76, 60);
        } else {
            doc.setTextColor(44, 62, 80);
        }
        doc.text(String(value), margin + 75, y);
        y += 6;
    };

    // NDVI statistics
    sectionTitle('NDVI Statistics');
    row('Average NDVI', formatNumber(stats.mean));
    row('Minimum NDVI', formatNumber(stats.min));
    row('Maximum NDVI', formatNumber(stats.max));

    const stressedValue = parseNumber(stats.stressed);
    row(
        'Stressed Area',
        `${formatNumber(stats.stressed, 1)}%`,
        stressedValue !== null && stressedValue > 20
    );
    y += 2;

    // Health distribution
    sectionTitle('Health Distribution');
    row('Bare / Dead (< 0.2)', `${formatNumber(stats.barePercent, 1)}%`);
    row('Poor (0.2 - 0.4)', `${formatNumber(stats.poorPercent, 1)}%`);
    row('Moderate (0.4 - 0.6)', `${formatNumber(stats.moderatePercent, 1)}%`);
    row('Healthy (> 0.6)', `${formatNumber(stats.healthyPercent, 1)}%`);

    y += 2;
    sectionTitle('Overall Health Summary');
    row('Overall Status', getElText('overallHealth'));
    row('Status Summary', getElText('statusSummary'));
    row('Health Score', getElText('healthScoreDisplay'));

    y += 2;
    sectionTitle('Health Breakdown (UI)');
    row('Healthy (> 0.6)', getElText('healthyPercentMetric'));
    row('Moderate (0.4 - 0.6)', getElText('moderatePercentMetric'));
    row('Poor (0.2 - 0.4)', getElText('poorPercentMetric'));
    row('Bare (< 0.2)', getElText('barePercentMetric'));

    y += 2;
    sectionTitle('Stress Analysis');
    addBulletList(getListItems('stressAnalysisList'), 'No stress analysis available');

    y += 2;
    sectionTitle('Priority Actions');
    addBulletList(getPriorityActions(), 'No priority actions available');

    y += 2;
    sectionTitle('Soil Test - Primary Nutrients');
    soilTestData.primaryNutrients.forEach((item) => row(item.label, item.value));

    y += 2;
    sectionTitle('Soil Test - Soil Chemistry');
    soilTestData.soilChemistry.forEach((item) => row(item.label, item.value));

    y += 2;
    sectionTitle('Soil Test - Weather and Field Conditions');
    soilTestData.weatherConditions.forEach((item) => row(item.label, item.value));

    y += 4;
    addPageIfNeeded(8);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, W - margin, y);
    y += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Generated by SORA NDVI Dashboard', margin, y);

    const fileDate = new Date().toISOString().split('T')[0];
    doc.save(`SORA_Crop_Health_Report_${fileDate}.pdf`);
    console.log('PDF report exported successfully');
}

// ============= VISUAL CHARTS AND ENHANCEMENTS =============

// Update Progress Bars
function updateProgressBars(stats) {
    const healthyProgress = document.getElementById('healthyProgress');
    const moderateProgress = document.getElementById('moderateProgress');
    const poorProgress = document.getElementById('poorProgress');
    const bareProgress = document.getElementById('bareProgress');
    
    if (healthyProgress) healthyProgress.style.width = stats.healthyPercent + '%';
    if (moderateProgress) moderateProgress.style.width = stats.moderatePercent + '%';
    if (poorProgress) poorProgress.style.width = stats.poorPercent + '%';
    if (bareProgress) bareProgress.style.width = stats.barePercent + '%';
    
    // Update metric values
    const healthyPercentMetric = document.getElementById('healthyPercentMetric');
    const moderatePercentMetric = document.getElementById('moderatePercentMetric');
    const poorPercentMetric = document.getElementById('poorPercentMetric');
    const barePercentMetric = document.getElementById('barePercentMetric');
    
    if (healthyPercentMetric) healthyPercentMetric.textContent = stats.healthyPercent + '%';
    if (moderatePercentMetric) moderatePercentMetric.textContent = stats.moderatePercent + '%';
    if (poorPercentMetric) poorPercentMetric.textContent = stats.poorPercent + '%';
    if (barePercentMetric) barePercentMetric.textContent = stats.barePercent + '%';
}

// Update Insight Cards
function updateInsights(stats) {
    const insightStress = document.getElementById('insightStress');
    const insightAction = document.getElementById('insightAction');
    const insightRange = document.getElementById('insightRange');
    const insightHealth = document.getElementById('insightHealth');
    
    if (insightStress) insightStress.textContent = stats.stressed + '%';
    
    if (insightAction) {
        const action = parseFloat(stats.stressed) > 40 ? 'Critical' : 
                      parseFloat(stats.stressed) > 20 ? 'Monitor' : 'Good';
        insightAction.textContent = action;
    }
    
    if (insightRange) {
        const range = (stats.max - stats.min).toFixed(2);
        insightRange.textContent = range;
    }
    
    if (insightHealth) {
        const healthIndex = Math.round(stats.mean * 100);
        insightHealth.textContent = healthIndex + '/100';
    }
}

// Create Donut Chart
function createDonutChart(stats) {
    const ctx = document.getElementById('donutChart');
    if (!ctx) return;
    
    if (dashboardState.charts.donut) {
        dashboardState.charts.donut.destroy();
    }
    
    dashboardState.charts.donut = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Healthy (>0.6)', 'Moderate (0.4-0.6)', 'Stressed (0.2-0.4)', 'Bare (<0.2)'],
            datasets: [{
                data: [
                    parseFloat(stats.healthyPercent),
                    parseFloat(stats.moderatePercent),
                    parseFloat(stats.poorPercent),
                    parseFloat(stats.barePercent)
                ],
                backgroundColor: [
                    'rgba(56, 176, 0, 0.8)',
                    'rgba(149, 225, 211, 0.8)',
                    'rgba(255, 217, 61, 0.8)',
                    'rgba(255, 107, 107, 0.8)'
                ],
                borderColor: [
                    'rgba(56, 176, 0, 1)',
                    'rgba(149, 225, 211, 1)',
                    'rgba(255, 217, 61, 1)',
                    'rgba(255, 107, 107, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 11,
                            family: 'Inter'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
}

// Create Gauge Chart (Half Donut)
function createGaugeChart(stats) {
    const ctx = document.getElementById('gaugeChart');
    if (!ctx) return;
    
    if (dashboardState.charts.gauge) {
        dashboardState.charts.gauge.destroy();
    }
    
    const score = (stats.mean + 1) * 50; // Convert -1 to 1 range to 0-100
    
    dashboardState.charts.gauge = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [score, 100 - score],
                backgroundColor: [
                    score > 65 ? 'rgba(56, 176, 0, 0.8)' : 
                    score > 50 ? 'rgba(149, 225, 211, 0.8)' : 
                    score > 35 ? 'rgba(255, 217, 61, 0.8)' : 
                    'rgba(255, 107, 107, 0.8)',
                    'rgba(200, 200, 200, 0.2)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            circumference: 180,
            rotation: -90,
            cutout: '75%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            }
        }
    });
    
    const healthScore = document.getElementById('healthScore');
    if (healthScore) {
        healthScore.textContent = Math.round(score);
    }
}

// Create Radar Chart
function createRadarChart(stats) {
    const ctx = document.getElementById('radarChart');
    if (!ctx) return;
    
    if (dashboardState.charts.radar) {
        dashboardState.charts.radar.destroy();
    }
    
    dashboardState.charts.radar = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Vegetation', 'Health', 'Coverage', 'Uniformity', 'Vitality', 'Condition'],
            datasets: [{
                label: 'Current Status',
                data: [
                    parseFloat(stats.healthyPercent) + parseFloat(stats.moderatePercent),
                    (stats.mean + 1) * 50,
                    100 - parseFloat(stats.barePercent),
                    100 - (stats.std * 100),
                    parseFloat(stats.healthyPercent) * 1.2,
                    (stats.mean + 1) * 45
                ],
                backgroundColor: 'rgba(56, 176, 0, 0.2)',
                borderColor: 'rgba(56, 176, 0, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(56, 176, 0, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(56, 176, 0, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        font: {
                            size: 10
                        }
                    },
                    pointLabels: {
                        font: {
                            size: 11,
                            family: 'Inter'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Create Trend Line Chart
function createTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    
    if (dashboardState.charts.trend) {
        dashboardState.charts.trend.destroy();
    }
    
    // Generate simulated historical data
    const today = new Date();
    const labels = [];
    const data = [];
    const currentNDVI = dashboardState.stats.mean;
    
    for (let i = 14; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        // Simulate trend with some variation
        const variation = (Math.random() - 0.5) * 0.1;
        const trend = currentNDVI - (i * 0.01) + variation;
        data.push(Math.max(-1, Math.min(1, trend)));
    }
    
    dashboardState.charts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'NDVI',
                data: data,
                borderColor: 'rgba(56, 176, 0, 1)',
                backgroundColor: 'rgba(56, 176, 0, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: false,
                    min: -0.2,
                    max: 1.0,
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 9
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'NDVI: ' + context.parsed.y.toFixed(3);
                        }
                    }
                }
            }
        }
    });
    
    // Show trend stats
    const trendStats = document.getElementById('trendStats');
    if (trendStats) {
        trendStats.style.display = 'flex';
        
        const change7d = ((data[data.length - 1] - data[data.length - 8]) / data[data.length - 8] * 100).toFixed(1);
        const change14d = ((data[data.length - 1] - data[0]) / data[0] * 100).toFixed(1);
        
        const change7dEl = document.getElementById('change7d');
        const change14dEl = document.getElementById('change14d');
        const trendDirection = document.getElementById('trendDirection');
        
        if (change7dEl) {
            change7dEl.textContent = (change7d > 0 ? '+' : '') + change7d + '%';
            change7dEl.style.color = change7d > 0 ? 'var(--success)' : 'var(--destructive)';
        }
        
        if (change14dEl) {
            change14dEl.textContent = (change14d > 0 ? '+' : '') + change14d + '%';
            change14dEl.style.color = change14d > 0 ? 'var(--success)' : 'var(--destructive)';
        }
        
        if (trendDirection) {
            if (change7d > 2) {
                trendDirection.textContent = '↑ Improving';
                trendDirection.style.color = 'var(--success)';
            } else if (change7d < -2) {
                trendDirection.textContent = '↓ Declining';
                trendDirection.style.color = 'var(--destructive)';
            } else {
                trendDirection.textContent = '→ Stable';
                trendDirection.style.color = 'var(--muted-foreground)';
            }
        }
    }
}

// Create Stress Bar Chart
function createStressChart(stats) {
    const ctx = document.getElementById('stressChart');
    if (!ctx) return;
    
    if (dashboardState.charts.stress) {
        dashboardState.charts.stress.stress();
    }
    
    dashboardState.charts.stress = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bare Soil', 'Poor Health', 'Moderate', 'Healthy'],
            datasets: [{
                label: 'Area %',
                data: [
                    parseFloat(stats.barePercent),
                    parseFloat(stats.poorPercent),
                    parseFloat(stats.moderatePercent),
                    parseFloat(stats.healthyPercent)
                ],
                backgroundColor: [
                    'rgba(255, 107, 107, 0.8)',
                    'rgba(255, 217, 61, 0.8)',
                    'rgba(149, 225, 211, 0.8)',
                    'rgba(56, 176, 0, 0.8)'
                ],
                borderColor: [
                    'rgba(255, 107, 107, 1)',
                    'rgba(255, 217, 61, 1)',
                    'rgba(149, 225, 211, 1)',
                    'rgba(56, 176, 0, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.x.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });
    
    // Update stress counts
    const criticalCount = document.getElementById('criticalCount');
    const warningCount = document.getElementById('warningCount');
    const infoCount = document.getElementById('infoCount');
    
    if (criticalCount) criticalCount.textContent = Math.round(parseFloat(stats.barePercent));
    if (warningCount) warningCount.textContent = Math.round(parseFloat(stats.poorPercent));
    if (infoCount) infoCount.textContent = Math.round(parseFloat(stats.moderatePercent));
}

// Create Zone Heatmap
function createZoneHeatmap(stats) {
    const canvas = document.getElementById('zoneHeatmap');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = 250;
    canvas.width = width;
    canvas.height = height;
    
    const gridWidth = 30;
    const gridHeight = 15;
    const cellWidth = width / gridWidth;
    const cellHeight = height / gridHeight;
    
    // Generate simulated heatmap based on stats
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            // Create zones with different health levels
            let ndvi;
            if (x < gridWidth * 0.2 && y < gridHeight * 0.3) {
                // Critical zone (top-left)
                ndvi = 0.1 + Math.random() * 0.1;
            } else if (x > gridWidth * 0.7 && y < gridHeight * 0.4) {
                // Warning zone (top-right)
                ndvi = 0.25 + Math.random() * 0.15;
            } else if (y > gridHeight * 0.7) {
                // Healthy zone (bottom)
                ndvi = 0.65 + Math.random() * 0.2;
            } else {
                // Moderate zones
                ndvi = 0.45 + Math.random() * 0.15;
            }
            
            const color = ndviToColor(ndvi);
            ctx.fillStyle = color;
            ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth - 1, cellHeight - 1);
        }
    }
}

function ndviToColor(ndvi) {
    if (ndvi < 0.2) return '#ff6b6b';
    if (ndvi < 0.4) return '#ffd93d';
    if (ndvi < 0.6) return '#95e1d3';
    return '#38b000';
}

// Update Zone Descriptions
function updateZoneDescriptions(data) {
    const criticalZones = document.getElementById('criticalZones');
    const attentionZones = document.getElementById('attentionZones');
    
    if (!criticalZones || !attentionZones) {
        console.warn('Zone description elements not found');
        return;
    }
    
    if (data && data.health_analysis && data.health_analysis.inspection_zones) {
        const zones = data.health_analysis.inspection_zones;
        
        // Separate zones by severity
        const critical = zones.filter(z => 
            z.toLowerCase().includes('bare') || 
            z.toLowerCase().includes('critical') ||
            z.toLowerCase().includes('urgent')
        );
        
        const attention = zones.filter(z => 
            z.toLowerCase().includes('poor') || 
            z.toLowerCase().includes('moderate') ||
            z.toLowerCase().includes('monitor')
        );
        
        // Update UI with actual zone information
        criticalZones.textContent = critical.length > 0 
            ? critical.join('. ') 
            : 'No critical zones detected';
            
        attentionZones.textContent = attention.length > 0 
            ? attention.join('. ') 
            : 'Areas performing within acceptable range';
            
        console.log('Zone descriptions updated:', { critical: critical.length, attention: attention.length });
    } else {
        // Default messages if no zone data
        criticalZones.textContent = 'Analyzing field zones...';
        attentionZones.textContent = 'Monitoring in progress...';
    }
}

// Update Action Cards
function updateActionCards(data) {
    const actionCards = document.getElementById('actionCards');
    if (!actionCards) return;
    
    if (data && data.health_analysis && data.health_analysis.recommendations) {
        const recommendations = data.health_analysis.recommendations;
        
        actionCards.innerHTML = recommendations.slice(0, 4).map((rec, index) => {
            const priority = index === 0 ? 'critical' : index === 1 ? 'warning' : 'info';
            const priorityText = index === 0 ? 'URGENT' : index === 1 ? 'HIGH' : 'MEDIUM';
            
            return `
                <div class="action-card ${priority}">
                    <div class="action-priority">${priorityText}</div>
                    <div class="action-text">${rec}</div>
                </div>
            `;
        }).join('');
    }
}

// Update All Visual Charts
function updateVisualCharts() {
    const stats = dashboardState.stats;
    
    createDonutChart(stats);
    createGaugeChart(stats);
    createRadarChart(stats);
    createStressChart(stats);
    createZoneHeatmap(stats);
}

// Update function to be called from updateStatisticsFromData
function updateStatisticsFromData(data) {
    if (!data || !data.statistics) {
        console.warn('No statistics data available');
        return;
    }
    
    const stats = data.statistics;
    const dist = data.distribution;
    
    // Update basic stats display
    const avgNDVI = document.getElementById('avgNDVI');
    const minNDVI = document.getElementById('minNDVI');
    const maxNDVI = document.getElementById('maxNDVI');
    const stressedArea = document.getElementById('stressedArea');
    
    if (avgNDVI) avgNDVI.textContent = stats.mean.toFixed(3);
    if (minNDVI) minNDVI.textContent = stats.min.toFixed(3);
    if (maxNDVI) maxNDVI.textContent = stats.max.toFixed(3);
    if (stressedArea) stressedArea.textContent = dist.stressed_percent.toFixed(1) + '%';
    
    // Update classification percentages
    const barePercent = document.getElementById('barePercent');
    const poorPercent = document.getElementById('poorPercent');
    const moderatePercent = document.getElementById('moderatePercent');
    const healthyPercent = document.getElementById('healthyPercent');
    
    if (barePercent) barePercent.textContent = dist.bare_percent.toFixed(1) + '%';
    if (poorPercent) poorPercent.textContent = dist.poor_percent.toFixed(1) + '%';
    if (moderatePercent) moderatePercent.textContent = dist.moderate_percent.toFixed(1) + '%';
    if (healthyPercent) healthyPercent.textContent = dist.healthy_percent.toFixed(1) + '%';
    
    // Update state for charts
    dashboardState.stats = {
        min: stats.min,
        max: stats.max,
        mean: stats.mean,
        std: stats.std,
        barePercent: dist.bare_percent.toFixed(1),
        poorPercent: dist.poor_percent.toFixed(1),
        moderatePercent: dist.moderate_percent.toFixed(1),
        healthyPercent: dist.healthy_percent.toFixed(1),
        stressed: dist.stressed_percent.toFixed(1)
    };
    
    // Update progress bars
    updateProgressBars(dashboardState.stats);
    
    // Update insights
    updateInsights(dashboardState.stats);
    
    // Create/update all charts
    updateVisualCharts();
    
    // Update zone descriptions
    updateZoneDescriptions(data);
    
    // Update action cards
    updateActionCards(data);
}

// ===== COMPACT UI UPDATES =====

// Update compact metric cards
function updateCompactMetrics(stats) {
    // Update avg NDVI
    const avgNDVI = document.getElementById('avgNDVI');
    if (avgNDVI) avgNDVI.textContent = stats.mean.toFixed(3);
    
    // Update stressed percentage
    const stressedArea = document.getElementById('stressedArea');
    if (stressedArea) {
        stressedArea.textContent = stats.stressed + '%';
    }
    
    // Update healthy percentage  
    const healthyPercent = document.getElementById('healthyPercent');
    if (healthyPercent) {
        healthyPercent.textContent = stats.healthyPercent + '%';
    }
    
    // Update NDVI range (min/max)
    const ndviRange = document.getElementById('ndviRange');
    if (ndviRange) {
        ndviRange.textContent = `${stats.min.toFixed(2)}-${stats.max.toFixed(2)}`;
    }
}

// Update stress analysis bullets
function updateStressAnalysis(data) {
    const stressList = document.getElementById('stressAnalysisList');
    if (!stressList) return;
    
    const analysis = data.health_analysis;
    const stats = data.statistics;
    const dist = data.distribution;
    
    const bullets = [];
    
    if (dist.stressed_percent > 30) {
        bullets.push(`High stress detected: ${dist.stressed_percent.toFixed(1)}% of field affected`);
    } else if (dist.stressed_percent > 15) {
        bullets.push(`Moderate stress: ${dist.stressed_percent.toFixed(1)}% requires monitoring`);
    } else {
        bullets.push(`Low stress level: ${dist.stressed_percent.toFixed(1)}% of field`);
    }
    
    if (dist.bare_percent > 5) {
        bullets.push(`Significant bare soil detected (${dist.bare_percent.toFixed(1)}%)`);
    }
    
    bullets.push(`Healthy vegetation: ${dist.healthy_percent.toFixed(1)}% coverage`);
    bullets.push(`NDVI range: ${stats.min.toFixed(2)} to ${stats.max.toFixed(2)}`);
    
    stressList.innerHTML = bullets.map(b => `<li>${b}</li>`).join('');
}

// Update compact distribution chart
function updateDistributionChartCompact() {
    const canvas = document.getElementById('distributionChart');
    if (!canvas) {
        console.warn('Distribution chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const stats = dashboardState.stats;
    
    if (!stats || !stats.barePercent) {
        console.warn('Stats not available for distribution chart');
        return;
    }
    
    const parentWidth = canvas.parentElement.offsetWidth;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = parentWidth * dpr;
    canvas.height = 160 * dpr;
    canvas.style.width = parentWidth + 'px';
    canvas.style.height = '160px';
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, parentWidth, 160);
    
    const values = [
        parseFloat(stats.barePercent) || 0,
        parseFloat(stats.poorPercent) || 0,
        parseFloat(stats.moderatePercent) || 0,
        parseFloat(stats.healthyPercent) || 0
    ];
    
    const colors = ['#f44336', '#ff9800', '#ffeb3b', '#4caf50'];
    const labels = ['Bare', 'Poor', 'Moderate', 'Healthy'];
    const barWidth = (parentWidth - 40) / values.length;
    const maxHeight = 120;
    
    values.forEach((value, i) => {
        const height = (value / 100) * maxHeight;
        const x = i * barWidth + 10;
        const y = 130 - height;
        
        // Draw bar
        ctx.fillStyle = colors[i];
        ctx.fillRect(x, y, barWidth - 8, height);
        
        // Draw percentage
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(value.toFixed(1) + '%', x + (barWidth - 8) / 2, y - 5);
        
        // Draw label
        ctx.font = '10px Inter';
        ctx.fillText(labels[i], x + (barWidth - 8) / 2, 150);
    });
    
    console.log('Distribution chart updated successfully');
}

// Update status summary
function updateStatusSummary(data) {
    const summary = document.getElementById('statusSummary');
    const badge = document.getElementById('overallStatusBadge');
    const analysis = data.health_analysis;
    
    if (badge) {
        const statusText = document.getElementById('overallHealth');
        if (statusText) statusText.textContent = analysis.overall_status;
        
        badge.className = 'status-badge-lg';
        if (analysis.overall_status.toLowerCase().includes('critical')) {
            badge.classList.add('critical');
        } else if (analysis.overall_status.toLowerCase().includes('warning')) {
            badge.classList.add('warning');
        }
    }
    
    if (summary) {
        const stressed = data.distribution.stressed_percent;
        summary.textContent = stressed > 30 
            ? 'Immediate attention required for stressed zones'
            : stressed > 15
            ? 'Monitor stressed areas closely'
            : 'Field health within acceptable parameters';
    }
}

// Update change summary
function updateChangeSummary(currentData, previousData) {
    const ndviChange = document.getElementById('ndviChange');
    const stressChange = document.getElementById('stressChange');
    const trendDirection = document.getElementById('trendDirection');
    
    if (!previousData) {
        if (ndviChange) ndviChange.textContent = 'N/A';
        if (stressChange) stressChange.textContent = 'N/A';
        if (trendDirection) trendDirection.textContent = '- No history';
        return;
    }
    
    const avgDiff = currentData.statistics.mean - previousData.statistics.mean;
    const stressDiff = currentData.distribution.stressed_percent - previousData.distribution.stressed_percent;
    
    if (ndviChange) {
        ndviChange.textContent = (avgDiff >= 0 ? '+' : '') + avgDiff.toFixed(3);
        ndviChange.className = 'change-value ' + (avgDiff >= 0 ? 'positive' : 'negative');
    }
    
    if (stressChange) {
        stressChange.textContent = (stressDiff >= 0 ? '+' : '') + stressDiff.toFixed(1) + '%';
        stressChange.className = 'change-value ' + (stressDiff <= 0 ? 'positive' : 'negative');
    }
    
    if (trendDirection) {
        if (avgDiff > 0.05) {
            trendDirection.textContent = '↑ Improving';
            trendDirection.className = 'change-value positive';
        } else if (avgDiff < -0.05) {
            trendDirection.textContent = '↓ Declining';
            trendDirection.className = 'change-value negative';
        } else {
            trendDirection.textContent = '→ Stable';
            trendDirection.className = 'change-value';
        }
    }
}

// Update recommendations list
function updateRecommendationsList(data) {
    const actionList = document.getElementById('actionList');
    if (!actionList) return;
    
    const stressed = data.distribution.stressed_percent;
    const bare = data.distribution.bare_percent;
    const mean = data.statistics.mean;
    const actions = [];
    
    // Determine priority actions based on data
    if (bare > 20) {
        actions.push({ priority: 'p1', text: 'Assess soil conditions in bare zones - replanting required' });
    }
    if (stressed > 35) {
        actions.push({ priority: 'p1', text: 'Irrigation system check - water stress detected' });
    }
    if (mean < 0.2) {
        actions.push({ priority: 'p1', text: 'Field inspection required - overall health critical' });
    }
    if (stressed > 20 && stressed <= 35) {
        actions.push({ priority: 'p2', text: 'Soil sampling recommended for nutrient analysis' });
    }
    if (data.distribution.poor_percent > 15) {
        actions.push({ priority: 'p2', text: 'Monitor poor zones - early intervention possible' });
    }
    if (stressed < 20) {
        actions.push({ priority: 'p3', text: 'Maintain current management practices' });
    }
    
    // Limit to top 3-4 actions
    const displayActions = actions.slice(0, 4);
    
    actionList.innerHTML = displayActions.length > 0 
        ? displayActions.map(action => 
            `<div class="priority-item ${action.priority}">
                <span class="priority-tag">${action.priority.toUpperCase()}</span>
                <span class="priority-text">${action.text}</span>
            </div>`
        ).join('')
        : '<div class="priority-item p3"><span class="priority-tag">P3</span><span class="priority-text">No critical actions required</span></div>';
}

// Update factor grid with data-driven assessments
function updateFactorGrid(data) {
    const stressed = data.distribution.stressed_percent;
    const mean = data.statistics.mean;
    const std = data.statistics.std;
    const bare = data.distribution.bare_percent;
    
    // Water stress assessment (based on widespread low NDVI)
    const waterImpact = document.getElementById('waterImpact');
    if (waterImpact) {
        if (stressed > 50 && mean < 0.2) {
            waterImpact.textContent = 'High';
            waterImpact.style.color = '#e74c3c';
        } else if (stressed > 30) {
            waterImpact.textContent = 'Moderate';
            waterImpact.style.color = '#f39c12';
        } else {
            waterImpact.textContent = 'Low';
            waterImpact.style.color = '#95a5a6';
        }
    }
    
    // Nutrient stress assessment (based on patchiness - std deviation)
    const nutrientImpact = document.getElementById('nutrientImpact');
    if (nutrientImpact) {
        if (std > 0.25) {
            nutrientImpact.textContent = 'High';
            nutrientImpact.style.color = '#e74c3c';
        } else if (std > 0.15) {
            nutrientImpact.textContent = 'Moderate';
            nutrientImpact.style.color = '#f39c12';
        } else {
            nutrientImpact.textContent = 'Low';
            nutrientImpact.style.color = '#95a5a6';
        }
    }
    
    // Compaction risk (estimated from edge effects and bare soil)
    const compactionImpact = document.getElementById('compactionImpact');
    if (compactionImpact) {
        if (bare > 25) {
            compactionImpact.textContent = 'High';
            compactionImpact.style.color = '#e74c3c';
        } else if (bare > 10) {
            compactionImpact.textContent = 'Moderate';
            compactionImpact.style.color = '#f39c12';
        } else {
            compactionImpact.textContent = 'Low';
            compactionImpact.style.color = '#95a5a6';
        }
    }
    
    // Temporal stress (would need historical data - placeholder)
    const temporalImpact = document.getElementById('temporalImpact');
    if (temporalImpact) {
        temporalImpact.textContent = 'Unknown';
        temporalImpact.style.color = '#95a5a6';
    }
}

// Master update function for compact UI
function updateCompactUI(data) {
    updateCompactMetrics(data.statistics);
    updateStressAnalysis(data);
    updateDistributionChartCompact();
    updateStatusSummary(data);
    updateRecommendationsList(data);
    updateFactorGrid(data);
    
    // Update classification values
    const dist = data.distribution;
    const barePercentMetric = document.getElementById('barePercentMetric');
    const poorPercentMetric = document.getElementById('poorPercentMetric');
    const moderatePercentMetric = document.getElementById('moderatePercentMetric');
    const healthyPercentMetric = document.getElementById('healthyPercentMetric');
    
    if (barePercentMetric) barePercentMetric.textContent = dist.bare_percent.toFixed(1) + '%';
    if (poorPercentMetric) poorPercentMetric.textContent = dist.poor_percent.toFixed(1) + '%';
    if (moderatePercentMetric) moderatePercentMetric.textContent = dist.moderate_percent.toFixed(1) + '%';
    if (healthyPercentMetric) healthyPercentMetric.textContent = dist.healthy_percent.toFixed(1) + '%';
    
    // Create all charts
    createAllCharts(data);
}

// ===== ALL CHART CREATION FUNCTIONS =====

function createAllCharts(data) {
    createDonutChart(data);
    createGaugeChart(data);
    createTrendChart(data);
    createStressChart(data);
    createRadarChart(data);
}

// Donut Chart for Health Distribution
function createDonutChart(data) {
    const canvas = document.getElementById('donutChart');
    if (!canvas) {
        console.warn('Donut chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Get data from stats object
    const stats = dashboardState.stats;
    if (!stats) {
        console.warn('Stats not available for donut chart');
        return;
    }
    
    // Destroy existing chart if any
    if (dashboardState.charts.donut) {
        dashboardState.charts.donut.destroy();
    }
    
    dashboardState.charts.donut = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Healthy', 'Moderate', 'Poor', 'Bare'],
            datasets: [{
                data: [
                    parseFloat(stats.healthyPercent) || 0,
                    parseFloat(stats.moderatePercent) || 0,
                    parseFloat(stats.poorPercent) || 0,
                    parseFloat(stats.barePercent) || 0
                ],
                backgroundColor: [
                    '#4caf50',
                    '#ffeb3b',
                    '#ff9800',
                    '#f44336'
                ],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#2c3e50',
                        font: { size: 10 },
                        boxWidth: 12,
                        padding: 8
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });
    
    console.log('Donut chart updated successfully');
}

// Gauge Chart for Overall Health Score
function createGaugeChart(data) {
    const canvas = document.getElementById('gaugeChart');
    if (!canvas) {
        console.warn('Gauge chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Get mean from either dashboardState.stats or data parameter
    const stats = dashboardState.stats;
    if (!stats || !stats.mean) {
        console.warn('Stats not available for gauge chart');
        return;
    }
    
    const healthScore = ((stats.mean + 1) / 2 * 100).toFixed(0); // Convert -1 to 1 range to 0-100
    
    // Update health score display
    const scoreDisplay = document.getElementById('healthScoreDisplay');
    if (scoreDisplay) {
        scoreDisplay.textContent = healthScore;
    }
    
    // Destroy existing chart
    if (dashboardState.charts.gauge) {
        dashboardState.charts.gauge.destroy();
    }
    
    dashboardState.charts.gauge = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [healthScore, 100 - healthScore],
                backgroundColor: [
                    healthScore > 70 ? '#4caf50' : healthScore > 40 ? '#ffb74d' : '#f44336',
                    '#e0e4e8'
                ],
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
}

// Trend Chart
function createTrendChart(data) {
    const canvas = document.getElementById('trendChart');
    if (!canvas) {
        console.warn('Trend chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const stats = dashboardState.stats;
    
    if (!stats || !stats.mean) {
        console.warn('Stats not available for trend chart');
        return;
    }
    
    // Create sample trend data (in real app, fetch historical data)
    const dates = ['7d ago', '6d ago', '5d ago', '4d ago', '3d ago', '2d ago', 'Yesterday', 'Today'];
    const values = [
        stats.mean - 0.15,
        stats.mean - 0.12,
        stats.mean - 0.08,
        stats.mean - 0.05,
        stats.mean - 0.03,
        stats.mean - 0.01,
        stats.mean + 0.01,
        stats.mean
    ];
    
    if (dashboardState.charts.trend) {
        dashboardState.charts.trend.destroy();
    }
    
    dashboardState.charts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'NDVI',
                data: values,
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#2c3e50',
                    bodyColor: '#2c3e50',
                    borderColor: '#e0e4e8',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    ticks: { color: '#2c3e50', font: { size: 9 } },
                    grid: { color: '#e0e4e8' }
                },
                x: {
                    ticks: { color: '#2c3e50', font: { size: 8 }, maxRotation: 45 },
                    grid: { display: false }
                }
            }
        }
    });
}

// Stress Indicators Chart
function createStressChart(data) {
    const canvas = document.getElementById('stressChart');
    if (!canvas) {
        console.warn('Stress chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const stats = dashboardState.stats;
    
    if (!stats) {
        console.warn('Stats not available for stress chart');
        return;
    }
    
    if (dashboardState.charts.stress) {
        dashboardState.charts.stress.destroy();
    }
    
    const criticalCount = Math.round(parseFloat(stats.barePercent) / 10);
    const warningCount = Math.round(parseFloat(stats.poorPercent) / 10);
    const monitorCount = Math.round(parseFloat(stats.moderatePercent) / 10);
    
    dashboardState.charts.stress = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Critical', 'Warning', 'Monitor'],
            datasets: [{
                data: [criticalCount, warningCount, monitorCount],
                backgroundColor: ['#f44336', '#ff9800', '#ffb74d'],
                borderColor: '#ffffff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Zones: ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#2c3e50', font: { size: 9 } },
                    grid: { color: '#e0e4e8' }
                },
                x: {
                    ticks: { color: '#2c3e50', font: { size: 10 } },
                    grid: { display: false }
                }
            }
        }
    });
}

// Radar Chart for Field Metrics
function createRadarChart(data) {
    const canvas = document.getElementById('radarChart');
    if (!canvas) {
        console.warn('Radar chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const stats = dashboardState.stats;
    
    if (!stats) {
        console.warn('Stats not available for radar chart');
        return;
    }
    
    if (dashboardState.charts.radar) {
        dashboardState.charts.radar.destroy();
    }
    
    dashboardState.charts.radar = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Health', 'Coverage', 'Uniformity', 'Vigor', 'Quality'],
            datasets: [{
                label: 'Field Metrics',
                data: [
                    parseFloat(stats.healthyPercent),
                    100 - parseFloat(stats.barePercent),
                    100 - (stats.std * 100),
                    ((stats.mean + 1) / 2 * 100),
                    parseFloat(stats.healthyPercent) + parseFloat(stats.moderatePercent) * 0.5
                ],
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                borderColor: '#4caf50',
                borderWidth: 2,
                pointBackgroundColor: '#4caf50',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#4caf50'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                r: {
                    angleLines: { color: '#e0e4e8' },
                    grid: { color: '#e0e4e8' },
                    pointLabels: {
                        color: '#2c3e50',
                        font: { size: 9 }
                    },
                    ticks: {
                        color: '#2c3e50',
                        backdropColor: 'transparent',
                        font: { size: 8 }
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            }
        }
    });
}
