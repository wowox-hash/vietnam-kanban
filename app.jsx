const { useState, useEffect, useRef } = React;
const { DragDropContext, Droppable, Draggable } = window.ReactBeautifulDnd;
const { createClient } = window.supabase;

const SUPABASE_URL = 'https://phnwcmkbtaivdnzfaqoz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_CYA2uVEwx-1g0g7SJLer4w_jCgGDpc7';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COLUMNS = [
  { id: "todo", title: "À réserver", color: "#E24B4A" },
  { id: "inprogress", title: "En cours", color: "#EF9F27" },
  { id: "booked", title: "Réservé / Confirmé", color: "#639922" },
  { id: "done", title: "Terminé", color: "#1D9E75" },
];

const CATEGORIES = [
  { id: "transport", label: "Transport", icon: "✈", color: "#378ADD" },
  { id: "hotel", label: "Hébergement", icon: "🏨", color: "#D4537E" },
  { id: "excursion", label: "Excursion", icon: "🗺", color: "#639922" },
  { id: "restaurant", label: "Restaurant", icon: "🍜", color: "#BA7517" },
  { id: "admin", label: "Admin / Docs", icon: "📋", color: "#534AB7" },
  { id: "other", label: "Autre", icon: "📌", color: "#888780" },
];

const PARTICIPANTS = [
  { id: "frederic", name: "Frederic", initials: "FD", color: "#378ADD" },
  { id: "maianh", name: "Maï Anh", initials: "MA", color: "#D4537E" },
  { id: "trinh", name: "Trinh", initials: "TR", color: "#639922" },
  { id: "bangoai", name: "Ba Ngoai", initials: "BN", color: "#BA7517" },
  { id: "thuy", name: "Thuy", initials: "TH", color: "#534AB7" },
  { id: "max", name: "Max", initials: "MX", color: "#D85A30" },
];

const ALLOWED_UPLOAD_TYPES = ["pdf", "png", "jpg", "jpeg", "webp", "doc", "docx", "xls", "xlsx", "txt", "zip"];
const MAX_FILE_SIZE_MB = 10;

const VIETNAM_LOCATIONS = [
  { label: "Hô Chi Minh-Ville", lat: 10.8231, lng: 106.6297 },
  { label: "Đà Nẵng", lat: 16.0544, lng: 108.2022 },
  { label: "Hội An", lat: 15.8801, lng: 108.3380 },
  { label: "Cham Island", lat: 15.9470, lng: 108.5157 },
  { label: "Nha Trang", lat: 12.2388, lng: 109.1967 },
  { label: "Phú Quốc", lat: 10.2270, lng: 103.9677 },
  { label: "Cần Thơ", lat: 10.0452, lng: 105.7469 },
  { label: "Thới Bình", lat: 9.2700, lng: 105.1200 },
  { label: "Huế", lat: 16.4637, lng: 107.5909 },
  { label: "Đà Lạt", lat: 11.9404, lng: 108.4583 },
  { label: "Sapa", lat: 22.3364, lng: 103.8440 },
];

const CATEGORY_ORDER = { transport: 0, hotel: 1, excursion: 2, restaurant: 3, admin: 4, other: 5 };

const FIELD_LABELS = {
  title: "Titre", desc: "Description", column: "Statut", category: "Catégorie",
  day: "Dates", priority: "Priorité", owner: "Propriétaire", cost: "Coût",
  paid_by: "Payé par", split_among: "Partagé entre", assignees: "Participants",
  location: "Emplacement"
};

function uid() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function formatDay(str) {
  if (!str) return "";
  if (str.startsWith("J") || !str.match(/\d{2}\/\d{2}\/\d{4}/)) return str;
  const parseFr = (d) => { const p = d.split('/'); return parseInt(p[0]) + " " + (["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"][parseInt(p[1]) - 1]); };
  if (str.includes(" au ")) {
    const [start, end] = str.split(" au ");
    const s = start.split('/');
    const e = end.split('/');
    if (s[1] === e[1] && s[2] === e[2]) {
      return `${parseInt(s[0])}-${parseInt(e[0])} ${["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"][parseInt(s[1]) - 1]}`;
    }
    return `${parseFr(start)} - ${parseFr(end)}`;
  }
  return parseFr(str);
}

function parseDayToDate(str) {
  if (!str || !str.match(/\d{2}\/\d{2}\/\d{4}/)) return null;
  const part = str.includes(" au ") ? str.split(" au ")[0] : str;
  const [d, m, y] = part.split('/').map(Number);
  return new Date(y, m - 1, d);
}

function parseDayKey(str) {
  const dt = parseDayToDate(str);
  if (!dt) return null;
  return dt.toISOString().slice(0, 10);
}

function formatDayLong(dateKey) {
  const dt = new Date(dateKey + "T12:00:00");
  return dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + " " + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatEur(n) {
  if (n == null || isNaN(n)) return "0,00 €";
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function getParticipant(idOrName) {
  if (!idOrName) return null;
  const p = PARTICIPANTS.find(x => x.id === idOrName);
  if (p) return p;
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) hash = idOrName.charCodeAt(i) + ((hash << 5) - hash);
  return { id: idOrName, name: idOrName, initials: idOrName.slice(0, 2).toUpperCase(), color: `hsl(${Math.abs(hash) % 360}, 65%, 45%)` };
}

// Calculates the minimum set of transfers to settle all debts
function calculateSettlements(cards) {
  const balances = {};

  for (const card of cards) {
    if (!card.cost || card.cost <= 0 || !card.paid_by || !card.split_among?.length) continue;
    const share = card.cost / card.split_among.length;
    balances[card.paid_by] = (balances[card.paid_by] || 0) + card.cost;
    for (const pid of card.split_among) {
      balances[pid] = (balances[pid] || 0) - share;
    }
  }

  const debtors = [];
  const creditors = [];
  for (const [pid, balance] of Object.entries(balances)) {
    if (balance > 0.01) creditors.push({ pid, amount: balance });
    if (balance < -0.01) debtors.push({ pid, amount: -balance });
  }
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let di = 0, ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const amount = Math.min(debtors[di].amount, creditors[ci].amount);
    if (amount > 0.01) {
      settlements.push({ from: debtors[di].pid, to: creditors[ci].pid, amount: Math.round(amount * 100) / 100 });
    }
    debtors[di].amount -= amount;
    creditors[ci].amount -= amount;
    if (debtors[di].amount < 0.01) di++;
    if (creditors[ci].amount < 0.01) ci++;
  }
  return settlements;
}

function Toast({ toast }) {
  if (!toast) return null;
  const colors = { info: "#378ADD", success: "#639922", error: "#E24B4A", warn: "#EF9F27" };
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: colors[toast.type] || colors.info, color: "#fff",
      padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500,
      zIndex: 999, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", maxWidth: "90vw",
      textAlign: "center", pointerEvents: "none"
    }}>
      {toast.msg}
    </div>
  );
}

function ConfirmDialog({ confirm, onCancel }) {
  if (!confirm) return null;
  return (
    <div className="ov" style={{ zIndex: 200, alignItems: "center", paddingTop: 0 }} onClick={onCancel}>
      <div className="mo" style={{ maxWidth: 360, padding: 24 }} onClick={e => e.stopPropagation()}>
        <p style={{ fontSize: 15, marginBottom: 20, color: "var(--color-text-primary)", lineHeight: 1.5 }}>{confirm.message}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="bt" onClick={onCancel}>Annuler</button>
          <button className="bt bd" onClick={confirm.onConfirm}>{confirm.confirmLabel || "Confirmer"}</button>
        </div>
      </div>
    </div>
  );
}

const DatePicker = ({ value, onChange }) => {
  const [raw, setRaw] = React.useState(value || "");
  useEffect(() => { setRaw(value || ""); }, [value]);

  const handleBlur = () => {
    const v = raw.trim();
    const single = /^\d{2}\/\d{2}\/\d{4}$/;
    const range = /^\d{2}\/\d{2}\/\d{4} au \d{2}\/\d{2}\/\d{4}$/;
    if (!v || single.test(v) || range.test(v)) {
      onChange(v);
    } else {
      setRaw(value || "");
    }
  };

  return (
    <div>
      <input className="ki" value={raw} onChange={e => setRaw(e.target.value)} onBlur={handleBlur}
        placeholder="jj/mm/aaaa ou jj/mm/aaaa au jj/mm/aaaa" />
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
        Format : jj/mm/aaaa — ex: 01/07/2026 au 15/07/2026
      </div>
    </div>
  );
};

