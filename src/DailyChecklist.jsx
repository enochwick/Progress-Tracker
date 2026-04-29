import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Minus, Copy, Check, ChevronDown, ChevronRight, RotateCcw, Sparkles, History, Lock, Unlock, ArrowLeft, Calendar, X, MessageSquare, Trash2 } from 'lucide-react';
import { isSupabaseConfigured, siteUrl, supabase, supabaseConfigError } from './supabaseClient';

// ============== CONSTANTS ==============
const C = {
  bg: '#0c0c14',
  bgElev: '#13131d',
  surface: '#1a1a26',
  card: '#16162080',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',
  text: '#f0f0f4',
  textMuted: '#a0a0b8',
  textDim: '#606078',
  accent: '#818cf8',
  accentDim: '#6366f1',
  accentGlow: 'rgba(129,140,248,0.12)',
  ok: '#34d399',
  warn: '#fbbf24',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  radius: '14px',
  radiusSm: '10px',
};

const STORAGE_META = 'henok:meta';
const STORAGE_DAILY = (d) => `henok:day:${d}`;
const STORAGE_WEEK = (w) => `henok:week:${w}`;
const STORAGE_PREFIX_DAY = 'henok:day:';

const localStore = {
  async get(key) {
    try {
      const v = localStorage.getItem(key);
      return v ? { value: v } : null;
    } catch (_) { return null; }
  },
  async set(key, value) {
    try { localStorage.setItem(key, value); return { value }; }
    catch (_) { return null; }
  },
  async delete(key) {
    try { localStorage.removeItem(key); return { deleted: true }; }
    catch (_) { return null; }
  },
  async list(prefix = '') {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      return { keys };
    } catch (_) { return { keys: [] }; }
  },
};

const parseStoredValue = (value, fallback = null) => {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value); }
    catch (_) { return fallback; }
  }
  if (typeof value === 'object') return value;
  return fallback;
};

const toStoredJson = (value) => parseStoredValue(value, value);

