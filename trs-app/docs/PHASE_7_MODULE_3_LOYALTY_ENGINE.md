# Phase 7 · Module 3 — Loyalty Engine 2.0

## Scope

This module upgrades the existing TRS Coins implementation without replacing its wallet, transaction, checkout, coupon, spin-wheel or order integrations.

Implemented capabilities:

- Bronze, Silver, Gold and Platinum tier rules and benefits
- Annual and lifetime qualification with upgrade/downgrade review
- Tier-based point multipliers
- Existing wallet and coin transaction compatibility
- Expiring point lots and expiry processing
- Loyalty milestones with automatic bonus rewards
- Reward catalog with tier eligibility, inventory and validity windows
- Customer redemption codes and reward history
- Customer Loyalty 2.0 dashboard API
- Admin dashboard, tier summary, catalog management and CSV report
- Full membership rebuild, seed and expiry scripts
- Audit logging for admin mutations

## Routes

- `GET /api/v1/admin/loyalty/summary`
- `GET /api/v1/admin/loyalty/tiers`
- `PATCH /api/v1/admin/loyalty/tiers/:tierKey`
- `GET|POST /api/v1/admin/loyalty/rewards`
- `PATCH|DELETE /api/v1/admin/loyalty/rewards/:rewardId`
- `POST /api/v1/admin/loyalty/evaluate`
- `GET /api/v1/admin/loyalty/report`
- `GET /api/v1/customer/loyalty/dashboard`
- `POST /api/v1/customer/loyalty/redeem`

## Commands

```bash
npm run loyalty:seed
npm run loyalty:rebuild
npm run loyalty:expire
npm run check
```

Run `loyalty:expire` nightly. Run `loyalty:rebuild` after importing historical orders or changing tier thresholds.
