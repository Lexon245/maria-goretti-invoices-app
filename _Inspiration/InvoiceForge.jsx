import { useState } from "react";

const LIME = "#C8FF00";
const DARK = "#16181D";

const LANG = {
  en: { header:"INVOICE",       billTo:"Bill To",      desc:"Description", qty:"Qty",      rate:"Rate",       tot:"Total",  sub:"Subtotal",      disc:"Discount", tax:"Tax",   due:"Total Due",              pay:"Payment Details", notes:"Notes & Terms",    date:"Date", dueDate:"Due Date", invNo:"Invoice No." },
  fr: { header:"NOTE DE FRAIS", billTo:"Destinataire", desc:"Description", qty:"Quantite", rate:"Taux heure", tot:"Total",  sub:"Sous-total",    disc:"Remise",   tax:"TVA",   due:"Montant total a verser", pay:"Coordonnees banc.", notes:"Notes et cond.",  date:"Date", dueDate:"Echeance",  invNo:"Facture N\u00b0" },
  nl: { header:"FACTUUR",       billTo:"Aan",          desc:"Omschrijving", qty:"Aantal",   rate:"Uurtarief",  tot:"Totaal", sub:"Subtotaal",     disc:"Korting",  tax:"BTW",   due:"Te betalen",             pay:"Bankgegevens",    notes:"Notities",        date:"Datum",dueDate:"Vervaldatum",invNo:"Factuur Nr." },
  de: { header:"RECHNUNG",      billTo:"An",           desc:"Beschreibung", qty:"Menge",    rate:"Stundensatz",tot:"Gesamt", sub:"Zwischensumme", disc:"Rabatt",   tax:"MwSt.", due:"Gesamtbetrag",           pay:"Bankverbindung",  notes:"Anmerkungen",     date:"Datum",dueDate:"Faelligk.",  invNo:"Rechnung Nr." },
};

const CURR = { EUR:"\u20ac", USD:"$", GBP:"\u00a3", CHF:"CHF", CAD:"CA$", JPY:"\u00a5" };

const STATUS = {
  draft:   { label:"Draft",   bg:"#F4F4F4", fg:"#666",    dot:"#999" },
  sent:    { label:"Sent",    bg:"#EEF6FF", fg:"#2563EB", dot:"#2563EB" },
  paid:    { label:"Paid",    bg:"#EDFDF4", fg:"#16A34A", dot:"#16A34A" },
  overdue: { label:"Overdue", bg:"#FFF1F0", fg:"#DC2626", dot:"#DC2626" },
};

function fmt(n, c) {
  var cur = c || "EUR";
  var sym = CURR[cur] || "\u20ac";
  var val = Number(n || 0).toFixed(2);
  if (cur === "USD" || cur === "GBP" || cur === "CAD") return sym + val;
  return val + " " + sym;
}

function cItem(item) {
  return Number(item.qty || 0) * Number(item.rate || 0);
}

function cTots(inv) {
  var items = [];
  var secs = inv.sections || [];
  for (var i = 0; i < secs.length; i++) {
    var sits = secs[i].items || [];
    for (var j = 0; j < sits.length; j++) items.push(sits[j]);
  }
  var sub = items.reduce(function(a, x) { return a + cItem(x); }, 0);
  var disc = inv.discount && inv.discount.enabled
    ? (inv.discount.type === "%" ? sub * (inv.discount.value / 100) : Number(inv.discount.value || 0))
    : 0;
  var tax = inv.taxEnabled ? (sub - disc) * (Number(inv.taxRate || 0) / 100) : 0;
  return { sub: sub, disc: disc, tax: tax, total: sub - disc + tax };
}

function uid() { return Math.random().toString(36).slice(2, 9); }
function mkItem() { return { id: uid(), description: "", qty: 1, rate: 0 }; }
function mkSec(n) { return { id: uid(), title: "Section " + (n || 1), items: [mkItem()] }; }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function genNum() { return new Date().toISOString().slice(0, 10).replace(/-/g, ""); }
function tsNow() { return new Date().toLocaleString("en-GB"); }
function initials(name) {
  if (!name) return "??";
  var parts = name.split(" ");
  return parts.map(function(w) { return w[0] || ""; }).join("").slice(0, 2).toUpperCase();
}

var DEF_BIZ = { name: "Michel Munhoven", address: "", email: "michel@munhoven.be", phone: "", iban: "BE27 7360 4052 7573", bic: "", defaultCurrency: "EUR", defaultLanguage: "fr", defaultTaxRate: 21 };

var CLIENTS0 = [
  { id: "c1", name: "Soc. Royale des Sciences de Liege", contact: "", email: "srsl@uliege.be", phone: "", address: "Institut de Mathematiques (B37)\nQuartier Polytech 1\nAllee de la Decouverte 12\n4000 Liege", vat: "" },
  { id: "c2", name: "Studio Bruxelles", contact: "Sophie Martin", email: "sophie@studiobxl.be", phone: "+32 2 000 00 00", address: "Rue de la Loi 42\n1000 Bruxelles", vat: "BE0123456789" },
];

var INVOICES0 = [
  {
    id: "i1", number: "20241230", date: "2024-12-30", dueDate: "", status: "paid",
    language: "fr", currency: "EUR", template: "minimal",
    title: "Creation d'une identite graphique pour la Societe Royale des Sciences de Liege.",
    client: CLIENTS0[0],
    sender: { name: "Michel Munhoven", address: "", email: "michel@munhoven.be", phone: "", iban: "BE27 7360 4052 7573", bic: "" },
    sections: [{ id: "s1", title: "GRAPHISME", items: [
      { id: "it1", description: "Logo\n- Deux variantes\n- Mise au propre du logo choisi\n- Brand assets (PNG, PDF, SVG)", qty: 6, rate: 50 },
      { id: "it2", description: "Roll-Up\n- Design de Roll-Up base sur l'identite graphique", qty: 1, rate: 50 },
    ]}],
    discount: { enabled: false, type: "%", value: 0 },
    taxEnabled: false, taxRate: 21,
    paymentEnabled: true, paymentDetails: "Michel Munhoven\nBE27 7360 4052 7573",
    notes: "Des reception du paiement integral, le Graphiste accorde une licence exclusive, perpetuelle et mondiale.",
    history: [
      { id: "h1", ts: "30 Dec 2024, 09:14", action: "Invoice created", detail: "Draft created" },
      { id: "h2", ts: "30 Dec 2024, 10:32", action: "Status changed", detail: "Draft -> Sent" },
      { id: "h3", ts: "15 Jan 2025, 14:00", action: "Status changed", detail: "Sent -> Paid" },
    ],
    payments: [{ id: "p1", amount: 350, date: "2025-01-15", note: "Bank transfer received" }],
  },
  {
    id: "i2", number: "20250301", date: "2025-03-01", dueDate: "2025-04-01", status: "overdue",
    language: "en", currency: "EUR", template: "creative",
    title: "Brand identity consultation and website mockup.",
    client: CLIENTS0[1],
    sender: { name: "Michel Munhoven", address: "", email: "michel@munhoven.be", phone: "", iban: "BE27 7360 4052 7573", bic: "" },
    sections: [{ id: "s2", title: "DESIGN & WEB", items: [
      { id: "it3", description: "Brand consultation\n- Strategy session\n- Moodboard creation", qty: 3, rate: 80 },
      { id: "it4", description: "Website mockup (3 pages)", qty: 1, rate: 450 },
    ]}],
    discount: { enabled: true, type: "%", value: 10 },
    taxEnabled: true, taxRate: 21,
    paymentEnabled: true, paymentDetails: "Michel Munhoven\nBE27 7360 4052 7573",
    notes: "Payment due within 30 days of invoice date.",
    history: [
      { id: "h4", ts: "01 Mar 2025, 11:00", action: "Invoice created", detail: "Draft created" },
      { id: "h5", ts: "02 Mar 2025, 09:15", action: "Status changed", detail: "Draft -> Sent" },
    ],
    payments: [],
  },
];

