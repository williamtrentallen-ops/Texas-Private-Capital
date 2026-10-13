'use client';
// Modal flows shared by several pages: upgrade gate, add to list, report a
// correction, request a connection, and newsletter signup.
import Link from 'next/link';
import { useRef, useState } from 'react';
import { closeModal, firm, isPaid, modal, render, S, save, toast } from '@/lib/store';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Paid-plan gate: true when the feature may run, otherwise opens the upgrade modal. */
export function gate(feature: string): boolean {
  if (isPaid()) return true;
  showUpgrade(feature);
  return false;
}

export function showUpgrade(feature: string): void {
  modal(
    <>
      <span className="tag demo">Demonstration upgrade flow</span>
      <h2 style={{ marginTop: 8 }}>{feature} is part of the paid plan</h2>
      <p className="muted">Paid plans include detailed investment criteria, contacts, deal matching, CSV exports and alerts. No payment is processed in this demo; the button below switches this browser to the paid plan so you can try every feature.</p>
      <div className="note">To take real payments, connect a payment provider in Admin → Integrations. Until then this flow is labeled as a demonstration.</div>
      <div className="acts">
        <Link className="btn" href="/pricing" onClick={closeModal}>See pricing</Link>
        <button className="btn green" onClick={() => { S.plan = 'paid'; save(); closeModal(); render(); toast('Demo: switched to paid plan'); }}>Unlock in demo mode</button>
      </div>
    </>,
  );
}

function AddToList({ ids }: { ids: string[] }) {
  const sel = useRef<HTMLSelectElement>(null);
  const nw = useRef<HTMLInputElement>(null);
  const done = (l: (typeof S.lists)[number]) => {
    ids.forEach((id) => { if (!l.firms.includes(id)) l.firms.push(id); });
    save(); closeModal(); render(); toast(`Added to "${l.name}"`);
  };
  return (
    <>
      <h2>Add to list</h2>
      <p className="muted">{ids.length} firm{ids.length > 1 ? 's' : ''} selected.</p>
      {S.lists.length ? (
        <>
          <div className="field"><label className="lbl">Existing list</label>
            <select className="input" ref={sel}>{S.lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.firms.length})</option>)}</select>
          </div>
          <div className="acts" style={{ justifyContent: 'flex-start' }}><button className="btn primary" onClick={() => done(S.lists.find((l) => l.id === sel.current!.value)!)}>Add to selected list</button></div>
          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '14px 0' }} />
        </>
      ) : null}
      <div className="field"><label className="lbl">New list name</label><input className="input" ref={nw} placeholder="e.g. Industrial services buyers" /></div>
      <div className="acts">
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn primary" onClick={() => {
          const n = nw.current!.value.trim();
          if (!n) return toast('Enter a list name');
          const l = { id: 'l' + Date.now(), name: n, firms: [] as string[], created: new Date().toISOString() };
          S.lists.push(l);
          done(l);
        }}>Create list and add</button>
      </div>
    </>
  );
}
export const addToListUI = (ids: string | string[]) => modal(<AddToList ids={([] as string[]).concat(ids)} />);

function ReportCorrection({ id }: { id: string }) {
  const f = firm(id)!;
  const fld = useRef<HTMLSelectElement>(null), txt = useRef<HTMLTextAreaElement>(null), url = useRef<HTMLInputElement>(null);
  return (
    <>
      <h2>Report a correction</h2>
      <p className="muted">For {f.name}. Reports are queued for the research team and shown in Admin → Corrections.</p>
      <div className="field"><label className="lbl">Which field?</label><select className="input" ref={fld}><option>Investment criteria</option><option>Team / contacts</option><option>Portfolio / transactions</option><option>Capital model</option><option>Other</option></select></div>
      <div className="field"><label className="lbl">What is incorrect, and what is the correct information?</label><textarea className="input" ref={txt} /></div>
      <div className="field"><label className="lbl">Source URL (optional)</label><input className="input" ref={url} placeholder="https://" /></div>
      <div className="acts">
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn primary" onClick={() => {
          const t = txt.current!.value.trim();
          if (!t) return toast('Describe the correction');
          S.corrections.push({ id: 'c' + Date.now(), firm: id, field: fld.current!.value, text: t, url: url.current!.value, date: new Date().toISOString(), status: 'open' });
          save(); closeModal(); toast('Correction report sent');
        }}>Send report</button>
      </div>
    </>
  );
}
export const reportCorrection = (id: string) => modal(<ReportCorrection id={id} />);

