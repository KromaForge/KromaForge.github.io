/**
 * KromaForge - Shared UI Module
 * Automatically injects header, sidebar, toast containers, and shares navigation/upload flows.
 */

const TOOLS_CONFIG = [
    { id: 'crop', name: 'Image Cropper', path: 'crop.html', icon: '✂️', desc: 'Crop custom ratios & freeform' },
    { id: 'resize', name: 'Image Resizer', path: 'resize.html', icon: '📐', desc: 'Scale dimensions & percent' },
    { id: 'filter', name: 'Filters & Adjust', path: 'filter.html', icon: '🎨', desc: 'Sliders & cinematic filters' },
    { id: 'rotate', name: 'Flip & Rotate', path: 'rotate.html', icon: '🔄', desc: 'Angles and mirror rotations' },
    { id: 'convert', name: 'Convert & Compress', path: 'convert.html', icon: '💾', desc: 'Format swap & quality compression' },
    { id: 'pad', name: 'Aspect Fitter', path: 'pad.html', icon: '🔳', desc: 'Add solid or blurry padding' },
    { id: 'text', name: 'Text & Watermark', path: 'text.html', icon: '✍️', desc: 'Overlay logo & custom text styles' },
    { id: 'draw', name: 'Drawing Tool', path: 'draw.html', icon: '🖌️', desc: 'Draw annotations & shapes' },
    { id: 'retro', name: 'Retro & Pixelate', path: 'retro.html', icon: '👾', desc: 'Retro pixel blocks & scanlines' },
    { id: 'meme', name: 'Meme Generator', path: 'meme.html', icon: '🤪', desc: 'Impact font meme overlay creator' }
];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup global toast container if not exists
    if (!document.getElementById('toast-container')) {
        const tContainer = document.createElement('div');
        tContainer.id = 'toast-container';
        tContainer.className = 'toast-container';
        document.body.appendChild(tContainer);
    }

    // 2. Identify Page Type
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    // 3. Inject Navigation / Layout Components based on page
    injectHeader(currentPath);
    
    // Static / legal pages list
    const staticPages = ['index.html', 'about.html', 'privacy.html', 'terms.html', '404.html'];
    if (staticPages.includes(currentPath)) {
        injectFooter(currentPath);
    }
    
    if (!staticPages.includes(currentPath) && currentPath !== 'index.html') {
        injectSidebar(currentPath);
        injectEmptyState();
        setupMobileControls();
    }
});

