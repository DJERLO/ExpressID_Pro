import { removeBackground, preload } from '@imgly/background-removal';
import 'cropperjs/dist/cropper.css';
import  Cropper from 'cropperjs';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

async function getGpuInfo() {
    if (!('gpu' in navigator)) {
        return { hasGpu: false, isDedicated: false, vendor: 'none' };
    }

    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            return { hasGpu: false, isDedicated: false, vendor: 'none' };
        }

        // Fix: Use adapter.info synchronously instead of requestAdapterInfo()
        const info = adapter.info || {};
        const vendor = (info.vendor || '').toLowerCase();
        const architecture = (info.architecture || '').toLowerCase();
        const description = (info.description || '').toLowerCase();

        // Integrated graphics usually keywords: intel, amd (integrated variants), apple (m-series unified)
        // Dedicated keywords: nvidia, amd radeon rx, discrete
        const isIntegrated = 
            vendor.includes('intel') || 
            description.includes('intel') || 
            architecture.includes('intel') ||
            (vendor.includes('amd') && !description.includes('rx')); // Basic heuristic for integrated AMD Vega/RDNA APUs

        return {
            hasGpu: true,
            isDedicated: !isIntegrated,
            vendor: info.vendor || 'unknown',
            description: info.description || 'unknown'
        };
    } catch (err) {
        console.warn('WebGPU adapter query failed:', err);
        return { hasGpu: false, isDedicated: false, vendor: 'error' };
    }
    
}

async function determineAppTier() {
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    const gpuInfo = await getGpuInfo();

    let selectedDevice = 'cpu';
    let selectedModel = 'isnet_quint8';

    if (!isMobile && gpuInfo.hasGpu && gpuInfo.isDedicated) {
        // Tier 3: Verified Dedicated Desktop GPU -> Full WebGPU + Highest Quality Model
        console.log('Tier 3: Dedicated GPU Desktop (WebGPU + Full IsNet Model)');
        selectedDevice = 'gpu';
        selectedModel = 'isnet';
    } else if (!isMobile && gpuInfo.hasGpu && !gpuInfo.isDedicated) {
        // Tier 2: Laptop or Integrated Graphics (e.g., Acer Aspire 3) -> Safe CPU/FP16 Configuration
        console.log('Tier 2: Integrated Graphics / Laptop (Optimized FP16 Model)');
        selectedDevice = 'cpu';
        selectedModel = 'isnet_fp16';
    } else {
        // Tier 1: Mobile or Low-end Device -> Lightweight Quint8 Model
        console.log('Tier 1: Mobile / Low-end (CPU + Quint8 Model)');
        selectedDevice = 'cpu';
        selectedModel = 'isnet_quint8';
    }

    return { device: selectedDevice, model: selectedModel };
}

const { device: selectedDevice, model: selectedModel } = await determineAppTier();

const config = {
    device: selectedDevice,
    model: selectedModel,
    publicPath: `${window.location.origin}/dist/`,
    debug: false,
    progress: (key, current, total) => {
        const percent = total ? Math.round((current / total) * 100) : 0;
        
        const textEl = document.getElementById('loader-text');
        const barEl = document.getElementById('loader-progress-bar');
        
        if (textEl) textEl.textContent = `Downloading AI Assets (${key}...): ${percent}%`;
        if (barEl) barEl.style.width = `${percent}%`;
    }
};

// Global debounce utility
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
/**
 * Removes the background from an image using the Imgly Background Removal API.
 * @param {string} imageSource - The source URL of the image to process.
 * @returns {Promise<string>} - A promise that resolves to the processed image source URL.
 */
async function removePhotoBackground(imageSource) {
    const loader = document.getElementById('bg-loader');
    if (loader) {
        loader.style.display = 'flex';
        loader.removeAttribute('inert');
    }
    try {
        const blob = await removeBackground(imageSource, config);
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Background removal failed:', error);
        return imageSource;
    } finally {
        if (loader) {
            loader.style.display = 'none';
            loader.setAttribute('inert', '');
        }
    }
}

const DPI = 300;
const packages = {
    "Package A": [
        { w: 1, h: 1, unit: "inch", qty: 8, label: "1 x 1" },
        { w: 2, h: 2, unit: "inch", qty: 2, label: "2 x 2" }
    ],
    "Package B": [
        { w: 1, h: 1, unit: "inch", qty: 4, label: "1 x 1" },
        { w: 2, h: 2, unit: "inch", qty: 4, label: "2 x 2" }
    ],
    "Package C": [
        { w: 1, h: 1, unit: "inch", qty: 8, label: "1 x 1" },
        { w: 2, h: 2, unit: "inch", qty: 3, label: "2 x 2" }
    ],
    "Package D": [
        { w: 1, h: 1, unit: "inch", qty: 4, label: "1 x 1" },
        { w: 2, h: 2, unit: "inch", qty: 2, label: "2 x 2" },
        { w: 35, h: 45, unit: "mm", qty: 1, label: "Passport" }
    ],
    "Package E": [
        { w: 1, h: 1, unit: "inch", qty: 8, label: "1 x 1" },
        { w: 35, h: 45, unit: "mm", qty: 6, label: "Passport" }
    ]
};
const presets = {
    "1x1": [1, 1, "inch", 8],
    "1.5x1.5": [1.5, 1.5, "inch", 6],
    "2x2": [2, 2, "inch", 4],
    Passport: [35, 45, "mm", 8],
    Visa: [2, 2, "inch", 4],
    "Half Body": [3, 4, "inch", 2],
    Wallet: [2.5, 3.5, "inch", 4],
    A4: [8.27, 11.69, "inch", 1]
};
const idCardPresets = {
    "CR80 Landscape (3.37 × 2.13 in)": [3.37, 2.13],
    "CR80 Portrait (2.13 × 3.37 in)": [2.13, 3.37],
    "CR79 Access (3.30 × 2.05 in)": [3.30, 2.05],
    "CR100 Oversized (3.88 × 2.63 in)": [3.88, 2.63],
    "Custom": [0, 0]
};
const papers = {
    "3R (3.5 x 5)": [3.5, 5],
    "4R (4 x 6)": [4, 6],
    "5R (5 x 7)": [5, 7],
    "A4 (8.27 x 11.69)": [8.27, 11.69],
    "Letter (8.5 x 11)": [8.5, 11],
    "Folio (8.5 x 13)": [8.5, 13],
    "Legal (8.5 x 14)": [8.5, 14],
    Custom: [8.5, 11]
};

