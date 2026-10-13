'use client';
// Research administration. Demo mode: not access-protected until auth lands (Phase 3).
import Link from 'next/link';
import { useRef } from 'react';
import { csv, download, fmtDate } from '@/lib/format';
import { firmHref } from '@/lib/routes';
import { firm, queue, render, S, save, toast, useStore } from '@/lib/store';
import type { Firm, QueueItem } from '@/lib/types';

const STAGES: [string, string][] = [['discover', 'Discover'], ['collect', 'Collect'], ['extract', 'Extract'], ['review', 'Review exceptions'], ['publish', 'Publish'], ['history', 'Change history']];
const STAGE_NOTE: Record<string, string> = { discover: 'Candidate firms from announcements and search', collect: 'Public pages retrieved with dates', extract: 'Standardized fields with source passages', review: 'Duplicates, conflicts, unsupported claims', publish: 'Approved updates applied', history: 'Every published change retained' };
const FIELD_MAP: Record<string, 'eb' | 'chk' | 'prio'> = { 'Target EBITDA': 'eb', 'Equity check': 'chk', 'Current priorities': 'prio' };
const today = () => new Date().toISOString().slice(0, 10);

/** Apply a reviewed proposal to the firm, retain it in history and mark the item published. */
function approve(it: QueueItem) {
  const ov: Partial<Firm> = S.overrides[it.firm!] || {};
  const f = firm(it.firm!)!;
  ov.fs = { ...f.fs };
  it.changes.forEach((c) => {
    const k = FIELD_MAP[c.field];
    if (k === 'eb' || k === 'chk') {
      const m = c.new.match(/\$([\d.]+)M\s*–\s*\$([\d.]+)M/);
      if (m) ov[k] = [+m[1], +m[2]];
    } else if (k === 'prio') ov.prio = c.new;
    if (k) ov.fs![k] = 'public';
    S.history.push({ date: new Date().toISOString(), firm: it.firm!, field: c.field, old: c.old, new: c.new, url: it.url, retrieved: it.retrieved, decision: 'Approved' });
  });
  ov.updated = it.retrieved;
  S.overrides[it.firm!] = ov;
  it.stage = 'publish';
  it.status = 'Published ' + fmtDate(new Date());
  it.changes = [];
  save(); render(); toast('Changes published');
}

function reject(Q: QueueItem[], it: QueueItem) {
  it.changes.forEach((c) => S.history.push({ date: new Date().toISOString(), firm: it.firm!, field: c.field, old: c.old, new: c.new, url: it.url, retrieved: it.retrieved, decision: 'Rejected' }));
  S.queue = Q.filter((x) => x.id !== it.id);
  save(); render(); toast('Rejected — existing record unchanged');
}

function QueueTab({ Q }: { Q: QueueItem[] }) {
  const counts = (k: string) => (k === 'history' ? S.history.length : Q.filter((x) => x.stage === k).length);
  return (
    <>
      <div className="pipe">{STAGES.map(([k, l], i) => <div className="st" key={k}><span className="k">{i + 1}</span><b>{l}</b><div className="n">{counts(k)}</div><div className="muted">{STAGE_NOTE[k]}</div></div>)}</div>
      {Q.map((item) => {
        const f = item.firm ? firm(item.firm) : null;
        const warn = (x: string) => x.startsWith('Conflict') || x.startsWith('Inaccessible') || x.startsWith('Unsupported');
        return (
          <div className="card" style={{ marginBottom: 12, ...(item.error ? { borderColor: 'var(--red)' } : {}) }} key={item.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><span className="tag">{STAGES.find((s) => s[0] === item.stage)![1]}</span> <b>{f ? f.name : item.candidate}</b><div className="muted">{item.status}</div><div className="muted">Source: <a href={item.url} target="_blank" rel="noopener">{item.url}</a> · retrieved {fmtDate(item.retrieved)}</div></div>
              {item.stage === 'review' && item.changes.length ? (
                <div className="row"><button className="btn sm green" onClick={() => approve(item)}>Approve &amp; publish</button><button className="btn sm" onClick={() => reject(Q, item)}>Reject</button></div>
              ) : item.stage === 'discover' ? (
                <div className="row">
                  {item.flags.some((x) => x.startsWith('Duplicate'))
                    ? <button className="btn sm" onClick={() => { S.queue = Q.filter((x) => x.id !== item.id); save(); render(); toast('Merged into existing record'); }}>Merge into existing</button>
                    : <button className="btn sm" onClick={() => { item.stage = 'collect'; item.status = 'Demo mode: collection simulated — no live retrieval without SEARCH_API_KEY / EXTRACTION_API_KEY'; save(); render(); }}>Start collection</button>}
                  <button className="btn sm ghost" onClick={() => reject(Q, item)}>Dismiss</button>
                </div>
              ) : item.error ? (
                <button className="btn sm" onClick={() => { item.status = 'Retry queued (demo) — existing record retained'; item.retrieved = today(); save(); render(); toast('Retry queued'); }}>Retry retrieval</button>
              ) : null}
            </div>
            {item.changes.length ? (
              <div style={{ marginTop: 10 }}><h4 style={{ marginBottom: 6 }}>Proposed changes</h4>
                <div className="diff"><div className="r"><div>Field</div><div>Current</div><div>Proposed</div></div>{item.changes.map((c) => <div className="r" key={c.field}><div>{c.field}</div><div className="old">{c.old}</div><div className="new">{c.new}</div></div>)}</div>
                {item.changes.map((c) => <div className="quote" key={c.field}>“{c.passage}” <span className="muted" style={{ fontStyle: 'normal' }}>— source passage for {c.field}</span></div>)}
              </div>
            ) : null}
            {item.flags.length ? <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13.5 }}>{item.flags.map((x) => <li key={x} className={warn(x) ? 'warn' : ''}>{x}</li>)}</ul> : null}
          </div>
        );
      })}
      {Q.length ? null : <div className="empty"><b>Queue is empty</b>Run discovery to find candidate firms.</div>}
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn sm" id="runDiscovery" onClick={() => {
          Q.push({ id: 'rq' + Date.now(), stage: 'discover', firm: null, candidate: 'Caprock Capital Partners (candidate, Austin)', url: 'https://news.example.org/caprock-capital-first-close', retrieved: today(), status: 'Demo discovery: candidate found in fictional announcement', changes: [], flags: ['No duplicate found among existing records.'] });
          save(); render(); toast('Demo discovery added one candidate');
        }}>Run discovery (demo)</button>
        <button className="btn sm ghost" id="resetQueue" onClick={() => { S.queue = null; save(); render(); }}>Reset demo queue</button>
      </div>
    </>
  );
}

