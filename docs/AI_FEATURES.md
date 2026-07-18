# MedCabinet AI — AI Features

## Principles
- AI assists with data entry; the user remains the authority.
- Every extracted field may be wrong and must be reviewable.
- Confidence should be tracked per field, not only per scan.
- Never invent dosage, contraindications, or medical advice.
- Minimize images and personal data sent to external providers.

## Medicine package scan
Extract visible information: product/brand name, generic name when printed, manufacturer, strength, form, category, expiry date, lot number, and barcode. Return null for information that is not clearly visible.

## Expiry close-up scan
A dedicated flow optimized for embossed, stamped, low-contrast, or handwritten expiry dates. The result should include the interpreted date, date format assumption, confidence, and cropped evidence region when available.

## Whole-cabinet scan
Detect multiple packages, create one candidate per item, and group likely duplicates. Require a review queue before creating records. Support a guided sequence when a single wide image is insufficient.

## Duplicate detection
Rank possible matches using:
1. Exact barcode
2. Normalized name + strength + dosage form
3. Manufacturer and visual similarity
4. User-confirmed historical aliases

Never merge records automatically when strength or dosage form conflicts.

## Receipt understanding
Extract merchant, purchase date, currency, line items, quantities, prices, and totals. Match lines to known products and ask the user to resolve ambiguous abbreviations.

## Natural-language cabinet search
Examples: “cough medicine,” “what expires next month,” “medicine in bedroom shelf 2,” and “what did I buy at Boots?” Translate requests into safe structured filters rather than generating unverified medical claims.

## Cabinet insights
Allowed insights include inventory completeness, approaching expiry, duplicate stock, low stock based on recorded usage, and spending summaries. Medical recommendations are outside scope.

## Evaluation
Maintain a de-identified test set covering languages, package types, glare, handwriting, embossed dates, multiple date formats, and damaged packaging. Measure field precision, recall, correction rate, and unsafe hallucination rate.
