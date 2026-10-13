import GPProfile from '@/components/pages/GPProfile';
import { FIRMS } from '@/lib/data';

export function generateStaticParams() {
  return FIRMS.map((n) => ({ slug: n.id }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <GPProfile id={slug} />;
}
