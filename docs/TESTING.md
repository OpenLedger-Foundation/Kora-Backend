# Testing Guide — Kora Backend

This document describes the testing strategy, structure, coverage expectations, and conventions for the Kora Backend codebase.

---

## Table of Contents

- [Overview](#overview)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Unit Tests](#unit-tests)
  - [InvoiceService](#invoiceservice)
  - [AuthService](#authservice)
  - [MarketplaceService](#marketplaceservice)
  - [IpfsService](#ipfsservice)
- [End-to-End Tests](#end-to-end-tests)
- [Coverage Expectations](#coverage-expectations)
- [Writing New Tests](#writing-new-tests)
- [Mocking Strategy](#mocking-strategy)
- [CI Integration](#ci-integration)

---

## Overview

Kora Backend uses **Jest** as the test runner and **`@nestjs/testing`** for NestJS module setup. Tests are co-located next to the source files they test using the `.spec.ts` convention.

Test types:

| Type | Location | Purpose |
|---|---|---|
| Unit | `src/**/*.spec.ts` | Test individual services in isolation |
| End-to-end | `test/*.e2e-spec.ts` | Test full HTTP request/response cycles |

---

## Running Tests

```bash
# Run all unit tests once
npm run test

# Run with coverage report (outputs to /coverage)
npm run test:cov

# Watch mode (re-runs on file save)
npm run test:watch

# Run end-to-end tests
npm run test:e2e

# Run a single spec file
npx jest src/invoice/invoice.service.spec.ts

# Run tests matching a name pattern
npx jest --testNamePattern="should create"
```

---

## Test Structure

Each `.spec.ts` file follows this pattern:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  describe('methodName()', () => {
    it('should do X when given Y', () => {
      // arrange
      // act
      // assert
    });
  });
});
```

---

## Unit Tests

### InvoiceService

**File:** `src/invoice/invoice.service.spec.ts`

Covers the full invoice lifecycle:

| Test | What it verifies |
|---|---|
| `create()` — PENDING status | New invoices start as PENDING |
| `create()` — financingAmount | `amount * (1 - discountRate/100)` |
| `create()` — HIGH risk | `amount > 100_000` → HIGH risk tier |
| `create()` — MEDIUM risk | `amount > 20_000` → MEDIUM risk tier |
| `findAll()` — pagination | Correct slice, total, page, limit |
| `findOne()` — found | Returns correct invoice |
| `findOne()` — not found | Throws `InvoiceNotFoundException` |
| `findByWallet()` | Returns only invoices for the given wallet |
| `search()` — keyword | Matches issuerName, debtorName, etc. |
| `search()` — status filter | Returns only matching status |
| `search()` — riskTier filter | Returns only matching tier |
| `search()` — no match | Returns empty results |
| `update()` — owner | Updates successfully |
| `update()` — non-owner | Throws `ForbiddenException` |
| `recordMint()` | Sets status to LISTED, stores tokenId |
| `updateFunding()` — partial | Sets PARTIALLY_FUNDED |
| `updateFunding()` — full | Sets FULLY_FUNDED |
| `repay()` — valid | Sets REPAID |
| `repay()` — wrong status | Throws `BadRequestException` |
| `markDefaulted()` — LISTED | Sets DEFAULTED |
| `markDefaulted()` — PENDING | Throws `BadRequestException` |
| `delete()` — owner PENDING | Removes from store |
| `delete()` — non-owner | Throws `ForbiddenException` |
| `delete()` — non-PENDING | Throws `BadRequestException` |

---

### AuthService

**File:** `src/auth/auth.service.spec.ts`

Uses a real **Ed25519 keypair** generated via `tweetnacl` so signatures are cryptographically valid.

| Test | What it verifies |
|---|---|
| `getChallenge()` — valid wallet | Returns 64-char hex nonce |
| `getChallenge()` — invalid wallet | Throws `UnauthorizedException` |
| `getChallenge()` — successive calls | Returns different nonces |
| `verifySignature()` — valid sig | Returns JWT + walletAddress |
| `verifySignature()` — wrong sig | Throws `UnauthorizedException` |
| `verifySignature()` — no nonce issued | Throws `UnauthorizedException` |
| `verifySignature()` — wrong nonce | Throws `UnauthorizedException` |
| `verifySignature()` — one-time use | Second use with same nonce fails |

---

### MarketplaceService

**File:** `src/marketplace/marketplace.service.spec.ts`

| Test | What it verifies |
|---|---|
| `getListings()` — status filter | Only LISTED/PARTIALLY_FUNDED returned |
| `getListings()` — riskTier | Correct tier filter |
| `getListings()` — jurisdiction | Correct country filter |
| `getListings()` — min/maxAmount | Range filter works |
| `getListings()` — sortBy | Ascending/descending sort |
| `getListings()` — pagination | totalPages, hasNextPage returned |
| `fund()` — partial | PARTIALLY_FUNDED, correct amountFunded |
| `fund()` — accumulate | Multiple investments add up |
| `fund()` — full | FULLY_FUNDED when threshold met |
| `getPositions()` — empty | Returns empty array |
| `getPositions()` — with positions | expectedYield computed correctly |

---

### IpfsService

**File:** `src/ipfs/ipfs.service.spec.ts`

Axios is mocked with `jest.mock('axios')` — no real HTTP calls are made.

| Test | What it verifies |
|---|---|
| `uploadFile()` — success | Returns CID from Pinata response |
| `uploadFile()` — failure | Throws `InternalServerErrorException` |
| `uploadFile()` — auth header | `Authorization: Bearer <JWT>` is sent |
| `uploadJson()` — success | Returns CID, correct request body |
| `uploadJson()` — failure | Throws `InternalServerErrorException` |
| `getUrl()` — CID | Returns `<gateway>/<cid>` |
| `getUrl()` — gateway | Uses configured PINATA_GATEWAY |

---

## End-to-End Tests

**File:** `test/app.e2e-spec.ts`

E2E tests boot the full NestJS application and make real HTTP calls via `supertest`.

```bash
npm run test:e2e
```

Current E2E coverage:
- `GET /api/v1/health` → `200 { status: 'ok' }`
- `GET /api/v1/analytics/protocol` → `200` with protocol stats shape

To add a new E2E test, follow the pattern in `test/app.e2e-spec.ts`:

```typescript
it('GET /api/v1/invoices returns 200', () => {
  return request(app.getHttpServer())
    .get('/api/v1/invoices')
    .expect(200)
    .expect((res) => {
      expect(res.body.data).toBeDefined();
      expect(res.body.total).toBeDefined();
    });
});
```

---

## Coverage Expectations

| Module | Target coverage |
|---|---|
| `auth/auth.service` | ≥ 90% |
| `invoice/invoice.service` | ≥ 90% |
| `marketplace/marketplace.service` | ≥ 85% |
| `ipfs/ipfs.service` | ≥ 85% |
| `analytics/analytics.service` | ≥ 70% |
| `health/health.service` | ≥ 80% |
| `common/pipes` | ≥ 80% |

Run `npm run test:cov` to generate the HTML coverage report in `./coverage/`.

---

## Writing New Tests

### For a new service

1. Create `src/<module>/<name>.service.spec.ts`
2. Use `Test.createTestingModule()` to create an isolated module
3. Mock any external dependencies (HTTP clients, config, other services)
4. Follow the **Arrange / Act / Assert** pattern
5. Cover the happy path and at least 2 error paths per method

### For a new controller

1. Controllers are tested at the E2E level via `test/app.e2e-spec.ts`
2. Alternatively, unit-test controllers by mocking the service with `jest.fn()`

### Naming conventions

- File: `<name>.service.spec.ts` or `<name>.controller.spec.ts`
- Top describe: `'ServiceName'` or `'ControllerName'`
- Method describe: `'methodName()'`
- Individual: `'should <expected behaviour> when <condition>'`

---

## Mocking Strategy

| Dependency | How to mock |
|---|---|
| `ConfigService` | `{ provide: ConfigService, useValue: { get: jest.fn() } }` |
| `JwtService` | `{ provide: JwtService, useValue: { sign: jest.fn() } }` |
| `axios` | `jest.mock('axios')` at the top of the spec file |
| Other services | `jest.fn()` for individual methods, or `jest.createMockFromModule()` |

Always call `jest.clearAllMocks()` in `beforeEach` to prevent test pollution.

---

## CI Integration

Tests run automatically on every push and pull request.

To run the same checks locally before pushing:

```bash
npm run test:cov   # unit tests + coverage
npm run test:e2e   # end-to-end tests
npm run lint       # ESLint
```

Coverage reports are stored in `./coverage/` (gitignored).
