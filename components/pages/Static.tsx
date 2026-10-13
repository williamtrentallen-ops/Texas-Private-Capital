'use client';
// How it works, Plans, Newsletter and Fundraising.
import Link from 'next/link';
import { ALL, isPaid, render, S, save, toast, useStore } from '@/lib/store';
import { FUNDRAISING, NEWS } from '@/lib/data';
import { fmtDate, range } from '@/lib/format';
import { articleHref, firmHref } from '@/lib/routes';
import { connectionForm, showUpgrade, Signup } from '@/components/modals';
import { StatusTag } from '@/components/ui';

const HOW_STEPS: [string, string][] = [
  ['News is reported from sources and dated', 'Each item in the news feed and the weekly briefing carries a publication date, the original source link, and a clear line between what was reported and what is our commentary.'],
  ['Investors are profiled from public sources', 'Each firm record starts with its own website and public announcements. Every field carries a source link and a retrieval date, so you can see where a figure came from and how old it is.'],
  ['Firms confirm their criteria directly', 'Where a firm has reviewed its profile, the specific fields it confirmed are marked firm-confirmed and dated. Confirmation is recorded per field; one confirmed detail never implies the whole profile is verified.'],
  ['Fields are labeled by how we know them', 'Four states appear throughout: firm-confirmed, publicly sourced, inferred (for example, a check size estimated from past deals) and not disclosed. Inferred values are never presented as facts.'],
  ['You search the way you evaluate a deal', 'Filter by investor type, headquarters and other Texas offices, industry and subsector, target EBITDA, equity check, control or minority, platform or add-on, capital model, mandate status and confirmation date. Where a firm is located is kept separate from where it invests.'],
  ['Deal matching shows its work', 'Enter a company and the platform ranks investors by how many stated criteria they match, lists what matched, what conflicts and what the firm has not disclosed. Undisclosed criteria never count as a match, and the score is not a probability of closing.'],
  ['Market activity tells you why now', 'Acquisitions, fund closes, team changes and mandate updates are dated and sourced. “Why this may matter” separates the sourced fact from the inferred business-development opportunity.'],
];

export function How() {
  return (
    <>
      <div className="page-head"><div><h1>How Texas Private Capital works</h1><p>A news and intelligence platform for Texas private markets: a source-backed weekly publication, GP and LP research, and connection tools for GPs, LPs and business owners.</p></div></div>
      <div className="how">
        {HOW_STEPS.map(([h, t], i) => (
          <div className="step" key={h}><div className="n">{i + 1}</div><div><h3>{h}</h3><p className="muted" style={{ fontSize: 14.5, color: 'var(--ink-2)' }}>{t}</p></div></div>
        ))}
        <div style={{ padding: '24px 0' }}>
          <h3 style={{ marginBottom: 8 }}>Free and paid access</h3>
          <p style={{ color: 'var(--ink-2)' }}>News, the newsletter, directory browsing, firm summaries, portfolio history and the activity feed are free. Detailed criteria, contacts, deal matching, exports and alerts are part of the paid plan. <Link href="/pricing">See plans</Link>.</p>
          <h3 style={{ margin: '18px 0 8px' }}>Corrections</h3>
          <p style={{ color: 'var(--ink-2)' }}>Investors and users can report a correction from any firm profile. Reports go to the research queue and, once verified, are published with the change retained in history.</p>
          <div className="row" style={{ marginTop: 18 }}><Link className="btn primary" href="/gps">Explore Firms</Link><Link className="btn" href="/match">Find Investors for a Deal</Link></div>
        </div>
      </div>
    </>
  );
}

export function Pricing() {
  useStore();
  const p = S.pricing;
  const paid = isPaid();
  return (
    <>
      <div className="page-head"><div><h1>Plans</h1><p>Free for browsing; paid for the detail that drives outreach. Prices are editable in Admin → Pricing. <span className="tag demo">Demonstration — no payments are processed</span></p></div></div>
      <div className="plans">
        <div className="plan"><h3>Free</h3><div className="price">${p.free}<small>/month</small></div>
          <ul><li>Directory browsing with filters</li><li>Firm summaries and public criteria</li><li>Portfolio and transaction history</li><li>Market activity feed</li><li>Save firms and build lists</li></ul>
          {paid ? <button className="btn" onClick={() => { S.plan = 'free'; save(); render(); toast('Demo: switched to free plan'); }}>Switch to free (demo)</button> : <span className="tag active">Current plan</span>}
        </div>
        <div className="plan hl"><h3>Professional</h3><div className="price">${p.pro}<small>/user/month</small></div>
          <ul><li>Everything in Free</li><li>Detailed criteria, exclusions and current priorities</li><li>Team contacts with business details</li><li>Deal matching with ranked shortlists</li><li>CSV exports of firms and shortlists</li><li>Alerts by firm, sector, city and event type</li><li>Independent sponsor preferences</li></ul>
          <div className="muted" style={{ marginBottom: 10 }}>Team plan: ${p.team}/month for up to 5 users.</div>
          {paid ? <span className="tag active">Current plan (demo)</span> : <button className="btn green" onClick={() => showUpgrade('Professional plan')}>Upgrade (demo flow)</button>}
        </div>
      </div>
    </>
  );
}

