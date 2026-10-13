'use client';
// Client state, ported from the prototype.
//
// `S` is the user's data, persisted to localStorage (no backend yet; Phase 3
// replaces this with Supabase). `ui` is per-session page state (filters, tabs,
// compare picks, last match) that survives navigation but not a reload, like
// the prototype's module variables. Handlers mutate either object and call
// `save()` and/or `render()`, mirroring the prototype's save();render() idiom.
import { useSyncExternalStore, type ReactNode } from 'react';
import { ADMIN_SEED, byId, FIRMS } from './data';
import type { DirFilters, FirmMatch, DealInput, GPFundInput, LPMatch, LPInterestsInput, GPForLPMatch } from './matching';
import type { Firm, QueueItem } from './types';

export interface SavedList { id: string; name: string; firms: string[]; notes?: Record<string, string>; created: string }
export interface SavedMatch {
  id: string;
  name: string;
  deal: DealInput;
  results: { id: string; pct: number; matched: string[]; missing: string[]; conflicts: string[] }[];
  date: string;
}
export interface Alert { id: string; firm: string; sector: string; city: string; type: string }
export interface HistoryRow { date: string; firm: string; field: string; old: string; new: string; url: string; retrieved: string; decision: 'Approved' | 'Rejected' }
export interface Correction { id: string; firm: string; field: string; text: string; url: string; date: string; status: 'open' | 'resolved' }
export interface ConnectionRequest {
  id: string; date: string; targetType: 'gp' | 'lp'; targetId: string; targetName: string;
  role: string; org: string; name: string; email: string; criteria: string; confidential: string;
  status: 'received' | 'reviewed' | 'declined';
}
export interface Subscriber { email: string; topics: string[]; date: string }

export interface State {
  plan: 'free' | 'paid';
  saved: string[];
  lists: SavedList[];
  notes: Record<string, string>;
  alerts: Alert[];
  matches: SavedMatch[];
  overrides: Record<string, Partial<Firm>>;
  history: HistoryRow[];
  queue: QueueItem[] | null;
  pricing: { free: number; pro: number; team: number };
  corrections: Correction[];
  requests: ConnectionRequest[];
  subscribers: Subscriber[];
}

const STORE_KEY = 'tpc.v1';
const DEFAULT_STATE: State = { plan: 'free', saved: [], lists: [], notes: {}, alerts: [], matches: [], overrides: {}, history: [], queue: null, pricing: { free: 0, pro: 149, team: 449 }, corrections: [], requests: [], subscribers: [] };

export interface UI {
  compare: string[];
  dir: { view: string; sort: string; dir: number; filters: DirFilters; q: string; loading: boolean; _lastQs?: string; _profId?: string };
  profTab: string;
  match: { deal: DealInput | null; results: FirmMatch[] | null };
  act: { type: string; firm: string; sector: string; city: string; q: string; _lastQs?: string };
  news: { type: string; city: string; sector: string; q: string; _lastQs?: string };
  deals: { type: string; sector: string; city: string; status: string; gp: string; q: string };
  homeDeal: { type: string; sector: string };
  lp: {
    type: string; strategy: string; sector: string; q: string; mode: string; _pathInit?: boolean;
    gpForm: GPFundInput | null; gpResults: LPMatch[] | null; lpForm: LPInterestsInput | null; lpResults: GPForLPMatch[] | null;
    gpMode?: boolean; _gpQs?: string;
  };
  listTab: string;
  adminTab: string;
  modal: ReactNode;
  toast: string | null;
}

const freshUI = (): UI => ({
  compare: [],
  dir: { view: 'table', sort: 'name', dir: 1, filters: {}, q: '', loading: true },
  profTab: 'overview',
  match: { deal: null, results: null },
  act: { type: '', firm: '', sector: '', city: '', q: '' },
  news: { type: '', city: '', sector: '', q: '' },
  deals: { type: '', sector: '', city: '', status: '', gp: '', q: '' },
  homeDeal: { type: '', sector: '' },
  lp: { type: '', strategy: '', sector: '', q: '', gpForm: null, gpResults: null, lpForm: null, lpResults: null, mode: 'browse' },
  listTab: 'saved',
  adminTab: 'queue',
  modal: null,
  toast: null,
});

const isServer = typeof window === 'undefined';

// Client singletons. The server never mutates these: it gets fresh copies per call.
export let S: State = structuredClone(DEFAULT_STATE);
const clientUI: UI = freshUI();

let version = 0;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Re-render every component that reads the store. */
export function render(): void {
  version++;
  listeners.forEach((l) => l());
}

export function save(): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(S));
  } catch {
    toast('Could not save to browser storage');
  }
}

/** Load persisted state after hydration so server and first client render agree. */
export function loadState(): void {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    S = raw ? { ...structuredClone(DEFAULT_STATE), ...JSON.parse(raw) } : structuredClone(DEFAULT_STATE);
  } catch (e) {
    console.warn('Storage unavailable; using in-memory state', e);
    S = structuredClone(DEFAULT_STATE);
  }
  render();
}

export function useStore(): { S: State; ui: UI } {
  useSyncExternalStore(subscribe, () => version, () => 0);
  if (isServer) return { S: structuredClone(DEFAULT_STATE), ui: freshUI() };
  return { S, ui: clientUI };
}

/** Direct access for event handlers outside components. */
export const ui = (): UI => clientUI;

export const isPaid = (): boolean => S.plan === 'paid';

export function firm(id: string): Firm | null {
  const f = byId(id);
  if (!f) return null;
  const o = S.overrides[id];
  return o ? { ...f, ...o } : f;
}
export const ALL = (): Firm[] => FIRMS.map((f) => firm(f.id)!);

export function queue(): QueueItem[] {
  if (!S.queue) {
    S.queue = structuredClone(ADMIN_SEED);
    if (!isServer) save();
  }
  return S.queue;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string): void {
  clientUI.toast = msg;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    clientUI.toast = null;
    render();
  }, 2400);
}

export function modal(content: ReactNode): void {
  clientUI.modal = content;
  render();
}
export function closeModal(): void {
  clientUI.modal = null;
  render();
}

export function toggleSave(id: string): void {
  const i = S.saved.indexOf(id);
  if (i >= 0) {
    S.saved.splice(i, 1);
    toast('Removed from saved firms');
  } else {
    S.saved.push(id);
    toast('Saved');
  }
  save();
  render();
}

/** Compare up to three GPs; returns false when the pick was refused. */
export function toggleCompare(id: string): boolean {
  const u = clientUI;
  if (u.compare.includes(id)) u.compare = u.compare.filter((x) => x !== id);
  else if (u.compare.length >= 3) {
    toast('You can compare up to three GPs');
    return false;
  } else u.compare.push(id);
  render();
  return true;
}
