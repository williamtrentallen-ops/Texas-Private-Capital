# Texas Private Capital — build brief

You are building **Texas Private Capital**, a news and intelligence platform for Texas private markets: a source-backed weekly publication plus searchable GP and LP research and connection tools for GPs, LPs and business owners. Use Axial as inspiration for investor discovery and matching; do not copy its branding, wording, layouts or assets.

This file is the plan. Read it fully before touching code, and re-read the relevant phase before starting it. Work one phase at a time, show me the diff before committing, and stop and ask when a decision in "Open decisions" blocks you.

## What already exists

`texas-private-capital.html` in this folder is a working single-file prototype. **It is the design and behavior spec.** Preserve its visual design, pages, routes, filters, matching rules, admin workflow and copy unless I ask for a change. Specifically keep:

- Brand: logo embedded in the header (never redraw, crop or restyle it); palette built from the logo — navy `#072651`, red `#AE1E31`, white, cool grays. Serif headings (Source Serif 4), sans UI (Source Sans 3). Near-square corners, hairline borders, no shadows except floating bars, no decorative icons or stock imagery.
- Pages: Home, News (+ article), Deals (+ deal), GPs (directory with top filter bar, profile cards, table, compare up to 3, "GP seeking LPs" tab), GP profile (header card, stat strip, tabs: Overview / Criteria / Funds / Past deals / News / Management / Sources), LPs (+ profile, "LP seeking GPs" tab), Business Owners (deal matching with "Express interest"), Fundraising, Newsletter, Saved Lists, Pricing, How it works, Admin (research queue, change history, corrections, connection requests, subscribers, integrations, pricing).
- Navigation: utility strip (Texas Private Capital, How it works, Saved Lists, Plans, plan indicator, Research admin) above a main bar with dropdowns for News (recent headlines + browse), GPs (GP finder by type and city), Fundraising (recent closes), plus Deals, LPs, Business Owners and a Newsletter button.
- Matching rules: weighted, transparent, shown on the page. Undisclosed criteria earn 0 and are listed as "missing information"; exclusions and paused mandates are "conflicts"; the score is a share of stated criteria and is never described as a probability of closing or of an introduction.
- Per-field source status on every profile: `confirmed` (firm-confirmed), `public`, `inferred`, `nd` (not disclosed). A confirmed field never implies the whole profile is verified. LP interests are only ever `direct` (provided by the LP) or `public`; nothing about LPs is inferred.
- Positioning copy: "Know what's happening in Texas private capital — and find the right people to move your next deal forward." / "Texas Private Capital tracks deals, funds, and firms across the state, then helps GPs, LPs, and business owners find relevant connections."

## Non-negotiable rules

1. **Never invent data.** No real-sounding firms, people, deals, quotes, LP preferences or criteria that are not in a source. Sample data stays fictional, uses `.example.com` domains, and is labeled.
2. **Agents propose, humans publish.** No automated job writes to live `firms`, `people`, `lps`, `deals` or `news` tables. Everything goes to `research_queue` and is applied only through the admin approve action, which also writes `change_history`.
3. **Every extracted field carries a verbatim source passage, source URL and retrieval date, or it is dropped.**
4. **An inaccessible or changed page never erases existing data.** Log the failure, keep the record.
5. **Confidential inputs stay private.** Business-owner company details and connection-request notes are visible only to admins. Never render them on public pages or include them in client bundles.
6. **No guarantees language.** Every connection, matching and newsletter surface says requests are not guaranteed introductions or fundraising outcomes.
7. **Secrets live in `.env.local` and Vercel env vars.** Never print, commit or ask me to paste a key into chat. Reference variable names only.
8. **Design discipline.** Reuse existing tokens and components. Do not add gradients, rounded cards, shadows, icons or illustrations. If something looks like a template, simplify it.

## Target stack

