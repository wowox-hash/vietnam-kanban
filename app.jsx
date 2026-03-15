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

function uid(){return "c"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

function formatDay(str) {
  if (!str) return "";
  if (str.startsWith("J") || !str.match(/\d{2}\/\d{2}\/\d{4}/)) return str;
  const parseFr = (d) => { const p=d.split('/'); return parseInt(p[0])+" "+(["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"][parseInt(p[1])-1]); };
  if (str.includes(" au ")) {
    const [start, end] = str.split(" au ");
    const s = start.split('/');
    const e = end.split('/');
    if (s[1] === e[1] && s[2] === e[2]) {
      return `${parseInt(s[0])}-${parseInt(e[0])} ${["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"][parseInt(s[1])-1]}`;
    }
    return `${parseFr(start)} - ${parseFr(end)}`;
  }
  return parseFr(str);
}

function getParticipant(idOrName) {
  if (!idOrName) return null;
  const p = PARTICIPANTS.find(x => x.id === idOrName);
  if (p) return p;
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) hash = idOrName.charCodeAt(i) + ((hash << 5) - hash);
  return { id: idOrName, name: idOrName, initials: idOrName.slice(0, 2).toUpperCase(), color: `hsl(${Math.abs(hash) % 360}, 65%, 45%)` };
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
        if (!defaultVal) {
          instance.jumpToDate(new Date(2026, 6, 1)); // 6 is July (0-indexed)
        }
      },
      onChange: (selectedDates, dateStr) => {
        onChangeRef.current(dateStr);
      }
    });
    return () => fp.destroy();
  }, [value]);

  return <input ref={fpRef} className="ki" placeholder="Sélectionner date(s)..." defaultValue={value} />;
};

