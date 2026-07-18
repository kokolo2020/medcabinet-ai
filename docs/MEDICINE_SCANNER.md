# MedCabinet AI — Medicine Scanner

## Scan modes
1. Add one medicine
2. Scan expiry close-up
3. Scan a whole cabinet
4. Check before buying
5. Scan a receipt

## Single-item flow
1. Capture or upload a clear package image.
2. Compress the image without destroying small text.
3. Upload through the protected scan endpoint.
4. Display extracted values with confidence and warnings.
5. Highlight missing or uncertain fields.
6. Let the user correct every value.
7. Check for duplicates.
8. Save the confirmed record and image.

## Capture guidance
- Fill most of the frame with the package.
- Avoid glare and strong shadows.
- Capture front and back when needed.
- Use a close-up for embossed expiry dates.
- Do not require the user to photograph prescription labels containing personal information unless necessary.

## Date handling
- Preserve the raw detected text.
- Support common formats such as MM/YY, MM/YYYY, DD/MM/YYYY, and YYYY-MM-DD.
- Never silently choose between ambiguous day/month formats.
- For month-only expiries, store the final day of the month plus a precision flag.

## Barcode flow
- Prefer native barcode recognition when available.
- Use exact barcode matches before AI name matching.
- A missing product-database result must not block manual inventory creation.

## Whole-cabinet review queue
Each candidate shows crop, proposed identity, quantity, expiry, existing matches, and validation state. Users may merge, skip, edit, or save each candidate.

## Failure states
- No medicine detected
- Image unreadable
- Multiple products detected in single-item mode
- Provider unavailable
- Upload interrupted
- Unsupported format
- Low confidence or conflicting dates

All failures should preserve the user’s draft and offer retry, manual entry, or another image.
