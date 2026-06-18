import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Protocol-wide statistics' })
  @Get('protocol')
  protocol() {
    return this.analyticsService.getProtocolStats();
  }

  @ApiOperation({ summary: 'Risk tier distribution of listed invoices' })
  @Get('risk')
  risk() {
    return this.analyticsService.getRiskDistribution();
  }
}
