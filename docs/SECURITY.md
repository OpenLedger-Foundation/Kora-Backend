# Security Policy — Kora Protocol

---

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Email: **security@kora-protocol.xyz**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

We will acknowledge within **48 hours** and aim to patch within **7 days** for critical issues.

---

## Supported Versions

| Version | Supported |
|---|---|
| v0.1.x (current) | ✅ |
| < v0.1 | ❌ |

---

## Security Architecture

### Private Key Custody

The Kora backend **never holds, stores, or transmits private keys**. All transaction signing is performed client-side in the user's Stellar wallet (Freighter, xBull, etc.).

The backend builds unsigned transaction XDRs and returns them to the frontend. The frontend passes the XDR to the wallet extension for signing. The signed XDR is submitted directly to the Stellar network — not through the backend.

### Authentication

- **Protocol:** Ed25519 challenge-response. The user signs a server-generated nonce to prove wallet ownership.
- **Nonces:** Cryptographically random (32 bytes), single-use, expire after 5 minutes.
- **JWT:** Short-lived access tokens (`7d` default, configurable). Signed with `HS256`. Secret must be ≥ 32 chars in production.
- **No refresh tokens** in v0.1 — users re-authenticate when the JWT expires.

### Input Validation

All request bodies are validated with `class-validator` DTOs. The `whitelist: true` option on the global `ValidationPipe` strips unknown fields before they reach service logic. No raw SQL or eval-equivalent is used.

### HTTP Security Headers

`helmet` is applied globally in `main.ts`. This sets:
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` (default helmet policy)
- `X-XSS-Protection`

### CORS

CORS is restricted to an explicit whitelist configured via the `CORS_ORIGINS` environment variable. In production, this must be set to the exact frontend origin(s).

### Rate Limiting

`@nestjs/throttler` enforces a global rate limit (default: 100 requests per 60 seconds per IP). Adjust `THROTTLE_TTL` and `THROTTLE_LIMIT` based on your traffic profile.

### File Uploads

IPFS uploads via `/ipfs/upload` are handled by `multer` with a hard 10MB limit. Only the file buffer is forwarded to Pinata — the backend does not write files to disk by default.

### Dependency Management

- All production dependencies use pinned exact versions in `package.json`.
- Run `npm audit` before releases. Address all **critical** and **high** severity findings before deployment.

---

## Known Limitations (v0.1)

| Limitation | Impact | Mitigation plan |
|---|---|---|
| In-memory state | No persistence; data lost on restart | Postgres in v0.2 |
| In-memory nonce store | Not safe for multi-instance deployments | Redis in v0.2 |
| No KYC/KYB | Anyone can create invoices | KYC integration in v0.3 |
| Heuristic risk scoring | Risk scores are not oracle-backed | On-chain oracle in v0.5 |
| No invoice ownership transfer | Position is tracked off-chain only | Secondary market in v0.4 |

---

## Responsible Disclosure

We follow a **90-day disclosure policy**: if a patch is not released within 90 days of a private report, the reporter is free to publish. We will credit researchers who report valid vulnerabilities in our release notes unless they request anonymity.
