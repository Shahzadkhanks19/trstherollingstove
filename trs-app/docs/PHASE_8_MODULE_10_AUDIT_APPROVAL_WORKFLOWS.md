# Phase 8 · Module 10 — Audit Logs & Approval Workflows

Adds finance-wide governance controls: immutable audit events, maker-checker approval requests, decision history, threshold-ready metadata, expiry/escalation visibility, governance snapshots, CSV reporting and an admin dashboard.

## Route
`/admin/finance/audit-approvals`

## Script
`npm run finance:governance -- 30`

## Integration
Call `recordFinanceAudit()` from finance write operations and `createApprovalRequest()` where configured thresholds require authorization before execution.
