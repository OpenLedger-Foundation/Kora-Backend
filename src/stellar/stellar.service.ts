import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Contract, rpc as SorobanRpc, Networks, TransactionBuilder, BASE_FEE,
  Account,
} from '@stellar/stellar-sdk';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly rpc: SorobanRpc.Server;
  private readonly networkPassphrase: string;
  private readonly invoiceContractId: string;
  private readonly marketplaceContractId: string;

  constructor(private readonly config: ConfigService) {
    this.rpc = new SorobanRpc.Server(
      this.config.get<string>('STELLAR_RPC_URL', 'https://soroban-testnet.stellar.org'),
    );
    this.networkPassphrase = this.config.get<string>(
      'STELLAR_NETWORK_PASSPHRASE',
      Networks.TESTNET,
    );
    this.invoiceContractId = this.config.get<string>('INVOICE_CONTRACT_ID', '');
    this.marketplaceContractId = this.config.get<string>('MARKETPLACE_CONTRACT_ID', '');
  }

  /** Build an unsigned mint_invoice transaction XDR for the frontend to sign */
  async buildMintInvoiceTx(params: {
    walletAddress: string;
    ipfsCid: string;
    amount: string;
    financingAmount: string;
    discountRate: string;
    dueDate: string;
  }): Promise<string> {
    if (!this.invoiceContractId) throw new BadRequestException('Invoice contract not configured');
    try {
      const account = await this.rpc.getAccount(params.walletAddress);
      const contract = new Contract(this.invoiceContractId);
      const tx = new TransactionBuilder(new Account(account.accountId(), account.sequenceNumber()), {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          contract.call(
            'mint_invoice',
            // SCVal args would be properly encoded here; simplified for scaffold
          ),
        )
        .setTimeout(300)
        .build();

      const prepared = await this.rpc.prepareTransaction(tx);
      return prepared.toXDR();
    } catch (err: any) {
      this.logger.error('buildMintInvoiceTx failed', err?.message);
      throw new BadRequestException(`Failed to build transaction: ${err?.message}`);
    }
  }

  /** Build an unsigned fund_invoice transaction XDR */
  async buildFundInvoiceTx(walletAddress: string, tokenId: string, amount: string): Promise<string> {
    if (!this.marketplaceContractId) throw new BadRequestException('Marketplace contract not configured');
    try {
      const account = await this.rpc.getAccount(walletAddress);
      const contract = new Contract(this.marketplaceContractId);
      const tx = new TransactionBuilder(new Account(account.accountId(), account.sequenceNumber()), {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call('fund_invoice'))
        .setTimeout(300)
        .build();

      const prepared = await this.rpc.prepareTransaction(tx);
      return prepared.toXDR();
    } catch (err: any) {
      this.logger.error('buildFundInvoiceTx failed', err?.message);
      throw new BadRequestException(`Failed to build transaction: ${err?.message}`);
    }
  }

  /** Get invoice state directly from on-chain */
  async getInvoiceOnChain(tokenId: string): Promise<any> {
    if (!this.invoiceContractId) throw new BadRequestException('Invoice contract not configured');
    const contract = new Contract(this.invoiceContractId);
    const tx = new TransactionBuilder(
      new Account('GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN', '0'),
      { fee: BASE_FEE, networkPassphrase: this.networkPassphrase },
    )
      .addOperation(contract.call('get_invoice'))
      .setTimeout(30)
      .build();

    const result = await this.rpc.simulateTransaction(tx);
    return result;
  }
}
