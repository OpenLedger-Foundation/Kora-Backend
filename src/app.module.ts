import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { InvoiceModule } from './invoice/invoice.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { IpfsModule } from './ipfs/ipfs.module';
import { StellarModule } from './stellar/stellar.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL ?? '60') * 1000,
        limit: parseInt(process.env.THROTTLE_LIMIT ?? '100'),
      },
    ]),
    AuthModule,
    InvoiceModule,
    MarketplaceModule,
    IpfsModule,
    StellarModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