// Signature Pad Setup
let sigCanvas, sigCtx;
let isSigning = false;


let state = {
    paper: "5R (5 x 7)", // Default paper size
    sizes: [{
        w: 2,
        h: 2,
        unit: "inch",
        qty: 4,
        label: "2 x 2"
    }],
    image: null,
    cropper: null,
    flip: 1,
    rotation: 0,
    currentPage: 0,
    stageZoom: 100,
    originalImage: null,
    removedBackground: null,
    idCards: {
        front: null,
        back: null,
        cropper: null,
        active: null,
        rotation: 0
    },
    panX: 0,
    panY: 0,
    isPanning: false,
    startX: 0,
    startY: 0,
};
const $ = id => document.getElementById(id);
function toIn(v, u) {
    v = +v || 0;
    return u === 'mm' ? v / 25.4 : u === 'cm' ? v / 2.54 : v
}

/**
 * Update Canvas Transform when Stage Zoom changes
 */
function updateCanvasTransform() {
    const canvas = $('previewCanvas');
    const label = $('stageZoomLabel');
    
    if (canvas) {
        canvas.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.stageZoom / 100})`;
    }
    if (label) {
        label.textContent = `${Math.round(state.stageZoom)}%`;
    }
}

/**
 * Update Stage Zoom
 * @param {*} newZoom 
 */
function updateStageZoom(newZoom) {
    // Clamp zoom level between 30% and 300%
    state.stageZoom = Math.min(Math.max(newZoom, 30), 300);
    updateCanvasTransform();
}

// Setup Draggable Canvas Panning
function setupCanvasPanning() {
    const stage = document.querySelector('.preview-stage');
    const canvas = $('previewCanvas');
    if (!stage || !canvas) return;

    const startPan = (clientX, clientY) => {
        state.isPanning = true;
        state.startX = clientX - state.panX;
        state.startY = clientY - state.panY;
        stage.style.cursor = 'grabbing';
        canvas.style.cursor = 'grabbing';
    };

    const movePan = (clientX, clientY) => {
        if (!state.isPanning) return;
        state.panX = clientX - state.startX;
        state.panY = clientY - state.startY;
        updateCanvasTransform();
    };

    const endPan = () => {
        if (!state.isPanning) return;
        state.isPanning = false;
        stage.style.cursor = 'grab';
        canvas.style.cursor = 'grab';
    };

    // Mouse Events
    stage.addEventListener('mousedown', (e) => {
        // Only trigger pan on left click and if clicking stage or canvas directly
        if (e.button !== 0) return;
        startPan(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
        movePan(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', endPan);

    // Touch Events for Mobile / Tablets
    stage.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            startPan(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            movePan(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    window.addEventListener('touchend', endPan);

    // Reset pan when clicking 'Fit' (Zoom Reset)
    const btnReset = $('stageZoomReset');
    if (btnReset) {
        const originalOnClick = btnReset.onclick;
        btnReset.onclick = (e) => {
            state.panX = 0;
            state.panY = 0;
            updateStageZoom(100);
            if (originalOnClick) originalOnClick(e);
        };
    }
}

/**
 * Snap canvas to center
 * @returns 
 */
function centerCanvas() {
    const stage = document.querySelector('.preview-stage');
    const canvas = $('previewCanvas');
    
    if (!stage || !canvas) return;

    // Center the canvas
    state.panX = 0;
    state.panY = 0;

    updateCanvasTransform();
}

// Bind controls inside init() function
function setupStageZoom() {
    const btnIn = $('stageZoomIn');
    const btnOut = $('stageZoomOut');
    const btnReset = $('stageZoomReset');

    if (btnIn) btnIn.onclick = () => updateStageZoom(state.stageZoom + 15);
    if (btnOut) btnOut.onclick = () => updateStageZoom(state.stageZoom - 15);
    if (btnReset) {
        btnReset.onclick = () => {
            updateStageZoom(100); // Reset scale
            centerCanvas();       // Snap to center
        };
    }

    // Optional: Mouse wheel zoom over preview stage (Hold Ctrl / Cmd + Scroll)
    const stage = document.querySelector('.preview-stage');
    if (stage) {
        stage.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 10 : -10;
                updateStageZoom(state.stageZoom + delta);
            }
        }, { passive: false });
    }
}
/**
 * Network Status Handler
 */
function initNetworkListener() {
    const modal = $('network-modal');
    const msg = $('network-message');
    const icon = $('network-icon');

    function updateNetworkStatus(e) {
        const isOnline = navigator.onLine;

        // 2. Trigger status modal only on active connection changes or when offline
        if (!isOnline) {
            modal.className = 'network-modal offline';
            modal.removeAttribute('inert');
            icon.textContent = '📡';
            msg.textContent = 'You lost internet connection.';
        } else if (e && e.type === 'online') {
            modal.className = 'network-modal online';
            modal.removeAttribute('inert');
            icon.textContent = '⚡';
            msg.textContent = 'You are back online!';
            preload(config)
            .then(() => {
                console.log("Asset preloading succeeded");
            })
            .catch(err => {
                console.log('Background preload skipped or failed:', err);
            })
            .finally(() => {
                // 3. Hide the loader once preloading succeeds or fails
                if (loader) loader.style.display = 'none';
            });

            // Auto-hide the "Back Online" message after 3.5 seconds
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.setAttribute('inert', '');
            }, 3500);
        }
    }

    // Bind browser native events
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Initial check on boot
    if (!navigator.onLine) {
        updateNetworkStatus();
    }
}
function init() {
    const loader = document.getElementById('bg-loader');
    if (loader) {
        loader.style.display = 'flex';
        loader.removeAttribute('inert');
    }
    // Trigger preloading of AI background removal model assets in the background if online
    if (navigator.onLine) {
        preload(config)
        .then(() => {
            console.log("Asset preloading succeeded");
        })
        .catch(err => {
            console.log('Background preload skipped or failed:', err);
        })
        .finally(() => {
            // 3. Hide the loader once preloading succeeds or fails
            if (loader) loader.style.display = 'none';
        });
    } else {
        // Hide immediately if offline
        if (loader) {
            loader.style.display = 'none';
            loader.setAttribute('inert', '');
        }
    }

    $('currentYear').textContent = new Date().getFullYear();
    $('removeBgBtn').onclick = handleRemoveBackground;

    document.getElementById('prevPage').onclick = () => {
        if (state.currentPage > 0) {
            state.currentPage--;
            draw();
        }
    };

    document.getElementById('nextPage').onclick = () => {
        state.currentPage++;
        draw();
    };

    ['photoWidth', 'photoHeight', 'unit'].forEach(id => {
        $(id).addEventListener('input', () => {
            if (state.cropper) {
                state.cropper.setAspectRatio(getCurrentAspectRatio());
            }
            draw();
        });
    });

    Object.keys(packages).forEach(k => {
        let b = document.createElement('button');
        
        // Summary subtext (e.g., "2x2 (2) + 1x1 (4)")
        let desc = packages[k].map(i => `${i.label} (${i.qty})`).join(' + ');
        
        b.type = 'button';
        b.dataset.packageKey = k;
        b.setAttribute('aria-label', `Select ${k}: ${desc}`);
        b.innerHTML = `<b>${k}</b><br><small>${desc}</small>`;
        b.onclick = () => selectPackage(k);
        
        $('packageGrid').appendChild(b);
    });
    Object.keys(presets).forEach(k => {
        let b = document.createElement('button');
        b.type = 'button';
        b.textContent = k;
        b.setAttribute('aria-label', `Apply preset size ${k}`);
        b.onclick = () => selectPreset(k);
        $('presetGrid').appendChild(b)
    }
    );
    Object.keys(idCardPresets).forEach(k => {
        let select = document.getElementById('idPresetSelect');
        let option = document.createElement('option');
        option.value = k;
        option.textContent = k;
        select.appendChild(option);
    });
    Object.keys(papers).forEach(k => {
        let b = document.createElement('button');
        b.textContent = k;
        b.type = 'button';
        b.onclick = () => {
            state.paper = k;
            renderButtons();
            draw()
        };
        $('paperGrid').appendChild(b)
    }
    );
    $('applyCustomPaper').onclick = () => {
        papers.Custom = [+$('customPaperWidth').value || 8.5, +$('customPaperHeight').value || 11];
        state.paper = 'Custom';
        renderButtons();
        draw()
    }
    ;
    const debouncedDraw = debounce(draw, 50);

    ['margin', 'spacing', 'brightness', 'contrast', 'zoom', 'landscape', 'guides', 'labels', 'borders', 'customPaperWidth', 'customPaperHeight'].forEach(id => {
        $(id).addEventListener('input', debouncedDraw);
    });
    $('zoom').oninput = e => {
        const val = +e.target.value;
        $('zoomValue').textContent = val + '%';

        if (state.cropper) {
            // Get full container dimensions of the cropper
            const containerData = state.cropper.getContainerData();
            const aspectRatio = getCurrentAspectRatio();

            // 100% = max fit inside container (full view)
            // 50% = crop box is half the size (zoomed in 2x on center)
            const scale = val / 100;

            let newWidth = containerData.width * scale;
            let newHeight = newWidth / aspectRatio;

            // If height overflows container, scale based on height instead
            if (newHeight > containerData.height) {
                newHeight = containerData.height * scale;
                newWidth = newHeight * aspectRatio;
            }

            // Center the crop box
            const left = (containerData.width - newWidth) / 2;
            const top = (containerData.height - newHeight) / 2;

            state.cropper.setCropBoxData({
                left: left,
                top: top,
                width: newWidth,
                height: newHeight
            });
        }
        draw();
    };
    $('brightness').oninput = e => $('brightnessValue').textContent = e.target.value + '%';
    $('contrast').oninput = e => $('contrastValue').textContent = e.target.value + '%';
    $('margin').oninput = e => $('marginValue').textContent = (+e.target.value).toFixed(2) + ' in';
    $('spacing').oninput = e => $('spacingValue').textContent = (+e.target.value).toFixed(2) + ' in';
    $('addSize').onclick = addSize;
    $('rotate').onclick = () => {
        state.rotation = (state.rotation + 90) % 360;
        if (state.cropper)
            state.cropper.rotate(90);
        draw()
    }
    ;
    $('flip').onclick = () => {
        state.flip *= -1;
        if (state.cropper)
            state.cropper.scaleX(state.flip);
        draw()
    }
    ;
    $('downloadPng').onclick = downloadPNG;
    $('downloadPdf').onclick = downloadPDF;
    $('printBtn').onclick = printCanvas;
    initNetworkListener();
    setupUpload();
    setupIdCardPrint();
    setupCanvasPanning();
    setupStageZoom();
    initSignaturePad();
    renderButtons();
    renderSizeList();
    draw()
}
function selectPreset(k) {
    let p = presets[k];
    $('photoWidth').value = p[0];
    $('photoHeight').value = p[1];
    $('unit').value = p[2];
    $('quantity').value = p[3];

    // Preserve any active ID card items currently in state
    const existingIdCards = state.sizes.filter(s => s.idCard);

    state.sizes = [
        {
            w: p[0],
            h: p[1],
            unit: p[2],
            qty: p[3],
            label: k
        },
        ...existingIdCards
    ];

    if (state.cropper) {
        let targetWidthInInches = toIn(p[0], p[2]);
        let targetHeightInInches = toIn(p[1], p[2]);
        state.cropper.setAspectRatio(targetWidthInInches / targetHeightInInches);
    }

    renderSizeList();
    renderButtons(k);
    renderPackageButtons(null);
    draw()
}
function renderButtons(active = "2x2") {
    [...$('presetGrid').children].forEach(b => b.classList.toggle('active', b.textContent === active));
    [...$('paperGrid').children].forEach(b => b.classList.toggle('active', b.textContent === state.paper));
}
function addSize() {
    state.sizes.push({
        w: +$('photoWidth').value,
        h: +$('photoHeight').value,
        unit: $('unit').value,
        qty: +$('quantity').value,
        label: `${$('photoWidth').value} x ${$('photoHeight').value}`
    });
    renderSizeList();
    draw()
}
function renderSizeList() {
    $('sizeList').innerHTML = '';
    state.sizes.forEach( (s, i) => {
        let d = document.createElement('div');
        d.className = 'size-item';
        d.innerHTML = `<div><b>${s.label}</b><br><small>${s.w} × ${s.h} ${s.unit} · ${s.qty} copies</small></div><button type="button" class="remove" aria-label="Remove ${s.label} size from list">×</button>`;
        d.querySelector('button').onclick = () => {
            state.sizes.splice(i, 1);
            renderSizeList();
            draw()
        }
        ;
        $('sizeList').appendChild(d)
    }
    )
}
function setupUpload() {
    const dz = $('dropZone')
      , fi = $('fileInput');
    ['dragenter', 'dragover'].forEach(e => dz.addEventListener(e, ev => {
        ev.preventDefault();
        dz.classList.add('drag')
    }
    ));
    ['dragleave', 'drop'].forEach(e => dz.addEventListener(e, ev => {
        ev.preventDefault();
        dz.classList.remove('drag')
    }
    ));
    dz.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));
    fi.onchange = e => loadFile(e.target.files[0]);
    dz.onkeydown = e => {
        if (e.key === 'Enter' || e.key === ' ')
            fi.click()
    }
}

async function handleRemoveBackground() {
    // Determine the current image source (either from the cropper or the state)
    const currentSrc = $('cropImage')?.src || state.image;

    if (!currentSrc) {
        return alert('Please upload an image first.');
    }

    const btn = $('removeBgBtn');
    const originalText = btn.textContent;

    try {
        // UI Loading state
        btn.disabled = true;
        btn.textContent = '⏳ Removing Background...';

        // Call the imgly background removal function
        let processedUrl = await removePhotoBackground(currentSrc);

        if (processedUrl) {
            updateImageSource(processedUrl);
        } else {
            // If the background removal fails, show an alert
            alert('Could not remove background. Please try another image.');
            preload(config)
            .then(() => {
                console.log("Asset preloading succeeded");
            })
            .catch(err => {
                console.log('Background preload skipped or failed:', err);
            })
            .finally(() => {
                // 3. Hide the loader once preloading succeeds or fails
                if (loader) loader.style.display = 'none';
            });
        }
    } catch (err) {
        console.error('Background removal error:', err);
        alert('An error occurred while removing the background.');
    } finally {
        // Restore button state
        btn.disabled = false;
        btn.textContent = originalText;
    }
}
/**
 * Replaces the current state image and refreshes the Cropper instance if initialized
 */
function updateImageSource(newUrl) {
    let cropRaf = null;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        state.image = img;
        $('thumb').src = newUrl;
        $('thumb').hidden = false;
        $('dropText').hidden = true;
        $('cropImage').src = newUrl;
        $('cropImage').onload = () => {
        if (state.cropper)
            state.cropper.destroy();
        state.cropper = new Cropper($('cropImage'),{
            aspectRatio: getCurrentAspectRatio(),
            action: "move",
            dragMode: 'move',
            viewMode: 0,
            autoCropArea: 1,
            background: true,
            moveable: true,
            crosshairs: true,
            responsive: true,
            crop: () => draw(),
            ready: () => draw()
        });
        state.image = newUrl;
        }
        draw();
    };
    img.src = newUrl;
}
async function loadFile(f) {
    if (!f || !/image\/(jpeg|png)/.test(f.type))
        return alert('Please upload a JPG or PNG.');
    
    let originalUrl = URL.createObjectURL(f);

    $('thumb').src = originalUrl;
    $('thumb').hidden = false;
    $('dropText').hidden = true;
    $('cropImage').src = originalUrl;
    $('cropImage').onload = () => {
        if (state.cropper)
            state.cropper.destroy();
        state.cropper = new Cropper($('cropImage'),{
            action: "move",
            dragMode: "move",
            aspectRatio: getCurrentAspectRatio(),
            viewMode: 0,
            autoCropArea: 1,
            cropBoxMovable: false,
            cropBoxResizable: false,
            background: true,
            moveable: true,
            crosshairs: true,
            responsive: true,
            zoomOnWheel: true,
            zoomOnTouch: true,
            crop: () => draw(),
            ready: () => draw()
        });
        state.image = originalUrl;
        draw()
    }
}
function layoutPhotos(pw, ph, margin, spacing) {
    let normalItems = [];
    let idGroups = [];

    state.sizes.forEach(s => {
        if (s.idCard) {
            idGroups.push(s);
        } else {
            for (let i = 0; i < s.qty; i++) {
                normalItems.push({
                    w: toIn(s.w, s.unit) * DPI,
                    h: toIn(s.h, s.unit) * DPI,
                    label: s.label
                });
            }
        }
    });

    let items = [...normalItems];
    idGroups.forEach(s => {
        const cw = toIn(s.w, s.unit) * DPI;
        const ch = toIn(s.h, s.unit) * DPI;
        const output = s.output || $('idCardOutput')?.value || 'topBottom';
        const currentMoveX = $('idMoveX') ? +$('idMoveX').value : 0;
        const currentMoveY = $('idMoveY') ? +$('idMoveY').value : 0;
        const moveX = ((s.moveX ?? currentMoveX) || 0) * DPI;
        const moveY = ((s.moveY ?? currentMoveY) || 0) * DPI;

        for (let i = 0; i < (s.copies || 1); i++) {
            if (s.mode === 'frontOnly' || s.mode === 'backOnly') {
                const side = s.mode === 'frontOnly' ? 'front' : 'back';
                items.push({
                    w: cw,
                    h: ch,
                    label: side === 'front' ? 'ID FRONT' : 'ID BACK',
                    idSide: side,
                    forceCenter: true,
                    moveX,
                    moveY
                });
            } else {
                const gap = spacing;
                const gw = output === 'sideBySide' ? cw * 2 + gap : cw;
                const gh = output === 'sideBySide' ? ch : ch * 2 + gap;
                items.push({
                    w: gw,
                    h: gh,
                    label: 'ID PAIR',
                    idPair: true,
                    output,
                    cw,
                    ch,
                    gap,
                    moveX,
                    moveY
                });
            }
        }
    });

    let pages = [];
    let page = [];
    let y = margin;
    let x = margin;
    let rowH = 0;
    let row = [];

    function flushRow() {
        if (!row.length) return;
        let rowW = row.reduce((a, it) => a + it.w, 0) + spacing * (row.length - 1);
        let offset = (pw - rowW) / 2;
        row.forEach((it, idx) => {
            it.x = offset + row.slice(0, idx).reduce((a, r) => a + r.w + spacing, 0);
            it.y = y;
            page.push(it);
        });
        y += rowH + spacing;
        x = margin;
        rowH = 0;
        row = [];
    }

    function pushCentered(it) {
        if (page.length || row.length) {
            flushRow();
            if (page.length) {
                pages.push(page);
                page = [];
                y = margin;
            }
        }
        it.x = (pw - it.w) / 2 + (it.moveX || 0);
        it.y = (ph - it.h) / 2 + (it.moveY || 0);
        it.x = Math.max(margin, Math.min(pw - margin - it.w, it.x));
        it.y = Math.max(margin, Math.min(ph - margin - it.h, it.y));

        page.push(it);
        pages.push(page);
        page = [];
        y = margin;
        x = margin;
        rowH = 0;
    }

    items.forEach(it => {
        if (it.idPair || it.forceCenter) {
            pushCentered(it);
            return;
        }
        if (x + it.w > pw - margin && row.length) flushRow();
        if (y + it.h > ph - margin && page.length) {
            flushRow();
            pages.push(page);
            page = [];
            y = margin;
        }
        row.push(it);
        x += it.w + spacing;
        rowH = Math.max(rowH, it.h);
    });

    flushRow();
    if (page.length) pages.push(page);

    return pages.length ? pages : [[]];
}
function getCroppedCanvas() {
    if (!state.cropper) return null;

    const croppedCanvas = state.cropper.getCroppedCanvas({
        imageSmoothingQuality: 'high'
    });

    // Guard against 0 width or 0 height canvas
    if (!croppedCanvas || croppedCanvas.width === 0 || croppedCanvas.height === 0) {
        return null;
    }

    return croppedCanvas
}
/**
 * Draws an image into a destination rectangle on canvas with 'object-fit: cover' behavior.
 * This prevents stretching when aspect ratios differ across package sizes.
 */
function drawImageCover(ctx, img, dx, dy, dw, dh) {
    // Safety check for empty dimensions or invalid elements
    if (!img || img.width === 0 || img.height === 0 || dw <= 0 || dh <= 0) {
        return;
    }

    const imgWidth = img.width;
    const imgHeight = img.height;
    const imgAspect = imgWidth / imgHeight;
    const boxAspect = dw / dh;

    let sx, sy, sw, sh;

    if (imgAspect > boxAspect) {
        // Image is wider than destination box -> crop left/right edges
        sh = imgHeight;
        sw = imgHeight * boxAspect;
        sx = (imgWidth - sw) / 2;
        sy = 0;
    } else {
        // Image is taller than destination box -> crop top/bottom edges
        sw = imgWidth;
        sh = imgWidth / boxAspect;
        sx = 0;
        sy = (imgHeight - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}
function draw() {
    const canvas = $('previewCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let [wi, hi] = papers[state.paper];
    if ($('landscape')?.checked) [wi, hi] = [hi, wi];
    canvas.width = wi * DPI;
    canvas.height = hi * DPI;

    // Background Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#d9d9d9';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    let margin = +($('margin')?.value || 0.25) * DPI;
    let spacing = +($('spacing')?.value || 0.1) * DPI;

    let pages = layoutPhotos(canvas.width, canvas.height, margin, spacing);

    // Keep active page within bounds
    if (state.currentPage >= pages.length) {
        state.currentPage = Math.max(0, pages.length - 1);
    }

    // Update Pagination Counters
    const pageCountEl = $('pageCount');
    const pageIndicatorEl = $('pageIndicator');
    const prevBtn = $('prevPage');
    const nextBtn = $('nextPage');
    const totalPhotosEl = $('totalPhotos');

    let total = state.sizes.reduce((a, s) => a + (s.qty || 1), 0);
    if (pageCountEl) pageCountEl.textContent = `${pages.length} page${pages.length > 1 ? 's' : ''}`;
    if (pageIndicatorEl) pageIndicatorEl.textContent = `Page ${state.currentPage + 1} of ${pages.length}`;
    if (totalPhotosEl) totalPhotosEl.textContent = `${total} photo${total !== 1 ? 's' : ''}`;
    if (prevBtn) prevBtn.disabled = state.currentPage === 0;
    if (nextBtn) nextBtn.disabled = state.currentPage >= pages.length - 1;

    const activePage = pages[state.currentPage] || [];
    let packageImg = getCroppedCanvas();

    // Helper to paint ID cards
    function paintIdCard(side, x, y, w, h, label) {
        let idImg = state.idCards ? state.idCards[side] : null;
        ctx.save();
        if (idImg) {
            ctx.drawImage(idImg, x, y, w, h);
        } else {
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'center';
            ctx.font = '36px Arial';
            ctx.fillText(`Upload ${side.toUpperCase()} ID`, x + w / 2, y + h / 2);
        }

        if ($('borders')?.checked) {
            ctx.strokeStyle = side === 'front' ? '#00e5ff' : '#9dff57';
            ctx.lineWidth = 8;
            ctx.strokeRect(x, y, w, h);
        }

        ctx.fillStyle = 'rgba(8,12,31,.75)';
        ctx.fillRect(x + 16, y + 16, 170, 42);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 28, y + 46);
        ctx.restore();
    }

    // Render Page Elements
    activePage.forEach(it => {
        ctx.save();

        // IF ITEM IS AN ID PAIR
        if (it.idPair) {
            if (it.output === 'sideBySide') {
                paintIdCard('front', it.x, it.y, it.cw, it.ch, 'ID FRONT');
                paintIdCard('back', it.x + it.cw + it.gap, it.y, it.cw, it.ch, 'ID BACK');
            } else {
                paintIdCard('front', it.x, it.y, it.cw, it.ch, 'ID FRONT');
                paintIdCard('back', it.x, it.y + it.ch + it.gap, it.cw, it.ch, 'ID BACK');
            }
        } 
        // IF ITEM IS SINGLE SIDE ID CARD
        else if (it.idSide) {
            paintIdCard(it.idSide, it.x, it.y, it.w, it.h, it.label);
        } 
        // IF ITEM IS STANDARD PACKAGE PHOTO
        else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(it.x, it.y, it.w, it.h);


            if (packageImg) {
                ctx.filter = `brightness(${$('brightness').value}%) contrast(${$('contrast').value}%)`;
                drawImageCover(ctx, packageImg, it.x, it.y, it.w, it.h);
                drawPhotoOverlays(ctx, it.x, it.y, it.w, it.h);
            } else {
                ctx.fillStyle = '#7d7a75';
                ctx.textAlign = 'center';
                ctx.font = '48px Arial';
                ctx.fillText('Upload photo', it.x + it.w / 2, it.y + it.h / 2);
            }

            if ($('guides')?.checked) {
                ctx.strokeStyle = 'rgba(255,43,214,.65)';
                ctx.setLineDash([18, 12]);
                ctx.strokeRect(it.x - 8, it.y - 8, it.w + 16, it.h + 16);
                ctx.setLineDash([]);
            }

            if ($('labels')?.checked) {
                ctx.fillStyle = 'rgba(124,60,255,.95)';
                ctx.font = 'bold 34px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(it.label, it.x + 18, it.y + 44);
            }

            if ($('borders')?.checked) {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 10;
                ctx.strokeRect(it.x, it.y, it.w, it.h);
            }
        }

        ctx.restore();
    });
}
async function downloadPNG() {
    let canvas = document.getElementById('previewCanvas');
    let margin = +(document.getElementById('margin')?.value || 0.25) * DPI;
    let spacing = +(document.getElementById('spacing')?.value || 0.1) * DPI;
    let pages = layoutPhotos(canvas.width, canvas.height, margin, spacing);

    let originalPage = state.currentPage;

    // Single page: Direct PNG download
    if (pages.length === 1) {
        state.currentPage = 0;
        draw();
        let a = document.createElement('a');
        a.download = 'photo-layout-page-1.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
        return;
    }

    // Multiple pages: Package into ZIP file
    const zip = new JSZip();
    const folder = zip.folder("png_pages");

    pages.forEach((_, idx) => {
        state.currentPage = idx;
        draw();

        // Convert base64 DataURL to pure base64 string
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");

        folder.file(`photo-layout-page-${idx + 1}.png`, base64Data, { base64: true });
    });

    // Restore active preview page state
    state.currentPage = originalPage;
    draw();

    // Generate zip archive and trigger download
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement('a');
    a.download = 'photo-layouts.zip';
    a.href = URL.createObjectURL(zipBlob);
    a.click();

    // Clean up memory URL object
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
function downloadPDF() {
    let [wi, hi] = papers[state.paper];
    if (document.getElementById('landscape')?.checked) [wi, hi] = [hi, wi];

    let orientation = wi > hi ? 'landscape' : 'portrait';
    let pdf = new jsPDF({
        orientation,
        unit: 'in',
        format: [wi, hi]
    });

    let canvas = document.getElementById('previewCanvas');
    let margin = +(document.getElementById('margin')?.value || 0.25) * DPI;
    let spacing = +(document.getElementById('spacing')?.value || 0.1) * DPI;
    let pages = layoutPhotos(canvas.width, canvas.height, margin, spacing);

    let originalPage = state.currentPage;

    pages.forEach((_, idx) => {
        state.currentPage = idx;
        draw(); // Render target page to canvas
        if (idx > 0) pdf.addPage([wi, hi], orientation);
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, wi, hi);
    });

    // Restore active preview page
    state.currentPage = originalPage;
    draw();

    pdf.save('photo-layout.pdf');
}
function printCanvas() {
    let [wi, hi] = papers[state.paper];
    if (document.getElementById('landscape')?.checked) [wi, hi] = [hi, wi];

    let canvas = document.getElementById('previewCanvas');
    let margin = +(document.getElementById('margin')?.value || 0.25) * DPI;
    let spacing = +(document.getElementById('spacing')?.value || 0.1) * DPI;
    let pages = layoutPhotos(canvas.width, canvas.height, margin, spacing);

    let originalPage = state.currentPage;
    let pageImages = [];

    // Render every page to data URLs
    pages.forEach((_, idx) => {
        state.currentPage = idx;
        draw();
        pageImages.push(canvas.toDataURL('image/png'));
    });

    // Restore user preview page
    state.currentPage = originalPage;
    draw();

    // Open print window with print CSS rules for all pages
    let w = open('', '_blank');
    w.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Layout</title>
            <style>
                @page {
                    size: ${wi}in ${hi}in;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 0;
                    background: #fff;
                }
                .print-page {
                    width: 100vw;
                    height: 100vh;
                    page-break-after: always;
                    break-after: page;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
            </style>
        </head>
        <body>
            ${pageImages.map(src => `<div class="print-page"><img src="${src}"></div>`).join('')}
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 250);
                };
            <\/script>
        </body>
        </html>
    `);
    w.document.close();
}
init();

