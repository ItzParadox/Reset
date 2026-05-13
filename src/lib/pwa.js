export function getStandaloneMode() {
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches
      || window.navigator.standalone === true,
  );
}

export function getInstallContext() {
  const isSecure = window.isSecureContext === true;
  const hasServiceWorker = 'serviceWorker' in navigator;

  if (!hasServiceWorker) {
    return {
      serviceWorkerSupported: false,
      serviceWorkerStatus: 'unsupported',
      serviceWorkerMessage: 'This browser does not support service workers.',
      standalone: getStandaloneMode(),
      online: navigator.onLine,
    };
  }

  if (!isSecure) {
    return {
      serviceWorkerSupported: false,
      serviceWorkerStatus: 'blocked',
      serviceWorkerMessage: 'Service worker needs HTTPS or localhost.',
      standalone: getStandaloneMode(),
      online: navigator.onLine,
    };
  }

  return {
    serviceWorkerSupported: true,
    serviceWorkerStatus: 'readying',
    serviceWorkerMessage: 'Preparing offline app shell.',
    standalone: getStandaloneMode(),
    online: navigator.onLine,
  };
}

export async function registerAppServiceWorker(onUpdate = () => {}) {
  if (import.meta.env.DEV) {
    await clearDevServiceWorkers();
    onUpdate({
      serviceWorkerSupported: 'serviceWorker' in navigator,
      serviceWorkerStatus: 'disabled-dev',
      serviceWorkerMessage: 'Offline app shell is disabled in local development.',
      standalone: getStandaloneMode(),
      online: navigator.onLine,
    });
    return null;
  }

  const context = getInstallContext();
  onUpdate(context);

  if (!context.serviceWorkerSupported) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    onUpdate({
      ...context,
      serviceWorkerStatus: 'active',
      serviceWorkerMessage: 'Offline app shell is active.',
      standalone: getStandaloneMode(),
      online: navigator.onLine,
    });

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;

      onUpdate({
        ...context,
        serviceWorkerStatus: 'updating',
        serviceWorkerMessage: 'Updating offline app shell.',
        standalone: getStandaloneMode(),
        online: navigator.onLine,
      });

      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed') {
          onUpdate({
            ...context,
            serviceWorkerStatus: navigator.serviceWorker.controller ? 'update-ready' : 'active',
            serviceWorkerMessage: navigator.serviceWorker.controller
              ? 'Update ready. Close and reopen the app.'
              : 'Offline app shell is active.',
            standalone: getStandaloneMode(),
            online: navigator.onLine,
          });
        }
      });
    });

    return registration;
  } catch (error) {
    onUpdate({
      ...context,
      serviceWorkerStatus: 'failed',
      serviceWorkerMessage: error instanceof Error ? error.message : 'Service worker registration failed.',
      standalone: getStandaloneMode(),
      online: navigator.onLine,
    });
    return null;
  }
}

async function clearDevServiceWorkers() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith('reset-'))
        .map((cacheName) => caches.delete(cacheName)),
    );
  }
}
