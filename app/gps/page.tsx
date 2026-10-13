import GPs from '@/components/pages/GPs';
import { readQuery } from '@/lib/query';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <GPs {...(await readQuery(searchParams))} />;
}
