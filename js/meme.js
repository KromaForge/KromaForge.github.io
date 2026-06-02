/**
 * KromaForge - Meme Generator Tool Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('editor-canvas');
    const topTextInput = document.getElementById('meme-top');
    const bottomTextInput = document.getElementById('meme-bottom');
    const textSizeSlider = document.getElementById('text-size');
    const sizeValueLabel = document.getElementById('size-val');
    const capsCheckbox = document.getElementById('caps-chk');

    const downloadBtn = document.getElementById('download-btn');
    const applyBtn = document.getElementById('apply-btn');
    const revertBtn = document.getElementById('revert-btn');

    let loadedImg = null;
    let originalFilename = 'meme.png';

    // Load active image
    window.KromaUI.loadImageToCanvas(canvas, (img) => {
        loadedImg = img;
        
        window.KromaDB.getFilename().then(name => {
            originalFilename = name;
        });

        redraw();
    });

    // Redraw base image + meme layer
    function redraw() {
        if (!loadedImg) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw base image
        ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);

        // 2. Fetch Text Values
        let topText = topTextInput.value;
        let bottomText = bottomTextInput.value;
        const fontSize = parseInt(textSizeSlider.value) || 40;

        if (capsCheckbox.checked) {
            topText = topText.toUpperCase();
            bottomText = bottomText.toUpperCase();
        }

        // 3. Render Top Text
        if (topText) {
            const topY = fontSize + 20; // 20px padding from top
            drawWrappedMemeText(ctx, topText, canvas.width / 2, topY, fontSize, true);
        }

        // 4. Render Bottom Text
        if (bottomText) {
            const bottomY = canvas.height - 40; // 40px padding from bottom
            drawWrappedMemeText(ctx, bottomText, canvas.width / 2, bottomY, fontSize, false);
        }
    }

    // Wrap & Draw Meme Text (Impact style)
    function drawWrappedMemeText(ctx, text, x, y, fontSize, isTop) {
        ctx.font = `bold ${fontSize}px Impact, Charcoal, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = fontSize / 6;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.lineJoin = 'miter';
        ctx.miterLimit = 2;

        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        const maxWidth = canvas.width * 0.92;

        for (let n = 0; n < words.length; n++) {
            const testLine = currentLine + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(currentLine.trim());
                currentLine = words[n] + ' ';
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine.trim());

        // Draw line-by-line starting from computed anchor y
        let currentY = y;
        const lineSpacing = fontSize * 1.15;

        if (!isTop) {
            // Draw lines upwards if rendering bottom text to stay above screen boundary
            currentY = y - (lines.length - 1) * lineSpacing;
        }

        lines.forEach(line => {
            ctx.strokeText(line, x, currentY);
            ctx.fillText(line, x, currentY);
            currentY += lineSpacing;
        });
    }

    // Attach listeners
    topTextInput.addEventListener('input', redraw);
    bottomTextInput.addEventListener('input', redraw);
    capsCheckbox.addEventListener('change', redraw);

    textSizeSlider.addEventListener('input', () => {
        const val = parseInt(textSizeSlider.value);
        sizeValueLabel.innerText = `${val}px`;
        redraw();
    });

    // Exporter click handler
    downloadBtn.addEventListener('click', () => {
        canvas.toBlob((blob) => {
            if (!blob) return;

            let baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
            if (baseName.includes('/')) {
                baseName = baseName.split('/').pop();
            }
            const outName = `${baseName}_meme.png`;

            // Create download anchor
            const link = document.createElement('a');
            link.download = outName;
            link.href = URL.createObjectURL(blob);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.KromaUI.showToast(`Meme ${outName} downloaded!`);
        }, 'image/png');
    });

    // Save changes back to session
    applyBtn.addEventListener('click', () => {
        window.KromaUI.saveCanvasToDB(canvas, 'Meme text layers saved back to active session!');
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
