# TRS Production Deployment Guide

## 1. Before deployment

Run locally:

```powershell
npm run check
npm run validate:env
```

Create and verify a fresh database backup.

Confirm that the production server has:

- Supported Node.js LTS
- HTTPS
- Correct DNS
- MongoDB network access
- Process manager such as PM2
- Sufficient disk space
- Log rotation
- Firewall configuration
- A separate production `.env.local`

Never commit `.env.local`.

## 2. Required production checks

Verify:

- `NODE_ENV=production`
- `APP_URL` uses HTTPS
- JWT secrets are at least 32 characters
- MongoDB URI points to the production database
- Realtime URL is the production URL
- Razorpay keys are either all configured or all omitted
- Email fields are either complete or omitted
- WhatsApp fields are either complete or omitted
- `CRON_SECRET` is long and random

## 3. Deployment commands

```bash
npm ci
npm run check
npm run validate:env
npm run verify:db
npm run start
```

Under PM2:

```bash
pm2 start npm --name trs-app -- start
pm2 save
```

## 4. Post-deployment checks

Run:

```bash
SMOKE_TEST_BASE_URL=https://your-domain.in npm run smoke:test
```

Check:

```text
/api/v1/health/live
/api/v1/health/ready
/api/v1/health/metrics
```

As an administrator, check:

```text
/api/v1/admin/system/readiness
/api/v1/admin/system/indexes
```

## 5. Rollback

1. Stop incoming deployments.
2. Restore the previous application release.
3. Restore the database only when the release introduced an incompatible data change.
4. Restart the application.
5. Run smoke tests.
6. Verify payment webhooks and scheduled jobs.
7. Document the incident.

Do not restore a database backup merely to fix a code-only deployment issue.

## 6. Go-live verification

Confirm:

- Customer signup and login
- Admin login and RBAC
- Menu browsing
- Cart and checkout
- Razorpay test or production payment
- Order creation
- POS order flow
- KDS flow
- Inventory deductions
- Invoice generation
- Email notification
- WhatsApp notification
- Reservation creation
- TRS Coin earn/redeem
- Coupon validation
- Cron job execution
- Backup download
- Admin analytics
- Public website APIs
- Mobile APIs
