const { useState, useEffect, useRef } = React;
const { DragDropContext, Droppable, Draggable } = window.HelloPangeaDnd;
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
  const fpRef = useRef(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const defaultVal = value ? value : null;
    const fp = window.flatpickr(fpRef.current, {
      mode: "range",
      dateFormat: "d/m/Y",
      locale: "fr",
      defaultDate: defaultVal,
      onReady: function(selectedDates, dateStr, instance) {
        if (!defaultVal) instance.jumpToDate(new Date(2026, 6, 1));
      },
      onChange: (selectedDates, dateStr) => { onChangeRef.current(dateStr); }
    });
    return () => fp.destroy();
  }, [value]);

  return <input ref={fpRef} className="ki" placeholder="Sélectionner date(s)..." defaultValue={value} />;
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

  useEffect(() => {
    if (!session) return;
    fetchCards();
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
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const fetchCards = async () => {
    const { data, error } = await supabase.from('cards').select('*');
    if (error) console.error(error);
    else { setCards(data); setLoaded(true); }
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
    setCards(cs => cs.map(c => c.id === id ? { ...c, ...u } : c));
    if (pendingCardIds.current.has(id)) return;
    setSaving(true);
    const { error } = await supabase.from('cards').update(u).eq('id', id);
    if (error) { console.error(error); fetchCards(); notify("Erreur lors de la sauvegarde.", "error"); }
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
    const nc = { id: uid(), title: "", desc: "", column: col, category: "other", day: "", assignees: [], owner: null, docs: [], priority: "medium", position: null, cost: null, paid_by: null, split_among: [] };
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
    if (nd.length) up(cid, { docs: [...(card.docs || []), ...nd] });
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
              <button
                className="bt"
                onClick={() => setView('kanban')}
                style={{ fontSize: 12, borderRadius: 6, border: "none", padding: "5px 12px", background: view === 'kanban' ? "var(--color-background-primary)" : "transparent", boxShadow: view === 'kanban' ? "0 1px 3px rgba(0,0,0,0.1)" : "none", fontWeight: view === 'kanban' ? 600 : 400 }}
              >Kanban</button>
              <button
                className="bt"
                onClick={() => setView('budget')}
                style={{ fontSize: 12, borderRadius: 6, border: "none", padding: "5px 12px", background: view === 'budget' ? "var(--color-background-primary)" : "transparent", boxShadow: view === 'budget' ? "0 1px 3px rgba(0,0,0,0.1)" : "none", fontWeight: view === 'budget' ? 600 : 400 }}
              >Budget</button>
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
            <button className="bt" onClick={signOut} style={{ fontSize: 12 }}>Déconnexion</button>
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

      {/* Main content: Kanban or Budget view */}
      {view === 'kanban' ? (
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
                                  style={{ ...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.6 : 1 }}
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
      ) : (
        <BudgetView cards={cards} onEditCard={setEditCard} />
      )}

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
