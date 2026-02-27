import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Service Worker', () => {
  let swCode;
  let CACHE_NAME;
  let urlsToCache;

  beforeEach(() => {
    // Read the service worker file
    swCode = readFileSync(join(process.cwd(), 'sw.js'), 'utf-8');

    // Extract constants from the service worker code
    const cacheNameMatch = swCode.match(/const CACHE_NAME = '([^']+)'/);
    CACHE_NAME = cacheNameMatch ? cacheNameMatch[1] : null;

    // Extract URLs to cache
    const urlsMatch = swCode.match(/const urlsToCache = \[([\s\S]*?)\]/);
    if (urlsMatch) {
      const urlsString = urlsMatch[1];
      urlsToCache = urlsString
        .split(',')
        .map(line => line.trim())
        .filter(line => line.startsWith("'") || line.startsWith('"'))
        .map(line => line.replace(/['"]/g, ''));
    }
  });

  describe('Cache configuration', () => {
    it('should have a cache name defined', () => {
      expect(CACHE_NAME).toBeTruthy();
      expect(typeof CACHE_NAME).toBe('string');
    });

    it('should have a versioned cache name', () => {
      expect(CACHE_NAME).toMatch(/v\d+/);
    });

    it('should include essential files in cache', () => {
      expect(urlsToCache).toBeTruthy();
      expect(Array.isArray(urlsToCache)).toBe(true);

      // Check for essential files
      const hasIndex = urlsToCache.some(url => url.includes('index.html'));
      const hasManifest = urlsToCache.some(url => url.includes('manifest.json'));
      const hasPwa = urlsToCache.some(url => url.includes('pwa.js'));

      expect(hasIndex).toBe(true);
      expect(hasManifest).toBe(true);
      expect(hasPwa).toBe(true);
    });

    it('should include hand-foot-toe scorecard in cache', () => {
      const hasHandFootToe = urlsToCache.some(url =>
        url.includes('hand-foot-toe.html')
      );
      expect(hasHandFootToe).toBe(true);
    });

    it('should include pinochle-racehorse scorecard in cache', () => {
      const hasPinochle = urlsToCache.some(url =>
        url.includes('pinochle-racehorse.html')
      );
      expect(hasPinochle).toBe(true);
    });

    it('should not have duplicate entries in cache list', () => {
      const uniqueUrls = [...new Set(urlsToCache)];
      expect(urlsToCache.length).toBe(uniqueUrls.length);
    });
  });

  describe('Event listeners', () => {
    it('should have install event listener', () => {
      expect(swCode).toContain("addEventListener('install'");
    });

    it('should have activate event listener', () => {
      expect(swCode).toContain("addEventListener('activate'");
    });

    it('should have fetch event listener', () => {
      expect(swCode).toContain("addEventListener('fetch'");
    });

    it('should have message event listener', () => {
      expect(swCode).toContain("addEventListener('message'");
    });
  });

  describe('Install behavior', () => {
    it('should call skipWaiting during install', () => {
      expect(swCode).toContain('skipWaiting()');
    });

    it('should cache all URLs during install', () => {
      expect(swCode).toContain('cache.addAll(urlsToCache)');
    });
  });

  describe('Activate behavior', () => {
    it('should delete old caches on activate', () => {
      expect(swCode).toContain('caches.delete');
    });

    it('should claim clients on activate', () => {
      expect(swCode).toContain('clients.claim()');
    });

    it('should only delete caches that do not match current cache name', () => {
      expect(swCode).toContain('cacheName !== CACHE_NAME');
    });
  });

  describe('Fetch strategy', () => {
    it('should implement cache-first strategy', () => {
      expect(swCode).toContain('caches.match(event.request)');
    });

    it('should fallback to network when cache misses', () => {
      expect(swCode).toContain('fetch(fetchRequest)');
    });

    it('should handle offline scenarios', () => {
      expect(swCode).toContain('.catch(');
      expect(swCode).toMatch(/Offline|offline|Service Unavailable/);
    });

    it('should cache successful network responses', () => {
      expect(swCode).toContain('cache.put(event.request');
    });
  });

  describe('Message handling', () => {
    it('should handle SKIP_WAITING message', () => {
      expect(swCode).toContain('SKIP_WAITING');
      const skipWaitingCount = (swCode.match(/skipWaiting\(\)/g) || []).length;
      expect(skipWaitingCount).toBeGreaterThan(0);
    });
  });

  describe('Code quality', () => {
    it('should use event.waitUntil for install event', () => {
      expect(swCode).toContain('event.waitUntil');
    });

    it('should use event.respondWith for fetch event', () => {
      expect(swCode).toContain('event.respondWith');
    });

    it('should have console logging for debugging', () => {
      expect(swCode).toContain('console.log');
    });
  });
});
