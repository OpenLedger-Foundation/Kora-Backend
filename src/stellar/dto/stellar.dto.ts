import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BuildMintTxDto {
  @ApiProperty() @IsString() @IsNotEmpty() walletAddress: string;
  @ApiProperty() @IsString() @IsNotEmpty() ipfsCid: string;
  @ApiProperty() @IsString() @IsNotEmpty() amount: string;
  @ApiProperty() @IsString() @IsNotEmpty() financingAmount: string;
  @ApiProperty() @IsString() @IsNotEmpty() discountRate: string;
  @ApiProperty() @IsString() @IsNotEmpty() dueDate: string;
}

export class BuildFundTxDto {
  @ApiProperty() @IsString() @IsNotEmpty() walletAddress: string;
  @ApiProperty() @IsString() @IsNotEmpty() tokenId: string;
  @ApiProperty() @IsString() @IsNotEmpty() amount: string;
}
