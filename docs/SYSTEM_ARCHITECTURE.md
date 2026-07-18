# MedCabinet AI — System Architecture

## Current prototype

```text
Browser (HTML/CSS/JavaScript)
  ├─ Supabase JavaScript client
  │    ├─ PostgreSQL: medicine records
  │    └─ Storage: medicine photos
  └─ Netlify Function: scan-medicine
       └─ Anthropic vision model
```

The browser renders the dashboard and dialogs, collects medicine data, calls Supabase directly with a public publishable key, and calls a serverless function for AI image extraction. Secrets such as the Anthropic API key remain in the Netlify environment.

## Recommended production architecture

```text
Web / Flutter clients
  ├─ Authentication
  ├─ Local encrypted cache
  └─ API / edge functions
       ├─ Authorization and validation
       ├─ AI scan orchestration
       ├─ Barcode/product lookup
       ├─ Price and receipt processing
       ├─ Report generation
       └─ Notification scheduling
            └─ Supabase
                 ├─ PostgreSQL + RLS
                 ├─ Object Storage
                 ├─ Auth
                 └─ Realtime / scheduled jobs
```

## Boundaries
- Client: capture, display, local validation, review and confirmation.
- Server functions: secret-bearing integrations, normalization, rate limiting, audit events, and high-risk writes.
- Database: household-scoped source of truth.
- Storage: private medicine images and generated reports.
- AI provider: extraction only; never the authoritative medication record.

## Key design decisions
- Every record belongs to a household.
- Product identity is separate from household inventory so one product may have many purchases and stock lots.
- Expiry and quantity are tracked per lot, not only per medicine name.
- Prices are append-only purchase observations.
- AI scan output is stored with confidence and user corrections for traceability.
- Generated reports are time-limited and private by default.

## Reliability
- Idempotency keys for scan, receipt, and purchase operations.
- Retry only transient failures.
- Preserve a local draft if upload or save fails.
- Use database transactions for inventory and price-history changes.
- Log integration errors without storing secret keys or unnecessary image content.

## Deployment
- Prototype: static site on Netlify, Netlify Functions, Supabase.
- Production: separate development, staging, and production projects with independent keys, databases, storage buckets, and AI quotas.