- Next.js (App Router, TypeScript), deployed on Vercel. Tailwind is fine but keep the existing CSS variables as the single source of design tokens.
- Supabase: Postgres, Auth (email magic link), Row Level Security, Storage not needed yet.
- Jobs: Vercel Cron hitting route handlers in `/app/api/jobs/*`, each idempotent and safe to re-run.
- Integrations (all optional, each with a clearly labeled "not configured" state in Admin → Integrations):
  - Search: `TAVILY_API_KEY` (or `EXA_API_KEY`)
  - Page reading: `FIRECRAWL_API_KEY` (or Jina Reader, no key)
  - Extraction model: `ANTHROPIC_API_KEY` (use a small, cheap model for extraction; a stronger one for the weekly draft)
  - Email: `RESEND_API_KEY`
  - Payments: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## Data model

Create these tables with migrations in `/supabase/migrations`. Every table has `id uuid`, `created_at`, `updated_at`. Fields marked † have a companion `*_status` column with values `confirmed | public | inferred | nd` and a `*_source_id`.

- `firms`: name, slug, type (`pe|fo|is`), hq_city, offices text[], website, domain, founded, overview, industries text[], subsectors text[], ebitda_min †, ebitda_max †, check_min †, check_max †, control text[] †, deal_types text[] †, capital_model (`committed|family|deal_by_deal`) †, current_fund_name, current_fund_size_m, current_fund_vintage, backs_sponsors bool † (nullable = nd), sponsor_first_time bool †, sponsor_role †, sponsor_equity †, geography text[] †, exclusions text[] †, priorities †, mandate_status (`active|selective|paused`), confirmed_at, last_updated_at, is_sample bool default false
- `people`: firm_id, name, title, email, phone, coverage text[], status, source_id, is_sample
- `portfolio_companies`: firm_id, name, sector, city, acquired_year, status (`current|exited`), source_id
- `transactions`: firm_id, date, type (`platform|add_on|exit|recap`), target, sector, city, buyer, seller, status (`announced|signed|closed`), summary, source_id
- `sources`: url, label, retrieved_at, raw_text (nullable), supports text[] (field names), firm_id nullable, lp_id nullable
- `change_history`: entity_type, entity_id, field, old_value, new_value, source_id, decided_by, decision (`approved|rejected`), decided_at
- `research_queue`: entity_type, entity_id nullable, candidate_name, stage (`discover|collect|extract|review|publish|error`), status_text, source_url, retrieved_at, proposals jsonb (array of {field, old, new, passage}), flags text[], error bool
- `lps`: name, slug, type, city, website, overview, strategies text[], sectors text[], fund_size_min_m, fund_size_max_m, geography, emerging_managers bool nullable, provenance (`direct|public`), confirmed_at, contact_title, contact_email, is_sample
- `lp_activity`: lp_id, date, text, source_id
- `news`: slug, headline, date, type (`deal|fundraise|people|gp_update`), firm_id, city, sector, summary, reported (facts), commentary, source_id, published bool
- `deals`: slug, date, type, headline, firm_id, company, sector, city, buyer, seller, status, summary, source_id, published bool
- `profiles` (users): user_id, role (`user|admin`), plan (`free|pro|team`), stripe_customer_id
- `saved_firms`, `lists`, `list_items` (with note), `alerts` (firm_id, sector, city, event_type), `deal_matches` (criteria jsonb, results jsonb)
- `connection_requests`: user_id nullable, target_type (`gp|lp`), target_id, requester_role, org, name, email, criteria, confidential_notes, status (`received|reviewed|declined`). RLS: insert by anyone, select by admins only.
- `subscribers`: email unique, topics text[], confirmed bool, confirmed_at, unsubscribed_at
- `site_settings`: key, value jsonb (pricing, page copy, feature flags)

RLS: public read on `firms`, `people` (paid only for email/phone — enforce via a view), `portfolio_companies`, `transactions`, `sources`, `lps`, `lp_activity`, published `news` and `deals`. User-owned rows readable/writable by owner. Admin-only on `research_queue`, `change_history`, `connection_requests`, `subscribers`, `site_settings` writes.

## Phases

### Phase 1 — Convert the prototype (no behavior change)
1. Scaffold Next.js + TypeScript in this folder. Move the prototype's CSS into `/styles/tokens.css` and `/styles/app.css`. Keep the font links.
2. Recreate every route from the prototype's hash router as a real route (`/news/[slug]`, `/gps/[slug]`, `/deals/[slug]`, `/lps/[slug]`, etc.). Build components per page under `/components`.
3. Move all sample data out of the script into `/data/*.json`, generated by the same deterministic logic so it matches the prototype. Mark every record `is_sample: true`.
4. Keep localStorage persistence for now.
5. Verify: run locally, open every page side by side with the HTML file, and list any visual or functional difference. Fix them before committing.

