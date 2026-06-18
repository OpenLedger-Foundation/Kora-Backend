import { Injectable } from '@nestjs/common';
import { InvoiceService } from '../invoice/invoice.service';
import { FilterInvoicesDto, FundInvoiceDto } from './dto/marketplace.dto';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceStatus } from '../common/types';

// Position: investor → invoiceId → amount
const positions = new Map<string, Map<string, number>>();

@Injectable()
export class MarketplaceService {
  constructor(private readonly invoiceService: InvoiceService) {}

  getListings(filters: FilterInvoicesDto, page = 1, limit = 20) {
    const { data, total } = this.invoiceService.findAll(1, 9999);
    let listed = data.filter(
      (i) => i.status === InvoiceStatus.LISTED || i.status === InvoiceStatus.PARTIALLY_FUNDED,
    );

    if (filters.riskTier) listed = listed.filter((i) => i.riskTier === filters.riskTier);
    if (filters.category) listed = listed.filter((i) => i.category === filters.category);
    if (filters.jurisdiction) listed = listed.filter((i) => i.jurisdiction === filters.jurisdiction);
    if (filters.minApr != null) listed = listed.filter((i) => i.discountRate >= filters.minApr!);
    if (filters.maxApr != null) listed = listed.filter((i) => i.discountRate <= filters.maxApr!);

    const start = (page - 1) * limit;
    return { data: listed.slice(start, start + limit), total: listed.length, page, limit };
  }

  fund(walletAddress: string, dto: FundInvoiceDto): Invoice {
    const updated = this.invoiceService.updateFunding(dto.invoiceId, dto.amount);
    if (!positions.has(walletAddress)) positions.set(walletAddress, new Map());
    const wallet = positions.get(walletAddress)!;
    wallet.set(dto.invoiceId, (wallet.get(dto.invoiceId) ?? 0) + dto.amount);
    return updated;
  }

  getPositions(walletAddress: string) {
    const wallet = positions.get(walletAddress) ?? new Map<string, number>();
    return [...wallet.entries()].map(([invoiceId, invested]) => {
      const invoice = this.invoiceService.findOne(invoiceId);
      const expectedYield = invested * (invoice.discountRate / 100);
      return { invoiceId, invested, expectedYield, invoice };
    });
  }
}
