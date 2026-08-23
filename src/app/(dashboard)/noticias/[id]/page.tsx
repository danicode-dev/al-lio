import { NewsDetailView } from "@/components/noticias/news-detail-view";

export const dynamic = "force-dynamic";

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NewsDetailView id={id} />;
}
