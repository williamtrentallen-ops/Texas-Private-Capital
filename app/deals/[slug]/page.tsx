import { Deal } from '@/components/pages/Deals';
import { DEALS } from '@/lib/data';

export function generateStaticParams() {
  return DEALS.map((n) => ({ slug: n.id }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Deal id={slug} />;
}
