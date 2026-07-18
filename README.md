# MedCabinet AI

A smart digital medicine cabinet for households. MedCabinet AI helps users identify, organize, locate, monitor, and repurchase medicines while reducing expiry waste and duplicate purchases.

## Current prototype

- Track medicine name, manufacturer, strength, form, category, quantity, dosage, expiry date, storage location, owner context, notes, barcode, store, price, and photo
- Scan or upload medicine packaging and use AI to prefill visible fields
- Use a dedicated close-up expiry-date scan
- See total medicines, expiring-soon items, expired items, and low stock
- Search and filter the cabinet
- Save favorites and preserve deleted-item waste history
- Generate and share a Cabinet Health Score and PDF inventory
- Use THB as the default home currency and select another supported currency

## Product direction

Planned capabilities include whole-cabinet scanning, barcode-based “do I already have this?” checks, receipt scanning, price history, per-unit comparison, shopping lists, household accounts, caregiver roles, configurable notifications, and a production Flutter app.

MedCabinet AI is an inventory and organization tool. It does not diagnose conditions, recommend prescription changes, or replace a doctor, pharmacist, official package label, or emergency service.

## Stack

- HTML, CSS, and JavaScript for the first web prototype
- Supabase for database and storage
- Netlify Functions for protected server-side integrations
- Anthropic vision for package-field extraction
- Flutter planned for the production Android and iOS application

## Supabase

Project URL: `https://cdjkpwvxlrtnsftfbiew.supabase.co`

Only the public publishable key may be used in the browser prototype. Never commit database passwords, service-role keys, AI-provider keys, or other secrets.

Run `supabase/schema.sql` in the Supabase SQL Editor once. It creates the current `medicines` table, enables RLS with prototype-stage policies, and creates the `medicine-photos` storage bucket.

> **Prototype security warning:** The current no-login prototype uses permissive policies. Before handling production household data, add authentication and household-scoped RLS and make the photo bucket private.

## Photo scan

Tapping **Scan photo to auto-fill** or **Add a new medicine** opens the camera/gallery picker. The client sends the image to `netlify/functions/scan-medicine.js`, which calls a vision model to read visible package details and returns proposed values for review. The image is uploaded to Supabase Storage and used as the inventory thumbnail.

Set `ANTHROPIC_API_KEY` as a Netlify environment variable. Never expose it in browser JavaScript.

## Documentation

- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Project roadmap](docs/PROJECT_ROADMAP.md)
- [System architecture](docs/SYSTEM_ARCHITECTURE.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [API specification](docs/API_SPECIFICATION.md)
- [AI features](docs/AI_FEATURES.md)
- [Medicine scanner](docs/MEDICINE_SCANNER.md)
- [Barcode and product data](docs/BARCODE_DATABASE.md)
- [Shopping assistant](docs/SHOPPING_ASSISTANT.md)
- [Price comparison](docs/PRICE_COMPARISON.md)
- [UI and UX guidelines](docs/UI_UX_GUIDELINES.md)
- [Testing plan](docs/TESTING_PLAN.md)
- [Security and privacy](docs/SECURITY_PRIVACY.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Immediate priorities

1. Add authentication and household membership.
2. Replace permissive RLS with household-scoped policies.
3. Add confirmation and confidence handling for every AI-extracted field.
4. Add automated tests for expiry, stock, scans, and cross-household access.
5. Implement the shopping-check workflow using barcode and product matching.
