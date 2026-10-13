// URL scheme. The prototype's hash routes map to real routes as follows:
//   #/firm/:id → /gps/:id      #/article/:id → /news/:id
//   #/deal/:id → /deals/:id    #/lp/:id      → /lps/:id
//   #/firms    → /gps          everything else keeps its name (#/match → /match).

export const firmHref = (id: string) => `/gps/${id}`;
export const articleHref = (id: string) => `/news/${id}`;
export const dealHref = (id: string) => `/deals/${id}`;
export const lpHref = (id: string) => `/lps/${id}`;

/** The prototype's page key for a pathname, used for nav highlighting. */
export function pageOf(pathname: string): string {
  const [first, second] = pathname.split('/').filter(Boolean);
  if (!first) return 'home';
  if (second) return ({ gps: 'firm', news: 'article', deals: 'deal', lps: 'lp' } as Record<string, string>)[first] || first;
  return first;
}

/** Translate an old prototype hash (e.g. "#/firm/x?y=1") into the new path. */
export function hashToPath(hash: string): string | null {
  const h = hash.replace(/^#\/?/, '');
  if (!hash.startsWith('#/')) return null;
  const [path, qs] = h.split('?');
  const [page, id] = path.split('/');
  const base: Record<string, string> = { firm: '/gps', firms: '/gps', article: '/news', deal: '/deals', lp: '/lps' };
  const p = !page ? '/' : id ? `${base[page] || '/' + page}/${id}` : page === 'firms' ? '/gps' : `/${page}`;
  return p + (qs ? `?${qs}` : '');
}
