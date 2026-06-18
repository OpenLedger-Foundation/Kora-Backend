# Contributing to Kora Backend

Thank you for investing your time in Kora Protocol! This guide covers everything you need to go from idea to merged pull request.

> **Before you start:** Read the [README](README.md) and [ARCHITECTURE](docs/ARCHITECTURE.md) docs so you understand how the project is structured.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Branch Strategy](#branch-strategy)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Reporting Bugs](#reporting-bugs)
- [Proposing Features](#proposing-features)

---

## Code of Conduct

Be respectful. We are building financial infrastructure for underserved communities — the spirit of inclusion extends to how we treat contributors. Harassment, gatekeeping, or discrimination of any kind will result in a ban.

---

## Ways to Contribute

- **Bug fixes** — check [open issues](https://github.com/your-org/kora-backend/issues) labelled `bug`
- **Features** — pick up issues labelled `enhancement` or propose your own (see below)
- **Documentation** — improve any doc in `/docs` or inline code comments
- **Tests** — add unit or e2e tests for uncovered paths
- **Security** — see [SECURITY.md](docs/SECURITY.md) before disclosing vulnerabilities

---

## Development Setup

```bash
# Fork and clone
git clone https://github.com/<your-username>/kora-backend.git
cd kora-backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Set JWT_SECRET=any-dev-secret at minimum

# Start dev server (hot reload)
npm run start:dev

# Open Swagger UI
open http://localhost:3001/api/docs
```

### Optional: Connect to Testnet

1. Deploy Soroban contracts (or use the shared testnet addresses from the project Discord)
2. Set `INVOICE_CONTRACT_ID` and `MARKETPLACE_CONTRACT_ID` in `.env`
3. Set `PINATA_JWT` if testing file uploads

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable, always deployable |
| `develop` | Integration branch for next release |
| `feat/<name>` | New feature |
| `fix/<name>` | Bug fix |
| `docs/<name>` | Documentation only |
| `chore/<name>` | Tooling, deps, CI |

Always branch from `develop`, never from `main` directly.

```bash
git checkout develop
git pull origin develop
git checkout -b feat/your-feature-name
```

---

## Commit Convention

We use **[Conventional Commits](https://www.conventionalcommits.org/)**:

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `refactor` | Code change that neither fixes nor adds |
| `chore` | Build process, deps, tooling |
| `perf` | Performance improvement |

### Examples

```
feat(invoice): add risk tier filter to marketplace listings
fix(auth): prevent nonce reuse across concurrent requests
docs(api): add fund_invoice request/response examples
test(stellar): unit test buildMintInvoiceTx with mock RPC
```

---

## Pull Request Process

1. Ensure your branch is up to date with `develop`
2. Run linting: `npm run lint`
3. Run tests: `npm run test` and `npm run test:e2e`
4. Open your PR against `develop` (not `main`)
5. Fill in the PR template — summary, testing steps, screenshots if relevant
6. Request review from at least one maintainer
7. Address all review comments before merge

**PR title format:** same as commit convention: `feat(scope): description`

### PR Checklist

- [ ] Code follows the existing module structure
- [ ] New endpoints have Swagger `@ApiOperation` + `@ApiProperty` decorators
- [ ] All new functions have unit tests
- [ ] No secrets or `.env` values committed
- [ ] `npm run lint` passes with no errors
- [ ] `npm run test` passes

---

## Coding Standards

### NestJS Patterns

- One module per feature domain (`invoice`, `marketplace`, etc.)
- Business logic belongs in services; controllers are thin
- Use DTOs with `class-validator` for all request bodies
- Inject dependencies via constructor injection; never use `new` directly

### TypeScript

- Enable strict null checks — never use `any` without a comment explaining why
- Prefer explicit return types on public service methods
- Avoid barrel files (re-exporting everything from `index.ts`) for large modules

### Naming

| Thing | Convention |
|---|---|
| Files | `kebab-case.ts` |
| Classes | `PascalCase` |
| Interfaces | `PascalCase` (no `I` prefix) |
| Variables / functions | `camelCase` |
| Env variables | `SCREAMING_SNAKE_CASE` |
| API endpoints | `kebab-case` |

---

## Testing Requirements

- **Unit tests** are required for all service methods
- **E2E tests** are required for any new endpoint
- Use `jest` + `@nestjs/testing`; mock external services (Pinata, Stellar RPC)
- Test file naming: `*.spec.ts` for unit, `*.e2e-spec.ts` for E2E

```bash
npm run test          # run all unit tests
npm run test:cov      # generate coverage report (target: ≥ 70%)
npm run test:e2e      # run end-to-end tests
```

---

## Reporting Bugs

Open a GitHub issue with the label `bug` and include:

1. **Summary** — one-line description
2. **Steps to reproduce** — curl command or test case preferred
3. **Expected behaviour**
4. **Actual behaviour** — include error message and stack trace
5. **Environment** — Node version, OS, whether you're on testnet or mainnet

---

## Proposing Features

Open a GitHub issue with the label `enhancement` before writing code. Describe:

1. The problem you're solving
2. Your proposed API change (endpoint, request/response shape)
3. Any Soroban contract changes required
4. Rough implementation sketch

Wait for maintainer sign-off before opening a PR — this saves everyone time.

---

## Questions?

Open a [GitHub Discussion](https://github.com/your-org/kora-backend/discussions) or join the project Discord. Don't use issues for questions.
