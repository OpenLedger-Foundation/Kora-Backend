import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateInvoiceDto, MintInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { Invoice } from './entities/invoice.entity';
import { InvoiceStatus, RiskTier, PaginatedResult } from '../common/types';
import { InvoiceNotFoundException } from '../common/exceptions/invoice-not-found.exception';
import { v4 as uuid } from 'crypto';

// In-memory store — replace with DB (Postgres / PrismaService) in production
const store = new Map<string, Invoice>();

function calcRisk(amount: number, discountRate: number): { tier: RiskTier; score: number } {
  if (amount > 100_000 || discountRate > 20) return { tier: RiskTier.HIGH, score: 75 };
  if (amount > 20_000 || discountRate > 10) return { tier: RiskTier.MEDIUM, score: 50 };
  return { tier: RiskTier.LOW, score: 25 };
}

export interface InvoiceSearchOptions {
  keyword?: string;
  status?: InvoiceStatus;
  riskTier?: RiskTier;
  page?: number;
  limit?: number;
}

@Injectable()
export class InvoiceService {
  create(walletAddress: string, dto: CreateInvoiceDto): Invoice {
    const { tier, score } = calcRisk(dto.amount, dto.discountRate);
    const now = new Date();
    const invoice: Invoice = {
      id: crypto.randomUUID(),
      issuerWallet: walletAddress,
      ...dto,
      financingAmount: dto.amount * (1 - dto.discountRate / 100),
      amountFunded: 0,
      status: InvoiceStatus.PENDING,
      riskTier: tier,
      riskScore: score,
      createdAt: now,
      updatedAt: now,
    };
    store.set(invoice.id, invoice);
    return invoice;
  }

  findAll(page = 1, limit = 20): PaginatedResult<Invoice> {
    const all = [...store.values()];
    const start = (page - 1) * limit;
    return { data: all.slice(start, start + limit), total: all.length, page, limit };
  }

  /**
   * Full-text keyword search across invoice fields:
   * invoiceNumber, issuerName, debtorName, description, jurisdiction, category.
   * Optionally filter by status and/or riskTier, with pagination.
   */
  search(options: InvoiceSearchOptions): PaginatedResult<Invoice> {
    const { keyword, status, riskTier, page = 1, limit = 20 } = options;
    let results = [...store.values()];

    if (keyword) {
      const q = keyword.toLowerCase().trim();
      results = results.filter((inv) =>
        [
          inv.invoiceNumber,
          inv.issuerName,
          inv.debtorName,
          inv.description,
          inv.jurisdiction,
          inv.category,
        ]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(q)),
      );
    }

    if (status) {
      results = results.filter((inv) => inv.status === status);
    }

    if (riskTier) {
      results = results.filter((inv) => inv.riskTier === riskTier);
    }

    const total = results.length;
    const start = (page - 1) * limit;

    return {
      data: results.slice(start, start + limit),
      total,
      page,
      limit,
    };
  }

  findByWallet(walletAddress: string): Invoice[] {
    return [...store.values()].filter((i) => i.issuerWallet === walletAddress);
  }

  findOne(id: string): Invoice {
    const invoice = store.get(id);
    if (!invoice) throw new InvoiceNotFoundException(id);
    return invoice;
  }

  update(id: string, walletAddress: string, dto: UpdateInvoiceDto): Invoice {
    const invoice = this.findOne(id);
    if (invoice.issuerWallet !== walletAddress) throw new ForbiddenException();
    Object.assign(invoice, dto, { updatedAt: new Date() });
    store.set(id, invoice);
    return invoice;
  }

  recordMint(dto: MintInvoiceDto): Invoice {
    const invoice = this.findOne(dto.invoiceId);
    invoice.pdfCid = dto.pdfCid;
    invoice.metadataCid = dto.metadataCid;
    invoice.tokenId = dto.tokenId;
    invoice.status = InvoiceStatus.LISTED;
    invoice.updatedAt = new Date();
    store.set(invoice.id, invoice);
    return invoice;
  }

  updateFunding(id: string, amount: number): Invoice {
    const invoice = this.findOne(id);
    invoice.amountFunded = Math.min(invoice.amountFunded + amount, invoice.financingAmount);
    invoice.status =
      invoice.amountFunded >= invoice.financingAmount
        ? InvoiceStatus.FULLY_FUNDED
        : InvoiceStatus.PARTIALLY_FUNDED;
    invoice.updatedAt = new Date();
    store.set(id, invoice);
    return invoice;
  }

  delete(id: string, walletAddress: string): void {
    const invoice = this.findOne(id);
    if (invoice.issuerWallet !== walletAddress) throw new ForbiddenException();
    if (invoice.status !== InvoiceStatus.PENDING) {
      throw new BadRequestException('Only PENDING invoices can be deleted');
    }
    store.delete(id);
  }

  repay(id: string, walletAddress: string): Invoice {
    const invoice = this.findOne(id);
    if (invoice.issuerWallet !== walletAddress) throw new ForbiddenException();
    if (invoice.status !== InvoiceStatus.FULLY_FUNDED) {
      throw new BadRequestException('Only FULLY_FUNDED invoices can be repaid');
    }
    invoice.status = InvoiceStatus.REPAID;
    invoice.updatedAt = new Date();
    store.set(id, invoice);
    return invoice;
  }

  markDefaulted(id: string): Invoice {
    const invoice = this.findOne(id);
    if (
      invoice.status !== InvoiceStatus.LISTED &&
      invoice.status !== InvoiceStatus.PARTIALLY_FUNDED &&
      invoice.status !== InvoiceStatus.FULLY_FUNDED
    ) {
      throw new BadRequestException('Invoice cannot be marked as defaulted in its current status');
    }
    invoice.status = InvoiceStatus.DEFAULTED;
    invoice.updatedAt = new Date();
    store.set(id, invoice);
    return invoice;
  }
}
