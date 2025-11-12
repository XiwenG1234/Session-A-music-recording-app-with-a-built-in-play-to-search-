/**
 * Service Worker Registration for Sessionlib
 *
 * This module handles the registration and initialization of the sessionlib
 * service worker, which provides audio fingerprinting and search capabilities.
 */

let serviceWorkerReady = false;
let serviceWorkerReadyPromise = null;

/**
 * Register the sessionlib service worker
 * @returns {Promise<ServiceWorkerRegistration>}
 */
export async function registerSessionWorker() {
  if (serviceWorkerReadyPromise) {
    return serviceWorkerReadyPromise;
  }

  serviceWorkerReadyPromise = new Promise(async (resolve, reject) => {
    if (!('serviceWorker' in navigator)) {
      reject(new Error('Service workers are not supported in this browser'));
      return;
    }

    try {
      // Register the service worker with module type from public directory
      // This allows it to intercept all paths including /v1/
      const registration = await navigator.serviceWorker.register(
        '/session-worker.js',
        {
          type: 'module'
        }
      );

      console.log('Sessionlib Service Worker registered successfully:', registration);

      // Wait for the service worker to be ready and controlling the page
      await navigator.serviceWorker.ready;

      // If not yet controlling, wait for it to take control
      if (!navigator.serviceWorker.controller) {
        console.log('Waiting for service worker to take control...');
        await new Promise((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Service worker now controlling the page');
            resolve();
          }, { once: true });
        });
      } else {
        console.log('Service worker already controlling the page');
      }

      serviceWorkerReady = true;
      resolve(registration);
    } catch (error) {
      console.error('Sessionlib Service Worker registration failed:', error);
      reject(error);
    }
  });

  return serviceWorkerReadyPromise;
}

/**
 * Check if the service worker is ready
 * @returns {Promise<boolean>}
 */
export async function isServiceWorkerReady() {
  if (serviceWorkerReady) {
    return true;
  }

  try {
    await registerSessionWorker();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for the service worker to be ready
 * @returns {Promise<void>}
 */
export async function waitForServiceWorker() {
  await registerSessionWorker();
}
