import { Body, Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ChallengeDto, VerifyWalletDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Get a sign challenge for a wallet address' })
  @Post('challenge')
  challenge(@Body() dto: ChallengeDto) {
    return this.authService.getChallenge(dto.walletAddress);
  }

  @ApiOperation({ summary: 'Verify signed challenge and receive JWT' })
  @Post('verify')
  verify(@Body() dto: VerifyWalletDto) {
    return this.authService.verifySignature(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get authenticated wallet profile' })
  @Get('me')
  me(@Request() req: any) {
    return req.user;
  }
}