// Budget tracking view with category breakdown, participant balances, and settlement
function BudgetView({ cards, onEditCard }) {
  const cardsWithCost = cards.filter(c => c.cost && c.cost > 0);
  const totalSpend = cardsWithCost.reduce((s, c) => s + c.cost, 0);
  const confirmedSpend = cardsWithCost.filter(c => c.column === "booked" || c.column === "done").reduce((s, c) => s + c.cost, 0);
  const pendingSpend = totalSpend - confirmedSpend;

  // Per-category totals
  const byCat = CATEGORIES.map(cat => {
    const amount = cardsWithCost.filter(c => c.category === cat.id).reduce((s, c) => s + c.cost, 0);
    return { ...cat, amount };
  }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
  const maxCatAmount = byCat.length ? byCat[0].amount : 1;

  // Per-participant balances
  const participantData = {};
  for (const card of cardsWithCost) {
    if (card.paid_by) {
      if (!participantData[card.paid_by]) participantData[card.paid_by] = { paid: 0, owed: 0 };
      participantData[card.paid_by].paid += card.cost;
    }
    if (card.split_among?.length) {
      const share = card.cost / card.split_among.length;
      for (const pid of card.split_among) {
        if (!participantData[pid]) participantData[pid] = { paid: 0, owed: 0 };
        participantData[pid].owed += share;
      }
    }
  }
  const participantRows = Object.entries(participantData)
    .map(([pid, data]) => ({ ...data, pid, net: data.paid - data.owed, p: getParticipant(pid) }))
    .sort((a, b) => b.net - a.net);

  const settlements = calculateSettlements(cards);

  const sectionStyle = { background: "var(--color-background-primary)", border: ".5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20, marginBottom: 16 };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: 12, display: "block", letterSpacing: 0.5 };

  return (
    <div style={{ padding: "20px 16px", maxWidth: 800, margin: "0 auto" }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total dépensé", value: totalSpend, color: "#378ADD" },
          { label: "Confirmé", value: confirmedSpend, color: "#639922" },
          { label: "En attente", value: pendingSpend, color: "#EF9F27" },
          { label: "Nb. de dépenses", value: null, count: cardsWithCost.length, color: "#534AB7" },
        ].map((item, i) => (
          <div key={i} style={{ ...sectionStyle, marginBottom: 0, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>
              {item.value != null ? formatEur(item.value) : item.count}
            </div>
          </div>
        ))}
      </div>

      {/* Per-category breakdown */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Dépenses par catégorie</label>
        {byCat.length === 0 && <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Aucune dépense enregistrée.</p>}
        {byCat.map(cat => (
          <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 28, textAlign: "center", fontSize: 16 }}>{cat.icon}</div>
            <div style={{ width: 100, fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{cat.label}</div>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--color-background-tertiary)", overflow: "hidden" }}>
              <div style={{ width: (cat.amount / maxCatAmount * 100) + "%", height: "100%", borderRadius: 4, background: cat.color }} />
            </div>
            <div style={{ width: 90, textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{formatEur(cat.amount)}</div>
          </div>
        ))}
      </div>

      {/* Participant balance table */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Balance par participant</label>
        {participantRows.length === 0 && <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Renseignez "Payé par" et "Partagé entre" sur vos cartes pour voir les balances.</p>}
        {participantRows.length > 0 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", gap: 8, fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", paddingBottom: 8, borderBottom: ".5px solid var(--color-border-tertiary)" }}>
              <span>Participant</span>
              <span style={{ textAlign: "right" }}>A payé</span>
              <span style={{ textAlign: "right" }}>Sa part</span>
              <span style={{ textAlign: "right" }}>Solde</span>
            </div>
            {participantRows.map(row => (
              <div key={row.pid} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", gap: 8, alignItems: "center", padding: "10px 0", borderBottom: ".5px solid var(--color-border-tertiary)", fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="ka" style={{ width: 24, height: 24, fontSize: 9, background: row.p.color }}>{row.p.initials}</div>
                  <span style={{ fontWeight: 500 }}>{row.p.name}</span>
                </div>
                <span style={{ textAlign: "right", color: "var(--color-text-secondary)" }}>{formatEur(row.paid)}</span>
                <span style={{ textAlign: "right", color: "var(--color-text-secondary)" }}>{formatEur(row.owed)}</span>
                <span style={{ textAlign: "right", fontWeight: 600, color: row.net > 0.01 ? "#639922" : row.net < -0.01 ? "#E24B4A" : "var(--color-text-secondary)" }}>
                  {row.net > 0.01 ? "+" : ""}{formatEur(row.net)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settlements */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Remboursements</label>
        {settlements.length === 0 && participantRows.length > 0 && <p style={{ fontSize: 13, color: "#639922", fontWeight: 500 }}>Tout est équilibré !</p>}
        {settlements.length === 0 && participantRows.length === 0 && <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Les remboursements apparaitront ici.</p>}
        {settlements.map((s, i) => {
          const from = getParticipant(s.from);
          const to = getParticipant(s.to);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < settlements.length - 1 ? ".5px solid var(--color-border-tertiary)" : "none" }}>
              <div className="ka" style={{ width: 28, height: 28, fontSize: 10, background: from.color }}>{from.initials}</div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{from.name}</span>
              <span style={{ fontSize: 18, color: "var(--color-text-secondary)" }}>→</span>
              <div className="ka" style={{ width: 28, height: 28, fontSize: 10, background: to.color }}>{to.initials}</div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{to.name}</span>
              <span style={{ marginLeft: "auto", fontSize: 15, fontWeight: 700, color: "#E24B4A" }}>{formatEur(s.amount)}</span>
            </div>
          );
        })}
      </div>

      {/* Expense list */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Détail des dépenses</label>
        {cardsWithCost.length === 0 && <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Aucune dépense enregistrée.</p>}
        {cardsWithCost.sort((a, b) => (b.cost || 0) - (a.cost || 0)).map(card => {
          const cat = CATEGORIES.find(c => c.id === card.category) || CATEGORIES[5];
          const payer = card.paid_by ? getParticipant(card.paid_by) : null;
          return (
            <div key={card.id} onClick={() => onEditCard(card.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: ".5px solid var(--color-border-tertiary)", cursor: "pointer" }}>
              <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{cat.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.title || "Sans titre"}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                  {payer ? `Payé par ${payer.name}` : "Payeur non défini"}
                  {card.split_among?.length ? ` · partagé entre ${card.split_among.length}` : ""}
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>{formatEur(card.cost)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Itinerary View ---
function ItineraryView({ cards, onEditCard }) {
  const groups = {};
  const unscheduled = [];
  cards.forEach(card => {
    const key = parseDayKey(card.day);
    if (key) {
      if (!groups[key]) groups[key] = [];
      groups[key].push(card);
    } else {
      unscheduled.push(card);
    }
  });
  const sortedKeys = Object.keys(groups).sort();
  const catSort = (a, b) => (CATEGORY_ORDER[a.category] ?? 5) - (CATEGORY_ORDER[b.category] ?? 5);
  sortedKeys.forEach(k => groups[k].sort(catSort));
  unscheduled.sort(catSort);

  const sectionStyle = { background: "var(--color-background-primary)", border: ".5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20, marginBottom: 16 };
  const cat = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[5];
  const col = id => COLUMNS.find(c => c.id === id) || COLUMNS[0];

  const renderCard = (card) => {
    const ct2 = cat(card.category);
    const cl = col(card.column);
    return (
      <div key={card.id} onClick={() => onEditCard(card.id)} style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
        background: "var(--color-background-primary)", border: ".5px solid var(--color-border-tertiary)",
        borderRadius: 10, marginBottom: 8, cursor: "pointer", position: "relative",
        borderLeft: `3px solid ${ct2.color}`, transition: "all .15s"
      }}>
        <div style={{ position: "absolute", left: -23, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, borderRadius: "50%", background: ct2.color, border: "2px solid var(--color-background-primary)" }} />
        <span style={{ fontSize: 20, width: 32, textAlign: "center" }}>{ct2.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{card.title || "Sans titre"}</div>
          {card.day && <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{formatDay(card.day)}</div>}
        </div>
        <div style={{ display: "flex" }}>
          {(card.assignees || []).slice(0, 3).map(aid => {
            const p = getParticipant(aid);
            return p ? <div key={aid} className="ka" style={{ background: p.color, marginRight: -4, border: "2px solid #fff", width: 22, height: 22, fontSize: 8 }}>{p.initials}</div> : null;
          })}
        </div>
        <div className="kb" style={{ background: cl.color + "18", color: cl.color, fontSize: 10 }}>{cl.title}</div>
        {card.cost > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: "#378ADD" }}>{formatEur(card.cost)}</span>}
      </div>
    );
  };

  return (
    <div style={{ padding: "20px 16px", maxWidth: 800, margin: "0 auto" }}>
      {sortedKeys.length === 0 && unscheduled.length === 0 && (
        <div style={{ ...sectionStyle, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Aucune activité planifiée.</p>
        </div>
      )}
      {sortedKeys.map(dayKey => (
        <div key={dayKey} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#378ADD", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
              {new Date(dayKey + "T12:00:00").getDate()}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", textTransform: "capitalize" }}>{formatDayLong(dayKey)}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{groups[dayKey].length} activité{groups[dayKey].length > 1 ? "s" : ""}</div>
            </div>
          </div>
          <div style={{ borderLeft: "2px solid var(--color-border-tertiary)", marginLeft: 19, paddingLeft: 20 }}>
            {groups[dayKey].map(renderCard)}
          </div>
        </div>
      ))}
      {unscheduled.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--color-background-tertiary)", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>?</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>Non planifié</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{unscheduled.length} activité{unscheduled.length > 1 ? "s" : ""}</div>
            </div>
          </div>
          <div style={{ borderLeft: "2px dashed var(--color-border-tertiary)", marginLeft: 19, paddingLeft: 20 }}>
            {unscheduled.map(renderCard)}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Location Picker (mini map for edit modal) ---
function LocationPicker({ location, onChange }) {
  const miniMapRef = useRef(null);
  const miniMapInstance = useRef(null);

  useEffect(() => {
    if (!miniMapRef.current || typeof L === 'undefined') return;
    if (miniMapInstance.current) { miniMapInstance.current.remove(); miniMapInstance.current = null; }
    const center = location ? [location.lat, location.lng] : [16.0, 107.0];
    const zoom = location ? 10 : 6;
    const map = L.map(miniMapRef.current, { scrollWheelZoom: true }).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map);
    if (location) L.marker([location.lat, location.lng]).addTo(map);
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      let label = "Position personnalisée";
      for (const loc of VIETNAM_LOCATIONS) {
        if (Math.sqrt(Math.pow(lat - loc.lat, 2) + Math.pow(lng - loc.lng, 2)) < 0.15) { label = loc.label; break; }
      }
      onChange({ lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000, label });
    });
    miniMapInstance.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); miniMapInstance.current = null; };
  }, [location?.lat, location?.lng]);

  return <div ref={miniMapRef} style={{ height: 180, borderRadius: 8, border: ".5px solid var(--color-border-tertiary)", marginTop: 8 }} />;
}

// --- Map View ---
function MapView({ cards, onEditCard }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  const geoCards = cards.filter(c => c.location && c.location.lat && c.location.lng);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;
    if (!mapInstance.current) {
      const map = L.map(mapRef.current).setView([16.0, 107.0], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
      mapInstance.current = map;
    }
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    geoCards.forEach(card => {
      const ct2 = CATEGORIES.find(c => c.id === card.category) || CATEGORIES[5];
      const cl = COLUMNS.find(c => c.id === card.column) || COLUMNS[0];
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${ct2.color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${ct2.icon}</div>`,
        iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18]
      });
      const marker = L.marker([card.location.lat, card.location.lng], { icon }).addTo(mapInstance.current);
      marker.bindPopup(`
        <div style="min-width:180px;font-family:system-ui,sans-serif">
          <div style="font-size:11px;color:${ct2.color};font-weight:600;margin-bottom:4px">${ct2.icon} ${ct2.label}</div>
          <div style="font-size:14px;font-weight:600;margin-bottom:4px">${card.title || "Sans titre"}</div>
          ${card.day ? `<div style="font-size:12px;color:#666;margin-bottom:4px">${formatDay(card.day)}</div>` : ''}
          ${card.cost > 0 ? `<div style="font-size:12px;color:#378ADD;font-weight:600;margin-bottom:4px">${formatEur(card.cost)}</div>` : ''}
          <div style="font-size:11px;padding:2px 6px;border-radius:4px;background:${cl.color}18;color:${cl.color};display:inline-block">${cl.title}</div>
          <div style="margin-top:8px"><a href="#" class="map-edit-link" data-card-id="${card.id}" style="font-size:12px;color:#378ADD;text-decoration:underline;cursor:pointer">Modifier →</a></div>
        </div>
      `);
      markersRef.current.push(marker);
    });
    if (geoCards.length > 0) {
      mapInstance.current.fitBounds(L.latLngBounds(geoCards.map(c => [c.location.lat, c.location.lng])), { padding: [50, 50], maxZoom: 12 });
    }
  }, [cards]);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.classList && e.target.classList.contains('map-edit-link')) {
        e.preventDefault();
        const cardId = e.target.getAttribute('data-card-id');
        if (cardId) onEditCard(cardId);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [onEditCard]);

  return (
    <div style={{ padding: "16px 12px", height: "calc(100vh - 120px)", position: "relative" }}>
      <div ref={mapRef} style={{ height: "100%", borderRadius: 12, border: ".5px solid var(--color-border-tertiary)" }} />
      {geoCards.length === 0 && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "var(--color-background-primary)", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 500 }}>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Aucune carte avec emplacement</p>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Ajoutez des emplacements via l'édition des cartes</p>
        </div>
      )}
    </div>
  );
}

// --- Activity View ---
function ActivityView({ activities, cards, onEditCard }) {
  const grouped = {};
  activities.forEach(a => {
    const dayKey = new Date(a.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!grouped[dayKey]) grouped[dayKey] = [];
    grouped[dayKey].push(a);
  });

  const formatAction = (a) => {
    const card = cards.find(c => c.id === a.card_id);
    const cardTitle = card ? card.title || "Sans titre" : a.details?.card_title || "carte supprimée";
    const fieldLabel = FIELD_LABELS[a.details?.field] || a.details?.field;
    switch (a.action) {
      case 'card_created': return `a créé "${cardTitle}"`;
      case 'card_deleted': return `a supprimé "${cardTitle}"`;
      case 'card_moved': return `a déplacé "${cardTitle}" vers ${a.details?.to || "?"}`;
      case 'field_changed': return `a modifié ${fieldLabel} de "${cardTitle}"`;
      case 'comment_added': return `a commenté sur "${cardTitle}"`;
      case 'doc_uploaded': return `a ajouté un document à "${cardTitle}"`;
      case 'doc_deleted': return `a supprimé un document de "${cardTitle}"`;
      default: return `${a.action} sur "${cardTitle}"`;
    }
  };

  const sectionStyle = { background: "var(--color-background-primary)", border: ".5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20, marginBottom: 16 };

  return (
    <div style={{ padding: "20px 16px", maxWidth: 800, margin: "0 auto" }}>
      {activities.length === 0 && (
        <div style={{ ...sectionStyle, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Aucune activité enregistrée.</p>
        </div>
      )}
      {Object.entries(grouped).map(([dayLabel, items]) => (
        <div key={dayLabel} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "capitalize", marginBottom: 8 }}>{dayLabel}</div>
          {items.map(a => {
            const p = getParticipant(a.user_name);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px", marginBottom: 4, borderRadius: 8, background: "var(--color-background-primary)", border: ".5px solid var(--color-border-tertiary)", cursor: a.card_id ? "pointer" : "default" }} onClick={() => a.card_id && cards.find(c => c.id === a.card_id) && onEditCard(a.card_id)}>
                {p && <div className="ka" style={{ background: p.color, width: 28, height: 28, fontSize: 10, flexShrink: 0 }}>{p.initials}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
                    <strong>{a.user_name}</strong> {formatAction(a)}
                  </div>
                  {a.details?.old_value !== undefined && a.details?.new_value !== undefined && (
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                      <span style={{ textDecoration: "line-through" }}>{String(a.details.old_value).slice(0, 50)}</span> → <span>{String(a.details.new_value).slice(0, 50)}</span>
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)", whiteSpace: "nowrap", flexShrink: 0 }}>{formatTimestamp(a.created_at)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// --- Card Comments ---
function CardComments({ cardId, userName, session }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (!cardId) return;
    supabase.from('comments').select('*').eq('card_id', cardId).order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setComments(data); });
    const channel = supabase.channel('comments-' + cardId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `card_id=eq.${cardId}` }, payload => {
        setComments(cs => cs.find(c => c.id === payload.new.id) ? cs : [...cs, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cardId]);

  const send = async () => {
    const text = newComment.trim();
    if (!text) return;
    setNewComment('');
    await supabase.from('comments').insert([{ card_id: cardId, user_id: session?.user?.id, user_name: userName, content: text }]);
    // Log activity
    await supabase.from('activity_log').insert([{ card_id: cardId, user_id: session?.user?.id, user_name: userName, action: 'comment_added', details: { comment: text.slice(0, 100) } }]);
  };

  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8, display: "block", textTransform: "uppercase" }}>💬 Commentaires</label>
      <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 8 }}>
        {comments.length === 0 && <p style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Aucun commentaire.</p>}
        {comments.map(c => {
          const p = getParticipant(c.user_name);
          return (
            <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
              {p && <div className="ka" style={{ background: p.color, width: 24, height: 24, fontSize: 8, flexShrink: 0 }}>{p.initials}</div>}
              <div style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: 8, padding: "6px 10px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 2 }}>
                  {c.user_name} <span style={{ fontWeight: 400 }}>• {formatTimestamp(c.created_at)}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.4 }}>{c.content}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input className="ki" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Écrire un commentaire..." style={{ fontSize: 13, padding: "6px 10px" }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button className="bt bp" onClick={send} style={{ padding: "6px 12px", fontSize: 13 }}>Envoyer</button>
      </div>
    </div>
  );
}

// --- Chat View ---
function ChatView({ userName, session }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(200)
      .then(({ data }) => { if (data) setMessages(data); });
    const channel = supabase.channel('chat-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        setMessages(ms => ms.find(m => m.id === payload.new.id) ? ms : [...ms, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = newMsg.trim();
    if (!text) return;
    setNewMsg('');
    await supabase.from('chat_messages').insert([{ user_id: session?.user?.id, user_name: userName, content: text }]);
  };

  const isOwn = (msg) => msg.user_id === session?.user?.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", maxWidth: 700, margin: "0 auto", padding: "16px 12px" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
        {messages.length === 0 && <p style={{ textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13, padding: 20 }}>Aucun message. Lancez la conversation !</p>}
        {messages.map(msg => {
          const own = isOwn(msg);
          const p = getParticipant(msg.user_name);
          return (
            <div key={msg.id} style={{ display: "flex", justifyContent: own ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", maxWidth: "75%", flexDirection: own ? "row-reverse" : "row" }}>
                {p && <div className="ka" style={{ background: p.color, width: 28, height: 28, fontSize: 9, flexShrink: 0 }}>{p.initials}</div>}
                <div style={{ background: own ? "#378ADD" : "var(--color-background-secondary)", color: own ? "#fff" : "var(--color-text-primary)", borderRadius: 12, padding: "8px 12px", maxWidth: "100%" }}>
                  {!own && <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, color: p?.color || "var(--color-text-secondary)" }}>{msg.user_name}</div>}
                  <div style={{ fontSize: 14, lineHeight: 1.4, wordBreak: "break-word" }}>{msg.content}</div>
                  <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, textAlign: own ? "right" : "left" }}>{formatTimestamp(msg.created_at)}</div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      <div style={{ display: "flex", gap: 8, padding: "12px 0", borderTop: ".5px solid var(--color-border-tertiary)" }}>
        <input className="ki" value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Écrire un message..."
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} style={{ flex: 1 }} />
        <button className="bt bp" onClick={send} style={{ padding: "8px 16px" }}>Envoyer</button>
      </div>
    </div>
  );
}

// --- Profile View ---
const AVATAR_COLORS = [
  "#378ADD", "#D4537E", "#639922", "#BA7517", "#534AB7", "#D85A30",
  "#E24B4A", "#1D9E75", "#EF9F27", "#888780", "#8B5CF6", "#EC4899",
];

function ProfileView({ userName, userColor, session, onSave, onSignOut }) {
  const [editName, setEditName] = useState(userName || '');
  const [selectedColor, setSelectedColor] = useState(userColor || getParticipant(userName)?.color || AVATAR_COLORS[0]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  const currentP = getParticipant(userName);
  const displayColor = selectedColor || currentP?.color || AVATAR_COLORS[0];
  const displayInitials = editName ? editName.slice(0, 2).toUpperCase() : currentP?.initials || '?';

  const sectionStyle = { background: "var(--color-background-primary)", border: ".5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20, marginBottom: 16 };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: 10, display: "block", letterSpacing: 0.5 };

  const handleSaveName = async () => {
    const name = editName.trim();
    if (!name) return;
    await onSave({ name, color: selectedColor });
  };

  const handleSaveColor = async (color) => {
    setSelectedColor(color);
    await onSave({ color });
  };

  const handlePasswordChange = async () => {
    setPasswordMsg('');
    if (!newPassword || newPassword.length < 6) { setPasswordMsg("Le mot de passe doit faire au moins 6 caractères."); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg("Les mots de passe ne correspondent pas."); return; }
    const ok = await onSave({ password: newPassword });
    if (ok) { setNewPassword(''); setConfirmPassword(''); setPasswordMsg("Mot de passe mis à jour !"); }
  };

  return (
    <div style={{ padding: "20px 16px", maxWidth: 520, margin: "0 auto" }}>
      {/* Avatar preview */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div className="ka" style={{ width: 64, height: 64, fontSize: 22, background: displayColor, margin: "0 auto 12px" }}>{displayInitials}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)" }}>{userName}</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{session?.user?.email}</div>
      </div>

      {/* Display Name */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Nom d'affichage</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="ki" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Votre nom..."
            onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }} />
          <button className="bt bp" onClick={handleSaveName} style={{ whiteSpace: "nowrap" }}>Enregistrer</button>
        </div>
      </div>

      {/* Avatar Color */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Couleur de l'avatar</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {AVATAR_COLORS.map(color => (
            <div key={color} className="ct" onClick={() => handleSaveColor(color)}
              style={{ width: 36, height: 36, borderRadius: "50%", background: color, border: selectedColor === color ? "3px solid var(--color-text-primary)" : "3px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              {selectedColor === color && <span style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>✓</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Password */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Changer le mot de passe</label>
        <input className="ki" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" style={{ marginBottom: 8 }} />
        <input className="ki" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmer le mot de passe" style={{ marginBottom: 8 }}
          onKeyDown={e => { if (e.key === 'Enter') handlePasswordChange(); }} />
        {passwordMsg && <p style={{ fontSize: 12, color: passwordMsg.includes("mis à jour") ? "#639922" : "#E24B4A", marginBottom: 8 }}>{passwordMsg}</p>}
        <button className="bt bp" onClick={handlePasswordChange} style={{ width: "100%" }}>Mettre à jour le mot de passe</button>
      </div>

      {/* Sign out */}
      <button className="bt bd" onClick={onSignOut} style={{ width: "100%", padding: "10px 0", fontSize: 14 }}>Déconnexion</button>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [cards, setCards] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [view, setView] = useState('kanban');
  const [filter, setFilter] = useState(() => {
    try {
      const saved = localStorage.getItem('kanban_filter');
      return saved ? { ...JSON.parse(saved), search: "" } : { category: "all", owner: "all", assignee: "all", search: "" };
    } catch { return { category: "all", owner: "all", assignee: "all", search: "" }; }
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMsg, setLoginMsg] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [inlineInput, setInlineInput] = useState({ type: null, value: '', cardId: null });
  const [userName, setUserName] = useState(null);
  const [userColor, setUserColor] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [activities, setActivities] = useState([]);
  const fileRef = useRef(null);
  const debounceTimers = useRef({});
  const pendingCardIds = useRef(new Set());

  useEffect(() => {
    localStorage.setItem('kanban_filter', JSON.stringify({ ...filter, search: "" }));
  }, [filter]);

  const notify = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const askConfirm = (message, onConfirm, confirmLabel = "Supprimer") => {
    setConfirm({ message, onConfirm: () => { setConfirm(null); onConfirm(); }, confirmLabel });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setResetMode(true);
      setSession(session);
    });

    if (window.location.hash.includes('type=recovery') || window.location.hash.includes('type=invite')) {
      setResetMode(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  // Load display name and color from session metadata
  useEffect(() => {
    if (session?.user?.user_metadata?.display_name) {
      setUserName(session.user.user_metadata.display_name);
      setUserColor(session.user.user_metadata.avatar_color || null);
    } else if (session) {
      setUserName(null);
      setUserColor(null);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetchCards();
    fetchActivities();
    const channel = supabase
      .channel('public:cards')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, payload => {
        if (payload.eventType === 'INSERT') {
          setCards(cs => cs.find(c => c.id === payload.new.id) ? cs : [...cs, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setCards(cs => cs.map(c => c.id === payload.new.id ? payload.new : c));
        } else if (payload.eventType === 'DELETE') {
          setCards(cs => cs.filter(c => c.id !== payload.old.id));
        }
      })
      .subscribe();
    const actChannel = supabase.channel('public:activity_log')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, payload => {
        setActivities(as => [payload.new, ...as]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); supabase.removeChannel(actChannel); };
  }, [session]);

  const fetchCards = async () => {
    const { data, error } = await supabase.from('cards').select('*');
    if (error) console.error(error);
    else { setCards(data); setLoaded(true); }
  };

  const fetchActivities = async () => {
    const { data, error } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) console.error(error);
    else setActivities(data || []);
  };

  const logActivity = async (cardId, action, details = {}) => {
    if (!userName) return;
    await supabase.from('activity_log').insert([{
      card_id: cardId, user_id: session?.user?.id, user_name: userName, action, details
    }]);
  };

  const saveDisplayName = async (name, color) => {
    const data = { display_name: name };
    if (color) data.avatar_color = color;
    const { error } = await supabase.auth.updateUser({ data });
    if (error) { notify("Erreur lors de l'enregistrement du nom.", "error"); return; }
    setUserName(name);
    if (color) setUserColor(color);
    notify("Bienvenue, " + name + " !", "success");
  };

  const saveProfile = async (updates) => {
    const data = {};
    if (updates.name) data.display_name = updates.name;
    if (updates.color) data.avatar_color = updates.color;
    const authUpdate = { data };
    if (updates.password) authUpdate.password = updates.password;
    const { error } = await supabase.auth.updateUser(authUpdate);
    if (error) { notify("Erreur : " + (error.message || "Mise à jour échouée."), "error"); return false; }
    if (updates.name) setUserName(updates.name);
    if (updates.color) setUserColor(updates.color);
    notify("Profil mis à jour !", "success");
    return true;
  };

  const signIn = async (e) => {
    e.preventDefault();
    setLoginMsg("Connexion en cours...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginMsg(error.error_description || error.message || "Email ou mot de passe incorrect.");
    else setLoginMsg("Connecté !");
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const updatePassword = async (e) => {
    e.preventDefault();
    setLoginMsg("Mise à jour...");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoginMsg(error.error_description || error.message || "Erreur lors de la mise à jour.");
    } else {
      setLoginMsg("Mot de passe mis à jour !");
      setResetMode(false);
      setPassword('');
      notify("Votre mot de passe a été créé/modifié avec succès !", "success");
    }
  };

  const up = async (id, u) => {
    const oldCard = cards.find(c => c.id === id);
    setCards(cs => cs.map(c => c.id === id ? { ...c, ...u } : c));
    if (pendingCardIds.current.has(id)) return;
    setSaving(true);
    const { error } = await supabase.from('cards').update(u).eq('id', id);
    if (error) { console.error(error); fetchCards(); notify("Erreur lors de la sauvegarde.", "error"); }
    else if (oldCard) {
      for (const key of Object.keys(u)) {
        if (key === 'position') continue;
        const oldVal = oldCard[key];
        const newVal = u[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          if (key === 'column') {
            const colName = COLUMNS.find(c => c.id === newVal)?.title || newVal;
            logActivity(id, 'card_moved', { field: key, old_value: oldVal, new_value: newVal, to: colName, card_title: oldCard.title });
          } else {
            logActivity(id, 'field_changed', { field: key, old_value: typeof oldVal === 'object' ? JSON.stringify(oldVal) : oldVal, new_value: typeof newVal === 'object' ? JSON.stringify(newVal) : newVal, card_title: oldCard.title });
          }
        }
      }
    }
    setSaving(false);
  };

  const upText = (id, u) => {
    setCards(cs => cs.map(c => c.id === id ? { ...c, ...u } : c));
    if (pendingCardIds.current.has(id)) return;
    clearTimeout(debounceTimers.current[id]);
    debounceTimers.current[id] = setTimeout(async () => {
      delete debounceTimers.current[id];
      setSaving(true);
      const { error } = await supabase.from('cards').update(u).eq('id', id);
      if (error) { console.error(error); fetchCards(); notify("Erreur lors de la sauvegarde.", "error"); }
      setSaving(false);
    }, 500);
  };

  const add = (col) => {
    const nc = { id: uid(), title: "", desc: "", column: col, category: "other", day: "", assignees: [], owner: null, docs: [], priority: "medium", position: null, cost: null, paid_by: null, split_among: [], location: null };
    pendingCardIds.current.add(nc.id);
    setCards(cs => [...cs, nc]);
    setEditCard(nc.id);
  };

  const closeModal = () => {
    const id = editCard;
    setEditCard(null);
    setInlineInput({ type: null, value: '', cardId: null });

    if (pendingCardIds.current.has(id)) {
      pendingCardIds.current.delete(id);
      const card = cards.find(c => c.id === id);
      if (!card || !card.title.trim()) {
        setCards(cs => cs.filter(c => c.id !== id));
        return;
      }
      supabase.from('cards').insert([card]).then(({ error }) => {
        if (error) { console.error(error); setCards(cs => cs.filter(c => c.id !== id)); notify("Erreur lors de la création.", "error"); }
        else logActivity(id, 'card_created', { card_title: card.title });
      });
    }
  };

  const del = (id) => {
    if (pendingCardIds.current.has(id)) {
      pendingCardIds.current.delete(id);
      clearTimeout(debounceTimers.current[id]);
      delete debounceTimers.current[id];
      setCards(cs => cs.filter(c => c.id !== id));
      setEditCard(null);
      return;
    }
    askConfirm("Êtes-vous sûr de vouloir supprimer cette tâche ?", async () => {
      const card = cards.find(c => c.id === id);
      if (card && card.docs && card.docs.length > 0) {
        const pathsToDelete = card.docs.map(d => d.path).filter(Boolean);
        if (pathsToDelete.length > 0) await supabase.storage.from('kanban_docs').remove(pathsToDelete);
      }
      setCards(cs => cs.filter(c => c.id !== id));
      setEditCard(null);
      logActivity(id, 'card_deleted', { card_title: card?.title || "Sans titre" });
      const { error } = await supabase.from('cards').delete().eq('id', id);
      if (error) { console.error(error); fetchCards(); }
    });
  };

  const fup = async (cid, e) => {
    const fs = e.target.files;
    if (!fs.length) return;
    const card = cards.find(c => c.id === cid);
    const nd = [];
    for (const f of fs) {
      const ext = f.name.split('.').pop().toLowerCase();
      if (!ALLOWED_UPLOAD_TYPES.includes(ext)) { notify(`Type de fichier non autorisé : .${ext}`, "error"); continue; }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) { notify(`Fichier trop volumineux (max ${MAX_FILE_SIZE_MB} Mo) : ${f.name}`, "error"); continue; }
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${ext}`;
      const filePath = `${cid}/${fileName}`;
      const { error } = await supabase.storage.from('kanban_docs').upload(filePath, f);
      if (error) { notify("Erreur d'upload : " + error.message, "error"); continue; }
      const { data } = supabase.storage.from('kanban_docs').getPublicUrl(filePath);
      nd.push({ name: f.name, type: ext, size: (f.size / 1024).toFixed(0) + " KB", addedAt: new Date().toLocaleDateString("fr-FR"), path: filePath, url: data.publicUrl });
    }
    if (nd.length) {
      up(cid, { docs: [...(card.docs || []), ...nd] });
      nd.forEach(d => logActivity(cid, 'doc_uploaded', { card_title: card.title, file_name: d.name }));
    }
  };

  const rd = (cid, i) => {
    askConfirm("Supprimer ce document ?", async () => {
      const card = cards.find(c => c.id === cid);
      const doc = card.docs[i];
      if (doc.path) await supabase.storage.from('kanban_docs').remove([doc.path]);
      up(cid, { docs: card.docs.filter((_, j) => j !== i) });
    });
  };

  if (resetMode) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <form onSubmit={updatePassword} className="mo" style={{ maxWidth: 400, width: "100%", padding: 32 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8, fontWeight: 700 }}>Nouveau mot de passe</h1>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: 24, fontSize: 14 }}>Veuillez créer votre mot de passe pour finaliser l'inscription ou la récupération.</p>
          <input className="ki" type="password" placeholder="Nouveau mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button className="bt bp" style={{ width: "100%", marginTop: 16 }} type="submit">Enregistrer</button>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 16, textAlign: "center" }}>{loginMsg}</p>
        </form>
        <Toast toast={toast} />
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <form onSubmit={signIn} className="mo" style={{ maxWidth: 400, width: "100%", padding: 32 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8, fontWeight: 700 }}>🇻🇳 Vietnam 2026</h1>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: 24, fontSize: 14 }}>Connectez-vous pour accéder au Kanban.</p>
          <input className="ki" type="email" placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="ki" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginTop: 12 }} required />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <button className="bt bp" style={{ flex: 1 }} type="submit">Se connecter</button>
          </div>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 16, textAlign: "center" }}>{loginMsg}</p>
          <button type="button" onClick={async () => {
            if (!email) return notify("Veuillez saisir votre email d'abord !", "warn");
            try {
              await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
              notify("Un email de récupération vous a été envoyé si le compte existe.", "success");
            } catch (e) {
              notify("Erreur lors de l'envoi de l'email.", "error");
            }
          }} style={{ background: "none", border: "none", color: "#378ADD", fontSize: 13, textDecoration: "underline", cursor: "pointer", width: "100%", marginTop: 12 }}>Mot de passe oublié ?</button>
        </form>
        <Toast toast={toast} />
      </div>
    );
  }

  // Display name selection screen
  if (session && !userName) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="mo" style={{ maxWidth: 440, width: "100%", padding: 32 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8, fontWeight: 700 }}>Qui êtes-vous ?</h1>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: 24, fontSize: 14 }}>Entrez votre nom pour les commentaires et le chat.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="ki" value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Votre nom..." onKeyDown={e => { if (e.key === 'Enter' && nameInput.trim()) saveDisplayName(nameInput.trim()); }} />
            <button className="bt bp" onClick={() => { if (nameInput.trim()) saveDisplayName(nameInput.trim()); }}>OK</button>
          </div>
        </div>
        <Toast toast={toast} />
      </div>
    );
  }

  const fc = cards.filter(c => {
    if (filter.category !== "all" && c.category !== filter.category) return false;
    if (filter.owner !== "all" && c.owner !== filter.owner) return false;
    if (filter.assignee !== "all" && !c.assignees.includes(filter.assignee)) return false;
    if (filter.search && !c.title?.toLowerCase().includes(filter.search.toLowerCase()) && !c.desc?.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newColumn = destination.droppableId;
    const sortedDestCards = cards
      .filter(c => c.column === newColumn && c.id !== draggableId)
      .sort((a, b) => (a.position ?? 999999) - (b.position ?? 999999));

    const prevCard = sortedDestCards[destination.index - 1];
    const nextCard = sortedDestCards[destination.index];

    let newPosition;
    if (!prevCard && !nextCard) newPosition = 1000;
    else if (!prevCard) newPosition = (nextCard.position ?? 1000) - 500;
    else if (!nextCard) newPosition = (prevCard.position ?? 0) + 1000;
    else newPosition = ((prevCard.position ?? 0) + (nextCard.position ?? 0)) / 2;

    up(draggableId, { column: newColumn, position: newPosition });
  };

  const st = {
    total: cards.length,
    todo: cards.filter(c => c.column === "todo").length,
    inprogress: cards.filter(c => c.column === "inprogress").length,
    booked: cards.filter(c => c.column === "booked").length,
    done: cards.filter(c => c.column === "done").length
  };
  const totalBudget = cards.filter(c => c.cost > 0).reduce((s, c) => s + c.cost, 0);

  if (!loaded) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>Chargement du Kanban...</div>;

  const cat = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[5];
  const allOwners = Array.from(new Set(cards.map(c => c.owner).filter(Boolean)));

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: ".5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>🇻🇳 Vietnam 2026</h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
              juillet • {st.total} tâches • {st.booked + st.done} confirmées
              {totalBudget > 0 ? ` • ${formatEur(totalBudget)}` : ""}
              {saving ? " • Enregistrement…" : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* View toggle */}
            <div style={{ display: "flex", background: "var(--color-background-secondary)", borderRadius: 8, padding: 2 }}>
              {[
                { id: 'kanban', label: 'Kanban', icon: '📋' },
                { id: 'budget', label: 'Budget', icon: '💰' },
                { id: 'itinerary', label: 'Planning', icon: '📅' },
                { id: 'map', label: 'Carte', icon: '🗺' },
                { id: 'activity', label: 'Activité', icon: '📜' },
                { id: 'chat', label: 'Chat', icon: '💬' },
              ].map(v => (
                <button key={v.id} className="bt" onClick={() => setView(v.id)}
                  style={{ fontSize: 12, borderRadius: 6, border: "none", padding: "5px 10px", background: view === v.id ? "var(--color-background-primary)" : "transparent", boxShadow: view === v.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none", fontWeight: view === v.id ? 600 : 400 }}
                >{v.icon} {v.label}</button>
              ))}
            </div>
            {view === 'kanban' && (
              <>
                <input className="ki" placeholder="Rechercher..." style={{ width: 140, padding: "6px 10px", fontSize: 13 }} value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
                <select className="ks" value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}>
                  <option value="all">Toutes catégories</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
                <select className="ks" value={filter.owner} onChange={e => setFilter(f => ({ ...f, owner: e.target.value }))}>
                  <option value="all">Tous propriétaires</option>
                  {allOwners.map(id => <option key={id} value={id}>👑 {getParticipant(id)?.name}</option>)}
                </select>
                <select className="ks" value={filter.assignee} onChange={e => setFilter(f => ({ ...f, assignee: e.target.value }))}>
                  <option value="all">Tous participants</option>
                  {PARTICIPANTS.map(p => <option key={p.id} value={p.id}>👥 {p.name}</option>)}
                </select>
              </>
            )}
            <div className="ct" onClick={() => setView('profile')}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, border: ".5px solid var(--color-border-tertiary)" }}>
              <div className="ka" style={{ background: userColor || getParticipant(userName)?.color || "#378ADD", width: 22, height: 22, fontSize: 8 }}>{getParticipant(userName)?.initials || "?"}</div>
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{userName}</span>
            </div>
          </div>
        </div>
        {view === 'kanban' && (
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            {COLUMNS.map(col => {
              const n = cards.filter(c => c.column === col.id).length;
              const p = st.total ? (n / st.total * 100) : 0;
              return (
                <div key={col.id} style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                    <span>{col.title}</span><span style={{ fontWeight: 600 }}>{n}</span>
                  </div>
                  <div className="pg"><div className="pb" style={{ width: p + "%", background: col.color }} /></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main content */}
      {view === 'kanban' && (
        <div style={{ display: "flex", gap: 12, padding: "16px 12px", overflowX: "auto", minHeight: "calc(100vh - 140px)" }}>
          <DragDropContext onDragEnd={handleDragEnd}>
            {COLUMNS.map(col => {
              const cc = fc.filter(c => c.column === col.id).sort((a, b) => {
                const posDiff = (a.position ?? 999999) - (b.position ?? 999999);
                if (posDiff !== 0) return posDiff;
                const p = { high: 0, medium: 1, low: 2 };
                const priDiff = (p[a.priority] || 1) - (p[b.priority] || 1);
                if (priDiff !== 0) return priDiff;
                return new Date(a.created_at || 0) - new Date(b.created_at || 0);
              });
              return (
                <Droppable key={col.id} droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} style={{ minWidth: 280, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.color }} />
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{col.title}</span>
                          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)", padding: "1px 8px", borderRadius: 10 }}>{cc.length}</span>
                        </div>
                        <button onClick={() => add(col.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", lineHeight: 1 }}>+</button>
                      </div>
                      <div style={{ minHeight: 80, borderRadius: 10, padding: 2, ...(snapshot.isDraggingOver ? { border: "2px dashed #378ADD", background: "rgba(55,138,221,0.05)" } : {}) }}>
                        {cc.map((card, index) => (
                          <Draggable key={card.id} draggableId={card.id} index={index}>
                            {(provided, snapshot) => {
                              const ct2 = cat(card.category);
                              return (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`kc${snapshot.isDragging ? " dr" : ""}`}
                                  onClick={() => setEditCard(card.id)}
                                  style={{ ...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.6 : 1, borderLeft: `3px solid ${ct2.color}` }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                                    <div className="kb" style={{ background: ct2.color + "18", color: ct2.color }}>
                                      <span style={{ fontSize: 12 }}>{ct2.icon}</span> {ct2.label}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                      {card.owner && <div className="kb" style={{ background: "var(--color-background-secondary)", border: ".5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>👑 {getParticipant(card.owner).name}</div>}
                                      {card.priority === "high" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#E24B4A" }} />}
                                      {card.day && <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500 }}>{formatDay(card.day)}</span>}
                                    </div>
                                  </div>
                                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4, lineHeight: 1.3 }}>{card.title || "Sans titre"}</p>
                                  {card.desc && <p style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.4, marginBottom: 8 }}>{card.desc.length > 100 ? card.desc.slice(0, 100) + "..." : card.desc}</p>}
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex" }}>
                                      {(card.assignees || []).slice(0, 4).map(aid => {
                                        const p = getParticipant(aid);
                                        return p ? <div key={aid} className="ka" style={{ background: p.color, marginRight: -4, border: "2px solid var(--color-background-primary)" }} title={p.name}>{p.initials}</div> : null;
                                      })}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      {card.cost > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: "#378ADD", background: "#378ADD15", padding: "1px 6px", borderRadius: 4 }}>{formatEur(card.cost)}</span>}
                                      {(card.docs || []).length > 0 && <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>📎 {card.docs.length}</span>}
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </DragDropContext>
        </div>
      )}
      {view === 'budget' && <BudgetView cards={cards} onEditCard={setEditCard} />}
      {view === 'itinerary' && <ItineraryView cards={cards} onEditCard={setEditCard} />}
      {view === 'map' && <MapView cards={cards} onEditCard={setEditCard} />}
      {view === 'activity' && <ActivityView activities={activities} cards={cards} onEditCard={setEditCard} />}
      {view === 'chat' && <ChatView userName={userName} session={session} />}
      {view === 'profile' && <ProfileView userName={userName} userColor={userColor} session={session} onSave={saveProfile} onSignOut={signOut} />}

      {/* Edit card modal */}
      {editCard && (() => {
        const card = cards.find(c => c.id === editCard);
        if (!card) return null;
        return (
          <div className="ov" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
            <div className="mo" onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>Modifier la carte</h2>
                <button onClick={closeModal} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-text-secondary)" }}>×</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>Titre</label>
                  <input className="ki" value={card.title} onChange={e => upText(card.id, { title: e.target.value })} placeholder="Titre..." autoFocus />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>Description</label>
                  <textarea className="ki" rows={3} value={card.desc} onChange={e => upText(card.id, { desc: e.target.value })} placeholder="Détails, notes, liens..." style={{ resize: "vertical" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>Catégorie</label>
                    <select className="ks" style={{ width: "100%" }} value={card.category} onChange={e => up(card.id, { category: e.target.value })}>
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>Priorité</label>
                    <select className="ks" style={{ width: "100%" }} value={card.priority} onChange={e => up(card.id, { priority: e.target.value })}>
                      <option value="high">Haute</option>
                      <option value="medium">Moyenne</option>
                      <option value="low">Basse</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>Dates</label>
                    <DatePicker value={card.day} onChange={val => up(card.id, { day: val })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>Statut</label>
                    <select className="ks" style={{ width: "100%" }} value={card.column} onChange={e => up(card.id, { column: e.target.value })}>
                      {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                </div>

                {/* Cost tracking section */}
                <div style={{ borderTop: ".5px solid var(--color-border-tertiary)", paddingTop: 14, marginTop: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 10, display: "block", textTransform: "uppercase" }}>💰 Coût & partage</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>Montant</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          className="ki"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          value={card.cost ?? ""}
                          onChange={e => up(card.id, { cost: e.target.value === "" ? null : parseFloat(e.target.value) })}
                          style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-secondary)" }}>€</span>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>Payé par</label>
                      <select className="ks" style={{ width: "100%" }} value={card.paid_by || ""} onChange={e => up(card.id, { paid_by: e.target.value || null })}>
                        <option value="">Sélectionner...</option>
                        {PARTICIPANTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        {card.paid_by && !PARTICIPANTS.find(p => p.id === card.paid_by) && <option value={card.paid_by}>{card.paid_by}</option>}
                      </select>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>Partagé entre</label>
                      <div style={{ display: "flex", gap: 4 }}>
                        {(card.assignees || []).length > 0 && (
                          <button className="bt" onClick={() => up(card.id, { split_among: [...card.assignees] })} style={{ fontSize: 11, padding: "2px 8px" }}>= Participants</button>
                        )}
                        <button className="bt" onClick={() => up(card.id, { split_among: PARTICIPANTS.map(p => p.id) })} style={{ fontSize: 11, padding: "2px 8px" }}>Tous</button>
                        {(card.split_among || []).length > 0 && (
                          <button className="bt" onClick={() => up(card.id, { split_among: [] })} style={{ fontSize: 11, padding: "2px 8px" }}>Aucun</button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {PARTICIPANTS.map(p => {
                        const a = (card.split_among || []).includes(p.id);
                        return (
                          <div
                            key={p.id}
                            className="ct"
                            onClick={() => {
                              const n = a ? (card.split_among || []).filter(x => x !== p.id) : [...(card.split_among || []), p.id];
                              up(card.id, { split_among: n });
                            }}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 16, border: a ? `2px solid ${p.color}` : "1px solid var(--color-border-tertiary)", background: a ? p.color + "15" : "transparent", fontSize: 12 }}
                          >
                            <div className="ka" style={{ width: 18, height: 18, fontSize: 7, background: a ? p.color : "var(--color-background-tertiary)" }}>{p.initials}</div>
                            <span style={{ color: a ? p.color : "var(--color-text-secondary)", fontWeight: a ? 600 : 400 }}>{p.name}</span>
                          </div>
                        );
                      })}
                    </div>
                    {card.cost > 0 && (card.split_among || []).length > 0 && (
                      <p style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
                        → {formatEur(card.cost / card.split_among.length)} par personne
                      </p>
                    )}
                  </div>
                </div>

                {/* Location section */}
                <div style={{ borderTop: ".5px solid var(--color-border-tertiary)", paddingTop: 14, marginTop: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 10, display: "block", textTransform: "uppercase" }}>📍 Emplacement</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {VIETNAM_LOCATIONS.map(loc => (
                      <div key={loc.label} className="ct"
                        onClick={() => up(card.id, { location: { lat: loc.lat, lng: loc.lng, label: loc.label } })}
                        style={{ padding: "3px 8px", borderRadius: 16, fontSize: 12, border: card.location?.label === loc.label ? "2px solid #378ADD" : "1px solid var(--color-border-tertiary)", background: card.location?.label === loc.label ? "#378ADD15" : "transparent", color: card.location?.label === loc.label ? "#378ADD" : "var(--color-text-secondary)", fontWeight: card.location?.label === loc.label ? 600 : 400 }}>
                        {loc.label}
                      </div>
                    ))}
                    {card.location && (
                      <div className="ct" onClick={() => up(card.id, { location: null })}
                        style={{ padding: "3px 8px", borderRadius: 16, fontSize: 12, border: "1px solid var(--color-border-tertiary)", color: "#E24B4A" }}>
                        ✕ Retirer
                      </div>
                    )}
                  </div>
                  {card.location && (
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                      📍 {card.location.label} ({card.location.lat.toFixed(4)}, {card.location.lng.toFixed(4)})
                    </div>
                  )}
                  <LocationPicker location={card.location} onChange={(loc) => up(card.id, { location: loc })} />
                </div>

                {/* Owner & participants section */}
                <div style={{ borderTop: ".5px solid var(--color-border-tertiary)", paddingTop: 14, marginTop: 4 }}>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200, background: "var(--color-background-secondary)", padding: 12, borderRadius: 8 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, display: "block", textTransform: "uppercase" }}>👑 Propriétaire de la tâche</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <select className="ks" style={{ width: "100%" }} value={card.owner || ""} onChange={e => up(card.id, { owner: e.target.value || null })}>
                          <option value="">Sélectionner...</option>
                          {PARTICIPANTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          {card.owner && !PARTICIPANTS.find(p => p.id === card.owner) && <option value={card.owner}>{card.owner}</option>}
                        </select>
                        {inlineInput.type === 'owner' && inlineInput.cardId === card.id ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            <input
                              className="ki"
                              style={{ fontSize: 13, padding: "4px 8px" }}
                              placeholder="Nom..."
                              value={inlineInput.value}
                              autoFocus
                              onChange={e => setInlineInput(s => ({ ...s, value: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const n = inlineInput.value.trim();
                                  if (n && n.length <= 50) up(card.id, { owner: n });
                                  setInlineInput({ type: null, value: '', cardId: null });
                                }
                                if (e.key === 'Escape') setInlineInput({ type: null, value: '', cardId: null });
                              }}
                            />
                            <button className="bt bp" style={{ padding: "4px 8px" }} onClick={() => {
                              const n = inlineInput.value.trim();
                              if (n && n.length <= 50) up(card.id, { owner: n });
                              setInlineInput({ type: null, value: '', cardId: null });
                            }}>✓</button>
                            <button className="bt" style={{ padding: "4px 8px" }} onClick={() => setInlineInput({ type: null, value: '', cardId: null })}>×</button>
                          </div>
                        ) : (
                          <button className="bt" onClick={() => setInlineInput({ type: 'owner', value: '', cardId: card.id })} style={{ padding: "6px 10px", fontSize: 12, whiteSpace: "nowrap" }}>+ Créer</button>
                        )}
                      </div>
                    </div>
                    <div style={{ flex: 2, minWidth: 260 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, display: "block", textTransform: "uppercase" }}>👥 Tous les participants</label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {PARTICIPANTS.map(p => {
                          const a = (card.assignees || []).includes(p.id);
                          return (
                            <div
                              key={p.id}
                              className="ct"
                              onClick={() => {
                                const n = a ? card.assignees.filter(x => x !== p.id) : [...(card.assignees || []), p.id];
                                up(card.id, { assignees: n });
                              }}
                              style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, border: a ? `2px solid ${p.color}` : "1px solid var(--color-border-tertiary)", background: a ? p.color + "15" : "transparent", fontSize: 13 }}
                            >
                              <div className="ka" style={{ width: 20, height: 20, fontSize: 8, background: a ? p.color : "var(--color-background-tertiary)" }}>{p.initials}</div>
                              <span style={{ color: a ? p.color : "var(--color-text-secondary)", fontWeight: a ? 600 : 400 }}>{p.name}</span>
                            </div>
                          );
                        })}
                        {(card.assignees || []).filter(aid => !PARTICIPANTS.find(x => x.id === aid)).map(aid => {
                          const p = getParticipant(aid);
                          return (
                            <div
                              key={p.id}
                              className="ct"
                              onClick={() => { up(card.id, { assignees: card.assignees.filter(x => x !== p.id) }); }}
                              style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, border: `2px solid ${p.color}`, background: p.color + "15", fontSize: 13 }}
                              title="Cliquer pour retirer"
                            >
                              <div className="ka" style={{ width: 20, height: 20, fontSize: 8, background: p.color }}>{p.initials}</div>
                              <span style={{ color: p.color, fontWeight: 600 }}>{p.name} ×</span>
                            </div>
                          );
                        })}
                        {inlineInput.type === 'participant' && inlineInput.cardId === card.id ? (
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input
                              className="ki"
                              style={{ fontSize: 13, padding: "4px 8px", width: 130 }}
                              placeholder="Nom..."
                              value={inlineInput.value}
                              autoFocus
                              onChange={e => setInlineInput(s => ({ ...s, value: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const n = inlineInput.value.trim();
                                  if (n && n.length <= 50 && !(card.assignees || []).includes(n)) up(card.id, { assignees: [...(card.assignees || []), n] });
                                  setInlineInput({ type: null, value: '', cardId: null });
                                }
                                if (e.key === 'Escape') setInlineInput({ type: null, value: '', cardId: null });
                              }}
                            />
                            <button className="bt bp" style={{ padding: "4px 8px" }} onClick={() => {
                              const n = inlineInput.value.trim();
                              if (n && n.length <= 50 && !(card.assignees || []).includes(n)) up(card.id, { assignees: [...(card.assignees || []), n] });
                              setInlineInput({ type: null, value: '', cardId: null });
                            }}>✓</button>
                            <button className="bt" style={{ padding: "4px 8px" }} onClick={() => setInlineInput({ type: null, value: '', cardId: null })}>×</button>
                          </div>
                        ) : (
                          <button className="bt" onClick={() => setInlineInput({ type: 'participant', value: '', cardId: card.id })} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 13 }}>+ Autre</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6, display: "block" }}>Documents & preuves</label>
                  {(card.docs || []).map((doc, i) => (
                    <div key={i} className="dc">
                      <div className="di" style={{ background: doc.type === "pdf" ? "#E24B4A" : doc.type === "png" || doc.type === "jpg" ? "#378ADD" : "#534AB7" }}>
                        {doc.type?.toUpperCase().slice(0, 3) || "DOC"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <a href={doc.url || "#"} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", textDecoration: doc.url ? "underline" : "none", display: "block", marginBottom: 2 }}>{doc.name}</a>
                        {doc.size && <p style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{doc.size} • {doc.addedAt || "ajouté"}</p>}
                      </div>
                      <button onClick={() => rd(card.id, i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 16 }}>×</button>
                    </div>
                  ))}
                  <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => fup(card.id, e)} />
                  <button className="bt" onClick={() => fileRef.current?.click()} style={{ width: "100%", marginTop: 4, fontSize: 13, color: "var(--color-text-secondary)" }}>+ Ajouter un document</button>
                </div>
                {/* Comments */}
                <div style={{ borderTop: ".5px solid var(--color-border-tertiary)", paddingTop: 14, marginTop: 4 }}>
                  <CardComments cardId={card.id} userName={userName} session={session} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 14, borderTop: ".5px solid var(--color-border-tertiary)" }}>
                  <button className="bt bd" onClick={() => del(card.id)} style={{ fontSize: 13 }}>Supprimer</button>
                  <button className="bt bp" onClick={closeModal} style={{ fontSize: 13 }}>Fermer</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <Toast toast={toast} />
      <ConfirmDialog confirm={confirm} onCancel={() => setConfirm(null)} />
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
