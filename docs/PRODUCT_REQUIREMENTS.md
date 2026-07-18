# MedCabinet AI — Product Requirements

## Product vision
MedCabinet AI is a household medicine inventory and shopping assistant. It helps people know what medicine they own, where it is stored, when it expires, how much remains, what it cost, and whether they already have it before buying again.

## Primary users
- Household administrators managing medicines for several family members
- Caregivers tracking long-term or high-importance medicines
- Individuals who want expiry, stock, and spending visibility
- Shoppers checking availability and historical price before repurchasing

## Core jobs to be done
1. Add a medicine quickly by camera, upload, barcode, or manual entry.
2. Locate a medicine inside the home.
3. Identify expired, soon-to-expire, and low-stock items.
4. Check whether an item is already owned before purchasing.
5. Record where an item was bought and compare prices over time.
6. Produce a clear household inventory report.

## Current prototype requirements
- Medicine name is the only required field.
- Store expiry date, manufacturer, strength, dosage form, category, boxes, quantity per box, dosage, storage location, purchase price, store, barcode, notes, and photo.
- Support storage-only items without dosage tracking.
- Default currency is THB with selectable alternatives.
- Show total medicines, expiring soon, expired, and running-low counts.
- Search and filter the cabinet.
- Preserve favorites and deleted-item spending history.
- Generate a PDF inventory and shareable cabinet report.
- Use AI photo analysis to prefill medicine details.

## Planned requirements
### Shopping assistant
- Scan a product while shopping and show whether the household already owns it.
- Show quantity, expiry, location, last purchase store, last price, and price trend.
- Allow marking an item as needed, purchased, or skipped.

### Whole-cabinet scan
- Process multiple packages in one image or guided scan session.
- Detect duplicates and ask the user to confirm uncertain matches.
- Create a review queue before saving.

### Receipt scan
- Extract merchant, date, product, quantity, and price.
- Match receipt lines to inventory items and create price-history records.

### Household accounts
- Multiple users, roles, profiles, and medicine ownership.
- Household-scoped data isolation and audit history.

### Notifications
- Expiry thresholds configurable by category or medicine.
- Low-stock alerts based on remaining quantity and dosage.
- Refill reminders and optional caregiver notifications.

## Non-goals
- Diagnosing medical conditions
- Recommending prescription changes
- Replacing a pharmacist, doctor, or official medication label
- Guaranteeing OCR or AI extraction accuracy without user confirmation

## Success metrics
- Median time to add one medicine
- Percentage of scans accepted with no manual corrections
- Number of expired items removed before use
- Duplicate purchases avoided
- Percentage of active medicines with location, expiry, and quantity completed
- Monthly active households and repeat scan usage

## Safety requirements
- Clearly label AI-extracted values as unverified until confirmed.
- Never infer dosage instructions when they are not visible.
- Display an emergency warning that the app is not medical advice.
- Keep original package photos available for user verification.
- Treat medication and household data as sensitive personal information.
