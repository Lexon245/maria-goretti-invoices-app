import React from 'react';
import './DocumentPreview.css';

const LABELS = {
  en: {
    description: 'Description',
    qty: 'Qty',
    rate: 'Rate',
    discount: 'Discount',
    subtotal: 'Subtotal',
    tax: 'Tax',
    total: 'Total',
    paymentNote: 'Total amount to be paid to the following bank account:',
  },
  de: {
    description: 'Beschreibung',
    qty: 'Menge',
    rate: 'Satz',
    discount: 'Rabatt',
    subtotal: 'Zwischensumme',
    tax: 'MwSt.',
    total: 'Gesamt',
    paymentNote: 'Gesamtbetrag auf folgendes Bankkonto zu überweisen:',
  },
  fr: {
    description: 'Description',
    qty: 'Quantité',
    rate: 'Taux',
    discount: 'Rabais',
    subtotal: 'Sous-total',
    tax: 'TVA',
    total: 'Total',
    paymentNote: 'Montant total à verser sur le compte bancaire suivant :',
  },
};

const DocumentPreview = ({ doc, sender, client }) => {
  if (!doc) return null;

  const lang = doc.language || 'en';
  const labels = LABELS[lang] || LABELS.en;

  const docTypeLabel = doc.type === 'quote'
    ? (sender?.[`trans_quote_${lang}`] || labels.total)
    : (sender?.[`trans_invoice_${lang}`] || 'Invoice');

  const totalLabel = sender?.[`trans_total_${lang}`] || labels.total;

  const isCash = doc.payment_mode === 'cash';
  const subtotal = doc.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
  const discount = doc.discount_type === '%'
    ? subtotal * (doc.discount_value / 100)
    : doc.discount_value;
  const tax = isCash ? 0 : (subtotal - discount) * (doc.tax_rate / 100);
  const total = subtotal - discount + tax;
  const cashNote = sender?.[`trans_cash_note_${lang}`] || 'Cash sale — VAT not applicable';

  const fmt = (value) =>
    value.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      style: 'currency',
      currency: doc.currency || 'EUR',
    });

  const clientAddress = client
    ? [
        client.address_street,
        [client.address_zip, client.address_city].filter(Boolean).join(' '),
        client.address_country,
      ].filter(Boolean).join('\n')
    : '';

  return (
    <div className="pdf-container">
      <div className="pdf-page">
        <header className="pdf-header">
          <div className="client-info">
            <p><strong>{client?.name || doc.client_name || 'Client Name'}</strong></p>
            <p style={{ whiteSpace: 'pre-line' }}>{clientAddress || 'Client Address'}</p>
          </div>
          <div className="doc-meta-right">
            <p>{sender?.company_name || ''}</p>
            <p>{doc.date}</p>
          </div>
        </header>

        <section className="pdf-subject-section">
          <h2 className="doc-title">
            {docTypeLabel.toUpperCase()} – {doc.number}
          </h2>
          {doc.title && <p className="doc-subject">{doc.title}</p>}
        </section>

        <table className="pdf-table">
          <thead>
            <tr>
              <th className="col-desc">{labels.description}</th>
              <th className="col-qty">{labels.qty}</th>
              <th className="col-rate">{labels.rate}</th>
              <th className="col-total">{labels.total}</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, i) => (
              <tr key={i}>
                <td className="col-desc">
                  <div className="item-description">
                    <strong>{i + 1}. {item.description.split('\n')[0]}</strong>
                    {item.description.split('\n').length > 1 && (
                      <div className="item-details">
                        {item.description.split('\n').slice(1).map((line, idx) => (
                          <div key={idx}>- {line}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="col-qty">{item.qty}</td>
                <td className="col-rate">{fmt(item.rate)}</td>
                <td className="col-total">
                  {fmt(item.qty * item.rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pdf-totals-breakdown">
          <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0' }}>
            <strong>{labels.subtotal}</strong>
            <span>{fmt(subtotal)}</span>
          </div>
          {doc.discount_value > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0' }}>
              <strong>
                {labels.discount}
                {doc.discount_type === '%' ? ` ${doc.discount_value}%` : ''}
              </strong>
              <span>{`-${fmt(discount)}`}</span>
            </div>
          )}
          {!isCash && (
            <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0' }}>
              <strong>{labels.tax}{doc.tax_rate ? ` ${doc.tax_rate}%` : ''}</strong>
              <span>{fmt(tax)}</span>
            </div>
          )}
        </div>

        <div className="pdf-total-bar">
          <div className="total-label">{totalLabel.toUpperCase()}</div>
          <div className="total-value">{fmt(total)}</div>
        </div>

        {isCash && (
          <div className="pdf-cash-note">{cashNote}</div>
        )}

        {doc.notes && (
          <div className="pdf-notes">
            <p style={{ whiteSpace: 'pre-line' }}>{doc.notes}</p>
          </div>
        )}

        <footer className="pdf-footer">
          <p>{labels.paymentNote}</p>
          <div className="bank-details">
            <p><strong>{sender?.company_name || 'Your Name'}</strong></p>
            <p><strong>{sender?.company_iban || 'IBAN'}</strong></p>
            {sender?.company_bic && <p><strong>{sender.company_bic}</strong></p>}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DocumentPreview;
