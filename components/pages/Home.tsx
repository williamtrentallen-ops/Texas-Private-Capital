'use client';
import Link from 'next/link';
import { DEALS, FIRMS, INDUSTRIES, LPS, NEWS, NEWS_TL } from '@/lib/data';
import { cap1, fmtDate } from '@/lib/format';
import { articleHref, dealHref } from '@/lib/routes';
import { render, useStore } from '@/lib/store';
import { Signup } from '@/components/modals';
import { SourceLink } from '@/components/ui';

export default function Home() {
  const { ui } = useStore();
  const homeDeal = ui.homeDeal;
  const lead = NEWS[0], rest = NEWS.slice(1, 7);
  const deals = DEALS.filter((d) => (!homeDeal.type || d.type === homeDeal.type) && (!homeDeal.sector || d.sector === homeDeal.sector)).slice(0, 8);
  return (
    <div className="container">
      <section className="masthead">
        <div>
          <h1>Know what’s happening in Texas private capital — and find the right people to move your next deal forward.</h1>
          <p className="lead">Texas Private Capital tracks deals, funds, and firms across the state, then helps GPs, LPs, and business owners find relevant connections.</p>
          <div className="row"><Link className="btn primary" href="/news">Read the news</Link><Link className="btn" href="/gps">Browse GPs</Link><Link className="btn" href="/lps">Browse LPs</Link></div>
        </div>
        <Signup compact />
      </section>
      <div className="home-grid2">
        <section className="sect"><div className="head"><h2>Latest news</h2><Link href="/news">All news</Link></div>
          <div className="lead-story">
            <div className="story">
              <div className="kicker"><span className={`ev-type ${lead.type}`} style={{ margin: 0 }}>{NEWS_TL[lead.type]}</span><span>{fmtDate(lead.date)}</span><span>{lead.city}</span><span>{lead.sector}</span></div>
              <h3><Link href={articleHref(lead.id)}>{lead.headline}</Link></h3>
              <p>{lead.summary}</p>
              <div className="muted">Source: <SourceLink source={lead.source} /></div>
            </div>
            <div className="story-list">{rest.map((n) => (
              <div className="st" key={n.id}>
                <div className="kicker" style={{ fontSize: 12.5, color: 'var(--slate)' }}><span className={`ev-type ${n.type}`} style={{ margin: '0 6px 0 0' }}>{NEWS_TL[n.type]}</span>{fmtDate(n.date)} · {n.city}</div>
                <h4><Link href={articleHref(n.id)}>{n.headline}</Link></h4>
              </div>
            ))}</div>
          </div>
        </section>
        <section className="sect"><div className="head"><h2>Deals</h2><Link href="/deals">All deals</Link></div>
          <div className="panel-w">
            <div className="row" style={{ marginBottom: 8 }}>
              <select className="input" style={{ width: 'auto', flex: 1 }} id="hdType" value={homeDeal.type} onChange={(e) => { homeDeal.type = e.target.value; render(); }}>
                <option value="">All deal types</option><option>Platform acquisition</option><option>Add-on acquisition</option>
              </select>
              <select className="input" style={{ width: 'auto', flex: 1 }} id="hdSector" value={homeDeal.sector} onChange={(e) => { homeDeal.sector = e.target.value; render(); }}>
                <option value="">All sectors</option>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>
            {deals.length ? (
              <div className="list">{deals.slice(0, 7).map((d) => (
                <div className="item" style={{ padding: '9px 0' }} key={d.id}>
                  <span className="date" style={{ minWidth: 76 }}>{fmtDate(d.date)}</span>
                  <div className="body" style={{ fontSize: 13.5 }}><Link className="firm" href={dealHref(d.id)}><b>{d.headline}</b></Link><div className="muted">{d.sector} · {d.city} · {cap1(d.status)}</div></div>
                </div>
              ))}</div>
            ) : <div className="empty"><b>No deals match</b>Try another type or sector.</div>}
          </div>
        </section>
      </div>
      <section className="sect"><div className="head"><h2>Find your path</h2></div>
        <div className="paths">
          <Link href="/gps?path=lp"><b>GP seeking LPs</b><span>Describe your fund and sectors to see LPs whose stated interests may fit, then request a connection.</span><em>Start as a GP</em></Link>
          <Link href="/lps?path=gp"><b>LP seeking GPs</b><span>Set your strategy and sector interests to discover Texas GPs with matching criteria and recent activity.</span><em>Start as an LP</em></Link>
          <Link href="/owners"><b>Business owner seeking a GP</b><span>Enter your company’s sector, size and transaction goal to find GPs that invest in businesses like yours.</span><em>Start as a business owner</em></Link>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>Matches are based on stated criteria. Requesting a connection is not a guaranteed introduction or fundraising outcome.</p>
      </section>
      <section className="sect"><div className="head"><h2>Directory</h2></div><div className="entry2">
        <div className="e"><h3><Link href="/gps">GPs</Link></h3><p>Private equity firms, family offices and independent sponsors headquartered in Texas, with investment criteria, capital model, team, portfolio and sources — each field labeled by how it was confirmed.</p><Link href="/gps">Explore {FIRMS.length} GPs</Link></div>
        <div className="e"><h3><Link href="/lps">LPs</Link></h3><p>Pensions, endowments, foundations, insurers, family offices and funds of funds with relevant public activity and, where provided directly, confirmed investment interests.</p><Link href="/lps">Explore {LPS.length} LPs</Link></div>
      </div></section>
      <section className="howstrip"><h2>How it works</h2><div className="cols">
        <div><h3>News</h3><p>A weekly briefing and a running feed of Texas deals, fundraises and firm activity. Every item carries a publication date and a link to the original source; reported facts are kept separate from our commentary.</p></div>
        <div><h3>Research</h3><p>GP and LP profiles built from public sources and direct confirmations, with each field labeled firm-confirmed, publicly sourced, inferred or not disclosed. Fields are omitted when reliable information isn’t available.</p></div>
        <div><h3>Connections</h3><p>Matching ranks counterparties by stated criteria and shows its work. Connection requests are reviewed by our team before any outreach; confidential details stay private.</p></div>
      </div><Link href="/how" style={{ fontWeight: 600, display: 'inline-block', marginTop: 14 }}>Read more about how we work</Link></section>
    </div>
  );
}
