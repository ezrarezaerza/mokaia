import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function apiMiddlewarePlugin(): Plugin {
  // In-memory mock representing remote Postgres tables
  const remoteTransactionsStore = new Map<string, any>();
  const remoteCategoriesStore = new Map<string, any>();

  return {
    name: 'api-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/sync' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const txs = data.transactions || [];
              const cats = data.categories || [];
              const lastSyncTime = data.lastSyncTime ? new Date(data.lastSyncTime).getTime() : 0;
              const now = new Date().toISOString();

              const syncedTransactionIds: string[] = [];
              const deletedTransactionIds: string[] = [];
              const syncedCategoryIds: string[] = [];
              const deletedCategoryIds: string[] = [];

              // 1. Process Transactions Push
              for (const tx of txs) {
                if (tx.isDeleted || tx.syncStatus === 'pending_delete') {
                  // Tombstone delete
                  remoteTransactionsStore.delete(tx.id);
                  deletedTransactionIds.push(tx.id);
                } else {
                  // Upsert with LWW
                  const existing = remoteTransactionsStore.get(tx.id);
                  if (!existing || new Date(tx.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
                    remoteTransactionsStore.set(tx.id, {
                      ...tx,
                      syncStatus: 'synced',
                      updatedAt: tx.updatedAt || now,
                    });
                  }
                  syncedTransactionIds.push(tx.id);
                }
              }

              // 2. Process Categories Push
              for (const cat of cats) {
                if (cat.isDeleted || cat.syncStatus === 'pending_delete') {
                  remoteCategoriesStore.delete(cat.id);
                  deletedCategoryIds.push(cat.id);
                } else {
                  const existing = remoteCategoriesStore.get(cat.id);
                  if (!existing || new Date(cat.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
                    remoteCategoriesStore.set(cat.id, {
                      ...cat,
                      syncStatus: 'synced',
                      updatedAt: cat.updatedAt || now,
                    });
                  }
                  syncedCategoryIds.push(cat.id);
                }
              }

              // 3. Process Pull (all other records updated since lastSyncTime)
              const remoteTransactions: any[] = [];
              for (const tx of remoteTransactionsStore.values()) {
                if (!txs.some((t: any) => t.id === tx.id)) {
                  if (new Date(tx.updatedAt).getTime() > lastSyncTime) {
                    remoteTransactions.push(tx);
                  }
                }
              }

              const remoteCategories: any[] = [];
              for (const cat of remoteCategoriesStore.values()) {
                if (!cats.some((c: any) => c.id === cat.id)) {
                  if (new Date(cat.updatedAt).getTime() > lastSyncTime) {
                    remoteCategories.push(cat);
                  }
                }
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: true,
                  syncedTransactionIds,
                  deletedTransactionIds,
                  syncedCategoryIds,
                  deletedCategoryIds,
                  remoteTransactions,
                  remoteCategories,
                  serverTimestamp: now,
                })
              );
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (req.url === '/api/auth/register' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: true,
                  user: { id: data.id, email: data.email, username: data.username },
                })
              );
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (req.url === '/api/auth/login' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: true,
                  user: {
                    id: 'user-' + (data.email.split('@')[0] || 'member'),
                    email: data.email,
                    username: data.email.split('@')[0] || 'Member',
                  },
                  token: 'offline_token_' + Date.now(),
                })
              );
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      apiMiddlewarePlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'Mokaia',
          short_name: 'Mokaia',
          description: 'A gamified money manager and mindful expense tracker focusing on impulse control, emotional awareness, and positive financial habits.',
          theme_color: '#09090b',
          background_color: '#09090b',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
