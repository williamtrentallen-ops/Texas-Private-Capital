// Directory filtering and the transparent matching rules. Pure functions so
// they can be tested and later run on the server.
//
// Matching contract (see CLAUDE.md): undisclosed criteria earn 0 and are listed
// as missing information; exclusions and paused mandates are conflicts; the
// score is a share of stated criteria, never a probability of closing.
import { fmtDate, range } from './format';
import { CITIES, INDUSTRIES, STATUS_LABEL, TYPE_LABEL } from './data';
import type { Firm, LP, Transaction } from './types';

export const FILTER_DEFS: Record<string, { label: string; opts: [string, string][] }> = {
  type: { label: 'Investor type', opts: [['pe', 'PE firm'], ['fo', 'Family office'], ['is', 'Independent sponsor']] },
  city: { label: 'Headquarters city', opts: CITIES.map((c) => [c, c] as [string, string]) },
  office: { label: 'Additional Texas office', opts: CITIES.map((c) => [c, c] as [string, string]) },
  ind: { label: 'Industry', opts: INDUSTRIES.map((c) => [c, c] as [string, string]) },
  ctrl: { label: 'Control / minority', opts: [['control', 'Control'], ['minority', 'Minority']] },
  deal: { label: 'Platform / add-on', opts: [['platform', 'Platform acquisitions'], ['add-on', 'Add-on acquisitions']] },
  cap: { label: 'Capital model', opts: [['committed', 'Committed fund'], ['family', 'Family capital'], ['deal-by-deal', 'Deal-by-deal']] },
  backsIS: { label: 'Backs independent sponsors', opts: [['yes', 'Yes'], ['no', 'No'], ['nd', 'Not disclosed']] },
  status: { label: 'Mandate status', opts: [['active', 'Actively investing'], ['selective', 'Selective'], ['paused', 'Paused']] },
};

export interface DirFilters {
  [k: string]: string[] | string | undefined;
  ebitda?: string;
  check?: string;
  confAfter?: string;
  sub?: string;
}

const list = (fl: DirFilters, k: string) => (fl[k] as string[] | undefined) || [];

export function applyFilters(all: Firm[], fl: DirFilters, q: string): Firm[] {
  let out = all;
  if (q) {
    const t = q.toLowerCase();
    out = out.filter((f) => [f.name, f.city, ...f.offices, ...f.ind, ...f.sub, ...f.geo, f.prio, f.overview, ...f.portfolio.map((p) => p.name)].join(' ').toLowerCase().includes(t));
  }
  for (const k of Object.keys(FILTER_DEFS)) {
    const v = list(fl, k);
    if (!v.length) continue;
    out = out.filter((f) => {
      if (k === 'type') return v.includes(f.type);
      if (k === 'city') return v.includes(f.city);
      if (k === 'office') return v.some((c) => f.offices.includes(c));
      if (k === 'ind') return v.some((c) => f.ind.includes(c));
      if (k === 'ctrl') return v.some((c) => f.ctrl.includes(c));
      if (k === 'deal') return v.some((c) => f.deal.includes(c));
      if (k === 'cap') return v.includes(f.cap);
      if (k === 'status') return v.includes(f.status);
      if (k === 'backsIS') return v.some((c) => (c === 'nd' ? f.backsIS == null : c === 'yes' ? f.backsIS === true : f.backsIS === false));
      return true;
    });
  }
  if (fl.ebitda != null && fl.ebitda !== '') out = out.filter((f) => f.eb && f.eb[0] <= +fl.ebitda! && f.eb[1] >= +fl.ebitda!);
  if (fl.check != null && fl.check !== '') out = out.filter((f) => f.chk && f.chk[0] <= +fl.check! && f.chk[1] >= +fl.check!);
  if (fl.confAfter) out = out.filter((f) => f.conf && f.conf >= fl.confAfter!);
  if (fl.sub) out = out.filter((f) => f.sub.join(' ').toLowerCase().includes(fl.sub!.toLowerCase()));
  return out;
}

export function sortFirms(all: Firm[], key: string, dir: number): Firm[] {
  const v = (f: Firm): string | number =>
    ({ name: f.name, city: f.city, type: TYPE_LABEL[f.type], ind: f.ind[0], chk: f.chk ? f.chk[0] : -1, eb: f.eb ? f.eb[0] : -1, updated: f.updated, conf: f.conf || '' } as Record<string, string | number>)[key];
  return [...all].sort((a, b) => {
    const x = v(a), y = v(b);
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  });
}