var INP = { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: "8px 11px", color: "var(--color-text-primary)", fontSize: 13, width: "100%", outline: "none", fontFamily: "var(--font-sans)", boxSizing: "border-box" };
var LBTN = { padding: "8px 16px", background: LIME, color: DARK, border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" };
var GBTN = { padding: "8px 14px", background: "var(--color-background-primary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, fontSize: 13, cursor: "pointer" };

function FL(props) {
  return (
    <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", fontWeight: 500, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 4 }}>
      {props.children}
    </div>
  );
}

function Badge(props) {
  var cfg = STATUS[props.status] || STATUS.draft;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: cfg.bg, color: cfg.fg, fontSize: 11, fontWeight: 500 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }}></span>
      {cfg.label}
    </span>
  );
}

function Toggle(props) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: props.checked ? 8 : 0 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>{props.label}</span>
        <div onClick={function() { props.onChange(!props.checked); }} style={{ width: 34, height: 19, borderRadius: 10, background: props.checked ? LIME : "var(--color-border-secondary)", cursor: "pointer", position: "relative", flexShrink: 0 }}>
          <div style={{ position: "absolute", top: 2, left: props.checked ? 17 : 2, width: 15, height: 15, borderRadius: "50%", background: props.checked ? DARK : "var(--color-background-primary)", transition: "left .2s" }}></div>
        </div>
      </div>
      {props.checked && props.children}
    </div>
  );
}

function TRow(props) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: "var(--color-text-secondary)" }}>{props.l}</span>
      <span style={{ color: props.c || "var(--color-text-primary)" }}>{props.v}</span>
    </div>
  );
}

export default function App() {
  var _invs    = useState(INVOICES0);
  var invs     = _invs[0]; var setInvs = _invs[1];
  var _clients = useState(CLIENTS0);
  var clients  = _clients[0]; var setClients = _clients[1];
  var _biz     = useState(DEF_BIZ);
  var biz      = _biz[0]; var setBiz = _biz[1];
  var _view    = useState("dashboard");
  var view     = _view[0]; var setView = _view[1];
  var _editInv = useState(null);
  var editInv  = _editInv[0]; var setEditInv = _editInv[1];
  var _detInv  = useState(null);
  var detInv   = _detInv[0]; var setDetInv = _detInv[1];

  function saveInv(inv) {
    var entry = { id: uid(), ts: tsNow(), action: "Invoice saved", detail: "" };
    var upd = Object.assign({}, inv, { history: (inv.history || []).concat([entry]) });
    setInvs(function(p) {
      return p.find(function(i) { return i.id === inv.id; })
        ? p.map(function(i) { return i.id === inv.id ? upd : i; })
        : [upd].concat(p);
    });
  }

  function newInv() {
    var inv = {
      id: uid(), number: genNum(), date: todayStr(), dueDate: "", status: "draft",
      language: biz.defaultLanguage, currency: biz.defaultCurrency, template: "minimal",
      title: "", client: null,
      sender: { name: biz.name, address: biz.address, email: biz.email, phone: biz.phone, iban: biz.iban, bic: biz.bic },
      sections: [mkSec(1)],
      discount: { enabled: false, type: "%", value: 0 },
      taxEnabled: false, taxRate: biz.defaultTaxRate,
      paymentEnabled: true, paymentDetails: biz.name + "\n" + biz.iban,
      notes: "",
      history: [{ id: uid(), ts: tsNow(), action: "Invoice created", detail: "New draft" }],
      payments: [],
    };
    setEditInv(inv);
    setView("editor");
  }

  function setStatus(id, s) {
    setInvs(function(p) {
      return p.map(function(i) {
        if (i.id !== id) return i;
        var entry = { id: uid(), ts: tsNow(), action: "Status changed", detail: "-> " + STATUS[s].label };
        return Object.assign({}, i, { status: s, history: (i.history || []).concat([entry]) });
      });
    });
  }

  function addPayment(id, pay) {
    setInvs(function(p) {
      return p.map(function(i) {
        if (i.id !== id) return i;
        var entry = { id: uid(), ts: tsNow(), action: "Payment recorded", detail: fmt(pay.amount, i.currency) + " - " + pay.note };
        return Object.assign({}, i, {
          payments: (i.payments || []).concat([pay]),
          history: (i.history || []).concat([entry]),
        });
      });
    });
  }

  return (
    <div style={{ display: "flex", minHeight: 720, fontFamily: "var(--font-sans)", color: "var(--color-text-primary)", fontSize: 14, background: "var(--color-background-tertiary)" }}>
      <Sidebar view={view} setView={setView} onNew={newInv} biz={biz} />
      <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
        {view === "dashboard" && (
          <Dashboard
            invs={invs} clients={clients} onNew={newInv}
            onEdit={function(inv) { setEditInv(inv); setView("editor"); }}
            onDetail={function(inv) { setDetInv(inv); setView("detail"); }}
            onStatus={setStatus}
          />
        )}
        {view === "editor" && editInv && (
          <Editor
            inv={editInv} clients={clients} biz={biz}
            onSave={function(inv) { saveInv(inv); setView("dashboard"); }}
            onDetail={function(inv) { saveInv(inv); setDetInv(inv); setView("detail"); }}
            onCancel={function() { setView("dashboard"); }}
          />
        )}
        {view === "detail" && detInv && (
          <Detail
            inv={invs.find(function(i) { return i.id === detInv.id; }) || detInv}
            onBack={function() { setView("dashboard"); }}
            onEdit={function(inv) { setEditInv(inv); setView("editor"); }}
            onStatus={setStatus}
            onPay={addPayment}
          />
        )}
        {view === "clients" && <Clients clients={clients} setClients={setClients} />}
        {view === "settings" && <SettingsPage biz={biz} setBiz={setBiz} />}
      </div>
    </div>
  );
}

