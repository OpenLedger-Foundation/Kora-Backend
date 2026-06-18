import { Injectable } from '@nestjs/common';
import { InvoiceService } from '../invoice/invoice.service';
import { InvoiceStatus, RiskTier } from '../common/types';

@Injectable()
export class AnalyticsService {
  constructor(private readonly invoiceService: InvoiceService) {}

  getProtocolStats() {
    const { data } = this.invoiceService.findAll(1, 9999);
    const totalVolume = data.reduce((s, i) => s + i.amount, 0);
    const totalFunded = data.reduce((s, i) => s + i.amountFunded, 0);
    const activeInvoices = data.filter((i) =>
      [InvoiceStatus.LISTED, InvoiceStatus.PARTIALLY_FUNDED].includes(i.status),
    ).length;
    const repaid = data.filter((i) => i.status === InvoiceStatus.REPAID).length;

    return {
      totalInvoices: data.length,
      totalVolume,
      totalFunded,
      activeInvoices,
      repaidInvoices: repaid,
      defaultedInvoices: data.filter((i) => i.status === InvoiceStatus.DEFAULTED).length,
    };
  }

  getRiskDistribution() {
    const { data } = this.invoiceService.findAll(1, 9999);
    return Object.values(RiskTier).map((tier) => ({
      tier,
      count: data.filter((i) => i.riskTier === tier).length,
    }));
  }

  getInvestorStats(walletAddress: string, positions: any[]) {
    const totalInvested = positions.reduce((s, p) => s + p.invested, 0);
    const totalYield = positions.reduce((s, p) => s + p.expectedYield, 0);
    return { walletAddress, totalInvested, totalExpectedYield: totalYield, positions: positions.length };
  }
}
