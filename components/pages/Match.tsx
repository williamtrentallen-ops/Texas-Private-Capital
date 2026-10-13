'use client';
import Link from 'next/link';
import { useState } from 'react';
import { CAP_LABEL, INDUSTRIES, TYPE_LABEL } from '@/lib/data';
import { csv, download, fmtDate } from '@/lib/format';
import { matchFirm, RULES, type DealInput, type FirmMatch } from '@/lib/matching';
import { firmHref } from '@/lib/routes';
import { ALL, render, S, save, toast, toggleSave, useStore, type UI } from '@/lib/store';
import { addToListUI, connectionForm, gate } from '@/components/modals';
import { StatusTag, TypeTag } from '@/components/ui';

const BLANK: DealInput = { ind: '', desc: '', loc: '', rev: '', ebitda: '' as unknown as number, equity: '' as unknown as number, ctrl: 'control', deal: 'platform', isSponsor: false };

export function Match() {
  const { ui } = useStore();
  const [pending, setPending] = useState(false);
  const d = ui.match.deal || BLANK;
  const res = ui.match.results;
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!gate('Deal matching')) return;
    const fd = new FormData(e.currentTarget);
    const deal: DealInput = { ind: String(fd.get('ind')), desc: String(fd.get('desc')), loc: String(fd.get('loc')), rev: +(fd.get('rev') as string) || '', ebitda: +(fd.get('ebitda') as string), equity: +(fd.get('equity') as string), ctrl: String(fd.get('ctrl')), deal: String(fd.get('deal')), isSponsor: fd.get('isSponsor') === 'on' };
    ui.match.deal = deal;
    setPending(true);
    setTimeout(() => {
      ui.match.results = ALL().map((f) => matchFirm(f, deal)).sort((a, b) => b.pct - a.pct || b.score - a.score);
      setPending(false);
      render();
    }, 400);
  };
  const saveShortlist = () => {
    const name = `${d.ind} · $${d.ebitda}M EBITDA · ${fmtDate(new Date())}`;
    S.matches.push({ id: 'm' + Date.now(), name, deal: d, results: res!.filter((x) => !x.disq).slice(0, 15).map((x) => ({ id: x.f.id, pct: x.pct, matched: x.matched, missing: x.missing, conflicts: x.conflicts })), date: new Date().toISOString() });
    save();
    toast('Shortlist saved — see Saved Lists');
  };
  const exportCsv = () => {
    download('deal-shortlist-demo.csv', csv([['Rank', 'Firm', 'Type', 'HQ', 'Criteria score (%)', 'Matched criteria', 'Conflicts', 'Missing information', 'Suggested contact', 'Contact email'], ...res!.filter((x) => !x.disq).map((x, i) => [i + 1, x.f.name, TYPE_LABEL[x.f.type], x.f.city, x.pct, x.matched.join(' | '), x.conflicts.join(' | '), x.missing.join(' | '), x.f.team[0].name + ' (' + x.f.team[0].title + ')', x.f.team[0].email])]));
    toast('Shortlist exported');
  };
  return (
    <>
      <div className="page-head"><div><h1>Find a GP for your company</h1><p>Describe the company and we rank GPs by how many stated criteria they match. Missing criteria never count as a match, and the score is not a probability of closing. What you enter here is kept private to this request and is never shown on a public profile.</p></div></div>
      <div className="match-grid">
        <form className="card" id="mform" onSubmit={onSubmit}>
          <div className="field"><label className="lbl">Industry</label><select className="input" name="ind" required defaultValue={d.ind}><option value="">Select…</option>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select></div>
          <div className="field"><label className="lbl">Business description</label><textarea className="input" name="desc" placeholder="What the company does, customers, growth…" defaultValue={d.desc} /></div>
          <div className="field"><label className="lbl">Company location</label><input className="input" name="loc" placeholder="City, State" defaultValue={d.loc} /></div>
          <div className="grid2">
            <div className="field"><label className="lbl">Revenue ($M)</label><input className="input" type="number" step="0.1" min="0" name="rev" defaultValue={d.rev} /></div>
            <div className="field"><label className="lbl">EBITDA ($M)</label><input className="input" type="number" step="0.1" min="0" name="ebitda" required defaultValue={d.ebitda} /></div>
          </div>
          <div className="field"><label className="lbl">Equity required ($M)</label><input className="input" type="number" step="0.5" min="0" name="equity" required defaultValue={d.equity} /></div>
          <div className="grid2">
            <div className="field"><label className="lbl">Transaction</label><select className="input" name="ctrl" defaultValue={d.ctrl}><option value="control">Control</option><option value="minority">Minority</option></select></div>
            <div className="field"><label className="lbl">Deal type</label><select className="input" name="deal" defaultValue={d.deal}><option value="platform">Platform</option><option value="add-on">Add-on</option></select></div>
          </div>
          <label className="chk"><input type="checkbox" name="isSponsor" defaultChecked={d.isSponsor} /> I am an independent sponsor</label>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" type="submit">Find investors</button>
            {res ? <><button className="btn" type="button" id="mSave" onClick={saveShortlist}>Save shortlist</button><button className="btn" type="button" id="mExport" onClick={exportCsv}>Export CSV</button></> : null}
          </div>
          <details style={{ marginTop: 14, fontSize: 13, color: 'var(--slate)' }}><summary>How matching works</summary>
            <ul style={{ paddingLeft: 16, margin: '6px 0' }}>
              {RULES.map((r) => <li key={r.k}>{r.label}: {r.w} points when the deal falls within the firm&apos;s stated criterion</li>)}
              <li>Firms whose stated industries exclude yours are listed separately as non-matches.</li>
              <li>Undisclosed criteria earn 0 points and are listed as missing information.</li>
              <li>Paused mandates and listed exclusions are flagged as conflicts.</li>
            </ul>
          </details>
        </form>
        <div id="mres">{pending ? (
          <div className="card"><div className="skeleton" style={{ width: '40%' }} /><br /><div className="skeleton" /><br /><div className="skeleton" style={{ width: '70%' }} /></div>
        ) : res ? <MatchResults res={res} ui={ui} /> : <div className="empty"><b>Enter a deal to see a ranked shortlist</b>Each result explains which criteria match, which are missing and who to contact.</div>}</div>
      </div>
    </>
  );
}

