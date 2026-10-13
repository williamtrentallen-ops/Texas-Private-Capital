'use client';
// Small shared pieces: tags, source-status badges, source links, compare bar.
import Link from 'next/link';
import { useEffect, useState, type ChangeEvent, type CSSProperties } from 'react';
import { FS_LABEL, STATUS_LABEL, TYPE_LABEL } from '@/lib/data';
import { cap1 } from '@/lib/format';
import { firm, render, ui } from '@/lib/store';
import type { Source } from '@/lib/types';

export const TypeTag = ({ t }: { t: string }) => <span className={`tag type-${t}`}>{TYPE_LABEL[t]}</span>;

export const StatusTag = ({ s }: { s: string }) => <span className={`tag ${s}`}>{STATUS_LABEL[s]}</span>;

export const DealStatusTag = ({ s }: { s: string }) => <span className={`tag status-${s}`}>{cap1(s)}</span>;

/** Per-field source status. Missing status renders as publicly sourced, as in the prototype. */
export function SrcTag({ fs, k }: { fs: Record<string, string> | undefined; k: string }) {
  const v = (fs || {})[k] || 'public';
  return <span className={`src ${v}`} title={FS_LABEL[v]}>{FS_LABEL[v]}</span>;
}

export function SourceLink({ source }: { source: Source }) {
  return source.url ? (
    <a href={source.url} target="_blank" rel="noopener">{source.label}</a>
  ) : (
    <>{source.label}</>
  );
}

export const Tags = ({ items }: { items: string[] }) => (
  <>{items.map((i) => <span className="tag" key={i}>{i}</span>)}</>
);

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children}
    </div>
  );
}

export function CompareBar() {
  const compare = ui().compare;
  if (!compare.length) return null;
  return (
    <div className="compare-bar">
      <span className="names">Comparing {compare.length}/3: {compare.map((id) => firm(id)!.name).join(', ')}</span>
      <Link className="btn sm green" href="/compare" style={compare.length < 2 ? { pointerEvents: 'none', opacity: 0.5 } : undefined}>Compare</Link>
      <button className="btn sm ghost" style={{ color: '#fff' }} onClick={() => { ui().compare = []; render(); }}>Clear</button>
    </div>
  );
}

/** Text input that commits after 300ms of no typing, like the prototype's debounced filters. */
export function DebouncedInput({ value, onCommit, className = 'input', style, ...rest }: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
  style?: CSSProperties;
  id?: string;
  type?: string;
  placeholder?: string;
  min?: string;
  step?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onCommit(local), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);
  return <input className={className} style={style} value={local} onChange={(e: ChangeEvent<HTMLInputElement>) => setLocal(e.target.value)} {...rest} />;
}
