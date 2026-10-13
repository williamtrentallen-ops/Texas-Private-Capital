'use client';
import Link from 'next/link';
import { CAP_LABEL, INDUSTRIES, LP_TYPES, lpById, LPS, PROV_LABEL, STRATEGIES } from '@/lib/data';
import { fmtDate, range } from '@/lib/format';
import { matchGPforLP } from '@/lib/matching';
import type { PageQuery } from '@/lib/query';
import { firmHref, lpHref } from '@/lib/routes';
import { ALL, isPaid, render, useStore } from '@/lib/store';
import { connectionForm, gate, showUpgrade } from '@/components/modals';
import { DebouncedInput, StatusTag, TypeTag } from '@/components/ui';

export function LPs({ q }: PageQuery) {
  const { ui } = useStore();
  const st = ui.lp;
  // ?path=gp opens the "LP seeking GPs" tab once per session.
  if (q.path === 'gp' && st.mode === 'browse' && !st._pathInit) { st.mode = 'findgps'; st._pathInit = true; }
  const tabs: [string, string][] = [['browse', 'Browse LPs'], ['findgps', 'LP seeking GPs']];
  const set = (k: 'type' | 'strategy' | 'sector') => (e: React.ChangeEvent<HTMLSelectElement>) => { st[k] = e.target.value; render(); };

  let body: React.ReactNode;
  if (st.mode === 'browse') {
    const list = LPS.filter((l) => (!st.type || l.type === st.type) && (!st.strategy || l.interests.strategies.includes(st.strategy)) && (!st.sector || l.interests.sectors.includes(st.sector)) && (!st.q || (l.name + ' ' + l.overview).toLowerCase().includes(st.q.toLowerCase())));
    body = (
      <>
        <div className="row" style={{ marginBottom: 14 }}>
          <DebouncedInput style={{ width: 220 }} id="lq" placeholder="Search LPs" value={st.q} onCommit={(v) => { st.q = v; render(); }} />
          <select className="input" style={{ width: 'auto' }} id="ltype" value={st.type} onChange={set('type')}><option value="">All LP types</option>{LP_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          <select className="input" style={{ width: 'auto' }} id="lstrategy" value={st.strategy} onChange={set('strategy')}><option value="">All strategies</option>{STRATEGIES.map((t) => <option key={t}>{t}</option>)}</select>
          <select className="input" style={{ width: 'auto' }} id="lsector" value={st.sector} onChange={set('sector')}><option value="">All sectors</option>{INDUSTRIES.map((t) => <option key={t}>{t}</option>)}</select>
        </div>
        <div className="legend"><span className="src confirmed">Provided directly</span><span className="src public">Public filings</span><span>— LP interests are shown only when confirmed by the organization or drawn from public records; nothing is inferred.</span></div>
        {list.length ? list.map((l) => (
          <div className="lp-card" key={l.id}>
            <div>
              <div className="n"><Link href={lpHref(l.id)}>{l.name}</Link> <span className="tag">{l.type}</span></div>
              <div className="muted">{`${l.city} · ${l.interests.strategies.join(', ')} `}<span className={`src ${l.provided === 'direct' ? 'confirmed' : 'public'}`}>{l.provided === 'direct' ? 'Provided directly' + (l.confirmedAt ? ' ' + fmtDate(l.confirmedAt) : '') : 'Public filings'}</span></div>
              <div style={{ marginTop: 4, fontSize: 14, color: 'var(--ink-2)' }}>{l.overview}</div>
            </div>
            <div className="row" style={{ alignItems: 'flex-start' }}><Link className="btn sm" href={lpHref(l.id)}>Profile</Link><button className="btn sm red" onClick={() => connectionForm({ targetType: 'lp', targetId: l.id, targetName: l.name, role: 'GP' })}>Request a connection</button></div>
          </div>
        )) : <div className="empty"><b>No LPs match these filters</b>Try removing a filter.</div>}
      </>
    );
  } else {
    const form = st.lpForm || { strategies: ['Buyout'], sectors: [], min: 100, max: 1500 };
    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!gate('GP matching')) return;
      const fd = new FormData(e.currentTarget);
      st.lpForm = { strategies: fd.getAll('strategies') as string[], sectors: fd.getAll('sectors') as string[], min: +(fd.get('min') as string) || 0, max: +(fd.get('max') as string) || 1e9 };
      st.lpResults = ALL().map((f) => matchGPforLP(f, st.lpForm!)).sort((a, b) => b.pct - a.pct);
      render();
    };
    body = (
      <div className="match-grid">
        <form className="card" id="lpForm" onSubmit={onSubmit}>
          <h3>Your investment interests</h3><p className="muted">Used only to rank GPs on this page. Nothing is published.</p>
          <div className="field"><label className="lbl">Strategies</label>{['Buyout', 'Growth equity', 'Independent sponsor deals', 'Co-investment'].map((x) => <label className="chk" key={x}><input type="checkbox" name="strategies" value={x} defaultChecked={form.strategies.includes(x)} /> {x}</label>)}</div>
          <div className="field"><label className="lbl">Sectors</label>{INDUSTRIES.map((x) => <label className="chk" key={x}><input type="checkbox" name="sectors" value={x} defaultChecked={form.sectors.includes(x)} /> {x}</label>)}</div>
          <div className="grid2">
            <div className="field"><label className="lbl">Fund size min ($M)</label><input className="input" type="number" name="min" defaultValue={form.min} /></div>
            <div className="field"><label className="lbl">Fund size max ($M)</label><input className="input" type="number" name="max" defaultValue={form.max} /></div>
          </div>
          <button className="btn primary" type="submit">Find GPs</button>
        </form>
        <div>{st.lpResults ? st.lpResults.map((x) => (
          <div className="mcard" key={x.f.id}>
            <div className="mh">
              <div><Link href={firmHref(x.f.id)} style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>{x.f.name}</Link> <TypeTag t={x.f.type} /> <StatusTag s={x.f.status} /><div className="muted">{x.f.city} · {CAP_LABEL[x.f.cap]}{x.f.fund ? ' · ' + x.f.fund : ''}</div></div>
              <div style={{ textAlign: 'right' }}><div className="score">{x.pct}%</div><div className="muted">of stated criteria</div></div>
            </div>
            <div className="bar"><i style={{ width: `${x.pct}%` }} /></div>
            <div className="mcols">
              <div><h4 className="ok">Why it may fit</h4><ul>{x.matched.length ? x.matched.map((m) => <li key={m}>{m}</li>) : <li className="muted">None</li>}</ul></div>
              <div>
                {x.conflicts.length ? <><h4 className="bad">Conflicts</h4><ul>{x.conflicts.map((m) => <li key={m}>{m}</li>)}</ul></> : null}
                {x.missing.length ? <><h4 className="warn">Missing information</h4><ul>{x.missing.map((m) => <li key={m}>{m}</li>)}</ul></> : null}
              </div>
            </div>
            <div className="row" style={{ marginTop: 10 }}><Link className="btn xs" href={firmHref(x.f.id)}>Profile</Link><button className="btn xs red" onClick={() => connectionForm({ targetType: 'gp', targetId: x.f.id, targetName: x.f.name, role: 'LP' })}>Request a connection</button></div>
          </div>
        )) : <div className="empty"><b>Set your interests to see GPs that may fit</b>Rankings use stated GP criteria and recent activity only.</div>}</div>
      </div>
    );
  }
  return (
    <>
      <div className="page-head"><div><h1>LPs</h1><p>Pensions, endowments, foundations, insurers, family offices and funds of funds active in Texas private markets.</p></div></div>
      <div className="tabs">{tabs.map(([k, l]) => <button key={k} className={st.mode === k ? 'on' : ''} data-mode={k} onClick={() => { st.mode = k; render(); }}>{l}</button>)}</div>
      {body}
    </>
  );
}

