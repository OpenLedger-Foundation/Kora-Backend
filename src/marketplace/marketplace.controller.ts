import {
  Controller, Get, Post, Body, Query, UseGuards, Request,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarketplaceService } from './marketplace.service';
import { FundInvoiceDto, FilterInvoicesDto } from './dto/marketplace.dto';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @ApiOperation({ summary: 'Get listed invoices with optional filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get()
  listings(
    @Query() filters: FilterInvoicesDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.marketplaceService.getListings(filters, page, limit);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Fund an invoice (Investor)' })
  @Post('fund')
  fund(@Request() req: any, @Body() dto: FundInvoiceDto) {
    return this.marketplaceService.fund(req.user.walletAddress, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get investor positions' })
  @Get('positions')
  positions(@Request() req: any) {
    return this.marketplaceService.getPositions(req.user.walletAddress);
  }
}
