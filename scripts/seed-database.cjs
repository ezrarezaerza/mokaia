// scripts/seed-database.js
// Seeds Vercel Postgres and uploads realistic visual assets to Vercel Blob
// Localized for Indonesia (Kopi Kenangan, Gojek, Bibit, SCBD, Tokopedia, etc.)

const { Client } = require('pg');
const { put } = require('@vercel/blob');

const connectionString =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.PRISMA_DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: No Postgres connection string found in environment variables.');
  process.exit(1);
}

// Generate inline SVGs for Vercel Blob
function generateSvgData(label, icon, color1, color2) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color1}" />
      <stop offset="100%" stop-color="${color2}" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.25" />
    </filter>
  </defs>
  <rect width="100%" height="100%" rx="16" fill="url(#grad)" />
  <circle cx="200" cy="130" r="60" fill="rgba(255,255,255,0.15)" filter="url(#shadow)" />
  <text x="200" y="150" font-size="52" text-anchor="middle" font-family="sans-serif">${icon}</text>
  <text x="200" y="235" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" letter-spacing="0.5">${label}</text>
  <text x="200" y="260" font-size="12" fill="rgba(255,255,255,0.75)" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">Mokaia Collection Vault Verified Asset</text>
</svg>`;
}

async function uploadToBlob(filename, content) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return null;
  }
  try {
    const blob = await put(`vault/${filename}`, content, {
      access: 'private',
      contentType: 'image/svg+xml',
    });
    console.log(`Uploaded to Vercel Blob: ${filename} -> ${blob.url}`);
    return blob.url;
  } catch (err) {
    console.warn(`Blob upload warning for ${filename}:`, err.message);
    return null;
  }
}

async function runSeed() {
  console.log('Connecting to Vercel Postgres...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Postgres connected successfully!');

  // 1. Initialize Tables (matching Prisma schema)
  console.log('Ensuring Postgres database schema...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS "User" (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(255) NOT NULL,
      "passwordHash" VARCHAR(255) DEFAULT '',
      "comfortFundAllowance" DECIMAL(10, 2) DEFAULT 500000.00,
      "comfortFundRemaining" DECIMAL(10, 2) DEFAULT 335000.00,
      "comfortFundResetDate" TIMESTAMPTZ DEFAULT NOW(),
      "comfortFundUnlocked" BOOLEAN DEFAULT FALSE,
      exp INTEGER DEFAULT 2940,
      level INTEGER DEFAULT 8,
      "currentStreak" INTEGER DEFAULT 18,
      "longestStreak" INTEGER DEFAULT 28,
      "graceDays" INTEGER DEFAULT 2,
      "lastActiveDate" VARCHAR(30) DEFAULT '2026-09-11',
      "userTimezone" VARCHAR(100) DEFAULT 'Asia/Jakarta',
      "activeTheme" VARCHAR(100) DEFAULT 'emerald_wealth',
      "spinnerTickets" INTEGER DEFAULT 3,
      "mascotName" VARCHAR(100) DEFAULT 'Mochi',
      "mascotAvatarUrl" TEXT,
      "mascotBlobKey" TEXT,
      "mascotPersonality" VARCHAR(50) DEFAULT 'zen',
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "isDeleted" BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS "Category" (
      id VARCHAR(64) PRIMARY KEY,
      "userId" VARCHAR(64) REFERENCES "User"(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      icon VARCHAR(50) DEFAULT '📁',
      color VARCHAR(50) DEFAULT '#3b82f6',
      "isCustom" BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "isDeleted" BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS "Transaction" (
      id VARCHAR(64) PRIMARY KEY,
      "userId" VARCHAR(64) REFERENCES "User"(id) ON DELETE CASCADE,
      "categoryId" VARCHAR(64) REFERENCES "Category"(id) ON DELETE SET NULL,
      amount DECIMAL(12, 2) NOT NULL,
      type VARCHAR(20) DEFAULT 'EXPENSE',
      description TEXT NOT NULL,
      date TIMESTAMPTZ NOT NULL,
      "mindfulTag" VARCHAR(20) DEFAULT 'WANT',
      "emotionalMood" VARCHAR(30),
      notes TEXT,
      "queueStatus" VARCHAR(20) DEFAULT 'ACTIVE',
      "lockedUntil" TIMESTAMPTZ,
      "isComfortFund" BOOLEAN DEFAULT FALSE,
      "costPerUse" DECIMAL(10, 2),
      "estimatedUses" INTEGER,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "isDeleted" BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS "RewardInventory" (
      id VARCHAR(64) PRIMARY KEY,
      "userId" VARCHAR(64) REFERENCES "User"(id) ON DELETE CASCADE,
      "rewardType" VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      icon VARCHAR(50) DEFAULT '🎁',
      "rewardValue" TEXT,
      status VARCHAR(20) DEFAULT 'UNCLAIMED',
      "claimedAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "isDeleted" BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS "CollectionVaultItem" (
      id VARCHAR(64) PRIMARY KEY,
      "userId" VARCHAR(64) REFERENCES "User"(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      "purchasePrice" DECIMAL(12, 2) NOT NULL,
      category VARCHAR(100) DEFAULT 'General',
      "photoUrl" TEXT NOT NULL,
      "blobKey" TEXT,
      notes TEXT,
      "acquisitionDate" TIMESTAMPTZ DEFAULT NOW(),
      "estimatedUses" INTEGER DEFAULT 100,
      "currentUses" INTEGER DEFAULT 1,
      "costPerUse" DECIMAL(10, 2),
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "isDeleted" BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS "TimelineFund" (
      id VARCHAR(64) PRIMARY KEY,
      "userId" VARCHAR(64) REFERENCES "User"(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      icon VARCHAR(50) DEFAULT '🎯',
      "targetAmount" DECIMAL(12, 2) NOT NULL,
      "currentAmount" DECIMAL(12, 2) DEFAULT 0.00,
      "targetDate" TIMESTAMPTZ NOT NULL,
      "categoryTag" VARCHAR(100) DEFAULT 'Goal',
      "isCompleted" BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "isDeleted" BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS "TimelineAllocation" (
      id VARCHAR(64) PRIMARY KEY,
      "fundId" VARCHAR(64) REFERENCES "TimelineFund"(id) ON DELETE CASCADE,
      amount DECIMAL(12, 2) NOT NULL,
      source VARCHAR(50) DEFAULT 'DIRECT',
      note TEXT,
      "allocatedAt" TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "ExpEvent" (
      id VARCHAR(64) PRIMARY KEY,
      "userId" VARCHAR(64) REFERENCES "User"(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      reason VARCHAR(255) NOT NULL,
      "categoryTag" VARCHAR(50) NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "Debt" (
      id VARCHAR(64) PRIMARY KEY,
      "userId" VARCHAR(64) REFERENCES "User"(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      "debtType" VARCHAR(50) NOT NULL,
      "totalAmount" DECIMAL(12, 2) NOT NULL,
      "remainingBalance" DECIMAL(12, 2) NOT NULL,
      "interestRate" DECIMAL(5, 2) DEFAULT 0.00,
      "minimumPayment" DECIMAL(12, 2) DEFAULT 0.00,
      "counterpartyName" VARCHAR(255),
      "dueDate" VARCHAR(50),
      frequency VARCHAR(50) DEFAULT 'MONTHLY',
      "installmentCount" INTEGER,
      "installmentsPaid" INTEGER DEFAULT 0,
      notes TEXT,
      status VARCHAR(20) DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "isDeleted" BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS "DebtPayment" (
      id VARCHAR(64) PRIMARY KEY,
      "debtId" VARCHAR(64) REFERENCES "Debt"(id) ON DELETE CASCADE,
      "userId" VARCHAR(64) REFERENCES "User"(id) ON DELETE CASCADE,
      amount DECIMAL(12, 2) NOT NULL,
      "principalAmount" DECIMAL(12, 2),
      "interestAmount" DECIMAL(12, 2),
      "paymentDate" TIMESTAMPTZ DEFAULT NOW(),
      notes TEXT,
      "syncedToLedger" BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log('Tables verified.');

  // 2. Upload Visual Assets to Vercel Blob
  console.log('Uploading visual assets to Vercel Blob...');
  const macbookSvg = generateSvgData('MacBook Pro 14 M3', '💻', '#0f172a', '#1e293b');
  const asicsSvg = generateSvgData('Asics Novablast 4', '👟', '#0284c7', '#0369a1');
  const keychronSvg = generateSvgData('Keychron Q1 Pro', '⌨️', '#4f46e5', '#3730a3');
  const sonySvg = generateSvgData('Sony WH-1000XM5', '🎧', '#18181b', '#27272a');
  const chairSvg = generateSvgData('Pexio Regent Ergonomic', '🪑', '#0d9488', '#0f766e');
  const mascotSvg = generateSvgData('Mochi Zen Mascot', '🎋', '#059669', '#10b981');

  const macbookBlobUrl = await uploadToBlob('macbook-pro.svg', macbookSvg);
  const asicsBlobUrl = await uploadToBlob('asics-novablast.svg', asicsSvg);
  const keychronBlobUrl = await uploadToBlob('keychron-q1.svg', keychronSvg);
  const sonyBlobUrl = await uploadToBlob('sony-headphones.svg', sonySvg);
  const chairBlobUrl = await uploadToBlob('pexio-chair.svg', chairSvg);
  const mascotBlobUrl = await uploadToBlob('mochi-zen.svg', mascotSvg);

  const demoUserEmail = 'ezrarezaerza@gmail.com';
  // Check if user already exists
  const userCheck = await client.query('SELECT id FROM "User" WHERE email = $1', [demoUserEmail]);
  let demoUserId = userCheck.rows.length > 0 ? userCheck.rows[0].id : 'user-ezrarezaerza';

  console.log(`Seeding demo user (${demoUserEmail}) with ID: ${demoUserId}...`);

  // Clean existing demo data for fresh seed if user exists
  await client.query('DELETE FROM "DebtPayment" WHERE "userId" = $1', [demoUserId]);
  await client.query('DELETE FROM "Debt" WHERE "userId" = $1', [demoUserId]);
  await client.query('DELETE FROM "TimelineAllocation" WHERE "fundId" IN (SELECT id FROM "TimelineFund" WHERE "userId" = $1)', [demoUserId]);
  await client.query('DELETE FROM "TimelineFund" WHERE "userId" = $1', [demoUserId]);
  await client.query('DELETE FROM "CollectionVaultItem" WHERE "userId" = $1', [demoUserId]);
  await client.query('DELETE FROM "RewardInventory" WHERE "userId" = $1', [demoUserId]);
  await client.query('DELETE FROM "ExpEvent" WHERE "userId" = $1', [demoUserId]);
  await client.query('DELETE FROM "Transaction" WHERE "userId" = $1', [demoUserId]);
  await client.query('DELETE FROM "Category" WHERE "userId" = $1', [demoUserId]);
  await client.query('DELETE FROM "User" WHERE id = $1', [demoUserId]);

  // Insert User
  await client.query(
    `INSERT INTO "User" (
      id, email, username, "comfortFundAllowance", "comfortFundRemaining",
      "comfortFundResetDate", "comfortFundUnlocked", exp, level,
      "currentStreak", "longestStreak", "graceDays", "lastActiveDate",
      "userTimezone", "activeTheme", "spinnerTickets", "mascotName",
      "mascotAvatarUrl", "mascotBlobKey", "mascotPersonality"
    ) VALUES (
      $1, $2, $3, $4, $5, NOW(), FALSE, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
    )`,
    [
      demoUserId,
      demoUserEmail,
      'Ezra Reza',
      500000,
      335000,
      2940,
      8,
      18,
      28,
      2,
      '2026-09-11',
      'Asia/Jakarta',
      'emerald_wealth',
      3,
      'Mochi',
      mascotBlobUrl || `data:image/svg+xml;utf8,${encodeURIComponent(mascotSvg)}`,
      'vault/mochi-zen.svg',
      'zen',
    ]
  );

  // 3. Insert Categories
  console.log('Seeding Indonesian categories...');
  const catMap = {
    kopi: { id: `cat-${demoUserId}-kopi`, name: 'Kopi & Nongkrong', icon: '☕', color: '#f59e0b' },
    makan: { id: `cat-${demoUserId}-makan`, name: 'Makan & Kuliner', icon: '🍜', color: '#ef4444' },
    transport: { id: `cat-${demoUserId}-transport`, name: 'Transportasi & Ojol', icon: '🚗', color: '#10b981' },
    belanja: { id: `cat-${demoUserId}-belanja`, name: 'Belanja & Supermarket', icon: '🛒', color: '#3b82f6' },
    tagihan: { id: `cat-${demoUserId}-tagihan`, name: 'Tagihan & Utilitas', icon: '💡', color: '#8b5cf6' },
    gadget: { id: `cat-${demoUserId}-gadget`, name: 'Gadget & Setup Kerja', icon: '💻', color: '#06b6d4' },
    kesehatan: { id: `cat-${demoUserId}-kesehatan`, name: 'Kesehatan & Self-Care', icon: '🩺', color: '#ec4899' },
    investasi: { id: `cat-${demoUserId}-investasi`, name: 'Investasi & Tabungan', icon: '📈', color: '#14b8a6' },
    sosial: { id: `cat-${demoUserId}-sosial`, name: 'Hadiah & Sosial', icon: '🎁', color: '#f97316' },
    gaji: { id: `cat-${demoUserId}-gaji`, name: 'Gaji & Pendapatan', icon: '💰', color: '#22c55e' },
  };

  for (const c of Object.values(catMap)) {
    await client.query(
      `INSERT INTO "Category" (id, "userId", name, icon, color, "isCustom") VALUES ($1, $2, $3, $4, $5, TRUE)`,
      [c.id, demoUserId, c.name, c.icon, c.color]
    );
  }

  // 4. Insert Realistic Multi-Month Transactions (June, July, August, September 2026)
  console.log('Seeding Indonesian multi-month transactions...');
  const transactions = [
    // --- SEPTEMBER 2026 (Current Month) ---
    {
      desc: 'Gaji Pokok PT Teknologi Nusantara (Tech Unicorn)',
      amount: 22500000,
      type: 'INCOME',
      cat: catMap.gaji.id,
      date: '2026-09-01T09:00:00.000Z',
      mindful: 'SAVING',
      mood: 'CALM',
      notes: 'Transfer payroll bulanan direct deposit Bank BCA.',
    },
    {
      desc: 'Side Gig: UI/UX Redesign Design Sprint (Freelance)',
      amount: 6500000,
      type: 'INCOME',
      cat: catMap.gaji.id,
      date: '2026-09-05T14:30:00.000Z',
      mindful: 'SAVING',
      mood: 'CELEBRATING',
      notes: 'Pelunasan milestone 2 delivery wireframe & figma design system.',
    },
    {
      desc: 'Investasi Bibit Reksa Dana Pasar Uang & Obligasi SBN',
      amount: 5000000,
      type: 'EXPENSE',
      cat: catMap.investasi.id,
      date: '2026-09-02T10:15:00.000Z',
      mindful: 'INVESTMENT',
      mood: 'CALM',
      notes: 'Rutin awal bulan robo-advisor portofolio konservatif moderat.',
    },
    {
      desc: 'Bank Jago Kantong Dana Darurat (Sinking Fund)',
      amount: 2000000,
      type: 'EXPENSE',
      cat: catMap.investasi.id,
      date: '2026-09-02T11:00:00.000Z',
      mindful: 'SAVING',
      mood: 'CALM',
      notes: 'Autodebet tabungan bunga 5% p.a. dana darurat likuid.',
    },
    {
      desc: 'Tagihan Listrik PLN Pascabayar & Biznet Home 150Mbps',
      amount: 1165000,
      type: 'EXPENSE',
      cat: catMap.tagihan.id,
      date: '2026-09-03T13:20:00.000Z',
      mindful: 'NEED',
      mood: 'CALM',
      notes: 'Listrik Rp 750.000 + Fiber Biznet Rp 415.000.',
    },
    {
      desc: 'Belanja Bulanan GrandLucky SCBD (Bahan Makanan Sehat)',
      amount: 1850000,
      type: 'EXPENSE',
      cat: catMap.belanja.id,
      date: '2026-09-04T16:45:00.000Z',
      mindful: 'NEED',
      mood: 'CALM',
      notes: 'Beras organik, susu oat Barista, dada ayam fillet, buah apel & alpukat.',
    },
    {
      desc: 'Kopi Kenangan Mantan Large + Roti Daging Asap',
      amount: 38000,
      type: 'EXPENSE',
      cat: catMap.kopi.id,
      date: '2026-09-06T08:30:00.000Z',
      mindful: 'WANT',
      mood: 'TREAT_MYSELF',
      notes: 'Beli lewat aplikasi Kopi Kenangan pick-up di outlet Menara Astra.',
    },
    {
      desc: 'Gojek GoRide ke Stasiun MRT Dukuh Atas PP',
      amount: 32000,
      type: 'EXPENSE',
      cat: catMap.transport.id,
      date: '2026-09-07T07:45:00.000Z',
      mindful: 'NEED',
      mood: 'CALM',
      notes: 'Komuter harian menuju kantor SCBD.',
    },
    {
      desc: 'Makan Siang Nasi Padang Sederhana (Ayam Pop + Rendang)',
      amount: 52000,
      type: 'EXPENSE',
      cat: catMap.makan.id,
      date: '2026-09-07T12:15:00.000Z',
      mindful: 'NEED',
      mood: 'CALM',
      notes: 'Makan siang bareng rekan tim produk tech.',
    },
    {
      desc: 'Fore Coffee Butterscotch Sea Salt Latte',
      amount: 35000,
      type: 'EXPENSE',
      cat: catMap.kopi.id,
      date: '2026-09-08T15:10:00.000Z',
      mindful: 'WANT',
      mood: 'BORED',
      notes: 'Suntuk pas afternoon slump jam 3 sore.',
    },
    {
      desc: 'Boba Chatime Roasted Milk Tea (Lembur Closing Sprint)',
      amount: 32000,
      type: 'EXPENSE',
      cat: catMap.kopi.id,
      date: '2026-09-09T20:45:00.000Z',
      mindful: 'WANT',
      mood: 'STRESSED',
      notes: 'Bug hunting deployment malam, butuh asupan gula.',
    },
    {
      desc: 'Pijat Refleksi Meiso 90 Menit (Stress Relief)',
      amount: 165000,
      type: 'EXPENSE',
      cat: catMap.kesehatan.id,
      date: '2026-09-10T19:00:00.000Z',
      mindful: 'WANT',
      mood: 'STRESSED',
      isComfort: true,
      notes: 'Comfort Fund Unlocked! Badan remuk setelah marathon meeting & sprint.',
    },
    {
      desc: 'Makan Malam Sushi Tei bareng Sahabat (Celebration)',
      amount: 310000,
      type: 'EXPENSE',
      cat: catMap.makan.id,
      date: '2026-09-11T19:30:00.000Z',
      mindful: 'WANT',
      mood: 'CELEBRATING',
      notes: 'Merayakan rilis v2.0 di App Store.',
    },

    // --- AUGUST 2026 ---
    {
      desc: 'Gaji Pokok PT Teknologi Nusantara',
      amount: 22500000,
      type: 'INCOME',
      cat: catMap.gaji.id,
      date: '2026-08-01T09:00:00.000Z',
      mindful: 'SAVING',
      mood: 'CALM',
    },
    {
      desc: 'Investasi Saham BBCA & Reksa Dana Bibit',
      amount: 5000000,
      type: 'EXPENSE',
      cat: catMap.investasi.id,
      date: '2026-08-02T10:00:00.000Z',
      mindful: 'INVESTMENT',
      mood: 'CALM',
    },
    {
      desc: 'Alokasi Dana Darurat Bank Jago',
      amount: 2000000,
      type: 'EXPENSE',
      cat: catMap.investasi.id,
      date: '2026-08-02T10:30:00.000Z',
      mindful: 'SAVING',
      mood: 'CALM',
    },
    {
      desc: 'Belanja Superindo Mampang & GrandLucky',
      amount: 2150000,
      type: 'EXPENSE',
      cat: catMap.belanja.id,
      date: '2026-08-05T17:00:00.000Z',
      mindful: 'NEED',
      mood: 'CALM',
    },
    {
      desc: 'Tiket Kereta Cepat Whoosh Jakarta - Bandung PP',
      amount: 500000,
      type: 'EXPENSE',
      cat: catMap.transport.id,
      date: '2026-08-15T08:00:00.000Z',
      mindful: 'WANT',
      mood: 'CELEBRATING',
      notes: 'Weekend trip refreshing ke Dago Heritage bareng teman.',
    },
    {
      desc: 'Kado Ulang Tahun Ibu Batik Danar Hadi Sutra',
      amount: 850000,
      type: 'EXPENSE',
      cat: catMap.sosial.id,
      date: '2026-08-18T14:20:00.000Z',
      mindful: 'WANT',
      mood: 'CELEBRATING',
      notes: 'Hadiah istimewa ulang tahun Ibu tercinta.',
    },
    {
      desc: 'Flash Sale Shopee 8.8 Skincare Somethinc & Sunscreen',
      amount: 285000,
      type: 'EXPENSE',
      cat: catMap.belanja.id,
      date: '2026-08-08T00:15:00.000Z',
      mindful: 'WANT',
      mood: 'FOMO',
      notes: 'Terpancing voucher diskon tengah malam.',
    },
    {
      desc: 'Midnight Snack McD Drive-thru via GoFood',
      amount: 92000,
      type: 'EXPENSE',
      cat: catMap.makan.id,
      date: '2026-08-22T23:45:00.000Z',
      mindful: 'WANT',
      mood: 'STRESSED',
      notes: 'Emotional binge eating setelah begadang migrasi server.',
    },
    {
      desc: 'Janji Jiwa Toast & Kopi Susu Senja',
      amount: 42000,
      type: 'EXPENSE',
      cat: catMap.kopi.id,
      date: '2026-08-25T16:00:00.000Z',
      mindful: 'WANT',
      mood: 'TREAT_MYSELF',
    },

    // --- JULY 2026 ---
    {
      desc: 'Gaji Pokok PT Teknologi Nusantara',
      amount: 22500000,
      type: 'INCOME',
      cat: catMap.gaji.id,
      date: '2026-07-01T09:00:00.000Z',
      mindful: 'SAVING',
      mood: 'CALM',
    },
    {
      desc: 'Bonus Kinerja Kuartal 2 (Performance Bonus)',
      amount: 8000000,
      type: 'INCOME',
      cat: catMap.gaji.id,
      date: '2026-07-10T11:00:00.000Z',
      mindful: 'SAVING',
      mood: 'CELEBRATING',
      notes: 'Bonus rating Exceeds Expectations kuartal kedua.',
    },
    {
      desc: 'Investasi Top-Up Reksadana Bibit & ORI025',
      amount: 6000000,
      type: 'EXPENSE',
      cat: catMap.investasi.id,
      date: '2026-07-12T13:00:00.000Z',
      mindful: 'INVESTMENT',
      mood: 'CALM',
    },
    {
      desc: 'Tagihan Asuransi Prudential & BPJS Kesehatan',
      amount: 1000000,
      type: 'EXPENSE',
      cat: catMap.tagihan.id,
      date: '2026-07-05T09:30:00.000Z',
      mindful: 'NEED',
      mood: 'CALM',
    },
    {
      desc: 'Beli Mechanical Keyboard Keychron Q1 Pro',
      amount: 2850000,
      type: 'EXPENSE',
      cat: catMap.gadget.id,
      date: '2026-07-15T15:30:00.000Z',
      mindful: 'WANT',
      mood: 'CALM',
      notes: 'Investasi perlengkapan coding WFH nyaman (Masuk Collection Vault).',
    },
    {
      desc: 'Warung SS Spesial Sambal (Makan Siang Bareng Tim)',
      amount: 78000,
      type: 'EXPENSE',
      cat: catMap.makan.id,
      date: '2026-07-20T12:30:00.000Z',
      mindful: 'NEED',
      mood: 'CALM',
    },

    // --- JUNE 2026 ---
    {
      desc: 'Gaji Pokok PT Teknologi Nusantara',
      amount: 22500000,
      type: 'INCOME',
      cat: catMap.gaji.id,
      date: '2026-06-01T09:00:00.000Z',
      mindful: 'SAVING',
      mood: 'CALM',
    },
    {
      desc: 'Alokasi Tabungan Liburan Labuan Bajo',
      amount: 3500000,
      type: 'EXPENSE',
      cat: catMap.investasi.id,
      date: '2026-06-05T10:00:00.000Z',
      mindful: 'SAVING',
      mood: 'CALM',
    },
    {
      desc: 'Nonton Bioskop XXI Senayan City (Tiket IMAX & Popcorn)',
      amount: 135000,
      type: 'EXPENSE',
      cat: catMap.makan.id,
      date: '2026-06-14T19:00:00.000Z',
      mindful: 'WANT',
      mood: 'CELEBRATING',
    },
    {
      desc: 'Tebus Obat & Konsultasi Dokter Halodoc',
      amount: 215000,
      type: 'EXPENSE',
      cat: catMap.kesehatan.id,
      date: '2026-06-25T11:00:00.000Z',
      mindful: 'NEED',
      mood: 'CALM',
    },
  ];

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    const txId = `tx-demo-${i + 1}`;
    await client.query(
      `INSERT INTO "Transaction" (
        id, "userId", "categoryId", amount, type, description, date,
        "mindfulTag", "emotionalMood", notes, "queueStatus", "isComfortFund", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'APPROVED', $11, $7)`,
      [
        txId,
        demoUserId,
        t.cat,
        t.amount,
        t.type,
        t.desc,
        t.date,
        t.mindful,
        t.mood || null,
        t.notes || null,
        t.isComfort || false,
      ]
    );
  }

  // 5. Insert The Cooling-Off Queue Holding Pen Items (Active, Rejected Victories, Approved)
  console.log('Seeding Cooling-Off Queue impulse management items...');
  const coolingItems = [
    {
      id: `queue-${demoUserId}-active`,
      desc: 'Sneakers Compass Gazelle Low Retro Blue',
      amount: 538000,
      cat: catMap.belanja.id,
      queueStatus: 'ACTIVE',
      lockedUntil: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
      mood: 'FOMO',
      notes: 'Lihat teman kantor pakai, kelihatan bagus banget. Menunggu 48 jam holding pen apakah beneran butuh atau cuma FOMO sesaat.',
      date: new Date().toISOString(),
    },
    {
      id: `queue-${demoUserId}-rejected-1`,
      desc: 'AirPods Max Pink Secondhand mulus di OLX',
      amount: 6200000,
      cat: catMap.gadget.id,
      queueStatus: 'REJECTED',
      lockedUntil: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      mood: 'FOMO',
      notes: 'Kemenangan Kontrol Diri! Setelah jeda 48 jam, sadar kalau Sony WH-1000XM5 yang dimiliki masih sangat prima dan noise cancelling-nya lebih nyaman. Berhasil menghemat Rp 6.200.000!',
      date: '2026-08-20T14:00:00.000Z',
    },
    {
      id: `queue-${demoUserId}-rejected-2`,
      desc: 'Jacket Puffer Uniqlo U Diskon Tengah Malam',
      amount: 1190000,
      cat: catMap.belanja.id,
      queueStatus: 'REJECTED',
      lockedUntil: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      mood: 'BORED',
      notes: 'Kemenangan Kontrol Diri! Impuls belanja online tengah malam karena gabut. Jakarta tropis dan di lemari masih ada 2 jaket windbreaker yang jarang dipakai.',
      date: '2026-07-28T01:30:00.000Z',
    },
    {
      id: `queue-${demoUserId}-approved-1`,
      desc: 'Kindle Paperwhite 11th Gen 16GB (E-Reader)',
      amount: 2250000,
      cat: catMap.gadget.id,
      queueStatus: 'APPROVED',
      lockedUntil: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
      mood: 'CALM',
      notes: 'Keputusan Sadar: Dievaluasi setelah 48 jam holding pen. Terbukti sangat bermanfaat untuk membaca buku non-fiksi tanpa distraksi notifikasi HP.',
      date: '2026-08-10T11:00:00.000Z',
    },
  ];

  for (const item of coolingItems) {
    await client.query(
      `INSERT INTO "Transaction" (
        id, "userId", "categoryId", amount, type, description, date,
        "mindfulTag", "emotionalMood", notes, "queueStatus", "lockedUntil", "createdAt"
      ) VALUES ($1, $2, $3, $4, 'EXPENSE', $5, $6, 'WANT', $7, $8, $9, $10, $6)`,
      [
        item.id,
        demoUserId,
        item.cat,
        item.amount,
        item.desc,
        item.date,
        item.mood,
        item.notes,
        item.queueStatus,
        item.lockedUntil,
      ]
    );
  }

  // 6. Insert Collection Vault Items (with real Blob URLs or SVG fallbacks)
  console.log('Seeding Collection Vault items with cost-per-use tracking...');
  const vaultItems = [
    {
      id: `vault-${demoUserId}-macbook`,
      name: 'MacBook Pro 14 M3 (Space Black)',
      purchasePrice: 28500000,
      category: 'Electronics',
      photoUrl: macbookBlobUrl || `data:image/svg+xml;utf8,${encodeURIComponent(macbookSvg)}`,
      blobKey: 'vault/macbook-pro.svg',
      notes: 'Mesin kerja utama software engineering & UI/UX design. Digunakan setiap hari kerja.',
      acquisitionDate: '2025-10-15T00:00:00.000Z',
      currentUses: 240,
      estimatedUses: 900,
      costPerUse: 118750.0,
    },
    {
      id: `vault-${demoUserId}-asics`,
      name: 'Sepatu Lari Asics Novablast 4',
      purchasePrice: 2399000,
      category: 'Footwear',
      photoUrl: asicsBlobUrl || `data:image/svg+xml;utf8,${encodeURIComponent(asicsSvg)}`,
      blobKey: 'vault/asics-novablast.svg',
      notes: 'Sepatu lari harian pagi di GBK Senayan & persiapan Half Marathon.',
      acquisitionDate: '2026-03-10T00:00:00.000Z',
      currentUses: 56,
      estimatedUses: 120,
      costPerUse: 42839.0,
    },
    {
      id: `vault-${demoUserId}-keychron`,
      name: 'Mechanical Keyboard Keychron Q1 Pro',
      purchasePrice: 2850000,
      category: 'Workstation',
      photoUrl: keychronBlobUrl || `data:image/svg+xml;utf8,${encodeURIComponent(keychronSvg)}`,
      blobKey: 'vault/keychron-q1.svg',
      notes: 'Custom keyboard full aluminium, typing experience empuk untuk ngetik seharian.',
      acquisitionDate: '2026-02-01T00:00:00.000Z',
      currentUses: 160,
      estimatedUses: 500,
      costPerUse: 17812.0,
    },
    {
      id: `vault-${demoUserId}-sony`,
      name: 'Sony WH-1000XM5 ANC Headphones',
      purchasePrice: 4999000,
      category: 'Audio',
      photoUrl: sonyBlobUrl || `data:image/svg+xml;utf8,${encodeURIComponent(sonySvg)}`,
      blobKey: 'vault/sony-headphones.svg',
      notes: 'Fokus kerja di cafe & isolasi suara bising saat komuter naik MRT.',
      acquisitionDate: '2026-01-20T00:00:00.000Z',
      currentUses: 185,
      estimatedUses: 600,
      costPerUse: 27021.0,
    },
    {
      id: `vault-${demoUserId}-chair`,
      name: 'Ergonomic Mesh Chair Pexio Regent',
      purchasePrice: 3600000,
      category: 'Furniture',
      photoUrl: chairBlobUrl || `data:image/svg+xml;utf8,${encodeURIComponent(chairSvg)}`,
      blobKey: 'vault/pexio-chair.svg',
      notes: 'Menyelamatkan pinggang dan postur tubuh selama WFH.',
      acquisitionDate: '2025-11-05T00:00:00.000Z',
      currentUses: 210,
      estimatedUses: 800,
      costPerUse: 17142.0,
    },
  ];

  for (const v of vaultItems) {
    await client.query(
      `INSERT INTO "CollectionVaultItem" (
        id, "userId", name, "purchasePrice", category, "photoUrl", "blobKey",
        notes, "acquisitionDate", "estimatedUses", "currentUses", "costPerUse"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        v.id,
        demoUserId,
        v.name,
        v.purchasePrice,
        v.category,
        v.photoUrl,
        v.blobKey,
        v.notes,
        v.acquisitionDate,
        v.estimatedUses,
        v.currentUses,
        v.costPerUse,
      ]
    );
  }

  // 7. Insert Timeline Funds (Date-bound sinking funds)
  console.log('Seeding Timeline Funds with allocations...');
  const funds = [
    {
      id: `fund-${demoUserId}-labuan-bajo`,
      title: 'Liburan Labuan Bajo & Pulau Komodo',
      description: 'Tiket pesawat Garuda PP, liveaboard phinisi 3D2N, diving, dan penginapan.',
      icon: '✈️',
      targetAmount: 18000000,
      currentAmount: 13500000,
      targetDate: '2026-11-20T00:00:00.000Z',
      categoryTag: 'Travel',
      isCompleted: false,
      allocations: [
        { amount: 3500000, date: '2026-06-05T10:00:00.000Z', note: 'Alokasi tabungan bulan Juni' },
        { amount: 3500000, date: '2026-07-05T10:00:00.000Z', note: 'Alokasi tabungan bulan Juli' },
        { amount: 3500000, date: '2026-08-05T10:00:00.000Z', note: 'Alokasi tabungan bulan Agustus' },
        { amount: 3000000, date: '2026-09-05T10:00:00.000Z', note: 'Sebagian fee freelance project' },
      ],
    },
    {
      id: `fund-${demoUserId}-emergency`,
      title: 'Dana Darurat 6 Bulan (Bank Jago)',
      description: 'Target safety net 6 bulan biaya hidup dasar (~Rp 7.500.000/bulan).',
      icon: '🛡️',
      targetAmount: 45000000,
      currentAmount: 36000000,
      targetDate: '2026-12-31T00:00:00.000Z',
      categoryTag: 'Security',
      isCompleted: false,
      allocations: [
        { amount: 15000000, date: '2026-05-01T00:00:00.000Z', note: 'Modal awal tabungan' },
        { amount: 7000000, date: '2026-06-02T00:00:00.000Z', note: 'Alokasi tabungan Juni' },
        { amount: 7000000, date: '2026-07-02T00:00:00.000Z', note: 'Alokasi tabungan Juli' },
        { amount: 7000000, date: '2026-08-02T00:00:00.000Z', note: 'Alokasi tabungan Agustus' },
      ],
    },
    {
      id: `fund-${demoUserId}-monitor`,
      title: 'Upgrade Setup Monitor 4K Dell UltraSharp',
      description: 'Monitor USB-C 27 inch 4K color accurate untuk desain dan coding.',
      icon: '💻',
      targetAmount: 10500000,
      currentAmount: 10500000,
      targetDate: '2026-08-30T00:00:00.000Z',
      categoryTag: 'Workstation',
      isCompleted: true,
      allocations: [
        { amount: 5000000, date: '2026-07-15T00:00:00.000Z', note: 'Bonus kuartal 2' },
        { amount: 5500000, date: '2026-08-25T00:00:00.000Z', note: 'Pelunasan dari sisa tabungan WFH' },
      ],
    },
    {
      id: `fund-${demoUserId}-house-dp`,
      title: 'DP Rumah Impian BSD City',
      description: 'Sinking fund jangka panjang untuk uang muka rumah pertama.',
      icon: '🏠',
      targetAmount: 120000000,
      currentAmount: 32500000,
      targetDate: '2027-12-31T00:00:00.000Z',
      categoryTag: 'Milestone',
      isCompleted: false,
      allocations: [
        { amount: 20000000, date: '2026-01-01T00:00:00.000Z', note: 'Tabungan awal tahun' },
        { amount: 6250000, date: '2026-04-15T00:00:00.000Z', note: 'THR Lebaran 2026' },
        { amount: 6250000, date: '2026-07-15T00:00:00.000Z', note: 'Bonus semester 1' },
      ],
    },
  ];

  for (const f of funds) {
    await client.query(
      `INSERT INTO "TimelineFund" (
        id, "userId", title, description, icon, "targetAmount", "currentAmount",
        "targetDate", "categoryTag", "isCompleted"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        f.id,
        demoUserId,
        f.title,
        f.description,
        f.icon,
        f.targetAmount,
        f.currentAmount,
        f.targetDate,
        f.categoryTag,
        f.isCompleted,
      ]
    );

    for (let j = 0; j < f.allocations.length; j++) {
      const a = f.allocations[j];
      await client.query(
        `INSERT INTO "TimelineAllocation" (id, "fundId", amount, source, note, "allocatedAt")
         VALUES ($1, $2, $3, 'DIRECT', $4, $5)`,
        [`alloc-${f.id}-${j + 1}`, f.id, a.amount, a.note, a.date]
      );
    }
  }

  // 8. Insert Phase 5 Debts & Liabilities Command Center
  console.log('Seeding Debt Command Center liabilities, IOUs, and payment history...');
  const debts = [
    {
      id: `debt-${demoUserId}-spaylater`,
      name: 'SPayLater - Cicilan Smart TV Samsung 43 Inch',
      debtType: 'BNPL',
      totalAmount: 4400000,
      remainingBalance: 1100000,
      interestRate: 0.0,
      minimumPayment: 1100000,
      counterpartyName: 'ShopeePayLater',
      dueDate: '2026-09-25',
      frequency: 'MONTHLY',
      installmentCount: 4,
      installmentsPaid: 3,
      notes: 'Cicilan 4x 0% bunga untuk ruang santai keluarga. Tinggal 1 cicilan terakhir!',
      status: 'ACTIVE',
    },
    {
      id: `debt-${demoUserId}-gopaylater`,
      name: 'GoPay Later - Belanja Tokopedia Elektronik',
      debtType: 'BNPL',
      totalAmount: 1800000,
      remainingBalance: 600000,
      interestRate: 0.0,
      minimumPayment: 600000,
      counterpartyName: 'GoTo Financial',
      dueDate: '2026-09-30',
      frequency: 'MONTHLY',
      installmentCount: 3,
      installmentsPaid: 2,
      notes: 'Cicilan 3x bayar akhir bulan.',
      status: 'ACTIVE',
    },
    {
      id: `debt-${demoUserId}-bca-card`,
      name: 'BCA Card Platinum - Tagihan Tiket & Hotel',
      debtType: 'CREDIT_CARD',
      totalAmount: 6500000,
      remainingBalance: 4200000,
      interestRate: 21.0,
      minimumPayment: 420000,
      counterpartyName: 'Bank Central Asia',
      dueDate: '2026-09-18',
      frequency: 'MONTHLY',
      installmentCount: null,
      installmentsPaid: 2,
      notes: 'Kartu kredit transaksi liburan. Ditargetkan lunas via strategi Avalanche bulan depan.',
      status: 'ACTIVE',
    },
    {
      id: `debt-${demoUserId}-iou-budi`,
      name: 'Talangan Tiket Konser Coldplay (Budi)',
      debtType: 'IOU_RECEIVABLE',
      totalAmount: 1500000,
      remainingBalance: 1500000,
      interestRate: 0.0,
      minimumPayment: 1500000,
      counterpartyName: 'Budi Santoso',
      dueDate: '2026-09-26',
      frequency: 'ONE_OFF',
      installmentCount: 1,
      installmentsPaid: 0,
      notes: 'Budi janji transfer balik pas gajian tanggal 25 September.',
      status: 'ACTIVE',
    },
    {
      id: `debt-${demoUserId}-iou-rian`,
      name: 'Hutang Patungan Sewa Villa Bali (Rian)',
      debtType: 'IOU_OWED',
      totalAmount: 750000,
      remainingBalance: 750000,
      interestRate: 0.0,
      minimumPayment: 750000,
      counterpartyName: 'Rian Pratama',
      dueDate: '2026-09-20',
      frequency: 'ONE_OFF',
      installmentCount: 1,
      installmentsPaid: 0,
      notes: 'Patungan villa Seminyak weekend kemarin.',
      status: 'ACTIVE',
    },
    {
      id: `debt-${demoUserId}-danamon-kta`,
      name: 'KTA Dana Instan Bank Danamon',
      debtType: 'LOAN_MORTGAGE',
      totalAmount: 15000000,
      remainingBalance: 0,
      interestRate: 14.5,
      minimumPayment: 1350000,
      counterpartyName: 'Bank Danamon',
      dueDate: '2026-08-10',
      frequency: 'MONTHLY',
      installmentCount: 12,
      installmentsPaid: 12,
      notes: 'HUTANG LUNAS TOTAL! 🏆 Kemenangan besar melunasi pinjaman tanpa denda pinalti.',
      status: 'PAID_OFF',
    },
  ];

  for (const d of debts) {
    await client.query(
      `INSERT INTO "Debt" (
        id, "userId", name, "debtType", "totalAmount", "remainingBalance",
        "interestRate", "minimumPayment", "counterpartyName", "dueDate",
        frequency, "installmentCount", "installmentsPaid", notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        d.id,
        demoUserId,
        d.name,
        d.debtType,
        d.totalAmount,
        d.remainingBalance,
        d.interestRate,
        d.minimumPayment,
        d.counterpartyName,
        d.dueDate,
        d.frequency,
        d.installmentCount,
        d.installmentsPaid,
        d.notes,
        d.status,
      ]
    );
  }

  // Debt Payment Records
  const debtPayments = [
    {
      id: `pay-spaylater-1`,
      debtId: `debt-${demoUserId}-spaylater`,
      amount: 1100000,
      paymentDate: '2026-06-25T10:00:00.000Z',
      notes: 'Cicilan 1/4 SPayLater Smart TV',
    },
    {
      id: `pay-spaylater-2`,
      debtId: `debt-${demoUserId}-spaylater`,
      amount: 1100000,
      paymentDate: '2026-07-25T10:00:00.000Z',
      notes: 'Cicilan 2/4 SPayLater Smart TV',
    },
    {
      id: `pay-spaylater-3`,
      debtId: `debt-${demoUserId}-spaylater`,
      amount: 1100000,
      paymentDate: '2026-08-25T10:00:00.000Z',
      notes: 'Cicilan 3/4 SPayLater Smart TV',
    },
    {
      id: `pay-gopaylater-1`,
      debtId: `debt-${demoUserId}-gopaylater`,
      amount: 600000,
      paymentDate: '2026-07-30T10:00:00.000Z',
      notes: 'Cicilan 1/3 GoPay Later',
    },
    {
      id: `pay-gopaylater-2`,
      debtId: `debt-${demoUserId}-gopaylater`,
      amount: 600000,
      paymentDate: '2026-08-30T10:00:00.000Z',
      notes: 'Cicilan 2/3 GoPay Later',
    },
    {
      id: `pay-danamon-final`,
      debtId: `debt-${demoUserId}-danamon-kta`,
      amount: 2700000,
      paymentDate: '2026-08-10T11:00:00.000Z',
      notes: 'Pelunasan dipercepat KTA Danamon! Bebas hutang pinjaman konsumtif.',
    },
  ];

  for (const p of debtPayments) {
    await client.query(
      `INSERT INTO "DebtPayment" (id, "debtId", "userId", amount, "paymentDate", notes, "syncedToLedger")
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
      [p.id, p.debtId, demoUserId, p.amount, p.paymentDate, p.notes]
    );
  }

  // 9. Insert EXP Audit Events
  console.log('Seeding EXP Audit log events...');
  const expEvents = [
    { amount: 500, reason: 'Melunasi total KTA Bank Danamon (Bebas Hutang!)', tag: 'DEBT_CONQUERED' },
    { amount: 200, reason: 'Menolak pembelian impulsif AirPods Max (Holding Pen 48h)', tag: 'IMPULSE_SAVED' },
    { amount: 120, reason: 'Menolak impuls jaket puffer diskon tengah malam', tag: 'IMPULSE_SAVED' },
    { amount: 150, reason: 'Mencapai streak login konsisten 14 hari berturut-turut', tag: 'STREAK' },
    { amount: 300, reason: 'Target Timeline Fund Dell UltraSharp 4K tercapai 100%', tag: 'TIMELINE_FUND' },
    { amount: 100, reason: 'Putaran Roda Hadiah: Hadiah Tema Emerald Wealth', tag: 'REWARD_SPIN' },
    { amount: 90, reason: 'Collection Vault: 50x pemakaian Sepatu Lari Asics', tag: 'VAULT' },
    { amount: 75, reason: 'Pembayaran tepat waktu cicilan SPayLater Smart TV', tag: 'DEBT_PAYMENT' },
    { amount: 75, reason: 'Pembayaran tepat waktu cicilan GoPay Later Tokopedia', tag: 'DEBT_PAYMENT' },
    { amount: 80, reason: 'Evaluasi sadar pembelian Kindle Paperwhite setelah 48 jam', tag: 'MINDFUL_SPEND' },
    { amount: 100, reason: 'Level Up ke Level 8: Rank Discipline Grandmaster', tag: 'LEVEL_UP' },
  ];

  for (let i = 0; i < expEvents.length; i++) {
    const e = expEvents[i];
    await client.query(
      `INSERT INTO "ExpEvent" (id, "userId", amount, reason, "categoryTag", "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${i * 3} days')`,
      [`exp-${demoUserId}-${i + 1}`, demoUserId, e.amount, e.reason, e.tag]
    );
  }

  // 10. Insert Rewards Inventory
  console.log('Seeding Rewards Inventory...');
  const rewards = [
    {
      id: `rew-${demoUserId}-kopi`,
      type: 'REAL_WORLD_TREAT',
      title: 'Kopi Kenangan Mantan + Roti Treat',
      description: 'Hadiah treat mingguan kopi susu gula aren favorit atas kedisiplinan budgeting.',
      icon: '☕',
      status: 'UNCLAIMED',
    },
    {
      id: `rew-${demoUserId}-shield`,
      type: 'DIGITAL_SHIELD',
      title: 'Grace Day Shield Tambahan',
      description: 'Perisai ekstra untuk menjaga streak login saat hari sibuk atau bepergian.',
      icon: '🛡️',
      status: 'UNCLAIMED',
    },
    {
      id: `rew-${demoUserId}-theme-sakura`,
      type: 'DIGITAL_THEME',
      title: 'Tema Eksklusif Sakura Bloom',
      description: 'Aksen warna pastel lembut dan tenang untuk tampilan antarmuka aplikasi.',
      icon: '🌸',
      rewardValue: 'sakura_bloom',
      status: 'UNCLAIMED',
    },
    {
      id: `rew-${demoUserId}-theme-emerald`,
      type: 'DIGITAL_THEME',
      title: 'Tema Mewah Emerald Wealth',
      description: 'Tema bernuansa hijau permata yang elegan untuk motivasi finansial.',
      icon: '💎',
      rewardValue: 'emerald_wealth',
      status: 'REDEEMED',
      claimedAt: '2026-08-15T12:00:00.000Z',
    },
    {
      id: `rew-${demoUserId}-bonus-exp`,
      type: 'DIGITAL_EXP',
      title: 'Bonus 250 EXP Booster',
      description: 'Poin akselerasi progres akun dari putaran roda spinner keberuntungan.',
      icon: '⚡',
      rewardValue: '250',
      status: 'REDEEMED',
      claimedAt: '2026-08-20T16:00:00.000Z',
    },
  ];

  for (const r of rewards) {
    await client.query(
      `INSERT INTO "RewardInventory" (
        id, "userId", "rewardType", title, description, icon, "rewardValue", status, "claimedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [r.id, demoUserId, r.type, r.title, r.description, r.icon, r.rewardValue || null, r.status, r.claimedAt || null]
    );
  }

  await client.end();
  console.log('✅ Postgres database and Blob storage seeding completed successfully!');
}

runSeed().catch((err) => {
  console.error('Seeding failed with error:', err);
  process.exit(1);
});