function PricingTab() {
  const ref = useRef<HTMLDivElement>(null);
  const p = S.pricing;
  const val = (id: string) => +(ref.current!.querySelector(id) as HTMLInputElement).value || 0;
  return (
    <div className="card" style={{ maxWidth: 420 }} ref={ref}><h3>Edit pricing</h3>
      <div className="field"><label className="lbl">Free ($/month)</label><input className="input" type="number" id="pFree" defaultValue={p.free} /></div>
      <div className="field"><label className="lbl">Professional ($/user/month)</label><input className="input" type="number" id="pPro" defaultValue={p.pro} /></div>
      <div className="field"><label className="lbl">Team ($/month, 5 users)</label><input className="input" type="number" id="pTeam" defaultValue={p.team} /></div>
      <button className="btn primary" id="savePricing" onClick={() => { S.pricing = { free: val('#pFree'), pro: val('#pPro'), team: val('#pTeam') }; save(); toast('Pricing saved'); }}>Save pricing</button>
    </div>
  );
}

const Integration = ({ name, desc, env }: { name: string; desc: string; env: string }) => (
  <div className="card">
    <div className="row" style={{ justifyContent: 'space-between' }}><h3 style={{ margin: 0 }}>{name}</h3><span className="status">Demonstration</span></div>
    <p className="muted" style={{ marginTop: 6 }}>{desc}</p>
    <div className="muted">Configure: <code>{env}</code></div>
  </div>
);