### Phase 2 — Deploy
1. Initialize git, commit, push to GitHub.
2. Tell me the exact steps to connect the repo in Vercel and add the domain. Do not do anything that requires my credentials.

### Phase 3 — Database and auth
1. Write migrations for the data model above. Write `scripts/seed.ts` that loads `/data/*.json`.
2. Replace localStorage with Supabase queries via a thin data layer in `/lib/db`. Keep a read-only in-memory fallback so the site still renders sample data if the database is unreachable, with a visible notice.
3. Add Supabase Auth (magic link). Gate contacts, exports, matching and alerts on `profiles.plan`, enforced in server components and route handlers, not just the UI. Admin routes require `profiles.role = 'admin'`.
4. Make Admin → Pricing and page copy edit `site_settings`.
5. Verify with a checklist: anonymous user, free user, paid user, admin — what each can see and do.

### Phase 4 — Research agents
Implement under `/app/api/jobs/*`, each callable manually from Admin → Research queue with a "Run now" button, and on Vercel Cron weekly.
1. `discover`: search for Texas PE firms, family offices with direct investing, independent sponsors, and fund closes; dedupe against `firms` by normalized name and domain (string similarity threshold 0.9; between 0.6 and 0.9 → flag "possible duplicate" for review). Insert candidates into `research_queue` at stage `discover`.
2. `collect`: for each firm with a website, fetch likely criteria/team/portfolio/news pages (respect robots.txt, 1 request/second per domain, custom User-Agent naming the site). Store raw text in `sources` with `retrieved_at`. On HTTP error or empty page: write a queue item at stage `error` with the message and leave existing records untouched.
3. `extract`: call the model with a strict JSON schema mirroring the `firms`/`people`/`transactions` fields. The system prompt requires a verbatim `passage` for every value and `null` when not found. Drop any value without a passage. Default status to `public`; never set `confirmed` from a crawl.
4. `review`: compare proposals to current values; mark `conflict` when a confirmed field would change, `unsupported` when passage text does not appear in the fetched page, `duplicate` per step 1. Set stage `review`.
5. Admin approve applies the proposal, sets the field status, links the source, writes `change_history`, and bumps `last_updated_at`. Reject writes `change_history` with decision `rejected`.
6. Test on five firms I name before scheduling. Show me the proposals; we tune the prompt until passages are reliable.

### Phase 5 — Newsletter and connection requests
1. Resend: double opt-in on signup; unsubscribe link; `subscribers.confirmed` gate. Admin page to compose the weekly issue from published `news` and `deals` (select items, auto-draft an intro with the model, I edit, preview, send). Store each issue.
2. Connection requests: admin review list with status changes and a reply template. Email the admin on each new request. Public pages show "received" state only.

### Phase 6 — Payments
Stripe Checkout for Pro and Team; webhook updates `profiles.plan`; customer portal link for cancel/upgrade. Remove the demo upgrade modal and plan toggle.

### Phase 7 — Launch checks
Privacy notice and terms pages; cookie-free analytics (Plausible or Vercel Analytics); 404 and error pages in the house style; Lighthouse pass on mobile; sitemap and metadata for news and profiles; a `README.md` for operating the admin.

## Working agreements

- Before each phase, restate the plan for that phase in a few lines and wait for my go.
- Write tests for the matching functions, the extraction validator (passage must appear in source), and RLS policies.
- Prefer small commits with clear messages. Use a branch per phase; I review the Vercel preview before merge.
- When unsure whether something is a design change, ask; when sure it is a bug, fix it and tell me.

## Open decisions (ask me when you reach them)

- Treat Dallas and Fort Worth as one DFW region or two cities in filters?
- Weekly newsletter day and send time.
- Which five firms to test the agents on first.
- Whether LP contact emails are ever shown publicly (default: organizational addresses only, paid plan, never personal).
