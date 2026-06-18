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
  total: number;
  page: number;
  limit: number;
}
