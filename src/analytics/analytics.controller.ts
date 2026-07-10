import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Protocol-wide aggregate statistics' })
  @Get('protocol')
  protocol() {
    return this.analyticsService.getProtocolStats();
  }

  @ApiOperation({ summary: 'Risk tier distribution across all invoices' })
  @Get('risk')
  risk() {
    return this.analyticsService.getRiskDistribution();
  }

  @ApiOperation({ summary: 'Invoice volume and count broken down by category' })
  @Get('categories')
  categories() {
    return this.analyticsService.getCategoryBreakdown();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Investor portfolio summary for the authenticated wallet' })
  @Get('investor')
  investorStats(@Request() req: any) {
    return this.analyticsService.getInvestorStats(req.user.walletAddress);
  }

  @ApiOperation({ summary: 'Invoice volume grouped by jurisdiction/country' })
  @Get('jurisdictions')
  jurisdictions() {
    return this.analyticsService.getJurisdictionBreakdown();
  }

  @ApiOperation({ summary: 'Monthly invoice creation trend (last N months)' })
  @ApiQuery({ name: 'months', required: false, description: 'Number of months to include (default 6)' })
  @Get('trends')
  trends(@Query('months') months?: string) {
    return this.analyticsService.getMonthlyTrend(months ? parseInt(months) : 6);
  }
}
