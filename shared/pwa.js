// Service Worker Registration
// This file should be included in all HTML pages to register the service worker

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
