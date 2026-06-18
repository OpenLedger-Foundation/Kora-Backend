import { InvoiceStatus, RiskTier, InvoiceCategory } from '../../common/types';

export class Invoice {
  id: string;
  tokenId?: string;          // Soroban NFT token ID after minting
  issuerWallet: string;      // SME Stellar public key
  invoiceNumber: string;
  issuerName: string;
  debtorName: string;
  debtorAddress: string;
  amount: number;            // Face value in USD
  financingAmount: number;   // amount * (1 - discountRate/100)
  currency: string;
  issueDate: string;
  dueDate: string;
  description: string;
  category: InvoiceCategory;
  jurisdiction: string;
  discountRate: number;      // % yield for investors
  minimumInvestment: number;
  amountFunded: number;      // Total USDC funded so far
  pdfCid?: string;
  metadataCid?: string;
  status: InvoiceStatus;
  riskTier: RiskTier;
  riskScore: number;         // 0-100
  createdAt: Date;
  updatedAt: Date;
}
