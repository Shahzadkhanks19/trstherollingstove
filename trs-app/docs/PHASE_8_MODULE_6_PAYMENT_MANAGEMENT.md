# Phase 8 · Module 6 — Payment Management

This module extends the existing Razorpay-backed `Payment` model rather than creating a duplicate transaction ledger.

## Capabilities

- Payment analytics and historical snapshots
- Status, method, provider and daily breakdowns
- Success/failure/refund rates
- Finance-admin refund recording
- Payment reversal audit metadata
- Gateway, bank and manual reconciliation
- Difference and unmatched-amount visibility
- CSV register export
- Admin dashboard and scheduled rebuild script

## Routes

- `/admin/finance/payment-management`
- `/api/v1/admin/finance/payment-management/summary`
- `/api/v1/admin/finance/payment-management/report`
- `/api/v1/admin/finance/payment-management/rebuild`
- `/api/v1/admin/finance/payment-management/reconcile`
- `/api/v1/admin/finance/payment-management/[paymentId]/refund`
- `/api/v1/admin/finance/payment-management/[paymentId]/reverse`

## Script

`npm run finance:payments`
