import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private readonly jwt: string;
  private readonly gateway: string;

  constructor(private readonly config: ConfigService) {
    this.jwt = this.config.get<string>('PINATA_JWT', '');
    this.gateway = this.config.get<string>('PINATA_GATEWAY', 'https://gateway.pinata.cloud/ipfs');
  }

  async uploadFile(fileBuffer: Buffer, filename: string, mimeType: string): Promise<string> {
    const form = new FormData();
    form.append('file', fileBuffer, { filename, contentType: mimeType });
    form.append('pinataMetadata', JSON.stringify({ name: filename }));

    try {
      const { data } = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', form, {
        headers: { ...form.getHeaders(), Authorization: `Bearer ${this.jwt}` },
        maxBodyLength: Infinity,
      });
      return data.IpfsHash as string;
    } catch (err: any) {
      this.logger.error('Pinata upload failed', err?.message);
      throw new InternalServerErrorException('Failed to upload file to IPFS');
    }
  }

  async uploadJson(metadata: object, name: string): Promise<string> {
    try {
      const { data } = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        { pinataMetadata: { name }, pinataContent: metadata },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.jwt}` } },
      );
      return data.IpfsHash as string;
    } catch (err: any) {
      this.logger.error('Pinata JSON upload failed', err?.message);
      throw new InternalServerErrorException('Failed to upload metadata to IPFS');
    }
  }

  getUrl(cid: string): string {
    return `${this.gateway}/${cid}`;
  }
}