// Toast Helper
window.KromaUI = {
    showToast: (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast glass-panel toast-${type}`;
        
        let emoji = '✨';
        if (type === 'success') emoji = '✅';
        else if (type === 'danger') emoji = '❌';
        else if (type === 'warning') emoji = '⚠️';

        toast.innerHTML = `<span>${emoji}</span><span>${message}</span>`;
        container.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove after 3.5s
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },
    
    // Utility to load image from DB onto a canvas
    loadImageToCanvas: (canvasElement, callback) => {
        if (!window.KromaDB) {
            console.error('KromaDB not loaded');
            return;
        }

        window.KromaDB.getActiveImage().then((blob) => {
            if (!blob) {
                // Show empty state
                const emptyState = document.getElementById('empty-tool-state');
                if (emptyState) emptyState.style.display = 'flex';
                return;
            }

            // Hide empty state
            const emptyState = document.getElementById('empty-tool-state');
            if (emptyState) emptyState.style.display = 'none';

            const img = new Image();
            const url = URL.createObjectURL(blob);
            img.onload = () => {
                canvasElement.width = img.naturalWidth;
                canvasElement.height = img.naturalHeight;
                const ctx = canvasElement.getContext('2d');
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);
                if (callback) callback(img, ctx);
            };
            img.src = url;
        }).catch(err => {
            console.error('Error loading image from DB:', err);
            window.KromaUI.showToast('Failed to load image from database.', 'danger');
        });
    },

    // Save canvas back to DB & keep editing or redirect
    saveCanvasToDB: (canvasElement, message = 'Changes saved successfully!', nextToolUrl = null) => {
        canvasElement.toBlob((blob) => {
            if (!blob) {
                window.KromaUI.showToast('Failed to process image canvas.', 'danger');
                return;
            }

            window.KromaDB.setActiveImage(blob).then(() => {
                window.KromaUI.showToast(message, 'success');
                if (nextToolUrl) {
                    setTimeout(() => {
                        window.location.href = nextToolUrl;
                    }, 500);
                }
            }).catch(err => {
                console.error('Error saving to DB:', err);
                window.KromaUI.showToast('Failed to save to database.', 'danger');
            });
        }, 'image/png'); // Save as lossless PNG internally to preserve editing quality
    }
};

// Automatic Header Injection
function injectHeader(currentPath) {
    const header = document.querySelector('header.app-header');
    if (!header) return;

    const isDashboard = currentPath === 'index.html';
    
    header.innerHTML = `
        <div class="nav-wrap">
            <a href="index.html" class="logo-area">
                <span class="logo-icon">✨</span>
                <span class="logo-text">Kroma<span class="logo-span">Forge</span></span>
            </a>
            <div class="nav-links">
                ${!isDashboard ? `<button class="mobile-sidebar-toggle btn" id="mobile-sidebar-toggle">☰ Tools</button>` : ''}
                <a href="index.html" class="btn ${isDashboard ? 'btn-primary' : ''}">
                    🏠 Dashboard
                </a>
            </div>
        </div>
    `;
}

// Automatic Sidebar Injection
function injectSidebar(currentPath) {
    const sidebar = document.querySelector('.editor-sidebar');
    if (!sidebar) return;

    let linksHTML = '';
    TOOLS_CONFIG.forEach(t => {
        const isActive = currentPath === t.path;
        linksHTML += `
            <li>
                <a href="${t.path}" class="sidebar-link ${isActive ? 'active' : ''}">
                    <span class="sidebar-link-icon">${t.icon}</span>
                    <span>${t.name}</span>
                </a>
            </li>
        `;
    });

    sidebar.innerHTML = `
        <div class="sidebar-title">Editing Tools</div>
        <ul class="sidebar-links">
            ${linksHTML}
        </ul>
    `;
}

// Empty State Upload Drawer Injector
function injectEmptyState() {
    const viewport = document.querySelector('.editor-viewport');
    if (!viewport || document.getElementById('empty-tool-state')) return;

    const empty = document.createElement('div');
    empty.id = 'empty-tool-state';
    empty.className = 'empty-tool-state';
    empty.innerHTML = `
        <div class="empty-tool-icon">📂</div>
        <h2 class="empty-tool-title">No Image Uploaded Yet</h2>
        <p class="empty-tool-desc">To get started with this tool, drop an image here or select a file from your device.</p>
        <button class="btn btn-primary" id="empty-upload-btn">Select Image File</button>
        <input type="file" id="empty-file-input" class="file-input" accept="image/*">
    `;
    viewport.appendChild(empty);

    const selectBtn = empty.querySelector('#empty-upload-btn');
    const fileInput = empty.querySelector('#empty-file-input');

    selectBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleDirectUpload(file);
    });

    // Drag and Drop
    viewport.addEventListener('dragover', (e) => {
        e.preventDefault();
        viewport.classList.add('dragover');
    });
    viewport.addEventListener('dragleave', () => {
        viewport.classList.remove('dragover');
    });
    viewport.addEventListener('drop', (e) => {
        e.preventDefault();
        viewport.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleDirectUpload(file);
        }
    });
}

function handleDirectUpload(file) {
    if (!window.KromaDB) return;
    
    window.KromaDB.clearAll().then(() => {
        return window.KromaDB.setFilename(file.name);
    }).then(() => {
        // Active Blob
        return window.KromaDB.setActiveImage(file);
    }).then(() => {
        // Original Blob
        return window.KromaDB.setOriginalImage(file);
    }).then(() => {
        window.KromaUI.showToast('Image uploaded successfully!');
        // Reload current page to load image into editor
        window.location.reload();
    }).catch(err => {
        console.error(err);
        window.KromaUI.showToast('Error uploading image', 'danger');
    });
}

// Mobile navigation toggle
function setupMobileControls() {
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'mobile-sidebar-toggle') {
            const sidebar = document.querySelector('.editor-sidebar');
            if (sidebar) sidebar.classList.toggle('open');
        }
    });
}

// Automatic Footer Injection
function injectFooter(currentPath) {
    if (document.querySelector('footer.app-footer')) return;
    
    const footer = document.createElement('footer');
    footer.className = 'app-footer';
    
    footer.innerHTML = `
        <div class="footer-wrap">
            <div class="footer-grid">
                <div class="footer-col brand-col">
                    <a href="index.html" class="logo-area">
                        <span class="logo-icon">✨</span>
                        <span class="logo-text">Kroma<span class="logo-span">Forge</span></span>
                    </a>
                    <p class="footer-brand-desc">
                        A premium, client-side image editor with 10 powerful tools. Your images are secure and private because everything runs 100% locally in your web browser.
                    </p>
                </div>
                <div class="footer-col">
                    <h4 class="footer-col-title">Editing Tools</h4>
                    <ul class="footer-links">
                        <li><a href="crop.html" class="footer-link">✂️ Cropper</a></li>
                        <li><a href="resize.html" class="footer-link">📐 Resizer</a></li>
                        <li><a href="filter.html" class="footer-link">🎨 Filters</a></li>
                        <li><a href="rotate.html" class="footer-link">🔄 Rotate &amp; Flip</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4 class="footer-col-title">Advanced Tools</h4>
                    <ul class="footer-links">
                        <li><a href="convert.html" class="footer-link">💾 Convert &amp; Compress</a></li>
                        <li><a href="pad.html" class="footer-link">🔳 Aspect Fitter</a></li>
                        <li><a href="text.html" class="footer-link">✍️ Add Text &amp; Logo</a></li>
                        <li><a href="draw.html" class="footer-link">🖌️ Drawing Tool</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4 class="footer-col-title">Legal &amp; Info</h4>
                    <ul class="footer-links">
                        <li><a href="about.html" class="footer-link">🔷 About KromaForge</a></li>
                        <li><a href="privacy.html" class="footer-link">🔒 Privacy Policy</a></li>
                        <li><a href="terms.html" class="footer-link">📋 Terms of Service</a></li>
                    </ul>
                </div>
            </div>
            <hr class="footer-divider">
            <div class="footer-bottom">
                <span class="footer-copyright">&copy; 2026 KromaForge. Created with &hearts; for private image editing.</span>
                <div class="footer-badges">
                    <span class="footer-badge">🔒 100% Local</span>
                    <span class="footer-badge">🍪 No Cookies</span>
                    <span class="footer-badge">⚡ WebP Supported</span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(footer);
}

