import { News } from '@/components/pages/News';
import { readQuery } from '@/lib/query';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <News {...(await readQuery(searchParams))} />;
}
