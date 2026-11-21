import { Artifact, Trip, TripLog } from '../types.ts';

export interface PendingMutation {
  id: string;
  entity: 'trip' | 'artifact' | 'log';
  action: 'upsert' | 'delete';
  data: Record<string, unknown>;
  imageBlobFront?: Blob;
  imageBlobBack?: Blob;
  timestamp: number;
}

const DB_NAME = 'bitacora_offline_v1';
const STORE_MUTATIONS = 'pending_mutations';
const STORE_CACHE = 'local_cache';

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_MUTATIONS)) {
        db.createObjectStore(STORE_MUTATIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
      }
    };
  });
}

class OfflineQueueManager {
  private syncListeners: ((count: number) => void)[] = [];
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.sync());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          this.sync();
        }
      });
    }
  }

  onCountChange(listener: (count: number) => void) {
    this.syncListeners.push(listener);
    this.getPendingCount().then((count) => listener(count));
  }

  async getPendingCount(): Promise<number> {
    try {
      const db = await openIndexedDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_MUTATIONS, 'readonly');
        const countReq = tx.objectStore(STORE_MUTATIONS).count();
        countReq.onsuccess = () => resolve(countReq.result);
        countReq.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  }

  async enqueue(mutation: PendingMutation): Promise<void> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
      tx.objectStore(STORE_MUTATIONS).put(mutation);
      tx.oncomplete = async () => {
        const count = await this.getPendingCount();
        this.syncListeners.forEach((l) => l(count));
        if (navigator.onLine) {
          this.sync();
        }
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async sync(): Promise<{ processed: number }> {
    if (this.isSyncing || !navigator.onLine) return { processed: 0 };
    this.isSyncing = true;

    try {
      const db = await openIndexedDb();
      const mutations: PendingMutation[] = await new Promise((resolve) => {
        const tx = db.transaction(STORE_MUTATIONS, 'readonly');
        const req = tx.objectStore(STORE_MUTATIONS).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      if (mutations.length === 0) {
        this.isSyncing = false;
        return { processed: 0 };
      }

      console.log(`[OfflineQueue] Sincronizando ${mutations.length} elementos pendientes...`);

      // 1. Process batch mutations
      const batchPayload = mutations.map((m) => ({
        entity: m.entity,
        action: m.action,
        data: m.data,
      }));

      const res = await fetch('/api/sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mutations: batchPayload }),
      });

      if (!res.ok) {
        throw new Error(`Sync batch failed with HTTP ${res.status}`);
      }

      // 2. Upload any queued image blobs for artifacts
      for (const m of mutations) {
        if (m.entity === 'artifact') {
          const artifactId = m.data.id as string;
          if (m.imageBlobFront) {
            const formData = new FormData();
            formData.append('file', m.imageBlobFront, 'front.webp');
            await fetch(`/api/artifacts/${artifactId}/upload?side=front`, {
              method: 'POST',
              body: formData,
            });
          }
          if (m.imageBlobBack) {
            const formData = new FormData();
            formData.append('file', m.imageBlobBack, 'back.webp');
            await fetch(`/api/artifacts/${artifactId}/upload?side=back`, {
              method: 'POST',
              body: formData,
            });
          }
        }
      }

      // 3. Clear processed mutations from IndexedDB
      const clearTx = db.transaction(STORE_MUTATIONS, 'readwrite');
      clearTx.objectStore(STORE_MUTATIONS).clear();
      await new Promise((resolve) => {
        clearTx.oncomplete = resolve;
      });

      const remaining = await this.getPendingCount();
      this.syncListeners.forEach((l) => l(remaining));

      console.log(`[OfflineQueue] Sincronización exitosa.`);
      return { processed: mutations.length };
    } catch (err) {
      console.warn('[OfflineQueue] Falló la sincronización:', err);
      return { processed: 0 };
    } finally {
      this.isSyncing = false;
    }
  }

  // Cache helper for offline viewing
  async setCache(key: string, data: unknown): Promise<void> {
    try {
      const db = await openIndexedDb();
      const tx = db.transaction(STORE_CACHE, 'readwrite');
      tx.objectStore(STORE_CACHE).put({ key, data, timestamp: Date.now() });
    } catch (e) {
      console.warn('Failed to cache in IndexedDB', e);
    }
  }

  async getCache<T>(key: string): Promise<T | null> {
    try {
      const db = await openIndexedDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_CACHE, 'readonly');
        const req = tx.objectStore(STORE_CACHE).get(key);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }
}

export const offlineQueue = new OfflineQueueManager();
