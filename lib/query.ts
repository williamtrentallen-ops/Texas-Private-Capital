// Query-string plumbing for pages. Server pages pass the parsed query and the
// raw query string; the client pages use the raw string to apply a link's
// filters once, the way the prototype tracked its last-seen hash query.

export interface PageQuery {
  q: Record<string, string>;
  qs: string;
}

type SP = Record<string, string | string[] | undefined>;

export async function readQuery(searchParams: Promise<SP>): Promise<PageQuery> {
  const sp = await searchParams;
  const q: Record<string, string> = {};
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const first = Array.isArray(v) ? v[0] : v;
    if (first == null) continue;
    q[k] = first;
    u.append(k, first);
  }
  return { q, qs: u.toString() };
}
