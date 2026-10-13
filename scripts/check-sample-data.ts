/* Confirms /data/*.json matches the sample data the prototype builds at runtime.
 * Runs the prototype's own script (texas-private-capital.html) in a sandbox with
 * a stub DOM, then deep-compares each collection with the JSON files.
 * Run: npm run data:check
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import vm from 'node:vm';

const root = join(__dirname, '..');
const html = readFileSync(join(root, 'texas-private-capital.html'), 'utf8');
const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
// Stop before the prototype draws the page; expose the data instead.
const body = script.replace(/buildNav\(\);\s*render\(\);\s*$/, '');
if (body === script) throw new Error('Could not find the prototype bootstrap call');

// A stub that accepts any property access, call or assignment.
const stub: any = new Proxy(function () {}, {
  get: (_t, k) => (k === Symbol.toPrimitive ? () => '' : stub),
  apply: () => stub,
  set: () => true,
});
const sandbox: Record<string, unknown> = {
  document: stub,
  window: stub,
  location: { hash: '' },
  localStorage: { getItem: () => null, setItem: () => {} },
  structuredClone,
  console,
};
vm.createContext(sandbox);
vm.runInContext(body + '\n;globalThis.__out={FIRMS,EVENTS,NEWS,DEALS,LPS,ADMIN_SEED};', sandbox);
// Round-trip through JSON so objects from the sandbox compare like local ones.
const proto = JSON.parse(JSON.stringify(sandbox.__out)) as Record<string, object[]>;

const strip = (rows: Record<string, unknown>[]) => rows.map(({ is_sample, ...rest }) => {
  if (is_sample !== true) throw new Error('record missing is_sample: true');
  return rest;
});
const load = (f: string) => strip(JSON.parse(readFileSync(join(root, 'data', f), 'utf8')));

const pairs: [string, string][] = [
  ['FIRMS', 'firms.json'],
  ['EVENTS', 'events.json'],
  ['NEWS', 'news.json'],
  ['DEALS', 'deals.json'],
  ['LPS', 'lps.json'],
  ['ADMIN_SEED', 'research-queue.json'],
];
let failed = false;
for (const [name, file] of pairs) {
  const a = proto[name];
  const b = load(file);
  const ok = isDeepStrictEqual(a, b);
  console.log(`${ok ? 'match' : 'DIFF '}  ${file}  (${b.length} records)`);
  if (!ok) {
    failed = true;
    const i = a.findIndex((x, j) => !isDeepStrictEqual(x, b[j]));
    console.log('  first difference at index', i);
    console.log('  prototype:', JSON.stringify(a[i]).slice(0, 400));
    console.log('  data/    :', JSON.stringify(b[i]).slice(0, 400));
  }
}
process.exit(failed ? 1 : 0);