function setupIdCardPrint() {
    const bind = (side) => {
        const input = $(side + 'Input'),
              drop = $(side + 'Drop');
        if (!input || !drop) return;

        input.onchange = e => openIdCrop(side, e.target.files[0]);

        ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => {
            e.preventDefault();
            drop.classList.add('drag');
        }));

        ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
            e.preventDefault();
            drop.classList.remove('drag');
        }));

        drop.addEventListener('drop', e => openIdCrop(side, e.dataTransfer.files[0]));
    };

    bind('front');
    bind('back');

    $('cancelIdCrop').onclick = () => closeIdCrop();
    $('saveIdCrop').onclick = saveIdCrop;
    $('addIdCards').onclick = addIdCardLayout;

    // Handle ID Card rotation
    const rotateIdBtn = $('rotateIdCrop');
    if (rotateIdBtn) {
        rotateIdBtn.onclick = () => {
            if (state.idCards.cropper) {
                state.idCards.rotation = (state.idCards.rotation + 90) % 360;
                state.idCards.cropper.rotate(90);
            }
        };
    }

    // Handle ID Preset selection change
    const presetSelect = $('idPresetSelect');
    if (presetSelect) {
        presetSelect.onchange = (e) => {
            const val = e.target.value;
            if (val === 'Custom') {
                // Allow free cropping for custom dimensions
                if (state.idCards.cropper) {
                    state.idCards.cropper.setAspectRatio(NaN);
                }
            } else if (idCardPresets[val]) {
                const [w, h] = idCardPresets[val];
                $('idCardWidth').value = w;
                $('idCardHeight').value = h;
                
                // If crop modal is active, update cropper aspect ratio dynamically
                if (state.idCards.cropper) {
                    state.idCards.cropper.setAspectRatio(w / h);
                }
            }
        };
    }

    // Helper to update state.sizes whenever ID Card controls change
    const updateIdCardStateAndDraw = () => {
        // Find the active ID card entry in state.sizes (or the target one)
        let idSize = state.sizes.find(s => s.idCard);

        if (idSize) {
            idSize.w = +$('idCardWidth').value;
            idSize.h = +$('idCardHeight').value;
            idSize.unit = 'in'; // or your active unit
            idSize.copies = +$('idCardCopies').value;
            idSize.mode = $('idCardMode').value;
            idSize.output = $('idCardOutput').value;
            idSize.moveX = +$('idMoveX').value;
            idSize.moveY = +$('idMoveY').value;
        }

        // Re-render canvas
        draw();
    };

    ['idCardWidth', 'idCardHeight', 'idCardCopies', 'idCardMode', 'idCardOutput', 'idMoveX', 'idMoveY'].forEach(id => {
        const el = $(id);
        if (el) {
            el.addEventListener('input', updateIdCardStateAndDraw);
        }
    });
}
function openIdCrop(side, file) {
    if (!file || !/image\/(jpeg|png)/.test(file.type))
        return alert('Please upload a JPG or PNG.');
    state.idCards.active = side;
    state.idCards.rotation = 0;
    $('idCropTitle').textContent = (side === 'front' ? 'Crop Front ID' : 'Crop Back ID');
    $('idCropImage').src = URL.createObjectURL(file);
    $('idCropModal').classList.add('open');
    $('idCropModal').removeAttribute('inert');
    setTimeout( () => {
        $('cancelIdCrop').focus();
        if (state.idCards.cropper)
            state.idCards.cropper.destroy();

        const selectedPreset = $('idPresetSelect')?.value;
        let aspectRatio;

        // If Custom is selected, use NaN for free cropping
        if (selectedPreset === 'Custom') {
            aspectRatio = NaN;
        } else {
            const w = +$('idCardWidth').value || 3.37;
            const h = +$('idCardHeight').value || 2.13;
            aspectRatio = w / h;
        }

        state.idCards.cropper = new Cropper($('idCropImage'),{
            aspectRatio: aspectRatio,
            viewMode: 0,
            autoCropArea: 1,
            background: false,
            responsive: true,
            cropBoxMovable: true,
            cropBoxResizable: true
        });
    }
    , 60);
}
function closeIdCrop() {
    if (state.idCards.cropper) {
        state.idCards.cropper.destroy();
        state.idCards.cropper = null
    }
    $('idCropModal').classList.remove('open')
    $('idCropModal').setAttribute('inert', '')
    const dropTarget = $('frontDrop') || $('backDrop');
    if (dropTarget) dropTarget.focus();
}
function saveIdCrop() {
    if (!state.idCards.cropper)
        return;
    const side = state.idCards.active;

    const w = +$('idCardWidth').value || 3.37;
    const h = +$('idCardHeight').value || 2.13;

    const c = state.idCards.cropper.getCroppedCanvas({
        width: Math.round(w * DPI),
        height: Math.round(h * DPI),
        imageSmoothingQuality: 'high'
    });
    state.idCards[side] = c;
    $(side + 'Thumb').src = c.toDataURL('image/png');
    $(side + 'Thumb').hidden = false;
    $(side + 'Text').hidden = true;
    closeIdCrop();
    draw();
}
function addIdCardLayout() {
    const w = +$('idCardWidth').value
      , h = +$('idCardHeight').value
      , copies = +$('idCardCopies').value
      , mode = $('idCardMode').value;
    let qty = mode === 'pair' ? copies * 2 : copies;
    state.sizes.push({
        w,
        h,
        unit: 'inch',
        qty,
        label: mode === 'pair' ? 'ID Front/Back' : 'ID Card',
        idCard: true,
        mode,
        copies,
        output: $('idCardOutput').value,
        moveX: +$('idMoveX').value,
        moveY: +$('idMoveY').value
    });
    renderSizeList();
    draw();
}

