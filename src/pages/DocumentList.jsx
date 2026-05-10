import React, { useState, useEffect } from 'react';
import useDocuments from '../hooks/useDocuments';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { effectiveStatus } from '../utils/documentLifecycle';
import { Plus, Search, Edit2, Trash2, FileCheck, AlertCircle } from 'lucide-react';
import './DocumentList.css';

const DocumentList = ({ type = 'invoice', onEdit, onNew }) => {
  const { fetchDocuments, deleteDocument } = useDocuments();
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null); // { id, number }

  useEffect(() => { loadDocs(); }, [type]);

  const loadDocs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDocuments(type);
      setDocs(data);
    } catch (_err) {
      setError(`Failed to load ${type}s. Please restart the app.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirm) return;
    await deleteDocument(confirm.id);
    setConfirm(null);
    loadDocs();
  };

  const filteredDocs = docs.filter(d =>
    d.number.toLowerCase().includes(search.toLowerCase()) ||
    (d.client_name && d.client_name.toLowerCase().includes(search.toLowerCase())) ||
    (d.title && d.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="doc-list-page">
      <div className="page-header">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder={`Search ${type}s...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={`Search ${type}s`}
          />
        </div>
        <Button variant="primary" icon={Plus} onClick={onNew}>
          New {type.charAt(0).toUpperCase() + type.slice(1)}
        </Button>
      </div>

      {error && (
        <div className="page-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="doc-table-container">
        {!error && filteredDocs.length === 0 ? (
          <div className="doc-empty">
            <FileCheck size={36} strokeWidth={1.4} />
            <div className="doc-empty-title">
              {loading ? 'Loading…' : search ? `No ${type}s match "${search}"` : `No ${type}s yet`}
            </div>
            <div className="doc-empty-desc">
              {!loading && !search && `Click "New ${type.charAt(0).toUpperCase() + type.slice(1)}" to create your first one.`}
              {!loading && search && 'Try a different search term.'}
            </div>
          </div>
        ) : (
          <table className="doc-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Client</th>
                <th>Date</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => (
                <tr key={doc.id}>
                  <td className="doc-num">{doc.number}</td>
                  <td>
                    <div className="client-cell">
                      <span className="client-name">{doc.client_name || 'No Client'}</span>
                      <span className="doc-title">{doc.title}</span>
                    </div>
                  </td>
                  <td>{doc.date}</td>
                  <td><StatusBadge status={effectiveStatus(doc)} /></td>
                  <td className="doc-amount">
                    {(doc.total || 0).toLocaleString('de-DE', { style: 'currency', currency: doc.currency || 'EUR' })}
                  </td>
                  <td className="actions-cell">
                    <div className="action-btns">
                      <button
                        title="Edit"
                        aria-label={`Edit ${type} ${doc.number}`}
                        onClick={() => onEdit(doc)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        title="Delete"
                        aria-label={`Delete ${type} ${doc.number}`}
                        onClick={() => setConfirm({ id: doc.id, number: doc.number })}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          title={`Delete ${type}?`}
          message={`"${confirm.number}" will be permanently deleted along with all its line items and payment records.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
};

export default DocumentList;
