import { NewsDetailView } from "@/features/news";

export const dynamic = "force-dynamic";

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NewsDetailView id={id} />;
}
