# Phase 9 · Module 1 — Customer Authentication, Dashboard Shell & Profile

## Delivered
- Server-protected `/customer-dashboard` route group
- Customer-role authorization and login redirect
- Responsive desktop sidebar and mobile drawer
- Dashboard overview API and UI
- Order, reservation, loyalty and TRS Coin summary
- Recent-order preview
- Customer profile editor using the existing customer profile API
- Communication and marketing preferences
- Password-change workflow
- Active-session visibility
- Logout integration
- Private-page metadata (`noindex`)

## Routes
- `/customer-dashboard`
- `/customer-dashboard/profile`
- `/customer-dashboard/security`

## API added
- `GET /api/v1/customer/dashboard-summary`

Existing APIs reused:
- `GET/PATCH /api/v1/customer/profile`
- `GET /api/v1/auth/sessions`
- `PATCH /api/v1/auth/change-password`
- `POST /api/v1/auth/logout`
