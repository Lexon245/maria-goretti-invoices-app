import React, { useState } from 'react';
import { Cloud, KeyRound, AlertCircle, ExternalLink } from 'lucide-react';
import Button from '../components/Button';
import * as githubSync from '../sync/githubSync';
import { DEFAULT_DATA_REPO, PAT_STORAGE_KEY, REPO_STORAGE_KEY } from '../sync/config';
import './GitHubAuth.css';

const ERROR_MESSAGES = {
  invalid_token:    'Invalid token. Check that the token is correct and not expired.',
  repo_not_found:   'Repo not found, or the token has no access to this repository.',
  no_write_access:  'Token can read but not write. Generate a fine-grained PAT with "Contents: Read and write" on this repo.',
  network_error:    'Network error. Check your connection and try again.',
  not_configured:   'Configuration error.',
};

const GitHubAuth = ({ onAuthenticated }) => {
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem(REPO_STORAGE_KEY) || 'null'); }
    catch { return null; }
  })() || DEFAULT_DATA_REPO;

  const [token, setToken] = useState('');
  const [owner, setOwner] = useState(stored.owner);
  const [repo, setRepo] = useState(stored.repo);
  const [branch, setBranch] = useState(stored.branch || 'main');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!token.trim()) {
      setError('Paste your Personal Access Token first.');
      return;
    }
    setVerifying(true);
    try {
      githubSync.configure({
        owner: owner.trim(),
        repo: repo.trim(),
        branch: branch.trim() || 'main',
        dbPath: stored.dbPath || DEFAULT_DATA_REPO.dbPath,
        token: token.trim(),
      });
      const result = await githubSync.verifyAccess();
      if (!result.ok) {
        setError(ERROR_MESSAGES[result.reason] || `Verification failed: ${result.reason}`);
        setVerifying(false);
        return;
      }
      localStorage.setItem(PAT_STORAGE_KEY, token.trim());
      localStorage.setItem(REPO_STORAGE_KEY, JSON.stringify({
        owner: owner.trim(),
        repo: repo.trim(),
        branch: branch.trim() || 'main',
        dbPath: stored.dbPath || DEFAULT_DATA_REPO.dbPath,
      }));
      onAuthenticated();
    } catch (err) {
      setError(err.message || 'Unexpected error.');
      setVerifying(false);
    }
  };

  const lookedFineGrained = token.trim().startsWith('github_pat_');
  const showFormatWarning = token.trim().length > 0 && !lookedFineGrained;

  return (
    <div className="gh-auth-page">
      <div className="gh-auth-card">
        <div className="gh-auth-header">
          <div className="gh-auth-logo"><Cloud size={28} /></div>
          <h1>Connect to GitHub</h1>
          <p>InvoiceForge stores your data in a private GitHub repo. Sign in with a Personal Access Token to read and save invoices.</p>
        </div>

        <form onSubmit={handleSubmit} className="gh-auth-form">
          <label className="gh-auth-label">
            <span><KeyRound size={14} /> Personal Access Token</span>
            <input
              type="password"
              autoFocus
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="github_pat_…"
              className="gh-auth-input"
              autoComplete="off"
            />
          </label>

          {showFormatWarning && (
            <div className="gh-auth-hint warning">
              <AlertCircle size={14} />
              <span>This doesn't look like a fine-grained PAT (no <code>github_pat_</code> prefix). Classic tokens have broader scope — please use a fine-grained one.</span>
            </div>
          )}

          <details className="gh-auth-advanced" open={showAdvanced} onToggle={(e) => setShowAdvanced(e.target.open)}>
            <summary>Advanced — repository</summary>
            <div className="gh-auth-grid">
              <label className="gh-auth-label">
                <span>Owner</span>
                <input className="gh-auth-input" value={owner} onChange={(e) => setOwner(e.target.value)} />
              </label>
              <label className="gh-auth-label">
                <span>Repo</span>
                <input className="gh-auth-input" value={repo} onChange={(e) => setRepo(e.target.value)} />
              </label>
              <label className="gh-auth-label">
                <span>Branch</span>
                <input className="gh-auth-input" value={branch} onChange={(e) => setBranch(e.target.value)} />
              </label>
            </div>
          </details>

          {error && (
            <div className="gh-auth-hint error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" variant="primary" disabled={verifying}>
            {verifying ? 'Verifying…' : 'Connect'}
          </Button>
        </form>

        <div className="gh-auth-help">
          <h3>How to create a Personal Access Token</h3>
          <ol>
            <li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">github.com/settings/personal-access-tokens/new <ExternalLink size={11} /></a></li>
            <li>Token type: <strong>Fine-grained</strong></li>
            <li>Repository access: <strong>Only select repositories</strong> → <code>{owner}/{repo}</code></li>
            <li>Repository permissions → <strong>Contents: Read and write</strong> (only this one)</li>
            <li>Set expiry to 90 days. Generate, copy, paste above.</li>
          </ol>
          <p className="gh-auth-warning">
            <AlertCircle size={12} /> The token lives in this browser's <code>localStorage</code>. Don't use this app on a shared computer.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GitHubAuth;
