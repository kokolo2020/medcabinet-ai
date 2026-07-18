# MedCabinet AI — Project Roadmap

## Phase 0 — Prototype foundation (current)
- Premium responsive web interface
- Medicine CRUD and Supabase persistence
- Photo upload and AI package extraction
- Expiry, low-stock, category, location, price, store, barcode, notes
- Favorites, waste history, cabinet search, PDF/QR sharing
- THB default with selectable home currency

## Phase 1 — Prototype hardening
- Add authentication and household membership
- Replace permissive prototype RLS with household-scoped policies
- Add form validation, loading states, retries, and offline-safe drafts
- Confirm all AI-extracted fields before save
- Add automated tests and accessibility review
- Add database migrations and environment setup documentation

## Phase 2 — Shopping intelligence
- “Do I already have this?” barcode/photo scan
- Duplicate detection by barcode, normalized name, strength, and form
- Price history and per-unit price comparison
- Preferred store and last-purchased-at information
- Shopping list with needed quantity and current cabinet stock

## Phase 3 — Inventory automation
- Whole-cabinet guided scan
- Multi-item detection and review queue
- Receipt scanning and automatic purchase matching
- Consumption logging and estimated depletion dates
- Configurable expiry and refill notifications

## Phase 4 — Household collaboration
- Owners, caregivers, and viewer roles
- Family-member medicine assignments
- Activity history and change audit
- Shared cabinet reports and caregiver alerts
- Multiple cabinet locations and travel kits

## Phase 5 — Production mobile app
- Flutter application for Android and iOS
- Native camera and barcode scanning
- Push notifications
- Offline-first local cache with secure sync
- App-store privacy, safety, and accessibility compliance

## Phase 6 — Ecosystem expansion
- Pharmacy and retailer catalog integrations where legally and commercially available
- Regional product databases and currency support
- Optional health-app integrations with explicit consent
- Analytics focused on expiry prevention, savings, and adherence support

## Release gates
Each phase must pass security review, data-isolation tests, safety-copy review, accessibility checks, and backup/restore validation before production release.
