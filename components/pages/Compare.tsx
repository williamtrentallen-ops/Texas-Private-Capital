'use client';
import Link from 'next/link';
import { Fragment } from 'react';
import { CAP_LABEL, DEALS } from '@/lib/data';
import { fmtDate, range } from '@/lib/format';
import { firmHref } from '@/lib/routes';
import { firm, isPaid, useStore } from '@/lib/store';
import type { Firm } from '@/lib/types';
import { addToListUI } from '@/components/modals';
import { SrcTag, StatusTag, Tags, TypeTag } from '@/components/ui';

export default function Compare() {
  const { ui } = useStore();
  const fs = ui.compare.map((id) => firm(id)).filter(Boolean) as Firm[];
  if (fs.length < 2) {
    return (
      <>
        <div className="page-head"><h1>Compare GPs</h1></div>
        <div className="empty"><b>Select two or three firms to compare</b>Tick Compare on any GP card or profile.<div style={{ marginTop: 10 }}><Link className="btn sm" href="/gps">Go to GPs</Link></div></div>
      </>
    );
  }
  const paid = isPaid();
  const muted = (t: string) => <span className="muted">{t}</span>;
  const rows: [string, (f: Firm) => React.ReactNode][] = [
    ['Investor type', (f) => <TypeTag t={f.type} />],
    ['Headquarters', (f) => f.city],
    ['Other Texas offices', (f) => f.offices.join(', ') || '—'],
    ['Invests in', (f) => f.geo.join(', ')],
    ['Industries', (f) => <Tags items={f.ind} />],
    ['Subsectors', (f) => f.sub.join(', ')],
    ['Target EBITDA', (f) => <>{range(f.eb)}<SrcTag fs={f.fs} k="eb" /></>],
    ['Equity check', (f) => <>{range(f.chk)}<SrcTag fs={f.fs} k="chk" /></>],
    ['Control / minority', (f) => f.ctrl.join(', ')],
    ['Platform / add-on', (f) => f.deal.join(', ')],
    ['Capital model', (f) => CAP_LABEL[f.cap]],
    ['Funds raised', (f) => (f.fund ? f.fund : 'No committed fund')],
    ['Past deals', (f) => DEALS.filter((d) => d.gp === f.id).length],
    ['Management', (f) => (paid ? f.team.slice(0, 3).map((p, i) => <Fragment key={p.email}>{i ? <br /> : null}{p.name} <span className="muted">({p.title})</span></Fragment>) : muted('Paid plan'))],
    ['Backs independent sponsors', (f) => (f.backsIS == null ? 'Not disclosed' : f.backsIS ? 'Yes' : 'No')],
    ['Mandate status', (f) => <StatusTag s={f.status} />],
    ['Current priorities', (f) => (paid ? f.prio : muted('Paid plan'))],
    ['Exclusions', (f) => f.excl.join(', ')],
    ['Last confirmed', (f) => fmtDate(f.conf)],
  ];
  return (
    <>
      <div className="page-head"><div><h1>Compare GPs</h1><p>Side-by-side criteria. Source status is shown per field.</p></div>
        <div className="row"><button className="btn sm" id="cmpList" onClick={() => addToListUI(ui.compare)}>Add all to list</button><Link className="btn sm" href="/gps">Back to GPs</Link></div>
      </div>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th className="ns" />{fs.map((f) => <th className="ns" key={f.id}><Link className="firm" href={firmHref(f.id)} style={{ fontSize: 15 }}>{f.name}</Link></th>)}</tr></thead>
        <tbody>{rows.map(([l, fn]) => <tr key={l}><td className="muted" style={{ whiteSpace: 'nowrap' }}>{l}</td>{fs.map((f) => <td key={f.id}>{fn(f)}</td>)}</tr>)}</tbody>
      </table></div>
    </>
  );
}
