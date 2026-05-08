import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import * as engine from '../db/sqliteEngine';
import './SyncStatusBadge.css';

const LABELS = {
  idle:    { icon: Cloud,         text: 'Synced',       cls: 'idle'    },
  dirty:   { icon: Cloud,         text: 'Unsaved',      cls: 'dirty'   },
  saving:  { icon: RefreshCw,     text: 'Saving…',      cls: 'saving'  },
  saved:   { icon: Check,         text: 'Saved',        cls: 'saved'   },
  conflict:{ icon: AlertTriangle, text: 'Conflict',     cls: 'conflict'},
  error:   { icon: CloudOff,      text: 'Sync error',   cls: 'error'   },
};

const SyncStatusBadge = () => {
  const [state, setState] = useState('idle');

  useEffect(() => {
    const unsub = engine.subscribe((event) => {
      if (event === 'mutation') setState((s) => (s === 'saving' ? s : 'dirty'));
    });
    const onSync = (e) => {
      const detail = e.detail;
      if (detail === 'sync-start') setState('saving');
      else if (detail === 'sync-ok') {
        setState('saved');
        setTimeout(() => setState((s) => (s === 'saved' ? 'idle' : s)), 2000);
      }
      else if (detail === 'sync-conflict') setState('conflict');
      else if (detail === 'sync-error') setState('error');
    };
    window.addEventListener('mg-sync', onSync);
    return () => { unsub(); window.removeEventListener('mg-sync', onSync); };
  }, []);

  const meta = LABELS[state] || LABELS.idle;
  const Icon = meta.icon;
  const clickable = state === 'dirty' || state === 'error';

  const handleClick = () => {
    if (!clickable) return;
    window.dispatchEvent(new CustomEvent('mg-save-now'));
  };

  return (
    <button
      type="button"
      className={`sync-badge sync-${meta.cls}`}
      onClick={handleClick}
      title={clickable ? 'Click to save now' : meta.text}
      disabled={!clickable}
    >
      <Icon size={14} className={state === 'saving' ? 'spin' : ''} />
      <span>{meta.text}</span>
    </button>
  );
};

export default SyncStatusBadge;
