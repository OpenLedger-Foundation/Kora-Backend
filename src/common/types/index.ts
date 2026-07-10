export enum InvoiceStatus {
  PENDING = 'pending',
  LISTED = 'listed',
  PARTIALLY_FUNDED = 'partially_funded',
  FULLY_FUNDED = 'fully_funded',
  REPAID = 'repaid',
  DEFAULTED = 'defaulted',
}

export enum RiskTier {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum InvoiceCategory {
  GOODS = 'goods',
  SERVICES = 'services',
  CONSTRUCTION = 'construction',
  TECHNOLOGY = 'technology',
  AGRICULTURE = 'agriculture',
  HEALTHCARE = 'healthcare',
  ENERGY = 'energy',
  OTHER = 'other',
}

export interface InvoiceMetadata {
  invoiceNumber: string;
  issuerName: string;
  debtorName: string;
  debtorAddress: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  description: string;
  category: InvoiceCategory;
  jurisdiction: string;
  pdfCid: string;
}

export interface PaginatedResult<T> {
  data: T[];
  /** Total number of matching records (before pagination) */
  total: number;
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPrevPage: boolean;
}

/**
 * Build a PaginatedResult with computed metadata from raw data + pagination params.
 */
export function paginate<T>(
  allItems: T[],
  page: number,
  limit: number,
): PaginatedResult<T> {
  const total = allItems.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  const data = allItems.slice(start, start + limit);

  return {
    data,
    total,
    page: safePage,
    limit,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
}
