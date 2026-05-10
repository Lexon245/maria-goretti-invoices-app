import React, { useState, useEffect, useMemo } from 'react';
import useDatabase from '../hooks/useDatabase';
import StatusBadge from '../components/StatusBadge';
import { effectiveStatus } from '../utils/documentLifecycle';
import {
  DollarSign, FileText, Users, Clock, AlertCircle,
  TrendingUp, ArrowUpRight, Plus, Sparkles, Receipt
} from 'lucide-react';
import './Dashboard.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const RANGES = [
  { id: '1m', label: '1M', months: 1 },
  { id: '3m', label: '3M', months: 3 },
  { id: '6m', label: '6M', months: 6 },
  { id: '1y', label: '1Y', months: 12 },
  { id: 'all', label: 'ALL', months: null },
];

// Catmull-Rom → cubic Bézier smoothing for a list of {x,y} points.
const smoothPath = (pts) => {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

const Dashboard = ({ settings, onNewDoc }) => {
  const { query } = useDatabase();
  const [stats, setStats] = useState({
    revenue: 0, paidInvoices: 0, pendingQuotes: 0, totalClients: 0
  });
  const [recentDocs, setRecentDocs] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartRange, setChartRange] = useState('1y');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setError(null);
    try {
      const [invoices, quoteCount, clientCount, recent] = await Promise.all([
        query(`
          SELECT
            d.id, d.status, d.date, d.tax_rate, d.discount_value, d.discount_type, d.payment_mode,
            COALESCE(SUM(di.qty * di.rate), 0) as items_subtotal
          FROM documents d
          LEFT JOIN document_items di ON di.document_id = d.id
          WHERE d.type = 'invoice'
          GROUP BY d.id
        `),
        query(`SELECT COUNT(*) as cnt FROM documents WHERE type = 'quote' AND status IN ('draft','sent')`),
        query(`SELECT COUNT(*) as cnt FROM clients`),
        query(`
          SELECT d.id, d.type, d.number, d.status, d.date, d.due_date, c.name as client_name
          FROM documents d LEFT JOIN clients c ON d.client_id = c.id
          ORDER BY d.created_at DESC LIMIT 6
        `),
      ]);

      let totalRevenue = 0;
      const byMonth = new Map();

      for (const inv of invoices) {
        const subtotal = inv.items_subtotal;
        const discount = inv.discount_type === '%'
          ? subtotal * (inv.discount_value / 100)
          : inv.discount_value;
        const isCash = inv.payment_mode === 'cash';
        const tax = isCash ? 0 : (subtotal - discount) * (inv.tax_rate / 100);
        const total = subtotal - discount + tax;

        if (inv.status === 'paid' && inv.date) {
          const key = inv.date.slice(0, 7);
          byMonth.set(key, (byMonth.get(key) || 0) + total);
          totalRevenue += total;
        }
      }

      // Build last-12 absolute months ending current month
      const now = new Date();
      const series = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        series.push({ key, label: MONTHS[d.getMonth()], value: byMonth.get(key) || 0 });
      }
      // Prepend any earlier months present in data (for 'all' range)
      const earlierKeys = Array.from(byMonth.keys())
        .filter(k => !series.some(s => s.key === k))
        .sort();
      const earlier = earlierKeys.map(k => {
        const [y, m] = k.split('-');
        return { key: k, label: MONTHS[parseInt(m, 10) - 1], value: byMonth.get(k) || 0 };
      });
      const fullSeries = [...earlier, ...series];

      setStats({
        revenue: totalRevenue,
        paidInvoices: invoices.filter(i => i.status === 'paid').length,
        pendingQuotes: quoteCount[0]?.cnt || 0,
        totalClients: clientCount[0]?.cnt || 0,
      });
      setMonthlyRevenue(fullSeries);
      setRecentDocs(recent);
    } catch (_err) {
      setError('Failed to load dashboard data. Please restart the app.');
    } finally {
      setLoading(false);
    }
  };

  const fmtEUR = (v) => (v ?? 0).toLocaleString('de-DE', {
    style: 'currency', currency: settings?.default_currency || 'EUR', maximumFractionDigits: 0
  });

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = (settings?.company_name || 'there').split(/\s+/)[0];

  // Slice monthlyRevenue based on selected range
  const visibleMonths = useMemo(() => {
    if (chartRange === 'all') return monthlyRevenue;
    const months = RANGES.find(r => r.id === chartRange)?.months || 12;
    return monthlyRevenue.slice(-months);
  }, [monthlyRevenue, chartRange]);

  // Generate SVG line chart points
  const chartPoints = useMemo(() => {
    const W = 600;
    const H = 180;
    const padX = 8;
    const padY = 16;
    const max = Math.max(...visibleMonths.map(m => m.value), 1);
    const n = visibleMonths.length;
    if (n === 0) return [];
    const dx = (W - padX * 2) / Math.max(n - 1, 1);
    return visibleMonths.map((m, i) => ({
      x: padX + i * dx,
      y: padY + (H - padY * 2) * (1 - m.value / max),
      v: m.value,
      label: m.label,
    }));
  }, [visibleMonths]);

  const linePath = smoothPath(chartPoints);
  const areaPath = chartPoints.length
    ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} 180 L ${chartPoints[0].x} 180 Z`
    : '';

  const hasData = visibleMonths.some(m => m.value > 0);

  // Chunky stat cards (rendered with explicit color modifier classes)
  const statCards = [
    {
      key: 'revenue',
      label: 'Total Revenue',
      value: loading ? '—' : fmtEUR(stats.revenue),
      icon: DollarSign,
      tone: 'lime',
    },
    {
      key: 'paid',
      label: 'Paid Invoices',
      value: loading ? '—' : stats.paidInvoices,
      icon: Receipt,
      tone: 'dark',
    },
    {
      key: 'quotes',
      label: 'Pending Quotes',
      value: loading ? '—' : stats.pendingQuotes,
      icon: Clock,
      tone: 'indigo',
    },
    {
      key: 'clients',
      label: 'Total Clients',
      value: loading ? '—' : stats.totalClients,
      icon: Users,
      tone: 'pink',
    },
  ];

  return (
    <div className="dashboard">
      {error && (
        <div className="page-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* HERO PROMO CARD */}
      <section className="hero-card">
        <div className="hero-content">
          <span className="hero-eyebrow">
            <Sparkles size={14} /> {greeting}, {firstName}
          </span>
          <h2 className="hero-title">
            Run your billing like a pro <span className="hero-emoji">✦</span>
          </h2>
          <p className="hero-sub">
            Track revenue, send invoices, and stay on top of every quote — all in one place.
          </p>
          <div className="hero-actions">
            <button className="hero-cta" onClick={() => onNewDoc?.('invoice')}>
              <Plus size={16} /> New Invoice
            </button>
            <button className="hero-cta-ghost" onClick={() => onNewDoc?.('quote')}>
              New Quote
            </button>
          </div>
        </div>
        <div className="hero-decor" aria-hidden="true">
          <div className="hero-orb hero-orb-1"><Receipt size={30} /></div>
          <div className="hero-orb hero-orb-2"><FileText size={30} /></div>
          <div className="hero-orb hero-orb-3"><DollarSign size={26} /></div>
          <div className="hero-spark hero-spark-1"></div>
          <div className="hero-spark hero-spark-2"></div>
        </div>
      </section>

      {/* STAT CARDS */}
      <section className="stats-grid">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className={`stat-card stat-${s.tone}`}>
              <div className="stat-icon-wrap">
                <Icon size={22} />
              </div>
              <span className="stat-label">{s.label}</span>
              <div className="stat-value-row">
                <span className="stat-value">{s.value}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* CHART CARD */}
      <section className="chart-card">
        <div className="chart-toolbar">
          <div>
            <h3 className="chart-title">Revenue overview</h3>
            <p className="chart-sub">{new Date().getFullYear()} · paid invoices</p>
          </div>
          <div className="chart-controls">
            <div className="time-pills">
              {RANGES.map(r => (
                <button
                  key={r.id}
                  className={`time-pill ${chartRange === r.id ? 'active' : ''}`}
                  onClick={() => setChartRange(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-area">
          {!hasData && (
            <div className="chart-empty">
              No paid invoices yet — your revenue will appear here.
            </div>
          )}
          <svg
            className="chart-svg"
            viewBox="0 0 600 180"
            preserveAspectRatio="none"
            role="img"
            aria-label="Revenue line chart"
          >
            <defs>
              <linearGradient id="chart-grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(99,102,241,0.30)" />
                <stop offset="100%" stopColor="rgba(99,102,241,0)" />
              </linearGradient>
            </defs>
            {/* horizontal grid lines */}
            {[0.25, 0.5, 0.75].map((p, i) => (
              <line
                key={i}
                x1="0" x2="600"
                y1={180 * p} y2={180 * p}
                stroke="#E2E8F0"
                strokeDasharray="3 5"
              />
            ))}
            {hasData && (
              <>
                <path d={areaPath} fill="url(#chart-grad)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {chartPoints.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x} cy={p.y} r="3.5"
                    fill="#FFFFFF"
                    stroke="#6366F1"
                    strokeWidth="2"
                  />
                ))}
              </>
            )}
          </svg>
          <div className="chart-x-axis">
            {visibleMonths.map((m, i) => (
              <span key={i} className="chart-x-label">{m.label}</span>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM ROW — Recent Docs + Quick Actions panel */}
      <section className="bottom-grid">
        <div className="recent-card">
          <div className="recent-header">
            <h3>Recent Documents</h3>
            <span className="recent-subtle">Latest activity</span>
          </div>
          {recentDocs.length === 0 ? (
            <p className="empty-state">No documents yet. Create your first invoice!</p>
          ) : (
            <div className="recent-list">
              {recentDocs.map(doc => (
                <div key={doc.id} className="recent-item">
                  <div className="recent-avatar">
                    {(doc.client_name || '??').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="recent-main">
                    <span className="recent-num">{doc.number}</span>
                    <span className="recent-client">{doc.client_name || 'No Client'}</span>
                  </div>
                  <div className="recent-meta">
                    <span className="recent-date">{doc.date}</span>
                    <StatusBadge status={effectiveStatus(doc)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="quick-panel">
          <div className="quick-stat">
            <span className="quick-stat-label">This month</span>
            <span className="quick-stat-value">
              {fmtEUR((() => {
                const n = new Date();
                const k = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
                return (monthlyRevenue.find(m => m.key === k)?.value) || 0;
              })())}
            </span>
          </div>

          <div className="quick-actions">
            <h4>Quick actions</h4>
            <button className="quick-btn primary" onClick={() => onNewDoc?.('invoice')}>
              <Plus size={16} /> New Invoice
            </button>
            <button className="quick-btn" onClick={() => onNewDoc?.('quote')}>
              <Plus size={16} /> New Quote
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default Dashboard;
