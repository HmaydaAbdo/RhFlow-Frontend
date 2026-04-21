export interface PageRequest {
  page: number;
  size: number;
  sortBy: string;
  direction: 'asc' | 'desc';
}
export interface PageResponse<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}
