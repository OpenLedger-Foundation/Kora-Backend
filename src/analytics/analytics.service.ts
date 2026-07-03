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
      averageDiscountRate: data.length
        ? data.reduce((s, i) => s + i.discountRate, 0) / data.length
        : 0,
      utilizationRate: totalVolume > 0 ? (totalFunded / totalVolume) * 100 : 0,
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

  getCategoryBreakdown() {
    const { data } = this.invoiceService.findAll(1, 9999);
    const breakdown: Record<string, { count: number; totalVolume: number }> = {};
    for (const invoice of data) {
      if (!breakdown[invoice.category]) breakdown[invoice.category] = { count: 0, totalVolume: 0 };
      breakdown[invoice.category].count++;
      breakdown[invoice.category].totalVolume += invoice.amount;
    }
    return Object.entries(breakdown).map(([category, stats]) => ({ category, ...stats }));
  }
}
