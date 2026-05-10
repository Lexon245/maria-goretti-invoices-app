import { AlertTriangle } from 'lucide-react';
import Button from '../components/Button';
import './SyncConflictModal.css';

// Two-button modal for the 409/422 SHA-mismatch case.
// Discard local: re-fetch remote, drop local mutations, reload.
// Force overwrite: re-fetch SHA, push local bytes anyway.
const SyncConflictModal = ({ onDiscardLocal, onForceOverwrite, onClose }) => {
  return (
    <div className="sync-conflict-overlay" role="dialog" aria-modal="true">
      <div className="sync-conflict-card">
        <div className="sync-conflict-header">
          <AlertTriangle size={28} className="sync-conflict-icon" />
          <h2>Sync conflict</h2>
        </div>
        <p>
          Another device pushed changes to <code>data/invoiceforge.db</code> after you started editing.
          Your local changes have <strong>not</strong> been saved to GitHub yet.
        </p>
        <p>Pick one:</p>
        <div className="sync-conflict-actions">
          <Button variant="outline" onClick={onDiscardLocal}>
            Discard my changes &amp; reload
          </Button>
          <Button variant="danger" onClick={onForceOverwrite}>
            Overwrite remote with my version
          </Button>
        </div>
        <button type="button" className="sync-conflict-close" onClick={onClose}>
          Decide later
        </button>
      </div>
    </div>
  );
};

export default SyncConflictModal;
