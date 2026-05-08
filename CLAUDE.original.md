# InvoiceForge — Project Reference

**Version:** 0.7.0 | **Stack:** React 19 + Electron 41 + SQLite (better-sqlite3) + Vite 8

> Single source of truth. Read this; read nothing else.

---

## What the app is

Desktop billing tool for freelancers. Manages clients, products/services, invoices, and quotes. Generates PDFs in EN/DE/FR. Runs fully offline — no server, no cloud, all data in a local SQLite file.

---

## How to run

```bash
npm run dev       # Vite dev server (browser preview, uses in-memory mock DB)
npm run build     # Build dist/ + dist-electron/
npm run preview   # Serve production build at :4173
# To run as real Electron app: npx electron . (after build)
```

The browser dev mode shims `window.electron.db` with an in-memory stub (see `src/main.jsx`) so pages render without Electron. Real persistence only works in the packaged Electron app.

---

## Directory structure

```
Billing_App/
├── electron/
│   ├── main.js          # Electron main process — BrowserWindow, IPC handlers
│   ├── database.js      # SQLite schema + migrations (schema_version table)
│   └── preload.js       # contextBridge: exposes window.electron.db.{query,run,transaction}
├── src/
│   ├── main.jsx         # React root mount + browser shim for window.electron.db
│   ├── App.jsx          # Central state: view, isEditing, editingData, appSettings
│   ├── index.css        # Global design tokens (CSS vars) + base styles + shared classes
│   ├── constants.js     # DOC_TYPES, LANGUAGES, CURRENCIES, UNITS, DUE_DATE_MONTHS
│   ├── components/
│   │   ├── Layout.jsx          # Shell: sidebar + header. Owns sidebarCollapsed state.
│   │   ├── Layout.css
│   │   ├── Sidebar.jsx         # Nav + collapse toggle. Props: collapsed, onToggleCollapse.
│   │   ├── Sidebar.css
│   │   ├── Button.jsx          # variant=primary|secondary|outline|ghost|danger, size=sm|md|lg
│   │   ├── Button.css
│   │   ├── Input.jsx           # Labeled input wrapper with error state
│   │   ├── Input.css
│   │   ├── StatusBadge.jsx     # draft|sent|paid|overdue|cancelled|accepted|declined|converted
│   │   ├── StatusBadge.css
│   │   ├── ConfirmDialog.jsx   # Modal confirm/cancel dialog with focus trap
│   │   ├── ConfirmDialog.css
│   │   ├── CategoryEditor.jsx  # Shared editor for product categories
│   │   ├── CategoryEditor.css
│   │   └── ErrorBoundary.jsx   # React error boundary
│   ├── pages/
│   │   ├── Dashboard.jsx / .css      # KPI stats, revenue chart, recent docs, quick actions
│   │   ├── DocumentList.jsx / .css   # Table of invoices or quotes (search, edit, delete)
│   │   ├── DocumentEditor.jsx / .css # Create/edit form + preview mode + lifecycle actions
│   │   ├── DocumentPreview.jsx / .css# Print/PDF HTML render (language-aware)
│   │   ├── Clients.jsx / .css        # Client CRUD table + modal (live validation)
│   │   ├── Products.jsx / .css       # Product cards + category chips + modal
│   │   └── Settings.jsx / .css       # Tabbed settings: Company / Billing / Numbering / Translations
│   ├── hooks/
│   │   ├── useDatabase.js      # query(sql,params), run(sql,params), transaction([ops])
│   │   ├── useDocuments.js     # fetchDocuments, saveDocument, deleteDocument, transitionDocument, fetchPayments
│   │   ├── useSettings.js      # loadSettings, saveSettings, getNextDocumentNumber, incrementDocumentNumber
│   │   ├── useCurrency.js      # formatCurrency(amount, currency)
│   │   └── useFocusTrap.js     # Keyboard focus trap for modals
│   └── utils/
│       ├── documentLifecycle.js  # Status FSM (pure functions, no DB)
│       └── validators.js         # Email regex, phone (libphonenumber-js), VAT (VIES), address (Nominatim)
├── CLAUDE.md            # ← this file
├── CHANGELOG.md         # Version history
├── PROJECT_RECAP.md     # Legacy overview (superseded by this file)
├── package.json         # version field is the app version shown in sidebar
└── index.html           # Vite entry
```