function getCurrentAspectRatio() {
    let w = +$('photoWidth').value || 1;
    let h = +$('photoHeight').value || 1;
    return w / h;
}

function selectPackage(pkgKey) {
    let items = packages[pkgKey];
    if (!items) return;

    const existingIdCards = state.sizes.filter(s => s.idCard);

    // Combine new package items with preserved ID cards
    state.sizes = [
        ...items.map(item => ({ ...item })),
        ...existingIdCards
    ];

    // Set cropper aspect ratio based on the first item in the package
    if (state.cropper && state.sizes.length > 0) {
        let first = state.sizes[0];
        let targetW = toIn(first.w, first.unit);
        let targetH = toIn(first.h, first.unit);
        state.cropper.setAspectRatio(targetW / targetH);
    }

    renderSizeList();
    renderPackageButtons(pkgKey);
    // De-highlight standard preset buttons (since a package is selected)
    [...$('presetGrid').children].forEach(b => b.classList.remove('active'));
    draw();
}

function renderPackageButtons(activeKey) {
    const pkgGrid = $('packageGrid');
    if (!pkgGrid) return;
    [...pkgGrid.children].forEach(b => {
        b.classList.toggle('active', b.dataset.packageKey === activeKey);
    });
}
function initSignaturePad() {
    sigCanvas = $('sigCanvas');
    if (!sigCanvas) return;
    
    // Set explicit internal resolution for high DPI drawing
    sigCanvas.width = sigCanvas.offsetWidth || 280;
    sigCanvas.height = sigCanvas.offsetHeight || 100;
    
    sigCtx = sigCanvas.getContext('2d');
    sigCtx.lineWidth = 3;
    sigCtx.lineCap = 'round';
    sigCtx.strokeStyle = '#000000';

    const getPos = (e) => {
        const rect = sigCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (sigCanvas.width / rect.width),
            y: (clientY - rect.top) * (sigCanvas.height / rect.height)
        };
    };

    const startDrawing = (e) => {
        isSigning = true;
        const pos = getPos(e);
        sigCtx.beginPath();
        sigCtx.moveTo(pos.x, pos.y);
    };

    const drawLine = (e) => {
        if (!isSigning) return;
        e.preventDefault();
        const pos = getPos(e);
        sigCtx.lineTo(pos.x, pos.y);
        sigCtx.stroke();
    };

    const stopDrawing = () => {
        if (isSigning) {
            isSigning = false;
            draw();
        }
    };

    sigCanvas.addEventListener('mousedown', startDrawing);
    sigCanvas.addEventListener('mousemove', drawLine);
    sigCanvas.addEventListener('mouseup', stopDrawing);

    sigCanvas.addEventListener('touchstart', startDrawing);
    sigCanvas.addEventListener('touchmove', drawLine);
    sigCanvas.addEventListener('touchend', stopDrawing);

    $('clearSigBtn').onclick = () => {
        sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
        draw();
    };

    $('labelName').oninput = draw;
    $('showNameOverlay').onchange = draw;
    $('showSigOverlay').onchange = draw;
}

function drawPhotoOverlays(ctx, photoX, photoY, photoWidth, photoHeight) {
    const nameText = $('labelName')?.value.trim();
    const showName = $('showNameOverlay')?.checked;
    const showSig = $('showSigOverlay')?.checked;

        // 1. Name Banner Overlay
        if (showName && nameText) {
            const bannerHeight = photoHeight * 0.13;
            const bannerY = photoY + photoHeight - bannerHeight;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
            ctx.fillRect(photoX, bannerY, photoWidth, bannerHeight);

            ctx.fillStyle = '#000000';
            ctx.font = `bold ${Math.max(12, Math.floor(bannerHeight * 0.5))}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillText(
                nameText.toUpperCase(),
                photoX + photoWidth / 2,
                bannerY + bannerHeight / 2
            );
        }
        // 2. Signature Overlay
        if (showSig && sigCanvas) {
            const sigWidth = photoWidth * 0.75;
            const sigHeight = photoHeight * 0.20;
            const sigX = photoX + (photoWidth - sigWidth) / 2;
            const sigY = photoY + photoHeight - sigHeight - 4;

            ctx.drawImage(sigCanvas, sigX, sigY, sigWidth, sigHeight);
        }
}