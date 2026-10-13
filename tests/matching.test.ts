import { describe, expect, it } from 'vitest';
import { byId, FIRMS, LPS } from '@/lib/data';
import { applyFilters, matchFirm, matchGPforLP, matchLP, sortFirms, type DealInput } from '@/lib/matching';
import type { Firm } from '@/lib/types';

const firm = (id: string) => byId(id)!;
const deal = (o: Partial<DealInput> = {}): DealInput => ({ ind: 'Industrials', desc: '', loc: '', rev: '', ebitda: 8, equity: 30, ctrl: 'control', deal: 'platform', isSponsor: false, ...o });

describe('matchFirm (business owner → GP)', () => {
  it('scores a full match as 100% of stated criteria', () => {
    const m = matchFirm(firm('trinity-ridge'), deal());
    expect(m.pct).toBe(100);
    expect(m.score).toBe(m.max);
    expect(m.conflicts).toEqual([]);
    expect(m.disq).toBe(false);
  });

  it('never counts an undisclosed criterion as a match', () => {
    const f: Firm = { ...firm('trinity-ridge'), eb: null, chk: null };
    const m = matchFirm(f, deal());
    expect(m.missing).toContain('Target EBITDA: firm has not disclosed a target range');
    expect(m.missing).toContain('Equity check: firm has not disclosed a check size');
    // 40 of 95 points are undisclosed, so the best possible share is 55/95.
    expect(m.score).toBe(55);
    expect(m.max).toBe(95);
    expect(m.pct).toBe(58);
  });

  it('treats a check just outside range as missing information, not a match', () => {
    const m = matchFirm(firm('trinity-ridge'), deal({ equity: 110 })); // range 25–100, within 125%
    expect(m.missing.some((x) => x.includes('just outside'))).toBe(true);
    expect(m.matched.some((x) => x.startsWith('Equity check'))).toBe(false);
  });

  it('flags a paused mandate as a conflict', () => {
    const m = matchFirm(firm('panhandle-holdings'), deal());
    expect(m.conflicts).toContain('Mandate status: firm reports it is paused');
  });

  it('flags a listed exclusion as a conflict', () => {
    const m = matchFirm(firm('bayou-city-cap'), deal({ ind: 'Consumer' }));
    expect(m.conflicts.some((x) => x.startsWith('Exclusion: firm lists "Consumer"'))).toBe(true);
    expect(m.disq).toBe(true);
  });

  it('only applies the independent-sponsor rule when the requester is a sponsor', () => {
    const f = firm('hill-country-growth'); // backsIS not disclosed
    expect(matchFirm(f, deal({ ind: 'Business Services' })).max).toBe(95);
    const s = matchFirm(f, deal({ ind: 'Business Services', isSponsor: true }));
    expect(s.max).toBe(100);
    expect(s.missing).toContain('Independent sponsor: sponsor policy not disclosed');
  });

  it('notes when the firm is itself an independent sponsor', () => {
    const m = matchFirm(firm('cowtown-capital'), deal());
    expect(m.missing.some((x) => x.startsWith('Note: this firm is itself an independent sponsor'))).toBe(true);
  });
});

describe('matchLP (GP → LP)', () => {
  const lp = LPS.find((l) => l.id === 'alamo-health-foundation-sample')!; // emerging: not disclosed
  it('lists an undisclosed emerging-manager policy as missing only for emerging funds', () => {
    const base = { strategy: 'Buyout', sectors: ['Healthcare Services'], size: 300 };
    expect(matchLP(lp, { ...base, emerging: false }).pct).toBe(100);
    const m = matchLP(lp, { ...base, emerging: true });
    expect(m.missing).toContain('Emerging managers: policy not disclosed');
    expect(m.pct).toBe(80);
  });
});

describe('matchGPforLP (LP → GP)', () => {
  it('treats a firm with no committed fund as fund size not disclosed', () => {
    const m = matchGPforLP(firm('alamo-plaza-holdings'), { strategies: ['Co-investment'], sectors: ['Consumer'], min: 100, max: 1500 });
    expect(m.missing).toContain('Fund size: not disclosed (no committed fund)');
    expect(m.pct).toBe(80);
  });
  it('reads fund size in billions', () => {
    const m = matchGPforLP(firm('san-jacinto-partners'), { strategies: ['Buyout'], sectors: [], min: 1000, max: 2000 });
    expect(m.matched).toContain('Fund size: $1800M within your $1000M–$2000M range');
  });
});

describe('directory filters', () => {
  it('filters by EBITDA inside the stated range', () => {
    const out = applyFilters(FIRMS, { ebitda: '45' }, '');
    expect(out.map((f) => f.id).sort()).toEqual(['bayou-city-cap', 'san-jacinto-partners']);
  });
  it('matches "Not disclosed" sponsor policy', () => {
    expect(applyFilters(FIRMS, { backsIS: ['nd'] }, '').every((f) => f.backsIS == null)).toBe(true);
  });
  it('sorts by last update, newest first', () => {
    const s = sortFirms(FIRMS, 'updated', -1);
    for (let i = 1; i < s.length; i++) expect(s[i - 1].updated >= s[i].updated).toBe(true);
  });
});
