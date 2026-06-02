/**
 * KromaForge - Text & Watermark Adder Tool Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('editor-canvas');
    const textContentInput = document.getElementById('text-content');
    const fontFamilySelect = document.getElementById('font-family');
    const fontSizeInput = document.getElementById('font-size');
    const textOpacitySlider = document.getElementById('text-opacity');
    const textColorInput = document.getElementById('text-color');
    const outlineColorInput = document.getElementById('outline-color');
    const strokeSlider = document.getElementById('stroke-width');
    const strokeValLabel = document.getElementById('stroke-val');

    // Logo uploads
    const logoUpload = document.getElementById('logo-upload');
    const logoPreviewBox = document.getElementById('logo-preview-box');
    const logoFilename = document.getElementById('logo-filename');
    const logoRemove = document.getElementById('logo-remove');
    const logoControls = document.getElementById('logo-controls');
    const logoScaleSlider = document.getElementById('logo-scale');
    const logoScaleVal = document.getElementById('logo-scale-val');
    const logoOpacitySlider = document.getElementById('logo-opacity');
    const logoOpacityVal = document.getElementById('logo-opacity-val');

    const downloadBtn = document.getElementById('download-btn');
    const applyBtn = document.getElementById('apply-btn');
    const applyNextBtn = document.getElementById('apply-next-btn');
    const revertBtn = document.getElementById('revert-btn');

    let loadedImg = null;
    let logoImg = null;
    let originalFilename = 'image.png';

    // Layer States
    let textX = 0;
    let textY = 0;
    let logoX = 50;
    let logoY = 50;

    let textOpacity = 1.0;
    let logoScale = 0.2;
    let logoOpacity = 0.5;

    // Load active image
    window.KromaUI.loadImageToCanvas(canvas, (img) => {
        loadedImg = img;
        
        window.KromaDB.getFilename().then(name => {
            originalFilename = name;
        });
        
        // Default text position: Bottom center of canvas
        textX = canvas.width / 2;
        textY = canvas.height * 0.8;
        
        // Default logo position: Bottom right
        logoX = canvas.width - 250;
        logoY = canvas.height - 250;

        redraw();
    });

    function redraw() {
        if (!loadedImg) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw base image
        ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);

        // 2. Draw watermark logo (if exists)
        if (logoImg) {
            ctx.save();
            ctx.globalAlpha = logoOpacity;
            
            const w = logoImg.naturalWidth * logoScale;
            const h = logoImg.naturalHeight * logoScale;
            ctx.drawImage(logoImg, logoX, logoY, w, h);
            ctx.restore();
        }

        // 3. Draw text layer
        const textStr = textContentInput.value;
        if (textStr) {
            ctx.save();
            ctx.globalAlpha = textOpacity;

            const size = parseInt(fontSizeInput.value) || 30;
            const font = fontFamilySelect.value;
            ctx.font = `${size}px ${font}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const stroke = parseInt(strokeSlider.value) || 0;

            if (stroke > 0) {
                ctx.strokeStyle = outlineColorInput.value;
                ctx.lineWidth = stroke;
                ctx.lineJoin = 'round';
                ctx.strokeText(textStr, textX, textY);
            }

            ctx.fillStyle = textColorInput.value;
            ctx.fillText(textStr, textX, textY);
            ctx.restore();
        }
    }

    // Input handlers
    const inputs = [textContentInput, fontFamilySelect, fontSizeInput, textColorInput, outlineColorInput];
    inputs.forEach(i => i.addEventListener('input', redraw));

    textOpacitySlider.addEventListener('input', () => {
        textOpacity = parseInt(textOpacitySlider.value) / 100;
        redraw();
    });

    strokeSlider.addEventListener('input', () => {
        const val = parseInt(strokeSlider.value);
        strokeValLabel.innerText = `${val}px`;
        redraw();
    });

    // Logo upload handler
    logoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            logoImg = new Image();
            logoImg.onload = () => {
                logoFilename.innerText = file.name;
                logoPreviewBox.style.display = 'flex';
                logoControls.style.display = 'block';
                
                // Position at bottom right initially
                logoX = canvas.width - (logoImg.naturalWidth * logoScale) - 40;
                logoY = canvas.height - (logoImg.naturalHeight * logoScale) - 40;
                
                redraw();
                window.KromaUI.showToast('Watermark logo added! Drag it to reposition.');
            };
            logoImg.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Remove logo
    logoRemove.addEventListener('click', () => {
        logoImg = null;
        logoPreviewBox.style.display = 'none';
        logoControls.style.display = 'none';
        logoUpload.value = '';
        redraw();
    });

    logoScaleSlider.addEventListener('input', () => {
        const pct = parseInt(logoScaleSlider.value);
        logoScaleVal.innerText = `${pct}%`;
        logoScale = pct / 100;
        redraw();
    });

    logoOpacitySlider.addEventListener('input', () => {
        const pct = parseInt(logoOpacitySlider.value);
        logoOpacityVal.innerText = `${pct}%`;
        logoOpacity = pct / 100;
        redraw();
    });

    // Dragging & Interaction logic
    let activeDrag = null; // 'text' or 'logo'
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // Detect click hits on text or logo
    function getCanvasCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        // Client relative position inside the DOM canvas rect
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);
        return { x, y };
    }

    // Check hit logic
    function detectHit(coords) {
        const ctx = canvas.getContext('2d');
        
        // 1. Check text hit
        const textStr = textContentInput.value;
        const size = parseInt(fontSizeInput.value) || 30;
        ctx.font = `${size}px ${fontFamilySelect.value}`;
        const textW = ctx.measureText(textStr).width;
        const textH = size;

        // Since alignment is center/middle:
        if (textStr &&
            coords.x >= textX - textW / 2 - 10 &&
            coords.x <= textX + textW / 2 + 10 &&
            coords.y >= textY - textH / 2 - 10 &&
            coords.y <= textY + textH / 2 + 10) {
            return { type: 'text', x: textX, y: textY };
        }

        // 2. Check logo hit
        if (logoImg) {
            const logoW = logoImg.naturalWidth * logoScale;
            const logoH = logoImg.naturalHeight * logoScale;
            if (coords.x >= logoX && coords.x <= logoX + logoW &&
                coords.y >= logoY && coords.y <= logoY + logoH) {
                return { type: 'logo', x: logoX, y: logoY };
            }
        }

        return null;
    }

    // Visual Cursor Indicator for Drag targets
    canvas.addEventListener('mousemove', (e) => {
        if (activeDrag) return;
        const coords = getCanvasCoordinates(e);
        const hit = detectHit(coords);
        canvas.style.cursor = hit ? 'move' : 'default';
    });

    function startDrag(e) {
        const coords = getCanvasCoordinates(e);
        const hit = detectHit(coords);

        if (hit) {
            activeDrag = hit.type;
            dragOffsetX = coords.x - hit.x;
            dragOffsetY = coords.y - hit.y;
            e.preventDefault();
        }
    }

    function moveDrag(e) {
        if (!activeDrag) return;
        const coords = getCanvasCoordinates(e);

        if (activeDrag === 'text') {
            textX = coords.x - dragOffsetX;
            textY = coords.y - dragOffsetY;
        } else if (activeDrag === 'logo') {
            logoX = coords.x - dragOffsetX;
            logoY = coords.y - dragOffsetY;
        }

        redraw();
        e.preventDefault();
    }

    function stopDrag() {
        activeDrag = null;
    }

    // Mouse Listeners
    canvas.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('mouseup', stopDrag);

    // Touch Listeners (Mobile support)
    canvas.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', moveDrag, { passive: false });
    document.addEventListener('touchend', stopDrag);

    // Save and redirect
    function performTextApply(nextUrl = null) {
        if (!loadedImg) return;
        window.KromaUI.saveCanvasToDB(canvas, 'Layers applied successfully!', nextUrl);
    }

    // Download the image with text/watermark layers
    downloadBtn.addEventListener('click', () => {
        if (!loadedImg) return;

        canvas.toBlob((blob) => {
            if (!blob) return;

            let baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
            if (baseName.includes('/')) {
                baseName = baseName.split('/').pop();
            }
            const outName = `${baseName}_watermarked.png`;

            const link = document.createElement('a');
            link.download = outName;
            link.href = URL.createObjectURL(blob);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.KromaUI.showToast(`Downloaded ${outName} successfully!`);
        }, 'image/png');
    });

    applyBtn.addEventListener('click', () => performTextApply());
    applyNextBtn.addEventListener('click', () => performTextApply('draw.html'));

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
