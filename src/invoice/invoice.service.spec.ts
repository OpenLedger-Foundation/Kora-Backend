import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceStatus, RiskTier, InvoiceCategory } from '../common/types';
import { InvoiceNotFoundException } from '../common/exceptions/invoice-not-found.exception';

const WALLET = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
const OTHER_WALLET = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGAMA5IHGGDNKQXZPGZXFMWRS';

const baseDto = {
  invoiceNumber: 'INV-001',
  issuerName: 'Acme Corp',
  debtorName: 'Beta LLC',
  debtorAddress: '123 Main St',
  amount: 10_000,
  currency: 'USD',
  issueDate: '2025-01-01',
  dueDate: '2025-04-01',
  description: 'Software services',
  category: InvoiceCategory.TECHNOLOGY,
  jurisdiction: 'NG',
  discountRate: 8,
  minimumInvestment: 500,
};

describe('InvoiceService', () => {
  let service: InvoiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvoiceService],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);

    // clear the in-memory store between tests via reflection
    const store: Map<string, any> = (service as any).__proto__.constructor['store'] ??
      // fallback: access module-level store by recreating
      new Map();
  });

  describe('create()', () => {
    it('should create an invoice with PENDING status', () => {
      const invoice = service.create(WALLET, baseDto);
      expect(invoice.id).toBeDefined();
      expect(invoice.status).toBe(InvoiceStatus.PENDING);
      expect(invoice.issuerWallet).toBe(WALLET);
      expect(invoice.riskTier).toBe(RiskTier.LOW);
    });

    it('should calculate financingAmount correctly', () => {
      const invoice = service.create(WALLET, baseDto);
      const expected = baseDto.amount * (1 - baseDto.discountRate / 100);
      expect(invoice.financingAmount).toBeCloseTo(expected);
    });

    it('should assign HIGH risk tier for large amounts', () => {
      const invoice = service.create(WALLET, { ...baseDto, amount: 150_000, discountRate: 5 });
      expect(invoice.riskTier).toBe(RiskTier.HIGH);
    });

    it('should assign MEDIUM risk tier for mid-range amounts', () => {
      const invoice = service.create(WALLET, { ...baseDto, amount: 50_000, discountRate: 5 });
      expect(invoice.riskTier).toBe(RiskTier.MEDIUM);
    });
  });

  describe('findAll()', () => {
    it('should return paginated results', () => {
      service.create(WALLET, baseDto);
      service.create(WALLET, { ...baseDto, invoiceNumber: 'INV-002' });

      const result = service.findAll(1, 1);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
    });
  });

  describe('findOne()', () => {
    it('should return invoice by ID', () => {
      const created = service.create(WALLET, baseDto);
      const found = service.findOne(created.id);
      expect(found.id).toBe(created.id);
    });

    it('should throw InvoiceNotFoundException for unknown ID', () => {
      expect(() => service.findOne('nonexistent-id')).toThrow(InvoiceNotFoundException);
    });
  });

  describe('findByWallet()', () => {
    it('should return only invoices belonging to the given wallet', () => {
      service.create(WALLET, baseDto);
      service.create(OTHER_WALLET, { ...baseDto, invoiceNumber: 'INV-X' });

      const results = service.findByWallet(WALLET);
      expect(results.every((i) => i.issuerWallet === WALLET)).toBe(true);
    });
  });

  describe('search()', () => {
    it('should filter by keyword in issuerName', () => {
      service.create(WALLET, baseDto);
      service.create(WALLET, { ...baseDto, invoiceNumber: 'INV-002', issuerName: 'ZetaFirm' });

      const results = service.search({ keyword: 'zeta' });
      expect(results.data.every((i) => i.issuerName.toLowerCase().includes('zeta'))).toBe(true);
    });

    it('should filter by status', () => {
      const inv = service.create(WALLET, baseDto);
      service.recordMint({ invoiceId: inv.id, pdfCid: 'Qm1', metadataCid: 'Qm2', tokenId: 'tok1' });

      const results = service.search({ status: InvoiceStatus.LISTED });
      expect(results.data.every((i) => i.status === InvoiceStatus.LISTED)).toBe(true);
    });

    it('should filter by riskTier', () => {
      service.create(WALLET, baseDto); // LOW risk
      service.create(WALLET, { ...baseDto, invoiceNumber: 'INV-002', amount: 150_000 }); // HIGH risk

      const highResults = service.search({ riskTier: RiskTier.HIGH });
      expect(highResults.data.every((i) => i.riskTier === RiskTier.HIGH)).toBe(true);
    });

    it('should return empty results for unmatched keyword', () => {
      service.create(WALLET, baseDto);
      const results = service.search({ keyword: 'zzznomatch' });
      expect(results.data).toHaveLength(0);
    });
  });

  describe('update()', () => {
    it('should update invoice fields', () => {
      const inv = service.create(WALLET, baseDto);
      const updated = service.update(inv.id, WALLET, { description: 'Updated desc' });
      expect(updated.description).toBe('Updated desc');
    });

    it('should throw ForbiddenException for non-owner', () => {
      const inv = service.create(WALLET, baseDto);
      expect(() => service.update(inv.id, OTHER_WALLET, { description: 'hack' })).toThrow(ForbiddenException);
    });
  });

  describe('recordMint()', () => {
    it('should set status to LISTED after minting', () => {
      const inv = service.create(WALLET, baseDto);
      const minted = service.recordMint({
        invoiceId: inv.id,
        pdfCid: 'QmPdf123',
        metadataCid: 'QmMeta456',
        tokenId: 'token-001',
      });
      expect(minted.status).toBe(InvoiceStatus.LISTED);
      expect(minted.tokenId).toBe('token-001');
    });
  });

  describe('updateFunding()', () => {
    it('should mark as PARTIALLY_FUNDED when partially funded', () => {
      const inv = service.create(WALLET, baseDto);
      service.recordMint({ invoiceId: inv.id, pdfCid: 'c1', metadataCid: 'c2', tokenId: 't1' });
      const result = service.updateFunding(inv.id, 1000);
      expect(result.status).toBe(InvoiceStatus.PARTIALLY_FUNDED);
      expect(result.amountFunded).toBe(1000);
    });

    it('should mark as FULLY_FUNDED when full amount is reached', () => {
      const inv = service.create(WALLET, baseDto);
      service.recordMint({ invoiceId: inv.id, pdfCid: 'c1', metadataCid: 'c2', tokenId: 't1' });
      const result = service.updateFunding(inv.id, inv.financingAmount);
      expect(result.status).toBe(InvoiceStatus.FULLY_FUNDED);
    });
  });

  describe('repay()', () => {
    it('should transition FULLY_FUNDED invoice to REPAID', () => {
      const inv = service.create(WALLET, baseDto);
      service.recordMint({ invoiceId: inv.id, pdfCid: 'c1', metadataCid: 'c2', tokenId: 't1' });
      service.updateFunding(inv.id, inv.financingAmount);
      const repaid = service.repay(inv.id, WALLET);
      expect(repaid.status).toBe(InvoiceStatus.REPAID);
    });

    it('should throw BadRequestException if not FULLY_FUNDED', () => {
      const inv = service.create(WALLET, baseDto);
      expect(() => service.repay(inv.id, WALLET)).toThrow(BadRequestException);
    });
  });

  describe('markDefaulted()', () => {
    it('should mark a LISTED invoice as DEFAULTED', () => {
      const inv = service.create(WALLET, baseDto);
      service.recordMint({ invoiceId: inv.id, pdfCid: 'c1', metadataCid: 'c2', tokenId: 't1' });
      const defaulted = service.markDefaulted(inv.id);
      expect(defaulted.status).toBe(InvoiceStatus.DEFAULTED);
    });

    it('should throw BadRequestException for PENDING invoices', () => {
      const inv = service.create(WALLET, baseDto);
      expect(() => service.markDefaulted(inv.id)).toThrow(BadRequestException);
    });
  });

  describe('delete()', () => {
    it('should delete a PENDING invoice', () => {
      const inv = service.create(WALLET, baseDto);
      service.delete(inv.id, WALLET);
      expect(() => service.findOne(inv.id)).toThrow(InvoiceNotFoundException);
    });

    it('should throw ForbiddenException for non-owner', () => {
      const inv = service.create(WALLET, baseDto);
      expect(() => service.delete(inv.id, OTHER_WALLET)).toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for non-PENDING invoices', () => {
      const inv = service.create(WALLET, baseDto);
      service.recordMint({ invoiceId: inv.id, pdfCid: 'c1', metadataCid: 'c2', tokenId: 't1' });
      expect(() => service.delete(inv.id, WALLET)).toThrow(BadRequestException);
    });
  });
});
