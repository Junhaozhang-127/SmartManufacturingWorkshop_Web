export interface PaginationQuery {
  page: number;
  pageSize: number;
  keyword?: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface PageResult<T> {
  items: T[];
  meta: PageMeta;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;

export function normalizePagination(query: Partial<PaginationQuery>): PaginationQuery {
  const page = Math.max(1, Number(query.page ?? DEFAULT_PAGE));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? DEFAULT_PAGE_SIZE)));

  return {
    page,
    pageSize,
    keyword: query.keyword?.trim() || undefined,
  };
}