interface ConnOpts { targetType: 'gp' | 'lp'; targetId: string; targetName: string; role?: string }

function ConnectionForm({ targetType, targetId, targetName, role }: ConnOpts) {
  const ref = useRef<HTMLDivElement>(null);
  const g = (sel: string) => (ref.current!.querySelector(sel) as HTMLInputElement).value.trim();
  return (
    <div ref={ref}>
      <h2>Request a connection</h2>
      <p className="muted">To {targetName}. Requests go to the Texas Private Capital team, who review fit before any outreach. <b>Submitting a request is not a guaranteed introduction or fundraising outcome.</b></p>
      <div className="grid2">
        <div className="field"><label className="lbl">Your role</label><select className="input" id="cfRole" defaultValue={role}>{['GP', 'LP', 'Business owner', 'Adviser / intermediary'].map((r) => <option key={r}>{r}</option>)}</select></div>
        <div className="field"><label className="lbl">Organization</label><input className="input" id="cfOrg" /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="lbl">Your name</label><input className="input" id="cfName" /></div>
        <div className="field"><label className="lbl">Work email</label><input className="input" type="email" id="cfEmail" /></div>
      </div>
      <div className="field"><label className="lbl">Relevant criteria</label><textarea className="input" id="cfCrit" placeholder={targetType === 'lp' ? 'Fund strategy, target size, sectors, track record…' : 'Company sector, size, location, transaction goal, or fund strategy…'} /></div>
      <div className="field"><label className="lbl">Anything confidential we should know?</label><textarea className="input" id="cfConf" placeholder="Kept private. Never shown on a public profile." /></div>
      <div className="conn-note">Confidential business information is stored with your request only and is not published. With a backend connected, requests are encrypted at rest and visible only to the review team.</div>
      <div className="acts">
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn red" id="cfSend" onClick={() => {
          if (!g('#cfName') || !EMAIL_RE.test(g('#cfEmail'))) return toast('Add your name and a valid work email');
          S.requests.push({ id: 'r' + Date.now(), date: new Date().toISOString(), targetType, targetId, targetName, role: g('#cfRole'), org: g('#cfOrg'), name: g('#cfName'), email: g('#cfEmail'), criteria: g('#cfCrit'), confidential: g('#cfConf'), status: 'received' });
          save(); closeModal(); toast('Request received — the team will review fit');
        }}>Send request</button>
      </div>
    </div>
  );
}
export const connectionForm = (opts: ConnOpts) => modal(<ConnectionForm {...opts} />);

export function subscribe(email: string, topics: string[]): boolean {
  if (!EMAIL_RE.test(email)) { toast('Enter a valid email address'); return false; }
  if (S.subscribers.some((x) => x.email === email)) { toast('That address is already on the list'); return false; }
  S.subscribers.push({ email, topics, date: new Date().toISOString() });
  save();
  render();
  return true;
}

/** The weekly briefing signup box used on Home and Newsletter. */
export function Signup({ compact }: { compact: boolean }) {
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState('');
  return (
    <div className="signup">
      <h2>The weekly Texas private-capital briefing</h2>
      <p>{compact ? 'Deals and exits, fund launches and closes, GP activity and team changes — every week.' : 'One email a week covering Texas private-equity deals and exits, fund launches and closes, GP firm activity and team changes, and notable developments across the state.'}</p>
      <form className="nl-form" onSubmit={(e) => { e.preventDefault(); if (subscribe(email.trim(), ['all'])) setDone(true); }}>
        {done ? (
          <div style={{ color: '#fff', fontWeight: 600 }}>Subscribed. You will hear from us once sending is live.</div>
        ) : (
          <>
            <input className="input" type="email" placeholder="Work email" aria-label="Email address" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn red" type="submit">Subscribe</button>
          </>
        )}
      </form>
      <p className="fine">Signup is live; email delivery activates once an email provider is connected (see Admin → Integrations). No emails are sent until then.</p>
    </div>
  );
}