export function LPProfile({ id }: { id: string }) {
  useStore();
  const l = lpById(id);
  if (!l) return <div className="empty"><b>LP not found</b><Link href="/lps">Back to LPs</Link></div>;
  const i = l.interests;
  const src = l.provided === 'direct' ? 'confirmed' : 'public';
  const srcLabel = src === 'confirmed' ? 'Provided directly' : 'Public filings';
  return (
    <>
      <div className="profile-head">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><h1>{l.name}</h1><div className="meta"><span className="tag">{l.type}</span><span>{l.city}</span><span>·</span><a href={l.website} target="_blank" rel="noopener">{l.website.replace('https://', '')}</a></div></div>
          <div className="row"><button className="btn red" onClick={() => connectionForm({ targetType: 'lp', targetId: l.id, targetName: l.name, role: 'GP' })}>Request a connection</button></div>
        </div>
        <div className="legend"><span className={`src ${src}`}>{PROV_LABEL[l.provided]}</span>{l.confirmedAt ? <span>Last confirmed {fmtDate(l.confirmedAt)}</span> : <span>Not confirmed directly; interests reflect public records only.</span>}</div>
      </div>
      <div className="profile"><div>
        <div className="sec"><h3>Overview</h3><p>{l.overview}</p></div>
        <div className="sec"><h3>Investment interests</h3>
          <dl className="dl">
            <dt>Strategies</dt><dd>{i.strategies.map((x) => <span className="tag" key={x}>{x}</span>)}</dd>
            <dt>Sectors</dt><dd>{i.sectors.map((x) => <span className="tag" key={x}>{x}</span>)}</dd>
            {i.fundSize ? <><dt>Fund size range</dt><dd>{range(i.fundSize)}<span className={`src ${src}`}>{srcLabel}</span></dd></> : null}
            <dt>Geography</dt><dd>{i.geo}</dd>
            {i.emerging != null ? <><dt>Emerging managers</dt><dd>{i.emerging ? 'Considered' : 'Not currently considered'}<span className={`src ${src}`}>{srcLabel}</span></dd></> : null}
          </dl>
          <p className="muted" style={{ marginTop: 8 }}>Fields not shown were not available from reliable sources and have been omitted rather than inferred.</p>
        </div>
        <div className="sec"><h3>Relevant public activity</h3>{l.activity.length ? (
          <div className="list">{l.activity.map((a) => <div className="item" key={a.date}><span className="date">{fmtDate(a.date)}</span><div className="body">{a.text}<div className="muted">Source: {a.source}</div></div></div>)}</div>
        ) : <p className="muted">No public activity recorded yet.</p>}</div>
      </div><aside>
        <div className="card" style={{ marginBottom: 14 }}><h3>Contact</h3>{l.contact ? (isPaid() ? (
          <><div>{l.contact.title}</div><a href={`mailto:${l.contact.email}`}>{l.contact.email}</a><p className="muted" style={{ marginTop: 6 }}>Published organizational contact only.</p></>
        ) : (
          <div className="locked">Published contact details are available on the paid plan. <button className="btn xs primary" onClick={() => showUpgrade('Contacts')}>See options</button></div>
        )) : <p className="muted">No published contact available.</p>}</div>
        <div className="card"><h3>GP seeking this LP?</h3><p className="muted">Describe your fund to see how it compares with this LP&apos;s stated interests.</p><Link className="btn primary sm" href="/gps?path=lp">Start as a GP</Link></div>
      </aside></div>
    </>
  );
}
