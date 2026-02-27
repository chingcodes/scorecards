// Service Worker Registration
// This file should be included in all HTML pages to register the service worker

// Install prompt handling
let deferredPrompt;
const INSTALL_DISMISSED_KEY = 'pwa-install-dismissed';
const INSTALL_ACCEPTED_KEY = 'pwa-install-accepted';

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function shouldShowInstallPrompt() {
    // Don't show if user already dismissed or installed
    if (localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true') return false;
    if (localStorage.getItem(INSTALL_ACCEPTED_KEY) === 'true') return false;

    // Only show on mobile devices
    if (!isMobileDevice()) return false;

    // Don't show if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return false;
    if (window.navigator.standalone === true) return false; // iOS

    return true;
}

function createInstallBanner() {
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        z-index: 10000;
        box-shadow: 0 -4px 12px rgba(0,0,0,0.2);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        animation: slideUp 0.4s ease-out;
    `;

    banner.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; max-width: 600px; margin: 0 auto;">
            <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 15px; margin-bottom: 4px;">📱 Install Open-Scorecard</div>
                <div style="font-size: 13px; opacity: 0.95;">Add to your home screen for quick access and offline use</div>
            </div>
            <div style="display: flex; gap: 8px; flex-shrink: 0;">
                <button id="pwa-install-btn" style="
                    background: white;
                    color: #667eea;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-weight: bold;
                    font-size: 14px;
                    cursor: pointer;
                    white-space: nowrap;
                ">Install</button>
                <button id="pwa-dismiss-btn" style="
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: none;
                    padding: 10px 16px;
                    border-radius: 6px;
                    font-weight: bold;
                    font-size: 14px;
                    cursor: pointer;
                ">✕</button>
            </div>
        </div>
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideDown {
            from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(banner);

    // Add event listeners
    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
        if (deferredPrompt) {
            // Show native install prompt
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('[PWA] User accepted the install prompt');
                localStorage.setItem(INSTALL_ACCEPTED_KEY, 'true');
            } else {
                console.log('[PWA] User dismissed the install prompt');
                localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
            }

            deferredPrompt = null;
        } else {
            // Fallback for iOS or browsers without beforeinstallprompt
            showIOSInstructions();
        }

        banner.remove();
    });

    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
        localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
        banner.style.animation = 'slideUp 0.3s ease-out reverse';
        setTimeout(() => banner.remove(), 300);
    });
}

function showIOSInstructions() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease-out;
    `;

    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 15px;
            padding: 30px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        ">
            <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">Install App</h2>
            <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5; font-size: 14px;">
                To install this app on your device:
            </p>
            <ol style="margin: 0 0 20px 0; padding-left: 20px; color: #666; line-height: 1.8; font-size: 14px;">
                <li>Tap the Share button <span style="font-size: 18px;">⎋</span> (Safari) or Menu <span style="font-size: 18px;">⋮</span> (Chrome)</li>
                <li>Select "Add to Home Screen"</li>
                <li>Tap "Add" to confirm</li>
            </ol>
            <button id="ios-modal-close" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: bold;
                font-size: 14px;
                cursor: pointer;
                width: 100%;
            ">Got it</button>
        </div>
    `;

    const styleTag = document.createElement('style');
    styleTag.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(styleTag);

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.id === 'ios-modal-close') {
            modal.remove();
        }
    });
}

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[PWA] beforeinstallprompt event fired');

    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Show custom install banner if conditions are met
    if (shouldShowInstallPrompt()) {
        // Small delay so user sees the page first
        setTimeout(() => {
            createInstallBanner();
        }, 2000);
    }
});

// Detect if app was successfully installed
window.addEventListener('appinstalled', () => {
    console.log('[PWA] App was installed');
    localStorage.setItem(INSTALL_ACCEPTED_KEY, 'true');
    deferredPrompt = null;

    // Remove banner if it's still showing
    document.getElementById('pwa-install-banner')?.remove();
});

export function showUpdateBanner() {
    // Create simple update notification banner
    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(102, 126, 234, 0.95);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 14px;
        animation: slideDown 0.3s ease-out;
    `;

    banner.innerHTML = `✨ App updated to latest version`;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(banner);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        banner.style.animation = 'slideDown 0.3s ease-out reverse';
        setTimeout(() => banner.remove(), 300);
    }, 3000);
}

export function getServiceWorkerPath() {
    return window.location.pathname.includes('/scorecards/scorecards/')
        ? '../sw.js'
        : 'sw.js';
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Check if we just updated and should show the banner
        if (sessionStorage.getItem('pwa-updated') === 'true') {
            sessionStorage.removeItem('pwa-updated');
            showUpdateBanner();
        }

        const swPath = getServiceWorkerPath();

        navigator.serviceWorker.register(swPath)
            .then((registration) => {
                console.log('[PWA] Service Worker registered successfully:', registration.scope);

                // Check for updates on page load only
                registration.update();

                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('[PWA] New service worker found');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker installed, tell it to activate
                            console.log('[PWA] New service worker ready, activating...');
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                });
            })
            .catch((error) => {
                console.log('[PWA] Service Worker registration failed:', error);
            });
    });
}

// Listen for service worker updates and auto-reload
navigator.serviceWorker?.addEventListener('controllerchange', () => {
    console.log('[PWA] New service worker activated, reloading...');
    // Flag that we just updated so we can show banner after reload
    sessionStorage.setItem('pwa-updated', 'true');
    window.location.reload();
});
