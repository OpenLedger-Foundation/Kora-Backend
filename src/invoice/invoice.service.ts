import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateInvoiceDto, MintInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { Invoice } from './entities/invoice.entity';
import { InvoiceStatus, RiskTier, PaginatedResult } from '../common/types';
import { v4 as uuid } from 'crypto';

// In-memory store — replace with DB (Postgres / PrismaService) in production
const store = new Map<string, Invoice>();

function calcRisk(amount: number, discountRate: number): { tier: RiskTier; score: number } {
  if (amount > 100_000 || discountRate > 20) return { tier: RiskTier.HIGH, score: 75 };
  if (amount > 20_000 || discountRate > 10) return { tier: RiskTier.MEDIUM, score: 50 };
  return { tier: RiskTier.LOW, score: 25 };
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

  findByWallet(walletAddress: string): Invoice[] {
    return [...store.values()].filter((i) => i.issuerWallet === walletAddress);
  }

  findOne(id: string): Invoice {
    const invoice = store.get(id);
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
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
}