---

## IPC bridge (Electron ↔ React)

`preload.js` exposes three methods via `contextBridge`:

| Method | Signature | Notes |
|--------|-----------|-------|
| `window.electron.db.query` | `(sql, params?) → row[]` | SELECT |
| `window.electron.db.run` | `(sql, params?) → { changes, lastInsertRowid }` | INSERT/UPDATE/DELETE |
| `window.electron.db.transaction` | `(ops: {sql,params}[]) → results[]` | Atomic multi-statement |

`useDatabase` hook wraps these with error logging. Never call `window.electron.db` directly from components — always go through a hook.

---

## Database schema

Managed by `electron/database.js`. Migrations are version-gated via `schema_version` table.

### Tables

**`settings`** — key/value store. One row per setting key.

**`clients`**
```
id, name, email, phone, address_street, address_zip, address_city, address_country,
vat_number, iban, notes,
email_valid(0/1), phone_valid(0/1), address_verified(0/1),
vat_valid(0/1), vat_company_name, vat_validated_at,
created_at
```

**`product_categories`**
```
id, name, name_de, name_fr, color, sort_order, created_at
```

**`products`**
```
id, name, name_de, name_fr, description, description_de, description_fr,
rate, unit, category_id(FK), created_at
```

**`documents`**
```
id, type(invoice|quote), number, title, client_id(FK), date, due_date,
status, payment_mode(standard|cash), language(en|de|fr),
tax_rate, discount, discount_type(percent|fixed),
notes, currency,
issued_at, paid_at, cancelled_at, locked(0/1), source_quote_id(FK),
created_at
```

**`document_items`**
```
id, document_id(FK), description, quantity, unit_price, total, sort_order
```

**`payments`**
```
id, document_id(FK), amount, currency, method, paid_at, reference, notes, created_at
```

**`document_events`** — append-only audit log
```
id, document_id(FK), event_type, payload_json, created_at
```

---

## Document lifecycle (state machine)

Defined in `src/utils/documentLifecycle.js`. Pure functions, no side effects.

### Invoice statuses
```
draft → sent → paid
             → overdue (derived: sent + due_date < today)
             → cancelled
paid → sent  (unlock for edit)
```

### Quote statuses
```
draft → sent → accepted → converted
             → declined
```

### Key functions
- `canTransition(doc, nextStatus)` — boolean
- `allowedNextStatuses(doc)` — array of valid next statuses
- `applyTransition(doc, newStatus)` — returns patch object `{ status, locked, issued_at, paid_at, cancelled_at }`
- `effectiveStatus(doc)` — returns `'overdue'` when `status === 'sent'` and past due date, otherwise `doc.status`

**Transitions always run inside `useDocuments.transitionDocument(doc, newStatus)`** which wraps the DB writes in a single `transaction([...])`.

---

## State management (App.jsx)

No external store. `App.jsx` holds:

```js
view          // 'dashboard' | 'invoices' | 'quotes' | 'clients' | 'products' | 'settings'
isEditing     // bool
editingData   // null | { doc, type }
appSettings   // loaded once from DB on mount
```

Navigation: `setView(id)` passed down through `Layout` → `Sidebar`.  
Opening editor: `setIsEditing(true); setEditingData({ doc, type })`.  
Back from editor: `setIsEditing(false); setEditingData(null)`.

---

## Design system

All tokens in `src/index.css` under `:root`.

