export const AUDIT_SEVERITIES = [
  "info",
  "warning",
  "critical",
] as const;

export type AuditSeverity =
  (typeof AUDIT_SEVERITIES)[number];

export const AUDIT_OUTCOMES = [
  "success",
  "failure",
  "denied",
] as const;

export type AuditOutcome =
  (typeof AUDIT_OUTCOMES)[number];

export const SECURITY_EVENT_TYPES = [
  "login_failure",
  "account_lockout",
  "permission_denied",
  "suspicious_request",
  "rate_limit_exceeded",
  "password_changed",
  "session_revoked",
  "admin_action",
] as const;

export type SecurityEventType =
  (typeof SECURITY_EVENT_TYPES)[number];
