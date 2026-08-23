# TRS Operations Runbook

## Daily

- Check readiness endpoint.
- Review failed background jobs.
- Review payment webhook failures.
- Review security events.
- Confirm database backups.
- Check disk, memory, and process uptime.

## Weekly

- Run an application-level logical backup.
- Verify one backup can pass a dry-run restore.
- Review database index recommendations.
- Review admin audit logs.
- Check stale inventory and supplier records.
- Confirm scheduled notification jobs.

## Monthly

- Test a complete rollback in staging.
- Rotate secrets where required.
- Review staff roles and permissions.
- Review inactive sessions and devices.
- Test payment refund workflow.
- Review database and server capacity.

## Incident priorities

### P1

- Application unavailable
- Payment processing broken
- Database unavailable
- Unauthorized data access
- Orders cannot be created

### P2

- Notifications unavailable
- Analytics unavailable
- KDS delay
- POS reporting issue
- Scheduled job backlog

### P3

- Minor UI/API defect
- Non-critical report mismatch
- Optional integration unavailable

## First-response sequence

1. Confirm the incident.
2. Record the time and affected area.
3. Check liveness and readiness.
4. Check application logs.
5. Check MongoDB.
6. Check external providers.
7. Stop harmful jobs or traffic when necessary.
8. Roll back the latest deployment when it is the likely cause.
9. Verify recovery with smoke tests.
10. Document the root cause and prevention.
