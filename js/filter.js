/**
 * KromaForge - Filters & Adjustments Tool Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('editor-canvas');
    const compareBtn = document.getElementById('compare-btn');
    const presetsGrid = document.getElementById('presets-grid');
    const downloadBtn = document.getElementById('download-btn');
    const revertBtn = document.getElementById('revert-btn');
    const applyBtn = document.getElementById('apply-btn');
    const applyNextBtn = document.getElementById('apply-next-btn');

    // Adjustment sliders
    const sliders = {
        brightness: { el: document.getElementById('brightness'), val: document.getElementById('val-brightness'), suffix: '%' },
        contrast: { el: document.getElementById('contrast'), val: document.getElementById('val-contrast'), suffix: '%' },
        saturation: { el: document.getElementById('saturation'), val: document.getElementById('val-saturation'), suffix: '%' },
        hue: { el: document.getElementById('hue'), val: document.getElementById('val-hue'), suffix: '°' },
        blur: { el: document.getElementById('blur'), val: document.getElementById('val-blur'), suffix: 'px' },
        sepia: { el: document.getElementById('sepia'), val: document.getElementById('val-sepia'), suffix: '%' }
    };

    let loadedImg = null;
    let filterString = '';
    let originalFilename = 'image.png';

    // Load active image
    window.KromaUI.loadImageToCanvas(canvas, (img) => {
        loadedImg = img;
        
        window.KromaDB.getFilename().then(name => {
            originalFilename = name;
        });
        
        updateFilter();
    });

    // Update labels and compute CSS filter string
    function updateFilter() {
        const b = sliders.brightness.el.value;
        const c = sliders.contrast.el.value;
        const s = sliders.saturation.el.value;
        const h = sliders.hue.el.value;
        const bl = sliders.blur.el.value;
        const sep = sliders.sepia.el.value;

        // Update labels
        sliders.brightness.val.innerText = `${b}%`;
        sliders.contrast.val.innerText = `${c}%`;
        sliders.saturation.val.innerText = `${s}%`;
        sliders.hue.val.innerText = `${h}°`;
        sliders.blur.val.innerText = `${bl}px`;
        sliders.sepia.val.innerText = `${sep}%`;

        // Build string
        filterString = `brightness(${b}%) contrast(${c}%) saturate(${s}%) hue-rotate(${h}deg) blur(${bl}px) sepia(${sep}%)`;
        
        // Apply to CSS visual element for instant GPU-accelerated feedback
        canvas.style.filter = filterString;
    }

    // Attach listeners to sliders
    Object.keys(sliders).forEach(key => {
        sliders[key].el.addEventListener('input', () => {
            updateFilter();
            // Deselect preset if sliders are edited manually
            presetsGrid.querySelectorAll('.preset-card').forEach(p => p.classList.remove('active'));
        });
    });

    // Preset configurations
    const PRESETS = {
        normal: { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sepia: 0 },
        vintage: { brightness: 95, contrast: 105, saturation: 80, hue: 10, blur: 0, sepia: 40 },
        noir: { brightness: 100, contrast: 135, saturation: 0, hue: 0, blur: 0, sepia: 0 },
        vibrant: { brightness: 100, contrast: 105, saturation: 145, hue: 0, blur: 0, sepia: 0 },
        cool: { brightness: 100, contrast: 95, saturation: 90, hue: 190, blur: 0, sepia: 5 },
        warm: { brightness: 105, contrast: 100, saturation: 115, hue: 15, blur: 0, sepia: 15 }
    };

    presetsGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.preset-card');
        if (!card) return;

        presetsGrid.querySelectorAll('.preset-card').forEach(p => p.classList.remove('active'));
        card.classList.add('active');

        const presetKey = card.getAttribute('data-preset');
        const vals = PRESETS[presetKey];
        if (vals) {
            // Apply preset values to inputs
            Object.keys(vals).forEach(key => {
                sliders[key].el.value = vals[key];
            });
            updateFilter();
        }
    });

    // Press and Hold to Compare logic
    compareBtn.addEventListener('mousedown', () => {
        canvas.style.filter = 'none';
    });
    compareBtn.addEventListener('mouseup', () => {
        canvas.style.filter = filterString;
    });
    compareBtn.addEventListener('mouseleave', () => {
        canvas.style.filter = filterString;
    });

    // Touch support for comparison button
    compareBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        canvas.style.filter = 'none';
    });
    compareBtn.addEventListener('touchend', () => {
        canvas.style.filter = filterString;
    });

    // Perform filter draw on full resolution canvas
    function performFilterApply(nextUrl = null) {
        if (!loadedImg) return;

        const w = loadedImg.naturalWidth;
        const h = loadedImg.naturalHeight;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');

        // Apply same filter string to canvas rendering context
        tempCtx.filter = filterString;
        tempCtx.drawImage(loadedImg, 0, 0, w, h);

        window.KromaUI.saveCanvasToDB(tempCanvas, 'Filters applied successfully!', nextUrl);
    }

    // Download the filtered image
    downloadBtn.addEventListener('click', () => {
        if (!loadedImg) return;

        const w = loadedImg.naturalWidth;
        const h = loadedImg.naturalHeight;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.filter = filterString;
        tempCtx.drawImage(loadedImg, 0, 0, w, h);

        tempCanvas.toBlob((blob) => {
            if (!blob) return;

            let baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
            if (baseName.includes('/')) {
                baseName = baseName.split('/').pop();
            }
            const outName = `${baseName}_filtered.png`;

            const link = document.createElement('a');
            link.download = outName;
            link.href = URL.createObjectURL(blob);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.KromaUI.showToast(`Downloaded ${outName} successfully!`);
        }, 'image/png');
    });

    applyBtn.addEventListener('click', () => performFilterApply());
    applyNextBtn.addEventListener('click', () => performFilterApply('rotate.html'));

    // Revert/Reset Button logic
    revertBtn.addEventListener('click', () => {
        window.KromaDB.getOriginalImage().then((originalBlob) => {
            if (originalBlob) {
                window.KromaDB.setActiveImage(originalBlob).then(() => {
                    window.KromaUI.showToast('Reverted to original image.', 'info');
                    window.location.reload();
                });
            } else {
                window.KromaUI.showToast('No original image session found.', 'warning');
            }
        });
    });
});
