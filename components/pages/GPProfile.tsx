'use client';
import Link from 'next/link';
import { CAP_LABEL, DEALS, FUNDRAISING, NEWS, NEWS_TL, STATUS_LABEL, TYPE_LABEL } from '@/lib/data';
import { cap1, fmtDate, range } from '@/lib/format';
import { articleHref, dealHref } from '@/lib/routes';
import { firm, isPaid, render, S, toggleCompare, toggleSave, useStore } from '@/lib/store';
import type { Firm } from '@/lib/types';
import { addToListUI, connectionForm, reportCorrection, showUpgrade } from '@/components/modals';
import { CompareBar, DealStatusTag, SrcTag, StatusTag, Tags, TypeTag } from '@/components/ui';

const Lock = ({ what }: { what: string }) => (
  <div className="locked">{what} are available on the paid plan. <button className="btn xs primary" onClick={() => showUpgrade(what)}>See options</button></div>
);
const Muted = ({ children }: { children: React.ReactNode }) => <span className="muted">{children}</span>;

export default function GPProfile({ id }: { id: string }) {
  const { ui } = useStore();
  const f = firm(id);
  if (!f) return <div className="empty"><b>Firm not found</b>This profile may have been removed. <Link href="/gps">Return to GPs</Link>.</div>;
  // Opening a different firm starts on the Overview tab.
  if (ui.dir._profId !== f.id) { ui.profTab = 'overview'; ui.dir._profId = f.id; }
  const paid = isPaid();
  const saved = S.saved.includes(f.id);
  const fr = FUNDRAISING.find((x) => x.f.id === f.id);
  const news = NEWS.filter((n) => n.firm === f.id);
  const deals = DEALS.filter((d) => d.gp === f.id);
  const tabs: [string, string][] = [['overview', 'Overview'], ['criteria', 'Investment criteria'], ['funds', 'Funds'], ['deals', `Past deals (${deals.length})`], ['news', `Recent news (${news.length})`], ['team', `Management (${f.team.length})`], ['sources', 'Sources']];
  const tab = ui.profTab;

  return (
    <>
      <div className="pg-head">
        <div className="top">
          <div><h1>{f.name}</h1><div className="meta"><TypeTag t={f.type} /><StatusTag s={f.status} /><span>{f.city}{f.offices.length ? ' · ' + f.offices.join(', ') : ''}</span><span>·</span><a href={f.website} target="_blank" rel="noopener">{f.domain}</a><span>·</span><span>Est. {f.founded}</span></div></div>
          <div className="row">
            <label className="chk" style={{ marginRight: 6 }}><input type="checkbox" id="pCmp" checked={ui.compare.includes(f.id)} onChange={() => toggleCompare(f.id)} /> Compare</label>
            <button className={`btn ${saved ? 'on' : ''}`} id="pSave" onClick={() => toggleSave(f.id)}>{saved ? 'Saved' : 'Save'}</button>
            <button className="btn" id="pList" onClick={() => addToListUI([f.id])}>Add to list</button>
            <button className="btn" id="pReport" onClick={() => reportCorrection(f.id)}>Report a correction</button>
            <button className="btn red" id="pConnect" onClick={() => connectionForm({ targetType: 'gp', targetId: f.id, targetName: f.name })}>Request a connection</button>
          </div>
        </div>
        <div className="pg-stats">
          <div className="s"><small>Equity check</small><b>{paid ? range(f.chk) : 'Paid plan'}</b></div>
          <div className="s"><small>Target EBITDA</small><b>{range(f.eb)}</b></div>
          <div className="s"><small>Funds raised</small><b>{fr ? fr.size : CAP_LABEL[f.cap]}</b><span className="sub">{fr ? fr.fundName + ' · ' + fr.year : 'no committed fund'}</span></div>
          <div className="s"><small>Past deals</small><b>{deals.length}</b><span className="sub">{f.portfolio.filter((p) => p.status === 'Current').length} current platforms</span></div>
          <div className="s"><small>Industries</small><b>{f.ind.length}</b><span className="sub">{f.ind.slice(0, 2).join(', ')}</span></div>
          <div className="s"><small>Last confirmed</small><b>{f.conf ? fmtDate(f.conf) : '—'}</b><span className="sub">updated {fmtDate(f.updated)}</span></div>
        </div>
        <div className="pg-tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} data-ptab={k} onClick={() => { ui.profTab = k; render(); }}>{l}</button>)}</div>
      </div>
      {tab === 'overview' ? <Overview f={f} paid={paid} news={news} />
        : tab === 'criteria' ? <Criteria f={f} paid={paid} />
        : tab === 'funds' ? <Funds f={f} fr={fr} />
        : tab === 'deals' ? (
          <div className="sec"><h3>Past deals</h3>{deals.length ? (
            <div className="tbl-wrap"><table className="tbl"><thead><tr><th className="ns">Date</th><th className="ns">Deal</th><th className="ns">Type</th><th className="ns">Company</th><th className="ns">Sector</th><th className="ns">City</th><th className="ns">Status</th></tr></thead>
              <tbody>{deals.map((d) => <tr key={d.id}><td className="nowrap">{fmtDate(d.date)}</td><td><Link className="firm" href={dealHref(d.id)}>{d.headline}</Link></td><td>{d.type}</td><td>{d.company}</td><td>{d.sector}</td><td>{d.city}</td><td><DealStatusTag s={d.status} /></td></tr>)}</tbody></table></div>
          ) : <p className="muted">No transactions recorded.</p>}</div>
        ) : tab === 'news' ? (
          <div className="sec"><h3>Recent news</h3>{news.length ? (
            <div className="story-list" style={{ maxWidth: 800 }}>{news.map((n) => (
              <div className="st" style={{ padding: '14px 0' }} key={n.id}>
                <div className="muted" style={{ fontSize: 12.5 }}><span className={`ev-type ${n.type}`} style={{ margin: '0 6px 0 0' }}>{NEWS_TL[n.type]}</span>{fmtDate(n.date)} · {n.city}</div>
                <h4 style={{ fontSize: 17 }}><Link href={articleHref(n.id)}>{n.headline}</Link></h4>
                <div style={{ color: 'var(--ink-2)', fontSize: 14 }}>{n.summary}</div>
              </div>
            ))}</div>
          ) : <div className="empty"><b>No coverage yet</b>News about this firm will appear here.</div>}</div>
        ) : tab === 'team' ? (
          <div className="sec"><h3>Management</h3>{paid ? (
            <>
              <div className="tbl-wrap"><table className="tbl"><thead><tr><th className="ns">Name</th><th className="ns">Title</th><th className="ns">Coverage</th><th className="ns">Email</th><th className="ns">Phone</th><th className="ns">Source</th></tr></thead>
                <tbody>{f.team.map((p) => <tr key={p.email}><td><b>{p.name}</b></td><td>{p.title}</td><td>{p.focus}</td><td><a href={`mailto:${p.email}`}>{p.email}</a></td><td>{p.phone || '—'}</td><td><SrcTag fs={{ x: p.fs }} k="x" /></td></tr>)}</tbody></table></div>
              <p className="muted" style={{ marginTop: 8 }}>Published business contact details only.</p>
            </>
          ) : (
            <><p className="muted">{f.team.length} team members listed, including {f.team[0].title.toLowerCase()} and {f.team[1].title.toLowerCase()} roles.</p><Lock what="Contacts" /></>
          )}</div>
        ) : (
          <div className="sec"><h3>Sources</h3><div className="list">{f.sources.map((sr) => (
            <div className="item" key={sr.label}><span className="date">{fmtDate(sr.date)}</span><div className="body"><b>{sr.label}</b>{sr.url ? <> — <a href={sr.url} target="_blank" rel="noopener">{sr.url}</a></> : ' — on file'}<div className="muted">Supports: {sr.fields.join(', ')}</div></div></div>
          ))}</div></div>
        )}
      <CompareBar />
    </>
  );
}

