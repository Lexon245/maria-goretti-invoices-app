import React, { useState, useEffect } from 'react';
import useSettings from '../hooks/useSettings';
import Button from '../components/Button';
import Input from '../components/Input';
import { Save, Building2, CreditCard, FileText, RefreshCw, Languages, Trash2, Plus, AlertTriangle } from 'lucide-react';
import './Settings.css';

const TABS = [
  { id: 'company', label: 'Company Info', icon: Building2 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'numbering', label: 'Numbering', icon: FileText },
  { id: 'translations', label: 'Translations', icon: Languages },
];

const DATE_FORMATS = [
  { value: 'YYYYMMDD', label: 'YYYYMMDD' },
  { value: 'YYMMDD', label: 'YYMMDD' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'YYYY', label: 'YYYY' },
];

const SEQUENCE_FORMATS = [
  { value: 'Four Digits', label: 'Four Digits (0001)' },
  { value: 'Three Digits', label: 'Three Digits (001)' },
  { value: 'Two Digits', label: 'Two Digits (01)' },
  { value: 'No Padding', label: 'No Padding (1)' },
];

const NumberingEditor = ({ title, patternStr, nextNumber, onChange, onNextNumberChange }) => {
  let pattern = [];
  try {
    pattern = JSON.parse(patternStr);
  } catch (e) {
    pattern = [];
  }

  const addRow = (afterId = null) => {
    const newSegment = { id: crypto.randomUUID(), type: 'text', value: '' };
    let newPattern;
    if (afterId == null) {
      newPattern = [...pattern, newSegment];
    } else {
      const idx = pattern.findIndex(p => p.id === afterId);
      newPattern = [...pattern.slice(0, idx + 1), newSegment, ...pattern.slice(idx + 1)];
    }
    onChange(JSON.stringify(newPattern));
  };

  const removeRow = (id) => {
    const newPattern = pattern.filter(p => p.id !== id);
    onChange(JSON.stringify(newPattern));
  };

  const updateRow = (id, updates) => {
    const newPattern = pattern.map(p => p.id === id ? { ...p, ...updates } : p);
    onChange(JSON.stringify(newPattern));
  };

  const renderPreview = () => {
    let result = '';
    const today = new Date();
    pattern.forEach(segment => {
      if (segment.type === 'text') result += segment.value || '';
      else if (segment.type === 'date') {
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        if (segment.format === 'YYYYMMDD') result += `${year}${month}${day}`;
        else if (segment.format === 'YYMMDD') result += `${String(year).slice(2)}${month}${day}`;
        else if (segment.format === 'YYYY-MM-DD') result += `${year}-${month}-${day}`;
        else if (segment.format === 'YYYY') result += `${year}`;
      } else if (segment.type === 'sequence') {
        const padding = segment.format === 'Four Digits' ? 4 :
          segment.format === 'Three Digits' ? 3 :
            segment.format === 'Two Digits' ? 2 : 1;
        result += String(nextNumber || 1).padStart(padding, '0');
      }
    });
    return result || '(Empty Pattern)';
  };

  return (
    <div className="numbering-editor">
      <div className="editor-header">
        <h3>{title}</h3>
        <div className="preview-badge">
          <span>Live Preview</span>
          <strong>{renderPreview()}</strong>
        </div>
      </div>

      <div className="pattern-rows">
        {pattern.map((row) => (
          <div key={row.id} className="pattern-row">
            <select
              className="type-select"
              value={row.type}
              onChange={(e) => updateRow(row.id, {
                type: e.target.value,
                value: e.target.value === 'date' ? 'today' : (e.target.value === 'sequence' ? '1' : ''),
                format: e.target.value === 'date' ? 'YYYYMMDD' : (e.target.value === 'sequence' ? 'Four Digits' : undefined)
              })}
            >
              <option value="text">Static Text</option>
              <option value="date">Date Component</option>
              <option value="sequence">Counter</option>
            </select>

            {row.type === 'text' && (
              <input
                type="text"
                className="value-input"
                placeholder="Enter text (e.g. INV_)"
                value={row.value}
                onChange={(e) => updateRow(row.id, { value: e.target.value })}
              />
            )}

            {row.type === 'date' && (
              <>
                <select className="sub-select" value={row.value} onChange={(e) => updateRow(row.id, { value: e.target.value })}>
                  <option value="today">Today's Date</option>
                  <option value="created">Creation Date</option>
                </select>
                <select className="format-select" value={row.format} onChange={(e) => updateRow(row.id, { format: e.target.value })}>
                  {DATE_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </>
            )}

            {row.type === 'sequence' && (
              <>
                <input
                  type="number"
                  className="value-input mini"
                  min="1"
                  value={nextNumber}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    onNextNumberChange(Number.isFinite(n) && n >= 1 ? String(n) : '1');
                  }}
                  placeholder="1"
                />
                <select className="format-select" value={row.format} onChange={(e) => updateRow(row.id, { format: e.target.value })}>
                  {SEQUENCE_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </>
            )}

            <div className="row-actions">
              <button className="row-btn add" title="Add segment below" onClick={() => addRow(row.id)}><Plus size={16} /></button>
              <button className="row-btn delete" title="Remove segment" onClick={() => removeRow(row.id)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {pattern.length === 0 && (
          <button className="add-first-btn" onClick={() => addRow(null)}>
            <Plus size={20} /> Build your document numbering pattern
          </button>
        )}
      </div>
    </div>
  );
};

const Settings = () => {
  const { loadSettings, saveSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('company');
  const [saved, setSaved] = useState(false);
  const [savedForm, setSavedForm] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [form, setForm] = useState({
    company_name: '',
    company_address: '',
    company_email: '',
    company_phone: '',
    company_vat: '',
    company_iban: '',
    company_bic: '',
    default_currency: 'EUR',
    default_tax_rate: '21',
    invoice_next_number: '1',
    quote_next_number: '1',
    invoice_pattern: '[]',
    quote_pattern: '[]',
    // Translations
    trans_invoice_en: 'Invoice',
    trans_invoice_de: 'Rechnung',
    trans_invoice_fr: 'Facture',
    trans_quote_en: 'Quote',
    trans_quote_de: 'Angebot',
    trans_quote_fr: 'Devis',
    trans_date_en: 'Date',
    trans_date_de: 'Datum',
    trans_date_fr: 'Date',
    trans_due_date_en: 'Due Date',
    trans_due_date_de: 'Fälligkeitsdatum',
    trans_due_date_fr: 'Date d\'échéance',
    trans_total_en: 'Total',
    trans_total_de: 'Gesamt',
    trans_total_fr: 'Total',
  });

  useEffect(() => {
    loadSettings().then(s => { setForm(s); setSavedForm(s); });
  }, []);

  const handleSave = async () => {
    setSaveError(null);
    const validatePattern = (str) => {
      try {
        const arr = JSON.parse(str);
        return Array.isArray(arr) && arr.length > 0;
      } catch (e) {
        return false;
      }
    };
    if (!validatePattern(form.invoice_pattern) || !validatePattern(form.quote_pattern)) {
      setSaveError('Invoice/Quote numbering pattern cannot be empty.');
      return;
    }
    try {
      await saveSettings(form);
      setSavedForm({ ...form });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(`Failed to save settings: ${err.message}`);
    }
  };

  const isDirty = savedForm !== null && JSON.stringify(form) !== JSON.stringify(savedForm);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const setDirect = (key, value) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="settings-page">
      <div className="settings-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-body card">
        {activeTab === 'company' && (
          <div className="settings-section">
            <div className="section-title">
              <h2>Company Identity</h2>
              <p>Configure how your business is presented on all generated documents.</p>
            </div>
            <div className="settings-grid">
              <div>
                <label className="input-label">Legal Name</label>
                <input className="input-field" value={form.company_name} onChange={set('company_name')} placeholder="e.g. Michel Munhoven Design" />
              </div>
              <div>
                <label className="input-label">Email for Inquiries</label>
                <input className="input-field" type="email" value={form.company_email} onChange={set('company_email')} placeholder="your@email.com" />
              </div>
              <div>
                <label className="input-label">Contact Number</label>
                <input className="input-field" value={form.company_phone} onChange={set('company_phone')} placeholder="+32 ..." />
              </div>
              <div>
                <label className="input-label">VAT ID</label>
                <input className="input-field" value={form.company_vat} onChange={set('company_vat')} placeholder="BE0000.000.000" />
              </div>
            </div>
            <div className="settings-full">
              <label className="input-label">Official Registered Address</label>
              <textarea
                className="settings-textarea"
                value={form.company_address}
                onChange={set('company_address')}
                placeholder="Street and number&#10;City, Postal Code&#10;Country"
              />
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="settings-section">
            <div className="section-title">
              <h2>Financial Defaults</h2>
              <p>Set default currencies and tax rates to streamline your document creation process.</p>
            </div>
            <div className="settings-grid">
              <div>
                <label className="input-label">Primary Currency</label>
                <select className="input-field" value={form.default_currency} onChange={set('default_currency')}>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                  <option value="CHF">CHF — Swiss Franc</option>
                </select>
              </div>
              <div>
                <label className="input-label">Standard Tax Rate (%)</label>
                <input type="number" className="input-field" value={form.default_tax_rate} onChange={set('default_tax_rate')} />
              </div>
            </div>
            <div className="settings-divider" />
            <div className="section-title">
              <h2>Payment Settlement</h2>
              <p>These bank details will be included in the footer of your PDFs for easy payments.</p>
            </div>
            <div className="settings-grid">
              <div>
                <label className="input-label">IBAN</label>
                <input className="input-field" value={form.company_iban} onChange={set('company_iban')} placeholder="BE00 0000 0000 0000" />
              </div>
              <div>
                <label className="input-label">BIC / SWIFT</label>
                <input className="input-field" value={form.company_bic} onChange={set('company_bic')} placeholder="GEBABEBB" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'numbering' && (
          <div className="settings-section">
            <div className="section-title">
              <h2>Smart Document Numbering</h2>
              <p>Define automated rules for naming your documents. Mix text, dates, and counters.</p>
            </div>

            {isDirty && (
              <div className="unsaved-warning">
                <AlertTriangle size={20} />
                <span>Unsaved changes detected. Remember to save your new configuration.</span>
              </div>
            )}
            
            <NumberingEditor 
              title="Invoice Numbering"
              patternStr={form.invoice_pattern}
              nextNumber={form.invoice_next_number}
              onChange={(val) => setDirect('invoice_pattern', val)}
              onNextNumberChange={(val) => setDirect('invoice_next_number', val)}
            />

            <div className="settings-divider" />

            <NumberingEditor 
              title="Quote Numbering"
              patternStr={form.quote_pattern}
              nextNumber={form.quote_next_number}
              onChange={(val) => setDirect('quote_pattern', val)}
              onNextNumberChange={(val) => setDirect('quote_next_number', val)}
            />
          </div>
        )}

        {activeTab === 'translations' && (
          <div className="settings-section">
            <div className="section-title">
              <h2>PDF Localization</h2>
              <p>Customise how your PDF labels appear in different languages.</p>
            </div>

            <div className="translation-table">
              <div className="translation-table-inner">
                <div className="table-header">
                  <div className="col-key">Document Label</div>
                  <div className="col-lang">English (EN)</div>
                  <div className="col-lang">Deutsch (DE)</div>
                  <div className="col-lang">Français (FR)</div>
                </div>

                {[
                  { id: 'invoice', label: 'Invoice' },
                  { id: 'quote', label: 'Quote' },
                  { id: 'date', label: 'Date' },
                  { id: 'due_date', label: 'Due Date' },
                  { id: 'total', label: 'Total' },
                  { id: 'cash_note', label: 'Cash sale note' },
                ].map(item => (
                  <div key={item.id} className="table-row">
                    <div className="col-key">{item.label}</div>
                    <div className="col-lang"><input value={form[`trans_${item.id}_en`]} onChange={set(`trans_${item.id}_en`)} /></div>
                    <div className="col-lang"><input value={form[`trans_${item.id}_de`]} onChange={set(`trans_${item.id}_de`)} /></div>
                    <div className="col-lang"><input value={form[`trans_${item.id}_fr`]} onChange={set(`trans_${item.id}_fr`)} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="settings-footer">
          {saveError && <div className="page-error" role="alert" style={{ color: '#dc2626', marginBottom: 'var(--space-sm)' }}>{saveError}</div>}
          <Button variant="primary" icon={saved ? RefreshCw : Save} onClick={handleSave}>
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
