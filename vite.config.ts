import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { Pool } from 'pg';
import { put } from '@vercel/blob';

function apiMiddlewarePlugin(): Plugin {
  // Remote Postgres connection pool
  const pgConnectionString =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.PRISMA_DATABASE_URL;

  let pool: Pool | null = null;
  if (pgConnectionString) {
    try {
      pool = new Pool({
        connectionString: pgConnectionString,
        ssl: { rejectUnauthorized: false },
        max: 5,
      });
      pool.on('error', (err) => {
        console.warn('Postgres background pool error:', err.message);
      });
    } catch (e: any) {
      console.warn('Failed to initialize Postgres pool in Vite plugin:', e.message);
    }
  }

  // In-memory fallback if Postgres is temporarily unreachable
  const remoteTransactionsStore = new Map<string, any>();
  const remoteCategoriesStore = new Map<string, any>();

  return {
    name: 'api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // 1. Private Blob Proxy Endpoint
        if (req.url?.startsWith('/api/blob') && req.method === 'GET') {
          const parsedUrl = new URL(req.url, 'http://localhost:3000');
          const targetUrl = parsedUrl.searchParams.get('url');
          if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url query param' }));
            return;
          }
          try {
            const token = process.env.BLOB_READ_WRITE_TOKEN;
            const blobRes = await fetch(targetUrl, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            res.writeHead(blobRes.status, {
              'Content-Type': blobRes.headers.get('content-type') || 'image/svg+xml',
              'Cache-Control': 'public, max-age=86400',
            });
            const arrayBuffer = await blobRes.arrayBuffer();
            res.end(Buffer.from(arrayBuffer));
          } catch (err: any) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // 2. Blob Upload Endpoint
        if (req.url === '/api/upload' && req.method === 'POST') {
          const contentType = req.headers['content-type'] || '';
          const filename = (req.headers['x-filename'] as string) || `upload-${Date.now()}.png`;

          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          req.on('end', async () => {
            try {
              const buffer = Buffer.concat(chunks);
              if (process.env.BLOB_READ_WRITE_TOKEN) {
                const blob = await put(`vault/${filename}`, buffer, {
                  access: 'private',
                  contentType: contentType.includes('image/') ? contentType : 'image/jpeg',
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, url: blob.url, pathname: blob.pathname }));
              } else {
                // Return base64 fallback
                const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, url: dataUrl }));
              }
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // 3. Bi-Directional Sync Endpoint
        if (req.url === '/api/sync' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body);
              const txs = data.transactions || [];
              const cats = data.categories || [];
              const lastSyncTime = data.lastSyncTime ? new Date(data.lastSyncTime).toISOString() : new Date(0).toISOString();
              const now = new Date().toISOString();

              const syncedTransactionIds: string[] = [];
              const deletedTransactionIds: string[] = [];
              const syncedCategoryIds: string[] = [];
              const deletedCategoryIds: string[] = [];
              let remoteTransactions: any[] = [];
              let remoteCategories: any[] = [];

              if (pool) {
                // Push Categories
                for (const cat of cats) {
                  if (cat.isDeleted || cat.syncStatus === 'pending_delete') {
                    await pool.query('UPDATE "Category" SET "isDeleted" = TRUE, "updatedAt" = NOW() WHERE id = $1', [cat.id]);
                    deletedCategoryIds.push(cat.id);
                  } else {
                    await pool.query(
                      `INSERT INTO "Category" (id, "userId", name, icon, color, "isCustom", "createdAt", "updatedAt", "isDeleted")
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)
                       ON CONFLICT (id) DO UPDATE SET
                         name = EXCLUDED.name,
                         icon = EXCLUDED.icon,
                         color = EXCLUDED.color,
                         "updatedAt" = EXCLUDED."updatedAt",
                         "isDeleted" = FALSE`,
                      [cat.id, cat.userId, cat.name, cat.icon || '📁', cat.color || '#3b82f6', cat.isCustom ?? true, cat.createdAt || now, cat.updatedAt || now]
                    );
                    syncedCategoryIds.push(cat.id);
                  }
                }

                // Push Transactions
                for (const tx of txs) {
                  if (tx.isDeleted || tx.syncStatus === 'pending_delete') {
                    await pool.query('UPDATE "Transaction" SET "isDeleted" = TRUE, "updatedAt" = NOW() WHERE id = $1', [tx.id]);
                    deletedTransactionIds.push(tx.id);
                  } else {
                    await pool.query(
                      `INSERT INTO "Transaction" (
                         id, "userId", "categoryId", amount, type, description, date,
                         "mindfulTag", "emotionalMood", notes, "queueStatus", "lockedUntil",
                         "isComfortFund", "costPerUse", "estimatedUses", "createdAt", "updatedAt", "isDeleted"
                       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, FALSE)
                       ON CONFLICT (id) DO UPDATE SET
                         amount = EXCLUDED.amount,
                         type = EXCLUDED.type,
                         description = EXCLUDED.description,
                         date = EXCLUDED.date,
                         "mindfulTag" = EXCLUDED."mindfulTag",
                         "emotionalMood" = EXCLUDED."emotionalMood",
                         notes = EXCLUDED.notes,
                         "queueStatus" = EXCLUDED."queueStatus",
                         "lockedUntil" = EXCLUDED."lockedUntil",
                         "isComfortFund" = EXCLUDED."isComfortFund",
                         "costPerUse" = EXCLUDED."costPerUse",
                         "estimatedUses" = EXCLUDED."estimatedUses",
                         "updatedAt" = EXCLUDED."updatedAt",
                         "isDeleted" = FALSE`,
                      [
                        tx.id,
                        tx.userId,
                        tx.categoryId || null,
                        tx.amount,
                        tx.type || 'EXPENSE',
                        tx.description,
                        tx.date,
                        tx.mindfulTag || 'WANT',
                        tx.emotionalMood || null,
                        tx.notes || null,
                        tx.queueStatus || 'APPROVED',
                        tx.lockedUntil || null,
                        tx.isComfortFund || false,
                        tx.costPerUse || null,
                        tx.estimatedUses || null,
                        tx.createdAt || now,
                        tx.updatedAt || now,
                      ]
                    );
                    syncedTransactionIds.push(tx.id);
                  }
                }

                // Pull remote changes
                const remoteTxRes = await pool.query(
                  'SELECT * FROM "Transaction" WHERE "updatedAt" > $1 AND "isDeleted" = FALSE LIMIT 200',
                  [lastSyncTime]
                );
                remoteTransactions = remoteTxRes.rows.map((row) => ({
                  id: row.id,
                  userId: row.userId,
                  categoryId: row.categoryId,
                  amount: Number(row.amount),
                  type: row.type,
                  description: row.description,
                  date: new Date(row.date).toISOString(),
                  mindfulTag: row.mindfulTag,
                  emotionalMood: row.emotionalMood,
                  notes: row.notes,
                  queueStatus: row.queueStatus,
                  lockedUntil: row.lockedUntil ? new Date(row.lockedUntil).toISOString() : undefined,
                  isComfortFund: Boolean(row.isComfortFund),
                  costPerUse: row.costPerUse ? Number(row.costPerUse) : undefined,
                  estimatedUses: row.estimatedUses ? Number(row.estimatedUses) : undefined,
                  syncStatus: 'synced',
                  isDeleted: false,
                  createdAt: new Date(row.createdAt).toISOString(),
                  updatedAt: new Date(row.updatedAt).toISOString(),
                }));

                const remoteCatRes = await pool.query(
                  'SELECT * FROM "Category" WHERE "updatedAt" > $1 AND "isDeleted" = FALSE LIMIT 100',
                  [lastSyncTime]
                );
                remoteCategories = remoteCatRes.rows.map((row) => ({
                  id: row.id,
                  userId: row.userId,
                  name: row.name,
                  icon: row.icon,
                  color: row.color,
                  isCustom: Boolean(row.isCustom),
                  syncStatus: 'synced',
                  isDeleted: false,
                  createdAt: new Date(row.createdAt).toISOString(),
                  updatedAt: new Date(row.updatedAt).toISOString(),
                }));
              } else {
                // Fallback in-memory sync
                for (const tx of txs) {
                  if (tx.isDeleted) {
                    remoteTransactionsStore.delete(tx.id);
                    deletedTransactionIds.push(tx.id);
                  } else {
                    remoteTransactionsStore.set(tx.id, { ...tx, syncStatus: 'synced', updatedAt: now });
                    syncedTransactionIds.push(tx.id);
                  }
                }
                for (const cat of cats) {
                  if (cat.isDeleted) {
                    remoteCategoriesStore.delete(cat.id);
                    deletedCategoryIds.push(cat.id);
                  } else {
                    remoteCategoriesStore.set(cat.id, { ...cat, syncStatus: 'synced', updatedAt: now });
                    syncedCategoryIds.push(cat.id);
                  }
                }
                remoteTransactions = Array.from(remoteTransactionsStore.values());
                remoteCategories = Array.from(remoteCategoriesStore.values());
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
              console.error('API /api/sync error:', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // 4. Auth Login Endpoint
        if (req.url === '/api/auth/login' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body);
              const email = (data.email || '').toLowerCase().trim();
              let userRow: any = null;

              if (pool) {
                const resUser = await pool.query('SELECT * FROM "User" WHERE LOWER(email) = LOWER($1)', [email]);
                if (resUser.rows.length > 0) {
                  userRow = resUser.rows[0];
                }
              }

              if (userRow) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    success: true,
                    user: {
                      id: userRow.id,
                      email: userRow.email,
                      username: userRow.username,
                      comfortFundAllowance: Number(userRow.comfortFundAllowance),
                      comfortFundRemaining: Number(userRow.comfortFundRemaining),
                      comfortFundResetDate: userRow.comfortFundResetDate,
                      comfortFundUnlocked: Boolean(userRow.comfortFundUnlocked),
                      exp: Number(userRow.exp),
                      level: Number(userRow.level),
                      currentStreak: Number(userRow.currentStreak),
                      longestStreak: Number(userRow.longestStreak),
                      graceDays: Number(userRow.graceDays),
                      lastActiveDate: userRow.lastActiveDate,
                      userTimezone: userRow.userTimezone || 'Asia/Jakarta',
                      activeTheme: userRow.activeTheme || 'emerald_wealth',
                      spinnerTickets: Number(userRow.spinnerTickets ?? 3),
                      mascotName: userRow.mascotName || 'Mochi',
                      mascotAvatarUrl: userRow.mascotAvatarUrl,
                      mascotBlobKey: userRow.mascotBlobKey,
                      mascotPersonality: userRow.mascotPersonality || 'zen',
                      createdAt: userRow.createdAt,
                    },
                    token: 'token_' + Date.now(),
                  })
                );
                return;
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: true,
                  user: {
                    id: 'user-' + (email.split('@')[0] || 'member'),
                    email,
                    username: email.split('@')[0] || 'Member',
                  },
                  token: 'token_' + Date.now(),
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
          name: 'Mokaia - Mindful Money Manager',
          short_name: 'Mokaia',
          description: 'A gamified money manager and mindful expense tracker focusing on impulse control, emotional awareness, and positive financial habits.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          categories: ['finance', 'productivity', 'lifestyle'],
          icons: [
            {
              src: '/icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: '/icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: 'Log Expense',
              short_name: 'Quick Add',
              description: 'Quickly log a mindful transaction or income',
              url: '/?action=quick-add',
              icons: [{ src: '/icon.svg', sizes: '512x512' }],
            },
            {
              name: 'Cooling-Off Queue',
              short_name: 'Queue',
              description: 'Review pending impulse purchases in the holding pen',
              url: '/?action=queue',
              icons: [{ src: '/icon.svg', sizes: '512x512' }],
            },
            {
              name: 'The Reward Spinner',
              short_name: 'Spin Wheel',
              description: 'Spin for mindful treats, shields, and EXP perks',
              url: '/?action=spinner',
              icons: [{ src: '/icon.svg', sizes: '512x512' }],
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
