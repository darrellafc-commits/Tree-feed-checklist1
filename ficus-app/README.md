# Ficus Nitida Feeding Tracker

Field-ready web app for logging weekly feeding visits on the Ficus programme and generating client reports.

---

## Quick deploy to Vercel (15 minutes, no coding)

You'll need free accounts on two services: **GitHub** and **Vercel**. That's it.

### Step 1 — Put the project on GitHub (5 min)

1. Sign up at [github.com](https://github.com) if you don't have an account
2. Click the **+** icon (top right) → **New repository**
3. Name it something like `ficus-tracker`. Leave everything else as-is. Click **Create repository**
4. On the next page you'll see "uploading an existing file" — click that link (or drag-and-drop)
5. Drag **every file and folder from this project** into the upload box (the whole folder contents, not the outer folder itself)
6. Scroll down, click **Commit changes**

That's your code on GitHub. Done.

### Step 2 — Deploy to Vercel (5 min)

1. Go to [vercel.com](https://vercel.com) and click **Sign Up**
2. Choose **Continue with GitHub** — this links the two accounts
3. Once in, click **Add New...** → **Project**
4. You'll see your `ficus-tracker` repo — click **Import**
5. Leave all the settings alone (Vercel auto-detects Vite). Click **Deploy**
6. Wait ~60 seconds. When it's done you get a URL like `ficus-tracker-abc123.vercel.app`

That's your live app. Open it on your phone, bookmark it, share the link with your crew.

### Step 3 — (Optional) Custom domain (5 min)

In Vercel: Project → **Settings** → **Domains** → add any domain you own. Or buy one on Vercel for about $15/year.

---

## Adding to home screen (makes it feel like a real app)

**iPhone:** Open the URL in Safari → tap **Share** → **Add to Home Screen** → **Add**

**Android:** Open in Chrome → tap the **⋮** menu → **Install app** (or **Add to Home screen**)

Launches full-screen with no browser bars, same as any other app.

---

## Updating the app later

If you want to change anything — new trees, different dates, tweaks to the styling — edit `src/App.jsx` on GitHub (click the pencil icon on any file on github.com) and commit. Vercel redeploys automatically within ~60 seconds. No command line needed.

For bigger changes, ask Claude to make them and paste the new file back into GitHub.

---

## What's inside

- **React + Vite + Tailwind** — standard modern web stack
- **Supabase backend** — Postgres database, already configured (credentials in `src/App.jsx`)
- **lucide-react** — the icon set
- Single-page app, no routing library needed

---

## Running locally (optional, for developers)

If you're comfortable with the command line:

```bash
npm install
npm run dev
```

Then visit `http://localhost:5173` in your browser.

---

## Database setup reminder

The Supabase project needs these tables (run once in the SQL Editor):

```sql
create table if not exists visits (
  date text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table visits enable row level security;

create policy "allow_all_visits_read"   on visits for select using (true);
create policy "allow_all_visits_write"  on visits for insert with check (true);
create policy "allow_all_visits_update" on visits for update using (true) with check (true);

alter publication supabase_realtime add table visits;
```

If you've already done this, skip it.
