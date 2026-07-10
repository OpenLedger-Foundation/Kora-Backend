# Changelog

All notable changes to Kora Backend are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

### Added
- `GET /api/v1/health` — liveness probe returning uptime and server version
- `GET /api/v1/health/ready` — readiness probe with per-service dependency status
- `GET /api/v1/analytics/jurisdictions` — invoice volume grouped by jurisdiction
- `GET /api/v1/analytics/trends` — monthly invoice creation trend (configurable window)
- `GET /api/v1/analytics/investor` — JWT-authenticated investor portfolio summary
- `GET /api/v1/invoices/search` — full-text keyword search with optional status/riskTier filters
- `POST /api/v1/invoices/:id/default` — admin endpoint to mark an invoice as DEFAULTED
- `KoraValidationPipe` — structured field-level validation errors replacing NestJS default
- `LoggerMiddleware` — HTTP request/response logger with method, status, duration, and IP
- `ThrottlerGuard` registered globally via `APP_GUARD` token
- `paginate()` helper in `common/types` — adds `totalPages`, `hasNextPage`, `hasPrevPage` to all list responses
- Unit tests for `InvoiceService` (20+ cases covering full lifecycle)
- Unit tests for `AuthService` (Ed25519 signature verification with real keypair)
- Unit tests for `MarketplaceService` (listings, filtering, funding, positions)
- Unit tests for `IpfsService` (mocked Pinata API — uploadFile, uploadJson, getUrl)

---

## [0.1.0] — 2025-06-18

### Added
- Initial project scaffold with NestJS 10, TypeScript 5.5
- **Auth module** — wallet-based Ed25519 challenge/verify flow, JWT issuance
- **Invoice module** — CRUD, risk scoring (LOW/MEDIUM/HIGH), in-memory store
- **Marketplace module** — filtered listings, USDC funding, investor positions
- **IPFS module** — Pinata `pinFileToIPFS` and `pinJSONToIPFS` integration
- **Stellar module** — unsigned XDR builders for `mint_invoice` and `fund_invoice`, on-chain read
- **Analytics module** — protocol stats, risk distribution, category breakdown
- Global `HttpExceptionFilter` with consistent error response shape
- Global `ResponseInterceptor` for unified success envelope
- Swagger / OpenAPI docs at `/api/docs`
- `helmet` security headers
- `@nestjs/throttler` rate-limiting (configurable via env)
- CORS whitelist via `CORS_ORIGINS` env variable
- `.env.example` with all documented environment variables
- `docs/ARCHITECTURE.md` — module dependency graph and request lifecycle
- `docs/API.md` — static API reference
- `docs/DEPLOYMENT.md` — Docker and PM2 deployment guide
- `docs/SECURITY.md` — security model and disclosure policy
- `CONTRIBUTING.md` — contribution guide

---

## Roadmap

| Version | Target |
|---|---|
| **v0.2** | Postgres + Prisma ORM, persistent state, testnet contract deployment |
| **v0.3** | KYC/KYB webhook integration |
| **v0.4** | Secondary market API endpoints |
| **v0.5** | Risk oracle integration (on-chain credit scoring) |
| **v1.0** | Mainnet, multi-currency (EURC, XLM), production hardening |
