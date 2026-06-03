/**
 * KromaForge - Flip & Rotate Tool Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('editor-canvas');
    const rotateLeftBtn = document.getElementById('rotate-left-btn');
    const rotateRightBtn = document.getElementById('rotate-right-btn');
    const flipHBtn = document.getElementById('flip-h-btn');
    const flipVBtn = document.getElementById('flip-v-btn');
    const fineAngleSlider = document.getElementById('fine-angle');
    const angleValueLabel = document.getElementById('angle-value');
    const downloadBtn = document.getElementById('download-btn');
    const revertBtn = document.getElementById('revert-btn');

    let loadedImg = null;
    let originalFilename = 'image.png';

    // Transformation States
    let angle90 = 0; // 0, 90, 180, 270
    let fineAngle = 0; // -45 to 45
    let flipH = false;
    let flipV = false;

    // Load active image
    window.KromaUI.loadImageToCanvas(canvas, (img) => {
        loadedImg = img;
        
        window.KromaDB.getFilename().then(name => {
            originalFilename = name;
        });
        
        redraw();
    });

    function redraw() {
        if (!loadedImg) return;

        // Determine if canvas dimensions should be swapped (90 or 270 degrees)
        const isSwapped = (angle90 === 90 || angle90 === 270 || angle90 === -90 || angle90 === -270);
        
        const targetW = isSwapped ? loadedImg.naturalHeight : loadedImg.naturalWidth;
        const targetH = isSwapped ? loadedImg.naturalWidth : loadedImg.naturalHeight;

        canvas.width = targetW;
        canvas.height = targetH;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, targetW, targetH);

        // Move cursor to center of target canvas
        ctx.translate(targetW / 2, targetH / 2);

        // Apply Rotations (90 deg increments + fine adjustments)
        const totalRad = ((angle90 + fineAngle) * Math.PI) / 180;
        ctx.rotate(totalRad);

        // Apply Flips (mirrored along the axes)
        // Note: scaling direction must adjust according to the active rotation
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

        // Draw image centered
        ctx.drawImage(
            loadedImg,
            -loadedImg.naturalWidth / 2,
            -loadedImg.naturalHeight / 2,
            loadedImg.naturalWidth,
            loadedImg.naturalHeight
        );
    }

    // Event Listeners
    rotateLeftBtn.addEventListener('click', () => {
        angle90 = (angle90 - 90) % 360;
        if (angle90 < 0) angle90 += 360;
        redraw();
    });

    rotateRightBtn.addEventListener('click', () => {
        angle90 = (angle90 + 90) % 360;
        redraw();
    });

    flipHBtn.addEventListener('click', () => {
        flipH = !flipH;
        redraw();
    });

    flipVBtn.addEventListener('click', () => {
        flipV = !flipV;
        redraw();
    });

    fineAngleSlider.addEventListener('input', () => {
        fineAngle = parseInt(fineAngleSlider.value) || 0;
        angleValueLabel.innerText = `${fineAngle}°`;
        redraw();
    });

    // Save logic
    function performTransform(nextUrl = null) {
        if (!loadedImg) return;
        
        // The canvas already holds the modified image!
        // We can directly save the current canvas contents to IndexedDB
        window.KromaUI.saveCanvasToDB(canvas, 'Transformations applied successfully!', nextUrl);
    }

    // Download the rotated/flipped image
    downloadBtn.addEventListener('click', () => {
        if (!loadedImg) return;

        canvas.toBlob((blob) => {
            if (!blob) return;

            let baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
            if (baseName.includes('/')) {
                baseName = baseName.split('/').pop();
            }
            const outName = `${baseName}_rotated.png`;

            const link = document.createElement('a');
            link.download = outName;
            link.href = URL.createObjectURL(blob);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.KromaUI.showToast(`Downloaded ${outName} successfully!`);
        }, 'image/png');
    });


    // Revert logic
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
