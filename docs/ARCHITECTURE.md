# Architecture — Kora Backend

> This document describes the technical architecture of the Kora Protocol backend. For setup instructions, see [README.md](../README.md).

---

## Table of Contents

- [High-Level Overview](#high-level-overview)
- [Module Dependency Graph](#module-dependency-graph)
- [Request Lifecycle](#request-lifecycle)
- [Authentication Flow](#authentication-flow)
- [Invoice Lifecycle](#invoice-lifecycle)
- [Soroban Integration Pattern](#soroban-integration-pattern)
- [Data Model](#data-model)
- [State Management (v0.1)](#state-management-v01)
- [Database Migration Path (v0.2)](#database-migration-path-v02)
- [Security Design](#security-design)

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Clients                                │
│              (Next.js Frontend / Direct API Users)              │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Kora Backend (NestJS)                        │
│                                                                 │
│  ┌──────────┐  ┌───────────┐  ┌─────────────┐  ┌───────────┐  │
│  │   auth   │  │  invoice  │  │ marketplace │  │  stellar  │  │
│  └────┬─────┘  └─────┬─────┘  └──────┬──────┘  └─────┬─────┘  │
│       │              │               │                │         │
│  ┌────┴──────────────┴───────────────┘                │         │
│  │              InvoiceService (shared)                │         │
│  └─────────────────────────────────────────────────── ┘         │
│                                                                 │
│  ┌───────────┐  ┌─────────────────┐                            │
│  │   ipfs    │  │   analytics     │                            │
│  └─────┬─────┘  └────────┬────────┘                            │
│        │                 │                                      │
└────────┼─────────────────┼──────────────────────────────────────┘
         │                 │
         ▼                 ▼
  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐
  │  Pinata     │   │  In-Memory  │   │  Stellar Soroban    │
  │  IPFS API   │   │  Store (v0) │   │  RPC / Horizon      │
  └─────────────┘   └─────────────┘   └─────────────────────┘
```

---

## Module Dependency Graph

```
AppModule
├── ThrottlerModule (global rate limiting)
├── ConfigModule   (global env config)
├── AuthModule
│   ├── PassportModule
│   └── JwtModule
├── InvoiceModule          ← exports InvoiceService
├── MarketplaceModule      → imports InvoiceModule
├── IpfsModule
├── StellarModule
└── AnalyticsModule        → imports InvoiceModule
```

---

## Request Lifecycle

Every HTTP request passes through the following layers in order:

```
Request
  │
  ├─ 1. Helmet (HTTP security headers)
  ├─ 2. CORS (origin whitelist check)
  ├─ 3. ThrottlerGuard (rate limit: 100 req/60s by default)
  ├─ 4. JwtAuthGuard (if route is protected)
  ├─ 5. ValidationPipe (class-validator DTO validation)
  ├─ 6. Route Handler (Controller method)
  ├─ 7. Service Layer (business logic)
  ├─ 8. ResponseInterceptor (wraps result in { success, data, timestamp })
  └─ 9. AllExceptionsFilter (formats error responses uniformly)
```

---

## Authentication Flow

Kora uses a **wallet-based, challenge-response authentication** scheme. No passwords or API keys are required — the user proves ownership of their Stellar keypair.

```
Client                          Backend
  │                               │
  ├─ POST /auth/challenge ────────►
  │  { walletAddress }            ├─ Validate Stellar public key
  │                               ├─ Generate 32-byte random nonce
  │                               ├─ Store nonce (TTL: 5 min)
  │◄─ { nonce, message } ─────────┤
  │                               │
  │  (User signs message in wallet)
  │                               │
  ├─ POST /auth/verify ───────────►
  │  { walletAddress,             ├─ Retrieve stored nonce
  │    nonce,                     ├─ Verify Ed25519 signature
  │    signature }                │  via tweetnacl + stellar-sdk
  │                               ├─ Delete nonce (one-time use)
  │◄─ { accessToken } ────────────┤  Sign JWT (sub: walletAddress)
  │                               │
  │  (Include JWT in all          │
  │   protected requests)         │
  │                               │
  ├─ GET /auth/me ────────────────►
  │  Authorization: Bearer <jwt>  ├─ JwtStrategy.validate()
  │◄─ { walletAddress } ──────────┤
```

**JWT payload:** `{ sub: "G...", iat: ..., exp: ... }`

**Signature verification:** `nacl.sign.detached.verify(message, signature, publicKeyBytes)`

---

## Invoice Lifecycle

```
PENDING ──► LISTED ──► PARTIALLY_FUNDED ──► FULLY_FUNDED ──► REPAID
  │                                                │
  └─────────────────────────────────────────► DEFAULTED
```

| Transition | Trigger |
|---|---|
| `PENDING → LISTED` | `POST /invoices/mint` — SME submits IPFS CIDs after on-chain mint |
| `LISTED → PARTIALLY_FUNDED` | `POST /marketplace/fund` — first investor funds |
| `PARTIALLY_FUNDED → FULLY_FUNDED` | Cumulative funding reaches `financingAmount` |
| `FULLY_FUNDED → REPAID` | SME repays; future endpoint (v0.2) |
| `ANY → DEFAULTED` | Manual admin action or oracle trigger (v0.5) |

---

## Soroban Integration Pattern

The backend **never holds private keys**. It builds unsigned transactions and returns them to the frontend as XDR strings for the user to sign in their wallet.

```
Backend                           Frontend Wallet
  │                                     │
  ├─ Build TransactionBuilder           │
  ├─ contract.call('mint_invoice', …)   │
  ├─ rpc.prepareTransaction(tx)         │
  ├─ Return tx.toXDR() ────────────────►│
  │                                     ├─ walletKit.signTransaction(xdr)
  │                                     ├─ rpc.sendTransaction(signedTx)
  │◄─ POST /invoices/mint (tokenId) ────┤
  │  (record result off-chain)          │
```

**Why prepare server-side?** `rpc.prepareTransaction` fetches the current ledger footprint and fee estimate, which requires a network call the frontend shouldn't need to manage directly.

---

## Data Model

### Invoice

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (UUID) | Off-chain identifier |
| `tokenId` | `string?` | Soroban NFT token ID (set after mint) |
| `issuerWallet` | `string` | Stellar G-address of the SME |
| `invoiceNumber` | `string` | Human-readable invoice reference |
| `amount` | `number` | Face value (USD) |
| `financingAmount` | `number` | `amount × (1 − discountRate/100)` |
| `discountRate` | `number` | % yield offered to investors |
| `minimumInvestment` | `number` | Min USDC per investor |
| `amountFunded` | `number` | Cumulative USDC funded |
| `status` | `InvoiceStatus` | See lifecycle above |
| `riskTier` | `RiskTier` | `low / medium / high` |
| `riskScore` | `number` | 0–100 (heuristic in v0.1) |
| `pdfCid` | `string?` | IPFS CID of invoice PDF |
| `metadataCid` | `string?` | IPFS CID of JSON metadata |

### Position (Investor)

Stored in-memory as `Map<walletAddress, Map<invoiceId, amount>>`.

---

## State Management (v0.1)

All state is in-memory (Node.js Maps). This is intentional for the scaffold release:

- **Pros:** Zero infrastructure, instant local dev, matches testnet-only scope
- **Cons:** State resets on server restart, no horizontal scaling

---

## Database Migration Path (v0.2)

The migration to Postgres will be surgical — only the service layer changes:

1. Add `@nestjs/config`, `@prisma/client`, `prisma`
2. Define `schema.prisma` mirroring the data model above
3. Replace `Map<string, Invoice>` in `invoice.service.ts` with `prisma.invoice.*` calls
4. Add a `PrismaModule` and inject `PrismaService`
5. Add Redis for the nonce store in `auth.service.ts`

Controllers, DTOs, and guards remain unchanged.

---

## Security Design

See **[SECURITY.md](SECURITY.md)** for the full security policy.

Key design decisions:

| Concern | Decision |
|---|---|
| Private key custody | Backend never holds keys; XDR returned to client for signing |
| Auth forgery | Ed25519 signature verification via `tweetnacl`; nonces are single-use with 5-min TTL |
| JWT leakage | Short-lived tokens (7d default, configurable); Bearer token only |
| Injection | `class-validator` strips unknown fields (`whitelist: true`) |
| DDoS | `@nestjs/throttler` global rate limiting |
| HTTP headers | `helmet` sets HSTS, X-Frame-Options, CSP, etc. |
| CORS | Explicit origin whitelist via `CORS_ORIGINS` env var |
| File uploads | `multer` with 10MB file size limit |
