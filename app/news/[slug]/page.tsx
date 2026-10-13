import { Article } from '@/components/pages/News';
import { NEWS } from '@/lib/data';

export function generateStaticParams() {
  return NEWS.map((n) => ({ slug: n.id }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Article id={slug} />;
}
