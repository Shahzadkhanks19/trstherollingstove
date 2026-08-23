# TRS Final Backend Checklist

## Code quality

- [ ] ESLint passes
- [ ] TypeScript passes
- [ ] Production build passes
- [ ] No secrets committed
- [ ] No `.next` or `node_modules` committed

## Authentication and security

- [ ] Browser authentication works
- [ ] Mobile bearer authentication works
- [ ] Refresh-token rotation works
- [ ] RBAC permissions verified
- [ ] Admin routes reject customers
- [ ] Rate limits applied to sensitive public routes
- [ ] Security headers confirmed
- [ ] Audit and security events reviewed

## Commerce

- [ ] Menu and modifiers work
- [ ] Cart calculations verified
- [ ] Coupons verified
- [ ] TRS Coins verified
- [ ] Razorpay signature verification tested
- [ ] Refund workflow tested
- [ ] Duplicate webhook handling tested
- [ ] Invoice totals verified

## Operations

- [ ] POS shifts verified
- [ ] KDS routing verified
- [ ] Inventory deductions verified
- [ ] Procurement flow verified
- [ ] Reservations verified
- [ ] Notifications verified
- [ ] Scheduled jobs verified

## Data and recovery

- [ ] Atlas backup enabled
- [ ] Logical backup generated
- [ ] Dry-run restore passed
- [ ] Restore procedure documented
- [ ] Index audit reviewed

## API surfaces

- [ ] Admin APIs verified
- [ ] Customer APIs verified
- [ ] Public website APIs verified
- [ ] Mobile APIs verified
- [ ] Health APIs verified

## Deployment

- [ ] Production environment validation passes
- [ ] Database verification passes
- [ ] Smoke tests pass
- [ ] PM2 restart policy configured
- [ ] Log rotation configured
- [ ] Rollback release available
