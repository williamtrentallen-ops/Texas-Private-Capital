import { LPs } from '@/components/pages/LPs';
import { readQuery } from '@/lib/query';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LPs {...(await readQuery(searchParams))} />;
}
