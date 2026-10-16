export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data: T
  error?: string
}

export interface FilterOption {
  label: string
  value: string | number
}

export interface DateRangeFilter {
  startDate?: string
  endDate?: string
}

export type SortOrder = 'ascend' | 'descend' | null

export interface SortParam {
  field: string
  order: SortOrder
}