### Key tokens
```css
--color-indigo: #6366F1          /* primary accent */
--color-indigo-hover: #4F46E5
--color-indigo-alpha: rgba(99,102,241,0.10)
--color-light-bg: #F1F5F9        /* page background */
--color-light-surface: #FFFFFF   /* card background */
--color-border-light-theme: #E2E8F0
--color-text-dark-primary: #0F172A
--color-text-dark-secondary: #475569
--color-text-dark-tertiary: #94A3B8
--color-danger: #FF4D4D
--color-success: #00E676
--color-warning: #FFD600
--font-sans: 'Inter', system-ui  /* body */
--font-heading: 'Outfit'          /* h1-h6 */
--font-mono: 'JetBrains Mono'    /* numbers, codes */
--transition-fast: 150ms cubic-bezier(0.4,0,0.2,1)
--transition-normal: 250ms cubic-bezier(0.4,0,0.2,1)
```

### Shared CSS classes (index.css)
- `.card` — white surface with border + shadow
- `.page-header` — flex row, space-between, used at top of every list page
- `.search-bar` — icon + input, max-width 400px
- `.page-error` — red alert banner
- `.clients-table thead th, .doc-table thead th` — sticky headers

### Responsive breakpoints
- `1100px` — dashboard stats 4→2 col; bottom grid stacks
- `820px` — settings tabs go horizontal above body
- `700px` — doc editor section grids + bottom section stack; chart toolbar wraps
- `600px` — dashboard stats 2→1 col; hero card stacks
- `560px` — client modal form rows stack

### Sidebar
- Expanded: `264px` — full labels, section headers, user profile
- Collapsed: `72px` — icons only, tooltips via `title` attr
- Toggle: `sidebar-collapse-btn` in sidebar header
- State: `sidebarCollapsed` in `Layout.jsx`, CSS class `.sidebar.collapsed`

---

## Multilingual documents

Documents carry `language: 'en' | 'de' | 'fr'`.  
`DocumentEditor` has a language switcher in the header actions.  
`DocumentPreview` renders labels from settings translations (`trans_invoice_en`, `trans_date_de`, etc.).  
Products have `name`, `name_de`, `name_fr` and `description`, `description_de`, `description_fr`.

---

## Document numbering

Pattern stored as JSON array in settings (`invoice_pattern`, `quote_pattern`).  
Each segment: `{ id, type: 'text'|'date'|'sequence', value, format }`.  
`useSettings.getNextDocumentNumber(type)` builds the string from pattern + current sequence.  
`useSettings.incrementDocumentNumber(type)` advances the counter after a save.

---

## Versioning scheme

| Bump | When |
|------|------|
| `x.0.0` | Core architecture change, Electron upgrade, schema breaking change |
| `0.x.0` | New feature, significant UX overhaul, new page/major component |
| `0.0.x` | Bug fix, style tweak, minor QoL improvement |

Version in `package.json` is the single source. Sidebar reads it via:
```js
import { version as appVersion } from '../../package.json';
```

**Always bump `package.json` version AND add entry to `CHANGELOG.md` before finishing a change session.**

---

## Adding a new feature — checklist

1. Schema change? Add migration in `electron/database.js`, bump `schema_version`.
2. New data access? Add method to relevant hook in `src/hooks/`.
3. New page? Create `pages/Foo.jsx` + `pages/Foo.css`. Add nav item to `Sidebar.jsx` `mainNav`/`generalNav`. Add view case in `App.jsx`.
4. New component? Add to `src/components/`. Keep CSS scoped to component class.
5. New setting key? Add default in `useSettings.js` default object + `Settings.jsx` form.
6. Bump version in `package.json`.
7. Add `CHANGELOG.md` entry.

---

## Known constraints

- `overflow: hidden` on `body` — intentional, prevents OS scrollbar flash. Content scroll happens in `.content-body` (`overflow-y: auto`).
- `app-container` has `min-width: 480px` — prevents total layout collapse on tiny windows.
- Settings body column uses `minmax(0, 1fr)` — required; plain `1fr` lets content overflow the grid container.
- Translation table + numbering editor use internal `overflow-x: auto` scroll — content has a `min-width` so columns don't crush on narrow sidebars.
- Browser preview (Vite dev) uses in-memory stub DB — data doesn't persist, and some IPC-dependent features behave differently.