/* ---------- Business owner → GP ---------- */

export const RULES = [
  { k: 'ind', w: 30, label: 'Industry' },
  { k: 'eb', w: 20, label: 'Target EBITDA' },
  { k: 'chk', w: 20, label: 'Equity check' },
  { k: 'ctrl', w: 10, label: 'Control / minority' },
  { k: 'deal', w: 10, label: 'Platform / add-on' },
  { k: 'geo', w: 5, label: 'Geography' },
  { k: 'is', w: 5, label: 'Independent sponsor' },
];

export interface DealInput {
  ind: string;
  desc: string;
  loc: string;
  rev: number | '';
  ebitda: number;
  equity: number;
  ctrl: string;
  deal: string;
  isSponsor: boolean;
}

export interface FirmMatch {
  f: Firm;
  score: number;
  max: number;
  pct: number;
  matched: string[];
  missing: string[];
  conflicts: string[];
  evidence: Transaction[];
  disq: boolean;
}

export function matchFirm(f: Firm, d: DealInput): FirmMatch {
  const matched: string[] = [], missing: string[] = [], conflicts: string[] = [];
  let score = 0, max = 0;
  const add = (rule: { w: number; label: string }, ok: boolean | null, text: string) => {
    max += rule.w;
    if (ok === true) { score += rule.w; matched.push(`${rule.label}: ${text}`); }
    else if (ok === false) conflicts.push(`${rule.label}: ${text}`);
    else missing.push(`${rule.label}: ${text}`);
  };
  const R = (k: string) => RULES.find((r) => r.k === k)!;
  // Industry: exact match required.
  add(R('ind'), f.ind.includes(d.ind), f.ind.includes(d.ind) ? `${d.ind} is a stated focus` : `${d.ind} is not among stated industries (${f.ind.join(', ')})`);
  if (f.excl.some((x) => d.ind.toLowerCase().includes(x.toLowerCase().split(' ')[0]) && x !== 'Not disclosed'))
    conflicts.push(`Exclusion: firm lists "${f.excl.find((x) => d.ind.toLowerCase().includes(x.toLowerCase().split(' ')[0]))}" as excluded`);
  // Missing criteria are never treated as a match.
  if (!f.eb) add(R('eb'), null, 'firm has not disclosed a target range');
  else {
    const ok = d.ebitda >= f.eb[0] && d.ebitda <= f.eb[1];
    add(R('eb'), ok, ok ? `$${d.ebitda}M is within ${range(f.eb)}` : `$${d.ebitda}M is outside ${range(f.eb)}`);
  }
  if (!f.chk) add(R('chk'), null, 'firm has not disclosed a check size');
  else {
    const ok = d.equity >= f.chk[0] && d.equity <= f.chk[1];
    const near = !ok && d.equity >= f.chk[0] * 0.75 && d.equity <= f.chk[1] * 1.25;
    add(R('chk'), ok ? true : near ? null : false, ok ? `$${d.equity}M is within ${range(f.chk)}` : near ? `$${d.equity}M is just outside ${range(f.chk)} — may flex` : `$${d.equity}M is outside ${range(f.chk)}`);
  }
  add(R('ctrl'), f.ctrl.includes(d.ctrl), f.ctrl.includes(d.ctrl) ? `does ${d.ctrl} deals` : `does not do ${d.ctrl} deals`);
  add(R('deal'), f.deal.includes(d.deal), f.deal.includes(d.deal) ? `does ${d.deal} acquisitions` : `does not pursue ${d.deal}s`);
  const geoOk = f.geo.some((g) => ['Texas', 'US', 'Southwest', 'South Central US', 'Gulf Coast'].includes(g));
  add(R('geo'), geoOk, geoOk ? `invests in ${f.geo.join(', ')} (company in ${d.loc || 'Texas'})` : `stated geography (${f.geo.join(', ')}) may not cover ${d.loc || 'Texas'}`);
  // The sponsor rule only applies when the requester is an independent sponsor.
  if (d.isSponsor) {
    if (f.backsIS == null) add(R('is'), null, 'sponsor policy not disclosed');
    else add(R('is'), f.backsIS, f.backsIS ? 'backs independent sponsors' : 'does not back independent sponsors');
  }
  if (f.status === 'paused') conflicts.push('Mandate status: firm reports it is paused');
  if (f.type === 'is') missing.push('Note: this firm is itself an independent sponsor; it may be a co-sponsor or competitor rather than a capital source');
  const evidence = f.transactions.filter((t) => t.sector === d.ind).slice(0, 3);
  if (evidence.length) matched.push(`Transaction evidence: ${evidence.length} ${d.ind.toLowerCase()} deal${evidence.length > 1 ? 's' : ''} on record`);
  const pct = max ? Math.round((score / max) * 100) : 0;
  return { f, score, max, pct, matched, missing, conflicts, evidence, disq: !f.ind.includes(d.ind) };
}

