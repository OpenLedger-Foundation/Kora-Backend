import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, Request, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto, MintInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';

@ApiTags('invoices')
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @ApiOperation({ summary: 'List all invoices (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.invoiceService.findAll(page, limit);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my invoices (SME)' })
  @Get('my')
  myInvoices(@Request() req: any) {
    return this.invoiceService.findByWallet(req.user.walletAddress);
  }

  @ApiOperation({ summary: 'Get invoice by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoiceService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new invoice (SME)' })
  @Post()
  create(@Request() req: any, @Body() dto: CreateInvoiceDto) {
    return this.invoiceService.create(req.user.walletAddress, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update invoice (SME owner only)' })
  @Patch(':id')
  update(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateInvoiceDto) {
    return this.invoiceService.update(id, req.user.walletAddress, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Record successful mint on Soroban' })
  @Post('mint')
  recordMint(@Body() dto: MintInvoiceDto) {
    return this.invoiceService.recordMint(dto);
  }
}
