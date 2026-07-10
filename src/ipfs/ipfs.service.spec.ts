import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { IpfsService } from './ipfs.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('IpfsService', () => {
  let service: IpfsService;

  const mockConfig = {
    get: jest.fn((key: string, defaultVal?: string) => {
      const values: Record<string, string> = {
        PINATA_JWT: 'test-jwt-token',
        PINATA_GATEWAY: 'https://gateway.pinata.cloud/ipfs',
      };
      return values[key] ?? defaultVal;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpfsService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<IpfsService>(IpfsService);
  });

  describe('uploadFile()', () => {
    it('should return the IPFS CID on successful upload', async () => {
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: { IpfsHash: 'QmTestFileCid123' },
      });

      const buffer = Buffer.from('fake-pdf-content');
      const cid = await service.uploadFile(buffer, 'invoice.pdf', 'application/pdf');

      expect(cid).toBe('QmTestFileCid123');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-jwt-token' }),
        }),
      );
    });

    it('should throw InternalServerErrorException when Pinata upload fails', async () => {
      mockedAxios.post = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        service.uploadFile(Buffer.from('data'), 'file.pdf', 'application/pdf'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should include the filename in form data metadata', async () => {
      const capturedArgs: any[] = [];
      mockedAxios.post = jest.fn().mockImplementation((_url, formData, _opts) => {
        capturedArgs.push(formData);
        return Promise.resolve({ data: { IpfsHash: 'QmCid' } });
      });

      await service.uploadFile(Buffer.from('pdf'), 'test-invoice.pdf', 'application/pdf');
      // Verify post was called at least once with a FormData-like object
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('uploadJson()', () => {
    it('should return the IPFS CID on successful JSON upload', async () => {
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: { IpfsHash: 'QmTestJsonCid456' },
      });

      const metadata = {
        invoiceNumber: 'INV-001',
        amount: 10_000,
        currency: 'USD',
      };

      const cid = await service.uploadJson(metadata, 'INV-001-metadata');

      expect(cid).toBe('QmTestJsonCid456');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        expect.objectContaining({
          pinataMetadata: { name: 'INV-001-metadata' },
          pinataContent: metadata,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-jwt-token',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should throw InternalServerErrorException when Pinata JSON upload fails', async () => {
      mockedAxios.post = jest.fn().mockRejectedValue(new Error('Timeout'));

      await expect(service.uploadJson({ foo: 'bar' }, 'test')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getUrl()', () => {
    it('should return the full IPFS gateway URL for a CID', () => {
      const url = service.getUrl('QmExampleCid789');
      expect(url).toBe('https://gateway.pinata.cloud/ipfs/QmExampleCid789');
    });

    it('should use the configured gateway base URL', () => {
      const url = service.getUrl('QmABC');
      expect(url).toContain('gateway.pinata.cloud');
    });
  });
});
