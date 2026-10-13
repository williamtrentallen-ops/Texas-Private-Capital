'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect } from 'react';
import { CAP_LABEL, FUNDRAISING, INDUSTRIES, LPS, NEWS, STRATEGIES, TYPE_LABEL } from '@/lib/data';
import { cap1, csv, download, fmtDate, range } from '@/lib/format';
import { applyFilters, FILTER_DEFS, matchLP, sortFirms, type DirFilters } from '@/lib/matching';
import type { PageQuery } from '@/lib/query';
import { articleHref, firmHref, lpHref } from '@/lib/routes';
import { ALL, isPaid, render, S, toast, toggleCompare, toggleSave, useStore, type UI } from '@/lib/store';
import type { Firm } from '@/lib/types';
import { connectionForm, gate } from '@/components/modals';
import { CompareBar, DebouncedInput, StatusTag, Tags, TypeTag } from '@/components/ui';

export function firmCsvRows(firms: Firm[]): unknown[][] {
  return [
    ['Firm', 'Type', 'HQ', 'Other Texas offices', 'Industries', 'Subsectors', 'Target EBITDA ($M)', 'Equity check ($M)', 'Control/Minority', 'Platform/Add-on', 'Capital model', 'Backs independent sponsors', 'Mandate status', 'Last confirmed', 'Website', 'Demo data'],
    ...firms.map((f) => [f.name, TYPE_LABEL[f.type], f.city, f.offices.join('; '), f.ind.join('; '), f.sub.join('; '), f.eb ? `${f.eb[0]}-${f.eb[1]}` : 'n/d', f.chk ? `${f.chk[0]}-${f.chk[1]}` : 'n/d', f.ctrl.join('/'), f.deal.join('/'), CAP_LABEL[f.cap], f.backsIS == null ? 'n/d' : f.backsIS ? 'Yes' : 'No', { active: 'Actively investing', selective: 'Selective', paused: 'Paused' }[f.status], f.conf || '', f.website, 'Yes — fictional']),
  ];
}

const fundOf = (f: Firm) => {
  const x = FUNDRAISING.find((y) => y.f.id === f.id);
  return x ? `${x.size} ${x.fundName}` : f.cap === 'family' ? 'Family capital' : 'Deal-by-deal';
};

/** Apply a link's query to the directory filters once per distinct query string. */
function syncDirectory(ui: UI, { q, qs }: PageQuery) {
  const st = ui.dir;
  if (qs && st._lastQs !== qs) {
    st._lastQs = qs;
    st.filters = {};
    st.q = '';
    if (q.q) st.q = q.q;
    if (q.type) st.filters.type = [q.type];
    if (q.city) st.filters.city = [q.city];
    if (q.ind) st.filters.ind = [q.ind];
    if (q.cap) st.filters.cap = [q.cap];
    if (q.ebitda) st.filters.ebitda = q.ebitda;
    if (q.check) st.filters.check = q.check;
    if (q.sort) { st.sort = q.sort; st.dir = q.sort === 'updated' ? -1 : 1; }
  }
  if (!st.view || st.view === 'cards') st.view = 'profiles';
}

export default function GPs(props: PageQuery) {
  const { ui } = useStore();
  // ?path=lp opens the "GP seeking LPs" tab; re-evaluated whenever the query changes.
  if (ui.lp._gpQs !== props.qs) { ui.lp._gpQs = props.qs; ui.lp.gpMode = props.q.path === 'lp'; }
  const tabs = (
    <div className="tabs">
      <button className={!ui.lp.gpMode ? 'on' : undefined} data-gpmode="0" onClick={() => { ui.lp.gpMode = false; render(); }}>Browse GPs</button>
      <button className={ui.lp.gpMode ? 'on' : undefined} data-gpmode="1" onClick={() => { ui.lp.gpMode = true; render(); }}>GP seeking LPs</button>
    </div>
  );
  if (ui.lp.gpMode) {
    return (
      <>
        <div className="page-head"><div><h1>GPs</h1><p>Describe your fund to find LPs whose stated interests may fit.</p></div></div>
        {tabs}
        <GPtoLP ui={ui} />
      </>
    );
  }
  return <Directory {...props} ui={ui} tabs={tabs} />;
}

