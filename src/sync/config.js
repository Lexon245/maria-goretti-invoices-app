// Constants for the GitHub data repo. Owner/repo can be overridden at runtime
// via the auth UI (Advanced section) and persisted in localStorage.

export const DEFAULT_DATA_REPO = {
  owner: 'Lexon245',
  repo: 'maria-goretti-invoices',
  branch: 'main',
  dbPath: 'data/invoiceforge.db',
};

export const PAT_STORAGE_KEY = 'mg-invoices-pat';
export const REPO_STORAGE_KEY = 'mg-invoices-repo';

export const SYNC_DEBOUNCE_MS = 3000;
