import { IsString, IsNumber, IsOptional, IsEnum, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceCategory, RiskTier } from '../../common/types';

export class FundInvoiceDto {
  @ApiProperty({ description: 'Invoice ID to fund' }) @IsString() invoiceId: string;
  @ApiProperty({ description: 'USDC amount to invest' }) @IsNumber() @IsPositive() amount: number;
}

export class FilterInvoicesDto {
  @ApiPropertyOptional({ enum: RiskTier }) @IsOptional() @IsEnum(RiskTier) riskTier?: RiskTier;
  @ApiPropertyOptional({ enum: InvoiceCategory }) @IsOptional() @IsEnum(InvoiceCategory) category?: InvoiceCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() jurisdiction?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minApr?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxApr?: number;
}
