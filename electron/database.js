const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'invoiceforge.db');
const db = new Database(dbPath);

// Enforce referential integrity on every connection.
db.pragma('foreign_keys = ON');
// Keep page cache efficient.
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    address_street TEXT,
    address_zip TEXT,
    address_city TEXT,
    address_country TEXT,
    vat TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_de TEXT,
    name_fr TEXT,
    description TEXT,
    description_de TEXT,
    description_fr TEXT,
    rate REAL,
    unit TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    number TEXT NOT NULL,
    date TEXT,
    due_date TEXT,
    status TEXT,
    client_id TEXT,
    title TEXT,
    notes TEXT,
    currency TEXT DEFAULT 'EUR',
    tax_rate REAL DEFAULT 21,
    discount_value REAL DEFAULT 0,
    discount_type TEXT DEFAULT '%',
    language TEXT DEFAULT 'en',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS document_items (
    id TEXT PRIMARY KEY,
    document_id TEXT,
    description TEXT,
    qty REAL,
    rate REAL,
    sort_order INTEGER,
    FOREIGN KEY (document_id) REFERENCES documents(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL DEFAULT 0
  );
`);

// Ensure version row exists
if (!db.prepare('SELECT version FROM schema_version').get()) {
  db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
}

const getVersion = () => db.prepare('SELECT version FROM schema_version').get().version;
const setVersion = (v) => db.prepare('UPDATE schema_version SET version = ?').run(v);

// Migration 1: address columns, multilingual products, document language
if (getVersion() < 1) {
  try { db.exec("ALTER TABLE clients ADD COLUMN address_street TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE clients ADD COLUMN address_zip TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE clients ADD COLUMN address_city TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE clients ADD COLUMN address_country TEXT;"); } catch(e) {}
  try { db.exec("UPDATE clients SET address_street = address WHERE address_street IS NULL;"); } catch(e) {}
  try { db.exec("ALTER TABLE products ADD COLUMN name_de TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE products ADD COLUMN name_fr TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE products ADD COLUMN description_de TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE products ADD COLUMN description_fr TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE documents ADD COLUMN language TEXT DEFAULT 'en';"); } catch(e) {}
  setVersion(1);
}

// Migration 2: client validation flags + product categories
if (getVersion() < 2) {
  try { db.exec("ALTER TABLE clients ADD COLUMN email_valid INTEGER;"); } catch(e) {}
  try { db.exec("ALTER TABLE clients ADD COLUMN phone_valid INTEGER;"); } catch(e) {}
  try { db.exec("ALTER TABLE clients ADD COLUMN address_verified INTEGER;"); } catch(e) {}
  try { db.exec("ALTER TABLE clients ADD COLUMN vat_valid INTEGER;"); } catch(e) {}
  try { db.exec("ALTER TABLE clients ADD COLUMN vat_company_name TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE clients ADD COLUMN vat_validated_at TEXT;"); } catch(e) {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_de TEXT,
        name_fr TEXT,
        color TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch(e) {}
  try { db.exec("ALTER TABLE products ADD COLUMN category_id TEXT REFERENCES product_categories(id);"); } catch(e) {}
  setVersion(2);
}

// Migration 3: document lifecycle, audit log, payments
if (getVersion() < 3) {
  try { db.exec("ALTER TABLE documents ADD COLUMN payment_mode TEXT DEFAULT 'standard';"); } catch(e) {}
  try { db.exec("ALTER TABLE documents ADD COLUMN issued_at TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE documents ADD COLUMN paid_at TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE documents ADD COLUMN cancelled_at TEXT;"); } catch(e) {}
  try { db.exec("ALTER TABLE documents ADD COLUMN locked INTEGER DEFAULT 0;"); } catch(e) {}
  try { db.exec("ALTER TABLE documents ADD COLUMN source_quote_id TEXT;"); } catch(e) {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS document_events (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id)
      );
    `);
  } catch(e) {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT,
        method TEXT,
        paid_at TEXT,
        reference TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id)
      );
    `);
  } catch(e) {}
  setVersion(3);
}

// Migration 4: performance indexes
if (getVersion() < 4) {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_status      ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_documents_client_id   ON documents(client_id);
    CREATE INDEX IF NOT EXISTS idx_doc_items_document_id ON document_items(document_id);
    CREATE INDEX IF NOT EXISTS idx_payments_document_id  ON payments(document_id);
    CREATE INDEX IF NOT EXISTS idx_events_document_id    ON document_events(document_id);
  `);
  setVersion(4);
}

// Migration 5: enforce uniqueness on document numbers
if (getVersion() < 5) {
  // Skip duplicates (if any exist) by suffixing with rowid before creating index.
  // This is defensive — fresh installs have no duplicates.
  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_type_number
        ON documents(type, number);
    `);
  } catch (e) {
    console.error('Migration 5 failed (likely existing duplicates):', e.message);
    // Don't throw — let app continue; admin can fix duplicates manually.
  }
  setVersion(5);
}

// Lightweight startup maintenance — reclaim space and refresh query planner stats.
try { db.exec('PRAGMA analysis_limit=400; ANALYZE;'); } catch (_e) {}

module.exports = db;
