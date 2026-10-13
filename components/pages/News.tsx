'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { byId, CAP_LABEL, CITIES, DEALS, INDUSTRIES, NEWS, NEWS_TL, newsById } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import { articleHref, dealHref, firmHref } from '@/lib/routes';
import { firm, render, useStore } from '@/lib/store';
import { DealStatusTag, DebouncedInput, SourceLink, TypeTag } from '@/components/ui';
import type { PageQuery } from '@/lib/query';

export function News({ q, qs }: PageQuery) {
  const { ui } = useStore();
  const router = useRouter();
  // A ?type= link (from the nav) resets the filters once per distinct query.
  if (q.type && ui.news._lastQs !== qs) ui.news = { type: q.type, city: '', sector: '', q: '', _lastQs: qs };
  const n = ui.news;
  const list = NEWS.filter((x) => (!n.type || x.type === n.type) && (!n.city || x.city === n.city) && (!n.sector || x.sector === n.sector) && (!n.q || (x.headline + ' ' + x.summary).toLowerCase().includes(n.q.toLowerCase())));
  const set = (k: 'type' | 'city' | 'sector') => (e: React.ChangeEvent<HTMLSelectElement>) => { n[k] = e.target.value; render(); };
  return (
    <>
      <div className="page-head"><div><h1>News</h1><p>Deals, fundraises, GP firm activity and people moves across Texas private capital. Dated, sourced, with reporting separated from commentary.</p></div><Link className="btn sm" href="/newsletter">Get the weekly briefing</Link></div>
      <div className="row" style={{ marginBottom: 16 }}>
        <DebouncedInput style={{ width: 220 }} id="nq" placeholder="Search news" value={n.q} onCommit={(v) => { n.q = v; render(); }} />
        <select className="input" style={{ width: 'auto' }} id="ntype" value={n.type} onChange={set('type')}><option value="">All types</option>{Object.entries(NEWS_TL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input" style={{ width: 'auto' }} id="ncity" value={n.city} onChange={set('city')}><option value="">All cities</option>{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select className="input" style={{ width: 'auto' }} id="nsector" value={n.sector} onChange={set('sector')}><option value="">All sectors</option>{INDUSTRIES.map((c) => <option key={c}>{c}</option>)}</select>
        {n.type || n.city || n.sector || n.q ? <button className="btn sm ghost" id="nreset" onClick={() => { ui.news = { type: '', city: '', sector: '', q: '', _lastQs: '' }; router.push('/news'); render(); }}>Reset</button> : null}
      </div>
      {list.length ? (
        <div className="story-list" style={{ maxWidth: 860 }}>{list.map((x) => (
          <div className="st" style={{ padding: '16px 0' }} key={x.id}>
            <div className="kicker" style={{ fontSize: 12.5, color: 'var(--slate)' }}><span className={`ev-type ${x.type}`} style={{ margin: '0 6px 0 0' }}>{NEWS_TL[x.type]}</span>{fmtDate(x.date)} · {x.city} · {x.sector}</div>
            <h4 style={{ fontSize: 19 }}><Link href={articleHref(x.id)}>{x.headline}</Link></h4>
            <div style={{ color: 'var(--ink-2)' }}>{x.summary}</div>
            <div className="muted" style={{ marginTop: 3 }}>Source: <SourceLink source={x.source} /> · <Link href={firmHref(x.firm)}>{byId(x.firm)!.name}</Link></div>
          </div>
        ))}</div>
      ) : <div className="empty"><b>No news matches these filters</b>Try removing a filter.</div>}
    </>
  );
}

export function Article({ id }: { id: string }) {
  useStore();
  const a = newsById(id);
  if (!a) return <div className="empty"><b>Article not found</b><Link href="/news">Back to news</Link></div>;
  const f = firm(a.firm)!;
  const related = DEALS.filter((d) => d.gp === a.firm).slice(0, 4);
  const more = NEWS.filter((n) => n.id !== a.id && (n.firm === a.firm || n.sector === a.sector)).slice(0, 4);
  return (
    <div className="article">
      <div className="kicker muted"><span className={`ev-type ${a.type}`} style={{ margin: '0 6px 0 0' }}>{NEWS_TL[a.type]}</span>Published {fmtDate(a.date)} · {a.city} · {a.sector}</div>
      <h1>{a.headline}</h1>
      <div className="fact-grid">
        <div><span>GP / investor</span><Link href={firmHref(f.id)}>{f.name}</Link></div>
        <div><span>Event type</span>{NEWS_TL[a.type]}</div>
        <div><span>City</span>{a.city}</div>
        <div><span>Sector</span>{a.sector}</div>
        <div><span>Source</span><SourceLink source={a.source} /></div>
        <div><span>Source retrieved</span>{fmtDate(a.source.date)}</div>
      </div>
      <p style={{ fontSize: 17 }}>{a.summary}</p>
      <div className="facts"><h4>Reported</h4><p style={{ margin: 0 }}>{a.facts}</p></div>
      <div className="comm"><h4>Texas Private Capital commentary</h4><p style={{ margin: 0 }}>{a.commentary}</p></div>
      <div className="sec" style={{ marginTop: 28 }}><h3>Related firm</h3>
        <div className="lp-card"><div><div className="n"><Link href={firmHref(f.id)}>{f.name}</Link> <TypeTag t={f.type} /></div><div className="muted">{f.city} · {f.ind.slice(0, 3).join(', ')} · {CAP_LABEL[f.cap]}</div></div><Link className="btn sm" href={firmHref(f.id)}>View profile</Link></div>
      </div>
      {related.length ? (
        <div className="sec"><h3>Related deals</h3><div className="list">{related.map((d) => (
          <div className="item" key={d.id}><span className="date">{fmtDate(d.date)}</span><div className="body"><Link href={dealHref(d.id)}><b>{d.headline}</b></Link> <DealStatusTag s={d.status} /><div className="muted">{d.sector} · {d.city}</div></div></div>
        ))}</div></div>
      ) : null}
      {more.length ? (
        <div className="sec"><h3>More coverage</h3><div className="story-list">{more.map((n) => (
          <div className="st" key={n.id}><div className="muted" style={{ fontSize: 12.5 }}>{fmtDate(n.date)} · {NEWS_TL[n.type]}</div><h4><Link href={articleHref(n.id)}>{n.headline}</Link></h4></div>
        ))}</div></div>
      ) : null}
      <p><Link href="/news">← All news</Link></p>
    </div>
  );
}