function Overview({ f, paid, news }: { f: Firm; paid: boolean; news: typeof NEWS }) {
  return (
    <div className="profile"><div>
      <div className="sec"><h3>Overview</h3><p>{f.overview}</p>
        <dl className="dl">
          <dt>Headquarters</dt><dd>{f.city}{f.offices.length ? '; also ' + f.offices.join(', ') : ''}</dd>
          <dt>Invests in</dt><dd>{f.geo.join(', ')}<SrcTag fs={f.fs} k="geo" /></dd>
          <dt>Capital model</dt><dd>{CAP_LABEL[f.cap]}<SrcTag fs={f.fs} k="cap" /></dd>
          <dt>Backs independent sponsors</dt><dd>{f.backsIS == null ? 'Not disclosed' : f.backsIS ? 'Yes' : 'No'}<SrcTag fs={f.fs} k="backsIS" /></dd>
          <dt>Last updated</dt><dd>{fmtDate(f.updated)}</dd>
          <dt>Last confirmed with firm</dt><dd>{f.conf ? fmtDate(f.conf) : 'Never — public sources only'}</dd>
        </dl>
      </div>
      <div className="sec"><h3>Current investment priorities</h3>{paid ? <p>{f.prio} <SrcTag fs={f.fs} k="prio" /></p> : <Lock what="Current priorities" />}</div>
      <div className="sec"><h3>Portfolio companies</h3><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="ns">Company</th><th className="ns">Sector</th><th className="ns">Location</th><th className="ns">Acquired</th><th className="ns">Status</th></tr></thead>
        <tbody>{f.portfolio.map((p) => <tr key={p.name}><td>{p.name}</td><td>{p.sector}</td><td>{p.city}</td><td>{p.year}</td><td>{p.status}</td></tr>)}</tbody></table></div></div>
    </div><aside>
      <div className="card" style={{ marginBottom: 14 }}><h3>Latest news</h3>{news.length ? (
        <div className="list">{news.slice(0, 3).map((n) => <div className="item" key={n.id}><span className="date">{fmtDate(n.date)}</span><div className="body" style={{ fontSize: 13.5 }}><Link href={articleHref(n.id)}>{n.headline}</Link></div></div>)}</div>
      ) : <p className="muted">No coverage yet.</p>}</div>
      <div className="card" style={{ marginBottom: 14 }}><h3>Key contacts</h3>{paid ? f.team.slice(0, 2).map((p) => (
        <div style={{ marginBottom: 8 }} key={p.email}><b>{p.name}</b><div className="muted">{p.title}</div><a href={`mailto:${p.email}`} style={{ fontSize: 13 }}>{p.email}</a></div>
      )) : <Lock what="Contacts" />}</div>
      <div className="card"><h3>Fit check</h3><p className="muted">See how a specific company compares with this firm&apos;s criteria.</p><Link className="btn primary sm" href="/match">Find a GP for your company</Link></div>
    </aside></div>
  );
}