/* ---------- GP → LP and LP → GP ---------- */

export function fundSizeOf(f: Firm): number | null {
  const m = (f.fund || '').match(/\$([\d.]+)([MB])/);
  return m ? +m[1] * (m[2] === 'B' ? 1000 : 1) : null;
}

export interface GPFundInput {
  strategy: string;
  sectors: string[];
  size: number;
  emerging: boolean;
}

export interface LPMatch {
  l: LP;
  pct: number;
  matched: string[];
  missing: string[];
  conflicts: string[];
}

export function matchLP(l: LP, g: GPFundInput): LPMatch {
  const i = l.interests;
  const matched: string[] = [], missing: string[] = [], conflicts: string[] = [];
  let score = 0, max = 0;
  const add = (w: number, ok: boolean | null, t: string) => {
    max += w;
    if (ok === true) { score += w; matched.push(t); }
    else if (ok === false) conflicts.push(t);
    else missing.push(t);
  };
  add(30, i.strategies.includes(g.strategy), `Strategy: ${g.strategy} ${i.strategies.includes(g.strategy) ? 'is a stated interest' : 'not among stated interests (' + i.strategies.join(', ') + ')'}`);
  const so = g.sectors.filter((x) => i.sectors.includes(x));
  add(30, so.length ? true : false, so.length ? `Sectors: ${so.join(', ')}` : 'Sectors: no overlap with stated interests');
  if (!i.fundSize) add(20, null, 'Fund size: preference not available');
  else {
    const ok = g.size >= i.fundSize[0] && g.size <= i.fundSize[1];
    add(20, ok, `Fund size: $${g.size}M ${ok ? 'within' : 'outside'} ${range(i.fundSize)}`);
  }
  if (g.emerging) {
    if (i.emerging == null) add(20, null, 'Emerging managers: policy not disclosed');
    else add(20, i.emerging, i.emerging ? 'Emerging managers: considered' : 'Emerging managers: not currently considered');
  }
  return { l, pct: max ? Math.round((score / max) * 100) : 0, matched, missing, conflicts };
}

export interface LPInterestsInput {
  strategies: string[];
  sectors: string[];
  min: number;
  max: number;
}

export interface GPForLPMatch {
  f: Firm;
  pct: number;
  matched: string[];
  missing: string[];
  conflicts: string[];
}

export function matchGPforLP(f: Firm, q: LPInterestsInput): GPForLPMatch {
  const matched: string[] = [], missing: string[] = [], conflicts: string[] = [];
  let score = 0, max = 0;
  const add = (w: number, ok: boolean | null, t: string) => {
    max += w;
    if (ok === true) { score += w; matched.push(t); }
    else if (ok === false) conflicts.push(t);
    else missing.push(t);
  };
  const strat = f.cap === 'committed' ? (f.ctrl.includes('control') ? 'Buyout' : 'Growth equity') : f.cap === 'deal-by-deal' ? 'Independent sponsor deals' : 'Co-investment';
  add(30, q.strategies.includes(strat), `Strategy: ${strat}${q.strategies.includes(strat) ? '' : ' (not selected)'}`);
  const so = q.sectors.filter((x) => f.ind.includes(x));
  add(30, so.length ? true : false, so.length ? `Sectors: ${so.join(', ')}` : `Sectors: no overlap (${f.ind.join(', ')})`);
  const fs = fundSizeOf(f);
  if (fs == null) add(20, null, 'Fund size: not disclosed (no committed fund)');
  else {
    const ok = fs >= q.min && fs <= q.max;
    add(20, ok, `Fund size: $${fs}M ${ok ? 'within' : 'outside'} your $${q.min}M–$${q.max}M range`);
  }
  add(20, f.status !== 'paused', f.status === 'paused' ? 'Mandate: firm reports it is paused' : `Mandate: ${STATUS_LABEL[f.status].toLowerCase()}${f.conf ? ', confirmed ' + fmtDate(f.conf) : ''}`);
  return { f, pct: max ? Math.round((score / max) * 100) : 0, matched, missing, conflicts };
}
