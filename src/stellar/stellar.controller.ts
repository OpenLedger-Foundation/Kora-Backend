import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StellarService } from './stellar.service';
import { BuildMintTxDto, BuildFundTxDto } from './dto/stellar.dto';

@ApiTags('stellar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stellar')
export class StellarController {
  constructor(private readonly stellarService: StellarService) {}

  @ApiOperation({ summary: 'Build unsigned mint_invoice XDR for frontend to sign' })
  @Post('build/mint')
  buildMint(@Body() dto: BuildMintTxDto) {
    return this.stellarService.buildMintInvoiceTx(dto);
  }

  @ApiOperation({ summary: 'Build unsigned fund_invoice XDR for frontend to sign' })
  @Post('build/fund')
  buildFund(@Body() dto: BuildFundTxDto) {
    return this.stellarService.buildFundInvoiceTx(dto.walletAddress, dto.tokenId, dto.amount);
  }

  @ApiOperation({ summary: 'Read invoice state from Soroban contract' })
  @Get('invoice/:tokenId')
  getInvoice(@Param('tokenId') tokenId: string) {
    return this.stellarService.getInvoiceOnChain(tokenId);
  }
}
