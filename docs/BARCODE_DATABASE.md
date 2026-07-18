# MedCabinet AI — Barcode and Product Data

## Purpose
Barcode lookup speeds entry and improves duplicate detection, but it is not a guaranteed source of complete or medically authoritative information.

## Resolution order
1. Household-confirmed product aliases
2. Internal curated product record
3. Trusted regional or manufacturer data source
4. External barcode catalog
5. AI package extraction
6. Manual entry

## Data stored
- Barcode type and normalized value
- Product and brand names
- Manufacturer
- Strength and dosage form
- Package size
- Country/market
- Source and source timestamp
- Verification status
- User corrections and aliases

## Matching rules
- Exact barcode is a strong identifier, but packaging changes and regional variants must be supported.
- Never merge products with different strength or dosage form solely because names are similar.
- Maintain multiple barcodes for the same canonical product only after review.
- Preserve household-specific naming without overwriting canonical data.

## Provider abstraction
Use an adapter interface so providers can be replaced without changing product logic. Each adapter should return normalized fields, attribution, freshness, confidence, and usage restrictions.

## Caching
Cache successful lookups with a refresh date. Cache negative results briefly to control cost, while allowing immediate manual entry.

## Quality controls
- Flag implausible package sizes or strength formats.
- Record conflicts between sources.
- Prefer manufacturer/regulatory sources when available.
- Provide an in-app correction/report mechanism.

## Privacy
A shopping check should send only the barcode or necessary package image. Do not include household inventory in third-party lookup requests.
