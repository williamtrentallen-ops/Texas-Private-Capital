// Rule 1: sample data stays fictional, uses reserved example domains, and is labeled.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(__dirname, '..', 'data');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

describe('sample data', () => {
  it.each(files)('%s marks every record is_sample', (f) => {
    const rows = JSON.parse(readFileSync(join(dir, f), 'utf8')) as { is_sample?: boolean }[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.is_sample === true)).toBe(true);
  });

  it.each(files)('%s only links to reserved example domains', (f) => {
    const text = readFileSync(join(dir, f), 'utf8');
    const hosts = [...text.matchAll(/https?:\/\/([^/"\s]+)/g)].map((m) => m[1]);
    const emails = [...text.matchAll(/[\w.+-]+@([\w.-]+)/g)].map((m) => m[1]);
    for (const h of [...hosts, ...emails]) expect(h).toMatch(/\.example\.(com|org|gov|edu)$|^example\.(com|org)$/);
  });
});
