# Kora Backend

> **The API backbone of [Kora Protocol](https://github.com/your-org/kora-frontend) — decentralized invoice financing on Stellar Soroban.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-blueviolet.svg)](https://soroban.stellar.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](docs/CONTRIBUTING.md)
[![Tests](https://img.shields.io/badge/tests-jest-yellow.svg)](https://jestjs.io)
[![Swagger](https://img.shields.io/badge/API%20Docs-Swagger-green.svg)](http://localhost:3001/api/docs)

---

## Table of Contents

- [Overview](#overview)
- [What Kora Does](#what-kora-does)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Core Flows](#core-flows)
- [Testing](#testing)
- [Health Checks](#health-checks)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Kora Protocol bridges the gap between SMEs in emerging markets (Africa, Asia, Latin America) who need working capital and global investors seeking yield on short-duration, real-world assets.

**The problem:** SMEs collectively hold trillions in unpaid invoices. Traditional invoice financing is slow, expensive, and gatekept behind legacy financial infrastructure.

**The solution:** Kora tokenizes invoices as NFTs on Stellar Soroban. Investors fund them with USDC. Settlement is instant, transparent, and fully non-custodial.

---

## What Kora Does

```
SME                    Kora Backend                     Investor
 │                          │                               │
 ├─ POST /auth/challenge ───►                               │
 │◄─ nonce ─────────────────┤                               │
 │  (sign nonce in wallet)  │                               │
 ├─ POST /auth/verify ──────► validate Ed25519 sig          │
 │◄─ JWT ───────────────────┤                               │
 │                          │                               │
 ├─ POST /invoices ─────────► validate + risk-score         │
 │◄─ invoiceId ─────────────┤ store in-memory               │
 │                          │                               │
 ├─ POST /ipfs/upload ───────► upload PDF → Pinata          │
 │◄─ pdfCid ────────────────┤                               │
 ├─ POST /ipfs/metadata ─────► upload JSON → Pinata         │
 │◄─ metadataCid ───────────┤                               │
 │                          │                               │
 ├─ POST /stellar/build/mint► build unsigned XDR            │
 │◄─ XDR ───────────────────┤                               │
 │  (sign XDR in wallet)    │                               │
 │  (submit to Soroban RPC) │                               │
 ├─ POST /invoices/mint ─────► record tokenId, CIDs         │
 │                          │  status → LISTED              │
 │                          │                               │
 │                          │◄─ GET /marketplace ───────────┤
 │                          │  (filter by risk, APR, etc.)  │
 │                          ├─ paginated listings ──────────►
 │                          │                               │
 │                          │◄─ POST /stellar/build/fund ───┤
 │                          ├─ unsigned XDR ────────────────►
 │                          │  (sign + submit to Soroban)   │
 │                          │                               │
 │                          │◄─ POST /marketplace/fund ─────┤
 │                          ├─ record position, update amt ─►
 │◄─ USDC arrives ──────────┤                               │
```

---

## Architecture

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full architecture document, including:

- Module dependency graph
- Request lifecycle diagrams
- Authentication flow
- Soroban integration pattern
- Database migration path (v0.2 roadmap)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 10 (Express adapter) |
| Language | TypeScript 5.5 |
| Auth | JWT + Stellar Ed25519 wallet signature |
| Blockchain | Stellar Soroban via `@stellar/stellar-sdk` |
| File Storage | IPFS via Pinata REST API |
| Validation | `KoraValidationPipe` (`class-validator` + `class-transformer`) |
| API Docs | Swagger / OpenAPI (auto-generated) |
| Rate Limiting | `@nestjs/throttler` (global via `APP_GUARD`) |
| Security | `helmet` + CORS whitelist |
| Logging | Custom `LoggerMiddleware` (method, status, duration, IP) |
| Testing | Jest + `@nestjs/testing` |

---

## Project Structure

```
kora-backend/
├── src/
│   ├── main.ts                         # Bootstrap: Swagger, CORS, helmet, pipes
│   ├── app.module.ts                   # Root module — wires all feature modules
│   │
│   ├── auth/                           # Wallet-based authentication
│   │   ├── auth.controller.ts          # POST /auth/challenge, /auth/verify, GET /auth/me
│   │   ├── auth.service.ts             # Nonce generation + Ed25519 signature verification
│   │   ├── auth.service.spec.ts        # Unit tests
│   │   ├── auth.module.ts
│   │   ├── dto/auth.dto.ts
│   │   ├── guards/jwt-auth.guard.ts
│   │   └── strategies/jwt.strategy.ts
│   │
│   ├── invoice/                        # Invoice lifecycle (SME side)
│   │   ├── invoice.controller.ts       # CRUD + search + mint-record + repay + default
│   │   ├── invoice.service.ts          # In-memory store + risk scoring + keyword search
│   │   ├── invoice.service.spec.ts     # Unit tests (20+ cases)
│   │   ├── invoice.module.ts
│   │   ├── dto/invoice.dto.ts
│   │   └── entities/invoice.entity.ts
│   │
│   ├── marketplace/                    # Investor marketplace
│   │   ├── marketplace.controller.ts   # GET listings, POST fund, GET positions
│   │   ├── marketplace.service.ts      # Filter/sort + funding logic
│   │   ├── marketplace.service.spec.ts # Unit tests
│   │   ├── marketplace.module.ts
│   │   └── dto/marketplace.dto.ts
│   │
│   ├── ipfs/                           # IPFS / Pinata integration
│   │   ├── ipfs.controller.ts          # POST upload (multipart), POST metadata (JSON)
│   │   ├── ipfs.service.ts             # Pinata pinFileToIPFS + pinJSONToIPFS
│   │   ├── ipfs.service.spec.ts        # Unit tests (mocked axios)
│   │   └── ipfs.module.ts
│   │
│   ├── stellar/                        # Soroban contract interaction
│   │   ├── stellar.controller.ts       # POST build/mint, POST build/fund, GET invoice/:tokenId
│   │   ├── stellar.service.ts          # Unsigned XDR builders + on-chain reads
│   │   ├── stellar.module.ts
│   │   └── dto/stellar.dto.ts
│   │
│   ├── analytics/                      # Protocol and portfolio analytics
│   │   ├── analytics.controller.ts     # protocol, risk, categories, investor, jurisdictions, trends
│   │   ├── analytics.service.ts
│   │   └── analytics.module.ts
│   │
│   ├── health/                         # Health checks
│   │   ├── health.controller.ts        # GET /health, GET /health/ready
│   │   ├── health.service.ts
│   │   └── health.module.ts
│   │
│   └── common/
│       ├── types/index.ts              # Shared enums, interfaces, paginate() helper
│       ├── middleware/
│       │   └── logger.middleware.ts    # HTTP request logger
│       ├── pipes/
│       │   └── validation.pipe.ts      # KoraValidationPipe (structured errors)
│       ├── filters/
│       │   └── http-exception.filter.ts
│       ├── interceptors/
│       │   └── response.interceptor.ts
│       └── exceptions/
│           └── invoice-not-found.exception.ts
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── CHANGELOG.md
│   ├── DEPLOYMENT.md
│   ├── SECURITY.md
│   └── TESTING.md
│
├── test/
│   └── app.e2e-spec.ts
│
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .env.example
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── CONTRIBUTING.md
└── LICENSE
```

---

## Getting Started

### Prerequisites

- **Node.js 20+** and npm
- A **Pinata account** — [pinata.cloud](https://pinata.cloud) (free tier works)
- Deployed **Soroban contracts** (testnet) — or leave blank to run in HTTP-only mode

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/king-aj-the-first/kora-backend.git
cd kora-backend

# 2. Install dependencies
npm install

# 3. Copy and configure environment variables
cp .env.example .env
# Open .env and fill in JWT_SECRET and PINATA_JWT at minimum

# 4. Start in development mode (hot-reload)
npm run start:dev
```

The server starts on **http://localhost:3001**.
Interactive API docs are at **http://localhost:3001/api/docs**.

### Running with Docker

```bash
# Build image
docker build -t kora-backend .

# Run container
docker run -p 3001:3001 --env-file .env kora-backend
```

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for full Docker and PM2 guides.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3001` | HTTP port |
| `NODE_ENV` | No | `development` | `development` / `production` |
| `JWT_SECRET` | **Yes** | — | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | No | `7d` | JWT expiry |
| `STELLAR_NETWORK` | No | `testnet` | `testnet` / `mainnet` |
| `STELLAR_RPC_URL` | No | SDF testnet | Soroban RPC endpoint |
| `STELLAR_NETWORK_PASSPHRASE` | No | SDF testnet passphrase | Network passphrase |
| `INVOICE_CONTRACT_ID` | No | — | Deployed invoice NFT contract |
| `MARKETPLACE_CONTRACT_ID` | No | — | Deployed marketplace contract |
| `PINATA_JWT` | **Yes** (for uploads) | — | Pinata API JWT |
| `PINATA_GATEWAY` | No | Pinata gateway | Public IPFS gateway URL |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowed origins |
| `THROTTLE_TTL` | No | `60` | Rate-limit window in seconds |
| `THROTTLE_LIMIT` | No | `100` | Max requests per window |

---

## API Reference

Full interactive documentation is served at `/api/docs` (Swagger UI) when the server is running.

For a static reference, see **[docs/API.md](docs/API.md)**.

### Quick Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/challenge` | — | Request sign challenge |
| `POST` | `/api/v1/auth/verify` | — | Verify signature, get JWT |
| `GET` | `/api/v1/auth/me` | JWT | Current wallet profile |
| `GET` | `/api/v1/invoices` | — | List all invoices (paginated) |
| `GET` | `/api/v1/invoices/search` | — | Search invoices by keyword/status/risk |
| `GET` | `/api/v1/invoices/my` | JWT | My invoices (SME) |
| `GET` | `/api/v1/invoices/:id` | — | Invoice detail |
| `POST` | `/api/v1/invoices` | JWT | Create invoice |
| `PATCH` | `/api/v1/invoices/:id` | JWT | Update invoice (owner) |
| `POST` | `/api/v1/invoices/mint` | JWT | Record successful mint |
| `POST` | `/api/v1/invoices/:id/repay` | JWT | Mark invoice as repaid |
| `POST` | `/api/v1/invoices/:id/default` | JWT | Mark invoice as defaulted |
| `DELETE` | `/api/v1/invoices/:id` | JWT | Delete PENDING invoice |
| `GET` | `/api/v1/marketplace` | — | Listed invoices (filterable) |
| `POST` | `/api/v1/marketplace/fund` | JWT | Fund an invoice |
| `GET` | `/api/v1/marketplace/positions` | JWT | My investment positions |
| `POST` | `/api/v1/ipfs/upload` | JWT | Upload PDF to IPFS |
| `POST` | `/api/v1/ipfs/metadata` | JWT | Upload metadata JSON |
| `POST` | `/api/v1/stellar/build/mint` | JWT | Get unsigned mint XDR |
| `POST` | `/api/v1/stellar/build/fund` | JWT | Get unsigned fund XDR |
| `GET` | `/api/v1/stellar/invoice/:tokenId` | JWT | Read on-chain invoice |
| `GET` | `/api/v1/analytics/protocol` | — | Protocol-wide stats |
| `GET` | `/api/v1/analytics/risk` | — | Risk tier distribution |
| `GET` | `/api/v1/analytics/categories` | — | Volume by category |
| `GET` | `/api/v1/analytics/jurisdictions` | — | Volume by jurisdiction |
| `GET` | `/api/v1/analytics/trends` | — | Monthly invoice trend |
| `GET` | `/api/v1/analytics/investor` | JWT | Investor portfolio summary |
| `GET` | `/api/v1/health` | — | Liveness probe |
| `GET` | `/api/v1/health/ready` | — | Readiness probe |

---

## Core Flows

### SME: Upload and Mint Invoice

```
1.  POST /auth/challenge  → nonce
2.  Sign nonce in wallet
3.  POST /auth/verify     → JWT
4.  POST /invoices        → invoiceId (off-chain record created, status: PENDING)
5.  POST /ipfs/upload     → pdfCid
6.  POST /ipfs/metadata   → metadataCid
7.  POST /stellar/build/mint → unsigned XDR
8.  Sign XDR in wallet → submit to Soroban RPC directly
9.  POST /invoices/mint   → record tokenId + CIDs → status: LISTED
```

### Investor: Fund an Invoice

```
1.  GET  /marketplace           → browse LISTED invoices (filter by risk, APR, category…)
2.  POST /auth/challenge + verify → JWT
3.  POST /stellar/build/fund    → unsigned XDR (tokenId + USDC amount)
4.  Sign XDR in wallet → submit to Soroban RPC directly
5.  POST /marketplace/fund      → record off-chain position, update amountFunded
6.  GET  /marketplace/positions → view portfolio with expectedYield per invoice
```

### Repayment Flow

```
1.  Invoice reaches status: FULLY_FUNDED
2.  SME initiates USDC transfer on-chain (via wallet)
3.  POST /invoices/:id/repay → status: REPAID
4.  Investors collect yield off-chain (v0.1) / on-chain distribution (v0.2+)
```

---

## Testing

```bash
# Run all unit tests
npm run test

# Run with coverage report
npm run test:cov

# Run in watch mode during development
npm run test:watch

# Run end-to-end tests
npm run test:e2e
```

See **[docs/TESTING.md](docs/TESTING.md)** for the full test strategy, coverage expectations, and how to write new tests.

---

## Health Checks

```bash
# Liveness — is the server up?
curl http://localhost:3001/api/v1/health

# Readiness — are all dependencies configured?
curl http://localhost:3001/api/v1/health/ready
```

Example readiness response:
```json
{
  "status": "degraded",
  "uptime": 120,
  "timestamp": "2025-07-10T12:00:00.000Z",
  "version": "0.1.0",
  "services": [
    { "name": "jwt", "status": "ok", "detail": "JWT_SECRET is set" },
    { "name": "pinata_ipfs", "status": "not_configured", "detail": "PINATA_JWT missing — uploads will fail" },
    { "name": "stellar_rpc", "status": "ok", "detail": "Using SDF testnet default" },
    { "name": "invoice_contract", "status": "not_configured", "detail": "INVOICE_CONTRACT_ID not set" },
    { "name": "marketplace_contract", "status": "not_configured", "detail": "MARKETPLACE_CONTRACT_ID not set" }
  ]
}
```

---

## Roadmap

| Version | Feature |
|---|---|
| **v0.1** | ✅ REST API scaffold, auth, invoice CRUD + search, IPFS, Soroban XDR builders, analytics, health checks |
| **v0.2** | Postgres + Prisma ORM, persistent state, testnet contract deployment |
| **v0.3** | KYC/KYB webhook integration |
| **v0.4** | Secondary market API endpoints |
| **v0.5** | Risk oracle integration (on-chain credit scoring) |
| **v1.0** | Mainnet, multi-currency (EURC, XLM), production hardening |

---

## Contributing

We welcome contributions from developers, protocol designers, and domain experts in emerging-market finance.

Read the full guide: **[CONTRIBUTING.md](CONTRIBUTING.md)**

Key steps:
1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/)
4. Open a pull request against `main`

Use our **[issue templates](.github/ISSUE_TEMPLATE/)** for bug reports and feature requests, and the **[PR template](.github/PULL_REQUEST_TEMPLATE.md)** to structure your contribution.

---

## License

MIT © 2025 Kora Protocol Contributors

See [LICENSE](LICENSE) for full text.
