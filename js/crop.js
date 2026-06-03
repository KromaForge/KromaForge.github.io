/**
 * KromaForge - Crop Tool Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('editor-canvas');
    const cropBox = document.getElementById('crop-box');
    const container = document.getElementById('canvas-container');
    const widthInput = document.getElementById('crop-width');
    const heightInput = document.getElementById('crop-height');
    const downloadBtn = document.getElementById('download-btn');
    const revertBtn = document.getElementById('revert-btn');
    const ratioSelector = document.getElementById('ratio-selector');

    let imgElement = null;
    let currentRatio = 'free'; // 'free' or float value
    let originalFilename = 'image.png';

    // Crop box state (relative to CSS canvas dimensions)
    let boxX = 0;
    let boxY = 0;
    let boxW = 0;
    let boxH = 0;

    // Load active image
    window.KromaUI.loadImageToCanvas(canvas, (img, ctx) => {
        imgElement = img;
        
        window.KromaDB.getFilename().then(name => {
            originalFilename = name;
        });
        
        resetCropBox();
        updatePixelDimensions();
    });

    // Reset crop box position to 80% size, centered
    function resetCropBox() {
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        
        if (currentRatio === 'free') {
            boxW = cw * 0.8;
            boxH = ch * 0.8;
        } else {
            const ratio = parseFloat(currentRatio);
            if (cw / ch > ratio) {
                // height is the limiting factor
                boxH = ch * 0.8;
                boxW = boxH * ratio;
            } else {
                // width is limiting
                boxW = cw * 0.8;
                boxH = boxW / ratio;
            }
        }
        
        boxX = (cw - boxW) / 2;
        boxY = (ch - boxH) / 2;
        
        applyBoxStyles();
    }

    // Apply state to DOM styles
    function applyBoxStyles() {
        cropBox.style.left = `${boxX}px`;
        cropBox.style.top = `${boxY}px`;
        cropBox.style.width = `${boxW}px`;
        cropBox.style.height = `${boxH}px`;
    }

    // Update the pixel dimensions textboxes (scaled to image size)
    function updatePixelDimensions() {
        if (!imgElement) return;
        const scaleX = imgElement.naturalWidth / canvas.clientWidth;
        const scaleY = imgElement.naturalHeight / canvas.clientHeight;

        const actualW = Math.round(boxW * scaleX);
        const actualH = Math.round(boxH * scaleY);

        widthInput.value = actualW;
        heightInput.value = actualH;
    }

    // Aspect Ratio Changes
    ratioSelector.addEventListener('click', (e) => {
        const btn = e.target.closest('.grid-select-btn');
        if (!btn) return;

        ratioSelector.querySelectorAll('.grid-select-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentRatio = btn.getAttribute('data-ratio');
        resetCropBox();
        updatePixelDimensions();
    });

    // Interactive Dragging and Resizing Logic
    let isDragging = false;
    let isResizing = false;
    let activeHandle = null;
    let startMouseX = 0;
    let startMouseY = 0;
    let startBoxX = 0;
    let startBoxY = 0;
    let startBoxW = 0;
    let startBoxH = 0;

    cropBox.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('crop-handle')) {
            isResizing = true;
            activeHandle = e.target;
        } else {
            isDragging = true;
        }

        startMouseX = e.clientX;
        startMouseY = e.clientY;
        startBoxX = boxX;
        startBoxY = boxY;
        startBoxW = boxW;
        startBoxH = boxH;

        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging && !isResizing) return;

        const deltaX = e.clientX - startMouseX;
        const deltaY = e.clientY - startMouseY;
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;

        if (isDragging) {
            // Move crop box
            let newX = startBoxX + deltaX;
            let newY = startBoxY + deltaY;

            // Clamp bounds
            newX = Math.max(0, Math.min(newX, cw - boxW));
            newY = Math.max(0, Math.min(newY, ch - boxH));

            boxX = newX;
            boxY = newY;
        } else if (isResizing) {
            const minSize = 25;
            
            if (currentRatio === 'free') {
                if (activeHandle.classList.contains('handle-br')) {
                    boxW = Math.max(minSize, Math.min(startBoxW + deltaX, cw - startBoxX));
                    boxH = Math.max(minSize, Math.min(startBoxH + deltaY, ch - startBoxY));
                } else if (activeHandle.classList.contains('handle-bl')) {
                    const newW = Math.max(minSize, startBoxW - deltaX);
                    const maxW = startBoxX + startBoxW;
                    if (newW <= maxW) {
                        boxX = startBoxX + (startBoxW - newW);
                        boxW = newW;
                    }
                    boxH = Math.max(minSize, Math.min(startBoxH + deltaY, ch - startBoxY));
                } else if (activeHandle.classList.contains('handle-tr')) {
                    boxW = Math.max(minSize, Math.min(startBoxW + deltaX, cw - startBoxX));
                    const newH = Math.max(minSize, startBoxH - deltaY);
                    const maxH = startBoxY + startBoxH;
                    if (newH <= maxH) {
                        boxY = startBoxY + (startBoxH - newH);
                        boxH = newH;
                    }
                } else if (activeHandle.classList.contains('handle-tl')) {
                    const newW = Math.max(minSize, startBoxW - deltaX);
                    const maxW = startBoxX + startBoxW;
                    if (newW <= maxW) {
                        boxX = startBoxX + (startBoxW - newW);
                        boxW = newW;
                    }
                    const newH = Math.max(minSize, startBoxH - deltaY);
                    const maxH = startBoxY + startBoxH;
                    if (newH <= maxH) {
                        boxY = startBoxY + (startBoxH - newH);
                        boxH = newH;
                    }
                }
            } else {
                // Locked Aspect Ratio Resizing
                const ratio = parseFloat(currentRatio);
                let targetW = boxW;
                let targetH = boxH;

                if (activeHandle.classList.contains('handle-br')) {
                    targetW = startBoxW + deltaX;
                    targetH = targetW / ratio;
                    
                    // Boundary checks
                    if (startBoxX + targetW > cw) {
                        targetW = cw - startBoxX;
                        targetH = targetW / ratio;
                    }
                    if (startBoxY + targetH > ch) {
                        targetH = ch - startBoxY;
                        targetW = targetH * ratio;
                    }
                } else if (activeHandle.classList.contains('handle-tr')) {
                    targetW = startBoxW + deltaX;
                    targetH = targetW / ratio;
                    
                    if (startBoxX + targetW > cw) {
                        targetW = cw - startBoxX;
                        targetH = targetW / ratio;
                    }
                    
                    const newY = startBoxY + startBoxH - targetH;
                    if (newY < 0) {
                        targetH = startBoxY + startBoxH;
                        targetW = targetH * ratio;
                    }
                } else if (activeHandle.classList.contains('handle-bl')) {
                    targetW = startBoxW - deltaX;
                    targetH = targetW / ratio;
                    
                    const newX = startBoxX + startBoxW - targetW;
                    if (newX < 0) {
                        targetW = startBoxX + startBoxW;
                        targetH = targetW / ratio;
                    }
                    if (startBoxY + targetH > ch) {
                        targetH = ch - startBoxY;
                        targetW = targetH * ratio;
                    }
                } else if (activeHandle.classList.contains('handle-tl')) {
                    targetW = startBoxW - deltaX;
                    targetH = targetW / ratio;
                    
                    let newX = startBoxX + startBoxW - targetW;
                    let newY = startBoxY + startBoxH - targetH;
                    
                    if (newX < 0) {
                        targetW = startBoxX + startBoxW;
                        targetH = targetW / ratio;
                        newX = 0;
                        newY = startBoxY + startBoxH - targetH;
                    }
                    if (newY < 0) {
                        targetH = startBoxY + startBoxH;
                        targetW = targetH * ratio;
                        newY = 0;
                        newX = startBoxX + startBoxW - targetW;
                    }
                }

                if (targetW >= minSize && targetH >= minSize) {
                    if (activeHandle.classList.contains('handle-tl')) {
                        boxX = startBoxX + startBoxW - targetW;
                        boxY = startBoxY + startBoxH - targetH;
                    } else if (activeHandle.classList.contains('handle-tr')) {
                        boxY = startBoxY + startBoxH - targetH;
                    } else if (activeHandle.classList.contains('handle-bl')) {
                        boxX = startBoxX + startBoxW - targetW;
                    }
                    boxW = targetW;
                    boxH = targetH;
                }
            }
        }

        applyBoxStyles();
        updatePixelDimensions();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        isResizing = false;
        activeHandle = null;
    });

    // Touch Support for Mobile
    cropBox.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        if (e.target.classList.contains('crop-handle')) {
            isResizing = true;
            activeHandle = e.target;
        } else {
            isDragging = true;
        }

        startMouseX = touch.clientX;
        startMouseY = touch.clientY;
        startBoxX = boxX;
        startBoxY = boxY;
        startBoxW = boxW;
        startBoxH = boxH;
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging && !isResizing) return;
        const touch = e.touches[0];
        const fakeEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => e.preventDefault()
        };
        // Reuse mousemove logic
        const moveEvent = new CustomEvent('mousemove');
        Object.assign(moveEvent, fakeEvent);
        document.dispatchEvent(moveEvent);
    }, { passive: false });

    document.addEventListener('touchend', () => {
        isDragging = false;
        isResizing = false;
        activeHandle = null;
    });

    // Perform the crop operation
    function performCrop(nextUrl = null) {
        if (!imgElement) return;

        const scaleX = imgElement.naturalWidth / canvas.clientWidth;
        const scaleY = imgElement.naturalHeight / canvas.clientHeight;

        const sourceX = boxX * scaleX;
        const sourceY = boxY * scaleY;
        const sourceW = boxW * scaleX;
        const sourceH = boxH * scaleY;

        // Create temporary canvas of crop size
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sourceW;
        tempCanvas.height = sourceH;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw cropped portion
        tempCtx.drawImage(
            imgElement,
            sourceX, sourceY, sourceW, sourceH, // Source dimensions
            0, 0, sourceW, sourceH              // Target dimensions
        );

        window.KromaUI.saveCanvasToDB(tempCanvas, 'Image cropped successfully!', nextUrl);
    }

    // Download the cropped image
    downloadBtn.addEventListener('click', () => {
        if (!imgElement) return;

        const scaleX = imgElement.naturalWidth / canvas.clientWidth;
        const scaleY = imgElement.naturalHeight / canvas.clientHeight;

        const sourceX = boxX * scaleX;
        const sourceY = boxY * scaleY;
        const sourceW = boxW * scaleX;
        const sourceH = boxH * scaleY;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sourceW;
        tempCanvas.height = sourceH;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.drawImage(
            imgElement,
            sourceX, sourceY, sourceW, sourceH,
            0, 0, sourceW, sourceH
        );

        tempCanvas.toBlob((blob) => {
            if (!blob) return;

            let baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
            if (baseName.includes('/')) {
                baseName = baseName.split('/').pop();
            }
            const outName = `${baseName}_cropped.png`;

            const link = document.createElement('a');
            link.download = outName;
            link.href = URL.createObjectURL(blob);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.KromaUI.showToast(`Exported ${outName} successfully!`);
        }, 'image/png');
    });

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
