// Service Worker Registration
// This file should be included in all HTML pages to register the service worker

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Determine the correct path to sw.js based on current location
        const swPath = window.location.pathname.includes('/scorecards/scorecards/')
            ? '../sw.js'
            : 'sw.js';

        navigator.serviceWorker.register(swPath)
            .then((registration) => {
                console.log('[PWA] Service Worker registered successfully:', registration.scope);

                // Check for updates periodically
                setInterval(() => {
                    registration.update();
                }, 60000); // Check every minute
            })
            .catch((error) => {
                console.log('[PWA] Service Worker registration failed:', error);
            });
    });
}

// Listen for service worker updates
navigator.serviceWorker?.addEventListener('controllerchange', () => {
    console.log('[PWA] New service worker activated');
});
