// client/src/pages/AdminDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";

// ---------- utils ----------
const toEuro = (cents) => `${((cents || 0) / 100).toFixed(2)}€`;

const fmtAddr = (a) => {
  if (!a || typeof a !== "object") return "—";
  const { line1, line2, city, postal_code, state, country } = a;
  return [line1, line2, [postal_code, city].filter(Boolean).join(" "), state, country]
    .filter(Boolean)
    .join(", ");
};

const splitName = (full) => {
  if (!full) return { nome: "", cognome: "" };
  const parts = String(full).trim().split(/\s+/);
  if (parts.length === 1) return { nome: parts[0], cognome: "" };
  return { nome: parts.slice(0, -1).join(" "), cognome: parts.slice(-1)[0] };
};

const csvCell = (v) => {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

// ---------- component ----------
export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [open, setOpen] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filtri
  const [fNome, setFNome] = useState("");
  const [fCognome, setFCognome] = useState("");
  const [fCitta, setFCitta] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fFrom, setFFrom] = useState(""); // yyyy-mm-dd
  const [fTo, setFTo] = useState("");     // yyyy-mm-dd

  useEffect(() => {
    (async () => {
      try {
        const { data: { session} } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setOrders([]);
          setLoading(false);
          return;
        }
        // Modifica l’URL se il tuo endpoint admin è diverso
        const res = await axios.get("/api/admin/orders", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = Array.isArray(res.data) ? res.data : [];

        setOrders(
          data.map((o) => ({
            ...o,
            total_eur: (o.total_cents || 0) / 100,
            _nome: splitName(o.customer_name).nome.toLowerCase(),
            _cognome: splitName(o.customer_name).cognome.toLowerCase(),
            _citta: (o.shipping_address?.city || "").toLowerCase(),
            _phone: (o.customer_phone || "").toLowerCase(),
            _date: new Date(o.created_at),
          }))
        );
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.error || "Errore nel caricare gli ordini");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // applico i filtri lato client
  const filtered = useMemo(() => {
    const from = fFrom ? new Date(`${fFrom}T00:00:00`) : null;
    const to = fTo ? new Date(`${fTo}T23:59:59.999`) : null;
    const nome = fNome.trim().toLowerCase();
    const cognome = fCognome.trim().toLowerCase();
    const citta = fCitta.trim().toLowerCase();
    const phone = fPhone.trim().toLowerCase();

    return orders.filter((o) => {
      if (from && o._date < from) return false;
      if (to && o._date > to) return false;
      if (nome && !o._nome.includes(nome)) return false;
      if (cognome && !o._cognome.includes(cognome)) return false;
      if (citta && !o._citta.includes(citta)) return false;
      if (phone && !o._phone.includes(phone)) return false;
      return true;
    });
  }, [orders, fFrom, fTo, fNome, fCognome, fCitta, fPhone]);

  // stampa singolo ordine
  const printOrder = (o) => {
    const rows = (o.items || [])
      .map(
        (it) => `
        <tr>
          <td>${it.title || `Prodotto #${it.product_id}`}</td>
          <td style="text-align:center;">${it.quantity}</td>
          <td style="text-align:right;">${toEuro(it.price_cents)}</td>
          <td style="text-align:right;">${toEuro((it.price_cents || 0) * (it.quantity || 0))}</td>
        </tr>`
      )
      .join("");

    const html = `
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Ordine #${o.id}</title>
        <style>
          body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; padding:24px;}
          h1{margin:0 0 12px}
          .grid{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
          .box{background:#f6f7f9; padding:12px; border-radius:8px}
          table{width:100%; border-collapse:collapse; margin-top:12px;}
          th,td{border:1px solid #ddd; padding:8px; font-size:14px}
          th{background:#eee; text-align:left}
          .right{text-align:right}
          .muted{opacity:.75}
          @media print {.no-print{display:none}}
        </style>
      </head>
      <body>
        <h1>Riepilogo ordine #${o.id}</h1>
        <div class="muted">${new Date(o.created_at).toLocaleString()}</div>
        <div class="grid">
          <div class="box">
            <strong>Cliente</strong><br/>
            ${o.customer_name || "—"}<br/>
            ${o.customer_email || "—"}<br/>
            ${o.customer_phone || "—"}
          </div>
          <div class="box">
            <strong>Indirizzo di spedizione</strong><br/>
            ${fmtAddr(o.shipping_address)}
          </div>
        </div>

        <table>
          <thead>
            <tr><th>Articolo</th><th style="width:60px;">Q.tà</th><th style="width:100px;">Prezzo</th><th style="width:120px;">Subtotale</th></tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <th colspan="3" class="right">Totale</th>
              <th class="right">${toEuro(o.total_cents)}</th>
            </tr>
          </tfoot>
        </table>

        <button class="no-print" onclick="window.print()">Stampa</button>
      </body>
      </html>
    `;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  // --------- ESPORTAZIONI ---------

  // CSV “per ordine” (già presente)
  const exportCSV = () => {
    const rows = [
      ["ID","Data","Stato","Nome","Email","Telefono","Indirizzo","Totale"],
      ...filtered.map((o) => [
        `#${o.id}`,
        new Date(o.created_at).toLocaleString(),
        o.status,
        o.customer_name || "",
        o.customer_email || "",
        o.customer_phone || "",
        fmtAddr(o.shipping_address),
        (o.total_cents || 0) / 100,
      ]),
    ];
    const csv = rows.map((r) => r.map(csvCell).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ordini_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV “dettagliato” (una riga per articolo)
  const exportCSVDetails = () => {
    const header = [
      "ID Ordine","Data","Stato","Nome","Email","Telefono","Indirizzo",
      "Prodotto","Q.tà","Prezzo unitario (€)","Subtotale riga (€)","Totale ordine (€)"
    ];
    const rows = [header];

    filtered.forEach((o) => {
      const base = [
        `#${o.id}`,
        new Date(o.created_at).toLocaleString(),
        o.status,
        o.customer_name || "",
        o.customer_email || "",
        o.customer_phone || "",
        fmtAddr(o.shipping_address),
      ];
      const items = Array.isArray(o.items) ? o.items : [];
      if (items.length === 0) {
        rows.push([...base, "", "", "", "", (o.total_cents || 0)/100]);
      } else {
        items.forEach((it) => {
          const unit = (it.price_cents || 0) / 100;
          const line = unit * (it.quantity || 0);
          rows.push([
            ...base,
            it.title || `Prodotto #${it.product_id}`,
            it.quantity || 0,
            unit.toFixed(2),
            line.toFixed(2),
            ((o.total_cents || 0) / 100).toFixed(2),
          ]);
        });
      }
    });

    const csv = rows.map((r) => r.map(csvCell).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ordini_dettaglio_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PDF “per ordine” (già presente) → exportPDF()

  // PDF “dettagliato” con tutte le righe-articolo
  const exportPDFDetails = () => {
    const sectionHtml = filtered.map((o) => {
      const rows = (o.items || []).map((it) => `
        <tr>
          <td>${it.title || `Prodotto #${it.product_id}`}</td>
          <td style="text-align:center">${it.quantity}</td>
          <td style="text-align:right">${toEuro(it.price_cents)}</td>
          <td style="text-align:right">${toEuro((it.price_cents || 0) * (it.quantity || 0))}</td>
        </tr>
      `).join("");

      return `
        <h2 style="margin:16px 0 6px">Ordine #${o.id} — ${new Date(o.created_at).toLocaleString()}</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px">
          <div><strong>Cliente:</strong> ${o.customer_name || "—"} — ${o.customer_email || "—"} — ${o.customer_phone || "—"}</div>
          <div><strong>Spedizione:</strong> ${fmtAddr(o.shipping_address)}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
          <thead>
            <tr>
              <th style="border:1px solid #ddd;padding:6px;text-align:left;background:#eee">Prodotto</th>
              <th style="border:1px solid #ddd;padding:6px;background:#eee">Q.tà</th>
              <th style="border:1px solid #ddd;padding:6px;text-align:right;background:#eee">Prezzo</th>
              <th style="border:1px solid #ddd;padding:6px;text-align:right;background:#eee">Subtotale</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="4" style="border:1px solid #ddd;padding:6px">Nessun articolo</td></tr>`}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3" style="border:1px solid #ddd;padding:6px;text-align:right">Totale</th>
              <th style="border:1px solid #ddd;padding:6px;text-align:right">${toEuro(o.total_cents)}</th>
            </tr>
          </tfoot>
        </table>
      `;
    }).join("<hr/>");

    const html = `
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Esportazione ordini dettagli</title>
        <style>
          body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; padding:24px;}
          h1{margin:0 0 12px}
          @media print {.no-print{display:none}}
        </style>
      </head>
      <body>
        <h1>Ordini (dettaglio articoli) — ${filtered.length} ordini</h1>
        ${sectionHtml || "<p>Nessun ordine</p>"}
        <button class="no-print" onclick="window.print()">Stampa / Salva PDF</button>
      </body>
      </html>
    `;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  const exportPDF = () => {
    const rows = filtered
      .map(
        (o) => `
        <tr>
          <td>#${o.id}</td>
          <td>${new Date(o.created_at).toLocaleString()}</td>
          <td>${o.status}</td>
          <td>${o.customer_name || ""}</td>
          <td>${o.customer_email || ""}</td>
          <td>${o.customer_phone || ""}</td>
          <td>${fmtAddr(o.shipping_address)}</td>
          <td style="text-align:right">${toEuro(o.total_cents)}</td>
        </tr>`
      )
      .join("");

    const html = `
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Esportazione ordini</title>
        <style>
          body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; padding:24px;}
          h1{margin:0 0 16px}
          table{width:100%; border-collapse:collapse;}
          th,td{border:1px solid #ddd; padding:6px; font-size:12px}
          th{background:#eee; text-align:left}
          .right{text-align:right}
          @media print {.no-print{display:none}}
        </style>
      </head>
      <body>
        <h1>Ordini (${filtered.length})</h1>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Data</th><th>Stato</th><th>Nome</th><th>Email</th><th>Telefono</th><th>Indirizzo</th><th class="right">Totale</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <button class="no-print" onclick="window.print()">Stampa / Salva PDF</button>
      </body>
      </html>
    `;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  const resetFilters = () => {
    setFNome(""); setFCognome(""); setFPhone(""); setFCitta(""); setFFrom(""); setFTo("");
  };

  if (loading) {
    return (
      <div className="container">
        <h1>Admin</h1>
        <p>Caricamento…</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Admin — Ordini</h1>
      {err && <p className="badge danger">{err}</p>}

      {/* FILTRI */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="form-row" style={{ gap: 12 }}>
          <div>
            <label>Dal</label>
            <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
          </div>
          <div>
            <label>Al</label>
            <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
          </div>
          <div>
            <label>Nome</label>
            <input value={fNome} onChange={(e) => setFNome(e.target.value)} placeholder="Mario" />
          </div>
          <div>
            <label>Cognome</label>
            <input value={fCognome} onChange={(e) => setFCognome(e.target.value)} placeholder="Rossi" />
          </div>
          <div>
            <label>Città</label>
            <input value={fCitta} onChange={(e) => setFCitta(e.target.value)} placeholder="Milano" />
          </div>
          <div>
            <label>Telefono</label>
            <input value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="+39…" />
          </div>
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn ghost" onClick={resetFilters}>Reset filtri</button>
          <span className="badge">{filtered.length} risultati</span>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={exportCSV}>Esporta CSV</button>
          <button className="btn ghost" onClick={exportCSVDetails}>Esporta dettagli (CSV)</button>
          <button className="btn ghost" onClick={exportPDF}>Esporta PDF</button>
          <button className="btn" onClick={exportPDFDetails}>Esporta dettagli (PDF)</button>
        </div>
      </div>

      {/* TABELLA ORDINI */}
      <div className="card">
        {filtered.length === 0 ? (
          <p>Nessun ordine trovato.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>ID</th>
                <th>Data</th>
                <th>Stato</th>
                <th>Cliente</th>
                <th>Contatti</th>
                <th>Spedizione</th>
                <th style={{ textAlign: "right", width: 120 }}>Totale</th>
                <th style={{ width: 260 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <>
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>{new Date(o.created_at).toLocaleString()}</td>
                    <td>{o.status}</td>
                    <td>{o.customer_name || "—"}</td>
                    <td>
                      <div>{o.customer_email || "—"}</div>
                      <div style={{ opacity: 0.8 }}>{o.customer_phone || "—"}</div>
                    </td>
                    <td>{fmtAddr(o.shipping_address)}</td>
                    <td style={{ textAlign: "right" }}>{toEuro(o.total_cents)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="btn ghost"
                          onClick={() => setOpen((s) => ({ ...s, [o.id]: !s[o.id] }))}
                        >
                          {open[o.id] ? "Nascondi" : "Dettagli"}
                        </button>
                        <button className="btn" onClick={() => printOrder(o)}>
                          Stampa
                        </button>
                      </div>
                    </td>
                  </tr>
                  {open[o.id] && (
                    <tr>
                      <td colSpan={8} style={{ background: "var(--card-bg)" }}>
                        {Array.isArray(o.items) && o.items.length ? (
                          <table className="table" style={{ margin: 0 }}>
                            <thead>
                              <tr>
                                <th>Articolo</th>
                                <th style={{ width: 80, textAlign: "center" }}>Q.tà</th>
                                <th style={{ width: 120 }}>Prezzo</th>
                                <th style={{ width: 120 }}>Subtotale</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.items.map((it, idx) => (
                                <tr key={`${o.id}-${idx}`}>
                                  <td>{it.title || `Prodotto #${it.product_id}`}</td>
                                  <td style={{ textAlign: "center" }}>{it.quantity}</td>
                                  <td>{toEuro(it.price_cents)}</td>
                                  <td>{toEuro((it.price_cents || 0) * (it.quantity || 0))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p style={{ margin: 8 }}>Nessun articolo.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
