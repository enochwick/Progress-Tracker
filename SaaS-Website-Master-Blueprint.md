# SaaS Website Master Blueprint
**Stack:** React + TypeScript + Vite · Tailwind CSS · shadcn/ui · Supabase · Resend · OpenAI · Vercel  
**Reference project:** heynok.com

This blueprint is a step-by-step reproduction guide. Every section lists the exact decisions made, files created, and gotchas encountered so a future project can be set up in one pass.

---

## Table of Contents
1. [Scaffold the Project](#1-scaffold-the-project)
2. [Tailwind & Design System](#2-tailwind--design-system)
3. [Landing Page Structure](#3-landing-page-structure)
4. [Contact Form Popup](#4-contact-form-popup)
5. [Transactional Email — Resend](#5-transactional-email--resend)
6. [Supabase — Project Setup](#6-supabase--project-setup)
7. [Supabase — Database Tables & RLS](#7-supabase--database-tables--rls)
8. [Supabase — Auth (Sign Up / Sign In)](#8-supabase--auth-sign-up--sign-in)
9. [Email Confirmation Flow](#9-email-confirmation-flow)
10. [Protected Dashboard](#10-protected-dashboard)
11. [File Upload + Supabase Storage](#11-file-upload--supabase-storage)
12. [AI Chatbot with RAG](#12-ai-chatbot-with-rag)
13. [Auto-Embedding Uploaded Documents](#13-auto-embedding-uploaded-documents)
14. [Vercel Deployment](#14-vercel-deployment)
15. [Frontend Design Refresh](#15-frontend-design-refresh)
16. [UI/UX Audit Checklist](#16-uiux-audit-checklist)
17. [Security Audit Checklist](#17-security-audit-checklist)
18. [Claude Code Agent Setup](#18-claude-code-agent-setup)
19. [Environment Variables Reference](#19-environment-variables-reference)
20. [Common Errors & Fixes](#20-common-errors--fixes)

---

## 1. Scaffold the Project

### Option A — Use the Gleam Launchpad Kit
```bash
# Download gleam-launchpad-kit from GitHub and rename
npm install
npm run dev
```

### Option B — Scaffold from scratch
```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npx shadcn@latest init          # choose: TypeScript, CSS vars, dark mode "class"
npm install framer-motion lucide-react react-router-dom
```

### Router setup (`src/main.tsx`)
```tsx
import { BrowserRouter } from "react-router-dom";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter><App /></BrowserRouter>
);
```

### Route map (`src/App.tsx`)
```tsx
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/login" element={<Login />} />
  <Route path="/auth/callback" element={<AuthCallback />} />
  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
</Routes>
```

---

## 2. Tailwind & Design System

### Install Claude Code templates skill
```bash
npx claude-code-templates@latest --skill creative-design/frontend-design
```
The skill lives in `.claude/skills/frontend-design/SKILL.md` and guides Claude to design distinctive, non-generic UIs.

### Font choices (avoid Inter/Roboto — they read as generic)
| Role | Font chosen | Why |
|---|---|---|
| Display headings | Cormorant Garamond | Editorial, authoritative, completely distinctive for healthcare |
| Body | DM Sans | Clean, readable, pairs well with serif |
| Monospace / labels | IBM Plex Mono | Technical without being cold |

### `tailwind.config.ts` — font families
```ts
fontFamily: {
  sans: ['DM Sans', 'system-ui', 'sans-serif'],
  mono: ['IBM Plex Mono', 'monospace'],
  display: ['Cormorant Garamond', 'Georgia', 'serif'],
},
```

### `src/index.css` — design tokens
Key decisions:
- **Background:** warm dark charcoal `hsl(20 8% 5%)` — NOT cold navy
- **Primary:** amber/gold `hsl(38 90% 58%)` — NOT generic teal/blue
- **All colors as HSL CSS variables** so shadcn/ui components inherit them automatically
- **Glass nav:** `backdrop-filter: blur(16px)` + semi-transparent warm background
- **Card depth:** gradient `from hsl(22 10% 8%)` to `hsl(20 8% 5%)` + layered shadow

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
```

### Utility classes to define in `index.css`
| Class | Purpose |
|---|---|
| `.font-display` | Cormorant Garamond, weight 600, tight line-height |
| `.text-gradient` | Amber gradient text (heading highlights) |
| `.btn-gradient` | Amber gradient button with glow shadow |
| `.glass` | Frosted glass panel (nav) |
| `.card-glow` | Dark card with border + depth shadow |
| `.dot-bg` | Subtle radial dot grid texture |
| `.pill-eyebrow` | Label pill with glowing amber dot |
| `.ring-glow` | Amber border + outer glow (product mock frame) |

---

## 3. Landing Page Structure

### Component file map
```
src/components/landing/
  Nav.tsx             Fixed glass nav — logo wordmark, links, CTA buttons, mobile hamburger
  Hero.tsx            Above-the-fold — eyebrow, H1, body, 2 CTA buttons, product mock
  DashboardMock.tsx   Fake product screenshot — patient queue, bar chart, stats
  Features.tsx        6-col asymmetric grid of feature cards with Lucide icons
  SectionHeader.tsx   Reusable eyebrow + h2 + description block
  CTA.tsx             Bottom CTA section with card, eyebrow, h2, 2 buttons
  Footer.tsx          Logo wordmark, copyright with company name, Login + Create Account
  ContactModal.tsx    Popup contact form (see section 4)
```

### Critical copy rules
- **H1 must have a subject** — "Wound care management, seamlessly integrated" not "management software, seamlessly integrated" (fragment)
- **Eyebrow ≠ button label** — pill eyebrow in CTA should contextualize ("See it in action — 30 min"), not duplicate the button ("Schedule a Demo")
- **Footer copyright** must include company name: "© 2026 Acme Corp. All rights reserved."
- **Logo** must show wordmark text beside the icon mark — icon-only means users never learn the brand name

### Mobile nav — always implement a hamburger menu
```tsx
// Nav.tsx pattern
const [mobileOpen, setMobileOpen] = useState(false);

// Hamburger button (visible only below lg):
<button onClick={() => setMobileOpen(o => !o)} className="lg:hidden ...">
  {mobileOpen ? <X /> : <Menu />}
</button>

// Mobile drawer below the nav bar:
{mobileOpen && (
  <div className="lg:hidden absolute top-full left-4 right-4 mt-2 glass rounded-2xl py-4 px-6 flex flex-col">
    {links.map(l => <a onClick={() => setMobileOpen(false)} ...>{l.label}</a>)}
  </div>
)}
```

### Secondary (outline) button contrast — WCAG requirement
```tsx
// WRONG — 1.4:1 contrast, invisible on dark bg:
className="border-foreground/15"

// CORRECT — visible border, WCAG AA compliant:
className="border-foreground/40 text-foreground/80 hover:border-foreground/60 hover:text-foreground"
```

### Icons in feature cards — use Lucide, not emoji
```tsx
// WRONG — consumer-app feel, not B2B clinical:
icon: "✅"

// CORRECT — professional, scalable:
import { ShieldCheck } from "lucide-react";
<ShieldCheck className="w-5 h-5 text-primary" strokeWidth={1.5} />
```

---

## 4. Contact Form Popup

### Component: `src/components/landing/ContactModal.tsx`
- Built with shadcn/ui `Dialog` (or Radix primitives)
- Fields: First name, Last name, Work email, Organization, Phone, Message
- Three states: `idle` → `loading` → `success` / `error`
- On submit: POST to `/api/contact`; only show success after API returns 200

```tsx
const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle");

const handleSubmit = async (e) => {
  e.preventDefault();
  setStatus("loading");
  const res = await fetch("/api/contact", { method: "POST", ... });
  setStatus(res.ok ? "success" : "error");
};
```

### Wire to Nav, Hero, CTA
Each of these holds `const [open, setOpen] = useState(false)` and passes it to `<ContactModal open={open} onOpenChange={setOpen} />`. The "Contact Us" button calls `setOpen(true)`.

---

## 5. Transactional Email — Resend

### Setup
1. Create account at resend.com
2. Add and verify your domain (DNS TXT + MX records)
3. Get API key → `RESEND_API_KEY` in `.env`
4. Verified domain is required to send TO arbitrary email addresses (free tier restriction)

### API route: `api/contact.ts`
```ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

// Validate all fields server-side first, then:
await resend.emails.send({
  from: "noreply@yourdomain.com",    // must be your verified domain
  to: "you@yourdomain.com",
  reply_to: submitterEmail,
  subject: `New contact from ${firstName} ${lastName}`,
  html: `...escaped HTML email body...`,
});
```

### HTML escaping — always escape user input in email bodies
```ts
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
// Use escapeHtml(firstName) in the email template
```

### Also save to Supabase
After sending email, insert into `contact_submissions` table so you have a searchable record.

---

## 6. Supabase — Project Setup

### Create project
1. supabase.com → New project → pick region closest to users
2. Save: **Project URL** and **Anon key** (safe to expose) and **Service role key** (server-only, never expose)

### Install client
```bash
npm install @supabase/supabase-js
```

### `src/lib/supabase.ts` — client-side client (anon key only)
```ts
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Server-side client (service role key — in `/api/*.ts` only)
```ts
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.SUPABASE_URL!,         // NOT VITE_ prefixed for server vars
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**Rule:** `VITE_` prefix = bundled into client JS = visible to anyone. Never put secrets in `VITE_` vars.

---

## 7. Supabase — Database Tables & RLS

### Run in Supabase SQL Editor

```sql
-- Contact form submissions
create table contact_submissions (
  id uuid default gen_random_uuid() primary key,
  first_name text not null, last_name text not null,
  email text not null, organization text, phone text,
  message text not null, created_at timestamptz default now()
);
alter table contact_submissions enable row level security;
-- Admin-only read (use your email or a role claim):
create policy "Admin reads submissions" on contact_submissions
  for select using (auth.jwt() ->> 'email' = 'you@yourdomain.com');

-- File metadata
create table documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null, storage_path text not null,
  size integer, mime_type text, created_at timestamptz default now()
);
alter table documents enable row level security;
create policy "Users manage own documents" on documents
  for all using (auth.uid() = user_id);

-- Onboarding (one row per user)
create table onboarding (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  company_name text, role text, team_size text,
  ehr_system text, use_case text, how_heard text,
  created_at timestamptz default now()
);
alter table onboarding enable row level security;
create policy "Users manage own onboarding" on onboarding
  for all using (auth.uid() = user_id);

-- RAG knowledge base (requires pgvector extension)
create extension if not exists vector;
create table knowledge_chunks (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  embedding vector(1536),
  source text default 'document',
  document_id uuid references documents(id) on delete cascade,
  created_at timestamptz default now()
);
alter table knowledge_chunks enable row level security;
create policy "Users read own chunks" on knowledge_chunks
  for select using (
    document_id is null
    or document_id in (select id from documents where user_id = auth.uid())
  );
create policy "No direct insert" on knowledge_chunks for insert with check (false);
create policy "No direct delete" on knowledge_chunks for delete using (false);

create index on knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Vector similarity search function
create or replace function match_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  match_threshold float default 0.5
)
returns table (id uuid, content text, source text, similarity float)
language sql stable as $$
  select id, content, source,
    1 - (embedding <=> query_embedding) as similarity
  from knowledge_chunks
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding limit match_count;
$$;
```

### Storage bucket
1. Supabase → Storage → New bucket → name: `documents` → Private
2. Run this policy in SQL Editor:
```sql
create policy "Users manage own files" on storage.objects
  for all using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 8. Supabase — Auth (Sign Up / Sign In)

### Auth context: `src/contexts/AuthContext.tsx`
```tsx
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session); setUser(session?.user ?? null); setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => supabase.auth.signOut();
  return <AuthContext.Provider value={{ user, session, loading, signOut }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext)!;
```

### Protected route: `src/components/auth/ProtectedRoute.tsx`
```tsx
export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading…</div>;    // always wait for session check
  if (!user) return <Navigate to="/login" replace />;
  return children;
};
```

### Login page: `src/pages/Login.tsx`

Three visual states managed by `useState`:
```tsx
type Mode = "signin" | "signup" | "checkEmail";
const [mode, setMode] = useState<Mode>("signin");
```

**Sign up** — collect first name, last name, phone, email, password:
```tsx
const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

const { error } = await supabase.auth.signUp({
  email, password,
  options: {
    emailRedirectTo: `${SITE_URL}/auth/callback`,   // critical — must point to prod domain
    data: { first_name, last_name, phone, full_name: `${first_name} ${last_name}` }
  }
});
if (!error) setMode("checkEmail");
```

**"Check your email" state** — show the email address used, a resend button, and a back link:
```tsx
// Resend confirmation email:
await supabase.auth.resend({ type: "signup", email });
```

**Sign in** — handle "email not confirmed" error:
```tsx
if (error?.message?.includes("Email not confirmed")) {
  // Show resend option instead of generic error
}
```

---

## 9. Email Confirmation Flow

This is the most complex part. Every piece must be correct or it silently breaks.

### Supabase dashboard settings (Auth → URL Configuration)
| Setting | Value |
|---|---|
| Site URL | `https://yourdomain.com` |
| Redirect URLs | `https://yourdomain.com/auth/callback` |

### Auth callback page: `src/pages/AuthCallback.tsx`
```tsx
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) navigate("/dashboard", { replace: true });
    else navigate("/login?error=confirmation_failed", { replace: true });
  });
  return () => subscription.unsubscribe();
}, [navigate]);

return <div>Confirming your email…</div>;
```

### `vercel.json` — SPA rewrite (critical — without this, `/auth/callback` returns 404)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

### Supabase SMTP (for custom email delivery)
- Auth → Settings → SMTP
- Use Resend: host `smtp.resend.com:465`, user `resend`, password = your Resend API key
- From address must be your verified domain

### Checklist — if confirmation email link goes to wrong place
- [ ] `VITE_SITE_URL` is set to production URL in Vercel env vars
- [ ] `emailRedirectTo` explicitly passed in `signUp()` options
- [ ] `/auth/callback` added to Supabase Redirect URLs allowlist
- [ ] SPA rewrite rule in `vercel.json` (no `!api/` exclusion hole)
- [ ] Domain is `yourdomain.com` not `www.yourdomain.com` — must match exactly

---

## 10. Protected Dashboard

### `src/pages/Dashboard.tsx` — tab structure
```tsx
type Tab = "submissions" | "files" | "onboarding" | "ai";
const [tab, setTab] = useState<Tab>("submissions");
```

### Four dashboard tabs
| Tab | Component | What it does |
|---|---|---|
| Contact Submissions | `ContactSubmissions.tsx` | Reads `contact_submissions` table, expandable rows |
| Documents | `FileUpload.tsx` | Drag-and-drop upload, Supabase Storage, auto-embed |
| Onboarding | `OnboardingForm.tsx` | Collects org/role/team size, one row per user |
| AI Assistant | `ChatPanel.tsx` | Inline RAG chatbot |

### Sign-out
```tsx
const { signOut } = useAuth();
const handleSignOut = async () => { await signOut(); navigate("/"); };
```

---

## 11. File Upload + Supabase Storage

### Upload path pattern: `{user_id}/{timestamp}-{filename}`
This scopes files to each user's folder, which the storage RLS policy enforces.

### Upload flow in `FileUpload.tsx`
```tsx
const uploadFile = async (file: File) => {
  // 1. Enforce size limit client-side
  if (file.size > 10 * 1024 * 1024) { setError("Max 10MB"); return; }

  // 2. Upload to Storage
  const path = `${user.id}/${Date.now()}-${file.name}`;
  await supabase.storage.from("documents").upload(path, file, { upsert: false });

  // 3. Insert metadata row
  const { data: doc } = await supabase.from("documents").insert({
    user_id: user.id, name: file.name, storage_path: path,
    size: file.size, mime_type: file.type,
  }).select("*").single();

  // 4. Trigger embedding (for text files)
  await embedFile(file, doc.id);
};
```

### Download via signed URL (60-second expiry)
```tsx
const { data } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
if (data?.signedUrl) window.open(data.signedUrl, "_blank");
```

### Delete — remove chunks first, then storage, then DB row
```tsx
// ON DELETE CASCADE on knowledge_chunks handles chunks automatically
await supabase.storage.from("documents").remove([doc.storage_path]);
await supabase.from("documents").delete().eq("id", doc.id);
```

---

## 12. AI Chatbot with RAG

### Dependencies
```bash
npm install openai
```

### Architecture
```
User types message
  → /api/chat (POST { messages })
    → embed query with text-embedding-3-small
    → match_chunks() RPC (top 5 results, threshold 0.5)
    → inject chunks as system prompt context
    → gpt-4o-mini completion (max_tokens: 500)
  → return { reply }
```

### `api/chat.ts` — RAG endpoint
```ts
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req, res) {
  const { messages } = req.body ?? {};

  // Validate input (security — prevents prompt injection + cost attacks)
  const MAX_MESSAGES = 20;
  const safeMessages = messages
    .filter(m => ["user","assistant"].includes(m.role) && m.content?.length <= 2000)
    .slice(-MAX_MESSAGES);

  // Embed the last user message
  const lastUserMessage = safeMessages.filter(m => m.role === "user").pop()?.content ?? "";
  const embeddingRes = await openai.embeddings.create({
    model: "text-embedding-3-small", input: lastUserMessage,
  });

  // Retrieve relevant chunks
  const { data: chunks } = await supabase.rpc("match_chunks", {
    query_embedding: embeddingRes.data[0].embedding,
    match_count: 5, match_threshold: 0.5,
  });

  const context = chunks?.map(c => c.content).join("\n\n") ?? "";
  const systemPrompt = context
    ? `You are a helpful assistant. Use this context to answer:\n\n${context}`
    : "You are a helpful assistant.";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: systemPrompt }, ...safeMessages],
    max_tokens: 500,
  });

  res.status(200).json({ reply: completion.choices[0].message.content });
}
```

### `api/embed.ts` — chunk + embed text
```ts
function chunkText(text: string, size = 500, overlap = 50): string[] {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += size - overlap) {
    chunks.push(words.slice(i, i + size).join(" "));
  }
  return chunks.filter(c => c.trim().length > 20);
}
```

**Authenticate this endpoint** — only logged-in users should be able to embed:
```ts
const token = req.headers.authorization?.slice(7);
const { data: { user } } = await supabase.auth.getUser(token);
if (!user) return res.status(401).json({ error: "Unauthorized" });
// Also verify document_id belongs to this user before deleting old chunks
```

### Seed website content (one-time)
Create `scripts/seed-kb.mjs` that reads your marketing copy and posts it to `/api/embed` with `source: "website"`. Run once: `node scripts/seed-kb.mjs`.

### UI components
```
src/components/chat/
  ChatWidget.tsx     Floating bottom-right button + expandable panel (public landing page)
  ChatPanel.tsx      Inline tab in dashboard (authenticated users)
  ChatMessages.tsx   Shared message bubble UI (renders content as text, not innerHTML)
src/hooks/
  useChat.ts         Shared state + fetch logic
```

### ChatWidget sizing (mobile-safe)
```tsx
// Panel width — never overflow mobile viewport:
className="w-[min(340px,calc(100vw-3rem))] h-[480px]"
// Z-index — above nav (z-[55]) but accessible:
className="fixed bottom-6 right-6 z-[60]"
```

---

## 13. Auto-Embedding Uploaded Documents

After upload, `FileUpload.tsx` checks the file extension and embeds text-based files automatically:

```ts
const EMBEDDABLE_EXTENSIONS = new Set(["txt", "md", "markdown", "csv", "json"]);

const embedFile = async (file: File, documentId: string) => {
  if (!EMBEDDABLE_EXTENSIONS.has(file.name.split(".").pop()?.toLowerCase())) {
    toast.info("File saved — not indexed (PDF/image)");
    return;
  }
  setEmbeddingDocs(prev => ({ ...prev, [documentId]: true }));
  const text = await file.text();
  const { data: { session } } = await supabase.auth.getSession();
  await fetch("/api/embed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token}`,  // auth header
    },
    body: JSON.stringify({ text, source: file.name, document_id: documentId }),
  });
  setEmbeddingDocs(prev => { const n = {...prev}; delete n[documentId]; return n; });
};
```

---

## 14. Vercel Deployment

### `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

The rewrite rule says: "Send all requests to `index.html` EXCEPT anything starting with `/api/`". This makes React Router work for all routes including `/auth/callback` and `/dashboard`.

### Never put these in `vercel.json`
```json
// WRONG — causes build failures:
"functions": { "api/*.ts": { "runtime": "nodejs18.x" } }
// WRONG — causes install failures:
"devDependencies": { "vercel": "^x.x.x" }
```

### Environment variables in Vercel
Set every variable in: Vercel Dashboard → Project → Settings → Environment Variables

| Variable | Environments |
|---|---|
| `RESEND_API_KEY` | Production, Preview |
| `OPENAI_API_KEY` | Production, Preview |
| `VITE_SITE_URL` | Production (`https://yourdomain.com`) |
| `VITE_SUPABASE_URL` | All |
| `VITE_SUPABASE_ANON_KEY` | All |
| `SUPABASE_URL` | Production, Preview (server-only, no VITE_ prefix) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview (server-only) |

### `.gitignore` — before first commit
```
.env
.env.*
!.env.example
```

### `.env.example` — safe placeholder (commit this)
```
RESEND_API_KEY=your_resend_key_here
OPENAI_API_KEY=your_openai_key_here
VITE_SITE_URL=https://yourdomain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

## 15. Frontend Design Refresh

### Install the design skill
```bash
npx claude-code-templates@latest --skill creative-design/frontend-design
```

### Design direction process
1. Choose an aesthetic direction BEFORE writing code — commit fully
2. Ask: what makes this unforgettable? what's the one thing a visitor will remember?
3. For healthcare/B2B: "Warm Editorial Precision" — Cormorant Garamond serif + amber/gold palette
4. Replace cold generic palette (navy + teal + Inter) with something context-appropriate

### What to update for a full design refresh
| File | What changes |
|---|---|
| `src/index.css` | All CSS custom properties (colors, gradients, shadows), font imports, utility classes |
| `tailwind.config.ts` | Font families |
| Any component with hardcoded `hsl(...)` colors | Update to match new palette |
| `DashboardMock.tsx` | Hardcoded surface colors |

### Anti-patterns to avoid
- Inter / Roboto / Arial as display fonts
- Purple gradients (#6366f1 etc.) — screams generic SaaS
- `transition-all` — triggers layout recalc every frame; use `transition-[transform,opacity]`
- Centered body text longer than 2 lines — switch to left-align
- Emoji icons in B2B/clinical context — use Lucide React

---

## 16. UI/UX Audit Checklist

### Install the agent
```bash
npx claude-code-templates@latest --agent development-team/ui-ux-designer
```
Invoke by asking: "run the ui-ux-designer agent on this page."

### Pre-launch checklist (research-backed)
- [ ] **H1 has a subject** — not a fragment. Closed-eyes test: can someone read only the H1 and know what the product is?
- [ ] **Mobile navigation exists** — hamburger menu with full link set below lg breakpoint
- [ ] **Secondary buttons pass WCAG** — outline border at minimum `border-foreground/40` on dark backgrounds (3:1 contrast)
- [ ] **Brand name appears as text** — not just an icon mark; user needs to read and remember the name
- [ ] **No emoji in B2B UI** — replace with Lucide icons at `strokeWidth={1.5}`
- [ ] **Card density is consistent** — if 3 cards have bullets, all cards should have bullets
- [ ] **Eyebrow ≠ button label** — they should reinforce each other, not repeat
- [ ] **Footer copyright has company name** — "© 2026 Acme Inc. All rights reserved."
- [ ] **`focus-visible` styles** on all interactive elements (keyboard nav / WCAG 2.1 SC 2.4.7)
- [ ] **Chat widget z-index > nav z-index** — and panel width is mobile-safe (`min(340px, calc(100vw-3rem))`)
- [ ] **Body text ≤ 2 lines when centered** — longer paragraphs should be left-aligned
- [ ] **No `transition-all`** — animate only `transform` and `opacity`

---

## 17. Security Audit Checklist

### Install the agent
```bash
npx claude-code-templates@latest --agent security/security-auditor
```

### Pre-launch security checklist

**Secrets & credentials**
- [ ] `.env` in `.gitignore` before first `git add`
- [ ] No real keys in `.env.example`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` only in `/api/*.ts`, never in `src/`
- [ ] All production secrets set in Vercel, not in committed files

**API route security**
- [ ] Every route enforces HTTP method: `if (req.method !== "POST") return res.status(405)`
- [ ] `/api/embed` requires auth header: validate `Bearer {supabaseJWT}` before accepting text
- [ ] `/api/chat` validates message count (≤20) and length (≤2000 chars per message)
- [ ] `/api/chat` filters roles to only `"user"` and `"assistant"` (prevents system prompt injection)
- [ ] `/api/contact` has field length caps: message ≤5000 chars, names ≤100 chars
- [ ] All user input HTML-escaped before rendering in emails
- [ ] Error responses return generic messages, not raw `error.message` from DB/OpenAI

**Supabase RLS**
- [ ] RLS enabled on ALL tables (`contact_submissions`, `documents`, `onboarding`, `knowledge_chunks`)
- [ ] `contact_submissions` is admin-only read (not all authenticated users)
- [ ] `knowledge_chunks` has no direct insert/delete policy (server-only via service role)
- [ ] `ON DELETE CASCADE` handles chunk cleanup automatically when document is deleted
- [ ] Storage policy restricts each user to their own `{user_id}/` prefix

**File upload**
- [ ] 10MB size limit enforced client-side before upload
- [ ] Text length cap in `/api/embed` (500,000 chars max) prevents single $50+ embedding call
- [ ] `source` field sanitized — never allow user to set `source: "website"`

**Frontend**
- [ ] Chat messages rendered as text nodes, never `dangerouslySetInnerHTML`
- [ ] `ProtectedRoute` waits for `loading: false` before rendering or redirecting
- [ ] `focus-visible` styles on all interactive elements (accessibility + compliance)

**HTTP headers (add to `vercel.json`)**
```json
"headers": [{
  "source": "/(.*)",
  "headers": [
    { "key": "X-Frame-Options", "value": "DENY" },
    { "key": "X-Content-Type-Options", "value": "nosniff" },
    { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
  ]
}]
```

---

## 18. Claude Code Agent Setup

### Agents to install at project start
```bash
# Research-backed UI/UX critic — auto-invokes when reviewing design
npx claude-code-templates@latest --agent development-team/ui-ux-designer

# Security auditor — systematic vulnerability + compliance review
npx claude-code-templates@latest --agent security/security-auditor
```

Agents live in `.claude/agents/`. Claude invokes them automatically based on context, or you can ask directly: "run the security-auditor agent" / "audit the UI with the ui-ux-designer agent."

### Settings
```bash
# Context window usage bar in terminal statusline
npx claude-code-templates@latest --setting statusline/context-monitor
```

### Skills (invoked for active code generation)
```bash
# Distinctive frontend design — invoke before any major UI work
npx claude-code-templates@latest --skill creative-design/frontend-design
```

---

## 19. Environment Variables Reference

| Variable | Prefix | Used in | Secret? |
|---|---|---|---|
| `RESEND_API_KEY` | none | `api/contact.ts` | Yes |
| `OPENAI_API_KEY` | none | `api/chat.ts`, `api/embed.ts` | Yes |
| `VITE_SITE_URL` | `VITE_` | `src/pages/Login.tsx` (emailRedirectTo) | No |
| `VITE_SUPABASE_URL` | `VITE_` | `src/lib/supabase.ts` | No |
| `VITE_SUPABASE_ANON_KEY` | `VITE_` | `src/lib/supabase.ts` | No |
| `SUPABASE_URL` | none | `api/*.ts` (server client) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | none | `api/*.ts` (server client) | **Yes — bypasses RLS** |

**Rule:** `VITE_` prefix = compiled into client bundle = visible to any user. Never use it for secrets.

---

## 20. Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| Confirmation email links to `localhost` | `emailRedirectTo` not set or `VITE_SITE_URL` not in Vercel | Explicitly pass `emailRedirectTo: \`${SITE_URL}/auth/callback\`` in signUp; set `VITE_SITE_URL` in Vercel env vars |
| `/auth/callback` returns 404 on Vercel | No SPA rewrite rule | Add `rewrites` to `vercel.json` |
| Confirmation link goes to homepage `/#` | `emailRedirectTo` ignored | Check Supabase Site URL matches your domain exactly; add `/auth/callback` to Redirect URLs allowlist |
| Resend 403 "can't send to this address" | Free tier blocks non-account emails | Verify your domain in Resend; use your domain's email as the `to` address |
| OpenAI `insufficient_quota` | No billing credits | Add credits at platform.openai.com → Billing |
| `vercel.json` "Function Runtimes must have valid version" | Invalid `functions` block | Remove the `functions` key entirely from `vercel.json` |
| Vite dev server returns 404 for `/api/*` | Vite doesn't serve Vercel functions locally | Use `vercel dev` for local API testing, or deploy to preview branch |
| `dotenv` not found in seed script | Not installed | `npm install dotenv` then add `import 'dotenv/config'` to script |
| Secrets committed to git / push blocked | `.env` committed before `.gitignore` set up | `git rm --cached .env`, add to `.gitignore`, rotate all keys, bypass GitHub push protection via the provided URL |
| AI chatbot can't answer about uploaded docs | `knowledge_chunks` RLS blocks anon reads, or no chunks for doc type | Add RLS policy; check file type is embeddable (txt/md/csv/json) |
| `supabase.auth.onAuthStateChange` never fires | Component unmounted before event | Return the unsubscribe function from `useEffect` cleanup |

---

## Quick-Start Order (condensed)

```
Day 1:  Scaffold → Design system → Landing page components → Contact form popup
Day 2:  Resend email → Supabase project + tables + RLS + storage bucket
Day 3:  Supabase auth → Login page → Email confirmation flow → Protected dashboard
Day 4:  File upload → AI chatbot (embed API + chat API + UI components) → Seed KB
Day 5:  Vercel deploy → env vars → domain config → smoke test full flow
Day 6:  Frontend design refresh (skill) → UI/UX audit (agent) → implement fixes
Day 7:  Security audit (agent) → implement critical fixes → launch
```
