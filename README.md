# Kora Backend

> **The API backbone of [Kora Protocol](https://github.com/your-org/kora-frontend) — decentralized invoice financing on Stellar Soroban.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](docs/CONTRIBUTING.md)

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
SME                    Kora Backend              Investor
 │                          │                         │
 ├─ POST /invoices ─────────►                         │
 │                          ├─ Validate + Score Risk  │
 │                          ├─ Store Invoice          │
 │                          │                         │
 ├─ POST /ipfs/upload ───────► Upload PDF to Pinata   │
 ├─ POST /stellar/build/mint► Build unsigned XDR      │
 │◄─ Unsigned XDR ───────────┤                        │
 │  (sign in wallet)         │                        │
 │                          │◄─ GET /marketplace ─────┤
 │                          │                         ├─ Browse invoices
 │                          │◄─ POST /marketplace/fund┤
 │                          ├─ Record funding ────────►
 │◄─ USDC arrives ───────────┤                        │
```

The backend is **stateless by design for v0.1** — no database is required. All on-chain state lives in Soroban contracts; off-chain state is held in-memory and will migrate to Postgres in v0.2.

---

## Architecture

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full architecture document, including:

- Module dependency graph
- Request lifecycle diagrams
- Authentication flow
- Soroban integration pattern
- Database migration path

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 10 (Express adapter) |
| Language | TypeScript 5.5 |
| Auth | JWT + Stellar Ed25519 wallet signature |
| Blockchain | Stellar Soroban via `@stellar/stellar-sdk` |
| File Storage | IPFS via Pinata REST API |
| Validation | `class-validator` + `class-transformer` |
| API Docs | Swagger / OpenAPI (auto-generated) |
| Rate Limiting | `@nestjs/throttler` |
| Security | `helmet` + CORS whitelist |

---

## Project Structure

```
kora-backend/
├── src/
│   ├── main.ts                    # Bootstrap: Swagger, CORS, helmet, pipes
│   ├── app.module.ts              # Root module — wires all feature modules
│   │
│   ├── auth/                      # Wallet-based authentication
│   │   ├── auth.controller.ts     # POST /auth/challenge, /auth/verify, GET /auth/me
│   │   ├── auth.service.ts        # Nonce generation + Ed25519 signature verification
│   │   ├── auth.module.ts
│   │   ├── dto/auth.dto.ts
│   │   ├── guards/jwt-auth.guard.ts
│   │   └── strategies/jwt.strategy.ts
│   │
│   ├── invoice/                   # Invoice lifecycle (SME side)
│   │   ├── invoice.controller.ts  # CRUD + mint-record endpoint
│   │   ├── invoice.service.ts     # In-memory store + risk scoring
│   │   ├── invoice.module.ts
│   │   ├── dto/invoice.dto.ts
│   │   └── entities/invoice.entity.ts
│   │
│   ├── marketplace/               # Investor marketplace
│   │   ├── marketplace.controller.ts  # GET listings, POST fund, GET positions
│   │   ├── marketplace.service.ts     # Filter/sort + funding logic
│   │   ├── marketplace.module.ts
│   │   └── dto/marketplace.dto.ts
│   │
│   ├── ipfs/                      # IPFS / Pinata integration
│   │   ├── ipfs.controller.ts     # POST upload (multipart), POST metadata (JSON)
│   │   ├── ipfs.service.ts        # Pinata pinFileToIPFS + pinJSONToIPFS
│   │   └── ipfs.module.ts
│   │
│   ├── stellar/                   # Soroban contract interaction
│   │   ├── stellar.controller.ts  # POST build/mint, POST build/fund, GET invoice/:tokenId
│   │   ├── stellar.service.ts     # Unsigned XDR builders + on-chain reads
│   │   ├── stellar.module.ts
│   │   └── dto/stellar.dto.ts
│   │
│   ├── analytics/                 # Protocol and portfolio analytics
│   │   ├── analytics.controller.ts  # GET /analytics/protocol, /risk
│   │   ├── analytics.service.ts
│   │   └── analytics.module.ts
│   │
│   └── common/
│       ├── types/index.ts             # Shared enums + interfaces
│       ├── filters/http-exception.filter.ts
│       └── interceptors/response.interceptor.ts
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── SECURITY.md
│
├── test/
│   └── app.e2e-spec.ts
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
- Deployed **Soroban contracts** (testnet) — or leave blank to use HTTP-only mode

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/kora-backend.git
cd kora-backend

# 2. Install dependencies
npm install

# 3. Copy and configure env
cp .env.example .env
# Edit .env — add your PINATA_JWT and optionally contract IDs

# 4. Start in development mode
npm run start:dev
```

The server starts on **http://localhost:3001**.
Interactive API docs are available at **http://localhost:3001/api/docs**.

### Running Tests

```bash
npm run test          # Unit tests
npm run test:cov      # Coverage report
npm run test:e2e      # End-to-end tests
```

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
| `GET` | `/api/v1/invoices/my` | JWT | My invoices (SME) |
| `GET` | `/api/v1/invoices/:id` | — | Invoice detail |
| `POST` | `/api/v1/invoices` | JWT | Create invoice |
| `PATCH` | `/api/v1/invoices/:id` | JWT | Update invoice (owner) |
| `POST` | `/api/v1/invoices/mint` | JWT | Record successful mint |
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

---

## Core Flows

### SME: Upload and Mint Invoice

```
1.  POST /auth/challenge  → nonce
2.  Sign nonce in wallet
3.  POST /auth/verify     → JWT
4.  POST /invoices        → invoiceId (off-chain record)
5.  POST /ipfs/upload     → pdfCid
6.  POST /ipfs/metadata   → metadataCid
7.  POST /stellar/build/mint → unsigned XDR
8.  Sign XDR in wallet → submit to Soroban RPC
9.  POST /invoices/mint   → record tokenId + CIDs → status: listed
```

### Investor: Fund an Invoice

```
1.  GET  /marketplace           → browse listed invoices
2.  POST /auth/challenge + verify → JWT
3.  POST /stellar/build/fund    → unsigned XDR
4.  Sign XDR in wallet → submit to Soroban RPC
5.  POST /marketplace/fund      → record off-chain position
6.  GET  /marketplace/positions → view portfolio
```

---

## Roadmap

| Version | Feature |
|---|---|
| **v0.1** | ✅ REST API scaffold, auth, invoice CRUD, IPFS, Soroban XDR builders |
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

---

## License

MIT © 2025 Kora Protocol Contributors

See [LICENSE](LICENSE) for full text.
