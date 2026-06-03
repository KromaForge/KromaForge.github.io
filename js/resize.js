/**
 * KromaForge - Resize Tool Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('editor-canvas');
    const widthInput = document.getElementById('resize-width');
    const heightInput = document.getElementById('resize-height');
    const lockRatioCheckbox = document.getElementById('lock-ratio');
    const percentSelector = document.getElementById('percent-selector');
    const smoothScalingCheckbox = document.getElementById('smooth-scaling');
    const originalResLabel = document.getElementById('original-resolution');
    const downloadBtn = document.getElementById('download-btn');
    const revertBtn = document.getElementById('revert-btn');

    let loadedImage = null;
    let origW = 0;
    let origH = 0;
    let originalFilename = 'image.png';

    // Load image from database
    window.KromaUI.loadImageToCanvas(canvas, (img) => {
        loadedImage = img;
        origW = img.naturalWidth;
        origH = img.naturalHeight;

        window.KromaDB.getFilename().then(name => {
            originalFilename = name;
        });

        originalResLabel.innerText = `${origW} x ${origH} px`;
        
        // Initial input values
        widthInput.value = origW;
        heightInput.value = origH;
    });

    // Handle Width input changes
    widthInput.addEventListener('input', () => {
        const w = parseInt(widthInput.value) || 0;
        if (w <= 0) return;

        if (lockRatioCheckbox.checked && origW > 0) {
            const h = Math.round(w * (origH / origW));
            heightInput.value = h;
        }
        clearPercentHighlight();
    });

    // Handle Height input changes
    heightInput.addEventListener('input', () => {
        const h = parseInt(heightInput.value) || 0;
        if (h <= 0) return;

        if (lockRatioCheckbox.checked && origH > 0) {
            const w = Math.round(h * (origW / origH));
            widthInput.value = w;
        }
        clearPercentHighlight();
    });

    // Handle Percentage button clicks
    percentSelector.addEventListener('click', (e) => {
        const btn = e.target.closest('.grid-select-btn');
        if (!btn) return;

        percentSelector.querySelectorAll('.grid-select-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const pct = parseInt(btn.getAttribute('data-percent'));
        if (pct && origW > 0) {
            const targetW = Math.round(origW * (pct / 100));
            const targetH = Math.round(origH * (pct / 100));
            
            widthInput.value = targetW;
            heightInput.value = targetH;
        }
    });

    function clearPercentHighlight() {
        percentSelector.querySelectorAll('.grid-select-btn').forEach(b => b.classList.remove('active'));
    }

    // Perform resizing operation
    function performResize(nextUrl = null) {
        if (!loadedImage) return;

        const w = parseInt(widthInput.value) || 0;
        const h = parseInt(heightInput.value) || 0;

        if (w <= 0 || h <= 0) {
            window.KromaUI.showToast('Please enter valid dimensions.', 'danger');
            return;
        }

        // Draw resized image on temp canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');

        // Configure smoothing
        const smooth = smoothScalingCheckbox.checked;
        tempCtx.imageSmoothingEnabled = smooth;
        tempCtx.imageSmoothingQuality = 'high';

        tempCtx.drawImage(loadedImage, 0, 0, w, h);

        window.KromaUI.saveCanvasToDB(tempCanvas, `Image resized to ${w}x${h} successfully!`, nextUrl);
    }

    // Download the resized image
    downloadBtn.addEventListener('click', () => {
        if (!loadedImage) return;

        const w = parseInt(widthInput.value) || 0;
        const h = parseInt(heightInput.value) || 0;

        if (w <= 0 || h <= 0) {
            window.KromaUI.showToast('Please enter valid dimensions.', 'danger');
            return;
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');

        const smooth = smoothScalingCheckbox.checked;
        tempCtx.imageSmoothingEnabled = smooth;
        tempCtx.imageSmoothingQuality = 'high';

        tempCtx.drawImage(loadedImage, 0, 0, w, h);

        tempCanvas.toBlob((blob) => {
            if (!blob) return;

            let baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
            if (baseName.includes('/')) {
                baseName = baseName.split('/').pop();
            }
            const outName = `${baseName}_resized.png`;

            const link = document.createElement('a');
            link.download = outName;
            link.href = URL.createObjectURL(blob);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.KromaUI.showToast(`Downloaded ${outName} successfully!`);
        }, 'image/png');
    });

    // Reset button
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
