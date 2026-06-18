import {
  IsString, IsNumber, IsDateString, IsEnum, IsOptional,
  IsPositive, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { InvoiceCategory, InvoiceStatus, RiskTier } from '../../common/types';

export class CreateInvoiceDto {
  @ApiProperty() @IsString() invoiceNumber: string;
  @ApiProperty() @IsString() issuerName: string;
  @ApiProperty() @IsString() debtorName: string;
  @ApiProperty() @IsString() debtorAddress: string;
  @ApiProperty() @IsNumber() @IsPositive() amount: number;
  @ApiProperty({ default: 'USD' }) @IsString() currency: string;
  @ApiProperty() @IsDateString() issueDate: string;
  @ApiProperty() @IsDateString() dueDate: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty({ enum: InvoiceCategory }) @IsEnum(InvoiceCategory) category: InvoiceCategory;
  @ApiProperty() @IsString() jurisdiction: string;
  @ApiProperty({ description: 'Discount rate in % (e.g. 5 = 5%)' })
  @IsNumber() @Min(0.1) @Max(50) discountRate: number;
  @ApiProperty({ description: 'Minimum investment in USDC' })
  @IsNumber() @IsPositive() minimumInvestment: number;
  @ApiPropertyOptional() @IsOptional() @IsString() pdfCid?: string;
}

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}

export class MintInvoiceDto {
  @ApiProperty() @IsString() invoiceId: string;
  @ApiProperty({ description: 'IPFS CID of invoice PDF' }) @IsString() pdfCid: string;
  @ApiProperty({ description: 'IPFS CID of metadata JSON' }) @IsString() metadataCid: string;
}
