'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TYPE_LABEL } from '@/lib/data';
import { csv, download, fmtDate, slug } from '@/lib/format';
import { matchFirm } from '@/lib/matching';
import { firmHref } from '@/lib/routes';
import { ALL, firm, render, S, save, toast, toggleSave, useStore } from '@/lib/store';
import type { Firm } from '@/lib/types';
import { addToListUI, gate } from '@/components/modals';
import { firmCsvRows } from '@/components/pages/GPs';
import { TypeTag } from '@/components/ui';

/** Text field that saves its note when it loses focus after a change. */
function NoteInput({ value, onSave, style, placeholder }: { value: string; onSave: (v: string) => void; style?: React.CSSProperties; placeholder: string }) {
  const [v, setV] = useState(value);
  return <input className="input" style={style} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={() => { if (v !== value) onSave(v); }} />;
}

export default function Lists() {
  const { ui } = useStore();
  const router = useRouter();
  const tabs: [string, string][] = [['saved', `Saved firms (${S.saved.length})`], ['lists', `Lists (${S.lists.length})`], ['matches', `Deal shortlists (${S.matches.length})`]];
  const [newName, setNewName] = useState('');
  let body: React.ReactNode;

  if (ui.listTab === 'saved') {
    const fs = S.saved.map((id) => firm(id)).filter(Boolean) as Firm[];
    body = fs.length ? (
      <>
        <div className="row" style={{ marginBottom: 10 }}>
          <button className="btn sm" id="svList" onClick={() => addToListUI(S.saved)}>Add all to a list</button>
          <button className="btn sm" id="svExport" onClick={() => {
            if (!gate('CSV export')) return;
            const rows = firmCsvRows(S.saved.map((id) => firm(id)!));
            rows[0].push('Note');
            rows.slice(1).forEach((r, i) => r.push(S.notes[S.saved[i]] || ''));
            download('saved-firms-demo.csv', csv(rows));
            toast('Exported');
          }}>Export CSV</button>
        </div>
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th className="ns">Firm</th><th className="ns">Location</th><th className="ns">Type</th><th className="ns">Sector focus</th><th className="ns">Your note</th><th className="ns" /></tr></thead>
          <tbody>{fs.map((f) => (
            <tr key={f.id}>
              <td><Link className="firm" href={firmHref(f.id)}>{f.name}</Link></td><td>{f.city}</td><td><TypeTag t={f.type} /></td><td>{f.ind.slice(0, 2).join(', ')}</td>
              <td style={{ minWidth: 200 }}><NoteInput value={S.notes[f.id] || ''} placeholder="Add a note" onSave={(v) => { S.notes[f.id] = v; save(); toast('Note saved'); }} /></td>
              <td><button className="btn xs danger" onClick={() => toggleSave(f.id)}>Remove</button></td>
            </tr>
          ))}</tbody></table></div>
      </>
    ) : <div className="empty"><b>No saved firms yet</b>Save firms from the directory or a profile to keep them here.<div style={{ marginTop: 10 }}><Link className="btn sm" href="/gps">Explore firms</Link></div></div>;
  } else if (ui.listTab === 'lists') {
    body = (
      <>
        <div className="row" style={{ marginBottom: 12 }}>
          <input className="input" style={{ width: 260 }} id="newListName" placeholder="New list name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn primary sm" id="newList" onClick={() => {
            const n = newName.trim();
            if (!n) return toast('Enter a list name');
            S.lists.push({ id: 'l' + Date.now(), name: n, firms: [], notes: {}, created: new Date().toISOString() });
            save(); setNewName(''); render(); toast('List created');
          }}>Create list</button>
        </div>
        {S.lists.length ? S.lists.map((l) => (
          <div className="card" style={{ marginBottom: 12 }} key={l.id}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div><h3 style={{ margin: 0 }}>{l.name}</h3><div className="muted">{l.firms.length} firm{l.firms.length === 1 ? '' : 's'} · created {fmtDate(l.created.slice(0, 10))}</div></div>
              <div className="row">
                <button className="btn xs" onClick={() => {
                  if (!gate('CSV export')) return;
                  const rows = firmCsvRows(l.firms.map((id) => firm(id)).filter(Boolean) as Firm[]);
                  rows[0].push('List note');
                  rows.slice(1).forEach((r, i) => r.push((l.notes || {})[l.firms[i]] || ''));
                  download(slug(l.name) + '-demo.csv', csv(rows));
                  toast('Exported');
                }}>Export CSV</button>
                <button className="btn xs" onClick={() => { const n = prompt('List name', l.name); if (n && n.trim()) { l.name = n.trim(); save(); render(); } }}>Rename</button>
                <button className="btn xs danger" onClick={() => { if (confirm('Delete this list?')) { S.lists = S.lists.filter((x) => x.id !== l.id); save(); render(); } }}>Delete list</button>
              </div>
            </div>
            {l.firms.length ? (
              <div className="list" style={{ marginTop: 8 }}>{l.firms.map((id) => {
                const f = firm(id);
                return f ? (
                  <div className="item" style={{ alignItems: 'center' }} key={id}>
                    <div className="body"><Link className="firm" href={firmHref(id)}><b>{f.name}</b></Link> <span className="muted">{f.city} · {TYPE_LABEL[f.type]}</span>
                      <NoteInput style={{ marginTop: 4, fontSize: 13 }} value={(l.notes || {})[id] || ''} placeholder="Note for this list" onSave={(v) => { l.notes = l.notes || {}; l.notes[id] = v; save(); toast('Note saved'); }} />
                    </div>
                    <button className="btn xs danger" onClick={() => { l.firms = l.firms.filter((x) => x !== id); save(); render(); }}>Remove</button>
                  </div>
                ) : null;
              })}</div>
            ) : <p className="muted" style={{ marginTop: 8 }}>Empty list. Add firms from the directory or a profile.</p>}
          </div>
        )) : <div className="empty"><b>No lists yet</b>Lists group firms for a specific process or client.</div>}
      </>
    );
  } else {
    body = S.matches.length ? S.matches.map((m) => (
      <div className="card" style={{ marginBottom: 12 }} key={m.id}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><h3 style={{ margin: 0 }}>{m.name}</h3><div className="muted">{m.deal.ctrl} · {m.deal.deal} · ${m.deal.equity}M equity{m.deal.isSponsor ? ' · independent sponsor' : ''}</div></div>
          <div className="row">
            <button className="btn xs" onClick={() => { ui.match = { deal: m.deal, results: ALL().map((f) => matchFirm(f, m.deal)).sort((a, b) => b.pct - a.pct) }; router.push('/match'); }}>Re-run</button>
            <button className="btn xs" onClick={() => {
              if (!gate('CSV export')) return;
              download('shortlist-demo.csv', csv([['Rank', 'Firm', 'Score (%)', 'Matched', 'Conflicts', 'Missing'], ...m.results.map((x, i) => [i + 1, firm(x.id)?.name, x.pct, x.matched.join(' | '), x.conflicts.join(' | '), x.missing.join(' | ')])]));
              toast('Exported');
            }}>Export CSV</button>
            <button className="btn xs danger" onClick={() => { S.matches = S.matches.filter((x) => x.id !== m.id); save(); render(); }}>Delete</button>
          </div>
        </div>
        <div className="tbl-wrap" style={{ marginTop: 10 }}><table className="tbl"><thead><tr><th className="ns">#</th><th className="ns">Firm</th><th className="ns">Score</th><th className="ns">Conflicts</th></tr></thead>
          <tbody>{m.results.slice(0, 8).map((x, i) => {
            const f = firm(x.id);
            return f ? <tr key={x.id}><td>{i + 1}</td><td><Link className="firm" href={firmHref(x.id)}>{f.name}</Link></td><td>{x.pct}%</td><td className="muted">{x.conflicts.length ? x.conflicts.join('; ') : '—'}</td></tr> : null;
          })}</tbody></table></div>
      </div>
    )) : <div className="empty"><b>No saved shortlists</b>Run a deal match and save the shortlist to keep it here.<div style={{ marginTop: 10 }}><Link className="btn sm" href="/match">Find investors for a deal</Link></div></div>;
  }

  return (
    <>
      <div className="page-head"><div><h1>Saved lists</h1><p>Saved in this browser (demo). With a backend connected, lists sync to your account.</p></div></div>
      <div className="tabs">{tabs.map(([k, l]) => <button key={k} className={ui.listTab === k ? 'on' : ''} data-tab={k} onClick={() => { ui.listTab = k; render(); }}>{l}</button>)}</div>
      {body}
    </>
  );
}
