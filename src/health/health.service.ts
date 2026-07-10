import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;
  timestamp: string;
  version: string;
}

export interface ReadinessStatus extends HealthStatus {
  services: {
    name: string;
    status: 'ok' | 'not_configured' | 'unknown';
    detail?: string;
  }[];
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(private readonly config: ConfigService) {}

  check(): HealthStatus {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }

  ready(): ReadinessStatus {
    const pinataJwt = this.config.get<string>('PINATA_JWT', '');
    const jwtSecret = this.config.get<string>('JWT_SECRET', '');
    const invoiceContract = this.config.get<string>('INVOICE_CONTRACT_ID', '');
    const marketplaceContract = this.config.get<string>('MARKETPLACE_CONTRACT_ID', '');
    const stellarRpc = this.config.get<string>('STELLAR_RPC_URL', '');

    const services: ReadinessStatus['services'] = [
      {
        name: 'jwt',
        status: jwtSecret ? 'ok' : 'not_configured',
        detail: jwtSecret ? 'JWT_SECRET is set' : 'JWT_SECRET is missing — auth will fail',
      },
      {
        name: 'pinata_ipfs',
        status: pinataJwt ? 'ok' : 'not_configured',
        detail: pinataJwt ? 'PINATA_JWT is set' : 'PINATA_JWT missing — uploads will fail',
      },
      {
        name: 'stellar_rpc',
        status: stellarRpc ? 'ok' : 'not_configured',
        detail: stellarRpc || 'Using SDF testnet default',
      },
      {
        name: 'invoice_contract',
        status: invoiceContract ? 'ok' : 'not_configured',
        detail: invoiceContract || 'INVOICE_CONTRACT_ID not set — Soroban mint will fail',
      },
      {
        name: 'marketplace_contract',
        status: marketplaceContract ? 'ok' : 'not_configured',
        detail: marketplaceContract || 'MARKETPLACE_CONTRACT_ID not set — Soroban fund will fail',
      },
    ];

    const criticalDown = services
      .filter((s) => ['jwt'].includes(s.name))
      .some((s) => s.status !== 'ok');

    const anyDegraded = services.some((s) => s.status === 'not_configured');

    return {
      status: criticalDown ? 'down' : anyDegraded ? 'degraded' : 'ok',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
      services,
    };
  }
}
