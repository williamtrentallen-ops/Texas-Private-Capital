'use client';
import Link from 'next/link';
import { byId, CAP_LABEL, CITIES, DEALS, dealById, FIRMS, INDUSTRIES, NEWS, NEWS_TL } from '@/lib/data';
import { cap1, csv, download, fmtDate, range } from '@/lib/format';
import { articleHref, dealHref, firmHref } from '@/lib/routes';
import { firm, render, toast, useStore } from '@/lib/store';
import { connectionForm, gate } from '@/components/modals';
import { DealStatusTag, DebouncedInput, TypeTag } from '@/components/ui';

export function Deals() {
  const { ui } = useStore();
  const d = ui.deals;
  const list = DEALS.filter((x) => (!d.type || x.type === d.type) && (!d.sector || x.sector === d.sector) && (!d.city || x.city === d.city) && (!d.status || x.status === d.status) && (!d.gp || x.gp === d.gp) && (!d.q || (x.headline + ' ' + x.company).toLowerCase().includes(d.q.toLowerCase())));
  const set = (k: 'type' | 'sector' | 'city' | 'status' | 'gp') => (e: React.ChangeEvent<HTMLSelectElement>) => { d[k] = e.target.value; render(); };
  const exportCsv = () => {
    if (!gate('CSV export')) return;
    download('texas-deals-sample.csv', csv([['Date', 'Headline', 'Type', 'GP', 'Company', 'Buyer', 'Seller', 'Sector', 'City', 'Status', 'Source', 'Sample data'], ...list.map((x) => [x.date, x.headline, x.type, byId(x.gp)!.name, x.company, x.buyer, x.seller, x.sector, x.city, x.status, x.source.url, 'Yes — fictional'])]));
    toast('Exported');
  };
  return (
    <>
      <div className="page-head"><div><h1>Deals</h1><p>Platform and add-on acquisitions by Texas GPs. Status is shown only where the source confirms it.</p></div><button className="btn sm" id="dExport" onClick={exportCsv}>Export CSV</button></div>
      <div className="row" style={{ marginBottom: 14 }}>
        <DebouncedInput style={{ width: 200 }} id="dq" placeholder="Search deals" value={d.q} onCommit={(v) => { d.q = v; render(); }} />
        <select className="input" style={{ width: 'auto' }} id="dtype" value={d.type} onChange={set('type')}><option value="">All types</option><option>Platform acquisition</option><option>Add-on acquisition</option></select>
        <select className="input" style={{ width: 'auto' }} id="dsector" value={d.sector} onChange={set('sector')}><option value="">All sectors</option>{INDUSTRIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select className="input" style={{ width: 'auto' }} id="dcity" value={d.city} onChange={set('city')}><option value="">All cities</option>{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select className="input" style={{ width: 'auto' }} id="dstatus" value={d.status} onChange={set('status')}><option value="">All statuses</option>{['announced', 'signed', 'closed'].map((x) => <option key={x} value={x}>{cap1(x)}</option>)}</select>
        <select className="input" style={{ width: 'auto' }} id="dgp" value={d.gp} onChange={set('gp')}><option value="">All GPs</option>{FIRMS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        {d.type || d.sector || d.city || d.status || d.gp || d.q ? <button className="btn sm ghost" id="dreset" onClick={() => { ui.deals = { type: '', sector: '', city: '', status: '', gp: '', q: '' }; render(); }}>Reset</button> : null}
      </div>
      <div className="muted" style={{ marginBottom: 8 }}>{list.length} deal{list.length === 1 ? '' : 's'}</div>
      {list.length ? (
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th className="ns">Date</th><th className="ns">Deal</th><th className="ns">GP</th><th className="ns">Company</th><th className="ns">Sector</th><th className="ns">City</th><th className="ns">Status</th><th className="ns">Source</th></tr></thead>
          <tbody>{list.map((x) => (
            <tr key={x.id}>
              <td className="nowrap">{fmtDate(x.date)}</td>
              <td><Link className="firm" href={dealHref(x.id)}>{x.headline}</Link><div className="muted">{x.type}</div></td>
              <td><Link href={firmHref(x.gp)}>{byId(x.gp)!.name}</Link></td>
              <td>{x.company}</td><td>{x.sector}</td><td>{x.city}</td>
              <td><DealStatusTag s={x.status} /></td>
              <td><a href={x.source.url!} target="_blank" rel="noopener">link</a></td>
            </tr>
          ))}</tbody></table></div>
      ) : <div className="empty"><b>No deals match these filters</b>Try removing a filter.</div>}
    </>
  );
}

export function Deal({ id }: { id: string }) {
  useStore();
  const d = dealById(id);
  if (!d) return <div className="empty"><b>Deal not found</b><Link href="/deals">Back to deals</Link></div>;
  const f = firm(d.gp)!;
  const related = DEALS.filter((x) => x.id !== d.id && (x.gp === d.gp || x.sector === d.sector)).slice(0, 5);
  const news = NEWS.filter((n) => n.firm === d.gp).slice(0, 3);
  return (
    <div className="article">
      <div className="kicker muted">{d.type} · {fmtDate(d.date)} · {d.city} · {d.sector}</div>
      <h1>{d.headline}</h1>
      <div className="fact-grid">
        <div><span>GP / investor</span><Link href={firmHref(f.id)}>{f.name}</Link></div>
        <div><span>Company</span>{d.company}</div>
        <div><span>Buyer</span>{d.buyer}</div>
        <div><span>Seller</span>{d.seller}</div>
        <div><span>Status</span><DealStatusTag s={d.status} /></div>
        <div><span>Sector</span>{d.sector}</div>
        <div><span>City</span>{d.city}</div>
        <div><span>Source</span><a href={d.source.url!} target="_blank" rel="noopener">{d.source.label}</a> · retrieved {fmtDate(d.source.date)}</div>
      </div>
      <div className="facts"><h4>Reported</h4><p style={{ margin: 0 }}>{d.summary} Financial terms were not disclosed.</p></div>
      <div className="sec" style={{ marginTop: 28 }}><h3>Related firm</h3>
        <div className="lp-card">
          <div><div className="n"><Link href={firmHref(f.id)}>{f.name}</Link> <TypeTag t={f.type} /></div><div className="muted">{f.city} · {CAP_LABEL[f.cap]} · target EBITDA {range(f.eb)}</div></div>
          <div className="row"><Link className="btn sm" href={firmHref(f.id)}>View profile</Link><button className="btn sm red" onClick={() => connectionForm({ targetType: 'gp', targetId: f.id, targetName: f.name })}>Request a connection</button></div>
        </div>
      </div>
      {related.length ? (
        <div className="sec"><h3>Related deals</h3><div className="list">{related.map((x) => (
          <div className="item" key={x.id}><span className="date">{fmtDate(x.date)}</span><div className="body"><Link href={dealHref(x.id)}><b>{x.headline}</b></Link> <DealStatusTag s={x.status} /><div className="muted">{byId(x.gp)!.name} · {x.sector} · {x.city}</div></div></div>
        ))}</div></div>
      ) : null}
      {news.length ? (
        <div className="sec"><h3>Related news</h3><div className="story-list">{news.map((n) => (
          <div className="st" key={n.id}><div className="muted" style={{ fontSize: 12.5 }}>{fmtDate(n.date)} · {NEWS_TL[n.type]}</div><h4><Link href={articleHref(n.id)}>{n.headline}</Link></h4></div>
        ))}</div></div>
      ) : null}
      <p><Link href="/deals">← All deals</Link></p>
    </div>
  );
}
