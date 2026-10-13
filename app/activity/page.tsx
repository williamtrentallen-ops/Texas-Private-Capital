import Activity from '@/components/pages/Activity';
import { readQuery } from '@/lib/query';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Activity {...(await readQuery(searchParams))} />;
}
