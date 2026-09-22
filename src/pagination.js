export const PAGE_SIZE = 3;
export function paginate(items, requestedPage, size = PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(pageCount, Math.max(1, requestedPage));
  return {
    page,
    pageCount,
    offset: (page - 1) * size,
    items: items.slice((page - 1) * size, page * size),
  };
}