const ISSUE: [string, string][] = [
  ['Deals and exits', 'Texas private-equity platform and add-on acquisitions, recapitalizations and exits, with source links.'],
  ['Fund launches and closes', 'First closes, final closes and new vehicles from GPs headquartered or active in Texas.'],
  ['GP firm activity and team changes', 'New firms, office openings, senior hires and promotions.'],
  ['Notable developments', 'Regulatory, LP and market developments that affect Texas private capital.'],
];

export function Newsletter() {
  useStore();
  const n = S.subscribers.length;
  return (
    <>
      <div className="page-head"><div><h1>Newsletter</h1><p>A weekly briefing on Texas private capital, written from sourced reporting.</p></div></div>
      <div className="match-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 380px' }}>
        <div>
          <h3 style={{ marginBottom: 8 }}>What&apos;s in each issue</h3>
          <div className="list" style={{ maxWidth: 640 }}>{ISSUE.map(([h, t]) => <div className="item" key={h}><div className="body"><b>{h}</b><div style={{ color: 'var(--ink-2)' }}>{t}</div></div></div>)}</div>
          <h3 style={{ margin: '22px 0 8px' }}>Sending status</h3>
          <p style={{ color: 'var(--ink-2)', maxWidth: 640 }}>Signups are collected now. Delivery begins when an email provider (for example Resend, Postmark or Mailchimp) is connected under Admin → Integrations; until then no emails are sent. {n} address{n === 1 ? '' : 'es'} collected in this browser so far.</p>
        </div>
        <Signup compact={false} />
      </div>
    </>
  );
}

export function Fundraising() {
  useStore();
  const dbd = ALL().filter((f) => f.cap === 'deal-by-deal');
  const paid = isPaid();
  const fundNews = NEWS.filter((n) => n.type === 'fund');
  return (
    <>
      <div className="page-head"><div><h1>Fundraising</h1><p>Fund closes and vehicles disclosed by Texas GPs, plus sponsors raising equity deal by deal. Dated and sourced; nothing here implies a fund is currently open to new commitments unless the firm has said so.</p></div><Link className="btn sm" href="/lps">Find LPs</Link></div>
      <div className="sec"><h3>Committed funds, most recent first</h3><div className="tbl-wrap"><table className="tbl">
        <thead><tr><th className="ns">GP</th><th className="ns">Vehicle</th><th className="ns">Size</th><th className="ns">Vintage</th><th className="ns">Strategy</th><th className="ns">HQ</th><th className="ns">Mandate</th><th className="ns">Source</th><th className="ns" /></tr></thead>
        <tbody>{FUNDRAISING.map((x) => (
          <tr key={x.f.id}>
            <td><Link className="firm" href={firmHref(x.f.id)}>{x.f.name}</Link></td><td>{x.fundName}</td><td className="nowrap">{x.size}</td><td>{x.year}</td><td>{x.f.ind.slice(0, 2).join(', ')}</td><td>{x.f.city}</td><td><StatusTag s={x.f.status} /></td>
            <td>{x.event ? <a href={x.event.source.url!} target="_blank" rel="noopener">link</a> : <span className="muted">firm website</span>}</td>
            <td><button className="btn xs red" onClick={() => connectionForm({ targetType: 'gp', targetId: x.f.id, targetName: x.f.name, role: 'LP' })}>Request a connection</button></td>
          </tr>
        ))}</tbody>
      </table></div></div>
      <div className="sec"><h3>Raising deal by deal</h3><p className="muted">Independent sponsors that source transactions first and raise equity per deal. Current priorities are shown where the sponsor has confirmed them.</p>
        <div className="list">{dbd.map((f) => (
          <div className="item" key={f.id}>
            <div className="body"><Link href={firmHref(f.id)}><b>{f.name}</b></Link> <span className="muted">{`${f.city} · ${f.ind.join(', ')} · check ${range(f.chk)}`}</span>
              {paid ? <div style={{ color: 'var(--ink-2)' }}>{f.prio}{f.conf ? <> <span className="muted">(confirmed {fmtDate(f.conf)})</span></> : null}</div> : <div className="muted">Current priorities on the paid plan.</div>}
            </div>
            <Link className="btn xs" href={firmHref(f.id)}>Profile</Link>
          </div>
        ))}</div>
      </div>
      <div className="sec"><h3>Fund news</h3><div className="story-list" style={{ maxWidth: 760 }}>{fundNews.length ? fundNews.map((n) => (
        <div className="st" key={n.id}><div className="muted" style={{ fontSize: 12.5 }}>{fmtDate(n.date)} · {n.city}</div><h4><Link href={articleHref(n.id)}>{n.headline}</Link></h4></div>
      )) : <p className="muted">No fund news yet.</p>}</div></div>
    </>
  );
}

export function NotFound() {
  return <div className="empty"><b>Page not found</b>Use the navigation above to continue.</div>;
}
