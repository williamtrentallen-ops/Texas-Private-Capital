'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { byId, CITIES, EVENT_TL, EVENTS, FIRMS, INDUSTRIES } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import type { PageQuery } from '@/lib/query';
import { firmHref } from '@/lib/routes';
import { closeModal, modal, render, S, save, toast, useStore } from '@/lib/store';
import { gate } from '@/components/modals';
import { DebouncedInput, SourceLink } from '@/components/ui';

function AlertPrefs() {
  const ref = useRef<HTMLDivElement>(null);
  const v = (sel: string) => (ref.current!.querySelector(sel) as HTMLSelectElement).value;
  return (
    <div ref={ref}>
      <h2>Alert preferences</h2>
      <p className="muted">Saved alerts are stored in this browser. Email delivery requires a connected backend (see Admin → Integrations).</p>
      <div className="grid2">
        <div className="field"><label className="lbl">Firm</label><select className="input" id="alF"><option value="">Any</option>{FIRMS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
        <div className="field"><label className="lbl">Sector</label><select className="input" id="alS"><option value="">Any</option>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select></div>
        <div className="field"><label className="lbl">City</label><select className="input" id="alC"><option value="">Any</option>{CITIES.map((i) => <option key={i}>{i}</option>)}</select></div>
        <div className="field"><label className="lbl">Event type</label><select className="input" id="alT"><option value="">Any</option>{Object.entries(EVENT_TL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      </div>
      <button className="btn primary sm" id="alAddBtn" onClick={() => { S.alerts.push({ id: 'a' + Date.now(), firm: v('#alF'), sector: v('#alS'), city: v('#alC'), type: v('#alT') }); save(); closeModal(); render(); toast('Alert saved'); }}>Add alert</button>
      <h3 style={{ marginTop: 16 }}>Your alerts</h3>
      <div id="alList">{S.alerts.length ? S.alerts.map((x) => (
        <div className="person" key={x.id}><span>{[x.firm ? byId(x.firm)!.name : null, x.sector, x.city, x.type ? EVENT_TL[x.type] : null].filter(Boolean).join(' · ') || 'Everything'}</span><button className="btn xs danger" onClick={() => { S.alerts = S.alerts.filter((z) => z.id !== x.id); save(); closeModal(); render(); }}>Remove</button></div>
      )) : <p className="muted">No alerts yet.</p>}</div>
      <div className="acts"><button className="btn" onClick={closeModal}>Done</button></div>
    </div>
  );
}

export default function Activity({ q, qs }: PageQuery) {
  const { ui } = useStore();
  const router = useRouter();
  if (q.firm && ui.act._lastQs !== qs) ui.act = { type: '', firm: q.firm, sector: '', city: '', q: '', _lastQs: qs };
  const a = ui.act;
  const list = EVENTS.filter((e) => (!a.type || e.type === a.type) && (!a.firm || e.firm === a.firm) && (!a.sector || e.sector === a.sector) && (!a.city || byId(e.firm)!.city === a.city) && (!a.q || (e.title + ' ' + e.detail).toLowerCase().includes(a.q.toLowerCase())));
  const set = (k: 'type' | 'firm' | 'sector' | 'city') => (e: React.ChangeEvent<HTMLSelectElement>) => { a[k] = e.target.value; render(); };
  return (
    <>
      <div className="page-head"><div><h1>Market activity</h1><p>Acquisitions, fund announcements, team changes and updated mandates. Each item is dated and sourced; “Why this may matter” separates fact from inference.</p></div>
        <button className="btn sm" id="alertBtn" onClick={() => { if (!gate('Alerts')) return; modal(<AlertPrefs />); }}>Alert preferences{S.alerts.length ? ` (${S.alerts.length})` : ''}</button>
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <DebouncedInput style={{ width: 220 }} id="aq" placeholder="Search activity" value={a.q} onCommit={(v) => { a.q = v; render(); }} />
        <select className="input" style={{ width: 'auto' }} id="atype" value={a.type} onChange={set('type')}><option value="">All event types</option>{Object.entries(EVENT_TL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input" style={{ width: 'auto' }} id="afirm" value={a.firm} onChange={set('firm')}><option value="">All firms</option>{FIRMS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        <select className="input" style={{ width: 'auto' }} id="asector" value={a.sector} onChange={set('sector')}><option value="">All sectors</option>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select>
        <select className="input" style={{ width: 'auto' }} id="acity" value={a.city} onChange={set('city')}><option value="">All cities</option>{CITIES.map((i) => <option key={i}>{i}</option>)}</select>
        {a.type || a.firm || a.sector || a.city || a.q ? <button className="btn sm ghost" id="areset" onClick={() => { ui.act = { type: '', firm: '', sector: '', city: '', q: '', _lastQs: '' }; router.push('/activity'); render(); }}>Reset</button> : null}
      </div>
      <div className="feed">{list.length ? list.map((e, i) => (
        <div className="ev" key={i}>
          <div className="d">{fmtDate(e.date)}</div>
          <div>
            <div className="t"><Link href={firmHref(e.firm)}>{byId(e.firm)!.name}</Link><span className={`ev-type ${e.type}`}>{EVENT_TL[e.type]}</span></div>
            <div>{e.detail}</div>
            <div className="muted" style={{ marginTop: 3 }}>Source: <SourceLink source={e.source} /> · retrieved {fmtDate(e.source.date)}{e.sector ? ` · ${e.sector}` : ''}</div>
            <details className="why"><summary className="l">Why this may matter</summary>
              <div style={{ marginTop: 6 }}><span className="src public">Sourced</span> {e.why.fact}</div>
              <div style={{ marginTop: 4 }}><span className="src inferred">Inferred</span> {e.why.inference}</div>
            </details>
          </div>
        </div>
      )) : <div className="empty"><b>No activity matches these filters</b>Try a wider date range or remove a filter.</div>}</div>
    </>
  );
}