function App() {
  const [session, setSession] = useState(null);
  const [cards, setCards] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [filter, setFilter] = useState({category:"all",owner:"all",assignee:"all",search:""});
  const [dragCard, setDragCard] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMsg, setLoginMsg] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setResetMode(true);
      }
      setSession(session);
    });

    // Fallback detection via URL hash in case event fires too early or we hit reload
    if (window.location.hash.includes('type=recovery')) {
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
        fetchCards(); // Simplest way to resync, could be optimized
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const fetchCards = async () => {
    const { data, error } = await supabase.from('cards').select('*');
    if (error) console.error(error);
    else {
      setCards(data);
      setLoaded(true);
    }
  };

  const signIn = async (e) => {
    e.preventDefault();
    setLoginMsg("Connexion en cours...");
    const { error } = await supabase.auth.signInWithPassword({ 
      email,
      password
    });
    if (error) setLoginMsg(error.error_description || error.message || "Email ou mot de passe incorrect.");
    else setLoginMsg("Connecté !");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setLoginMsg("Mise à jour...");
    const { error } = await supabase.auth.updateUser({ password: password });
    if (error) {
      setLoginMsg(error.error_description || error.message || "Erreur lors de la mise à jour.");
    } else {
      setLoginMsg("Mot de passe mis à jour !");
      setResetMode(false);
      setPassword('');
      alert("Votre mot de passe a été créé/modifié avec succès !");
    }
  };

  const up = async (id, u) => {
    // Optimistic update
    setCards(cs => cs.map(c => c.id === id ? { ...c, ...u } : c));
    const { error } = await supabase.from('cards').update(u).eq('id', id);
    if (error) {
       console.error(error);
       fetchCards(); // revert optimistic update on error
    }
  };

  const del = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) return;
    
    // First, delete any attached documents from storage to avoid orphan files
    const card = cards.find(c => c.id === id);
    if (card && card.docs && card.docs.length > 0) {
      const pathsToDelete = card.docs.map(d => d.path).filter(Boolean);
      if (pathsToDelete.length > 0) {
        await supabase.storage.from('kanban_docs').remove(pathsToDelete);
      }
    }

    setCards(cs => cs.filter(c => c.id !== id));
    setEditCard(null);
    const { error } = await supabase.from('cards').delete().eq('id', id);
    if (error) {
       console.error(error);
       fetchCards();
    }
  };

  const add = async (col) => {
    const nc = { id: uid(), title: "", desc: "", column: col, category: "other", day: "", assignees: [], owner: null, docs: [], priority: "medium" };
    setCards(cs => [...cs, nc]);
    setEditCard(nc.id);
    const { error } = await supabase.from('cards').insert([nc]);
    if (error) {
       console.error(error);
       fetchCards();
    }
  };

  if (resetMode) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <form onSubmit={updatePassword} className="mo" style={{maxWidth:400,width:"100%",padding:32}}>
          <h1 style={{fontSize:24,marginBottom:8,fontWeight:700}}>Nouveau mot de passe</h1>
          <p style={{color:"var(--color-text-secondary)",marginBottom:24,fontSize:14}}>Veuillez créer votre mot de passe pour finaliser l'inscription ou la récupération.</p>
          <input className="ki" type="password" placeholder="Nouveau mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button className="bt bp" style={{width:"100%",marginTop:16}} type="submit">Enregistrer</button>
          <p style={{fontSize:13,color:"var(--color-text-secondary)",marginTop:16,textAlign:"center"}}>{loginMsg}</p>
        </form>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <form onSubmit={signIn} className="mo" style={{maxWidth:400,width:"100%",padding:32}}>
          <h1 style={{fontSize:24,marginBottom:8,fontWeight:700}}>🇻🇳 Vietnam 2026</h1>
          <p style={{color:"var(--color-text-secondary)",marginBottom:24,fontSize:14}}>Connectez-vous pour accéder au Kanban.</p>
          <input className="ki" type="email" placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="ki" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} style={{marginTop: 12}} required />
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop: 16}}>
            <button className="bt bp" style={{flex: 1}} type="submit">Se connecter</button>
          </div>
          <p style={{fontSize:13,color:"var(--color-text-secondary)",marginTop:16,textAlign:"center"}}>{loginMsg}</p>
          <button type="button" onClick={async () => {
             if(!email) return alert("Veuillez saisir votre email d'abord !");
             try { await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname }); alert("Un email de récupération vous a été envoyé si le compte existe."); } catch (e) { alert("Erreur."); }
          }} style={{background:"none",border:"none",color:"#378ADD",fontSize:13,textDecoration:"underline",cursor:"pointer",width:"100%",marginTop:12}}>Mot de passe oublié ?</button>
        </form>
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
    if (source.droppableId !== destination.droppableId) {
       up(draggableId, { column: destination.droppableId });
    }
  };

  const fup = async (cid, e) => {
    const fs = e.target.files;
    if (!fs.length) return;
    const card = cards.find(c => c.id === cid);
    const nd = [];
    for (const f of fs) {
      const fileExt = f.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${cid}/${fileName}`;
      const { error } = await supabase.storage.from('kanban_docs').upload(filePath, f);
      if (error) { alert("Erreur d'upload: " + error.message); continue; }
      const { data } = supabase.storage.from('kanban_docs').getPublicUrl(filePath);
      nd.push({ name: f.name, type: fileExt, size: (f.size / 1024).toFixed(0) + " KB", addedAt: new Date().toLocaleDateString("fr-FR"), path: filePath, url: data.publicUrl });
    }
    if (nd.length) up(cid, { docs: [...(card.docs || []), ...nd] });
  };

  const rd = async (cid, i) => {
     if (!window.confirm("Supprimer ce document ?")) return;
     const card = cards.find(c => c.id === cid);
     const doc = card.docs[i];
     if (doc.path) await supabase.storage.from('kanban_docs').remove([doc.path]);
     up(cid, { docs: card.docs.filter((_, j) => j !== i) });
  };
  
  const reset = () => {
    alert("Reset disabled in multiplayer mode. Delete cards manually.");
  };

  const st = { total: cards.length, todo: cards.filter(c => c.column === "todo").length, inprogress: cards.filter(c => c.column === "inprogress").length, booked: cards.filter(c => c.column === "booked").length, done: cards.filter(c => c.column === "done").length };
  
  if (!loaded) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>Chargement du Kanban...</div>;
  const cat = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[5];

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh" }}>
      <div style={{ padding: "16px 20px", borderBottom: ".5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>🇻🇳 Vietnam 2026 — Kanban</h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>2-22 juillet • {st.total} tâches • {st.booked + st.done} confirmées</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input className="ki" placeholder="Rechercher..." style={{ width: 140, padding: "6px 10px", fontSize: 13 }} value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
            <select className="ks" value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}><option value="all">Toutes catégories</option>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select>
            <select className="ks" value={filter.owner} onChange={e => setFilter(f => ({ ...f, owner: e.target.value }))}>
              <option value="all">Tous propriétaires</option>
              {Array.from(new Set([...PARTICIPANTS.filter(p => ["max", "thuy", "trinh", "frederic"].includes(p.id)).map(p=>p.id), ...cards.map(c=>c.owner).filter(Boolean)])).map(id => <option key={id} value={id}>👑 {getParticipant(id)?.name}</option>)}
            </select>
            <select className="ks" value={filter.assignee} onChange={e => setFilter(f => ({ ...f, assignee: e.target.value }))}><option value="all">Tous participants</option>{PARTICIPANTS.map(p => <option key={p.id} value={p.id}>👥 {p.name}</option>)}</select>
            <button className="bt" onClick={signOut} style={{ fontSize: 12 }}>Déconnexion</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          {COLUMNS.map(col => { const n = cards.filter(c => c.column === col.id).length; const p = st.total ? (n / st.total * 100) : 0; return (<div key={col.id} style={{ flex: 1, minWidth: 120 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}><span>{col.title}</span><span style={{ fontWeight: 600 }}>{n}</span></div><div className="pg"><div className="pb" style={{ width: p + "%", background: col.color }} /></div></div>) })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, padding: "16px 12px", overflowX: "auto", minHeight: "calc(100vh - 140px)" }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          {COLUMNS.map(col => {
            const cc = fc.filter(c => c.column === col.id).sort((a, b) => { const p = { high: 0, medium: 1, low: 2 }; return (p[a.priority] || 1) - (p[b.priority] || 1) }); return (
              <Droppable key={col.id} droppableId={col.id}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} style={{ minWidth: 280, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: col.color }} /><span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{col.title}</span><span style={{ fontSize: 12, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)", padding: "1px 8px", borderRadius: 10 }}>{cc.length}</span></div>
                      <button onClick={() => add(col.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", lineHeight: 1 }}>+</button>
                    </div>
                    <div style={{ minHeight: 80, borderRadius: 10, padding: 2, ...(snapshot.isDraggingOver ? { border: "2px dashed #378ADD", background: "rgba(55,138,221,0.05)" } : {}) }}>
                      {cc.map((card, index) => (
                        <Draggable key={card.id} draggableId={card.id} index={index}>
                          {(provided, snapshot) => {
                            const ct2 = cat(card.category); return (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`kc${snapshot.isDragging ? " dr" : ""}`} onClick={() => setEditCard(card.id)} style={{...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.6 : 1}}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                                <div className="kb" style={{ background: ct2.color + "18", color: ct2.color }}><span style={{ fontSize: 12 }}>{ct2.icon}</span> {ct2.label}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  {card.owner && <div className="kb" style={{background: "var(--color-background-secondary)", border: ".5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)"}}>👑 {getParticipant(card.owner).name}</div>}
                                  {card.priority === "high" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#E24B4A" }} />}
                                  {card.day && <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500 }}>{formatDay(card.day)}</span>}
                                </div>
                              </div>
                              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4, lineHeight: 1.3 }}>{card.title || "Sans titre"}</p>
                              {card.desc && <p style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.4, marginBottom: 8 }}>{card.desc.length > 100 ? card.desc.slice(0, 100) + "..." : card.desc}</p>}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex" }}>{(card.assignees || []).slice(0, 4).map(aid => { const p = getParticipant(aid); return p ? <div key={aid} className="ka" style={{ background: p.color, marginRight: -4, border: "2px solid var(--color-background-primary)" }} title={p.name}>{p.initials}</div> : null })}</div>
                                {(card.docs || []).length > 0 && <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>📎 {card.docs.length}</span>}
                              </div>
                            </div>
                          )}}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            )
          })}
        </DragDropContext>
      </div>

      {editCard && (() => {
        const card = cards.find(c => c.id === editCard); if (!card) return null; const ct2 = cat(card.category); return (
          <div className="ov" onClick={e => { if (e.target === e.currentTarget) setEditCard(null) }}>
            <div className="mo" onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>Modifier la carte</h2>
                <button onClick={() => setEditCard(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-text-secondary)" }}>×</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div><label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>Titre</label><input className="ki" value={card.title} onChange={e => up(card.id, { title: e.target.value })} placeholder="Titre..." /></div>
                <div><label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>Description</label><textarea className="ki" rows={3} value={card.desc} onChange={e => up(card.id, { desc: e.target.value })} placeholder="Détails, notes, liens..." style={{ resize: "vertical" }} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>Catégorie</label><select className="ks" style={{ width: "100%" }} value={card.category} onChange={e => up(card.id, { category: e.target.value })}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
                  <div><label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>Priorité</label><select className="ks" style={{ width: "100%" }} value={card.priority} onChange={e => up(card.id, { priority: e.target.value })}><option value="high">Haute</option><option value="medium">Moyenne</option><option value="low">Basse</option></select></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>Dates</label><DatePicker value={card.day} onChange={val => up(card.id, { day: val })} /></div>
                  <div><label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4, display: "block" }}>Statut</label><select className="ks" style={{ width: "100%" }} value={card.column} onChange={e => up(card.id, { column: e.target.value })}>{COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
                </div>
                <div style={{ borderTop: ".5px solid var(--color-border-tertiary)", paddingTop: 14, marginTop: 4 }}>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200, background: "var(--color-background-secondary)", padding: 12, borderRadius: 8 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, display: "block", textTransform: "uppercase" }}>👑 Owner</label>
                      <div style={{display:"flex", gap:6}}>
                        <select className="ks" style={{ width: "100%" }} value={card.owner || ""} onChange={e => up(card.id, { owner: e.target.value || null })}>
                          <option value="">Sélectionner...</option>
                          {PARTICIPANTS.filter(p => ["max", "thuy", "trinh", "frederic"].includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          {card.owner && !["max", "thuy", "trinh", "frederic"].includes(card.owner) && <option value={card.owner}>{card.owner}</option>}
                        </select>
                        <button className="bt" onClick={()=>{const n=prompt("Nom du nouveau propriétaire:"); if(n) up(card.id, {owner: n})}} style={{padding: "6px", fontSize: 12}}>+ Créer</button>
                      </div>
                    </div>
                    <div style={{ flex: 2, minWidth: 260 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, display: "block", textTransform: "uppercase" }}>👥 Tous les participants</label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {PARTICIPANTS.map(p => { const a = (card.assignees || []).includes(p.id); return (<div key={p.id} className="ct" onClick={() => { const n = a ? card.assignees.filter(x => x !== p.id) : [...(card.assignees || []), p.id]; up(card.id, { assignees: n }) }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, border: a ? `2px solid ${p.color}` : "1px solid var(--color-border-tertiary)", background: a ? p.color + "15" : "transparent", fontSize: 13 }}><div className="ka" style={{ width: 20, height: 20, fontSize: 8, background: a ? p.color : "var(--color-background-tertiary)" }}>{p.initials}</div><span style={{ color: a ? p.color : "var(--color-text-secondary)", fontWeight: a ? 600 : 400 }}>{p.name}</span></div>) })}
                        {(card.assignees || []).filter(aid => !PARTICIPANTS.find(x => x.id === aid)).map(aid => {
                          const p = getParticipant(aid);
                          return <div key={p.id} className="ct" onClick={() => { up(card.id, { assignees: card.assignees.filter(x => x !== p.id) }) }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, border: `2px solid ${p.color}`, background: p.color + "15", fontSize: 13 }} title="Cliquer pour retirer"><div className="ka" style={{ width: 20, height: 20, fontSize: 8, background: p.color }}>{p.initials}</div><span style={{ color: p.color, fontWeight: 600 }}>{p.name} ×</span></div>
                        })}
                        <button className="bt" onClick={()=>{const n=prompt("Nouveau participant:"); if(n && !(card.assignees||[]).includes(n)) up(card.id, {assignees: [...(card.assignees || []), n]})}} style={{padding: "4px 12px", borderRadius: 20, fontSize: 13}}>+ Autre</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6, display: "block" }}>Documents & preuves</label>
                  {(card.docs || []).map((doc, i) => (<div key={i} className="dc"><div className="di" style={{ background: doc.type === "pdf" ? "#E24B4A" : doc.type === "png" || doc.type === "jpg" ? "#378ADD" : "#534AB7" }}>{doc.type?.toUpperCase().slice(0, 3) || "DOC"}</div><div style={{ flex: 1 }}><a href={doc.url || "#"} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", textDecoration: doc.url ? "underline" : "none", display: "block", marginBottom: 2 }}>{doc.name}</a>{doc.size && <p style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{doc.size} • {doc.addedAt || "ajouté"}</p>}</div><button onClick={() => rd(card.id, i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 16 }}>×</button></div>))}
                  <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => fup(card.id, e)} />
                  <button className="bt" onClick={() => fileRef.current?.click()} style={{ width: "100%", marginTop: 4, fontSize: 13, color: "var(--color-text-secondary)" }}>+ Ajouter un document</button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 14, borderTop: ".5px solid var(--color-border-tertiary)" }}>
                  <button className="bt bd" onClick={() => del(card.id)} style={{ fontSize: 13 }}>Supprimer</button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="bt bp" onClick={() => setEditCard(null)} style={{ fontSize: 13 }}>Fermer</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
