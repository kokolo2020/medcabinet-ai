# MedCabinet AI — Security and Privacy

## Data classification
Medicine names, dosage information, photos, family-member assignments, purchase history, and storage locations are sensitive household data. Treat all production records as private by default.

## Authentication and authorization
- Require authenticated users for production.
- Scope every row and storage object to a household.
- Enforce authorization with Supabase RLS, not only client checks.
- Use least-privilege roles for owner, caregiver, member, and viewer.
- Require recent authentication for ownership, exports, and account deletion.

## Secrets
- Only public publishable keys may appear in browser code.
- Keep service-role, AI-provider, database, signing, and retailer credentials in server-side environment variables.
- Rotate exposed credentials immediately.
- Enable automated secret scanning.

## Images and AI
- Explain when an image is sent to an external AI provider.
- Remove unnecessary metadata and limit image retention.
- Use private storage buckets and short-lived signed URLs.
- Do not use customer images for model training without explicit opt-in consent.
- Avoid capturing personal prescription-label data unless needed.

## Application controls
- Validate file type, size, dimensions, and content.
- Sanitize all rendered text.
- Apply CSP, secure headers, rate limits, and abuse monitoring.
- Use transactions and audit events for sensitive changes.
- Encrypt data in transit and rely on managed encryption at rest.

## Privacy rights
Provide export, correction, and deletion workflows. Define retention for deleted inventory, waste events, scan images, reports, logs, and backups. Deletion screens must explain what is removed immediately and what ages out from backups.

## Incident response
Maintain steps to revoke keys, disable vulnerable endpoints, preserve necessary logs, identify affected households, notify users where required, restore from backup, and document remediation.

## Prototype warning
The current no-login prototype uses permissive policies and must not be treated as production-ready until authentication and household-scoped RLS are implemented and tested.