function Directory({ ui, tabs, ...query }: PageQuery & { ui: UI; tabs: React.ReactNode }) {
  const router = useRouter();
  syncDirectory(ui, query);
  const st = ui.dir;
  const fl = st.filters;
  const paid = isPaid();
  useEffect(() => {
    // Brief skeleton on first visit, as in the prototype.
    if (!st.loading) return;
    const t = setTimeout(() => { st.loading = false; render(); }, 350);
    return () => clearTimeout(t);
  }, [st]);

  const all = ALL();
  const results = sortFirms(applyFilters(all, fl, st.q), st.sort, st.dir);
  const chips: { k: string; v?: string; label: string }[] = [];
  for (const k of Object.keys(FILTER_DEFS)) ((fl[k] as string[]) || []).forEach((v) => chips.push({ k, v, label: `${FILTER_DEFS[k].label}: ${FILTER_DEFS[k].opts.find((o) => o[0] === v)?.[1] || v}` }));
  if (fl.ebitda != null && fl.ebitda !== '') chips.push({ k: 'ebitda', label: `Company EBITDA ≈ $${fl.ebitda}M` });
  if (fl.check != null && fl.check !== '') chips.push({ k: 'check', label: `Equity check ≈ $${fl.check}M` });
  if (fl.confAfter) chips.push({ k: 'confAfter', label: `Confirmed since ${fmtDate(fl.confAfter)}` });
  if (fl.sub) chips.push({ k: 'sub', label: `Subsector contains “${fl.sub}”` });
  if (st.q) chips.push({ k: 'q', label: `Search: “${st.q}”` });

  const sel = (k: string, label: string) => (
    <div className="f"><label>{label}</label>
      <select className="input" data-k={k} value={((fl[k] as string[]) || [])[0] || ''} onChange={(e) => { fl[k] = e.target.value ? [e.target.value] : []; render(); }}>
        <option value="">Any</option>{FILTER_DEFS[k].opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
  const th = (key: string, label: string) => (
    <th className={st.sort === key ? 'sorted' : undefined} data-sort={key} onClick={() => { if (st.sort === key) st.dir *= -1; else { st.sort = key; st.dir = 1; } render(); }}>
      {label}<span className="sort">{st.sort === key ? (st.dir > 0 ? '▲' : '▼') : '↕'}</span>
    </th>
  );
  const reset = () => { st.filters = {}; st.q = ''; st._lastQs = ''; router.push('/gps'); render(); };
  const removeChip = (c: { k: string; v?: string }) => {
    if (c.k === 'q') st.q = '';
    else if (FILTER_DEFS[c.k]) fl[c.k] = (fl[c.k] as string[]).filter((x) => x !== (c.v || ''));
    else delete (fl as DirFilters)[c.k];
    render();
  };
  const saveBtn = (f: Firm, size: string) => (
    <button className={`btn ${size} ${S.saved.includes(f.id) ? 'on' : ''}`} data-save={f.id} onClick={() => toggleSave(f.id)}>{S.saved.includes(f.id) ? 'Saved' : 'Save'}</button>
  );
  const cmpCheckbox = (f: Firm, title?: string) => (
    <input type="checkbox" data-cmp={f.id} checked={ui.compare.includes(f.id)} title={title} onChange={() => toggleCompare(f.id)} />
  );

  const card = (f: Firm) => {
    const n = NEWS.find((x) => x.firm === f.id);
    const mgmt = f.team.slice(0, 2);
    return (
      <div className="gp" key={f.id}>
        <div className="hd">
          <div>
            <div className="nm"><Link href={firmHref(f.id)}>{f.name}</Link></div>
            <div className="loc"><TypeTag t={f.type} />{` ${f.city}${f.offices.length ? ' · also ' + f.offices.join(', ') : ''} · est. ${f.founded}`}</div>
          </div>
          <div className="cmp"><label>{cmpCheckbox(f)}Compare</label></div>
        </div>
        <div className="stats">
          <div className="s"><small>Equity check</small><b>{paid ? range(f.chk) : 'Paid plan'}</b></div>
          <div className="s"><small>Target EBITDA</small><b>{range(f.eb)}</b></div>
          <div className="s"><small>Funds raised</small><b title={fundOf(f)}>{fundOf(f)}</b></div>
          <div className="s"><small>Past deals</small><b>{f.transactions.length}</b></div>
          <div className="s"><small>Portfolio</small><b>{f.portfolio.filter((p) => p.status === 'Current').length} current</b></div>
          <div className="s"><small>Last update</small><b>{fmtDate(f.updated)}</b></div>
        </div>
        <div className="bd">
          <div className="l"><span>Industries</span><span><Tags items={f.ind} /></span></div>
          <div className="l"><span>Deal type</span><span>{f.ctrl.map(cap1).join(' / ')} · {f.deal.map(cap1).join(' / ')} · {CAP_LABEL[f.cap]}</span></div>
          <div className="l"><span>Management</span><span>{paid
            ? mgmt.map((p, i) => <Fragment key={p.email}>{`${i ? ', ' : ''}${p.name} `}<span className="muted">({p.title})</span></Fragment>)
            : <>{f.team.length} team members · <Link href="/pricing">paid plan</Link></>}</span></div>
          {n ? <div className="l"><span>Recent news</span><span><Link href={articleHref(n.id)}>{n.headline}</Link> <span className="muted">{fmtDate(n.date)}</span></span></div> : null}
          <div className="l"><span>Mandate</span><span><StatusTag s={f.status} /> {f.conf ? <span className="muted">confirmed {fmtDate(f.conf)}</span> : <span className="muted">not firm-confirmed</span>}</span></div>
        </div>
        <div className="ft">
          <Link className="btn sm primary" href={firmHref(f.id)}>Full profile</Link>
          {saveBtn(f, 'sm')}
          <span className="spacer" />
          <button className="btn sm red" onClick={() => connectionForm({ targetType: 'gp', targetId: f.id, targetName: f.name })}>Request a connection</button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="page-head"><div><h1>GPs</h1><p>{all.length} Texas-based private equity firms, family offices and independent sponsors. Headquarters shown separately from where each firm invests.</p></div>
        <div className="row"><button className="btn sm" id="exportDir" onClick={() => { if (!gate('CSV export')) return; download('texas-private-capital-gps-demo.csv', csv(firmCsvRows(results))); toast(`Exported ${results.length} GPs`); }}>Export CSV</button></div>
      </div>
      {tabs}
      <div className="filterbar" id="fbar">
        <div className="frow">
          {sel('type', 'Investor type')}{sel('city', 'Headquarters')}{sel('office', 'Other Texas office')}{sel('ind', 'Industry')}
          <div className="f"><label>Company EBITDA ($M)</label><DebouncedInput type="number" min="0" step="0.5" id="feb" placeholder="e.g. 8" value={fl.ebitda ?? ''} onCommit={(v) => { fl.ebitda = v; render(); }} /></div>
          <div className="f"><label>Equity check ($M)</label><DebouncedInput type="number" min="0" step="1" id="fchk" placeholder="e.g. 30" value={fl.check ?? ''} onCommit={(v) => { fl.check = v; render(); }} /></div>
        </div>
        <div className="frow">
          {sel('ctrl', 'Control / minority')}{sel('deal', 'Platform / add-on')}{sel('cap', 'Capital model')}{sel('backsIS', 'Backs sponsors')}{sel('status', 'Mandate status')}
          <div className="f"><label>Confirmed since</label><input className="input" type="date" id="fconf" value={fl.confAfter || ''} onChange={(e) => { fl.confAfter = e.target.value; render(); }} /></div>
        </div>
        <div className="fx">
          <DebouncedInput id="dq" placeholder="Search firm, subsector, portfolio company…" value={st.q} onCommit={(v) => { st.q = v; render(); }} />
          <label className="muted">Sort <select className="input" id="sortSel" style={{ width: 'auto', display: 'inline-block', padding: '6px 8px' }} value={st.sort} onChange={(e) => { st.sort = e.target.value; st.dir = ['updated', 'conf', 'chk', 'eb'].includes(st.sort) ? -1 : 1; render(); }}>
            {[['name', 'Firm name'], ['city', 'City'], ['type', 'Investor type'], ['chk', 'Check size'], ['eb', 'EBITDA'], ['updated', 'Last update'], ['conf', 'Confirmation date']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></label>
          <div className="seg"><button className={st.view === 'profiles' ? 'on' : ''} data-view="profiles" onClick={() => { st.view = 'profiles'; render(); }}>Profiles</button><button className={st.view === 'table' ? 'on' : ''} data-view="table" onClick={() => { st.view = 'table'; render(); }}>Table</button></div>
          <button className="btn sm ghost" id="resetAll" onClick={reset}>Reset</button>
        </div>
      </div>
      <div className="toolbar"><span className="count">{results.length} GP{results.length === 1 ? '' : 's'}</span>
        {chips.length ? <div className="chips" style={{ margin: 0 }}>{chips.map((c) => <span className="chip" key={c.k + (c.v || '')}>{c.label}<button data-chip-k={c.k} data-chip-v={c.v || ''} aria-label="Remove filter" onClick={() => removeChip(c)}>×</button></span>)}</div> : null}
      </div>
      {st.loading ? (
        <div className="gpcards">{[0, 1, 2].map((i) => <div className="gp" style={{ padding: 16 }} key={i}><div className="skeleton" style={{ width: '60%' }} /><br /><div className="skeleton" /><br /><div className="skeleton" style={{ width: '80%' }} /></div>)}</div>
      ) : results.length === 0 ? (
        <div className="empty"><b>No GPs match these filters</b>Try widening the EBITDA or check size, or remove a sector filter.<div style={{ marginTop: 10 }}><button className="btn sm" id="resetAll3" onClick={reset}>Reset all filters</button></div></div>
      ) : st.view === 'profiles' ? (
        <div className="gpcards">{results.map(card)}</div>
      ) : (
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th className="ns" />{th('name', 'Firm')}{th('city', 'Location')}{th('type', 'Type')}{th('ind', 'Industries')}{th('chk', 'Equity check')}{th('eb', 'Target EBITDA')}<th className="ns">Funds raised</th><th className="ns">Past deals</th>{th('updated', 'Last update')}<th className="ns" /></tr></thead>
          <tbody>{results.map((f) => (
            <tr key={f.id}>
              <td>{cmpCheckbox(f, 'Compare')}</td>
              <td><Link className="firm" href={firmHref(f.id)}>{f.name}</Link><div className="muted">{CAP_LABEL[f.cap]}</div></td>
              <td className="nowrap">{f.city}{f.offices.length ? <div className="muted">+ {f.offices.join(', ')}</div> : null}</td>
              <td><TypeTag t={f.type} /></td>
              <td><Tags items={f.ind.slice(0, 2)} />{f.ind.length > 2 ? <span className="muted">+{f.ind.length - 2}</span> : null}</td>
              <td className="nowrap">{paid ? range(f.chk) : 'Paid plan'}</td>
              <td className="nowrap">{range(f.eb)}</td>
              <td className="nowrap">{fundOf(f)}</td>
              <td>{f.transactions.length}</td>
              <td className="nowrap">{fmtDate(f.updated)}</td>
              <td>{saveBtn(f, 'xs')}</td>
            </tr>
          ))}</tbody></table></div>
      )}
      <CompareBar />
    </>
  );
}

/** GP seeking LPs: rank LPs by stated interests. */
function GPtoLP({ ui }: { ui: UI }) {
  const g = ui.lp.gpForm || { strategy: 'Buyout', sectors: [], size: 300, emerging: false };
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!gate('LP matching')) return;
    const fd = new FormData(e.currentTarget);
    ui.lp.gpForm = { strategy: String(fd.get('strategy')), size: +(fd.get('size') as string) || 0, sectors: fd.getAll('sectors') as string[], emerging: fd.get('emerging') === 'on' };
    ui.lp.gpResults = LPS.map((l) => matchLP(l, ui.lp.gpForm!)).sort((a, b) => b.pct - a.pct);
    render();
  };
  return (
    <>
      <div className="match-grid">
        <form className="card" id="gpForm" onSubmit={onSubmit}>
          <h3>Your fund</h3><p className="muted">Used only to rank LPs on this page. Nothing is published.</p>
          <div className="field"><label className="lbl">Strategy</label><select className="input" name="strategy" defaultValue={g.strategy}>{STRATEGIES.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="field"><label className="lbl">Target fund size ($M)</label><input className="input" type="number" name="size" defaultValue={g.size} /></div>
          <div className="field"><label className="lbl">Sectors</label>{INDUSTRIES.map((x) => <label className="chk" key={x}><input type="checkbox" name="sectors" value={x} defaultChecked={g.sectors.includes(x)} /> {x}</label>)}</div>
          <label className="chk"><input type="checkbox" name="emerging" defaultChecked={g.emerging} /> First- or second-time fund</label>
          <button className="btn primary" type="submit" style={{ marginTop: 12 }}>Find LPs</button>
        </form>
        <div>{ui.lp.gpResults ? ui.lp.gpResults.map((x) => (
          <div className="mcard" key={x.l.id}>
            <div className="mh">
              <div><Link href={lpHref(x.l.id)} style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>{x.l.name}</Link> <span className="tag">{x.l.type}</span><div className="muted">{x.l.city} · <span className={`src ${x.l.provided === 'direct' ? 'confirmed' : 'public'}`}>{x.l.provided === 'direct' ? 'Provided directly' : 'Public filings'}</span></div></div>
              <div style={{ textAlign: 'right' }}><div className="score">{x.pct}%</div><div className="muted">of stated interests</div></div>
            </div>
            <div className="bar"><i style={{ width: `${x.pct}%` }} /></div>
            <div className="mcols">
              <div><h4 className="ok">Why it may fit</h4><ul>{x.matched.length ? x.matched.map((m) => <li key={m}>{m}</li>) : <li className="muted">None</li>}</ul></div>
              <div>
                {x.conflicts.length ? <><h4 className="bad">Conflicts</h4><ul>{x.conflicts.map((m) => <li key={m}>{m}</li>)}</ul></> : null}
                {x.missing.length ? <><h4 className="warn">Missing information</h4><ul>{x.missing.map((m) => <li key={m}>{m}</li>)}</ul></> : null}
              </div>
            </div>
            <div className="row" style={{ marginTop: 10 }}><Link className="btn xs" href={lpHref(x.l.id)}>Profile</Link><button className="btn xs red" onClick={() => connectionForm({ targetType: 'lp', targetId: x.l.id, targetName: x.l.name, role: 'GP' })}>Request a connection</button></div>
          </div>
        )) : <div className="empty"><b>Describe your fund to see LPs whose stated interests may fit</b>Only confirmed or publicly recorded interests are used.</div>}</div>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>Matches reflect stated interests only. Requesting a connection is not a guaranteed introduction or fundraising outcome.</p>
    </>
  );
}

