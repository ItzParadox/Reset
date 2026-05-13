import { describe, expect, it, vi } from 'vitest';
import { getInstallContext, getStandaloneMode, registerAppServiceWorker } from './pwa.js';

describe('PWA install context', () => {
  it('detects standalone display mode and unsupported service workers', () => {
    window.matchMedia.mockReturnValueOnce({ matches: true });
    expect(getStandaloneMode()).toBe(true);

    const original = navigator.serviceWorker;
    delete navigator.serviceWorker;
    expect(getInstallContext()).toMatchObject({
      serviceWorkerSupported: false,
      serviceWorkerStatus: 'unsupported',
      online: true,
    });
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: original });
  });

  it('reports blocked service workers outside secure contexts', () => {
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} });
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
    expect(getInstallContext()).toMatchObject({
      serviceWorkerSupported: false,
      serviceWorkerStatus: 'blocked',
    });
  });

  it('clears development service workers instead of registering them', async () => {
    const unregister = vi.fn();
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn(async () => [{ unregister }]) },
    });
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: { keys: vi.fn(async () => ['reset-v1', 'other']), delete: vi.fn(async () => true) },
    });
    Object.defineProperty(globalThis, 'caches', { configurable: true, value: window.caches });
    const onUpdate = vi.fn();

    await expect(registerAppServiceWorker(onUpdate)).resolves.toBeNull();
    expect(unregister).toHaveBeenCalled();
    expect(window.caches.delete).toHaveBeenCalledWith('reset-v1');
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ serviceWorkerStatus: 'disabled-dev' }));
  });
});
