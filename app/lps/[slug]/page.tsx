import { LPProfile } from '@/components/pages/LPs';
import { LPS } from '@/lib/data';

export function generateStaticParams() {
  return LPS.map((n) => ({ slug: n.id }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LPProfile id={slug} />;
}
