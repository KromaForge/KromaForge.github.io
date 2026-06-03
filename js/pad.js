/**
 * KromaForge - Aspect Fitter & Padding Tool Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('editor-canvas');
    const ratioSelector = document.getElementById('ratio-selector');
    const styleSelector = document.getElementById('style-selector');
    const colorGroup = document.getElementById('color-group');
    const padColorInput = document.getElementById('pad-color');
    const padColorHex = document.getElementById('pad-color-hex');
    const scaleSlider = document.getElementById('pad-scale');
    const scaleValueLabel = document.getElementById('scale-value');
    
    const downloadBtn = document.getElementById('download-btn');
    const revertBtn = document.getElementById('revert-btn');

    let loadedImg = null;
    let originalFilename = 'image.png';

    // States
    let targetRatio = 1.0; // 1:1, 4:5, 16:9, etc.
    let paddingStyle = 'color'; // 'color' or 'blur'
    let padColor = '#ffffff';
    let scaleFactor = 0.9;

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

        const imgW = loadedImg.naturalWidth;
        const imgH = loadedImg.naturalHeight;
        const imgRatio = imgW / imgH;

        let canvasW, canvasH;

        // Calculate padded canvas dimensions to fit the target aspect ratio
        if (imgRatio > targetRatio) {
            // Original image is wider than target ratio
            canvasW = imgW;
            canvasH = imgW / targetRatio;
        } else {
            // Original image is taller than target ratio
            canvasH = imgH;
            canvasW = imgH * targetRatio;
        }

        // Apply size to canvas
        canvas.width = canvasW;
        canvas.height = canvasH;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvasW, canvasH);

        // 1. Draw Padding Background
        if (paddingStyle === 'color') {
            ctx.fillStyle = padColor;
            ctx.fillRect(0, 0, canvasW, canvasH);
        } else if (paddingStyle === 'blur') {
            ctx.save();
            // Apply GPU blur filter to context
            ctx.filter = 'blur(35px) brightness(85%)';
            
            // Draw background image stretched with a bleed padding (outward scale)
            // to prevent the transparent/white blur borders
            const bleed = 60;
            ctx.drawImage(
                loadedImg, 
                -bleed, 
                -bleed, 
                canvasW + (bleed * 2), 
                canvasH + (bleed * 2)
            );
            ctx.restore();
        }

        // 2. Draw Sharp Central Image
        // Determine fit sizes
        const fitW = canvasW * scaleFactor;
        const fitH = canvasH * scaleFactor;

        let drawW, drawH;
        if (imgRatio > canvasW / canvasH) {
            drawW = fitW;
            drawH = fitW / imgRatio;
        } else {
            drawH = fitH;
            drawW = fitH * imgRatio;
        }

        const drawX = (canvasW - drawW) / 2;
        const drawY = (canvasH - drawH) / 2;

        ctx.drawImage(loadedImg, drawX, drawY, drawW, drawH);
    }

    // Event Listeners
    ratioSelector.addEventListener('click', (e) => {
        const btn = e.target.closest('.grid-select-btn');
        if (!btn) return;

        ratioSelector.querySelectorAll('.grid-select-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        targetRatio = parseFloat(btn.getAttribute('data-ratio'));
        redraw();
    });

    styleSelector.addEventListener('click', (e) => {
        const btn = e.target.closest('.grid-select-btn');
        if (!btn) return;

        styleSelector.querySelectorAll('.grid-select-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        paddingStyle = btn.getAttribute('data-style');

        if (paddingStyle === 'color') {
            colorGroup.style.display = 'block';
        } else {
            colorGroup.style.display = 'none';
        }

        redraw();
    });

    // Synchronize color inputs
    padColorInput.addEventListener('input', (e) => {
        padColor = e.target.value;
        padColorHex.value = padColor;
        redraw();
    });

    padColorHex.addEventListener('input', (e) => {
        const val = e.target.value;
        // Basic hex regex check
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            padColor = val;
            padColorInput.value = val;
            redraw();
        }
    });

    // Image Scale Slider
    scaleSlider.addEventListener('input', () => {
        const val = parseInt(scaleSlider.value);
        scaleValueLabel.innerText = `${val}%`;
        scaleFactor = val / 100;
        redraw();
    });

    // Save functions
    function performPadding(nextUrl = null) {
        if (!loadedImg) return;
        window.KromaUI.saveCanvasToDB(canvas, 'Aspect ratio padding applied successfully!', nextUrl);
    }

    // Download the padded image
    downloadBtn.addEventListener('click', () => {
        if (!loadedImg) return;

        canvas.toBlob((blob) => {
            if (!blob) return;

            let baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
            if (baseName.includes('/')) {
                baseName = baseName.split('/').pop();
            }
            const outName = `${baseName}_padded.png`;

            const link = document.createElement('a');
            link.download = outName;
            link.href = URL.createObjectURL(blob);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.KromaUI.showToast(`Downloaded ${outName} successfully!`);
        }, 'image/png');
    });

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
