/**
 * KromaForge - Convert & Compress Tool Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('editor-canvas');
    const formatSelector = document.getElementById('format-selector');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityValue = document.getElementById('quality-value');
    const qualitySection = document.getElementById('quality-section');
    
    // Size fields
    const originalSizeLabel = document.getElementById('original-size');
    const newSizeLabel = document.getElementById('new-size');
    const savingsRow = document.getElementById('savings-row');
    const savingsValue = document.getElementById('savings-value');

    const downloadBtn = document.getElementById('download-btn');
    const applyNextBtn = document.getElementById('apply-next-btn');
    const revertBtn = document.getElementById('revert-btn');

    let originalSize = 0;
    let originalFilename = 'kromaforge_edit.png';
    
    // States
    let activeFormat = 'image/jpeg';
    let activeQuality = 0.85;

    // Load active image
    window.KromaUI.loadImageToCanvas(canvas, (img) => {
        // Get metadata from db
        window.KromaDB.getFilename().then(name => {
            originalFilename = name;
        });

        window.KromaDB.getActiveImage().then(blob => {
            if (blob) {
                originalSize = blob.size;
                originalSizeLabel.innerText = formatBytes(originalSize);
                updateSizes();
            }
        });
    });

    // Helper to format bytes
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Trigger asynchronous blob computation to calculate output size
    function updateSizes() {
        canvas.toBlob((blob) => {
            if (!blob) return;

            const newSize = blob.size;
            newSizeLabel.innerText = formatBytes(newSize);

            // Compute savings
            if (originalSize > 0) {
                const diff = originalSize - newSize;
                const pct = Math.round((diff / originalSize) * 100);
                if (pct > 0) {
                    savingsRow.style.display = 'flex';
                    savingsValue.innerText = `${pct}% reduction`;
                } else {
                    savingsRow.style.display = 'none';
                }
            }
        }, activeFormat, activeQuality);
    }

    // Format Selector
    formatSelector.addEventListener('click', (e) => {
        const btn = e.target.closest('.grid-select-btn');
        if (!btn) return;

        formatSelector.querySelectorAll('.grid-select-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        activeFormat = btn.getAttribute('data-format');

        // Toggle quality section visibility based on format (PNG is lossless)
        if (activeFormat === 'image/png') {
            qualitySection.style.opacity = '0.3';
            qualitySlider.disabled = true;
        } else {
            qualitySection.style.opacity = '1';
            qualitySlider.disabled = false;
        }

        updateSizes();
    });

    // Quality Slider
    qualitySlider.addEventListener('input', () => {
        const val = parseInt(qualitySlider.value);
        qualityValue.innerText = `${val}%`;
        activeQuality = val / 100;
        updateSizes();
    });

    // Download click handler
    downloadBtn.addEventListener('click', () => {
        canvas.toBlob((blob) => {
            if (!blob) return;

            // Generate output filename
            const extMap = {
                'image/png': 'png',
                'image/jpeg': 'jpg',
                'image/webp': 'webp'
            };
            const ext = extMap[activeFormat];
            
            // Swap extension
            let baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
            if (baseName.includes('/')) {
                baseName = baseName.split('/').pop();
            }
            const outName = `${baseName}_kromaforge.${ext}`;

            // Create download anchor
            const link = document.createElement('a');
            link.download = outName;
            link.href = URL.createObjectURL(blob);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.KromaUI.showToast(`Downloaded ${outName} successfully!`);
        }, activeFormat, activeQuality);
    });

    // Save & continue handler
    applyNextBtn.addEventListener('click', () => {
        // Save to DB in lossless PNG format to preserve maximum quality for subsequent edits,
        // but save the user's format settings in filename metadata.
        canvas.toBlob((blob) => {
            if (!blob) return;
            
            window.KromaDB.setActiveImage(blob).then(() => {
                const extMap = {
                    'image/png': 'png',
                    'image/jpeg': 'jpg',
                    'image/webp': 'webp'
                };
                const newExt = extMap[activeFormat];
                let baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
                window.KromaDB.setFilename(`${baseName}.${newExt}`);
                
                window.KromaUI.showToast('Format configuration saved!', 'success');
                setTimeout(() => {
                    window.location.href = 'pad.html';
                }, 500);
            });
        }, 'image/png'); // Preserve editing layers losslessly
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
