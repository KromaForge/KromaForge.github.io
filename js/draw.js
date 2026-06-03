/**
 * KromaForge - Drawing & Annotation Tool Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('editor-canvas');
    const toolSelector = document.getElementById('tool-selector');
    const swatches = document.getElementById('color-swatches');
    const customColorInput = document.getElementById('custom-color');
    const brushSizeSlider = document.getElementById('brush-size');
    const sizeValLabel = document.getElementById('size-val');
    const brushOpacitySlider = document.getElementById('brush-opacity');
    const opacityValLabel = document.getElementById('opacity-val');

    const downloadBtn = document.getElementById('download-btn');
    const undoBtn = document.getElementById('undo-btn');
    const revertBtn = document.getElementById('revert-btn');

    let loadedImg = null;
    let originalFilename = 'image.png';

    // Drawing Configurations
    let activeTool = 'free'; // 'free', 'line', 'arrow', 'rect', 'circle'
    let brushColor = '#ef4444';
    let brushSize = 5;
    let brushOpacity = 1.0;

    // History stack of shapes
    let shapesList = [];

    // Interaction State
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let curX = 0;
    let curY = 0;
    let currentFreePath = []; // For freehand pencil tool

    // Load active image
    window.KromaUI.loadImageToCanvas(canvas, (img) => {
        loadedImg = img;
        
        window.KromaDB.getFilename().then(name => {
            originalFilename = name;
        });
        
        redraw();
    });

    // Unified Redraw Logic
    function redraw() {
        if (!loadedImg) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw base image
        ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);

        // 2. Draw completed shapes from history
        shapesList.forEach(shape => drawShape(ctx, shape));

        // 3. Draw active shape in-progress
        if (isDrawing) {
            const activeShape = {
                type: activeTool,
                x1: startX,
                y1: startY,
                x2: curX,
                y2: curY,
                points: currentFreePath,
                color: brushColor,
                size: brushSize,
                opacity: brushOpacity
            };
            drawShape(ctx, activeShape);
        }
    }

    // Render single shape function
    function drawShape(ctx, shape) {
        ctx.save();
        ctx.globalAlpha = shape.opacity;
        ctx.strokeStyle = shape.color;
        ctx.fillStyle = shape.color;
        ctx.lineWidth = shape.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (shape.type) {
            case 'free':
                if (shape.points && shape.points.length > 0) {
                    ctx.beginPath();
                    ctx.moveTo(shape.points[0].x, shape.points[0].y);
                    for (let i = 1; i < shape.points.length; i++) {
                        ctx.lineTo(shape.points[i].x, shape.points[i].y);
                    }
                    ctx.stroke();
                }
                break;
            case 'line':
                ctx.beginPath();
                ctx.moveTo(shape.x1, shape.y1);
                ctx.lineTo(shape.x2, shape.y2);
                ctx.stroke();
                break;
            case 'arrow':
                drawArrowHead(ctx, shape.x1, shape.y1, shape.x2, shape.y2, shape.size, shape.color);
                break;
            case 'rect':
                ctx.beginPath();
                ctx.strokeRect(shape.x1, shape.y1, shape.x2 - shape.x1, shape.y2 - shape.y1);
                break;
            case 'circle':
                const dx = shape.x2 - shape.x1;
                const dy = shape.y2 - shape.y1;
                const radius = Math.sqrt(dx * dx + dy * dy);
                ctx.beginPath();
                ctx.arc(shape.x1, shape.y1, radius, 0, 2 * Math.PI);
                ctx.stroke();
                break;
        }

        ctx.restore();
    }

    // Helper to draw Arrow vector annotation
    function drawArrowHead(ctx, x1, y1, x2, y2, size, color) {
        // Draw the shaft line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Arrowhead size scale based on brush size
        const headlen = Math.max(12, size * 2.5); 
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
            x2 - headlen * Math.cos(angle - Math.PI / 6),
            y2 - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            x2 - headlen * Math.cos(angle + Math.PI / 6),
            y2 - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    }

    // Map client coordinates to absolute canvas coordinate space
    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);
        return { x, y };
    }

    // Interaction Start
    function startDraw(e) {
        isDrawing = true;
        const coords = getCanvasCoords(e);
        startX = coords.x;
        startY = coords.y;
        curX = coords.x;
        curY = coords.y;

        if (activeTool === 'free') {
            currentFreePath = [{ x: startX, y: startY }];
        }

        redraw();

        if (e.cancelable) {
            e.preventDefault();
        }
    }

    // Interaction Move
    function moveDraw(e) {
        if (!isDrawing) return;
        const coords = getCanvasCoords(e);
        curX = coords.x;
        curY = coords.y;

        if (activeTool === 'free') {
            currentFreePath.push({ x: curX, y: curY });
        }

        redraw();
        e.preventDefault();
    }

    // Interaction End
    function stopDraw() {
        if (!isDrawing) return;
        isDrawing = false;

        // Push current shape to history stack
        const newShape = {
            type: activeTool,
            x1: startX,
            y1: startY,
            x2: curX,
            y2: curY,
            points: [...currentFreePath],
            color: brushColor,
            size: brushSize,
            opacity: brushOpacity
        };
        shapesList.push(newShape);
        currentFreePath = [];
        redraw();
    }

    // Attach canvas events
    canvas.addEventListener('mousedown', startDraw);
    document.addEventListener('mousemove', moveDraw);
    document.addEventListener('mouseup', stopDraw);

    // Touch events for mobile draw
    canvas.addEventListener('touchstart', startDraw);
    document.addEventListener('touchmove', moveDraw, { passive: false });
    document.addEventListener('touchend', stopDraw);

    // Tool Selector Click
    toolSelector.addEventListener('click', (e) => {
        const btn = e.target.closest('.grid-select-btn');
        if (!btn) return;

        toolSelector.querySelectorAll('.grid-select-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        activeTool = btn.getAttribute('data-tool');
    });

    // Swatches selection
    swatches.addEventListener('click', (e) => {
        const swatch = e.target.closest('.swatch');
        if (!swatch) return;

        swatches.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');

        brushColor = swatch.getAttribute('data-color');
        customColorInput.value = brushColor;
    });

    // Custom color picker synchronization
    customColorInput.addEventListener('input', (e) => {
        brushColor = e.target.value;
        // Deselect swatches if custom color is chosen
        swatches.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    });

    // Brush properties
    brushSizeSlider.addEventListener('input', () => {
        const val = parseInt(brushSizeSlider.value);
        sizeValLabel.innerText = `${val}px`;
        brushSize = val;
    });

    brushOpacitySlider.addEventListener('input', () => {
        const pct = parseInt(brushOpacitySlider.value);
        opacityValLabel.innerText = `${pct}%`;
        brushOpacity = pct / 100;
    });

    // Undo button
    undoBtn.addEventListener('click', () => {
        if (shapesList.length > 0) {
            shapesList.pop();
            redraw();
        } else {
            window.KromaUI.showToast('Nothing to undo!', 'warning');
        }
    });

    // Revert Button
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

    // Apply & Save logic
    function performDrawSave(nextUrl = null) {
        if (!loadedImg) return;
        window.KromaUI.saveCanvasToDB(canvas, 'Drawing annotations applied!', nextUrl);
    }

    // Download the image with annotations
    downloadBtn.addEventListener('click', () => {
        if (!loadedImg) return;

        canvas.toBlob((blob) => {
            if (!blob) return;

            let baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
            if (baseName.includes('/')) {
                baseName = baseName.split('/').pop();
            }
            const outName = `${baseName}_annotated.png`;

            const link = document.createElement('a');
            link.download = outName;
            link.href = URL.createObjectURL(blob);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.KromaUI.showToast(`Downloaded ${outName} successfully!`);
        }, 'image/png');
    });

});
