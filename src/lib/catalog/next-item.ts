export function getNextCatalogItem<T extends { id: string }>(
  items: readonly T[],
  currentId: string,
): T | null {
  if (items.length < 2) return null;

  const currentIndex = items.findIndex((item) => item.id === currentId);
  if (currentIndex < 0) return null;

  return items[(currentIndex + 1) % items.length] ?? null;
}
