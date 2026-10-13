// Sample data (fictional, labeled) and the lookup tables used across pages.
import firmsJson from '@/data/firms.json';
import eventsJson from '@/data/events.json';
import newsJson from '@/data/news.json';
import dealsJson from '@/data/deals.json';
import lpsJson from '@/data/lps.json';
import queueJson from '@/data/research-queue.json';
import type { Deal, Firm, LP, MarketEvent, NewsItem, QueueItem } from './types';

export const FIRMS = firmsJson as unknown as Firm[];
export const EVENTS = eventsJson as unknown as MarketEvent[];
export const NEWS = newsJson as unknown as NewsItem[];
export const DEALS = dealsJson as unknown as Deal[];
export const LPS = lpsJson as unknown as LP[];
export const ADMIN_SEED = queueJson as unknown as QueueItem[];

export const INDUSTRIES = ['Business Services', 'Industrials', 'Healthcare Services', 'Energy Services', 'Consumer', 'Software & Tech-Enabled Services', 'Distribution & Logistics', 'Food & Agriculture', 'Infrastructure Services', 'Financial Services'];
export const CITIES = ['Dallas', 'Fort Worth', 'Houston', 'Austin', 'San Antonio'];

export const TYPE_LABEL: Record<string, string> = { pe: 'PE firm', fo: 'Family office', is: 'Independent sponsor' };
export const CAP_LABEL: Record<string, string> = { committed: 'Committed fund', family: 'Family capital', 'deal-by-deal': 'Deal-by-deal' };
export const STATUS_LABEL: Record<string, string> = { active: 'Actively investing', selective: 'Selective', paused: 'Paused' };
export const FS_LABEL: Record<string, string> = { confirmed: 'Firm-confirmed', public: 'Publicly sourced', inferred: 'Inferred', nd: 'Not disclosed' };
export const NEWS_TL: Record<string, string> = { acq: 'Deal', fund: 'Fundraise', team: 'People move', mandate: 'GP update' };
export const EVENT_TL: Record<string, string> = { acq: 'Acquisition', fund: 'Fund announcement', team: 'Team change', mandate: 'Mandate update' };
export const PROV_LABEL: Record<string, string> = { direct: 'Provided directly by the organization', public: 'From public filings and announcements' };

export const LP_TYPES = [...new Set(LPS.map((l) => l.type))];
export const STRATEGIES = [...new Set(LPS.flatMap((l) => l.interests.strategies))];

export const byId = (id: string) => FIRMS.find((f) => f.id === id);
export const newsById = (id: string) => NEWS.find((n) => n.id === id);
export const dealById = (id: string) => DEALS.find((d) => d.id === id);
export const lpById = (id: string) => LPS.find((l) => l.id === id);

export interface FundraisingRow {
  f: Firm;
  fundName: string;
  size: string;
  year: number | null;
  date: string;
  event: MarketEvent | undefined;
}

// Most recent disclosed vehicle per firm, newest first.
export const FUNDRAISING: FundraisingRow[] = FIRMS.filter((f) => f.fund)
  .map((f) => {
    const m = f.fund!.match(/^(.*?),\s*(\$[\d.]+[MB])\s*\((\d{4})\)/);
    const ev = EVENTS.find((e) => e.type === 'fund' && e.firm === f.id);
    return { f, fundName: m ? m[1] : f.fund!, size: m ? m[2] : '', year: m ? +m[3] : null, date: ev ? ev.date : `${m ? m[3] : '2024'}-01-01`, event: ev };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1));
