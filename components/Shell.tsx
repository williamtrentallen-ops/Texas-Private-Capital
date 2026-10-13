'use client';
// Site chrome: utility strip, main nav with dropdowns, footer, modal and toast
// hosts, and the bootstrapping that loads saved state and old hash links.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { CITIES, FIRMS, FUNDRAISING, NEWS, NEWS_TL } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import { articleHref, firmHref, hashToPath, pageOf } from '@/lib/routes';
import { closeModal, isPaid, loadState, render, S, save, toast, useStore } from '@/lib/store';

const LOGO = '/logo.webp';

function useMobile(): () => boolean {
  return () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(max-width:700px)').matches;
}

function Nav({ page, open, closeAll }: { page: string; open: boolean; closeAll: () => void }) {
  const [dd, setDd] = useState<string | null>(null);
  const mobile = useMobile();
  const pathname = usePathname();
  // Navigating closes open dropdowns, like the prototype's render(). Panel links also close them on click.
  useEffect(() => setDd(null), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDd(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const isActive = (r: string) =>
    r === page ||
    (['firm', 'firms', 'compare'].includes(page) && r === 'gps') ||
    (page === 'article' && r === 'news') ||
    (page === 'deal' && r === 'deals') ||
    (page === 'lp' && r === 'lps') ||
    (page === 'match' && r === 'owners');
  const act = (r: string, extra = '') => [extra, isActive(r) ? 'active' : ''].filter(Boolean).join(' ') || undefined;

  // Dropdown behavior: hover/focus on desktop, tap to toggle on mobile.
  const ddProps = (r: string) => ({
    className: ['dd', isActive(r) ? 'active' : '', dd === r ? 'open' : ''].filter(Boolean).join(' '),
    'data-r': r,
    onMouseEnter: () => { if (!mobile()) setDd(r); },
    onMouseLeave: () => { if (!mobile()) setDd((cur) => (cur === r ? null : cur)); },
  });
  const topLink = (r: string, href: string, label: string) => (
    <Link
      href={href}
      data-r={r}
      className={act(r)}
      onClick={(e) => { if (mobile()) { e.preventDefault(); setDd((cur) => (cur === r ? null : r)); } }}
      onFocus={() => { if (!mobile()) setDd(r); }}
    >{label}</Link>
  );
  const panelLink = (href: string, children: ReactNode, className?: string) => (
    <Link href={href} className={className} onClick={() => { setDd(null); closeAll(); }}>{children}</Link>
  );

  return (
    <nav className={`nav${open ? ' open' : ''}`} id="nav">
      <div {...ddProps('news')}>
        {topLink('news', '/news', 'News')}
        <div className="panel wide">
          <div className="col"><h5>Recent news</h5>{NEWS.slice(0, 5).map((n) => <Fragment key={n.id}>{panelLink(articleHref(n.id), <>{n.headline}<span className="m">{NEWS_TL[n.type]} · {fmtDate(n.date)}</span></>, 'news-item')}</Fragment>)}</div>
          <div className="col"><h5>Browse</h5>
            {Object.entries(NEWS_TL).map(([k, v]) => <Fragment key={k}>{panelLink(`/news?type=${k}`, `${v}s`)}</Fragment>)}
            {panelLink('/activity', 'Market activity feed')}
            <div className="foot">{panelLink('/news', 'All news')}{panelLink('/newsletter', 'Weekly briefing')}</div>
          </div>
        </div>
      </div>
      <Link href="/deals" data-r="deals" className={act('deals')}>Deals</Link>
      <div {...ddProps('gps')}>
        {topLink('gps', '/gps', 'GPs')}
        <div className="panel wide">
          <div className="col"><h5>GP finder</h5>
            {panelLink('/gps', `Browse all ${FIRMS.length} GPs`, 'hl')}
            {panelLink('/gps?type=pe', <>Private equity firms<span className="m">{FIRMS.filter((f) => f.type === 'pe').length} firms</span></>)}
            {panelLink('/gps?type=fo', <>Family offices<span className="m">{FIRMS.filter((f) => f.type === 'fo').length} firms</span></>)}
            {panelLink('/gps?type=is', <>Independent sponsors<span className="m">{FIRMS.filter((f) => f.type === 'is').length} firms</span></>)}
            {panelLink('/compare', 'Compare GPs')}
          </div>
          <div className="col"><h5>By city</h5>
            {CITIES.map((c) => <Fragment key={c}>{panelLink(`/gps?city=${encodeURIComponent(c)}`, <>{c}<span className="m">{FIRMS.filter((f) => f.city === c || f.offices.includes(c)).length} firms with an office</span></>)}</Fragment>)}
            <div className="foot">{panelLink('/match', 'Find a GP for your company')}{panelLink('/gps?path=lp', 'GP seeking LPs')}</div>
          </div>
        </div>
      </div>
      <div {...ddProps('fundraising')}>
        {topLink('fundraising', '/fundraising', 'Fundraising')}
        <div className="panel">
          <h5>GPs fundraising and recent closes</h5>
          {FUNDRAISING.slice(0, 5).map((x) => <Fragment key={x.f.id}>{panelLink(firmHref(x.f.id), <>{x.f.name}<span className="m">{x.fundName} · {x.size} · {x.year}</span></>)}</Fragment>)}
          <div className="foot">{panelLink('/fundraising', 'All fund activity')}{panelLink('/lps', 'Find LPs')}</div>
        </div>
      </div>
      <Link href="/lps" data-r="lps" className={act('lps')}>LPs</Link>
      <Link href="/owners" data-r="owners" className={act('owners')}>Business Owners</Link>
      <Link href="/newsletter" data-r="newsletter" className={act('newsletter', 'cta')}>Newsletter</Link>
    </nav>
  );
}

export function Header() {
  useStore();
  const pathname = usePathname();
  const page = pageOf(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);
  const paid = isPaid();
  const tab = (href: string, label: string) => {
    const on = href === '/' + (page === 'home' ? '' : page) || (href === '/' && !['how', 'pricing', 'lists'].includes(page));
    return <Link href={href} className={on ? 'on' : undefined}>{label}</Link>;
  };
  return (
    <header className="topbar">
      <div className="utilbar"><div className="inner">
        <div className="tabs2">{tab('/', 'Texas Private Capital')}{tab('/how', 'How it works')}{tab('/lists', 'Saved Lists')}{tab('/pricing', 'Plans')}</div>
        <span className="spacer" />
        <div className="right">
          <button className={'plan-pill' + (paid ? ' paid' : '')} id="planPill" title="Demo plan toggle" onClick={() => { S.plan = isPaid() ? 'free' : 'paid'; save(); render(); toast(`Demo: switched to ${S.plan} plan`); }}>
            {paid ? 'Paid plan (demo)' : 'Free plan (demo)'}
          </button>
          <Link className="icon-btn" href="/admin" style={{ display: 'inline-flex', alignItems: 'center' }}>Research admin</Link>
        </div>
      </div></div>
      <div className="main"><div className="inner">
        <Link className="brand" href="/" aria-label="Texas Private Capital home">
          {/* The logo is used as supplied: never redrawn, cropped or restyled. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="Texas Private Capital" />
        </Link>
        <Nav page={page} open={menuOpen} closeAll={() => setMenuOpen(false)} />
        <span className="spacer" />
        <div className="right"><button className="icon-btn menu-btn" id="menuBtn" aria-label="Menu" style={{ border: '1px solid var(--line-2)', borderRadius: 4, padding: '0 9px' }} onClick={() => setMenuOpen((o) => !o)}>Menu</button></div>
      </div></div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-foot"><div className="inner">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO} alt="Texas Private Capital" />
      <span>News and intelligence for Texas private markets. Sample content shown is fictional and labeled as such. Connection requests are not guaranteed introductions.</span>
      <span><Link href="/news">News</Link> &nbsp;·&nbsp; <Link href="/deals">Deals</Link> &nbsp;·&nbsp; <Link href="/gps">GPs</Link> &nbsp;·&nbsp; <Link href="/lps">LPs</Link> &nbsp;·&nbsp; <Link href="/owners">Business Owners</Link> &nbsp;·&nbsp; <Link href="/newsletter">Newsletter</Link> &nbsp;·&nbsp; <Link href="/how">How it works</Link></span>
    </div></footer>
  );
}

/** <main>, full-bleed on the home page as in the prototype. */
export function Main({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <main className={'wrap' + (pageOf(pathname) === 'home' ? ' full' : '')} id="app">{children}</main>;
}

export function Overlays() {
  const { ui } = useStore();
  return (
    <>
      <div id="overlay">
        {ui.modal ? (
          <div className="modal-bg" id="mbg" onClick={(e) => { if ((e.target as HTMLElement).id === 'mbg') closeModal(); }}>
            <div className="modal" role="dialog" aria-modal="true">{ui.modal}</div>
          </div>
        ) : null}
      </div>
      <div id="toastHost">{ui.toast ? <div className="toast">{ui.toast}</div> : null}</div>
    </>
  );
}

/** Loads saved state after hydration and forwards old #/ links to their new routes. */
export function Bootstrap() {
  const router = useRouter();
  useEffect(() => {
    loadState();
    const p = hashToPath(window.location.hash);
    if (p) router.replace(p);
  }, [router]);
  return null;
}
