// Runtime-agnostic schema + migrations for InvoiceForge.
// Mirrors electron/database.js but expressed as a list so it can run against
// sql.js (browser) the same way the Electron path runs against better-sqlite3.

const BASE_SCHEMA = `
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
`;

const MIGRATIONS = [
  {
    version: 1,
    up: (exec) => {
      const stmts = [
        "ALTER TABLE clients ADD COLUMN address_street TEXT;",
        "ALTER TABLE clients ADD COLUMN address_zip TEXT;",
        "ALTER TABLE clients ADD COLUMN address_city TEXT;",
        "ALTER TABLE clients ADD COLUMN address_country TEXT;",
        "UPDATE clients SET address_street = address WHERE address_street IS NULL;",
        "ALTER TABLE products ADD COLUMN name_de TEXT;",
        "ALTER TABLE products ADD COLUMN name_fr TEXT;",
        "ALTER TABLE products ADD COLUMN description_de TEXT;",
        "ALTER TABLE products ADD COLUMN description_fr TEXT;",
        "ALTER TABLE documents ADD COLUMN language TEXT DEFAULT 'en';",
      ];
      stmts.forEach(s => { try { exec(s); } catch (_e) {} });
    },
  },
  {
    version: 2,
    up: (exec) => {
      const stmts = [
        "ALTER TABLE clients ADD COLUMN email_valid INTEGER;",
        "ALTER TABLE clients ADD COLUMN phone_valid INTEGER;",
        "ALTER TABLE clients ADD COLUMN address_verified INTEGER;",
        "ALTER TABLE clients ADD COLUMN vat_valid INTEGER;",
        "ALTER TABLE clients ADD COLUMN vat_company_name TEXT;",
        "ALTER TABLE clients ADD COLUMN vat_validated_at TEXT;",
      ];
      stmts.forEach(s => { try { exec(s); } catch (_e) {} });
      try {
        exec(`
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
      } catch (_e) {}
      try { exec("ALTER TABLE products ADD COLUMN category_id TEXT REFERENCES product_categories(id);"); } catch (_e) {}
    },
  },
  {
    version: 3,
    up: (exec) => {
      const stmts = [
        "ALTER TABLE documents ADD COLUMN payment_mode TEXT DEFAULT 'standard';",
        "ALTER TABLE documents ADD COLUMN issued_at TEXT;",
        "ALTER TABLE documents ADD COLUMN paid_at TEXT;",
        "ALTER TABLE documents ADD COLUMN cancelled_at TEXT;",
        "ALTER TABLE documents ADD COLUMN locked INTEGER DEFAULT 0;",
        "ALTER TABLE documents ADD COLUMN source_quote_id TEXT;",
      ];
      stmts.forEach(s => { try { exec(s); } catch (_e) {} });
      try {
        exec(`
          CREATE TABLE IF NOT EXISTS document_events (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            payload_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (document_id) REFERENCES documents(id)
          );
        `);
      } catch (_e) {}
      try {
        exec(`
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
      } catch (_e) {}
    },
  },
  {
    version: 4,
    up: (exec) => {
      exec(`
        CREATE INDEX IF NOT EXISTS idx_documents_status      ON documents(status);
        CREATE INDEX IF NOT EXISTS idx_documents_client_id   ON documents(client_id);
        CREATE INDEX IF NOT EXISTS idx_doc_items_document_id ON document_items(document_id);
        CREATE INDEX IF NOT EXISTS idx_payments_document_id  ON payments(document_id);
        CREATE INDEX IF NOT EXISTS idx_events_document_id    ON document_events(document_id);
      `);
    },
  },
  {
    version: 5,
    up: (exec) => {
      try {
        exec(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_type_number
            ON documents(type, number);
        `);
      } catch (e) {
        console.error('Migration 5 failed (likely existing duplicates):', e.message);
      }
    },
  },
];

// adapter shape:
//   exec(sql) -> void
//   getVersion() -> number
//   setVersion(n) -> void
export function runMigrations(adapter) {
  adapter.exec(BASE_SCHEMA);
  const hasRow = adapter.hasVersionRow();
  if (!hasRow) adapter.insertVersionRow();
  for (const m of MIGRATIONS) {
    if (adapter.getVersion() < m.version) {
      m.up((sql) => adapter.exec(sql));
      adapter.setVersion(m.version);
    }
  }
}

export const TARGET_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