function MatchResults({ res, ui }: { res: FirmMatch[]; ui: UI }) {
  const deal = ui.match.deal!;
  const fits = res.filter((x) => !x.disq), non = res.filter((x) => x.disq);
  const card = (x: FirmMatch) => {
    const f = x.f;
    const contacts = f.team.filter((p) => p.focus === deal.ind).slice(0, 2);
    const cs = contacts.length ? contacts : f.team.slice(0, 2);
    const saved = S.saved.includes(f.id);
    return (
      <div className="mcard" key={f.id}>
        <div className="mh">
          <div><Link className="firm" href={firmHref(f.id)} style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>{f.name}</Link> <TypeTag t={f.type} /> <StatusTag s={f.status} /><div className="muted">{f.city} · {CAP_LABEL[f.cap]} · {f.conf ? 'confirmed ' + fmtDate(f.conf) : 'not firm-confirmed'}</div></div>
          <div style={{ textAlign: 'right' }}><div className="score">{x.pct}%</div><div className="muted">of stated criteria<br />{x.score}/{x.max} pts</div></div>
        </div>
        <div className="bar"><i style={{ width: `${x.pct}%` }} /></div>
        <div className="mcols">
          <div>
            <h4 className="ok">Why it fits</h4><ul>{x.matched.length ? x.matched.map((m) => <li key={m}>{m}</li>) : <li className="muted">No stated criteria match</li>}</ul>
            {x.evidence.length ? <><h4 style={{ marginTop: 8 }}>Transaction evidence</h4><ul>{x.evidence.map((t) => <li key={t.date + t.target}>{fmtDate(t.date)}: {t.note}</li>)}</ul></> : null}
          </div>
          <div>
            {x.conflicts.length ? <><h4 className="bad">Conflicts</h4><ul>{x.conflicts.map((m) => <li key={m}>{m}</li>)}</ul></> : null}
            {x.missing.length ? <><h4 className="warn" style={{ marginTop: x.conflicts.length ? 8 : 0 }}>Missing information</h4><ul>{x.missing.map((m) => <li key={m}>{m}</li>)}</ul></> : null}
            <h4 style={{ marginTop: 8 }}>Suggested contacts</h4><ul>{cs.map((p) => <li key={p.email}>{p.name}, {p.title} — <a href={`mailto:${p.email}`}>{p.email}</a></li>)}</ul>
          </div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className={`btn xs ${saved ? 'on' : ''}`} onClick={() => toggleSave(f.id)}>{saved ? 'Saved' : 'Save'}</button>
          <button className="btn xs" onClick={() => addToListUI([f.id])}>Add to list</button>
          <button className="btn xs red" onClick={() => connectionForm({ targetType: 'gp', targetId: f.id, targetName: f.name, role: 'Business owner' })}>Express interest</button>
        </div>
      </div>
    );
  };
  return (
    <>
      <div className="muted" style={{ marginBottom: 8 }}>{fits.length} investor{fits.length === 1 ? '' : 's'} state {deal.ind} as a focus; {non.length} do not and are listed below as non-matches.</div>
      {fits.length ? fits.map(card) : <div className="empty"><b>No investors list this industry</b>Try a related industry, or browse the directory.</div>}
      <details style={{ marginTop: 14 }}><summary className="muted">Show {non.length} non-matching firms (industry not stated)</summary>{non.slice(0, 10).map(card)}</details>
    </>
  );
}

export function Owners() {
  const { ui } = useStore();
  if (ui.match.results || ui.match.deal) return <Match />;
  return (
    <>
      <div className="page-head"><div><h1>Business owners</h1><p>Find Texas GPs that invest in companies like yours — by sector, size, location and transaction goal — and express interest in a conversation.</p></div></div>
      <div className="entry2" style={{ marginBottom: 28 }}>
        <div className="e"><h3>How it works</h3><p>Enter a few facts about your company. We rank GPs by how many of their stated criteria your company meets, show exactly which criteria matched and which didn&apos;t, and list the people who cover your sector. Nothing you enter is published.</p></div>
        <div className="e"><h3>What to expect</h3><p>Expressing interest sends a request to our team, who review fit before any outreach. It is not a guaranteed introduction, and a match score is not a probability of completing a transaction.</p></div>
      </div>
      <div className="card" style={{ maxWidth: 720 }}><h3>Your company</h3><p className="muted">Kept private to this request.</p><div className="row"><Link className="btn primary" href="/match">Describe your company and find GPs</Link><Link className="btn" href="/gps">Browse all GPs first</Link></div></div>
    </>
  );
}