function Sidebar(props) {
  var view = props.view; var setView = props.setView; var onNew = props.onNew; var biz = props.biz;
  var nav = [
    { id: "dashboard", label: "Invoices", icon: "\u25a6" },
    { id: "clients",   label: "Clients",  icon: "\u25c9" },
    { id: "settings",  label: "Settings", icon: "\u2699" },
  ];
  return (
    <div style={{ width: 196, flexShrink: 0, background: "var(--color-background-secondary)", borderRight: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 16px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: LIME, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: DARK, flexShrink: 0 }}>IF</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>InvoiceForge</div>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 1 }}>by {biz.name.split(" ")[0]}</div>
        </div>
      </div>
      <div style={{ padding: "12px 12px 6px" }}>
        <button onClick={onNew} style={Object.assign({}, LBTN, { width: "100%", padding: "9px 0" })}>+ New Invoice</button>
      </div>
      <nav style={{ flex: 1, padding: "6px 0" }}>
        {nav.map(function(item) {
          var a = view === item.id;
          return (
            <button key={item.id} onClick={function() { setView(item.id); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", background: a ? "var(--color-background-primary)" : "transparent", border: "none", borderLeft: "2.5px solid " + (a ? LIME : "transparent"), color: a ? "var(--color-text-primary)" : "var(--color-text-secondary)", fontSize: 13, fontWeight: a ? 500 : 400, textAlign: "left", cursor: "pointer" }}>
              <span style={{ fontSize: 12, color: a ? LIME : "var(--color-text-tertiary)" }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "12px 16px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: LIME, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: DARK, flexShrink: 0 }}>{initials(biz.name)}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{biz.name}</div>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{biz.email}</div>
        </div>
      </div>
    </div>
  );
}

function Dashboard(props) {
  var invs = props.invs; var clients = props.clients; var onNew = props.onNew;
  var onEdit = props.onEdit; var onDetail = props.onDetail; var onStatus = props.onStatus;

  var _filter = useState("all"); var filter = _filter[0]; var setFilter = _filter[1];
  var _search = useState(""); var search = _search[0]; var setSearch = _search[1];
  var _sel = useState([]); var sel = _sel[0]; var setSel = _sel[1];

  var filtered = invs.filter(function(inv) {
    if (filter !== "all" && inv.status !== filter) return false;
    if (search) {
      var q = search.toLowerCase();
      var clientName = inv.client ? inv.client.name.toLowerCase() : "";
      if (!inv.number.includes(q) && !clientName.includes(q)) return false;
    }
    return true;
  });

  var statDefs = [
    { id: "all",     label: "All Invoice" },
    { id: "draft",   label: "Draft" },
    { id: "sent",    label: "Open Invoice" },
    { id: "overdue", label: "Overdue" },
    { id: "paid",    label: "Paid" },
  ];
  var trends = { all: "+20.9%", draft: "-5.9%", sent: "+20.9%", overdue: "+60.2%", paid: "-5.9%" };
  var trendUp = { all: true, draft: false, sent: true, overdue: false, paid: true };

  var allSel = filtered.length > 0 && filtered.every(function(i) { return sel.includes(i.id); });

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Invoice</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={Object.assign({}, GBTN, { display: "flex", alignItems: "center", gap: 6 })}>Export</button>
          <button onClick={onNew} style={Object.assign({}, LBTN, { display: "flex", alignItems: "center", gap: 6 })}>+ Create Invoice</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 10, marginBottom: 24 }}>
        {statDefs.map(function(st) {
          var group = st.id === "all" ? invs : invs.filter(function(i) { return i.status === st.id; });
          var amount = group.reduce(function(s, i) { return s + cTots(i).total; }, 0);
          var active = filter === st.id;
          return (
            <div key={st.id} onClick={function() { setFilter(st.id); }} style={{ background: "var(--color-background-primary)", borderRadius: 12, padding: "16px 18px", border: active ? "2px solid " + LIME : "0.5px solid var(--color-border-tertiary)", cursor: "pointer" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: 8 }}>{st.label} ({group.length})</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>{"\u20ac"}{Math.round(amount).toLocaleString()}</div>
              <div style={{ fontSize: 11, marginTop: 4, color: trendUp[st.id] ? "#16A34A" : "#DC2626" }}>{trendUp[st.id] ? "+" : "-"} {trends[st.id]}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="Search invoices..." style={Object.assign({}, INP, { flex: "0 0 220px" })} />
        <button style={Object.assign({}, GBTN, { marginLeft: "auto", fontSize: 12 })}>More filters</button>
      </div>

      <div style={{ background: "var(--color-background-primary)", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "36px 1.6fr 120px 100px 110px 120px 120px 40px", padding: "10px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
          <div>
            <input type="checkbox" checked={allSel} onChange={function(e) { e.target.checked ? setSel(filtered.map(function(i) { return i.id; })) : setSel([]); }} style={{ cursor: "pointer" }} />
          </div>
          {["Customer","Invoice","Status","Amount","Issue Date","Due Date",""].map(function(h, i) {
            return <div key={i} style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</div>;
          })}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--color-text-tertiary)" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>[ ]</div>
            <div style={{ marginBottom: 16 }}>No invoices found</div>
            <button onClick={onNew} style={LBTN}>Create first invoice</button>
          </div>
        ) : filtered.map(function(inv, i) {
          var total = cTots(inv).total;
          return (
            <div key={inv.id}
              style={{ display: "grid", gridTemplateColumns: "36px 1.6fr 120px 100px 110px 120px 120px 40px", padding: "12px 16px", borderBottom: i < filtered.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", alignItems: "center" }}
              onMouseEnter={function(e) { e.currentTarget.style.background = "var(--color-background-secondary)"; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = "transparent"; }}
            >
              <div onClick={function(e) { e.stopPropagation(); }}>
                <input type="checkbox" checked={sel.includes(inv.id)} onChange={function() { setSel(function(p) { return p.includes(inv.id) ? p.filter(function(x) { return x !== inv.id; }) : p.concat([inv.id]); }); }} style={{ cursor: "pointer" }} />
              </div>
              <div onClick={function() { onDetail(inv); }} style={{ cursor: "pointer" }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{inv.client ? inv.client.name : <span style={{ color: "var(--color-text-tertiary)" }}>No client</span>}</div>
                {inv.title ? <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 1, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.title}</div> : null}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>F-{inv.number}</div>
              <div><Badge status={inv.status} /></div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{fmt(total, inv.currency)}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{inv.date}</div>
              <div style={{ fontSize: 12, color: inv.status === "overdue" ? "#DC2626" : "var(--color-text-secondary)" }}>{inv.dueDate || "-"}</div>
              <ActMenu inv={inv} onEdit={function() { onEdit(inv); }} onDetail={function() { onDetail(inv); }} onStatus={onStatus} />
            </div>
          );
        })}

        {filtered.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
            <button style={Object.assign({}, GBTN, { fontSize: 12, padding: "5px 12px" })}>Previous</button>
            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Page 1 of 1 - {filtered.length} records</span>
            <button style={Object.assign({}, GBTN, { fontSize: 12, padding: "5px 12px" })}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActMenu(props) {
  var inv = props.inv; var onEdit = props.onEdit; var onDetail = props.onDetail; var onStatus = props.onStatus;
  var _open = useState(false); var open = _open[0]; var setOpen = _open[1];
  return (
    <div style={{ position: "relative" }}>
      <button onClick={function(e) { e.stopPropagation(); setOpen(function(p) { return !p; }); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 16, padding: "4px 8px", borderRadius: 6 }}>...</button>
      {open && (
        <div onMouseLeave={function() { setOpen(false); }} style={{ position: "absolute", right: 0, top: "100%", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, zIndex: 200, minWidth: 148, boxShadow: "0 4px 16px rgba(0,0,0,.1)", overflow: "hidden" }}>
          <div onClick={function() { onEdit(); setOpen(false); }} style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", borderBottom: "0.5px solid var(--color-border-tertiary)" }} onMouseEnter={function(e) { e.currentTarget.style.background = "var(--color-background-secondary)"; }} onMouseLeave={function(e) { e.currentTarget.style.background = "transparent"; }}>Edit</div>
          <div onClick={function() { onDetail(); setOpen(false); }} style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", borderBottom: "0.5px solid var(--color-border-tertiary)" }} onMouseEnter={function(e) { e.currentTarget.style.background = "var(--color-background-secondary)"; }} onMouseLeave={function(e) { e.currentTarget.style.background = "transparent"; }}>View details</div>
          {Object.keys(STATUS).filter(function(k) { return k !== inv.status; }).map(function(k) {
            return (
              <div key={k} onClick={function() { onStatus(inv.id, k); setOpen(false); }} style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer" }} onMouseEnter={function(e) { e.currentTarget.style.background = "var(--color-background-secondary)"; }} onMouseLeave={function(e) { e.currentTarget.style.background = "transparent"; }}>Mark as {STATUS[k].label}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Editor(props) {
  var initInv = props.inv; var clients = props.clients; var biz = props.biz;
  var onSave = props.onSave; var onDetail = props.onDetail; var onCancel = props.onCancel;

  var _inv = useState(initInv); var inv = _inv[0]; var setI = _inv[1];
  var _pt  = useState("invoice"); var prevTab = _pt[0]; var setPT = _pt[1];
  var _al  = useState(false); var aiLoad = _al[0]; var setAL = _al[1];
  var _ar  = useState(null); var aiRes = _ar[0]; var setAR = _ar[1];
  var _dd  = useState(false); var dd = _dd[0]; var setDD = _dd[1];
  var _cq  = useState(""); var cq = _cq[0]; var setCQ = _cq[1];

  function u(f, v) { setI(function(p) { var n = Object.assign({}, p); n[f] = v; return n; }); }
  function uS(f, v) { setI(function(p) { return Object.assign({}, p, { sender: Object.assign({}, p.sender, { [f]: v }) }); }); }
  function uD(f, v) { setI(function(p) { return Object.assign({}, p, { discount: Object.assign({}, p.discount, { [f]: v }) }); }); }

  function aS() {
    setI(function(p) { return Object.assign({}, p, { sections: p.sections.concat([mkSec(p.sections.length + 1)]) }); });
  }
  function dS(id) {
    setI(function(p) { return Object.assign({}, p, { sections: p.sections.filter(function(s) { return s.id !== id; }) }); });
  }
  function uSc(id, f, v) {
    setI(function(p) { return Object.assign({}, p, { sections: p.sections.map(function(s) { if (s.id !== id) return s; var ns = Object.assign({}, s); ns[f] = v; return ns; }) }); });
  }
  function aI(sid) {
    setI(function(p) { return Object.assign({}, p, { sections: p.sections.map(function(s) { return s.id === sid ? Object.assign({}, s, { items: s.items.concat([mkItem()]) }) : s; }) }); });
  }
  function dI(sid, iid) {
    setI(function(p) { return Object.assign({}, p, { sections: p.sections.map(function(s) { return s.id === sid ? Object.assign({}, s, { items: s.items.filter(function(i) { return i.id !== iid; }) }) : s; }) }); });
  }
  function uI(sid, iid, f, v) {
    setI(function(p) {
      return Object.assign({}, p, { sections: p.sections.map(function(s) {
        if (s.id !== sid) return s;
        return Object.assign({}, s, { items: s.items.map(function(i) {
          if (i.id !== iid) return i;
          var ni = Object.assign({}, i); ni[f] = v; return ni;
        })});
      })});
    });
  }

  var tots = cTots(inv);
  var t = LANG[inv.language] || LANG.en;

  function fetchAI() {
    var title = inv.title || "";
    var secTitle = inv.sections && inv.sections[0] ? inv.sections[0].title : "";
    var firstDesc = inv.sections && inv.sections[0] && inv.sections[0].items && inv.sections[0].items[0] ? inv.sections[0].items[0].description : "";
    var ctx = [title, secTitle, firstDesc].filter(Boolean).join(" - ");
    if (!ctx.trim()) { alert("Add a title or item description first."); return; }
    setAL(true); setAR(null);
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 700, messages: [{ role: "user", content: "Freelance graphic designer invoice context: \"" + ctx + "\". Suggest 2-3 complementary line items. Return ONLY a raw JSON array like: [{\"description\":\"Name\",\"qty\":1,\"rate\":75}]. No markdown." }] })
    }).then(function(r) { return r.json(); }).then(function(data) {
      var text = (data.content && data.content[0] ? data.content[0].text : "").replace(/```json|```/g, "").trim();
      setAR(JSON.parse(text));
    }).catch(function(e) { console.error(e); }).finally(function() { setAL(false); });
  }

  function applyAI() {
    if (!aiRes || !inv.sections[0]) return;
    var items = aiRes.map(function(x) { return { id: uid(), description: x.description || "", qty: x.qty || 1, rate: x.rate || 0 }; });
    var sid = inv.sections[0].id;
    setI(function(p) { return Object.assign({}, p, { sections: p.sections.map(function(s) { return s.id === sid ? Object.assign({}, s, { items: s.items.concat(items) }) : s; }) }); });
    setAR(null);
  }

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 700 }}>
      <div style={{ flex: "0 0 54%", minWidth: 0, background: "var(--color-background-primary)", borderRight: "0.5px solid var(--color-border-tertiary)", overflow: "auto", padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 20, padding: 0 }}>&larr;</button>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Create Invoice</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={Object.assign({}, GBTN, { fontSize: 12 })}>More Details</button>
            <button onClick={function() { setPT(function(p) { return p === "email" ? "invoice" : "email"; }); }} style={Object.assign({}, GBTN, { fontSize: 12 })}>{prevTab === "email" ? "Show Invoice" : "Show Email"}</button>
            <button onClick={function() { onDetail(inv); }} style={Object.assign({}, LBTN, { fontSize: 12, padding: "7px 14px" })}>Review Invoice</button>
          </div>
        </div>

        <div style={{ background: DARK, color: "#fff", borderRadius: 12, padding: "18px 22px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: LIME, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: DARK, flexShrink: 0 }}>{initials(inv.sender.name)}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{inv.sender.name || "Your Name"}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>{inv.sender.email || "your@email.com"}</div>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "rgba(255,255,255,0.45)", whiteSpace: "pre-line", lineHeight: 1.7 }}>{inv.sender.address || "Add address in Settings"}</div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Invoice info #{inv.number}</div>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "16px 18px", marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><FL>Invoice Number</FL><input value={inv.number} onChange={function(e) { u("number", e.target.value); }} style={INP} /></div>
            <div><FL>Issue Date</FL><input type="date" value={inv.date} onChange={function(e) { u("date", e.target.value); }} style={INP} /></div>
            <div>
              <FL>Customer</FL>
              <div style={{ position: "relative" }}>
                <input value={inv.client ? inv.client.name : cq} onChange={function(e) { setCQ(e.target.value); setDD(true); if (!e.target.value) u("client", null); }} onFocus={function() { setDD(true); }} placeholder="Search..." style={INP} />
                {dd && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, zIndex: 300, maxHeight: 160, overflow: "auto", boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}>
                    {clients.filter(function(c) { return !cq || c.name.toLowerCase().includes(cq.toLowerCase()); }).map(function(c) {
                      return (
                        <div key={c.id} onClick={function() { u("client", c); setDD(false); setCQ(""); }} style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13, borderBottom: "0.5px solid var(--color-border-tertiary)" }} onMouseEnter={function(e) { e.currentTarget.style.background = "var(--color-background-secondary)"; }} onMouseLeave={function(e) { e.currentTarget.style.background = "transparent"; }}>
                          <div style={{ fontWeight: 500 }}>{c.name}</div>
                          {c.address ? <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{c.address.split("\n")[0]}</div> : null}
                        </div>
                      );
                    })}
                    <div onClick={function() { setDD(false); }} style={{ padding: "7px 12px", fontSize: 12, color: "var(--color-text-tertiary)", cursor: "pointer", textAlign: "center" }}>Close</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><FL>Due Date</FL><input type="date" value={inv.dueDate} onChange={function(e) { u("dueDate", e.target.value); }} style={INP} /></div>
            <div><FL>Currency</FL>
              <select value={inv.currency} onChange={function(e) { u("currency", e.target.value); }} style={INP}>
                {Object.keys(CURR).map(function(k) { return <option key={k} value={k}>{k}</option>; })}
              </select>
            </div>
            <div><FL>Language</FL>
              <select value={inv.language} onChange={function(e) { u("language", e.target.value); }} style={INP}>
                <option value="en">English</option>
                <option value="fr">Francais</option>
                <option value="nl">Nederlands</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            <div><FL>Template</FL>
              <select value={inv.template} onChange={function(e) { u("template", e.target.value); }} style={INP}>
                <option value="minimal">Minimal</option>
                <option value="creative">Creative</option>
              </select>
            </div>
          </div>
          <div><FL>Subject / Object</FL><input value={inv.title} onChange={function(e) { u("title", e.target.value); }} placeholder="Describe the work performed..." style={INP} /></div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Item</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={fetchAI} disabled={aiLoad} style={{ padding: "5px 11px", background: "rgba(200,255,0,0.1)", color: "#5A7A00", border: "0.5px solid rgba(200,255,0,0.5)", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>{aiLoad ? "Thinking..." : "AI Suggest"}</button>
            <button onClick={aS} style={Object.assign({}, GBTN, { fontSize: 12, padding: "5px 11px" })}>+ Add Section</button>
          </div>
        </div>

        {aiRes && (
          <div style={{ background: "rgba(200,255,0,0.07)", border: "0.5px solid " + LIME, borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#5A7A00", marginBottom: 8 }}>AI Suggested Items</div>
            {aiRes.map(function(x, i) {
              var desc = x.description ? x.description.split("\n")[0] : "";
              return (
                <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>
                  <strong>{desc}</strong>
                  <span style={{ marginLeft: 8, color: "var(--color-text-tertiary)" }}>{x.qty}x {fmt(x.rate, inv.currency)}</span>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={applyAI} style={Object.assign({}, LBTN, { fontSize: 12, padding: "5px 12px" })}>Add to invoice</button>
              <button onClick={function() { setAR(null); }} style={Object.assign({}, GBTN, { fontSize: 12, padding: "5px 12px" })}>Dismiss</button>
            </div>
          </div>
        )}

        {inv.sections.map(function(sec, si) {
          return (
            <div key={sec.id} style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <input value={sec.title} onChange={function(e) { uSc(sec.id, "title", e.target.value); }} placeholder={"Section " + (si + 1) + " name..."} style={Object.assign({}, INP, { fontWeight: 600, flex: 1 })} />
                {inv.sections.length > 1 && <button onClick={function() { dS(sec.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 18 }}>x</button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 54px 88px 88px 28px", gap: 6, marginBottom: 4 }}>
                {["Name / Description","Qty","Unit Price","Amount",""].map(function(h, i) {
                  return <div key={i} style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.4, textAlign: i > 0 ? "right" : "left" }}>{h}</div>;
                })}
              </div>
              {sec.items.map(function(item) {
                return (
                  <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 54px 88px 88px 28px", gap: 6, marginBottom: 6, alignItems: "start" }}>
                    <textarea value={item.description} onChange={function(e) { uI(sec.id, item.id, "description", e.target.value); }} rows={2} style={Object.assign({}, INP, { resize: "vertical", minHeight: 46 })} placeholder="Description..." />
                    <input type="number" min="0" value={item.qty} onChange={function(e) { uI(sec.id, item.id, "qty", e.target.value); }} style={Object.assign({}, INP, { textAlign: "right" })} />
                    <input type="number" min="0" value={item.rate} onChange={function(e) { uI(sec.id, item.id, "rate", e.target.value); }} style={Object.assign({}, INP, { textAlign: "right" })} />
                    <div style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, fontSize: 13 }}>{fmt(cItem(item), inv.currency)}</div>
                    <button onClick={function() { dI(sec.id, item.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 18, paddingTop: 7 }}>x</button>
                  </div>
                );
              })}
              <button onClick={function() { aI(sec.id); }} style={{ width: "100%", padding: "6px 0", border: "0.5px dashed var(--color-border-secondary)", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer" }}>+ Add Item</button>
            </div>
          );
        })}

        <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
          <Toggle label="Add Invoice Discount" checked={inv.discount.enabled} onChange={function(v) { uD("enabled", v); }}>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={inv.discount.type} onChange={function(e) { uD("type", e.target.value); }} style={Object.assign({}, INP, { flex: "0 0 80px" })}>
                <option value="%">%</option>
                <option value="fixed">Fixed</option>
              </select>
              <input type="number" min="0" value={inv.discount.value} onChange={function(e) { uD("value", e.target.value); }} style={INP} />
            </div>
          </Toggle>
          <Toggle label="VAT Applicable" checked={inv.taxEnabled} onChange={function(v) { u("taxEnabled", v); }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="number" min="0" max="100" value={inv.taxRate} onChange={function(e) { u("taxRate", e.target.value); }} style={Object.assign({}, INP, { width: 80 })} />
              <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>%</span>
            </div>
          </Toggle>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <div style={{ minWidth: 268, background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px 16px" }}>
            <TRow l="Sub Total" v={fmt(tots.sub, inv.currency)} />
            {inv.discount.enabled ? <TRow l={"Discount (" + (inv.discount.type === "%" ? inv.discount.value + "%" : "fixed") + ")"} v={"-" + fmt(tots.disc, inv.currency)} c="#DC2626" /> : null}
            {inv.taxEnabled ? <TRow l={"Tax (" + inv.taxRate + "%)"} v={fmt(tots.tax, inv.currency)} /> : null}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid var(--color-border-secondary)", paddingTop: 10, marginTop: 8, fontWeight: 700, fontSize: 15 }}>
              <span>Total</span><span>{fmt(tots.total, inv.currency)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px 16px" }}>
            <Toggle label="Payment Details" checked={inv.paymentEnabled} onChange={function(v) { u("paymentEnabled", v); }}>
              <textarea value={inv.paymentDetails} onChange={function(e) { u("paymentDetails", e.target.value); }} rows={3} style={Object.assign({}, INP, { resize: "vertical" })} placeholder="IBAN, bank name..." />
            </Toggle>
          </div>
          <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px 16px" }}>
            <FL>Notes / Terms</FL>
            <textarea value={inv.notes} onChange={function(e) { u("notes", e.target.value); }} rows={4} style={Object.assign({}, INP, { resize: "vertical" })} placeholder="License terms, conditions..." />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <button onClick={onCancel} style={GBTN}>Cancel</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={function() { onSave(Object.assign({}, inv, { status: "draft" })); }} style={GBTN}>Save as Draft</button>
            <button onClick={function() { onSave(inv); }} style={LBTN}>Save</button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, background: "var(--color-background-tertiary)", padding: "20px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>Preview</div>
          <div style={{ display: "flex", gap: 0, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, overflow: "hidden" }}>
            {["invoice", "email"].map(function(tab) {
              return (
                <button key={tab} onClick={function() { setPT(tab); }} style={{ padding: "5px 12px", border: "none", background: prevTab === tab ? "var(--color-background-primary)" : "transparent", color: prevTab === tab ? "var(--color-text-primary)" : "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", fontWeight: prevTab === tab ? 500 : 400, textTransform: "capitalize" }}>{tab === "invoice" ? "Invoice" : "Email"}</button>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {prevTab === "invoice" ? (
            <div style={{ transformOrigin: "top left", transform: "scale(0.58)", width: "172%", pointerEvents: "none" }}>
              {inv.template === "minimal" ? <MinTpl inv={inv} t={t} tots={tots} /> : <CreTpl inv={inv} t={t} tots={tots} />}
            </div>
          ) : (
            <EmailPrev inv={inv} tots={tots} />
          )}
        </div>
      </div>
    </div>
  );
}

function Detail(props) {
  var inv = props.inv; var onBack = props.onBack; var onEdit = props.onEdit;
  var onStatus = props.onStatus; var onPay = props.onPay;

  var _tab  = useState("invoice"); var tab = _tab[0]; var setTab = _tab[1];
  var _sp   = useState(false); var showPay = _sp[0]; var setSP = _sp[1];
  var _payF = useState({ amount: "", date: todayStr(), note: "" }); var payF = _payF[0]; var setPF = _payF[1];

  var tots = cTots(inv);
  var paid = (inv.payments || []).reduce(function(s, p) { return s + p.amount; }, 0);
  var open = Math.max(0, tots.total - paid);
  var t = LANG[inv.language] || LANG.en;
  var lastPay = inv.payments && inv.payments.length > 0 ? inv.payments[inv.payments.length - 1] : null;

  function handlePay() {
    if (!payF.amount) return;
    onPay(inv.id, { id: uid(), amount: Number(payF.amount), date: payF.date, note: payF.note });
    setSP(false); setPF({ amount: "", date: todayStr(), note: "" });
  }

  var statBlocks = [
    ["Total Amount",  fmt(tots.total, inv.currency), "var(--color-text-primary)"],
    ["Open Amount",   fmt(open, inv.currency),        open > 0 ? "#DC2626" : "#16A34A"],
    ["VAT Amount",    fmt(tots.tax, inv.currency),    "var(--color-text-secondary)"],
    ["Due Date",      inv.dueDate || "-",              "var(--color-text-secondary)"],
    ["Paid On",       paid > 0 && lastPay ? lastPay.date : "-", "var(--color-text-secondary)"],
    ["Client",        inv.client ? inv.client.name.split(" ").slice(0, 2).join(" ") : "-", "var(--color-text-secondary)"],
  ];

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 700 }}>
      <div style={{ flex: "0 0 48%", background: "var(--color-background-primary)", borderRight: "0.5px solid var(--color-border-tertiary)", overflow: "auto", padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 20, padding: 0 }}>&larr;</button>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Invoice #F-{inv.number}</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {inv.status !== "paid" && (
              <button onClick={function() { onStatus(inv.id, "paid"); }} style={Object.assign({}, GBTN, { fontSize: 12 })}>Mark as Paid</button>
            )}
            <button onClick={function() { onEdit(inv); }} style={Object.assign({}, GBTN, { fontSize: 12 })}>Edit</button>
            <button onClick={function() { window.print(); }} style={Object.assign({}, LBTN, { fontSize: 12, padding: "7px 14px" })}>Send</button>
          </div>
        </div>

        {inv.status === "overdue" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#FFF1F0", border: "0.5px solid #FECACA", borderRadius: 8, marginBottom: 16 }}>
            <Badge status="overdue" />
            <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 500 }}>
              {inv.dueDate ? Math.max(0, Math.floor((Date.now() - new Date(inv.dueDate)) / 86400000)) + " days overdue" : "Past due date"}
            </span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, marginBottom: 20 }}>
          {statBlocks.map(function(sb) {
            return (
              <div key={sb[0]} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{sb[0]}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: sb[2] }}>{sb[1]}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 16 }}>
          {[["invoice","Invoice"],["history","History"],["email","Email"]].map(function(pair) {
            return (
              <button key={pair[0]} onClick={function() { setTab(pair[0]); }} style={{ padding: "8px 16px", border: "none", background: "transparent", fontSize: 13, fontWeight: tab === pair[0] ? 500 : 400, color: tab === pair[0] ? "var(--color-text-primary)" : "var(--color-text-secondary)", cursor: "pointer", borderBottom: tab === pair[0] ? "2.5px solid " + LIME : "2.5px solid transparent" }}>{pair[1]}</button>
            );
          })}
        </div>

        {tab === "invoice" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Payments</div>
              <button onClick={function() { setSP(function(p) { return !p; }); }} style={Object.assign({}, LBTN, { fontSize: 12, padding: "5px 12px" })}>+ Add</button>
            </div>
            {showPay && (
              <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px", marginBottom: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div><FL>Amount</FL><input type="number" value={payF.amount} onChange={function(e) { setPF(function(p) { return Object.assign({}, p, { amount: e.target.value }); }); }} style={INP} placeholder="0.00" /></div>
                  <div><FL>Date</FL><input type="date" value={payF.date} onChange={function(e) { setPF(function(p) { return Object.assign({}, p, { date: e.target.value }); }); }} style={INP} /></div>
                  <div style={{ gridColumn: "1/-1" }}><FL>Note</FL><input value={payF.note} onChange={function(e) { setPF(function(p) { return Object.assign({}, p, { note: e.target.value }); }); }} style={INP} placeholder="e.g. Bank transfer" /></div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handlePay} style={Object.assign({}, LBTN, { fontSize: 12 })}>Save</button>
                  <button onClick={function() { setSP(false); }} style={Object.assign({}, GBTN, { fontSize: 12 })}>Cancel</button>
                </div>
              </div>
            )}
            {(inv.payments || []).length === 0 && !showPay && (
              <div style={{ padding: "16px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 12 }}>No payments recorded yet</div>
            )}
            {(inv.payments || []).map(function(p) {
              return (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", background: "var(--color-background-secondary)", borderRadius: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{fmt(p.amount, inv.currency)}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Paid on {p.date}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 500 }}>✓ {p.note || "Manual entry"}</div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "history" && (
          <div>
            {(inv.history || []).slice().reverse().map(function(h, i, arr) {
              return (
                <div key={h.id} style={{ display: "flex", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: LIME, border: "2px solid " + DARK, flexShrink: 0, marginTop: 3 }}></div>
                    {i < arr.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 20, background: "var(--color-border-tertiary)" }}></div>}
                  </div>
                  <div style={{ paddingBottom: 16 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{h.action}</div>
                    {h.detail ? <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 1 }}>{h.detail}</div> : null}
                    <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>{h.ts}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "email" && <EmailPrev inv={inv} tots={tots} />}
      </div>

      <div style={{ flex: 1, background: "var(--color-background-tertiary)", padding: "24px", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>Invoice preview</span>
          <button onClick={function() { window.print(); }} style={Object.assign({}, GBTN, { fontSize: 12 })}>Print / PDF</button>
        </div>
        <div style={{ transformOrigin: "top left", transform: "scale(0.60)", width: "166%", pointerEvents: "none" }}>
          {inv.template === "minimal" ? <MinTpl inv={inv} t={t} tots={tots} /> : <CreTpl inv={inv} t={t} tots={tots} />}
        </div>
      </div>
    </div>
  );
}

function EmailPrev(props) {
  var inv = props.inv; var tots = props.tots;
  return (
    <div style={{ maxWidth: 440, margin: "0 auto" }}>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "12px 16px", marginBottom: 10, fontSize: 12 }}>
        <div style={{ color: "var(--color-text-tertiary)", marginBottom: 3 }}>Updates to invoice F-{inv.number}</div>
        <div style={{ color: "var(--color-text-secondary)" }}>To: {inv.client ? inv.client.email || "client@example.com" : "client@example.com"}</div>
      </div>
      <div style={{ background: LIME, borderRadius: 10, padding: "22px", textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 2 }}>{inv.sender.name || "InvoiceForge"} -</div>
        <div style={{ fontSize: 11, color: "rgba(22,24,29,0.55)", marginBottom: 16 }}>Invoice from {inv.sender.name}</div>
        <div style={{ background: "rgba(22,24,29,0.1)", borderRadius: 8, padding: "14px", marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: "rgba(22,24,29,0.55)", marginBottom: 3 }}>Invoice F-{inv.number}</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: DARK, letterSpacing: -1 }}>{fmt(tots.total, inv.currency)}</div>
          <div style={{ fontSize: 11, color: "rgba(22,24,29,0.5)", marginTop: 3 }}>Date issued: {inv.date}</div>
        </div>
        {inv.client && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, textAlign: "left", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(22,24,29,0.45)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Customer</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: DARK }}>{inv.client.name}</div>
              {inv.client.address ? <div style={{ fontSize: 10, color: "rgba(22,24,29,0.55)", whiteSpace: "pre-line", lineHeight: 1.5 }}>{inv.client.address}</div> : null}
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(22,24,29,0.45)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Invoice</div>
              <div style={{ fontSize: 12, color: DARK }}>F-{inv.number}</div>
              {inv.dueDate ? <div style={{ fontSize: 10, color: "rgba(22,24,29,0.55)" }}>Due: {inv.dueDate}</div> : null}
            </div>
          </div>
        )}
        <button style={{ width: "100%", padding: "11px 0", background: DARK, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Send for pay in email</button>
      </div>
    </div>
  );
}

function Clients(props) {
  var clients = props.clients; var setClients = props.setClients;
  var _sel = useState(clients[0] || null); var sel = _sel[0]; var setSel = _sel[1];
  var _ed  = useState(false); var ed = _ed[0]; var setEd = _ed[1];
  var _f   = useState({ name: "", contact: "", email: "", phone: "", address: "", vat: "" }); var f = _f[0]; var setF = _f[1];

  function uf(k, v) { setF(function(p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
  function startEdit(c) { setSel(c); setF({ name: c.name, contact: c.contact, email: c.email, phone: c.phone, address: c.address, vat: c.vat }); setEd(true); }
  function startNew() { setSel(null); setF({ name: "", contact: "", email: "", phone: "", address: "", vat: "" }); setEd(true); }
  function save() {
    if (!f.name.trim()) return;
    if (sel && ed) {
      var updated = Object.assign({}, f, { id: sel.id });
      setClients(function(p) { return p.map(function(c) { return c.id === sel.id ? updated : c; }); });
      setSel(updated);
    } else {
      var nc = Object.assign({}, f, { id: uid() });
      setClients(function(p) { return p.concat([nc]); });
      setSel(nc);
    }
    setEd(false);
  }
  function del(id) {
    setClients(function(p) { return p.filter(function(c) { return c.id !== id; }); });
    var remaining = clients.filter(function(c) { return c.id !== id; });
    setSel(remaining[0] || null);
    setEd(false);
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Clients</h2>
        <button onClick={startNew} style={LBTN}>+ New Client</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
          {clients.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>No clients yet</div>}
          {clients.map(function(c, i) {
            var isActive = sel && sel.id === c.id;
            return (
              <div key={c.id} onClick={function() { setSel(c); setEd(false); }} style={{ padding: "12px 14px", cursor: "pointer", borderBottom: i < clients.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: isActive ? "var(--color-background-secondary)" : "transparent", borderLeft: isActive ? "3px solid " + LIME : "3px solid transparent" }}>
                <div style={{ fontWeight: isActive ? 600 : 400, fontSize: 13 }}>{c.name}</div>
                {c.contact ? <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 1 }}>{c.contact}</div> : null}
              </div>
            );
          })}
        </div>
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 22px" }}>
          {!sel && !ed ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-tertiary)" }}>Select a client or create one</div>
          ) : ed ? (
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>{sel ? "Edit Client" : "New Client"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ gridColumn: "1/-1" }}><FL>Company / Client Name</FL><input value={f.name} onChange={function(e) { uf("name", e.target.value); }} style={INP} /></div>
                <div><FL>Contact</FL><input value={f.contact} onChange={function(e) { uf("contact", e.target.value); }} style={INP} /></div>
                <div><FL>Email</FL><input value={f.email} onChange={function(e) { uf("email", e.target.value); }} style={INP} /></div>
                <div><FL>Phone</FL><input value={f.phone} onChange={function(e) { uf("phone", e.target.value); }} style={INP} /></div>
                <div><FL>VAT</FL><input value={f.vat} onChange={function(e) { uf("vat", e.target.value); }} style={INP} /></div>
                <div style={{ gridColumn: "1/-1" }}><FL>Address</FL><textarea value={f.address} onChange={function(e) { uf("address", e.target.value); }} rows={3} style={Object.assign({}, INP, { resize: "vertical" })} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={save} style={LBTN}>Save</button>
                <button onClick={function() { setEd(false); }} style={GBTN}>Cancel</button>
              </div>
            </div>
          ) : sel ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: LIME, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: DARK }}>{initials(sel.name)}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{sel.name}</div>
                    {sel.contact ? <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{sel.contact}</div> : null}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={function() { startEdit(sel); }} style={Object.assign({}, GBTN, { fontSize: 12 })}>Edit</button>
                  <button onClick={function() { del(sel.id); }} style={Object.assign({}, GBTN, { fontSize: 12, color: "#DC2626" })}>Delete</button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", rowGap: 8, columnGap: 12, fontSize: 13 }}>
                {[["Email", sel.email], ["Phone", sel.phone], ["VAT", sel.vat]].filter(function(pair) { return !!pair[1]; }).map(function(pair) {
                  return [
                    <div key={pair[0] + "k"} style={{ color: "var(--color-text-tertiary)" }}>{pair[0]}</div>,
                    <div key={pair[0] + "v"}>{pair[1]}</div>,
                  ];
                })}
                {sel.address ? [
                  <div key="ak" style={{ color: "var(--color-text-tertiary)" }}>Address</div>,
                  <div key="av" style={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>{sel.address}</div>,
                ] : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SettingsPage(props) {
  var biz = props.biz; var setBiz = props.setBiz;
  var _f = useState(biz); var f = _f[0]; var setF = _f[1];
  function uf(k, v) { setF(function(p) { var n = Object.assign({}, p); n[k] = v; return n; }); }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 660 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>Settings</h2>
      <p style={{ margin: "0 0 22px", color: "var(--color-text-secondary)", fontSize: 13 }}>Business profile and invoice defaults.</p>

      <div style={{ background: DARK, color: "#fff", borderRadius: 12, padding: "18px 22px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: LIME, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: DARK }}>{initials(f.name) || "MM"}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name || "Your Name"}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{f.email || "your@email.com"}</div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "rgba(255,255,255,0.4)", whiteSpace: "pre-line" }}>{f.address || "Your address here"}</div>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 22px", marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Business Profile</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FL>Full Name</FL><input value={f.name} onChange={function(e) { uf("name", e.target.value); }} style={INP} /></div>
          <div><FL>Email</FL><input value={f.email} onChange={function(e) { uf("email", e.target.value); }} style={INP} /></div>
          <div><FL>Phone</FL><input value={f.phone || ""} onChange={function(e) { uf("phone", e.target.value); }} style={INP} /></div>
          <div><FL>IBAN</FL><input value={f.iban} onChange={function(e) { uf("iban", e.target.value); }} style={INP} /></div>
          <div><FL>BIC / SWIFT</FL><input value={f.bic || ""} onChange={function(e) { uf("bic", e.target.value); }} style={INP} /></div>
          <div style={{ gridColumn: "1/-1" }}><FL>Address</FL><textarea value={f.address || ""} onChange={function(e) { uf("address", e.target.value); }} rows={2} style={Object.assign({}, INP, { resize: "vertical" })} /></div>
        </div>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 22px", marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Invoice Defaults</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div><FL>Currency</FL>
            <select value={f.defaultCurrency} onChange={function(e) { uf("defaultCurrency", e.target.value); }} style={INP}>
              {Object.keys(CURR).map(function(k) { return <option key={k} value={k}>{k}</option>; })}
            </select>
          </div>
          <div><FL>Language</FL>
            <select value={f.defaultLanguage} onChange={function(e) { uf("defaultLanguage", e.target.value); }} style={INP}>
              <option value="en">English</option>
              <option value="fr">Francais</option>
              <option value="nl">Nederlands</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div><FL>Tax Rate (%)</FL><input type="number" min="0" max="100" value={f.defaultTaxRate} onChange={function(e) { uf("defaultTaxRate", Number(e.target.value)); }} style={INP} /></div>
        </div>
      </div>

      <button onClick={function() { setBiz(f); }} style={Object.assign({}, LBTN, { padding: "10px 24px" })}>Save Settings</button>
    </div>
  );
}

function MinTpl(props) {
  var inv = props.inv; var t = props.t; var tots = props.tots;
  var sub = tots.sub; var disc = tots.disc; var tax = tots.tax; var total = tots.total;
  return (
    <div style={{ background: "#fff", color: "#1a1a1a", padding: "52px 60px", maxWidth: 760, margin: "0 auto", fontFamily: "Georgia, serif", lineHeight: 1.6, border: "0.5px solid #e0e0e0", borderRadius: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, paddingBottom: 28, borderBottom: "2px solid #1a1a1a" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>{t.header}</div>
          {inv.title ? <div style={{ fontSize: 13, color: "#555", marginTop: 8, maxWidth: 360, lineHeight: 1.6 }}>{inv.title}</div> : null}
        </div>
        <div style={{ textAlign: "right", fontSize: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{inv.sender.name}</div>
          {inv.sender.address ? <div style={{ color: "#666", whiteSpace: "pre-line", marginTop: 2 }}>{inv.sender.address}</div> : null}
          {inv.sender.email ? <div style={{ color: "#888" }}>{inv.sender.email}</div> : null}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 8, fontFamily: "Arial,sans-serif" }}>{t.billTo}</div>
          {inv.client ? (
            <div>
              <div style={{ fontWeight: 700 }}>{inv.client.name}</div>
              {inv.client.address ? <div style={{ fontSize: 12, color: "#666", whiteSpace: "pre-line", marginTop: 2 }}>{inv.client.address}</div> : null}
            </div>
          ) : <div style={{ color: "#bbb" }}>-</div>}
        </div>
        <div style={{ textAlign: "right", fontSize: 12 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginBottom: 4 }}>
            <span style={{ color: "#999", fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>{t.invNo}</span>
            <span style={{ minWidth: 100, fontWeight: 600 }}>{inv.number}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginBottom: 4 }}>
            <span style={{ color: "#999", fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>{t.date}</span>
            <span style={{ minWidth: 100, fontWeight: 600 }}>{inv.date}</span>
          </div>
          {inv.dueDate ? (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginBottom: 4 }}>
              <span style={{ color: "#999", fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>{t.dueDate}</span>
              <span style={{ minWidth: 100, fontWeight: 600 }}>{inv.dueDate}</span>
            </div>
          ) : null}
        </div>
      </div>
      {inv.sections.map(function(sec) {
        return (
          <div key={sec.id} style={{ marginBottom: 28 }}>
            {sec.title ? <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, fontFamily: "Arial,sans-serif" }}>{sec.title}</div> : null}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  {[t.desc, t.qty, t.rate, t.tot].map(function(h, i) {
                    return <th key={i} style={{ textAlign: i === 0 ? "left" : "right", padding: "6px 0", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#999", fontFamily: "Arial,sans-serif", width: i === 0 ? undefined : i === 1 ? 60 : 100 }}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {sec.items.map(function(item) {
                  return (
                    <tr key={item.id} style={{ borderBottom: "0.5px solid #eee" }}>
                      <td style={{ padding: "10px 0", verticalAlign: "top", whiteSpace: "pre-line", lineHeight: 1.65 }}>{item.description}</td>
                      <td style={{ padding: "10px 0", textAlign: "right", verticalAlign: "top", color: "#555" }}>{item.qty}</td>
                      <td style={{ padding: "10px 0", textAlign: "right", verticalAlign: "top", color: "#555" }}>{fmt(item.rate, inv.currency)}</td>
                      <td style={{ padding: "10px 0", textAlign: "right", verticalAlign: "top", fontWeight: 600 }}>{fmt(cItem(item), inv.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8, marginBottom: 36 }}>
        <div style={{ minWidth: 280 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderTop: "0.5px solid #eee" }}>
            <span style={{ color: "#666" }}>{t.sub}</span><span>{fmt(sub, inv.currency)}</span>
          </div>
          {inv.discount && inv.discount.enabled ? (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
              <span style={{ color: "#666" }}>{t.disc}</span><span style={{ color: "#c00" }}>-{fmt(disc, inv.currency)}</span>
            </div>
          ) : null}
          {inv.taxEnabled ? (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
              <span style={{ color: "#666" }}>{t.tax} ({inv.taxRate}%)</span><span>{fmt(tax, inv.currency)}</span>
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 6px", fontSize: 16, fontWeight: 700, borderTop: "2px solid #1a1a1a", marginTop: 4 }}>
            <span>{t.due}</span><span>{fmt(total, inv.currency)}</span>
          </div>
        </div>
      </div>
      {inv.paymentEnabled && inv.paymentDetails ? (
        <div style={{ marginBottom: 28, paddingTop: 18, borderTop: "0.5px solid #eee" }}>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 8, fontFamily: "Arial,sans-serif" }}>{t.pay}</div>
          <div style={{ fontSize: 13, whiteSpace: "pre-line", color: "#333" }}>{inv.paymentDetails}</div>
        </div>
      ) : null}
      {inv.notes ? (
        <div style={{ borderTop: "0.5px solid #eee", paddingTop: 18 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 8, fontFamily: "Arial,sans-serif" }}>{t.notes}</div>
          <div style={{ fontSize: 11, color: "#666", lineHeight: 1.75, whiteSpace: "pre-line" }}>{inv.notes}</div>
        </div>
      ) : null}
    </div>
  );
}

function CreTpl(props) {
  var inv = props.inv; var t = props.t; var tots = props.tots;
  var sub = tots.sub; var disc = tots.disc; var tax = tots.tax; var total = tots.total;
  return (
    <div style={{ background: "#fff", color: DARK, maxWidth: 760, margin: "0 auto", fontFamily: "Arial,sans-serif", border: "0.5px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ background: DARK, color: "#fff", padding: "32px 52px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: LIME, marginBottom: 6 }}>{t.header}</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{inv.sender.name}</div>
          {inv.sender.address ? <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 3, whiteSpace: "pre-line" }}>{inv.sender.address}</div> : null}
          {inv.sender.email ? <div style={{ fontSize: 11, color: LIME, marginTop: 2 }}>{inv.sender.email}</div> : null}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: LIME }}>#{inv.number}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{t.date}: {inv.date}</div>
          {inv.dueDate ? <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{t.dueDate}: {inv.dueDate}</div> : null}
        </div>
      </div>
      <div style={{ borderBottom: "3px solid " + LIME, padding: "18px 52px", display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 4 }}>{t.billTo}</div>
          {inv.client ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{inv.client.name}</div>
              {inv.client.address ? <div style={{ fontSize: 11, color: "#666", marginTop: 1, whiteSpace: "pre-line" }}>{inv.client.address}</div> : null}
            </div>
          ) : <div style={{ color: "#ccc" }}>-</div>}
        </div>
        {inv.title ? (
          <div style={{ maxWidth: 280, textAlign: "right" }}>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 4 }}>Subject</div>
            <div style={{ fontSize: 12, color: "#444", lineHeight: 1.5 }}>{inv.title}</div>
          </div>
        ) : null}
      </div>
      <div style={{ padding: "28px 52px" }}>
        {inv.sections.map(function(sec) {
          return (
            <div key={sec.id} style={{ marginBottom: 24 }}>
              {sec.title ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 4, height: 16, background: LIME, borderRadius: 2 }}></div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{sec.title}</div>
                </div>
              ) : null}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    {[t.desc, t.qty, t.rate, t.tot].map(function(h, i) {
                      return <th key={i} style={{ textAlign: i === 0 ? "left" : "right", padding: "8px 10px", fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#888", fontWeight: 700 }}>{h}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sec.items.map(function(item, ii) {
                    return (
                      <tr key={item.id} style={{ background: ii % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "0.5px solid #eee" }}>
                        <td style={{ padding: "10px 10px", verticalAlign: "top", whiteSpace: "pre-line", lineHeight: 1.65 }}>{item.description}</td>
                        <td style={{ padding: "10px 10px", textAlign: "right", verticalAlign: "top", color: "#666" }}>{item.qty}</td>
                        <td style={{ padding: "10px 10px", textAlign: "right", verticalAlign: "top", color: "#666" }}>{fmt(item.rate, inv.currency)}</td>
                        <td style={{ padding: "10px 10px", textAlign: "right", verticalAlign: "top", fontWeight: 700 }}>{fmt(cItem(item), inv.currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <div style={{ minWidth: 280, background: "#f5f5f5", borderRadius: 8, padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: "#777" }}>{t.sub}</span><span>{fmt(sub, inv.currency)}</span>
            </div>
            {inv.discount && inv.discount.enabled ? (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: "#777" }}>{t.disc}</span><span style={{ color: "#c00" }}>-{fmt(disc, inv.currency)}</span>
              </div>
            ) : null}
            {inv.taxEnabled ? (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: "#777" }}>{t.tax} ({inv.taxRate}%)</span><span>{fmt(tax, inv.currency)}</span>
              </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid " + LIME, paddingTop: 10, marginTop: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{t.due}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#5A7A00" }}>{fmt(total, inv.currency)}</span>
            </div>
          </div>
        </div>
      </div>
      {(inv.paymentEnabled || inv.notes) ? (
        <div style={{ borderTop: "3px solid " + LIME, padding: "22px 52px", display: "grid", gridTemplateColumns: inv.paymentEnabled && inv.notes ? "1fr 1fr" : "1fr", gap: 24 }}>
          {inv.paymentEnabled && inv.paymentDetails ? (
            <div>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 8 }}>{t.pay}</div>
              <div style={{ fontSize: 12, whiteSpace: "pre-line", color: "#444", lineHeight: 1.7 }}>{inv.paymentDetails}</div>
            </div>
          ) : null}
          {inv.notes ? (
            <div>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#999", marginBottom: 8 }}>{t.notes}</div>
              <div style={{ fontSize: 11, color: "#555", whiteSpace: "pre-line", lineHeight: 1.75 }}>{inv.notes}</div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div style={{ height: 5, background: "linear-gradient(90deg, " + DARK + " 0%, " + LIME + " 100%)" }}></div>
    </div>
  );
}
