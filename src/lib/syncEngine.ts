import {
  db,
  purgeDeletedTransaction,
  purgeDeletedCategory,
} from './db';
import type {
  LocalTransaction,
  LocalCategory,
  SyncResult,
} from '../types';

export interface SyncEngineStatus {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  lastError: string | null;
}

type SyncListener = (status: SyncEngineStatus) => void;

class SyncEngine {
  private isSyncing = false;
  private isSimulatedOffline = false;
  private lastSyncTime: string | null = null;
  private lastError: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private intervalId: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange());
      window.addEventListener('offline', () => this.handleNetworkChange());

      // Auto-sync polling every 25 seconds when online
      this.intervalId = window.setInterval(() => {
        if (this.effectiveOnlineStatus && !this.isSyncing) {
          this.sync();
        }
      }, 25000);
    }
  }

  public get effectiveOnlineStatus(): boolean {
    if (this.isSimulatedOffline) return false;
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public setSimulatedOffline(value: boolean) {
    this.isSimulatedOffline = value;
    this.notifyListeners();
    if (!value && navigator.onLine) {
      this.sync();
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.getStatus().then(listener);
    return () => this.listeners.delete(listener);
  }

  private async notifyListeners() {
    const status = await this.getStatus();
    this.listeners.forEach((fn) => fn(status));
  }

  /**
   * Pending count combines both pending creates/edits and pending tombstones
   */
  public async getPendingCount(): Promise<number> {
    try {
      const pendingTxs = await db.transactions
        .where('syncStatus')
        .anyOf(['pending', 'pending_delete'])
        .count();

      const pendingCats = await db.categories
        .where('syncStatus')
        .anyOf(['pending', 'pending_delete'])
        .count();

      return pendingTxs + pendingCats;
    } catch {
      return 0;
    }
  }

  public async getStatus(): Promise<SyncEngineStatus> {
    const pendingCount = await this.getPendingCount();
    return {
      isOnline: this.effectiveOnlineStatus,
      isSimulatedOffline: this.isSimulatedOffline,
      isSyncing: this.isSyncing,
      pendingCount,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
    };
  }

  private handleNetworkChange() {
    this.notifyListeners();
    if (this.effectiveOnlineStatus) {
      this.sync();
    }
  }

  /**
   * Bi-Directional Sync Protocol (Push & Pull Hydration with LWW Conflict Resolution)
   * 1. Push (Up): Reads all 'pending' and 'pending_delete' records and transmits to Postgres API.
   * 2. Pull (Down): Receives remote changes since lastSyncTime and upserts into Dexie.
   * 3. Tombstone Deletion: Confirmed deleted records are purged from local Dexie.
   * 4. Conflict Resolution: Most recent updatedAt (UTC) always wins.
   */
  public async sync(): Promise<SyncResult> {
    if (!this.effectiveOnlineStatus) {
      return {
        pushedCount: 0,
        pulledCount: 0,
        failedCount: 0,
        errors: ['Device is currently offline'],
      };
    }

    if (this.isSyncing) {
      return {
        pushedCount: 0,
        pulledCount: 0,
        failedCount: 0,
        errors: ['Sync operation currently in progress'],
      };
    }

    this.isSyncing = true;
    this.lastError = null;
    await this.notifyListeners();

    const result: SyncResult = {
      pushedCount: 0,
      pulledCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      // 1. Gather all pending local records (both active changes and tombstones)
      const pendingTransactions = await db.transactions
        .where('syncStatus')
        .anyOf(['pending', 'pending_delete'])
        .toArray();

      const pendingCategories = await db.categories
        .where('syncStatus')
        .anyOf(['pending', 'pending_delete'])
        .toArray();

      const queueItems = await db.syncQueue.toArray();

      const pushPayload = {
        transactions: pendingTransactions,
        categories: pendingCategories,
        queue: queueItems,
        lastSyncTime: this.lastSyncTime,
        clientTimestamp: new Date().toISOString(),
      };

      // 2. Perform Bi-Directional sync request
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pushPayload),
      }).catch((err) => {
        throw new Error(`Network failure during sync push: ${err.message}`);
      });

      if (!response.ok) {
        throw new Error(`Sync server responded with HTTP status ${response.status}`);
      }

      const syncResponse = await response.json();

      // =====================================================================
      // STEP 3: Confirm PUSH (Mark synced, purge tombstones)
      // =====================================================================
      const syncedTxIds: string[] = syncResponse.syncedTransactionIds || [];
      const deletedTxIds: string[] = syncResponse.deletedTransactionIds || [];
      const syncedCatIds: string[] = syncResponse.syncedCategoryIds || [];
      const deletedCatIds: string[] = syncResponse.deletedCategoryIds || [];

      await db.transaction('rw', db.transactions, db.categories, db.syncQueue, async () => {
        // A. Confirmed synced transactions
        for (const id of syncedTxIds) {
          const tx = await db.transactions.get(id);
          if (tx && !tx.isDeleted) {
            await db.transactions.update(id, {
              syncStatus: 'synced',
            });
          }
        }

        // B. Confirmed deleted transactions (Tombstone Purge after Postgres confirmation)
        for (const id of deletedTxIds) {
          await purgeDeletedTransaction(id);
        }

        // C. Confirmed synced categories
        for (const id of syncedCatIds) {
          const cat = await db.categories.get(id);
          if (cat && !cat.isDeleted) {
            await db.categories.update(id, {
              syncStatus: 'synced',
            });
          }
        }

        // D. Confirmed deleted categories (Tombstone Purge)
        for (const id of deletedCatIds) {
          await purgeDeletedCategory(id);
        }

        // E. Clear processed sync queue items
        if (queueItems.length > 0) {
          const queueIds = queueItems.map((q) => q.id);
          await db.syncQueue.bulkDelete(queueIds);
        }
      });

      result.pushedCount = syncedTxIds.length + deletedTxIds.length + syncedCatIds.length + deletedCatIds.length;

      // =====================================================================
      // STEP 4: Process PULL (Hydration from Postgres with LWW Conflict Resolution)
      // =====================================================================
      const remoteTransactions: LocalTransaction[] = syncResponse.remoteTransactions || [];
      const remoteCategories: LocalCategory[] = syncResponse.remoteCategories || [];

      let pulledCount = 0;

      await db.transaction('rw', db.transactions, db.categories, async () => {
        // Hydrate Categories
        for (const remoteCat of remoteCategories) {
          const localCat = await db.categories.get(remoteCat.id);
          if (!localCat) {
            if (!remoteCat.isDeleted) {
              await db.categories.put({
                ...remoteCat,
                syncStatus: 'synced',
              });
              pulledCount++;
            }
          } else {
            // Conflict resolution: Compare UTC updatedAt
            const remoteTime = new Date(remoteCat.updatedAt).getTime();
            const localTime = new Date(localCat.updatedAt).getTime();

            if (remoteTime >= localTime) {
              if (remoteCat.isDeleted) {
                await purgeDeletedCategory(remoteCat.id);
              } else {
                await db.categories.put({
                  ...remoteCat,
                  syncStatus: 'synced',
                });
              }
              pulledCount++;
            }
          }
        }

        // Hydrate Transactions
        for (const remoteTx of remoteTransactions) {
          const localTx = await db.transactions.get(remoteTx.id);
          if (!localTx) {
            if (!remoteTx.isDeleted) {
              await db.transactions.put({
                ...remoteTx,
                syncStatus: 'synced',
              });
              pulledCount++;
            }
          } else {
            // Conflict resolution: Compare UTC updatedAt
            const remoteTime = new Date(remoteTx.updatedAt).getTime();
            const localTime = new Date(localTx.updatedAt).getTime();

            if (remoteTime >= localTime) {
              if (remoteTx.isDeleted) {
                await purgeDeletedTransaction(remoteTx.id);
              } else {
                await db.transactions.put({
                  ...remoteTx,
                  syncStatus: 'synced',
                });
              }
              pulledCount++;
            }
          }
        }
      });

      result.pulledCount = pulledCount;
      this.lastSyncTime = syncResponse.serverTimestamp || new Date().toISOString();
      this.lastError = null;
    } catch (err: any) {
      console.warn('Sync engine encountered non-blocking network error:', err.message);
      this.lastError = err.message || 'Sync temporarily paused';
      result.errors.push(this.lastError);
      result.failedCount++;

      // Increment retry counters on queue items
      try {
        const queueItems = await db.syncQueue.toArray();
        for (const item of queueItems) {
          await db.syncQueue.update(item.id, {
            attempts: item.attempts + 1,
            lastAttempt: new Date().toISOString(),
            error: this.lastError || undefined,
          });
        }
      } catch {
        // silent recovery
      }
    } finally {
      this.isSyncing = false;
      await this.notifyListeners();
    }

    return result;
  }
}

export const syncEngine = new SyncEngine();
