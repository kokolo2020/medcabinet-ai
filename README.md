# MedCabinet AI

A smart digital medicine cabinet for households.

## Prototype goals

- Track medicines, quantity, expiry date, location, owner, and price
- Default home currency: Thai Baht (THB)
- Let users change home currency
- Check whether a medicine is already owned before buying
- Compare current prices with purchase history
- Generate and share a Cabinet Health Score report

## Stack

- HTML, CSS, and JavaScript for the first web prototype
- Supabase for authentication, database, and storage
- Flutter planned later for the production mobile app

## Supabase

Project URL: `https://cdjkpwvxlrtnsftfbiew.supabase.co`

Only the public publishable key is used in the browser prototype. Never commit database passwords, service-role keys, or secret keys.

Run `supabase/schema.sql` in the SQL Editor once — it creates the `medicines` table, enables RLS with permissive prototype-stage policies, and creates the public `medicine-photos` storage bucket.

**Note:** since there's no login yet, RLS policies are wide open to anyone holding the publishable key. Tighten these to `auth.uid()`-scoped policies once accounts/households are added.

## Photo scan (Claude Vision)

Tapping "Scan photo to auto-fill" (or the scan menu's "Add a new medicine") opens the camera/gallery picker. The photo is sent to `netlify/functions/scan-medicine.js`, which calls Claude Vision to read the brand name, strength, form, category, expiry date, and barcode off the packaging, then auto-fills the Add Medicine form. The same photo is uploaded to Supabase Storage and shown as the medicine's real thumbnail in the list.

Requires `ANTHROPIC_API_KEY` set as an environment variable in Netlify (same pattern as the pokescan project).
