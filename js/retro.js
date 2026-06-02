/**
 * KromaForge - Retro & Pixel Art Tool Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('editor-canvas');
    const pixelSlider = document.getElementById('pixel-slider');
    const pixelValueLabel = document.getElementById('pixel-val');
    const posterSlider = document.getElementById('poster-slider');
    const posterValueLabel = document.getElementById('poster-val');
    const scanlinesCheckbox = document.getElementById('scanlines-chk');

    const downloadBtn = document.getElementById('download-btn');
    const revertBtn = document.getElementById('revert-btn');
    const applyBtn = document.getElementById('apply-btn');
    const applyNextBtn = document.getElementById('apply-next-btn');

    let loadedImg = null;
    let originalFilename = 'image.png';
    let debounceTimeout = null;

    // Load active image
    window.KromaUI.loadImageToCanvas(canvas, (img) => {
        loadedImg = img;
        
        window.KromaDB.getFilename().then(name => {
            originalFilename = name;
        });
        
        redraw();
    });

    function debounceRedraw() {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(redraw, 50);
    }

    function redraw() {
        if (!loadedImg) return;

        const w = loadedImg.naturalWidth;
        const h = loadedImg.naturalHeight;
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        const blockSize = parseInt(pixelSlider.value);
        const levels = parseInt(posterSlider.value);
        const addScanlines = scanlinesCheckbox.checked;

        // 1. Draw image with pixelation (Nearest Neighbor scaling)
        if (blockSize > 1) {
            // Draw downscaled to offscreen canvas
            const tinyW = Math.max(4, Math.round(w / blockSize));
            const tinyH = Math.max(4, Math.round(h / blockSize));

            const tinyCanvas = document.createElement('canvas');
            tinyCanvas.width = tinyW;
            tinyCanvas.height = tinyH;
            const tinyCtx = tinyCanvas.getContext('2d');
            tinyCtx.drawImage(loadedImg, 0, 0, tinyW, tinyH);

            // Blow it back up without smoothing
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tinyCanvas, 0, 0, tinyW, tinyH, 0, 0, w, h);
            ctx.imageSmoothingEnabled = true; // reset
        } else {
            ctx.drawImage(loadedImg, 0, 0, w, h);
        }

        // 2. Apply Posterization (Color reduction)
        if (levels < 32) {
            posterizePixels(ctx, w, h, levels);
        }

        // 3. Draw Scanlines Overlay
        if (addScanlines) {
            drawScanlinesGrid(ctx, w, h, blockSize);
        }
    }

    // Posterize pixel array (reduces values into discrete bins)
    function posterizePixels(ctx, width, height, levels) {
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        
        // Compute discrete step size
        const step = 255 / (levels - 1);

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.round(data[i] / step) * step;     // Red
            data[i + 1] = Math.round(data[i + 1] / step) * step; // Green
            data[i + 2] = Math.round(data[i + 2] / step) * step; // Blue
        }
        ctx.putImageData(imgData, 0, 0);
    }

    // Draw horizontal CRT Scanlines
    function drawScanlinesGrid(ctx, width, height, blockSize) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
        
        // Scanline frequency scales slightly with block size to look natural
        const step = Math.max(2, Math.round(blockSize / 2)) * 2;
        ctx.lineWidth = Math.max(1, Math.round(step / 3));

        for (let y = 0; y < height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Slider inputs
    pixelSlider.addEventListener('input', () => {
        const val = parseInt(pixelSlider.value);
        pixelValueLabel.innerText = val > 1 ? `${val}px blocks` : '1px (None)';
        debounceRedraw();
    });

    posterSlider.addEventListener('input', () => {
        const val = parseInt(posterSlider.value);
        let tag = `${val} colors`;
        if (val === 32) tag = '32 (High)';
        else if (val <= 4) tag = `${val} (Ultra Retro)`;
        
        posterValueLabel.innerText = tag;
        debounceRedraw();
    });

    scanlinesCheckbox.addEventListener('change', redraw);

    // Apply Save handlers
    function performRetroApply(nextUrl = null) {
        if (!loadedImg) return;
        window.KromaUI.saveCanvasToDB(canvas, 'Retro pixelation applied!', nextUrl);
    }

    // Download the retro/pixelated image
    downloadBtn.addEventListener('click', () => {
        if (!loadedImg) return;

        canvas.toBlob((blob) => {
            if (!blob) return;

            let baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
            if (baseName.includes('/')) {
                baseName = baseName.split('/').pop();
            }
            const outName = `${baseName}_retro.png`;

            const link = document.createElement('a');
            link.download = outName;
            link.href = URL.createObjectURL(blob);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.KromaUI.showToast(`Downloaded ${outName} successfully!`);
        }, 'image/png');
    });

    applyBtn.addEventListener('click', () => performRetroApply());
    applyNextBtn.addEventListener('click', () => performRetroApply('meme.html'));

    // Revert
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
