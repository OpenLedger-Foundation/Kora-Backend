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

    return {
      totalInvoices: data.length,
      totalVolume,
      totalFunded,
      activeInvoices,
      repaidInvoices: data.filter((i) => i.status === InvoiceStatus.REPAID).length,
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
      totalVolume: data
        .filter((i) => i.riskTier === tier)
        .reduce((s, i) => s + i.amount, 0),
    }));
  }

  getCategoryBreakdown() {
    const { data } = this.invoiceService.findAll(1, 9999);
    const breakdown: Record<string, { count: number; totalVolume: number; totalFunded: number }> = {};
    for (const invoice of data) {
      const key = invoice.category;
      if (!breakdown[key]) breakdown[key] = { count: 0, totalVolume: 0, totalFunded: 0 };
      breakdown[key].count++;
      breakdown[key].totalVolume += invoice.amount;
      breakdown[key].totalFunded += invoice.amountFunded;
    }
    return Object.entries(breakdown).map(([category, stats]) => ({
      category,
      ...stats,
      utilizationRate: stats.totalVolume > 0 ? (stats.totalFunded / stats.totalVolume) * 100 : 0,
    }));
  }

  getJurisdictionBreakdown() {
    const { data } = this.invoiceService.findAll(1, 9999);
    const breakdown: Record<string, { count: number; totalVolume: number }> = {};
    for (const invoice of data) {
      const key = invoice.jurisdiction;
      if (!breakdown[key]) breakdown[key] = { count: 0, totalVolume: 0 };
      breakdown[key].count++;
      breakdown[key].totalVolume += invoice.amount;
    }
    return Object.entries(breakdown)
      .map(([jurisdiction, stats]) => ({ jurisdiction, ...stats }))
      .sort((a, b) => b.totalVolume - a.totalVolume);
  }

  getInvestorStats(walletAddress: string) {
    // Pull all invoices and compute positions from the in-memory funding totals
    const { data } = this.invoiceService.findAll(1, 9999);
    const funded = data.filter((i) => i.amountFunded > 0);
    const totalInvoicesAvailable = data.filter(
      (i) =>
        i.status === InvoiceStatus.LISTED || i.status === InvoiceStatus.PARTIALLY_FUNDED,
    ).length;

    return {
      walletAddress,
      totalInvoicesAvailable,
      protocolHealth: {
        activeInvoices: data.filter((i) =>
          [InvoiceStatus.LISTED, InvoiceStatus.PARTIALLY_FUNDED].includes(i.status),
        ).length,
        repaidInvoices: data.filter((i) => i.status === InvoiceStatus.REPAID).length,
        defaultedInvoices: data.filter((i) => i.status === InvoiceStatus.DEFAULTED).length,
      },
    };
  }

  getMonthlyTrend(months = 6) {
    const { data } = this.invoiceService.findAll(1, 9999);
    const now = new Date();
    const buckets: Record<string, { created: number; volume: number }> = {};

    for (let m = months - 1; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = { created: 0, volume: 0 };
    }

    for (const invoice of data) {
      const d = new Date(invoice.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (buckets[key]) {
        buckets[key].created++;
        buckets[key].volume += invoice.amount;
      }
    }

    return Object.entries(buckets).map(([month, stats]) => ({ month, ...stats }));
  }
}