const createProgressStore = (userId) => {
  if (!isSupabaseConfigured || !supabase || !userId) return localStore;

  return {
    async get(key) {
      const { data, error } = await supabase
        .from('progress_entries')
        .select('value')
        .eq('user_id', userId)
        .eq('storage_key', key)
        .maybeSingle();

      if (error) throw error;
      return data ? { value: data.value } : null;
    },
    async set(key, value) {
      const { error } = await supabase
        .from('progress_entries')
        .upsert(
          {
            user_id: userId,
            storage_key: key,
            value: toStoredJson(value),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,storage_key' },
        );

      if (error) throw error;
      return { value };
    },
    async delete(key) {
      const { error } = await supabase
        .from('progress_entries')
        .delete()
        .eq('user_id', userId)
        .eq('storage_key', key);

      if (error) throw error;
      return { deleted: true };
    },
    async list(prefix = '') {
      const { data, error } = await supabase
        .from('progress_entries')
        .select('storage_key')
        .eq('user_id', userId)
        .like('storage_key', `${prefix}%`);

      if (error) throw error;
      return { keys: (data || []).map((row) => row.storage_key) };
    },
  };
};

const DAILY_TASKS = [
  { id: 'ritual', time: '6:30 AM — 7:00 AM', label: 'Morning ritual', sub: 'Coffee, light movement, no phone' },
  { id: 'plan', time: '7:00 AM — 7:15 AM', label: 'Daily plan written', sub: 'Pick top 3 wins for the day' },
  { id: 'deep1', time: '7:15 AM — 9:30 AM', label: 'Deep Work — Block 1', sub: 'Highest-leverage build task' },
  { id: 'apps', time: '9:45 AM — 11:30 AM', label: 'Applications + DMs', sub: '5 tailored apps + 3 hiring manager DMs' },
  { id: 'lunch', time: '11:30 AM — 12:30 PM', label: 'Lunch + Social Booth', sub: '3–5 venue outreaches' },
  { id: 'upwork', time: '12:30 PM — 2:30 PM', label: 'Upwork + Gigs', sub: '5 proposals or active client work' },
  { id: 'deep2', time: '2:45 PM — 4:30 PM', label: 'Deep Work — Block 2', sub: 'Case study, RAG cert, content, or client work' },
  { id: 'comms', time: '4:30 PM — 5:30 PM', label: 'Comms & admin', sub: 'Reply to all messages, update tracker' },
];

const COUNTERS = [
  { id: 'apps', label: 'Job Apps', target: 5 },
  { id: 'dms', label: 'LinkedIn DMs', target: 3 },
  { id: 'upwork', label: 'Upwork Proposals', target: 5 },
  { id: 'sb', label: 'Social Booth Outreach', target: 3 },
];

const WEEK_MILESTONES = {
  1: {
    title: 'WEEK 01 — FOUNDATION',
    subtitle: 'Build once, use forever',
    items: [
      { id: 'portfolio', label: 'Portfolio site (heynok.com) live and deployed' },
      { id: 'resume', label: 'Resume — 1-page, ATS-friendly, AI-forward, PDF exported' },
      { id: 'linkedin', label: 'LinkedIn revamped (Headline, About, Featured, Open to Work on)' },
      { id: 'upwork_p', label: 'Upwork profile resurrected — AI specialty, $75–$125/hr' },
      { id: 'targets', label: 'Target company list: 50 DFW + remote' },
      { id: 'network', label: 'Network message: send to 30 people' },
      { id: 'sb_20', label: 'Social Booth: 20 venue/vendor outreaches sent' },
      { id: 'tracker', label: 'Tracker spreadsheet set up (4 tabs)' },
    ],
  },
  2: {
    title: 'WEEK 02 — PIPELINE FILL',
    subtitle: 'Volume + velocity',
    items: [
      { id: 'apps_50', label: '50–70 tailored job applications submitted' },
      { id: 'prop_35', label: '35 Upwork proposals sent' },
      { id: 'dms_21', label: '21+ hiring manager DMs sent' },
      { id: 'cs_1', label: 'Case study #1 published (Total Ancillary AI)' },
      { id: 'sb_30', label: 'Social Booth: 30 venue outreaches + 5 follow-ups' },
      { id: 'first_uw', label: 'First Upwork gig landed ($300–$1,000)' },
      { id: 'li_posts', label: '3 LinkedIn posts published' },
    ],
  },
  3: {
    title: 'WEEK 03 — CONVERSION',
    subtitle: 'Pipeline turns into conversations',
    items: [
      { id: 'recruit_3', label: '3+ recruiter calls / first-round interviews scheduled' },
      { id: 'sb_book', label: '1 Social Booth booking confirmed (deposit collected)' },
      { id: 'uw_inprog', label: '1–2 Upwork gigs in progress' },
      { id: 'cs_2', label: 'Second case study published' },
      { id: 'consult_15', label: '15 cold emails to DFW small biz (AI workflow audit)' },
      { id: 'rag_50', label: 'Coursera RAG: 50% complete' },
    ],
  },
  4: {
    title: 'WEEK 04 — ACCELERATION',
    subtitle: 'Double down on what works',
    items: [
      { id: 'second_2', label: '2+ second-round interviews' },
      { id: 'consult_signed', label: '1 consulting gig signed OR 2nd Upwork gig' },
      { id: 'review', label: 'Income tally: review + reassess strategy' },
      { id: 'sb_2nd', label: 'Social Booth: 2nd booking confirmed' },
      { id: 'rag_done', label: 'Coursera RAG complete + cert added to LinkedIn' },
      { id: 'targets_v2', label: 'Refine target list based on what is converting' },
    ],
  },
};

const SCRIPTS = [
  {
    id: 'li_hm',
    title: 'LinkedIn Cold DM — Hiring Manager',
    text: `Hi [Name] — saw the [Senior Designer / Product Designer] role on [Company]'s careers page and applied. Quick context: I'm a designer with a CS background who's spent the last year building production AI tools (RAG portals, sales assistants) alongside traditional brand and product work. If [Company]'s thinking about how AI changes design workflows, I'd love a quick chat. Either way — appreciate you considering my application.`,
  },
  {
    id: 'network',
    title: 'Network Reactivation',
    text: `Hey [Name] — quick update: my role just got eliminated in a department restructure, and I'm actively looking for my next move. Targeting senior design / creative tech roles, ideally with AI integration. Any leads, intros, or just folks I should know? Even a "no, but good luck" is appreciated. Happy to return the favor anytime.`,
  },
  {
    id: 'sb_pitch',
    title: 'Social Booth Co — Venue Pitch',
    text: `Hi [Venue Name] team — I run Social Booth Co, a DFW photo booth rental company specializing in [premium events / corporate / weddings]. We just had a great event at [recent example] and I'd love to be on your preferred vendor list. Open to doing a complimentary booth at your next staff/internal event so your team can experience it firsthand. Worth a quick call?`,
  },
  {
    id: 'upwork',
    title: 'Upwork Proposal Opener',
    text: `Hi [Client] — your project caught my eye because [specific detail from their post]. I've done [closely related thing] for [type of client] — here's a 30-second look: [link]. For your project, I'd approach it by [1-sentence approach]. Happy to start with a paid 30-min discovery call to scope it precisely. Available to start [day].`,
  },
];

const DEFAULT_DAY = {
  top3: ['', '', ''],
  checked: {},
  counters: { apps: 0, dms: 0, upwork: 0, sb: 0 },
  plans: [],
  notes: {},
  taskTimes: {},
  review: { wins: '', tomorrow: '' },
  locked: false,
  lockedAt: null,
  lastSavedAt: null,
};

// ============== HELPERS ==============
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatLongDate = (key) => {
  const d = key ? new Date(key + 'T00:00:00') : new Date();
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
};

const formatShortDate = (key) => {
  const d = new Date(key + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const dayNumberFor = (key, startDate) => {
  const start = new Date(startDate + 'T00:00:00').getTime();
  const target = new Date(key + 'T00:00:00').getTime();
  return Math.max(1, Math.floor((target - start) / 86400000) + 1);
};

const weekNumberFor = (dn) => Math.min(4, Math.max(1, Math.ceil(dn / 7)));

const weekDateRange = (weekNum, startDate) => {
  const start = new Date(startDate + 'T00:00:00');
  const weekStart = new Date(start.getTime() + (weekNum - 1) * 7 * 86400000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
};

// ============== COMPONENT ==============
export default function DailyChecklist() {
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured || Boolean(supabaseConfigError));
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [dayLoaded, setDayLoaded] = useState(false);
  const [hydratedDayKey, setHydratedDayKey] = useState(null);
  const [meta, setMeta] = useState({ startDate: todayKey() });
  const [day, setDay] = useState(DEFAULT_DAY);
  const [weekMs, setWeekMs] = useState({});

  const [view, setView] = useState('today');
  const [viewingKey, setViewingKey] = useState(todayKey());
  const [historyDays, setHistoryDays] = useState([]);

  const [scriptOpen, setScriptOpen] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const storage = useMemo(() => createProgressStore(session?.user?.id), [session?.user?.id]);
  const storageScope = isSupabaseConfigured ? session?.user?.id : 'local';
  const canUseStorage = !isSupabaseConfigured || Boolean(session?.user?.id);
  const latestState = useRef({ day: DEFAULT_DAY, weekMs: {}, viewingKey: todayKey(), weekNumber: 1, dayLoaded: false, hydratedDayKey: null, storage });

  const isToday = viewingKey === todayKey();
  const dayNumber = dayNumberFor(viewingKey, meta.startDate);
  const weekNumber = weekNumberFor(dayNumber);
  const milestones = WEEK_MILESTONES[weekNumber];
  const isAuthCallback = window.location.pathname === '/auth/callback';

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthCallback || !session) return;
    window.history.replaceState({}, '', '/');
  }, [isAuthCallback, session]);

  useEffect(() => {
    if (!canUseStorage) return;
    setLoaded(false);
    setDayLoaded(false);
    setHydratedDayKey(null);
    let cancelled = false;
    async function load() {
      let m = { startDate: todayKey() };
      try {
        const r = await storage.get(STORAGE_META);
        if (r?.value) m = parseStoredValue(r.value, m);
        else await storage.set(STORAGE_META, JSON.stringify(m));
      } catch (_) {}
      if (cancelled) return;
      setMeta(m);
      setLoaded(true);
    }
    load();
    return () => { cancelled = true; };
  }, [canUseStorage, storage, storageScope]);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    setDayLoaded(false);
    setHydratedDayKey(null);
    async function loadDay() {
      try {
        const r = await storage.get(STORAGE_DAILY(viewingKey));
        if (!cancelled) {
          if (r?.value) {
            const parsed = parseStoredValue(r.value, DEFAULT_DAY);
            setDay({
              ...DEFAULT_DAY,
              ...parsed,
              counters: { ...DEFAULT_DAY.counters, ...(parsed.counters || {}) },
              review: { ...DEFAULT_DAY.review, ...(parsed.review || {}) },
              plans: parsed.plans || [],
              notes: parsed.notes || {},
              taskTimes: parsed.taskTimes || {},
            });
          } else {
            setDay(DEFAULT_DAY);
          }
          setDayLoaded(true);
          setHydratedDayKey(viewingKey);
        }
      } catch (_) {
        if (!cancelled) {
          setDay(DEFAULT_DAY);
          setDayLoaded(true);
          setHydratedDayKey(viewingKey);
        }
      }
    }
    loadDay();
    return () => { cancelled = true; };
  }, [viewingKey, loaded, storage]);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    async function loadW() {
      try {
        const r = await storage.get(STORAGE_WEEK(weekNumber));
        if (!cancelled) setWeekMs(r?.value ? parseStoredValue(r.value, {}) : {});
      } catch (_) {
        if (!cancelled) setWeekMs({});
      }
    }
    loadW();
    return () => { cancelled = true; };
  }, [weekNumber, loaded, storage]);

  useEffect(() => {
    latestState.current = { day, weekMs, viewingKey, weekNumber, dayLoaded, hydratedDayKey, storage };
  }, [day, weekMs, viewingKey, weekNumber, dayLoaded, hydratedDayKey, storage]);

  useEffect(() => {
    if (!loaded || !dayLoaded || hydratedDayKey !== viewingKey) return;
    const toSave = { ...day, lastSavedAt: new Date().toISOString() };
    if (storage === localStore) {
      try {
        localStorage.setItem(STORAGE_DAILY(viewingKey), JSON.stringify(toSave));
      } catch (_) {}
      return;
    }
    storage.set(STORAGE_DAILY(viewingKey), JSON.stringify(toSave)).catch(() => {});
  }, [day, viewingKey, loaded, dayLoaded, hydratedDayKey, storage]);

  useEffect(() => {
    if (!loaded) return;
    storage.set(STORAGE_WEEK(weekNumber), JSON.stringify(weekMs)).catch(() => {});
  }, [weekMs, weekNumber, loaded, storage]);

  useEffect(() => {
    if (!loaded) return;

    const flush = () => {
      const s = latestState.current;
      if (!s.dayLoaded || s.hydratedDayKey !== s.viewingKey) return;
      const savedAt = new Date().toISOString();
      if (s.storage === localStore) {
        try {
          localStorage.setItem(STORAGE_DAILY(s.viewingKey), JSON.stringify({ ...s.day, lastSavedAt: savedAt }));
          localStorage.setItem(STORAGE_WEEK(s.weekNumber), JSON.stringify(s.weekMs));
        } catch (_) {}
        return;
      }
      s.storage.set(STORAGE_DAILY(s.viewingKey), JSON.stringify({ ...s.day, lastSavedAt: savedAt })).catch(() => {});
      s.storage.set(STORAGE_WEEK(s.weekNumber), JSON.stringify(s.weekMs)).catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loaded]);

  const updateTop3 = (idx, val) => {
    setDay((d) => {
      const next = [...d.top3];
      next[idx] = val;
      return { ...d, top3: next };
    });
  };

  const toggleCheck = (id) => setDay((d) => ({ ...d, checked: { ...d.checked, [id]: !d.checked[id] } }));
  const adjustCounter = (id, delta) => setDay((d) => ({ ...d, counters: { ...d.counters, [id]: Math.max(0, (d.counters[id] || 0) + delta) } }));
  const setWeekIncome = (val) => setWeekMs((m) => ({ ...m, income: parseFloat(val) || 0 }));
  const setReview = (key, val) => setDay((d) => ({ ...d, review: { ...d.review, [key]: val } }));
  const toggleMilestone = (id) => setWeekMs((m) => ({ ...m, [id]: !m[id] }));

  const addPlan = () => setDay((d) => ({ ...d, plans: [...d.plans, ''] }));
  const updatePlan = (idx, val) => setDay((d) => { const p = [...d.plans]; p[idx] = val; return { ...d, plans: p }; });
  const removePlan = (idx) => setDay((d) => ({ ...d, plans: d.plans.filter((_, i) => i !== idx) }));

  const setNote = (taskId, val) => setDay((d) => ({ ...d, notes: { ...d.notes, [taskId]: val } }));
  const setTaskTime = (taskId, val) => setDay((d) => ({ ...d, taskTimes: { ...d.taskTimes, [taskId]: val } }));

  const copyScript = async (script) => {
    try {
      await navigator.clipboard.writeText(script.text);
      setCopiedId(script.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (_) {}
  };

  const saveAndLock = async () => {
    const updated = { ...day, locked: true, lockedAt: new Date().toISOString(), lastSavedAt: new Date().toISOString() };
    setDay(updated);
    await storage.set(STORAGE_DAILY(viewingKey), JSON.stringify(updated));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const unlockDay = async () => {
    const updated = { ...day, locked: false, lockedAt: null };
    setDay(updated);
    await storage.set(STORAGE_DAILY(viewingKey), JSON.stringify(updated));
  };

  const resetEverything = async () => {
    const newMeta = { startDate: todayKey() };
    await storage.set(STORAGE_META, JSON.stringify(newMeta));
    for (let i = 1; i <= 4; i++) await storage.delete(STORAGE_WEEK(i));
    const list = await storage.list(STORAGE_PREFIX_DAY);
    if (list?.keys) for (const k of list.keys) await storage.delete(k);
    setMeta(newMeta);
    setDay(DEFAULT_DAY);
    setWeekMs({});
    setViewingKey(todayKey());
    setView('today');
    setShowResetConfirm(false);
  };

  const openHistory = async () => {
    const list = await storage.list(STORAGE_PREFIX_DAY);
    if (list?.keys) {
      const days = [];
      for (const k of list.keys) {
        const r = await storage.get(k);
        if (r?.value) {
          const dateKey = k.replace(STORAGE_PREFIX_DAY, '');
          const parsed = parseStoredValue(r.value);
          if (parsed) days.push({ key: dateKey, ...parsed });
        }
      }
      days.sort((a, b) => b.key.localeCompare(a.key));
      setHistoryDays(days);
    } else {
      setHistoryDays([]);
    }
    setView('history');
  };

  const openDay = (key) => {
    setViewingKey(key);
    setView('today');
  };

  const dailyTasksDone = DAILY_TASKS.filter((t) => day.checked[t.id]).length;
  const milestonesDone = milestones.items.filter((it) => weekMs[it.id]).length;
  const milestonePct = Math.round((milestonesDone / milestones.items.length) * 100);
  const allTop3Done = day.top3.every((t) => t && t.trim().length > 0);
  const countersHit = COUNTERS.filter((c) => (day.counters[c.id] || 0) >= c.target).length;
  const signOut = () => supabase?.auth.signOut();
  const signedInEmail = session?.user?.email;

  if (supabaseConfigError) {
    return <ConfigError message={supabaseConfigError} />;
  }

  if (isAuthCallback) {
    return <AuthCallbackStatus confirmed={Boolean(session)} ready={authReady} />;
  }

  if (!authReady) {
    return (
      <div style={{ background: C.bg, color: C.textMuted, minHeight: '100vh', fontFamily: C.sans, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid transparent', borderTopColor: C.accent, animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 13, letterSpacing: '0.08em', fontFamily: C.mono, color: C.textDim }}>LOADING…</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (isSupabaseConfigured && !session) {
    return <AuthGate />;
  }

  if (!loaded) {
    return (
      <div style={{ background: C.bg, color: C.textMuted, minHeight: '100vh', fontFamily: C.sans, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid transparent', borderTopColor: C.accent, animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 13, letterSpacing: '0.08em', fontFamily: C.mono, color: C.textDim }}>LOADING…</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (view === 'history') {
    const totalIncome = historyDays.reduce((sum, d) => sum + (d.income || 0), 0);
    const lockedDays = historyDays.filter((d) => d.locked).length;

    return (
      <Shell>
        <header style={headerStyle()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setView('today')} style={iconBtn()}>
              <ArrowLeft size={14} />
            </button>
            <strong style={{ color: C.text, fontWeight: 600 }}>HEYNOK</strong>
            <span style={{ color: C.textDim }}>/</span>
            <span>HISTORY</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', fontSize: 11, color: C.textMuted }}>
            <span>{historyDays.length} {historyDays.length === 1 ? 'DAY' : 'DAYS'} LOGGED</span>
            {signedInEmail && <span>{signedInEmail}</span>}
            <button onClick={signOut} style={pillBtn()}>SIGN OUT</button>
          </div>
        </header>

        <section style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: C.mono, fontSize: 12, letterSpacing: '0.08em', color: C.textMuted, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 24, height: 2, background: C.accent, display: 'inline-block', borderRadius: 1 }}></span>
            YOUR PROGRESS
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 7vw, 56px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, margin: 0, marginBottom: 28 }}>
            All your <span style={{ color: C.accent, fontStyle: 'italic' }}>days</span>
          </h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <Stat label="Days logged" value={historyDays.length} />
            <Stat label="Days locked" value={lockedDays} accent />
            <Stat label="Total income" value={`$${totalIncome.toLocaleString()}`} accent={totalIncome > 0} />
          </div>
        </section>

        {historyDays.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted, fontSize: 14 }}>
            <Calendar size={36} color={C.textDim} style={{ marginBottom: 16 }} />
            <div>No history yet. Start logging today.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {historyDays.map((d, i) => {
              const dn = dayNumberFor(d.key, meta.startDate);
              const tasksDone = DAILY_TASKS.filter((t) => d.checked?.[t.id]).length;
              const isCurrentDay = d.key === todayKey();
              return (
                <button
                  key={d.key}
                  onClick={() => openDay(d.key)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr auto',
                    gap: 16,
                    alignItems: 'center',
                    background: C.bgElev,
                    border: `1px solid ${C.border}`,
                    borderRadius: C.radius,
                    padding: '18px 20px',
                    marginBottom: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'inherit',
                    fontFamily: 'inherit',
                    width: '100%',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = 'rgba(129,140,248,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = C.bgElev; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ fontFamily: C.mono, fontSize: 12, color: C.textDim, letterSpacing: '0.04em' }}>
                    DAY <span style={{ color: C.accent }}>{String(dn).padStart(2, '0')}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{formatShortDate(d.key)}</span>
                      {isCurrentDay && <Pill accent>TODAY</Pill>}
                      {d.locked && <Pill ok><Lock size={9} /> LOCKED</Pill>}
                    </div>
                    <div style={{ fontSize: 13, color: C.textMuted, fontFamily: C.mono, letterSpacing: '0.02em' }}>
                      {tasksDone}/{DAILY_TASKS.length} tasks
                      {(d.income || 0) > 0 && <> · <span style={{ color: C.accent }}>${d.income.toLocaleString()}</span></>}
                      {' · '}
                      {Object.values(d.counters || {}).reduce((a, b) => a + b, 0)} actions
                    </div>
                  </div>
                  <ChevronRight size={16} color={C.textDim} />
                </button>
              );
            })}
          </div>
        )}
      </Shell>
    );
  }

  return (
    <Shell>
      <header style={headerStyle()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isToday && (
            <button onClick={() => { setViewingKey(todayKey()); setView('today'); }} style={iconBtn()}>
              <ArrowLeft size={14} />
            </button>
          )}
          <strong style={{ color: C.text, fontWeight: 600 }}>HEYNOK</strong>
          <span style={{ color: C.textDim }}>/</span>
          <span>{isToday ? 'DAILY OPS' : 'PAST DAY'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span>{formatLongDate(viewingKey)}</span>
          <span style={{ color: C.textDim }}>//</span>
          <button onClick={openHistory} style={pillBtn()}>
            <History size={11} /> HISTORY
          </button>
          <button onClick={() => setShowResetConfirm(true)} style={pillBtn()}>
            <RotateCcw size={11} /> RESET
          </button>
          {isSupabaseConfigured && (
            <button onClick={signOut} style={pillBtn()}>
              {signedInEmail || 'SIGN OUT'}
            </button>
          )}
        </div>
      </header>

      <section style={{ marginBottom: 40 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'end' }}>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 12, letterSpacing: '0.08em', color: C.textMuted, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 24, height: 2, background: C.accent, display: 'inline-block', borderRadius: 1 }}></span>
              30-DAY RESET BLUEPRINT
              {!isToday && <span style={{ color: C.warn, marginLeft: 6 }}>· VIEWING PAST DAY</span>}
            </div>
            <h1 style={{ fontSize: 'clamp(40px, 8vw, 64px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>
              DAY <span style={{ color: C.accent, fontFamily: C.mono, fontWeight: 600 }}>{String(dayNumber).padStart(2, '0')}</span>
              <span style={{ color: C.textDim, fontFamily: C.mono, fontWeight: 400, fontSize: '0.5em' }}> / 30</span>
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.08em', color: C.textDim, marginBottom: 6 }}>{milestones.subtitle}</div>
            <div style={{ fontFamily: C.mono, fontSize: 14, color: C.accent, letterSpacing: '0.04em', fontWeight: 500 }}>{milestones.title}</div>
          </div>
        </div>
      </section>

      {day.locked && (
        <div style={{ background: 'rgba(52, 211, 153, 0.06)', border: `1px solid rgba(52, 211, 153, 0.15)`, padding: '16px 20px', marginBottom: 28, borderRadius: C.radius, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: C.ok }}>
            <Lock size={14} />
            <span style={{ fontFamily: C.mono, fontSize: 12, letterSpacing: '0.04em' }}>
              DAY LOCKED · {formatTime(day.lockedAt)}
            </span>
          </div>
          <button onClick={unlockDay} style={{ ...pillBtn(), color: C.ok, borderColor: 'rgba(52, 211, 153, 0.3)' }}>
            <Unlock size={11} /> UNLOCK TO EDIT
          </button>
        </div>
      )}

      <Section num="01" title="Top 3 wins" right={allTop3Done ? <Badge accent>SET</Badge> : <Badge muted>WRITE THESE FIRST</Badge>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {day.top3.map((val, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: C.bgElev, border: `1px solid ${C.border}`, padding: '16px 18px', borderRadius: C.radius, transition: 'border-color 0.2s' }}>
              <span style={{ fontFamily: C.mono, fontSize: 13, color: C.accent, letterSpacing: '0.05em', minWidth: 28, fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</span>
              <input
                type="text"
                value={val}
                onChange={(e) => updateTop3(i, e.target.value)}
                placeholder={i === 0 ? 'The most important thing today is…' : 'Next priority…'}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: 16, fontFamily: 'inherit', fontWeight: 400 }}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section num="02" title="Today's output" right={
        <div style={{ display: 'flex', gap: 8 }}>
          <Badge accent={countersHit === COUNTERS.length}>{countersHit}/{COUNTERS.length} GOALS</Badge>
          {(weekMs.income || 0) > 0 && <Badge accent>${(weekMs.income || 0).toLocaleString()}/wk</Badge>}
        </div>
      }>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {COUNTERS.map((c) => {
            const v = day.counters[c.id] || 0;
            const hit = v >= c.target;
            return (
              <div key={c.id} style={{ background: C.bgElev, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14, borderRadius: C.radius, border: `1px solid ${hit ? 'rgba(129,140,248,0.2)' : C.border}`, transition: 'border-color 0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.06em', color: C.textMuted, textTransform: 'uppercase' }}>{c.label}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 11, color: hit ? C.accent : C.textDim }}>GOAL {c.target}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button onClick={() => adjustCounter(c.id, -1)} style={btnStyle()}><Minus size={14} /></button>
                  <div style={{ fontSize: 40, fontWeight: 600, fontFamily: C.mono, color: hit ? C.accent : C.text, letterSpacing: '-0.02em', transition: 'color 0.3s' }}>{v}</div>
                  <button onClick={() => adjustCounter(c.id, 1)} style={btnStyle('primary')}><Plus size={14} /></button>
                </div>
              </div>
            );
          })}
          <div style={{ background: C.bgElev, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14, gridColumn: 'span 2', borderRadius: C.radius, border: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.06em', color: C.textMuted, textTransform: 'uppercase' }}>Income this week ($)</div>
            <input
              type="number"
              min="0"
              value={weekMs.income || ''}
              onChange={(e) => setWeekIncome(e.target.value)}
              placeholder="0"
              style={{
                background: 'transparent',
                border: `1px solid ${C.borderStrong}`,
                borderRadius: C.radiusSm,
                color: (weekMs.income || 0) > 0 ? C.accent : C.text,
                padding: '14px 16px',
                fontSize: 26,
                fontFamily: C.mono,
                fontWeight: 600,
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
          </div>
        </div>
      </Section>

      <Section num="03" title="Daily plan" right={
        <button onClick={addPlan} style={{ ...pillBtn(), color: C.accent, borderColor: 'rgba(129,140,248,0.3)' }}>
          <Plus size={12} /> ADD ITEM
        </button>
      }>
        {day.plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: C.textDim, fontSize: 14, background: C.bgElev, borderRadius: C.radius, border: `1px solid ${C.border}` }}>
            No plan items yet. Click "Add Item" to start planning your day.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {day.plans.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.bgElev, border: `1px solid ${C.border}`, padding: '14px 16px', borderRadius: C.radius, transition: 'border-color 0.2s' }}>
                <span style={{ fontFamily: C.mono, fontSize: 12, color: C.accent, fontWeight: 600, minWidth: 24 }}>{String(i + 1).padStart(2, '0')}</span>
                <input
                  type="text"
                  value={p}
                  onChange={(e) => updatePlan(i, e.target.value)}
                  placeholder="What do you plan to do?"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: 15, fontFamily: 'inherit' }}
                />
                <button onClick={() => removePlan(i)} style={{ background: 'transparent', border: 'none', color: C.textDim, cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.2s' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section num="04" title="Daily schedule" right={<Badge accent={dailyTasksDone === DAILY_TASKS.length}>{dailyTasksDone}/{DAILY_TASKS.length} DONE</Badge>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DAILY_TASKS.map((t) => {
            const noteOpen = (day.notes[t.id] || '').length > 0;
            return (
            <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '24px 1fr auto',
                  gap: 14,
                  alignItems: 'center',
                  background: C.bgElev,
                  border: `1px solid ${day.checked[t.id] ? 'rgba(129,140,248,0.15)' : C.border}`,
                  borderRadius: noteOpen ? `${C.radius} ${C.radius} 0 0` : C.radius,
                  padding: '16px 18px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  onClick={() => toggleCheck(t.id)}
                  style={{
                    width: 22, height: 22, borderRadius: 6, cursor: 'pointer',
                    border: `2px solid ${day.checked[t.id] ? C.accent : C.borderStrong}`,
                    background: day.checked[t.id] ? C.accent : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: day.checked[t.id] ? '0 2px 8px rgba(129,140,248,0.3)' : 'none',
                  }}>
                  {day.checked[t.id] && <Check size={13} color="#fff" strokeWidth={3} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 500,
                    color: day.checked[t.id] ? C.textMuted : C.text,
                    textDecoration: day.checked[t.id] ? 'line-through' : 'none',
                  }}>{t.label}</div>
                  <div style={{ fontSize: 13, color: C.textDim }}>{t.sub}</div>
                  <input
                    type="text"
                    value={day.taskTimes[t.id] || t.time}
                    onChange={(e) => setTaskTime(t.id, e.target.value)}
                    style={{ fontFamily: C.mono, fontSize: 11, color: C.textDim, letterSpacing: '0.02em', background: 'transparent', border: 'none', outline: 'none', padding: '2px 0', marginTop: 2, width: '100%', maxWidth: 220 }}
                  />
                </div>
                <button
                  onClick={() => setNote(t.id, day.notes[t.id] ? '' : ' ')}
                  style={{ background: 'transparent', border: 'none', color: day.notes[t.id] ? C.accent : C.textDim, cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.2s' }}
                  title="Add note"
                >
                  <MessageSquare size={14} />
                </button>
              </div>
              {noteOpen && (
                <div style={{ background: C.surface, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, borderRadius: `0 0 ${C.radius} ${C.radius}`, padding: '10px 18px' }}>
                  <input
                    type="text"
                    value={day.notes[t.id] || ''}
                    onChange={(e) => setNote(t.id, e.target.value)}
                    placeholder="Add a note or remark…"
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: C.textMuted, fontSize: 13, fontFamily: 'inherit', fontStyle: 'italic' }}
                  />
                </div>
              )}
            </div>
            );
          })}
        </div>
      </Section>

      <Section num="05" title={<>This week's milestones <span style={{ fontWeight: 400, fontSize: 14, color: C.textMuted, marginLeft: 8 }}>({weekDateRange(weekNumber, meta.startDate)})</span></>} right={<Badge accent={milestonePct === 100}>{milestonesDone}/{milestones.items.length} · {milestonePct}%</Badge>}>
        <div style={{ marginBottom: 18, height: 4, background: C.bgElev, borderRadius: 4, position: 'relative', overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${milestonePct}%`, background: `linear-gradient(90deg, ${C.accentDim}, ${C.accent})`, transition: 'width 0.4s ease', borderRadius: 4, boxShadow: '0 0 12px rgba(129,140,248,0.3)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {milestones.items.map((it) => {
            const done = !!weekMs[it.id];
            return (
              <button
                key={it.id}
                onClick={() => toggleMilestone(it.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  background: C.bgElev,
                  border: `1px solid ${done ? 'rgba(129,140,248,0.15)' : C.border}`,
                  borderRadius: C.radius,
                  padding: '14px 18px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'inherit',
                  fontFamily: 'inherit',
                  width: '100%',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.surface; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.bgElev; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${done ? C.accent : C.borderStrong}`,
                  background: done ? C.accent : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                  boxShadow: done ? '0 2px 8px rgba(129,140,248,0.3)' : 'none',
                }}>
                  {done && <Check size={11} color="#fff" strokeWidth={3} />}
                </div>
                <div style={{ fontSize: 14, color: done ? C.textMuted : C.text, textDecoration: done ? 'line-through' : 'none' }}>{it.label}</div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section num="06" title="Outreach scripts" right={<Badge muted>CLICK TO COPY</Badge>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SCRIPTS.map((s) => {
            const open = scriptOpen === s.id;
            const copied = copiedId === s.id;
            return (
              <div key={s.id} style={{ border: `1px solid ${C.border}`, background: C.bgElev, borderRadius: C.radius, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                <button
                  onClick={() => setScriptOpen(open ? null : s.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    padding: '16px 18px',
                    cursor: 'pointer',
                    color: C.text,
                    fontFamily: 'inherit',
                    fontSize: 15,
                    fontWeight: 500,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {open ? <ChevronDown size={14} color={C.accent} /> : <ChevronRight size={14} color={C.textMuted} />}
                    {s.title}
                  </span>
                  <span
                    onClick={(e) => { e.stopPropagation(); copyScript(s); }}
                    style={{
                      fontFamily: C.mono,
                      fontSize: 11,
                      letterSpacing: '0.04em',
                      padding: '5px 12px',
                      border: `1px solid ${copied ? 'rgba(129,140,248,0.3)' : C.borderStrong}`,
                      color: copied ? C.accent : C.textMuted,
                      borderRadius: 999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      background: copied ? C.accentGlow : 'transparent',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {copied ? <><Check size={11} /> COPIED</> : <><Copy size={11} /> COPY</>}
                  </span>
                </button>
                {open && (
                  <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${C.border}` }}>
                    <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: '16px 0 0' }}>{s.text}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section num="07" title="End of day review" right={<Badge muted>BEFORE YOU LOG OFF</Badge>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontFamily: C.mono, fontSize: 11, letterSpacing: '0.08em', color: C.textMuted, textTransform: 'uppercase', marginBottom: 10 }}>What hit today?</label>
            <textarea
              value={day.review.wins}
              onChange={(e) => setReview('wins', e.target.value)}
              placeholder="What went well? Any unexpected wins?"
              rows={3}
              style={{
                width: '100%',
                background: C.bgElev,
                border: `1px solid ${C.border}`,
                borderRadius: C.radius,
                color: C.text,
                padding: '16px 18px',
                fontSize: 15,
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                lineHeight: 1.6,
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: C.mono, fontSize: 11, letterSpacing: '0.08em', color: C.textMuted, textTransform: 'uppercase', marginBottom: 10 }}>Tomorrow's #1 priority</label>
            <input
              type="text"
              value={day.review.tomorrow}
              onChange={(e) => setReview('tomorrow', e.target.value)}
              placeholder="Write the one thing you'll wake up and do first"
              style={{
                width: '100%',
                background: C.bgElev,
                border: `1px solid ${C.border}`,
                borderRadius: C.radius,
                color: C.text,
                padding: '16px 18px',
                fontSize: 15,
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
          </div>
        </div>
      </Section>

      <section style={{ marginTop: 48, marginBottom: 28, padding: '28px 24px', borderRadius: C.radius, background: C.bgElev, border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.08em', color: C.textMuted, marginBottom: 6 }}>
              {savedFlash ? <span style={{ color: C.accent }}>SAVED — {formatTime(day.lockedAt || day.lastSavedAt)}</span> : day.lastSavedAt ? `LAST SAVED — ${formatTime(day.lastSavedAt)}` : 'AUTO-SAVING'}
            </div>
            <div style={{ fontSize: 16, color: C.text, fontWeight: 600 }}>
              {day.locked ? 'Day is locked' : 'Done with this day?'}
            </div>
          </div>
          {!day.locked ? (
            <button
              onClick={saveAndLock}
              style={{
                background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
                color: '#fff',
                border: 'none',
                padding: '14px 28px',
                fontSize: 15,
                fontWeight: 600,
                fontFamily: 'inherit',
                letterSpacing: '0.02em',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                borderRadius: C.radius,
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 20px rgba(129,140,248,0.25)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(129,140,248,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(129,140,248,0.25)'; }}
            >
              <Lock size={14} /> SAVE & LOCK DAY
            </button>
          ) : (
            <button onClick={unlockDay} style={{ ...btnStyle(), padding: '12px 20px', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <Unlock size={14} /> UNLOCK TO EDIT
            </button>
          )}
        </div>
      </section>

      <footer style={{ marginTop: 48, paddingTop: 28, borderTop: `1px solid ${C.border}`, fontFamily: C.mono, fontSize: 11, letterSpacing: '0.04em', color: C.textDim, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span>HENOK TADESSE · 30-DAY RESET</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={12} color={C.accent} /> SHOW UP. SHIP. THE PATTERN PAYS.
        </span>
      </footer>

      {showResetConfirm && (
        <div onClick={() => setShowResetConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, border: `1px solid ${C.borderStrong}`, borderRadius: '16px', padding: 32, maxWidth: 440, width: '100%', position: 'relative', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <button onClick={() => setShowResetConfirm(false)} style={{ position: 'absolute', top: 18, right: 18, background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
            <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.08em', color: C.warn, marginBottom: 14 }}>RESET ALL PROGRESS</div>
            <h3 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 14 }}>Start over from Day 1?</h3>
            <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7, marginBottom: 28 }}>This wipes <strong style={{ color: C.text }}>all logged days</strong>, all 4 weeks of milestones, and resets your start date to today. Cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowResetConfirm(false)} style={btnStyle('ghost')}>Cancel</button>
              <button onClick={resetEverything} style={btnStyle('danger')}>Reset everything</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function AuthGate() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const authCall = mode === 'signin'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${siteUrl}/auth/callback`,
          },
        });

    const { data, error } = await authCall;
    setBusy(false);

    if (error) {
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        setPendingEmail(email);
        setMode('checkEmail');
        setMessage('Confirm your email before signing in. You can resend the confirmation below.');
        return;
      }
      setMessage(error.message);
      return;
    }

    if (mode === 'signup' && !data?.session) {
      setPendingEmail(email);
      setMode('checkEmail');
      setMessage('');
    }
  };

  const resendConfirmation = async () => {
    const targetEmail = pendingEmail || email;
    if (!targetEmail) {
      setMessage('Enter your email first, then resend confirmation.');
      return;
    }

    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });
    setBusy(false);

    setMessage(error ? error.message : `Confirmation email sent to ${targetEmail}.`);
  };

  if (mode === 'checkEmail') {
    const targetEmail = pendingEmail || email;

    return (
      <Shell>
        <section style={{ minHeight: 'calc(100vh - 160px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 440, background: C.bgElev, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 28, boxShadow: '0 24px 48px rgba(0,0,0,0.25)' }}>
            <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.08em', color: C.accent, marginBottom: 12 }}>CHECK YOUR EMAIL</div>
            <h1 style={{ margin: 0, marginBottom: 10, fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.02em' }}>Confirm your tracker account</h1>
            <p style={{ margin: 0, marginBottom: 20, color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>
              We sent a confirmation link to <span style={{ color: C.text }}>{targetEmail || 'your email'}</span>. Open it to finish sign-in, then come back here.
            </p>

            {message && (
              <div style={{ color: message.toLowerCase().includes('sent') ? C.ok : C.warn, fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
                {message}
              </div>
            )}

            <button type="button" onClick={resendConfirmation} disabled={busy} style={{ ...btnStyle('primary'), width: '100%', justifyContent: 'center', padding: '14px 18px', opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Sending...' : 'Resend confirmation'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('signin'); setMessage(''); }}
              style={{ marginTop: 14, width: '100%', background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 13 }}
            >
              Back to sign in
            </button>
          </div>
        </section>
      </Shell>
    );
  }

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setMessage('');
    if (mode === 'signin') {
      setPendingEmail('');
    }
  };

  return (
    <Shell>
      <section style={{ minHeight: 'calc(100vh - 160px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 420, background: C.bgElev, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 28, boxShadow: '0 24px 48px rgba(0,0,0,0.25)' }}>
          <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.08em', color: C.accent, marginBottom: 12 }}>CLOUD SYNC</div>
          <h1 style={{ margin: 0, marginBottom: 10, fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {mode === 'signin' ? 'Sign in to your tracker' : 'Create your tracker account'}
          </h1>
          <p style={{ margin: 0, marginBottom: 24, color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>
            Your progress is saved to Supabase so it survives incognito windows and follows you between devices.
          </p>

          <label style={authLabel()}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              style={authInput()}
            />
          </label>

          <label style={authLabel()}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
              required
              style={authInput()}
            />
          </label>

          {message && (
            <div style={{ color: message.toLowerCase().includes('created') ? C.ok : C.warn, fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
              {message}
            </div>
          )}

          <button type="submit" disabled={busy} style={{ ...btnStyle('primary'), width: '100%', justifyContent: 'center', padding: '14px 18px', opacity: busy ? 0.7 : 1 }}>
            <Lock size={14} /> {busy ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>

          <button
            type="button"
            onClick={switchMode}
            style={{ marginTop: 14, width: '100%', background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 13 }}
          >
            {mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
          </button>
        </form>
      </section>
    </Shell>
  );
}

function ConfigError({ message }) {
  return (
    <Shell>
      <section style={{ minHeight: 'calc(100vh - 160px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 520, background: C.bgElev, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 28 }}>
          <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.08em', color: C.warn, marginBottom: 12 }}>SUPABASE SETUP</div>
          <h1 style={{ margin: 0, marginBottom: 10, fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.02em' }}>Cloud sync needs one env fix</h1>
          <p style={{ margin: 0, marginBottom: 18, color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>{message}</p>
          <div style={{ background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: C.radiusSm, padding: 16, fontFamily: C.mono, fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
            VITE_SUPABASE_URL=https://your-project-ref.supabase.co<br />
            VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
          </div>
        </div>
      </section>
    </Shell>
  );
}

function AuthCallbackStatus({ confirmed, ready }) {
  return (
    <Shell>
      <section style={{ minHeight: 'calc(100vh - 160px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 420, background: C.bgElev, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 28, textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid transparent', borderTopColor: confirmed ? C.ok : C.accent, animation: confirmed ? 'none' : 'spin 0.8s linear infinite', margin: '0 auto 18px' }} />
          <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.08em', color: confirmed ? C.ok : C.accent, marginBottom: 12 }}>
            {confirmed ? 'CONFIRMED' : 'CONFIRMING'}
          </div>
          <h1 style={{ margin: 0, marginBottom: 10, fontSize: 26, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {confirmed ? 'You are signed in' : 'Confirming your email...'}
          </h1>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>
            {confirmed || !ready ? 'Taking you to your tracker.' : 'If this takes more than a moment, return to sign in and try again.'}
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: C.sans }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(129,140,248,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(99,102,241,0.04) 0%, transparent 50%)',
      }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto', padding: '32px 24px 80px' }}>
        {children}
      </div>
    </div>
  );
}

function Section({ num, title, right, children }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', color: C.accent, background: C.accentGlow, padding: '4px 10px', borderRadius: 6 }}>{num}</span>
          <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value, accent = false }) {
  return (
    <div style={{ background: C.bgElev, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 8, borderRadius: C.radiusSm }}>
      <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.06em', color: C.textMuted, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 600, fontFamily: C.mono, color: accent ? C.accent : C.text, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}

function Badge({ children, accent = false, muted = false }) {
  const color = accent ? C.accent : muted ? C.textDim : C.textMuted;
  const bg = accent ? C.accentGlow : 'transparent';
  const borderC = accent ? 'rgba(129,140,248,0.3)' : C.borderStrong;
  return (
    <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.06em', padding: '5px 12px', border: `1px solid ${borderC}`, borderRadius: 999, color, background: bg, whiteSpace: 'nowrap', fontWeight: 500 }}>{children}</span>
  );
}

function Pill({ children, accent = false, ok = false }) {
  const bg = accent ? C.accent : ok ? 'rgba(52, 211, 153, 0.1)' : C.bgElev;
  const color = accent ? C.bg : ok ? C.ok : C.textMuted;
  const border = accent ? 'transparent' : ok ? 'rgba(52, 211, 153, 0.3)' : C.borderStrong;
  return (
    <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: '0.06em', padding: '4px 10px', background: bg, color, border: `1px solid ${border}`, borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>{children}</span>
  );
}

function headerStyle() {
  return { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20, borderBottom: `1px solid ${C.border}`, marginBottom: 32, fontFamily: C.mono, fontSize: 12, letterSpacing: '0.04em', color: C.textMuted, gap: 12, flexWrap: 'wrap' };
}

function pillBtn() {
  return { background: C.bgElev, border: `1px solid ${C.borderStrong}`, color: C.textMuted, padding: '6px 14px', borderRadius: 999, fontSize: 11, letterSpacing: '0.04em', cursor: 'pointer', fontFamily: C.mono, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s ease', fontWeight: 500 };
}

function authLabel() {
  return { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, color: C.textMuted, fontFamily: C.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };
}

function authInput() {
  return { width: '100%', boxSizing: 'border-box', background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: C.radiusSm, color: C.text, padding: '14px 16px', fontFamily: C.sans, fontSize: 15, outline: 'none', textTransform: 'none', letterSpacing: 0 };
}

function iconBtn() {
  return { background: C.bgElev, border: `1px solid ${C.borderStrong}`, color: C.textMuted, width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' };
}

function btnStyle(variant = 'default') {
  const base = { background: 'transparent', border: `1px solid ${C.borderStrong}`, color: C.text, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, padding: '10px 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', borderRadius: C.radiusSm, fontWeight: 500 };
  if (variant === 'primary') return { ...base, background: C.accent, color: '#fff', borderColor: C.accent, padding: 10, borderRadius: C.radiusSm, boxShadow: '0 2px 12px rgba(129,140,248,0.3)' };
  if (variant === 'ghost') return { ...base, color: C.textMuted, borderColor: C.borderStrong };
  if (variant === 'danger') return { ...base, background: C.warn, color: '#fff', borderColor: C.warn, fontWeight: 600, borderRadius: C.radiusSm };
  return { ...base, padding: 10, borderRadius: C.radiusSm };
}