function Criteria({ f, paid }: { f: Firm; paid: boolean }) {
  return (
    <>
      <div className="legend"><span className="src confirmed">Firm-confirmed</span><span className="src public">Publicly sourced</span><span className="src inferred">Inferred</span><span className="src nd">Not disclosed</span><span>— recorded per field.</span></div>
      <div className="profile"><div>
        <div className="sec"><h3>Investment criteria</h3>
          <dl className="dl">
            <dt>Industries</dt><dd><Tags items={f.ind} /></dd>
            <dt>Subsectors</dt><dd>{f.sub.join(', ')}</dd>
            <dt>Target company EBITDA</dt><dd>{range(f.eb)}<SrcTag fs={f.fs} k="eb" /></dd>
            <dt>Equity check size</dt><dd>{paid ? <>{range(f.chk)}<SrcTag fs={f.fs} k="chk" /></> : <Muted>Paid plan</Muted>}</dd>
            <dt>Control / minority</dt><dd>{f.ctrl.map(cap1).join(', ')}<SrcTag fs={f.fs} k="ctrl" /></dd>
            <dt>Platform / add-on</dt><dd>{f.deal.map(cap1).join(', ')}</dd>
            <dt>Geographic preference</dt><dd>{f.geo.join(', ')}<SrcTag fs={f.fs} k="geo" /></dd>
            <dt>Exclusions</dt><dd>{paid ? f.excl.join(', ') : <Muted>Paid plan</Muted>}</dd>
          </dl>
          {paid ? null : <div style={{ marginTop: 10 }}><Lock what="Detailed criteria and exclusions" /></div>}
        </div>
        {f.isPref ? (
          <div className="sec"><h3>Independent sponsor preferences</h3><dl className="dl">
            <dt>First-time sponsors</dt><dd>{f.isPref.firstTime ? 'Eligible' : 'Prefers sponsors with a track record'}<SrcTag fs={f.fs} k="isPref" /></dd>
            <dt>Role</dt><dd>{f.isPref.role}</dd>
            <dt>Sponsor equity</dt><dd>{paid ? f.isPref.equity : <Muted>Paid plan</Muted>}</dd>
          </dl></div>
        ) : f.type === 'is' ? <p className="muted">This firm is itself an independent sponsor and raises equity deal by deal.</p> : null}
      </div>
      <aside><div className="card"><h3>At a glance</h3><dl className="dl" style={{ gridTemplateColumns: '120px 1fr' }}><dt>Type</dt><dd>{TYPE_LABEL[f.type]}</dd><dt>Capital</dt><dd>{CAP_LABEL[f.cap]}</dd><dt>Status</dt><dd>{STATUS_LABEL[f.status]}</dd><dt>Confirmed</dt><dd>{fmtDate(f.conf)}</dd></dl></div></aside>
      </div>
    </>
  );
}