export default function Admin() {
  const { ui } = useStore();
  const Q = queue();
  const tabs: [string, string][] = [['queue', 'Research queue'], ['history', `Change history (${S.history.length})`], ['corrections', `Corrections (${S.corrections.filter((c) => c.status === 'open').length})`], ['requests', `Connection requests (${S.requests.filter((x) => x.status === 'received').length})`], ['subscribers', `Subscribers (${S.subscribers.length})`], ['integrations', 'Integrations'], ['pricing', 'Pricing']];
  const tab = ui.adminTab;
  let body: React.ReactNode;
  if (tab === 'queue') body = <QueueTab Q={Q} />;
  else if (tab === 'history') {
    body = S.history.length ? (
      <div className="tbl-wrap"><table className="tbl"><thead><tr><th className="ns">When</th><th className="ns">Firm</th><th className="ns">Field</th><th className="ns">From</th><th className="ns">To</th><th className="ns">Source</th><th className="ns">Decision</th></tr></thead>
        <tbody>{[...S.history].reverse().map((h, i) => (
          <tr key={i}><td className="nowrap">{fmtDate(h.date.slice(0, 10))}</td><td><Link href={firmHref(h.firm)}>{firm(h.firm)?.name || h.firm}</Link></td><td>{h.field}</td><td className="muted">{h.old}</td><td>{h.new}</td><td className="muted"><a href={h.url} target="_blank" rel="noopener">page</a> · {fmtDate(h.retrieved)}</td><td>{h.decision}</td></tr>
        ))}</tbody></table></div>
    ) : <div className="empty"><b>No published changes yet</b>Approve an item in the research queue to see it here.</div>;
  } else if (tab === 'corrections') {
    body = S.corrections.length ? S.corrections.map((c) => (
      <div className="card" style={{ marginBottom: 10 }} key={c.id}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><b>{firm(c.firm)?.name}</b> · {c.field} <span className={`tag ${c.status === 'open' ? 'selective' : 'active'}`}>{c.status}</span><div className="muted">{fmtDate(c.date.slice(0, 10))}{c.url ? <> · <a href={c.url} target="_blank" rel="noopener">source</a></> : null}</div></div>
          {c.status === 'open' ? <button className="btn xs" onClick={() => { c.status = 'resolved'; save(); render(); }}>Mark resolved</button> : null}
        </div>
        <p style={{ margin: '8px 0 0' }}>{c.text}</p>
      </div>
    )) : <div className="empty"><b>No correction reports</b>Users can report corrections from any firm profile.</div>;
  } else if (tab === 'requests') {
    // Confidential notes are shown here, to the review team only, never on public pages.
    body = S.requests.length ? [...S.requests].reverse().map((q) => (
      <div className="card" style={{ marginBottom: 10 }} key={q.id}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><b>{q.name}</b> ({q.role}{q.org ? ', ' + q.org : ''}) → {q.targetName} <span className={`tag ${q.status === 'received' ? 'selective' : 'active'}`}>{q.status}</span><div className="muted">{fmtDate(q.date.slice(0, 10))} · <a href={`mailto:${q.email}`}>{q.email}</a></div></div>
          {q.status === 'received' ? <div className="row"><button className="btn xs" onClick={() => { q.status = 'reviewed'; save(); render(); }}>Mark reviewed</button><button className="btn xs" onClick={() => { q.status = 'declined'; save(); render(); }}>Decline</button></div> : null}
        </div>
        {q.criteria ? <p style={{ margin: '8px 0 0' }}><b>Criteria:</b> {q.criteria}</p> : null}
        {q.confidential ? <p style={{ margin: '6px 0 0' }}><b>Confidential (review team only):</b> {q.confidential}</p> : null}
      </div>
    )) : <div className="empty"><b>No connection requests yet</b>Requests from GPs, LPs and business owners appear here for review. Confidential details are never shown publicly.</div>;
  } else if (tab === 'subscribers') {
    body = S.subscribers.length ? (
      <>
        <div className="row" style={{ marginBottom: 10 }}><button className="btn sm" id="subExport" onClick={() => { download('subscribers.csv', csv([['Email', 'Signed up'], ...S.subscribers.map((x) => [x.email, x.date])])); toast('Exported'); }}>Export CSV</button><span className="muted">Delivery is not active until an email provider is connected.</span></div>
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th className="ns">Email</th><th className="ns">Signed up</th></tr></thead><tbody>{S.subscribers.map((x) => <tr key={x.email}><td>{x.email}</td><td>{fmtDate(x.date.slice(0, 10))}</td></tr>)}</tbody></table></div>
      </>
    ) : <div className="empty"><b>No subscribers yet</b>Signups from the homepage and newsletter page appear here.</div>;
  } else if (tab === 'integrations') {
    body = (
      <>
        <div className="note" style={{ marginBottom: 14 }}>No credentials are configured in this deployment, so every integration below runs in demonstration mode with fictional data. Nothing is fetched from the public internet and no payments are processed.</div>
        <div className="integr">
          <Integration name="Web search" desc="Discovers candidate firms and announcements." env="SEARCH_API_KEY" />
          <Integration name="Website extraction" desc="Retrieves public firm pages and stores retrieval dates; a failed page never erases existing fields." env="EXTRACTION_API_KEY" />
          <Integration name="AI model" desc="Extracts standardized fields and must cite a source passage for each proposed value." env="MODEL_API_KEY" />
          <Integration name="Database" desc="Persists firms, people, criteria, mandates, transactions, sources and saved lists." env="DATABASE_URL (fallback: browser localStorage, in use)" />
          <Integration name="Authentication" desc="Protects the admin workspace and user-specific data." env="AUTH_PROVIDER" />
          <Integration name="Payments" desc="Processes plan upgrades." env="PAYMENTS_API_KEY" />
          <Integration name="Email delivery" desc="Sends the weekly briefing to collected subscribers." env="EMAIL_PROVIDER_API_KEY (e.g. Resend, Postmark)" />
        </div>
        <h3 style={{ margin: '20px 0 8px' }}>Data model</h3>
        <p className="muted">firms → people, investment_criteria (per-field source status), mandates (dated, confirmed_at), transactions, sources (url, retrieved_at, supports[]), change_history; users → saved_firms, lists, list_notes, alerts, deal_matches.</p>
      </>
    );
  } else body = <PricingTab />;

  return (
    <>
      <div className="page-head"><div><h1>Research administration</h1><p>Workflow for discovering firms, extracting fields with sources, routing exceptions and publishing approved changes. <span className="tag demo">Demo mode — admin is not access-protected until authentication is connected</span></p></div></div>
      <div className="tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} data-tab={k} onClick={() => { ui.adminTab = k; render(); }}>{l}</button>)}</div>
      {body}
    </>
  );
}
