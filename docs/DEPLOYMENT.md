# Deployment Guide — Kora Backend

> This guide covers deploying the Kora backend to production. For local development, see [README.md](../README.md#getting-started).

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Railway / Render / Fly.io](#railway--render--flyio)
- [Manual VPS Deployment](#manual-vps-deployment)
- [Reverse Proxy (nginx)](#reverse-proxy-nginx)
- [Health Checks](#health-checks)
- [Production Checklist](#production-checklist)

---

## Prerequisites

- Node.js 20+ on the target host, **or** Docker
- A domain with DNS pointed at your server
- TLS certificate (Let's Encrypt via Certbot, or via platform)
- Pinata account with a production API key
- Deployed Soroban contracts on Stellar mainnet (or testnet for staging)

---

## Environment Configuration

Copy `.env.example` to `.env` on the server and configure every variable. Production-critical values:

```bash
NODE_ENV=production
PORT=3001
JWT_SECRET=<64-char random string>   # openssl rand -hex 32
STELLAR_NETWORK=mainnet
STELLAR_RPC_URL=https://mainnet.sorobanrpc.com
STELLAR_NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
INVOICE_CONTRACT_ID=C...
MARKETPLACE_CONTRACT_ID=C...
PINATA_JWT=<production Pinata JWT>
CORS_ORIGINS=https://kora-protocol.vercel.app
```

Generate a secure JWT secret:
```bash
openssl rand -hex 32
```

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
EXPOSE 3001
CMD ["node", "dist/main"]
```

### docker-compose.yml

```yaml
version: '3.9'
services:
  api:
    build: .
    ports:
      - "3001:3001"
    env_file: .env
    restart: unless-stopped
```

```bash
docker compose up -d
docker compose logs -f api
```

---

## Railway / Render / Fly.io

These platforms auto-detect Node.js apps and build from `package.json`.

### Railway

1. Connect your GitHub repo in Railway dashboard
2. Add all environment variables in the **Variables** tab
3. Railway will run `npm run build` then `npm run start` automatically
4. Custom start command if needed: `node dist/main`

### Render

1. Create a new **Web Service**, connect repo
2. Build command: `npm install && npm run build`
3. Start command: `node dist/main`
4. Add environment variables in the **Environment** tab

### Fly.io

```bash
fly launch
fly secrets set JWT_SECRET=... PINATA_JWT=... ...
fly deploy
```

---

## Manual VPS Deployment

```bash
# On the server
git clone https://github.com/your-org/kora-backend.git
cd kora-backend
npm install
npm run build

# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start dist/main.js --name kora-backend
pm2 save
pm2 startup   # follow the output to enable on boot
```

---

## Reverse Proxy (nginx)

```nginx
server {
    listen 443 ssl;
    server_name api.kora-protocol.xyz;

    ssl_certificate     /etc/letsencrypt/live/api.kora-protocol.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.kora-protocol.xyz/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.kora-protocol.xyz;
    return 301 https://$host$request_uri;
}
```

---

## Health Checks

The API currently does not expose a dedicated `/health` endpoint. Add one in `app.module.ts` for production:

```typescript
// app.controller.ts (quick health check)
@Get('health')
health() { return { status: 'ok' }; }
```

Monitor with:
```bash
curl https://api.kora-protocol.xyz/api/v1/analytics/protocol
```

---

## Production Checklist

- [ ] `JWT_SECRET` is a cryptographically random 64-char string
- [ ] `NODE_ENV=production` is set
- [ ] `CORS_ORIGINS` is set to the exact frontend domain (no trailing slash)
- [ ] TLS is enabled on the domain
- [ ] Pinata JWT is a production key (not a dev key)
- [ ] Contract IDs are mainnet addresses
- [ ] Rate limits are tuned (`THROTTLE_LIMIT`, `THROTTLE_TTL`)
- [ ] Process manager (PM2 or Docker) is configured to restart on crash
- [ ] Server firewall blocks direct port 3001 access (only nginx on 443)
- [ ] Log rotation is configured
- [ ] Alerting is set up for process crashes