function Funds({ f, fr }: { f: Firm; fr: (typeof FUNDRAISING)[number] | undefined }) {
  const article = fr?.event ? NEWS.find((n) => n.date === fr.event!.date && n.firm === f.id) : undefined;
  return (
    <div className="sec"><h3>Funds and capital</h3>
      {fr ? (
        <>
          <div className="tbl-wrap"><table className="tbl"><thead><tr><th className="ns">Vehicle</th><th className="ns">Size</th><th className="ns">Vintage</th><th className="ns">Source</th></tr></thead>
            <tbody><tr><td>{fr.fundName}</td><td>{fr.size}</td><td>{fr.year}</td><td>{fr.event ? <a href={fr.event.source.url!} target="_blank" rel="noopener">{fr.event.source.label}</a> : 'Firm website'}</td></tr></tbody></table></div>
          <p className="muted" style={{ marginTop: 8 }}>Only the most recent vehicle disclosed by the firm is shown; total capital raised across prior funds is not disclosed and has not been estimated.</p>
        </>
      ) : (
        <p>{CAP_LABEL[f.cap]}. {f.cap === 'family' ? 'The firm invests permanent family capital and does not raise third-party funds.' : 'The firm raises equity from investors on each transaction rather than from a committed fund.'}</p>
      )}
      {fr && fr.event ? (
        <div className="story-list" style={{ maxWidth: 720, marginTop: 12 }}><div className="st"><div className="muted" style={{ fontSize: 12.5 }}>{fmtDate(fr.event.date)} · Fundraise</div><h4><Link href={article ? articleHref(article.id) : '/news'}>{fr.event.title}</Link></h4></div></div>
      ) : null}
    </div>
  );
}

