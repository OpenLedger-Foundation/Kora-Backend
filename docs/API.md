# API Reference — Kora Backend

> **Live docs:** Run the server and visit `http://localhost:3001/api/docs` for interactive Swagger UI.
> This file is a static reference for offline use and code review.

Base URL: `https://your-api.com/api/v1` (production) or `http://localhost:3001/api/v1` (local)

All responses follow the envelope format:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

Error responses:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## Authentication

Kora uses wallet-based auth. All protected endpoints require:
```
Authorization: Bearer <jwt>
```

### POST /auth/challenge

Request a sign challenge for a Stellar wallet.

**Request body:**
```json
{ "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" }
```

**Response:**
```json
{
  "nonce": "a3f2...hex",
  "message": "Sign this nonce to authenticate with Kora Protocol: a3f2..."
}
```

---

### POST /auth/verify

Verify a wallet signature and receive a JWT.

**Request body:**
```json
{
  "walletAddress": "GXXXXXXX...",
  "nonce": "a3f2...hex",
  "signature": "signed-hex-string"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "walletAddress": "GXXXXXXX..."
}
```

---

### GET /auth/me

Returns the authenticated wallet profile.

**Auth:** Required

**Response:**
```json
{ "walletAddress": "GXXXXXXX..." }
```

---

## Invoices

### GET /invoices

List all invoices (paginated).

**Query params:**
- `page` (default: 1)
- `limit` (default: 20)

**Response:**
```json
{
  "data": [ ...Invoice[] ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### GET /invoices/my

**Auth:** Required. Returns invoices created by the authenticated wallet.

---

### GET /invoices/:id

**Response:** Single Invoice object.

---

### POST /invoices

**Auth:** Required. Create an invoice (off-chain record).

**Request body:**
```json
{
  "invoiceNumber": "INV-001",
  "issuerName": "Acme Ltd",
  "debtorName": "BigCorp Inc",
  "debtorAddress": "123 Main St, Lagos",
  "amount": 50000,
  "currency": "USD",
  "issueDate": "2025-01-01",
  "dueDate": "2025-04-01",
  "description": "Software development services",
  "category": "technology",
  "jurisdiction": "NG",
  "discountRate": 8,
  "minimumInvestment": 500
}
```

---

### PATCH /invoices/:id

**Auth:** Required. Owner only. Partial update.

---

### POST /invoices/mint

**Auth:** Required. Records a successful Soroban mint and transitions invoice to `listed`.

**Request body:**
```json
{
  "invoiceId": "uuid",
  "pdfCid": "QmXxx...",
  "metadataCid": "QmYyy..."
}
```

---

## Marketplace

### GET /marketplace

Browse listed invoices with filters.

**Query params:**
- `riskTier`: `low | medium | high`
- `category`: `goods | services | construction | technology | agriculture | other`
- `jurisdiction`: country code (e.g. `NG`, `KE`, `IN`)
- `minApr`: minimum discount rate
- `maxApr`: maximum discount rate
- `page`, `limit`

---

### POST /marketplace/fund

**Auth:** Required. Fund an invoice.

**Request body:**
```json
{
  "invoiceId": "uuid",
  "amount": 5000
}
```

**Response:** Updated Invoice object.

---

### GET /marketplace/positions

**Auth:** Required. Get all investor positions for the authenticated wallet.

**Response:**
```json
[
  {
    "invoiceId": "uuid",
    "invested": 5000,
    "expectedYield": 400,
    "invoice": { ...Invoice }
  }
]
```

---

## IPFS

### POST /ipfs/upload

**Auth:** Required. Upload invoice PDF (multipart/form-data).

**Form field:** `file` — PDF, max 10MB

**Response:**
```json
{
  "cid": "QmXxx...",
  "url": "https://gateway.pinata.cloud/ipfs/QmXxx..."
}
```

---

### POST /ipfs/metadata

**Auth:** Required. Upload JSON metadata to IPFS.

**Request body:** Any JSON object (invoice metadata)

**Response:**
```json
{
  "cid": "QmYyy...",
  "url": "https://gateway.pinata.cloud/ipfs/QmYyy..."
}
```

---

## Stellar

### POST /stellar/build/mint

**Auth:** Required. Builds an unsigned `mint_invoice` Soroban transaction.

**Request body:**
```json
{
  "walletAddress": "GXXXXXXX...",
  "ipfsCid": "QmXxx...",
  "amount": "50000",
  "financingAmount": "46000",
  "discountRate": "8",
  "dueDate": "2025-04-01"
}
```

**Response:** `{ "xdr": "AAAAAgAAAA..." }` — unsigned transaction XDR.

---

### POST /stellar/build/fund

**Auth:** Required. Builds an unsigned `fund_invoice` transaction.

**Request body:**
```json
{
  "walletAddress": "GXXXXXXX...",
  "tokenId": "42",
  "amount": "5000"
}
```

---

### GET /stellar/invoice/:tokenId

**Auth:** Required. Read invoice state directly from Soroban.

---

## Analytics

### GET /analytics/protocol

Protocol-wide statistics. No auth required.

**Response:**
```json
{
  "totalInvoices": 150,
  "totalVolume": 7500000,
  "totalFunded": 4200000,
  "activeInvoices": 42,
  "repaidInvoices": 98,
  "defaultedInvoices": 2
}
```

---

### GET /analytics/risk

Risk tier distribution of invoices.

**Response:**
```json
[
  { "tier": "low", "count": 80 },
  { "tier": "medium", "count": 55 },
  { "tier": "high", "count": 15 }
]
```
