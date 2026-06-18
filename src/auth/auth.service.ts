import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as nacl from 'tweetnacl';
import { StrKey } from '@stellar/stellar-sdk';
import { VerifyWalletDto } from './dto/auth.dto';

// In-memory nonce store — replace with Redis in production
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  getChallenge(walletAddress: string) {
    if (!StrKey.isValidEd25519PublicKey(walletAddress)) {
      throw new UnauthorizedException('Invalid Stellar public key');
    }
    const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
    nonceStore.set(walletAddress, { nonce, expiresAt: Date.now() + 5 * 60 * 1000 });
    return { nonce, message: `Sign this nonce to authenticate with Kora Protocol: ${nonce}` };
  }

  async verifySignature(dto: VerifyWalletDto) {
    const stored = nonceStore.get(dto.walletAddress);
    if (!stored || stored.nonce !== dto.nonce || Date.now() > stored.expiresAt) {
      throw new UnauthorizedException('Invalid or expired nonce');
    }

    try {
      const publicKeyBytes = StrKey.decodeEd25519PublicKey(dto.walletAddress);
      const messageBytes = Buffer.from(
        `Sign this nonce to authenticate with Kora Protocol: ${dto.nonce}`,
      );
      const signatureBytes = Buffer.from(dto.signature, 'hex');
      const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
      if (!valid) throw new Error();
    } catch {
      throw new UnauthorizedException('Signature verification failed');
    }

    nonceStore.delete(dto.walletAddress);
    const token = this.jwtService.sign({ sub: dto.walletAddress });
    return { accessToken: token, walletAddress: dto.walletAddress };
  }
}
