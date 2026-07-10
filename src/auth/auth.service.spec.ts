import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import * as nacl from 'tweetnacl';
import { StrKey } from '@stellar/stellar-sdk';

// Generate a real Ed25519 keypair for signature tests
const keypair = nacl.sign.keyPair();
const rawPublicKey = keypair.publicKey;

// Encode the public key as a Stellar G... address
const VALID_WALLET = StrKey.encodeEd25519PublicKey(Buffer.from(rawPublicKey));
const INVALID_WALLET = 'NOT_A_VALID_STELLAR_KEY';

function signMessage(message: string, secretKey: Uint8Array): string {
  const msgBytes = Buffer.from(message);
  const sig = nacl.sign.detached(msgBytes, secretKey);
  return Buffer.from(sig).toString('hex');
}

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock.jwt.token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('getChallenge()', () => {
    it('should return a nonce and message for a valid wallet address', () => {
      const result = service.getChallenge(VALID_WALLET);
      expect(result.nonce).toBeDefined();
      expect(result.nonce).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(result.message).toContain(result.nonce);
    });

    it('should throw UnauthorizedException for an invalid wallet address', () => {
      expect(() => service.getChallenge(INVALID_WALLET)).toThrow(UnauthorizedException);
    });

    it('should return different nonces on successive calls', () => {
      const first = service.getChallenge(VALID_WALLET);
      const second = service.getChallenge(VALID_WALLET);
      expect(first.nonce).not.toBe(second.nonce);
    });
  });

  describe('verifySignature()', () => {
    it('should return accessToken for a valid signature', async () => {
      const { nonce } = service.getChallenge(VALID_WALLET);
      const message = `Sign this nonce to authenticate with Kora Protocol: ${nonce}`;
      const signature = signMessage(message, keypair.secretKey);

      const result = await service.verifySignature({
        walletAddress: VALID_WALLET,
        nonce,
        signature,
      });

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.walletAddress).toBe(VALID_WALLET);
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: VALID_WALLET });
    });

    it('should throw UnauthorizedException for a wrong signature', async () => {
      const { nonce } = service.getChallenge(VALID_WALLET);
      await expect(
        service.verifySignature({
          walletAddress: VALID_WALLET,
          nonce,
          signature: 'deadbeef'.repeat(16), // fake 128-char hex
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if nonce has not been issued', async () => {
      await expect(
        service.verifySignature({
          walletAddress: VALID_WALLET,
          nonce: 'completely-random-nonce',
          signature: 'aabbcc',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong nonce value', async () => {
      service.getChallenge(VALID_WALLET); // issue a real nonce but don't use it
      await expect(
        service.verifySignature({
          walletAddress: VALID_WALLET,
          nonce: 'wrongnonce',
          signature: 'aabbcc',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should invalidate nonce after successful verification (one-time use)', async () => {
      const { nonce } = service.getChallenge(VALID_WALLET);
      const message = `Sign this nonce to authenticate with Kora Protocol: ${nonce}`;
      const signature = signMessage(message, keypair.secretKey);

      // First use — should succeed
      await service.verifySignature({ walletAddress: VALID_WALLET, nonce, signature });

      // Second use — nonce already deleted
      await expect(
        service.verifySignature({ walletAddress: VALID_WALLET, nonce, signature }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
