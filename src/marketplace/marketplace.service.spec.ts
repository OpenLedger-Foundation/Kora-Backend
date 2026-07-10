import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceService } from './marketplace.service';
import { InvoiceService } from '../invoice/invoice.service';
import { InvoiceStatus, RiskTier, InvoiceCategory } from '../common/types';

const INVESTOR = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
const SME = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGAMA5IHGGDNKQXZPGZXFMWRS';

const baseDto = {
  invoiceNumber: 'INV-MKT-001',
  issuerName: 'FarmFresh Ltd',
  debtorName: 'SuperMart',
  debtorAddress: '1 Market Ave',
  amount: 15_000,
  currency: 'USD',
  issueDate: '2025-01-01',
  dueDate: '2025-06-01',
  description: 'Agricultural produce supply',
  category: InvoiceCategory.AGRICULTURE,
  jurisdiction: 'GH',
  discountRate: 9,
  minimumInvestment: 500,
};

describe('MarketplaceService', () => {
  let marketplace: MarketplaceService;
  let invoiceService: InvoiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketplaceService, InvoiceService],
    }).compile();

    marketplace = module.get<MarketplaceService>(MarketplaceService);
    invoiceService = module.get<InvoiceService>(InvoiceService);
  });

  function seedListedInvoice(overrides: Partial<typeof baseDto> = {}) {
    const inv = invoiceService.create(SME, { ...baseDto, ...overrides });
    invoiceService.recordMint({ invoiceId: inv.id, pdfCid: 'Qm1', metadataCid: 'Qm2', tokenId: `tok-${inv.id}` });
    return invoiceService.findOne(inv.id);
  }

  describe('getListings()', () => {
    it('should return only LISTED and PARTIALLY_FUNDED invoices', () => {
      seedListedInvoice();
      invoiceService.create(SME, { ...baseDto, invoiceNumber: 'INV-PENDING' }); // stays PENDING

      const result = marketplace.getListings({}, 1, 20);
      expect(result.data.every((i) =>
        [InvoiceStatus.LISTED, InvoiceStatus.PARTIALLY_FUNDED].includes(i.status),
      )).toBe(true);
    });

    it('should filter by riskTier', () => {
      seedListedInvoice({ amount: 5_000 }); // LOW risk
      seedListedInvoice({ amount: 150_000, invoiceNumber: 'INV-HIGH' }); // HIGH risk

      const result = marketplace.getListings({ riskTier: RiskTier.LOW }, 1, 20);
      expect(result.data.every((i) => i.riskTier === RiskTier.LOW)).toBe(true);
    });

    it('should filter by jurisdiction', () => {
      seedListedInvoice({ jurisdiction: 'GH' });
      seedListedInvoice({ jurisdiction: 'NG', invoiceNumber: 'INV-NG' });

      const result = marketplace.getListings({ jurisdiction: 'GH' }, 1, 20);
      expect(result.data.every((i) => i.jurisdiction === 'GH')).toBe(true);
    });

    it('should filter by minAmount and maxAmount', () => {
      seedListedInvoice({ amount: 5_000, invoiceNumber: 'INV-SMALL' });
      seedListedInvoice({ amount: 50_000, invoiceNumber: 'INV-BIG' });

      const result = marketplace.getListings({ minAmount: 10_000, maxAmount: 60_000 }, 1, 20);
      expect(result.data.every((i) => i.amount >= 10_000 && i.amount <= 60_000)).toBe(true);
    });

    it('should sort by discountRate ascending', () => {
      seedListedInvoice({ discountRate: 15, invoiceNumber: 'INV-HIGH-APR' });
      seedListedInvoice({ discountRate: 5, invoiceNumber: 'INV-LOW-APR' });

      const result = marketplace.getListings({ sortBy: 'discountRate', sortOrder: 'asc' }, 1, 20);
      const rates = result.data.map((i) => i.discountRate);
      for (let idx = 1; idx < rates.length; idx++) {
        expect(rates[idx]).toBeGreaterThanOrEqual(rates[idx - 1]);
      }
    });

    it('should return pagination metadata', () => {
      for (let i = 0; i < 5; i++) {
        seedListedInvoice({ invoiceNumber: `INV-${i}` });
      }
      const result = marketplace.getListings({}, 1, 2);
      expect(result.limit).toBe(2);
      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.totalPages).toBeGreaterThan(1);
      expect(result.hasNextPage).toBe(true);
    });
  });

  describe('fund()', () => {
    it('should record investment and update invoice funding', () => {
      const inv = seedListedInvoice();
      const updated = marketplace.fund(INVESTOR, { invoiceId: inv.id, amount: 1_000 });
      expect(updated.amountFunded).toBe(1_000);
      expect(updated.status).toBe(InvoiceStatus.PARTIALLY_FUNDED);
    });

    it('should accumulate multiple investments from same wallet', () => {
      const inv = seedListedInvoice();
      marketplace.fund(INVESTOR, { invoiceId: inv.id, amount: 1_000 });
      marketplace.fund(INVESTOR, { invoiceId: inv.id, amount: 2_000 });
      const positions = marketplace.getPositions(INVESTOR);
      const pos = positions.find((p) => p.invoiceId === inv.id);
      expect(pos?.invested).toBe(3_000);
    });

    it('should fully fund an invoice', () => {
      const inv = seedListedInvoice({ amount: 2_000, discountRate: 10 });
      const updated = marketplace.fund(INVESTOR, { invoiceId: inv.id, amount: inv.financingAmount });
      expect(updated.status).toBe(InvoiceStatus.FULLY_FUNDED);
    });
  });

  describe('getPositions()', () => {
    it('should return empty array for investor with no positions', () => {
      const positions = marketplace.getPositions('GNOBODYHERE');
      expect(positions).toHaveLength(0);
    });

    it('should return positions with expectedYield calculated', () => {
      const inv = seedListedInvoice();
      marketplace.fund(INVESTOR, { invoiceId: inv.id, amount: 5_000 });
      const positions = marketplace.getPositions(INVESTOR);
      expect(positions).toHaveLength(1);
      expect(positions[0].expectedYield).toBeCloseTo(5_000 * (inv.discountRate / 100));
      expect(positions[0].invoice).toBeDefined();
    });
  });
});
