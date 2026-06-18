import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChallengeDto {
  @ApiProperty({ example: 'GXXXXXXX...', description: 'Stellar wallet public key' })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}

export class VerifyWalletDto {
  @ApiProperty({ description: 'Stellar wallet public key' })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({ description: 'Signed challenge nonce (hex)' })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ description: 'The nonce that was signed' })
  @IsString()
  @IsNotEmpty()
  nonce: string;
}
