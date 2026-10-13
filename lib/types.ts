// Shapes of the sample records in /data. Field names follow the prototype;
// Phase 3 maps them onto the database columns in CLAUDE.md.

export type FirmType = 'pe' | 'fo' | 'is';
export type CapitalModel = 'committed' | 'family' | 'deal-by-deal';
export type MandateStatus = 'active' | 'selective' | 'paused';
export type FieldStatus = 'confirmed' | 'public' | 'inferred' | 'nd';
export type Range = [number, number];

export interface Person {
  name: string;
  title: string;
  email: string;
  phone: string | null;
  focus: string;
  fs: FieldStatus;
}

export interface PortfolioCompany {
  name: string;
  sector: string;
  city: string;
  year: number;
  status: 'Current' | 'Exited';
}

export interface Transaction {
  date: string;
  type: 'Platform acquisition' | 'Add-on acquisition';
  target: string;
  sector: string;
  note: string;
}

export interface Source {
  label: string;
  url: string | null;
  date: string;
  fields: string[];
}

export interface SponsorPrefs {
  firstTime: boolean;
  role: string;
  equity: string;
}

export interface Firm {
  id: string;
  name: string;
  type: FirmType;
  city: string;
  offices: string[];
  ind: string[];
  sub: string[];
  eb: Range | null;
  chk: Range | null;
  ctrl: string[];
  deal: string[];
  cap: CapitalModel;
  fund: string | null;
  backsIS: boolean | null;
  isPref: SponsorPrefs | null;
  geo: string[];
  excl: string[];
  prio: string;
  status: MandateStatus;
  conf: string | null;
  fs: Record<string, FieldStatus>;
  founded: number;
  domain: string;
  website: string;
  team: Person[];
  portfolio: PortfolioCompany[];
  transactions: Transaction[];
  sources: Source[];
  updated: string;
  overview: string;
  is_sample: true;
}

export type EventType = 'acq' | 'fund' | 'team' | 'mandate';

export interface MarketEvent {
  date: string;
  type: EventType;
  firm: string;
  title: string;
  detail: string;
  sector: string | null;
  source: Source;
  why: { fact: string; inference: string };
  is_sample: true;
}

export interface NewsItem {
  id: string;
  date: string;
  type: EventType;
  firm: string;
  city: string;
  sector: string;
  headline: string;
  summary: string;
  facts: string;
  commentary: string;
  source: Source;
  is_sample: true;
}

export type DealStatus = 'announced' | 'signed' | 'closed';

export interface Deal {
  id: string;
  date: string;
  type: Transaction['type'];
  status: DealStatus;
  headline: string;
  gp: string;
  company: string;
  sector: string;
  city: string;
  seller: string;
  buyer: string;
  summary: string;
  source: Source;
  is_sample: true;
}

export interface LP {
  id: string;
  name: string;
  type: string;
  city: string;
  website: string;
  overview: string;
  interests: {
    strategies: string[];
    sectors: string[];
    fundSize: Range | null;
    geo: string;
    emerging: boolean | null;
  };
  provided: 'direct' | 'public';
  confirmedAt: string | null;
  activity: { date: string; text: string; source: string }[];
  contact: { title: string; email: string } | null;
  is_sample: true;
}

export interface QueueChange {
  field: string;
  old: string;
  new: string;
  passage: string;
}

export interface QueueItem {
  id: string;
  stage: 'discover' | 'collect' | 'extract' | 'review' | 'publish' | 'error';
  firm: string | null;
  candidate?: string;
  url: string;
  retrieved: string;
  status: string;
  changes: QueueChange[];
  flags: string[];
  error?: boolean;
  is_sample?: true;
}
