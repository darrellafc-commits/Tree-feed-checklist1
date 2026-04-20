import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Leaf, CheckCircle2, Circle, FileText, Package, ChevronRight, ChevronLeft,
  Printer, FlaskConical, Home, CalendarDays, TreeDeciduous, Loader2, User,
  ArrowRight, Info, CloudOff, Cloud, RefreshCw, AlertTriangle
} from "lucide-react";

// ==========================================================================
//  SUPABASE CONFIGURATION
// ==========================================================================

const SUPABASE_URL = "https://ablvljdufenxtsdpazzi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibHZsamR1ZmVueHRzZHBhenppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDYxNjksImV4cCI6MjA5MjI4MjE2OX0.HyGU_qX_O8qKlIpGVa0qUG675twy0OPIv1YoQNaQeCg";

const supa = {
  async _req(method, path, body, extraHeaders = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
      method,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Supabase ${method} ${path}: ${res.status} ${txt}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  async getVisit(date) {
    const rows = await this._req("GET", `/visits?date=eq.${date}&select=*`);
    if (!rows || rows.length === 0) return null;
    return { state: rows[0].state, updatedAt: rows[0].updated_at, updatedBy: rows[0].updated_by };
  },

  async saveVisit(date, state, technician) {
    await this._req(
      "POST",
      "/visits",
      { date, state, updated_at: new Date().toISOString(), updated_by: technician || null },
      { Prefer: "resolution=merge-duplicates,return=minimal" }
    );
  },

  async listAllVisits() {
    const rows = await this._req(
      "GET",
      "/visits?select=date,state,updated_at,updated_by&order=date.asc"
    );
    return rows || [];
  },
};

// ==========================================================================
//  STATIC DATA  — derived from the Ficus Feeding Calendar
// ==========================================================================

const TREES = [
  { id: "forest_witaker",   name: "Forest Witaker",    code: "R1",   priority: "P1", issue: "Mg deficiency, elevated Ca:Mg" },
  { id: "keanu_leaves",     name: "Keanu Leaves",      code: "R2",   priority: "P1", issue: "Phosphorus critically low (1.6 mg/l)" },
  { id: "queen_la_treefa",  name: "Queen La Treefa",   code: "R4",   priority: "P1", issue: "pH 8.1 — needs acidifying" },
  { id: "tree_diddy",       name: "Tree Diddy",        code: "R5",   priority: "P2", issue: "Elevated Ca locking out micros" },
  { id: "morgan_treeman",   name: "Morgan Treeman",    code: "R6",   priority: "P2", issue: "High sodium (Na 32.7)" },
  { id: "spruce_willis",    name: "Spruce Willis",     code: "L2",   priority: "P2", issue: "High pH — acidifying required" },
  { id: "justin_timberlake",name: "Justin Timberlake", code: "L3",   priority: "P2", issue: "Mg low, Cl elevated (49.1)" },
  { id: "wiz_khalifa",      name: "Wiz Khalifa",       code: "L3*",  priority: "P1", issue: "High pH — acidifying drench" },
  { id: "elijah_wood",      name: "Elijah Wood",       code: "L4",   priority: "P2", issue: "Ca:Mg imbalance, micro lockout" },
  { id: "woody_harrelson",  name: "Woody Harrelson",   code: "L5",   priority: "P2", issue: "High pH — acidifying required" },
  { id: "treeyonce",        name: "Treeyonce",         code: "L6",   priority: "P3", issue: "pH 7.0 — now acceptable, monitor" },
  { id: "tree_twelve",      name: "Tree 12 (TBC)",     code: "R3",   priority: "P3", issue: "Baseline monitoring" },
];

const TREE_BY_ID = Object.fromEntries(TREES.map(t => [t.id, t]));
const ALL_TREE_IDS = TREES.map(t => t.id);
const HIGH_PH_TREES = ["wiz_khalifa","spruce_willis","woody_harrelson","queen_la_treefa","tree_diddy"];

const TASKS = {
  T01: { title: "Balanced liquid feed (20-10-20 + micros)", priority: "P1", trees: ALL_TREE_IDS, product: "20-10-20 + micros liquid feed", dose: "2–4 g/L at label rate", method: "Root-zone drench via can or back-pack" },
  T02: { title: "Acidifying drench (Iron sulphate)",        priority: "P1", trees: ["wiz_khalifa","queen_la_treefa"], product: "Iron sulphate (FeSO₄)", dose: "1–2 g/L", method: "Drench root zone — allow full drain. Do NOT apply to foliage" },
  T03: { title: "High-P feed + chelated Fe (rescue)",       priority: "P1", trees: ["keanu_leaves"], product: "High-P liquid (10-52-10) + Fe EDDHA", dose: "Label rate + 50 mg/L Fe EDDHA", method: "Root drench — EDDHA, not EDTA" },
  T04: { title: "Intensive feed + Epsom salts",             priority: "P1", trees: ["forest_witaker"], product: "Balanced NPK + MgSO₄", dose: "NPK label rate + MgSO₄ 2 g/L", method: "Root drench" },
  T05: { title: "Acidifying feed (ericaceous)",             priority: "P2", trees: ["wiz_khalifa","spruce_willis","woody_harrelson"], product: "Ericaceous / acidifying fertiliser", dose: "Label rate", method: "Replaces standard feed on Wednesdays" },
  T06: { title: "Potassium sulphate supplement",            priority: "P2", trees: ALL_TREE_IDS, product: "Potassium sulphate (SOP)", dose: "1–2 g/L", method: "Root drench — CHLORIDE-FREE. Never KCl" },
  T07: { title: "Epsom salt drench (MgSO₄)",                priority: "P2", trees: ["justin_timberlake","elijah_wood","tree_diddy"], product: "MgSO₄ (Epsom salt)", dose: "2 g/L", method: "Root drench alongside main feed" },
  T08: { title: "Standard NPK + iron sulphate",             priority: "P2", trees: ["queen_la_treefa"], product: "Standard NPK + FeSO₄", dose: "NPK label rate + FeSO₄ 0.5 g/L", method: "Root drench" },
  T09: { title: "Targeted micronutrient acidifying treatment", priority: "P2", trees: ["tree_diddy","elijah_wood"], product: "Micronutrient solution (Fe, Mn, Zn)", dose: "Label rate", method: "Root drench" },
  T10: { title: "Targeted sodium flush",                    priority: "P2", trees: ["morgan_treeman"], product: "Clean water", dose: "3× pot volume", method: "Slow pour-through, no saucer" },
  T11: { title: "Osmocote slow-release top-dress",          priority: "P3", trees: ALL_TREE_IDS, product: "Osmocote Exact 5-6M (15-9-12)", dose: "Per label (~5–6 g/L pot volume)", method: "Top-dress only — do not mix deep" },
  T12: { title: "Salt flush (3× pot volume)",               priority: "P3", trees: ALL_TREE_IDS, product: "Clean water", dose: "3× pot volume", method: "No saucers, allow full drain" },
  T13: { title: "Substrate condition check",                priority: "P3", trees: ALL_TREE_IDS, product: "—", dose: "—", method: "Visual + feel: compaction, moisture, colour" },
  T14: { title: "Soil re-test (NRM Cawood)",                priority: "P3", trees: ALL_TREE_IDS, product: "NRM sample bags + submission form", dose: "—", method: "Per NRM protocol → post to Cawood" },
  T15: { title: "Leaf health check",                        priority: "P3", trees: ALL_TREE_IDS, product: "—", dose: "—", method: "Every visit — chlorosis, necrosis, new growth" },
  T16: { title: "pH leachate check (high-pH trees)",        priority: "P3", trees: HIGH_PH_TREES, product: "pH meter / test strips", dose: "—", method: "Collect leachate from pot base" },
  T17: { title: "Foliar tissue sampling",                   priority: "P3", trees: ALL_TREE_IDS, product: "Foliar sample bags + form", dose: "—", method: "Per NRM protocol" },
  T18: { title: "Photographic reporting",                   priority: "P3", trees: ALL_TREE_IDS, product: "—", dose: "—", method: "Every visit — full canopy + any concerns" },
  T19: { title: "Root health assessment",                   priority: "P3", trees: ALL_TREE_IDS, product: "—", dose: "—", method: "Check exposed roots, colour, firmness" },
  T20: { title: "Senior horticultural lead review",         priority: "P3", trees: ALL_TREE_IDS, product: "—", dose: "—", method: "Sign-off on overall programme status" },
};

const VISITS = [
  { date: "2026-04-15", day: "Wednesday", week: 1,  tasks: ["T01","T02","T03","T04","T05","T09","T13","T14","T15","T16","T17","T18","T19","T20"] },
  { date: "2026-04-17", day: "Friday",    week: 1,  tasks: ["T01","T03","T04","T06","T07","T08","T10","T12","T15","T18"] },
  { date: "2026-04-22", day: "Wednesday", week: 2,  tasks: ["T01","T03","T04","T05","T11","T15","T18"] },
  { date: "2026-04-24", day: "Friday",    week: 2,  tasks: ["T01","T03","T04","T07","T15","T18"] },
  { date: "2026-04-29", day: "Wednesday", week: 3,  tasks: ["T01","T02","T03","T04","T05","T09","T15","T16","T18"] },
  { date: "2026-05-01", day: "Friday",    week: 3,  tasks: ["T01","T03","T06","T07","T08","T10","T12","T15","T18"] },
  { date: "2026-05-06", day: "Wednesday", week: 4,  tasks: ["T01","T03","T04","T05","T13","T14","T15","T17","T18","T19","T20"] },
  { date: "2026-05-08", day: "Friday",    week: 4,  tasks: ["T01","T07","T15","T18"] },
  { date: "2026-05-13", day: "Wednesday", week: 5,  tasks: ["T01","T02","T04","T05","T09","T15","T16","T18"] },
  { date: "2026-05-15", day: "Friday",    week: 5,  tasks: ["T06","T07","T08","T15","T18"] },
  { date: "2026-05-20", day: "Wednesday", week: 6,  tasks: ["T01","T04","T05","T15","T18"] },
  { date: "2026-05-22", day: "Friday",    week: 6,  tasks: ["T07","T15","T18"] },
  { date: "2026-05-27", day: "Wednesday", week: 7,  tasks: ["T02","T04","T05","T09","T15","T16","T18"] },
  { date: "2026-05-29", day: "Friday",    week: 7,  tasks: ["T06","T07","T08","T15","T18"] },
  { date: "2026-06-03", day: "Wednesday", week: 8,  tasks: ["T01","T04","T05","T13","T14","T15","T17","T18","T19","T20"] },
  { date: "2026-06-05", day: "Friday",    week: 8,  tasks: ["T10","T12","T15","T18"] },
  { date: "2026-06-10", day: "Wednesday", week: 9,  tasks: ["T02","T05","T09","T15","T16","T18"] },
  { date: "2026-06-12", day: "Friday",    week: 9,  tasks: ["T06","T08","T15","T18"] },
  { date: "2026-06-17", day: "Wednesday", week: 10, tasks: ["T01","T05","T15","T18"] },
  { date: "2026-06-19", day: "Friday",    week: 10, tasks: ["T15","T18"] },
  { date: "2026-06-24", day: "Wednesday", week: 11, tasks: ["T02","T05","T09","T15","T16","T18"] },
  { date: "2026-06-26", day: "Friday",    week: 11, tasks: ["T06","T08","T15","T18"] },
  { date: "2026-07-01", day: "Wednesday", week: 12, tasks: ["T01","T05","T13","T14","T15","T17","T18","T19","T20"] },
  { date: "2026-07-03", day: "Friday",    week: 12, tasks: ["T10","T12","T15","T18"] },
  { date: "2026-07-08", day: "Wednesday", week: 13, tasks: ["T02","T05","T09","T15","T16","T18"] },
  { date: "2026-07-10", day: "Friday",    week: 13, tasks: ["T06","T08","T15","T18"] },
  { date: "2026-07-15", day: "Wednesday", week: 14, tasks: ["T01","T05","T15","T18"] },
  { date: "2026-07-17", day: "Friday",    week: 14, tasks: ["T15","T18"] },
  { date: "2026-07-22", day: "Wednesday", week: 15, tasks: ["T02","T05","T09","T15","T16","T18"] },
  { date: "2026-07-24", day: "Friday",    week: 15, tasks: ["T06","T08","T15","T18"] },
  { date: "2026-07-29", day: "Wednesday", week: 16, tasks: ["T01","T05","T15","T18"] },
  { date: "2026-07-31", day: "Friday",    week: 16, tasks: ["T15","T18"] },
  { date: "2026-08-05", day: "Wednesday", week: 17, tasks: ["T02","T05","T09","T13","T14","T15","T16","T17","T18","T19","T20"] },
  { date: "2026-08-07", day: "Friday",    week: 17, tasks: ["T06","T08","T10","T12","T15","T18"] },
  { date: "2026-08-12", day: "Wednesday", week: 18, tasks: ["T01","T05","T15","T18"] },
  { date: "2026-08-14", day: "Friday",    week: 18, tasks: ["T15","T18"] },
  { date: "2026-08-19", day: "Wednesday", week: 19, tasks: ["T02","T05","T09","T15","T16","T18"] },
  { date: "2026-08-21", day: "Friday",    week: 19, tasks: ["T06","T08","T15","T18"] },
  { date: "2026-08-26", day: "Wednesday", week: 20, tasks: ["T01","T05","T15","T18"] },
  { date: "2026-08-28", day: "Friday",    week: 20, tasks: ["T15","T18"] },
  { date: "2026-09-02", day: "Wednesday", week: 21, tasks: ["T02","T05","T09","T13","T14","T15","T16","T17","T18","T19","T20"] },
  { date: "2026-09-04", day: "Friday",    week: 21, tasks: ["T06","T08","T10","T12","T15","T18"] },
  { date: "2026-09-09", day: "Wednesday", week: 22, tasks: ["T01","T05","T15","T18"] },
  { date: "2026-09-11", day: "Friday",    week: 22, tasks: ["T15","T18"] },
  { date: "2026-09-16", day: "Wednesday", week: 23, tasks: ["T02","T05","T09","T15","T16","T18"] },
  { date: "2026-09-18", day: "Friday",    week: 23, tasks: ["T06","T08","T15","T18"] },
  { date: "2026-09-23", day: "Wednesday", week: 24, tasks: ["T01","T05","T15","T18"] },
  { date: "2026-09-25", day: "Friday",    week: 24, tasks: ["T15","T18"] },
  { date: "2026-09-30", day: "Wednesday", week: 25, tasks: ["T02","T05","T09","T15","T16","T18"] },
];

const VISIT_BY_DATE = Object.fromEntries(VISITS.map(v => [v.date, v]));

const PRIORITY_COLORS = {
  P1: { bg: "bg-[#B85C3F]", soft: "bg-[#F3DAD0]", text: "text-[#7A2F16]", border: "border-[#B85C3F]", label: "Urgent" },
  P2: { bg: "bg-[#C89048]", soft: "bg-[#F4E4CE]", text: "text-[#6B4718]", border: "border-[#C89048]", label: "High Priority" },
  P3: { bg: "bg-[#5A7A4E]", soft: "bg-[#DDE5D4]", text: "text-[#2D4A2B]", border: "border-[#5A7A4E]", label: "Ongoing" },
};

// ==========================================================================
//  HELPERS
// ==========================================================================

function formatLongDate(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatShortDate(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function findCurrentVisit() {
  const today = todayISO();
  const upcoming = VISITS.find(v => v.date >= today);
  return upcoming ? upcoming.date : VISITS[VISITS.length - 1].date;
}
function blankVisitState(visit) {
  const tasks = {};
  visit.tasks.forEach(tid => {
    const t = TASKS[tid];
    const treeStates = {};
    t.trees.forEach(treeId => { treeStates[treeId] = { applied: false, notes: "" }; });
    tasks[tid] = { treeStates, generalNotes: "" };
  });
  return {
    date: visit.date, technician: "", startedAt: null, lastSavedAt: null,
    tasks, overallNotes: "", weatherConditions: "",
    signedOff: false, signedOffBy: "", signedOffAt: null,
  };
}
function visitCompletion(visitState, visit) {
  if (!visitState) return { done: 0, total: 0, pct: 0 };
  let done = 0, total = 0;
  visit.tasks.forEach(tid => {
    const ts = visitState.tasks?.[tid];
    if (!ts) return;
    Object.values(ts.treeStates).forEach(s => { total++; if (s.applied) done++; });
  });
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

// ==========================================================================
//  ROOT APP
// ==========================================================================

export default function FicusTracker() {
  const [view, setView] = useState("today");
  const [selectedDate, setSelectedDate] = useState(findCurrentVisit());
  const [selectedTreeId, setSelectedTreeId] = useState(null);
  const [technician, setTechnician] = useState("");
  const [techDraft, setTechDraft] = useState("");
  const [showTechModal, setShowTechModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("checking"); // checking | online | offline

  // On mount: always prompt for technician name (session-only, not persisted)
  useEffect(() => { setShowTechModal(true); }, []);

  // Check connection on mount
  useEffect(() => {
    (async () => {
      try {
        await supa.listAllVisits();
        setConnectionStatus("online");
      } catch {
        setConnectionStatus("offline");
      }
    })();
  }, []);

  // Inject fonts
  useEffect(() => {
    if (document.getElementById("ficus-fonts")) return;
    const link = document.createElement("link");
    link.id = "ficus-fonts";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
  }, []);

  const saveTechnician = () => {
    const name = techDraft.trim();
    if (!name) return;
    setTechnician(name);
    setShowTechModal(false);
  };

  const navItems = [
    { id: "today",    label: "Today",    icon: Home },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "trees",    label: "Trees",    icon: TreeDeciduous },
    { id: "products", label: "Products", icon: Package },
    { id: "reports",  label: "Reports",  icon: FileText },
  ];

  return (
    <div
      className="min-h-screen w-full"
      style={{
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        backgroundColor: "#F5F1E8",
        color: "#1C2617",
        backgroundImage:
          "radial-gradient(circle at 20% 10%, rgba(90,122,78,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 90%, rgba(184,92,63,0.05) 0%, transparent 50%)",
      }}
    >
      <header className="border-b-2 border-[#2D4A2B]/20 bg-[#FBF7EE]/80 backdrop-blur-sm sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#2D4A2B] flex items-center justify-center shrink-0">
              <Leaf className="w-5 h-5 text-[#F5F1E8]" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl leading-tight truncate" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, letterSpacing: "-0.01em" }}>
                Ficus Nitida Programme
              </h1>
              <p className="text-xs text-[#5A7A4E] font-medium uppercase tracking-wider flex items-center gap-1.5">
                <ConnectionBadge status={connectionStatus} />
              </p>
            </div>
          </div>
          <button
            onClick={() => { setTechDraft(technician); setShowTechModal(true); }}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#2D4A2B]/10 hover:bg-[#2D4A2B]/20 transition-colors text-sm shrink-0"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">{technician || "Set name"}</span>
          </button>
        </div>
        <nav className="hidden md:block max-w-7xl mx-auto px-6 pb-0">
          <div className="flex gap-1">
            {navItems.map(n => {
              const Icon = n.icon;
              const active = view === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => { setView(n.id); setSelectedTreeId(null); }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${active ? "border-[#2D4A2B] text-[#2D4A2B]" : "border-transparent text-[#1C2617]/60 hover:text-[#1C2617]"}`}
                >
                  <Icon className="w-4 h-4" />
                  {n.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-10">
        {connectionStatus === "offline" && (
          <div className="mb-5 p-4 rounded-xl bg-[#B85C3F]/10 border-2 border-[#B85C3F]/30 flex items-start gap-3">
            <CloudOff className="w-5 h-5 text-[#B85C3F] shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="text-[#7A2F16]">Can't reach the server.</strong>{" "}
              <span className="text-[#1C2617]/80">
                Check your internet connection. Your changes won't save or sync until we reconnect.
              </span>
              <button onClick={() => window.location.reload()} className="ml-2 underline font-semibold">Retry</button>
            </div>
          </div>
        )}

        {view === "today" && (
          <TodayView
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            technician={technician}
            onConnectionChange={setConnectionStatus}
          />
        )}
        {view === "calendar" && (
          <CalendarView onOpenVisit={(date) => { setSelectedDate(date); setView("today"); }} />
        )}
        {view === "trees" && (
          <TreesView
            selectedTreeId={selectedTreeId}
            setSelectedTreeId={setSelectedTreeId}
            onJumpToVisit={(date) => { setSelectedDate(date); setView("today"); }}
          />
        )}
        {view === "products" && <ProductsView />}
        {view === "reports" && <ReportsView />}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#FBF7EE] border-t-2 border-[#2D4A2B]/20 z-40 print:hidden">
        <div className="grid grid-cols-5">
          {navItems.map(n => {
            const Icon = n.icon;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => { setView(n.id); setSelectedTreeId(null); }}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium uppercase tracking-wider ${active ? "text-[#2D4A2B]" : "text-[#1C2617]/50"}`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.4]" : ""}`} />
                {n.label}
              </button>
            );
          })}
        </div>
      </nav>

      {showTechModal && (
        <div className="fixed inset-0 z-50 bg-[#1C2617]/60 flex items-center justify-center p-4">
          <div className="bg-[#FBF7EE] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg mb-1" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
              Who's on site today?
            </h3>
            <p className="text-sm text-[#1C2617]/70 mb-4">
              Your name will be attached to each task you tick off, so the client report shows who did what.
            </p>
            <input
              type="text"
              value={techDraft}
              onChange={(e) => setTechDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveTechnician()}
              placeholder="Your full name"
              autoFocus
              className="w-full px-4 py-3 rounded-lg border-2 border-[#2D4A2B]/20 focus:border-[#2D4A2B] outline-none bg-white"
            />
            <div className="flex gap-2 mt-4">
              {technician && (
                <button
                  onClick={() => { setTechDraft(technician); setShowTechModal(false); }}
                  className="flex-1 px-4 py-2.5 rounded-lg border-2 border-[#2D4A2B]/20 font-medium"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={saveTechnician}
                disabled={!techDraft.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#2D4A2B] text-[#F5F1E8] font-medium disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectionBadge({ status }) {
  if (status === "checking") return <><Loader2 className="w-3 h-3 animate-spin" /> Connecting…</>;
  if (status === "online") return <><Cloud className="w-3 h-3" /> Live sync · Feeding &amp; Application Tracker</>;
  return <><CloudOff className="w-3 h-3 text-[#B85C3F]" /> <span className="text-[#B85C3F]">Offline</span></>;
}

// ==========================================================================
//  TODAY / VISIT VIEW — with Supabase sync
// ==========================================================================

function TodayView({ selectedDate, setSelectedDate, technician, onConnectionChange }) {
  const visit = VISIT_BY_DATE[selectedDate];
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Fetch from Supabase
  const fetchVisit = useCallback(async () => {
    try {
      const remote = await supa.getVisit(selectedDate);
      if (remote?.state) {
        setState(remote.state);
        setLastSyncedAt(remote.updatedAt);
      } else {
        setState(blankVisitState(visit));
      }
      onConnectionChange?.("online");
      return true;
    } catch (e) {
      console.error("Fetch failed", e);
      setState(blankVisitState(visit));
      onConnectionChange?.("offline");
      return false;
    }
  }, [selectedDate, visit, onConnectionChange]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchVisit();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchVisit]);

  // Poll for remote changes every 20s when focused + on window focus
  useEffect(() => {
    if (loading) return;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      if (saving) return;
      try {
        const remote = await supa.getVisit(selectedDate);
        if (!remote?.state) return;
        // Only update if the remote copy is strictly newer than our last sync
        if (remote.updatedAt && remote.updatedAt !== lastSyncedAt) {
          setState(remote.state);
          setLastSyncedAt(remote.updatedAt);
        }
        onConnectionChange?.("online");
      } catch {
        onConnectionChange?.("offline");
      }
    };
    const interval = setInterval(poll, 20000);
    window.addEventListener("focus", poll);
    return () => { clearInterval(interval); window.removeEventListener("focus", poll); };
  }, [loading, saving, selectedDate, lastSyncedAt, onConnectionChange]);

  const save = useCallback(async (newState) => {
    setSaving(true);
    setSaveError(null);
    const toSave = { ...newState, lastSavedAt: new Date().toISOString() };
    setState(toSave);
    try {
      await supa.saveVisit(selectedDate, toSave, technician);
      setLastSyncedAt(new Date().toISOString());
      onConnectionChange?.("online");
    } catch (e) {
      console.error("Save failed", e);
      setSaveError("Save failed — will retry when you reconnect");
      onConnectionChange?.("offline");
    }
    setSaving(false);
  }, [selectedDate, technician, onConnectionChange]);

  const toggleTreeApplied = (taskId, treeId) => {
    if (!state) return;
    const cur = state.tasks[taskId].treeStates[treeId];
    const newState = {
      ...state,
      startedAt: state.startedAt || new Date().toISOString(),
      tasks: {
        ...state.tasks,
        [taskId]: {
          ...state.tasks[taskId],
          treeStates: {
            ...state.tasks[taskId].treeStates,
            [treeId]: {
              ...cur,
              applied: !cur.applied,
              appliedAt: !cur.applied ? new Date().toISOString() : null,
              appliedBy: !cur.applied ? technician : null,
            },
          },
        },
      },
    };
    save(newState);
  };

  const setTreeNotes = (taskId, treeId, notes) => {
    if (!state) return;
    setState({
      ...state,
      tasks: {
        ...state.tasks,
        [taskId]: {
          ...state.tasks[taskId],
          treeStates: {
            ...state.tasks[taskId].treeStates,
            [treeId]: { ...state.tasks[taskId].treeStates[treeId], notes },
          },
        },
      },
    });
  };

  const markAllTrees = (taskId, applied) => {
    if (!state) return;
    const task = state.tasks[taskId];
    const newTreeStates = {};
    Object.entries(task.treeStates).forEach(([tid, s]) => {
      newTreeStates[tid] = {
        ...s,
        applied,
        appliedAt: applied ? (s.appliedAt || new Date().toISOString()) : null,
        appliedBy: applied ? (s.appliedBy || technician) : null,
      };
    });
    save({
      ...state,
      startedAt: state.startedAt || new Date().toISOString(),
      tasks: { ...state.tasks, [taskId]: { ...task, treeStates: newTreeStates } },
    });
  };

  const signOff = async () => {
    if (!state) return;
    await save({
      ...state,
      signedOff: !state.signedOff,
      signedOffBy: !state.signedOff ? technician : "",
      signedOffAt: !state.signedOff ? new Date().toISOString() : null,
    });
  };

  const idx = VISITS.findIndex(v => v.date === selectedDate);
  const prevVisit = idx > 0 ? VISITS[idx - 1] : null;
  const nextVisit = idx < VISITS.length - 1 ? VISITS[idx + 1] : null;
  const completion = state ? visitCompletion(state, visit) : { done: 0, total: 0, pct: 0 };

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center py-20 text-[#5A7A4E]">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading visit from server…
      </div>
    );
  }

  const tasksByPriority = { P1: [], P2: [], P3: [] };
  visit.tasks.forEach(tid => tasksByPriority[TASKS[tid].priority].push(tid));

  const today = todayISO();
  const isToday = visit.date === today;
  const isFuture = visit.date > today;

  return (
    <div>
      <div className="bg-[#FBF7EE] border-2 border-[#2D4A2B]/15 rounded-2xl p-5 sm:p-6 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs uppercase tracking-widest text-[#5A7A4E] font-semibold">
                Week {visit.week} · {visit.day.slice(0, 3)}
              </span>
              {isToday && <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#B85C3F] text-[#F5F1E8] font-bold">Today</span>}
              {isFuture && <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#C89048]/20 text-[#6B4718] font-bold">Upcoming</span>}
            </div>
            <h2 className="text-2xl sm:text-3xl leading-tight" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, letterSpacing: "-0.02em" }}>
              {formatLongDate(visit.date)}
            </h2>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => prevVisit && setSelectedDate(prevVisit.date)} disabled={!prevVisit}
              className="w-10 h-10 rounded-full border-2 border-[#2D4A2B]/20 flex items-center justify-center disabled:opacity-30 hover:bg-[#2D4A2B]/5">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => nextVisit && setSelectedDate(nextVisit.date)} disabled={!nextVisit}
              className="w-10 h-10 rounded-full border-2 border-[#2D4A2B]/20 flex items-center justify-center disabled:opacity-30 hover:bg-[#2D4A2B]/5">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-[#2D4A2B] uppercase tracking-wider">Progress</span>
            <span className="font-mono text-[#1C2617]/70">{completion.done}/{completion.total} · {completion.pct}%</span>
          </div>
          <div className="h-2 w-full bg-[#2D4A2B]/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#2D4A2B] transition-all duration-500" style={{ width: `${completion.pct}%` }} />
          </div>
        </div>

        <div className="mt-3 text-xs flex items-center gap-2">
          {saving ? (
            <><Loader2 className="w-3 h-3 animate-spin text-[#5A7A4E]" /><span className="text-[#5A7A4E]">Saving to cloud…</span></>
          ) : saveError ? (
            <><AlertTriangle className="w-3 h-3 text-[#B85C3F]" /><span className="text-[#B85C3F]">{saveError}</span></>
          ) : lastSyncedAt ? (
            <><Cloud className="w-3 h-3 text-[#5A7A4E]" /><span className="text-[#1C2617]/50">Synced {new Date(lastSyncedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span></>
          ) : null}
        </div>
      </div>

      {["P1", "P2", "P3"].map(pri => {
        const taskIds = tasksByPriority[pri];
        if (taskIds.length === 0) return null;
        const col = PRIORITY_COLORS[pri];
        return (
          <section key={pri} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${col.bg}`} />
              <h3 className={`text-sm font-bold uppercase tracking-widest ${col.text}`}>
                Priority {pri.slice(1)} — {col.label}
              </h3>
              <span className="text-xs text-[#1C2617]/40">· {taskIds.length} task{taskIds.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-3">
              {taskIds.map(tid => (
                <TaskCard
                  key={tid}
                  taskId={tid}
                  taskState={state.tasks[tid]}
                  expanded={expandedTaskId === tid}
                  onToggleExpand={() => setExpandedTaskId(expandedTaskId === tid ? null : tid)}
                  onToggleTree={(treeId) => toggleTreeApplied(tid, treeId)}
                  onSetTreeNotes={(treeId, notes) => setTreeNotes(tid, treeId, notes)}
                  onMarkAll={(applied) => markAllTrees(tid, applied)}
                  onSaveNotes={() => save(stateRef.current)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <section className="bg-[#FBF7EE] border-2 border-[#2D4A2B]/15 rounded-2xl p-5 sm:p-6 mt-6">
        <h3 className="text-lg mb-3" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>Visit summary</h3>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5A7A4E] mb-1.5 block">Weather / site conditions</label>
            <input type="text" value={state.weatherConditions}
              onChange={(e) => setState({ ...state, weatherConditions: e.target.value })}
              onBlur={() => save(state)}
              placeholder="e.g. 14°C, overcast, light breeze"
              className="w-full px-3 py-2 rounded-lg border-2 border-[#2D4A2B]/15 focus:border-[#2D4A2B] outline-none bg-white text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5A7A4E] mb-1.5 block">Technician on site</label>
            <input type="text" value={state.technician || technician}
              onChange={(e) => setState({ ...state, technician: e.target.value })}
              onBlur={() => save(state)}
              className="w-full px-3 py-2 rounded-lg border-2 border-[#2D4A2B]/15 focus:border-[#2D4A2B] outline-none bg-white text-sm" />
          </div>
        </div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#5A7A4E] mb-1.5 block">Overall notes</label>
        <textarea value={state.overallNotes}
          onChange={(e) => setState({ ...state, overallNotes: e.target.value })}
          onBlur={() => save(state)}
          rows={3}
          placeholder="Any observations, concerns, client communications, or follow-up actions."
          className="w-full px-3 py-2 rounded-lg border-2 border-[#2D4A2B]/15 focus:border-[#2D4A2B] outline-none bg-white text-sm resize-none" />

        <div className="mt-5 pt-5 border-t-2 border-[#2D4A2B]/10">
          {state.signedOff ? (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2D4A2B] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#F5F1E8]" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[#2D4A2B]">Signed off</div>
                <div className="text-xs text-[#1C2617]/60">by {state.signedOffBy} · {new Date(state.signedOffAt).toLocaleString("en-GB")}</div>
                <button onClick={signOff} className="mt-2 text-xs underline text-[#1C2617]/60 hover:text-[#1C2617]">Undo sign-off</button>
              </div>
            </div>
          ) : (
            <button onClick={signOff} disabled={completion.done === 0}
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#2D4A2B] text-[#F5F1E8] font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Sign off this visit
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

// ==========================================================================
//  TASK CARD
// ==========================================================================

function TaskCard({ taskId, taskState, expanded, onToggleExpand, onToggleTree, onSetTreeNotes, onMarkAll, onSaveNotes }) {
  const task = TASKS[taskId];
  const col = PRIORITY_COLORS[task.priority];
  const trees = task.trees;
  const doneCount = trees.filter(tid => taskState.treeStates[tid]?.applied).length;
  const allDone = doneCount === trees.length;
  const noneDone = doneCount === 0;

  return (
    <div className={`bg-[#FBF7EE] rounded-xl border-2 overflow-hidden transition-all ${allDone ? "border-[#2D4A2B]/60" : "border-[#2D4A2B]/10"}`}>
      <button onClick={onToggleExpand} className="w-full text-left p-4 flex items-start gap-3 hover:bg-[#2D4A2B]/[0.03]">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${allDone ? "bg-[#2D4A2B]" : noneDone ? col.soft : "bg-[#C89048]"}`}>
          {allDone ? <CheckCircle2 className="w-5 h-5 text-[#F5F1E8]" /> : noneDone ? <Circle className={`w-5 h-5 ${col.text}`} /> : <span className="text-[10px] font-bold text-white">{doneCount}/{trees.length}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[#1C2617] leading-snug">{task.title}</div>
          <div className="text-xs text-[#1C2617]/60 mt-0.5 flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <TreeDeciduous className="w-3 h-3" />
              {trees.length === 12 ? "All 12 trees" : trees.length === 1 ? TREE_BY_ID[trees[0]].name : `${trees.length} trees`}
            </span>
            {task.dose !== "—" && <><span className="text-[#1C2617]/30">·</span><span className="font-mono text-[11px]">{task.dose}</span></>}
          </div>
        </div>
        <ChevronRight className={`w-5 h-5 text-[#1C2617]/40 shrink-0 mt-1 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t-2 border-[#2D4A2B]/10 bg-[#F5F1E8]/50">
          <div className="p-4 border-b-2 border-[#2D4A2B]/10 bg-[#FBF7EE]/50">
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div><div className="uppercase tracking-widest text-[#5A7A4E] font-semibold mb-0.5">Product</div><div className="text-[#1C2617]">{task.product || "—"}</div></div>
              <div><div className="uppercase tracking-widest text-[#5A7A4E] font-semibold mb-0.5">Dose</div><div className="text-[#1C2617] font-mono">{task.dose || "—"}</div></div>
              <div><div className="uppercase tracking-widest text-[#5A7A4E] font-semibold mb-0.5">Method</div><div className="text-[#1C2617]">{task.method || "—"}</div></div>
            </div>
          </div>

          <div className="p-2 sm:p-3">
            {trees.length > 2 && (
              <div className="flex gap-2 mb-2 px-1">
                <button onClick={() => onMarkAll(true)} className="text-xs px-3 py-1.5 rounded-full bg-[#2D4A2B] text-[#F5F1E8] font-medium">Mark all applied</button>
                <button onClick={() => onMarkAll(false)} className="text-xs px-3 py-1.5 rounded-full border-2 border-[#2D4A2B]/20 font-medium">Clear all</button>
              </div>
            )}
            <div className="space-y-1.5">
              {trees.map(treeId => {
                const tree = TREE_BY_ID[treeId];
                const s = taskState.treeStates[treeId];
                if (!tree) return null;
                return (
                  <TreeTaskRow key={treeId} tree={tree} state={s}
                    onToggle={() => onToggleTree(treeId)}
                    onNotesChange={(v) => onSetTreeNotes(treeId, v)}
                    onNotesBlur={onSaveNotes} />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TreeTaskRow({ tree, state, onToggle, onNotesChange, onNotesBlur }) {
  const [showNotes, setShowNotes] = useState(!!state.notes);
  const applied = state.applied;

  return (
    <div className={`rounded-lg p-2.5 ${applied ? "bg-[#2D4A2B]/5" : "bg-white"}`}>
      <div className="flex items-center gap-3">
        <button onClick={onToggle}
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${applied ? "bg-[#2D4A2B] border-[#2D4A2B]" : "bg-white border-[#2D4A2B]/30 hover:border-[#2D4A2B]"}`}>
          {applied && <CheckCircle2 className="w-4 h-4 text-[#F5F1E8]" strokeWidth={2.5} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`font-medium text-sm ${applied ? "text-[#1C2617]/70" : ""}`}>{tree.name}</span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#5A7A4E] bg-[#5A7A4E]/10 px-1.5 py-0.5 rounded">{tree.code}</span>
          </div>
          {applied && state.appliedAt && (
            <div className="text-[10px] text-[#1C2617]/50 mt-0.5">
              ✓ {new Date(state.appliedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              {state.appliedBy && ` · ${state.appliedBy}`}
            </div>
          )}
        </div>
        <button onClick={() => setShowNotes(!showNotes)} className="text-[11px] text-[#5A7A4E] hover:text-[#2D4A2B] font-medium shrink-0 underline">
          {state.notes ? "Notes ✓" : showNotes ? "−" : "+ note"}
        </button>
      </div>
      {showNotes && (
        <input type="text" value={state.notes}
          onChange={(e) => onNotesChange(e.target.value)}
          onBlur={onNotesBlur}
          placeholder="Observations, deviations, follow-up…"
          className="w-full mt-2 px-2.5 py-1.5 rounded border border-[#2D4A2B]/15 text-xs bg-white outline-none focus:border-[#2D4A2B]" />
      )}
    </div>
  );
}

// ==========================================================================
//  CALENDAR VIEW
// ==========================================================================

function CalendarView({ onOpenVisit }) {
  const [completions, setCompletions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await supa.listAllVisits();
      const out = {};
      rows.forEach(r => {
        const visit = VISIT_BY_DATE[r.date];
        if (!visit) return;
        out[r.date] = { ...visitCompletion(r.state, visit), signedOff: r.state?.signedOff };
      });
      setCompletions(out);
    } catch (e) {
      setError("Couldn't load visit history — check connection");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const byMonth = useMemo(() => {
    const m = {};
    VISITS.forEach(v => {
      const key = v.date.slice(0, 7);
      if (!m[key]) m[key] = [];
      m[key].push(v);
    });
    return m;
  }, []);

  const today = todayISO();

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="text-2xl sm:text-3xl mb-1" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, letterSpacing: "-0.02em" }}>Visit calendar</h2>
          <p className="text-sm text-[#1C2617]/60">{VISITS.length} scheduled visits · 15 April – 30 September 2026</p>
        </div>
        <button onClick={load} disabled={loading}
          className="px-3 py-2 rounded-lg border-2 border-[#2D4A2B]/20 hover:bg-[#2D4A2B]/5 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[#B85C3F]/10 border-2 border-[#B85C3F]/30 text-sm text-[#7A2F16]">{error}</div>
      )}

      {loading && !Object.keys(completions).length && (
        <div className="text-sm text-[#5A7A4E] flex items-center gap-2 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading visit history…
        </div>
      )}

      {Object.entries(byMonth).map(([month, visits]) => {
        const [yy, mm] = month.split("-");
        const monthName = new Date(+yy, +mm - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
        return (
          <div key={month} className="mb-7">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#5A7A4E] mb-3">{monthName}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {visits.map(v => {
                const comp = completions[v.date];
                const pct = comp?.pct ?? 0;
                const done = comp?.done ?? 0;
                const total = comp?.total ?? 0;
                const signed = comp?.signedOff;
                const isPast = v.date < today;
                const isToday = v.date === today;

                let statusColor = "bg-[#1C2617]/10";
                let statusLabel = "Not started";
                if (signed) { statusColor = "bg-[#2D4A2B]"; statusLabel = "Signed off"; }
                else if (pct === 100) { statusColor = "bg-[#2D4A2B]/70"; statusLabel = "Complete"; }
                else if (pct > 0) { statusColor = "bg-[#C89048]"; statusLabel = "In progress"; }
                else if (isPast) { statusColor = "bg-[#B85C3F]/60"; statusLabel = "Missed"; }

                return (
                  <button key={v.date} onClick={() => onOpenVisit(v.date)}
                    className={`text-left bg-[#FBF7EE] border-2 rounded-xl p-3 hover:shadow-md transition-all ${isToday ? "border-[#B85C3F] ring-2 ring-[#B85C3F]/20" : "border-[#2D4A2B]/15 hover:border-[#2D4A2B]/40"}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-[#5A7A4E] font-semibold">Wk {v.week} · {v.day.slice(0, 3)}</div>
                        <div className="text-xl" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>{formatShortDate(v.date)}</div>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${statusColor} mt-1.5`} />
                    </div>
                    <div className="text-[11px] text-[#1C2617]/60 mb-1.5">{v.tasks.length} tasks · {statusLabel}</div>
                    <div className="h-1 bg-[#2D4A2B]/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#2D4A2B] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    {total > 0 && <div className="text-[10px] text-[#1C2617]/50 mt-1 font-mono">{done}/{total} applications</div>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="mt-8 p-4 bg-[#FBF7EE] border-2 border-[#2D4A2B]/15 rounded-xl text-xs text-[#1C2617]/70">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#1C2617]/10" /> Not started</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#C89048]" /> In progress</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2D4A2B]/70" /> Complete</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2D4A2B]" /> Signed off</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#B85C3F]/60" /> Missed (past, no activity)</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
//  TREES VIEW
// ==========================================================================

function TreesView({ selectedTreeId, setSelectedTreeId, onJumpToVisit }) {
  const [allVisitStates, setAllVisitStates] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await supa.listAllVisits();
        const out = {};
        rows.forEach(r => { if (r.state) out[r.date] = r.state; });
        setAllVisitStates(out);
      } catch {}
      setLoading(false);
    })();
  }, [selectedTreeId]);

  if (selectedTreeId) {
    return <TreeDetail treeId={selectedTreeId} onBack={() => setSelectedTreeId(null)} allVisitStates={allVisitStates} loading={loading} onJumpToVisit={onJumpToVisit} />;
  }

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl mb-1" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, letterSpacing: "-0.02em" }}>The 12 trees</h2>
      <p className="text-sm text-[#1C2617]/60 mb-6">Tap any tree to see its full treatment history and upcoming schedule.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TREES.map(tree => {
          const col = PRIORITY_COLORS[tree.priority];
          return (
            <button key={tree.id} onClick={() => setSelectedTreeId(tree.id)}
              className="text-left bg-[#FBF7EE] border-2 border-[#2D4A2B]/15 hover:border-[#2D4A2B]/40 rounded-xl p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#5A7A4E] bg-[#5A7A4E]/10 inline-block px-1.5 py-0.5 rounded">Position {tree.code}</div>
                  <div className="mt-1.5 text-lg" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>{tree.name}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${col.soft} ${col.text} font-bold uppercase tracking-wider`}>{tree.priority}</span>
              </div>
              <p className="text-xs text-[#1C2617]/70 leading-snug">{tree.issue}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TreeDetail({ treeId, onBack, allVisitStates, loading, onJumpToVisit }) {
  const tree = TREE_BY_ID[treeId];
  const col = PRIORITY_COLORS[tree.priority];

  const history = useMemo(() => {
    const entries = [];
    VISITS.forEach(v => {
      const state = allVisitStates[v.date];
      v.tasks.forEach(tid => {
        const task = TASKS[tid];
        if (!task.trees.includes(treeId)) return;
        const ts = state?.tasks?.[tid]?.treeStates?.[treeId];
        entries.push({
          date: v.date, week: v.week, day: v.day, taskId: tid, task,
          applied: ts?.applied ?? false, appliedAt: ts?.appliedAt, appliedBy: ts?.appliedBy,
          notes: ts?.notes ?? "", signedOff: state?.signedOff,
        });
      });
    });
    return entries;
  }, [treeId, allVisitStates]);

  const today = todayISO();
  const completed = history.filter(h => h.date <= today && h.applied);
  const pending = history.filter(h => h.date <= today && !h.applied);
  const upcoming = history.filter(h => h.date > today);

  const upcomingByDate = useMemo(() => {
    const m = {};
    upcoming.forEach(h => { if (!m[h.date]) m[h.date] = []; m[h.date].push(h); });
    return m;
  }, [upcoming]);

  const completedByDate = useMemo(() => {
    const m = {};
    completed.forEach(h => { if (!m[h.date]) m[h.date] = []; m[h.date].push(h); });
    return m;
  }, [completed]);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-[#5A7A4E] hover:text-[#2D4A2B] mb-4">
        <ChevronLeft className="w-4 h-4" /> All trees
      </button>

      <div className="bg-[#FBF7EE] border-2 border-[#2D4A2B]/15 rounded-2xl p-5 sm:p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-[#5A7A4E] bg-[#5A7A4E]/10 inline-block px-2 py-0.5 rounded mb-2">Position {tree.code}</div>
            <h2 className="text-3xl sm:text-4xl" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, letterSpacing: "-0.02em" }}>{tree.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2.5 py-1 rounded-full ${col.soft} ${col.text} font-bold uppercase tracking-wider`}>{tree.priority} · {col.label}</span>
            </div>
            <p className="text-sm text-[#1C2617]/70 mt-3 max-w-xl">
              <strong className="text-[#2D4A2B]">Clinical concern: </strong>{tree.issue}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t-2 border-[#2D4A2B]/10">
          <Stat label="Applied" value={completed.length} tone="green" />
          <Stat label="Missed" value={pending.length} tone="red" />
          <Stat label="Upcoming" value={upcoming.length} tone="stone" />
        </div>
      </div>

      {loading && (
        <div className="text-sm text-[#5A7A4E] flex items-center gap-2 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="mb-7">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#5A7A4E] mb-3">Upcoming schedule</h3>
          <div className="space-y-3">
            {Object.entries(upcomingByDate).slice(0, 8).map(([date, entries]) => (
              <div key={date} className="bg-[#FBF7EE] border-2 border-[#2D4A2B]/10 rounded-xl p-4">
                <button onClick={() => onJumpToVisit(date)} className="font-semibold flex items-center gap-2 hover:text-[#2D4A2B] group">
                  {formatLongDate(date)}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <ul className="mt-2 space-y-1">
                  {entries.map(e => {
                    const ec = PRIORITY_COLORS[e.task.priority];
                    return (
                      <li key={e.taskId} className="text-sm flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${ec.bg}`} />
                        {e.task.title}
                        {e.task.dose !== "—" && <span className="text-xs font-mono text-[#1C2617]/50">· {e.task.dose}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#5A7A4E] mb-3">Treatment history</h3>
        {completed.length === 0 ? (
          <div className="bg-[#FBF7EE] border-2 border-dashed border-[#2D4A2B]/20 rounded-xl p-8 text-center text-sm text-[#1C2617]/50">
            No treatments logged yet.
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(completedByDate).reverse().map(([date, entries]) => (
              <div key={date} className="bg-[#FBF7EE] border-2 border-[#2D4A2B]/15 rounded-xl p-4">
                <button onClick={() => onJumpToVisit(date)} className="font-semibold flex items-center gap-2 hover:text-[#2D4A2B] group">
                  {formatLongDate(date)}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <ul className="mt-2 space-y-2">
                  {entries.map(e => (
                    <li key={e.taskId} className="text-sm border-l-2 border-[#2D4A2B]/20 pl-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#2D4A2B] shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium">{e.task.title}</div>
                          <div className="text-xs text-[#1C2617]/60 mt-0.5">
                            {e.task.dose !== "—" && <span className="font-mono">{e.task.dose}</span>}
                            {e.appliedBy && <> · applied by {e.appliedBy}</>}
                            {e.appliedAt && <> at {new Date(e.appliedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</>}
                          </div>
                          {e.notes && (
                            <div className="text-xs mt-1 italic text-[#1C2617]/80 bg-[#C89048]/10 rounded px-2 py-1">"{e.notes}"</div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const tones = { green: "text-[#2D4A2B]", red: "text-[#B85C3F]", stone: "text-[#8A8270]" };
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[#5A7A4E] font-semibold">{label}</div>
      <div className={`text-2xl font-bold ${tones[tone]}`} style={{ fontFamily: "'Fraunces', serif" }}>{value}</div>
    </div>
  );
}

// ==========================================================================
//  PRODUCTS VIEW
// ==========================================================================

const PRODUCT_REFERENCE = [
  { name: "20-10-20 + micros liquid feed", trees: "All 12 trees", frequency: "Weekly (P1) → fortnightly", rate: "2–4 g/L", method: "Watering can or back-pack sprayer to root zone", notes: "Use ericaceous variant for Wiz Khalifa, Spruce Willis, Woody Harrelson on Wednesdays." },
  { name: "Iron sulphate (FeSO₄)", trees: "Wiz Khalifa (L3*), Queen La Treefa (R4) — acidifying drench\nTree Diddy (R5), Elijah Wood (L4) — targeted", frequency: "Fortnightly (Wednesdays) until pH < 7.5", rate: "1–2 g/L in water", method: "Drench root zone, allow full drain", notes: "Lowers pH and provides Fe. Do NOT apply to foliage. Will stain surfaces." },
  { name: "High-P liquid feed (10-52-10)", trees: "Keanu Leaves (R2)", frequency: "Weekly × 3 weeks", rate: "Label rate", method: "Root drench", notes: "Critical phosphorus rescue. P at 1.6 mg/l — critically low. After 3 weeks revert to standard feed." },
  { name: "Fe EDDHA chelated iron", trees: "Keanu Leaves (R2)", frequency: "Weekly × 3 weeks (with High-P)", rate: "50 mg/L or per label", method: "Root drench alongside feed", notes: "MUST be EDDHA (138 ortho-ortho) — NOT EDTA. Stable at higher pH." },
  { name: "MgSO₄ (Epsom salt)", trees: "Forest Witaker, Justin Timberlake, Elijah Wood, Tree Diddy", frequency: "See schedule", rate: "2 g/L", method: "Root drench alongside main feed", notes: "Corrects Mg deficiency and Ca:Mg ratio. Forest Witaker ongoing; others fortnightly × 6 weeks." },
  { name: "Potassium sulphate (SOP)", trees: "All 12 trees", frequency: "Fortnightly (Fridays)", rate: "1–2 g/L", method: "Dissolve fully, root drench", notes: "Chloride-free K source. Do NOT use KCl (muriate of potash) — all trees show elevated Cl." },
  { name: "Ericaceous / acidifying fertiliser", trees: "Wiz Khalifa (L3*), Spruce Willis (L2), Woody Harrelson (L5)", frequency: "Every Wednesday feed cycle", rate: "Label rate", method: "Replaces standard feed for these trees on Wednesdays", notes: "Ammonium sulphate-based. Lowers pH over time. Continue until pH < 7.5." },
  { name: "Standard NPK + iron sulphate", trees: "Queen La Treefa (R4)", frequency: "Fortnightly (Fridays)", rate: "NPK at label rate; FeSO₄ 0.5 g/L", method: "Root drench", notes: "Queen La Treefa pH 8.1 — iron sulphate addition alongside standard feed. Separate from acidifying drench." },
  { name: "Targeted micronutrient solution (Fe, Mn, Zn)", trees: "Tree Diddy (R5), Elijah Wood (L4)", frequency: "Fortnightly (Wednesdays)", rate: "Per label", method: "Root drench", notes: "Elevated Ca locks out micros. Acidifying micro treatment to correct Ca:Mg balance." },
  { name: "Osmocote Exact 5-6M (15-9-12)", trees: "All 12 trees", frequency: "Every 5–6 months", rate: "~5–6 g/L pot volume", method: "Top-dress to compost surface — do not mix deep", notes: "Controlled-release background nutrition. First 22 Apr 2026, next ~Oct 2026." },
  { name: "Clean water (salt flush)", trees: "All 12 trees; Morgan Treeman (R6) extra targeted", frequency: "Monthly (1st Friday)", rate: "3× pot volume", method: "Slow pour-through, remove saucers, allow full drain", notes: "Especially important for Morgan Treeman (Na 32.7) and Justin Timberlake (Cl 49.1)." },
  { name: "Foliar tissue sampling", trees: "All 12 trees", frequency: "Monthly (1st Wednesday)", rate: "—", method: "Collect leaf samples per NRM protocol", notes: "Confirms nutrient uptake within leaf, not just substrate availability." },
  { name: "NRM Cawood soil re-test", trees: "All 12 trees", frequency: "Monthly (1st Wednesday)", rate: "—", method: "Substrate samples per NRM protocol", notes: "Cawood — www.cawood.co.uk/nrm · 01954 782672" },
];

function ProductsView() {
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl mb-1" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, letterSpacing: "-0.02em" }}>Product reference</h2>
      <p className="text-sm text-[#1C2617]/60 mb-6">Based on NRM Cawood lab reports 45898 &amp; 45899 · Action plan updated 7 April 2026</p>

      <div className="grid lg:grid-cols-2 gap-4">
        {PRODUCT_REFERENCE.map((p, i) => (
          <div key={i} className="bg-[#FBF7EE] border-2 border-[#2D4A2B]/15 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#2D4A2B]/10 flex items-center justify-center shrink-0">
                <FlaskConical className="w-5 h-5 text-[#2D4A2B]" />
              </div>
              <div>
                <h3 className="text-lg leading-tight" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>{p.name}</h3>
                <div className="text-xs text-[#1C2617]/60 whitespace-pre-line mt-1">{p.trees}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div><div className="uppercase tracking-widest text-[#5A7A4E] font-semibold mb-0.5">Frequency</div><div className="text-[#1C2617]">{p.frequency}</div></div>
              <div><div className="uppercase tracking-widest text-[#5A7A4E] font-semibold mb-0.5">Rate</div><div className="text-[#1C2617] font-mono">{p.rate}</div></div>
              <div className="col-span-2"><div className="uppercase tracking-widest text-[#5A7A4E] font-semibold mb-0.5">Method</div><div className="text-[#1C2617]">{p.method}</div></div>
              {p.notes && (
                <div className="col-span-2 mt-2 p-2.5 bg-[#C89048]/10 rounded border-l-2 border-[#C89048] text-[#6B4718]">
                  <div className="flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{p.notes}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================================================
//  REPORTS VIEW
// ==========================================================================

function ReportsView() {
  const [fromDate, setFromDate] = useState(VISITS[0].date);
  const [toDate, setToDate] = useState(todayISO());
  const [reportType, setReportType] = useState("summary");
  const [visitStates, setVisitStates] = useState({});
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setGenerated(false);
    try {
      const rows = await supa.listAllVisits();
      const out = {};
      rows.forEach(r => {
        if (r.date >= fromDate && r.date <= toDate && r.state) {
          out[r.date] = r.state;
        }
      });
      setVisitStates(out);
      setGenerated(true);
    } catch (e) {
      setError("Couldn't load visit data — check connection");
    }
    setLoading(false);
  };

  const visitsInRange = VISITS.filter(v => v.date >= fromDate && v.date <= toDate);

  const summary = useMemo(() => {
    let totalApplications = 0;
    let signedOffVisits = 0;
    const perTree = {};
    TREES.forEach(t => perTree[t.id] = { name: t.name, code: t.code, applications: 0, missed: 0, products: new Set() });
    visitsInRange.forEach(v => {
      const st = visitStates[v.date];
      if (!st) return;
      if (st.signedOff) signedOffVisits++;
      v.tasks.forEach(tid => {
        const task = TASKS[tid];
        const ts = st.tasks?.[tid];
        if (!ts) return;
        task.trees.forEach(treeId => {
          const tree = perTree[treeId];
          if (!tree) return;
          const s = ts.treeStates[treeId];
          if (s?.applied) {
            totalApplications++;
            tree.applications++;
            if (task.product && task.product !== "—") tree.products.add(task.product);
          } else if (v.date <= todayISO()) { tree.missed++; }
        });
      });
    });
    Object.values(perTree).forEach(t => t.products = Array.from(t.products));
    return { totalApplications, signedOffVisits, perTree };
  }, [visitStates, visitsInRange]);

  return (
    <div>
      <div className="print:hidden">
        <h2 className="text-2xl sm:text-3xl mb-1" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, letterSpacing: "-0.02em" }}>Client reports</h2>
        <p className="text-sm text-[#1C2617]/60 mb-6">Generate a detailed feeding &amp; application report for any date range — ready to send to the client.</p>

        <div className="bg-[#FBF7EE] border-2 border-[#2D4A2B]/15 rounded-2xl p-5 sm:p-6 mb-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5A7A4E] mb-1.5 block">From</label>
              <select value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-[#2D4A2B]/20 focus:border-[#2D4A2B] outline-none bg-white text-sm">
                {VISITS.map(v => <option key={v.date} value={v.date}>{formatLongDate(v.date)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5A7A4E] mb-1.5 block">To</label>
              <select value={toDate} onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-[#2D4A2B]/20 focus:border-[#2D4A2B] outline-none bg-white text-sm">
                {VISITS.map(v => <option key={v.date} value={v.date}>{formatLongDate(v.date)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5A7A4E] mb-1.5 block">Format</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-[#2D4A2B]/20 focus:border-[#2D4A2B] outline-none bg-white text-sm">
                <option value="summary">Executive summary</option>
                <option value="by_date">Chronological (by visit date)</option>
                <option value="by_tree">By tree (treatment log per tree)</option>
              </select>
            </div>
          </div>
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <button onClick={generate} disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-[#2D4A2B] text-[#F5F1E8] font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Generate report
            </button>
            {generated && (
              <button onClick={() => window.print()}
                className="px-5 py-2.5 rounded-lg border-2 border-[#2D4A2B] text-[#2D4A2B] font-semibold flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" /> Print / Save as PDF
              </button>
            )}
          </div>
          {error && <div className="mt-3 text-sm text-[#B85C3F]">{error}</div>}
        </div>
      </div>

      {generated && (
        <div className="bg-white border-2 border-[#2D4A2B]/15 rounded-2xl p-6 sm:p-10 print:border-0 print:p-0 print:bg-white">
          <div className="border-b-2 border-[#2D4A2B] pb-5 mb-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#5A7A4E] font-bold">
              <Leaf className="w-4 h-4" /> Ficus Nitida Programme · Feeding &amp; Application Report
            </div>
            <h1 className="text-3xl sm:text-4xl mt-2" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, letterSpacing: "-0.02em" }}>
              {formatLongDate(fromDate)} — {formatLongDate(toDate)}
            </h1>
            <p className="text-sm text-[#1C2617]/60 mt-2">
              Prepared {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} ·
              Based on NRM Cawood reports 45898 &amp; 45899 · Action plan 7 Apr 2026
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <ReportStat label="Visits in range" value={visitsInRange.length} />
            <ReportStat label="Visits signed off" value={summary.signedOffVisits} />
            <ReportStat label="Total applications" value={summary.totalApplications} />
            <ReportStat label="Trees under care" value={12} />
          </div>

          {reportType === "summary" && <SummaryReport summary={summary} visitsInRange={visitsInRange} visitStates={visitStates} />}
          {reportType === "by_date" && <ByDateReport visitsInRange={visitsInRange} visitStates={visitStates} />}
          {reportType === "by_tree" && <ByTreeReport visitsInRange={visitsInRange} visitStates={visitStates} />}
        </div>
      )}

      {!generated && !loading && (
        <div className="bg-[#FBF7EE] border-2 border-dashed border-[#2D4A2B]/25 rounded-2xl p-10 text-center">
          <FileText className="w-12 h-12 text-[#5A7A4E]/40 mx-auto mb-3" />
          <p className="text-sm text-[#1C2617]/60">
            Select a date range and format, then click <strong>Generate report</strong> to see a client-ready summary.
          </p>
        </div>
      )}
    </div>
  );
}

function ReportStat({ label, value }) {
  return (
    <div className="bg-[#F5F1E8] border border-[#2D4A2B]/15 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-widest text-[#5A7A4E] font-bold">{label}</div>
      <div className="text-3xl mt-0.5" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function SummaryReport({ summary, visitsInRange, visitStates }) {
  return (
    <div>
      <h2 className="text-xl mb-3" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>Per-tree applications summary</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-[#2D4A2B]">
              <th className="text-left py-2 px-2 uppercase tracking-wider text-xs text-[#5A7A4E]">Tree</th>
              <th className="text-left py-2 px-2 uppercase tracking-wider text-xs text-[#5A7A4E]">Position</th>
              <th className="text-right py-2 px-2 uppercase tracking-wider text-xs text-[#5A7A4E]">Applied</th>
              <th className="text-right py-2 px-2 uppercase tracking-wider text-xs text-[#5A7A4E]">Missed</th>
              <th className="text-left py-2 px-2 uppercase tracking-wider text-xs text-[#5A7A4E]">Distinct products</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(summary.perTree).map(([id, t]) => (
              <tr key={id} className="border-b border-[#2D4A2B]/10">
                <td className="py-2.5 px-2 font-medium">{t.name}</td>
                <td className="py-2.5 px-2 font-mono text-xs">{t.code}</td>
                <td className="py-2.5 px-2 text-right font-semibold text-[#2D4A2B]">{t.applications}</td>
                <td className="py-2.5 px-2 text-right text-[#B85C3F]">{t.missed || "—"}</td>
                <td className="py-2.5 px-2 text-xs text-[#1C2617]/70">{t.products.length > 0 ? t.products.join(" · ") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl mt-8 mb-3" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>Visit-by-visit overview</h2>
      <div className="space-y-2">
        {visitsInRange.map(v => {
          const st = visitStates[v.date];
          const comp = st ? visitCompletion(st, v) : { done: 0, total: 0, pct: 0 };
          return (
            <div key={v.date} className="flex items-center gap-3 text-sm border-b border-[#2D4A2B]/10 py-1.5">
              <span className="font-mono text-xs text-[#5A7A4E] w-20 shrink-0">{formatShortDate(v.date)} {v.day.slice(0, 3)}</span>
              <span className="flex-1 text-xs text-[#1C2617]/70">Week {v.week} · {v.tasks.length} tasks</span>
              <div className="w-32 h-1.5 bg-[#2D4A2B]/10 rounded-full overflow-hidden shrink-0">
                <div className="h-full bg-[#2D4A2B]" style={{ width: `${comp.pct}%` }} />
              </div>
              <span className="font-mono text-xs w-14 text-right shrink-0">{comp.done}/{comp.total}</span>
              {st?.signedOff && <CheckCircle2 className="w-4 h-4 text-[#2D4A2B] shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ByDateReport({ visitsInRange, visitStates }) {
  return (
    <div className="space-y-6">
      {visitsInRange.map(v => {
        const st = visitStates[v.date];
        const comp = st ? visitCompletion(st, v) : { done: 0, total: 0, pct: 0 };
        return (
          <section key={v.date} className="break-inside-avoid">
            <div className="flex items-baseline justify-between border-b-2 border-[#2D4A2B]/30 pb-2 mb-3">
              <h3 className="text-lg" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>{formatLongDate(v.date)}</h3>
              <span className="text-xs text-[#5A7A4E] font-mono">
                Week {v.week} · {comp.done}/{comp.total} applications
                {st?.signedOff && " · SIGNED OFF"}
              </span>
            </div>
            {!st && <p className="text-xs italic text-[#1C2617]/50">No activity logged.</p>}
            {st && (
              <>
                {st.weatherConditions && <p className="text-xs text-[#1C2617]/70 mb-2"><strong>Conditions:</strong> {st.weatherConditions}</p>}
                {st.technician && <p className="text-xs text-[#1C2617]/70 mb-2"><strong>Technician:</strong> {st.technician}</p>}
                <ul className="space-y-1.5 text-sm">
                  {v.tasks.map(tid => {
                    const task = TASKS[tid];
                    const ts = st.tasks?.[tid];
                    if (!ts) return null;
                    const appliedTrees = task.trees.filter(id => ts.treeStates[id]?.applied);
                    const notes = task.trees.filter(id => ts.treeStates[id]?.notes).map(id => ({ tree: TREE_BY_ID[id], note: ts.treeStates[id].notes }));
                    if (appliedTrees.length === 0 && notes.length === 0) return null;
                    return (
                      <li key={tid} className="pl-3 border-l-2 border-[#2D4A2B]/30">
                        <div className="font-medium">{task.title}</div>
                        {appliedTrees.length > 0 && (
                          <div className="text-xs text-[#1C2617]/70 mt-0.5">
                            <strong>Applied to:</strong>{" "}
                            {appliedTrees.length === task.trees.length ? `all ${task.trees.length} trees` : appliedTrees.map(id => TREE_BY_ID[id].name).join(", ")}
                            {task.dose !== "—" && <> · <span className="font-mono">{task.dose}</span></>}
                          </div>
                        )}
                        {notes.map((n, i) => (
                          <div key={i} className="text-xs italic text-[#1C2617]/80 mt-1">{n.tree.name}: "{n.note}"</div>
                        ))}
                      </li>
                    );
                  })}
                </ul>
                {st.overallNotes && <div className="mt-3 p-2.5 bg-[#F5F1E8] rounded text-xs"><strong>Visit notes:</strong> {st.overallNotes}</div>}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ByTreeReport({ visitsInRange, visitStates }) {
  const perTreeLog = useMemo(() => {
    const m = {};
    TREES.forEach(t => m[t.id] = []);
    visitsInRange.forEach(v => {
      const st = visitStates[v.date];
      if (!st) return;
      v.tasks.forEach(tid => {
        const task = TASKS[tid];
        const ts = st.tasks?.[tid];
        if (!ts) return;
        task.trees.forEach(treeId => {
          const s = ts.treeStates[treeId];
          if (s?.applied) m[treeId].push({ date: v.date, task, notes: s.notes, by: s.appliedBy });
        });
      });
    });
    return m;
  }, [visitsInRange, visitStates]);

  return (
    <div className="space-y-7">
      {TREES.map(tree => {
        const log = perTreeLog[tree.id];
        return (
          <section key={tree.id} className="break-inside-avoid">
            <div className="border-b-2 border-[#2D4A2B]/30 pb-2 mb-3">
              <h3 className="text-lg flex items-center gap-2" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
                {tree.name}
                <span className="text-xs font-mono text-[#5A7A4E] font-normal">({tree.code})</span>
              </h3>
              <p className="text-xs text-[#1C2617]/70 mt-0.5">
                <strong>Clinical concern:</strong> {tree.issue} · <strong>Priority:</strong> {tree.priority}
              </p>
            </div>
            {log.length === 0 ? (
              <p className="text-xs italic text-[#1C2617]/50">No treatments logged in this period.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {log.map((entry, i) => (
                  <li key={i} className="pl-3 border-l-2 border-[#2D4A2B]/30">
                    <div className="font-mono text-xs text-[#5A7A4E]">{formatShortDate(entry.date)}</div>
                    <div className="font-medium">{entry.task.title}</div>
                    <div className="text-xs text-[#1C2617]/70">
                      {entry.task.dose !== "—" && <span className="font-mono">{entry.task.dose}</span>}
                      {entry.by && <> · by {entry.by}</>}
                    </div>
                    {entry.notes && <div className="text-xs italic mt-0.5">"{entry.notes}"</div>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
