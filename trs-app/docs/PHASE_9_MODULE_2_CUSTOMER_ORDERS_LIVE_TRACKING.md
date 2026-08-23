# Phase 9 Module 2 — Customer Orders & Live Tracking

Adds the protected customer order history and detail experience.

## Routes
- `/customer-dashboard/orders`
- `/customer-dashboard/orders/[orderId]`

## New API
- `POST /api/v1/customer/orders/[orderId]/reorder`

## Existing APIs reused
- `GET /api/v1/customer/orders`
- `GET /api/v1/customer/orders/[orderId]`
- `GET /api/v1/customer/orders/[orderId]/invoice`

## Features
- Paginated order history and status filters
- Realtime order and payment refresh
- Detailed preparation timeline
- Item, modifier, instruction and payment breakdowns
- Invoice download
- Reorder of currently available menu configurations
- Unavailable reorder item reporting
- Responsive loading, error and empty states
