import { removeBackground } from '@imgly/background-removal';
import 'cropperjs/dist/cropper.css';
import  Cropper from 'cropperjs';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

/**
 * Removes the background from an image using the Imgly Background Removal API.
 * @param {string} imageSource - The source URL of the image to process.
 * @returns {Promise<string|null>} - A promise that resolves to a blob URL of the processed image or null if an error occurs.
 */
async function removePhotoBackground(imageSource) {
  try {
    const blob = await removeBackground(imageSource, {
      publicPath: `${window.location.origin}/dist/`, 
      model: 'isnet',
      debug: false
    });

    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Background removal failed:', error);
    return null;
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
const papers = {
    "3R (3.5 x 5)": [3.5, 5],
    "4R (4 x 6)": [4, 6],
    "5R (5 x 7)": [5, 7],
    "A4 (8.27 x 11.69)": [8.27, 11.69],
    "Letter (8.5 x 11)": [8.5, 11],
    "Folio (8.5 x 14)": [8.5, 13],
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
    stageZoom: 100 // Stage preview zoom scale percentage
};
const $ = id => document.getElementById(id);
function toIn(v, u) {
    v = +v || 0;
    return u === 'mm' ? v / 25.4 : u === 'cm' ? v / 2.54 : v
}

// Add Zoom Handler Function
function updateStageZoom(newZoom) {
    // Clamp zoom level between 30% and 300%
    state.stageZoom = Math.min(Math.max(newZoom, 30), 300);
    
    const canvas = $('previewCanvas');
    const label = $('stageZoomLabel');
    
    if (canvas) {
        // Apply CSS scale transform to the preview canvas
        canvas.style.transform = `scale(${state.stageZoom / 100})`;
    }
    if (label) {
        label.textContent = `${Math.round(state.stageZoom)}%`;
    }
}

// Bind controls inside init() function
function setupStageZoom() {
    const btnIn = $('stageZoomIn');
    const btnOut = $('stageZoomOut');
    const btnReset = $('stageZoomReset');

    if (btnIn) btnIn.onclick = () => updateStageZoom(state.stageZoom + 15);
    if (btnOut) btnOut.onclick = () => updateStageZoom(state.stageZoom - 15);
    if (btnReset) btnReset.onclick = () => updateStageZoom(100);

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
    const bgBtn = $('removeBgBtn');

    function updateNetworkStatus(e) {
        const isOnline = navigator.onLine;

        // 1. Enable/Disable the Remove Background button
        if (bgBtn) {
            bgBtn.disabled = !isOnline;
            bgBtn.title = isOnline ? '' : 'Internet connection required for background removal';
        }

        // 2. Trigger status modal only on active connection changes or when offline
        if (!isOnline) {
            modal.className = 'network-modal offline';
            icon.textContent = '📡';
            msg.textContent = 'You lost internet connection. Background removal requires an active network connection.';
        } else if (e && e.type === 'online') {
            modal.className = 'network-modal online';
            icon.textContent = '⚡';
            msg.textContent = 'You are back online!';

            // Auto-hide the "Back Online" message after 3.5 seconds
            setTimeout(() => {
                modal.classList.add('hidden');
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
        b.innerHTML = `<b>${k}</b><br><small>${desc}</small>`;
        b.onclick = () => selectPackage(k);
        
        $('packageGrid').appendChild(b);
    });
    Object.keys(presets).forEach(k => {
        let b = document.createElement('button');
        b.textContent = k;
        b.onclick = () => selectPreset(k);
        $('presetGrid').appendChild(b)
    }
    );
    Object.keys(papers).forEach(k => {
        let b = document.createElement('button');
        b.textContent = k;
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
    ['margin', 'spacing', 'brightness', 'contrast', 'zoom', 'landscape', 'guides', 'labels', 'borders', 'customPaperWidth', 'customPaperHeight'].forEach(id => $(id).addEventListener('input', draw));
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
    state.sizes = [{
        w: p[0],
        h: p[1],
        unit: p[2],
        qty: p[3],
        label: k
    }];

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
        d.innerHTML = `<div><b>${s.label}</b><br><small>${s.w} × ${s.h} ${s.unit} · ${s.qty} copies</small></div><button class="remove">×</button>`;
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
    // Check if offline
    if (!navigator.onLine) {
        return alert('You are currently offline. Please reconnect to the internet to use AI background removal.');
    }
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
        const processedUrl = await removePhotoBackground(currentSrc);

        if (processedUrl) {
            updateImageSource(processedUrl);
        } else {
            alert('Could not remove background. Please try another image.');
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
            viewMode: 1,
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
            aspectRatio: getCurrentAspectRatio(),
            viewMode: 1,
            autoCropArea: 1,
            background: true,
            moveable: true,
            crosshairs: true,
            responsive: true,
            zoomOnWheel: true, // or set to false if you ONLY want slider control
            crop: () => draw(),
            ready: () => draw()
        });
        state.image = originalUrl;
        draw()
    }
}
function layoutPhotos(pw, ph, margin, spacing) {
    let items = [];
    state.sizes.forEach(s => {
        if (s.idCard) {
            const cw = toIn(s.w, s.unit) * DPI;
            const ch = toIn(s.h, s.unit) * DPI;
            const output = s.output || document.getElementById('idCardOutput')?.value || 'topBottom';
            const moveX = (s.moveX || 0) * DPI;
            const moveY = (s.moveY || 0) * DPI;

            for (let i = 0; i < (s.copies || 1); i++) {
                if (s.mode === 'frontOnly' || s.mode === 'backOnly') {
                    const side = s.mode === 'frontOnly' ? 'front' : 'back';
                    items.push({
                        w: cw,
                        h: ch,
                        label: side === 'front' ? 'ID FRONT' : 'ID BACK',
                        idSide: side,
                        moveX, moveY
                    });
                } else {
                    const gap = spacing;
                    const gw = output === 'sideBySide' ? (cw * 2 + gap) : cw;
                    const gh = output === 'sideBySide' ? ch : (ch * 2 + gap);
                    items.push({
                        w: gw,
                        h: gh,
                        label: 'ID PAIR',
                        idPair: true,
                        output, cw, ch, gap,
                        moveX, moveY
                    });
                }
            }
        } else {
            for (let i = 0; i < s.qty; i++) {
                items.push({
                    w: toIn(s.w, s.unit) * DPI,
                    h: toIn(s.h, s.unit) * DPI,
                    label: s.label
                });
            }
        }
    });
    let pages = []
      , page = [];
    let y = margin
      , x = margin
      , rowH = 0
      , row = [];
    function flushRow() {
        if (!row.length)
            return;
        let rowW = row.reduce( (a, it) => a + it.w, 0) + spacing * (row.length - 1);
        let offset = (pw - rowW) / 2;
        row.forEach( (it, idx) => {
            it.x = offset + row.slice(0, idx).reduce( (a, r) => a + r.w + spacing, 0);
            it.y = y;
            page.push(it)
        }
        );
        y += rowH + spacing;
        x = margin;
        rowH = 0;
        row = []
    }
    items.forEach(it => {
        if (x + it.w > pw - margin && row.length) {
            flushRow()
        }
        if (y + it.h > ph - margin && page.length) {
            flushRow();
            pages.push(page);
            page = [];
            y = margin
        }
        row.push(it);
        x += it.w + spacing;
        rowH = Math.max(rowH, it.h)
    }
    );
    flushRow();
    if (page.length) pages.push(page);
    return pages.length ? pages : [[]]
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
    const canvas = document.getElementById('previewCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let [wi, hi] = papers[state.paper];
    if (document.getElementById('landscape')?.checked) [wi, hi] = [hi, wi];
    canvas.width = wi * DPI;
    canvas.height = hi * DPI;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let margin = +(document.getElementById('margin')?.value || 0.25) * DPI;
    let spacing = +(document.getElementById('spacing')?.value || 0.1) * DPI;
    
    let pages = layoutPhotos(canvas.width, canvas.height, margin, spacing);

    if (state.currentPage >= pages.length) {
        state.currentPage = Math.max(0, pages.length - 1);
    }

    // Update Pagination UI Elements
    const pageCountEl = document.getElementById('pageCount');
    const pageIndicatorEl = document.getElementById('pageIndicator');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (pageCountEl) pageCountEl.textContent = `${pages.length} page${pages.length > 1 ? 's' : ''}`;
    if (pageIndicatorEl) pageIndicatorEl.textContent = `Page ${state.currentPage + 1} of ${pages.length}`;
    if (prevBtn) prevBtn.disabled = state.currentPage === 0;
    if (nextBtn) nextBtn.disabled = state.currentPage >= pages.length - 1;

    // Extract active page elements
    const activePage = pages[state.currentPage] || [];

    // Draw standard photos / ID cards on active page
    function paintId(side, x, y, w, h, label) {
        let img = state.idCards ? state.idCards[side] : null;
        ctx.save();
        if (img) ctx.drawImage(img, x, y, w, h);
        
        if (document.getElementById('borders')?.checked) {
            ctx.strokeStyle = side === 'front' ? '#00e5ff' : '#9dff57';
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, w, h);
        }

        ctx.fillStyle = 'rgba(8,12,31,.75)';
        ctx.fillRect(x + 10, y + 10, 140, 32);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(label, x + 18, y + 32);
        ctx.restore();
    }

    let total = state.sizes.reduce( (a, s) => a + s.qty, 0);
    $('pageCount').textContent = pages.length + ' page' + (pages.length > 1 ? 's' : '');
    $('totalPhotos').textContent = total + ' photo' + (total !== 1 ? 's' : '');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#d9d9d9';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    let img = getCroppedCanvas();
    activePage.forEach(it => {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(it.x, it.y, it.w, it.h);
        if ($('borders').checked) {
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 10;
            ctx.shadowColor = 'rgba(0,229,255,.45)';
            ctx.shadowBlur = 16;
            ctx.strokeRect(it.x, it.y, it.w, it.h);
            ctx.shadowBlur = 0;
        }
        if (img) {
            ctx.filter = `brightness(${$('brightness').value}%) contrast(${$('contrast').value}%)`;
            drawImageCover(ctx, img, it.x, it.y, it.w, it.h);

           // Draw ID card overlays if applicable
            if (!it.idCard && !it.idSide && !it.idPair) {
                drawPhotoOverlays(ctx, it.x, it.y, it.w, it.h);
            }
        } else {
            ctx.fillStyle = '#7d7a75';
            ctx.textAlign = 'center';
            ctx.font = '48px Arial';
            ctx.fillText('Upload photo', it.x + it.w / 2, it.y + it.h / 2)
        }
        if ($('guides').checked) {
            ctx.strokeStyle = 'rgba(255,43,214,.65)';
            ctx.setLineDash([18, 12]);
            ctx.strokeRect(it.x - 8, it.y - 8, it.w + 16, it.h + 16);
            ctx.setLineDash([])
        }
        if ($('labels').checked) {
            ctx.fillStyle = 'rgba(124,60,255,.95)';
            ctx.font = 'bold 34px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(it.label, it.x + 18, it.y + 44)
        }
        ctx.restore()
    }
    )
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

// PAPAJEK PRINT: ID card front/back uploader with independent crop support
state.idCards = {
    front: null,
    back: null,
    cropper: null,
    active: null
};
function setupIdCardPrint() {
    const bind = (side) => {
        const input = $(side + 'Input')
          , drop = $(side + 'Drop');
        if (!input || !drop)
            return;
        input.onchange = e => openIdCrop(side, e.target.files[0]);
        ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => {
            e.preventDefault();
            drop.classList.add('drag')
        }
        ));
        ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
            e.preventDefault();
            drop.classList.remove('drag')
        }
        ));
        drop.addEventListener('drop', e => openIdCrop(side, e.dataTransfer.files[0]));
    }
    ;
    bind('front');
    bind('back');
    $('cancelIdCrop').onclick = () => closeIdCrop();
    $('saveIdCrop').onclick = saveIdCrop;
    $('addIdCards').onclick = addIdCardLayout;
    ['idCardWidth', 'idCardHeight', 'idCardCopies', 'idCardMode', 'idCardOutput', 'idMoveX', 'idMoveY'].forEach(id => $(id).addEventListener('input', draw));
}
function openIdCrop(side, file) {
    if (!file || !/image\/(jpeg|png)/.test(file.type))
        return alert('Please upload a JPG or PNG.');
    state.idCards.active = side;
    $('idCropTitle').textContent = (side === 'front' ? 'Crop Front ID' : 'Crop Back ID');
    $('idCropImage').src = URL.createObjectURL(file);
    $('idCropModal').classList.add('open');
    setTimeout( () => {
        if (state.idCards.cropper)
            state.idCards.cropper.destroy();
        state.idCards.cropper = new Cropper($('idCropImage'),{
            aspectRatio: +$('idCardWidth').value / +$('idCardHeight').value,
            viewMode: 1,
            autoCropArea: 1,
            background: false
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
}
function saveIdCrop() {
    if (!state.idCards.cropper)
        return;
    const side = state.idCards.active;
    const c = state.idCards.cropper.getCroppedCanvas({
        width: 1011,
        height: 639,
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
const oldLayoutPhotos = layoutPhotos;
layoutPhotos = function(pw, ph, margin, spacing) {
    let normalItems = []
      , idGroups = [];
    state.sizes.forEach(s => {
        if (s.idCard) {
            idGroups.push(s);
        } else {
            for (let i = 0; i < s.qty; i++)
                normalItems.push({
                    w: toIn(s.w, s.unit) * DPI,
                    h: toIn(s.h, s.unit) * DPI,
                    label: s.label
                })
        }
    }
    );
    let items = [...normalItems];
    idGroups.forEach(s => {
        const cw = toIn(s.w, s.unit) * DPI
          , ch = toIn(s.h, s.unit) * DPI;
        const output = s.output || $('idCardOutput')?.value || 'topBottom';
        const currentMoveX = $('idMoveX') ? +$('idMoveX').value : 0;
        const currentMoveY = $('idMoveY') ? +$('idMoveY').value : 0;
        const moveX = ((s.moveX ?? currentMoveX) || 0) * DPI
          , moveY = ((s.moveY ?? currentMoveY) || 0) * DPI;
        for (let i = 0; i < s.copies; i++) {
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
    }
    );
    let pages = []
      , page = [];
    let y = margin
      , x = margin
      , rowH = 0
      , row = [];
    function pushCentered(it) {
        if (page.length || row.length) {
            flushRow();
            if (page.length) {
                pages.push(page);
                page = [];
                y = margin
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
    function flushRow() {
        if (!row.length)
            return;
        let rowW = row.reduce( (a, it) => a + it.w, 0) + spacing * (row.length - 1);
        let offset = (pw - rowW) / 2;
        row.forEach( (it, idx) => {
            it.x = offset + row.slice(0, idx).reduce( (a, r) => a + r.w + spacing, 0);
            it.y = y;
            page.push(it)
        }
        );
        y += rowH + spacing;
        x = margin;
        rowH = 0;
        row = []
    }
    items.forEach(it => {
        if (it.idPair || it.forceCenter) {
            pushCentered(it);
            return
        }
        if (x + it.w > pw - margin && row.length)
            flushRow();
        if (y + it.h > ph - margin && page.length) {
            flushRow();
            pages.push(page);
            page = [];
            y = margin
        }
        row.push(it);
        x += it.w + spacing;
        rowH = Math.max(rowH, it.h)
    }
    );
    flushRow();
    if (page.length)
        pages.push(page);
    return pages.length ? pages : [[]]
}
;
const oldGetCroppedCanvas = getCroppedCanvas;
getCroppedCanvas = function() {
    return oldGetCroppedCanvas()
}
;
const oldDraw = draw;
draw = function() {
    
    oldDraw();
    // repaint ID card images over any ID placeholders on first page
    const canvas = $('previewCanvas')
      , ctx = canvas.getContext('2d');
    let[wi,hi] = papers[state.paper];
    if ($('landscape').checked)
        [wi,hi] = [hi, wi];
    let margin = +$('margin').value * DPI
      , spacing = +$('spacing').value * DPI;
    let pages = layoutPhotos(canvas.width, canvas.height, margin, spacing);
    const activePage = pages[state.currentPage] || [];
    
    function paintId(side, x, y, w, h, label) {
        let img = state.idCards[side];
        ctx.save();
        if (img)
            ctx.drawImage(img, x, y, w, h);
        if ($('borders').checked) {
            ctx.strokeStyle = side === 'front' ? '#00e5ff' : '#9dff57';
            ctx.lineWidth = 8;
            ctx.strokeRect(x, y, w, h);
        }
        ctx.fillStyle = 'rgba(8,12,31,.75)';
        ctx.fillRect(x + 16, y + 16, 170, 42);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 26px Arial';
        ctx.fillText(label, x + 28, y + 46);
        ctx.restore();
    }
    activePage.filter(it => it.idSide || it.idPair).forEach(it => {
        if (it.idPair) {
            if (it.output === 'sideBySide') {
                paintId('front', it.x, it.y, it.cw, it.ch, 'ID FRONT');
                paintId('back', it.x + it.cw + it.gap, it.y, it.cw, it.ch, 'ID BACK')
            } else {
                paintId('front', it.x, it.y, it.cw, it.ch, 'ID FRONT');
                paintId('back', it.x, it.y + it.ch + it.gap, it.cw, it.ch, 'ID BACK')
            }
        } else {
            paintId(it.idSide, it.x, it.y, it.w, it.h, it.label)
        }
    }
    )
};

function getCurrentAspectRatio() {
    let w = +$('photoWidth').value || 1;
    let h = +$('photoHeight').value || 1;
    return w / h;
}

function selectPackage(pkgKey) {
    let items = packages[pkgKey];
    if (!items) return;

    // Deep clone items into state.sizes
    state.sizes = items.map(item => ({ ...item }));

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

        // 2. Signature Overlay
        if (showSig && sigCanvas) {
            const sigWidth = photoWidth * 0.75;
            const sigHeight = photoHeight * 0.20;
            const sigX = photoX + (photoWidth - sigWidth) / 2;
            const sigY = photoY + photoHeight - sigHeight - 4;

            ctx.drawImage(sigCanvas, sigX, sigY, sigWidth, sigHeight);
        }
    }
}
const networkModal = document.getElementById('network-modal');
const networkMessage = document.getElementById('network-message');
const networkIcon = document.getElementById('network-icon');
const networkCloseBtn = document.getElementById('network-close');
const removeBgBtn = document.getElementById('removeBgBtn');

function updateOnlineStatus() {
  if (navigator.onLine) {
    // Show back online state
    networkModal.className = 'network-modal online';
    networkIcon.textContent = '⚡';
    networkMessage.textContent = 'You are back online!';
    
    // Auto-hide the "Back Online" banner after 3 seconds
    setTimeout(() => {
      networkModal.classList.add('hidden');
    }, 3000);
  } else {
    // Show offline state
    removeBgBtn.disabled = true; // Disable the remove background button when offline
    networkModal.className = 'network-modal offline';
    networkIcon.textContent = '📡';
    networkMessage.textContent = 'You lost internet connection. Some Features may not work.';
  }
}

// Listen for network change events
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Check initial status on load (only show if already offline)
if (!navigator.onLine) {
  updateOnlineStatus();
}
