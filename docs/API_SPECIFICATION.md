# MedCabinet AI — API Specification

## Conventions
- JSON request and response bodies
- Authenticated household context on protected endpoints
- ISO 8601 dates and timestamps
- Currency values stored as decimal amounts plus ISO currency code
- Idempotency key required for scan, receipt, and purchase writes

## Prototype endpoint
### POST `/.netlify/functions/scan-medicine`
Accepts a medicine package image and returns extracted candidate fields such as brand name, manufacturer, strength, dosage form, category, expiry date, and barcode. The client must present results for confirmation before saving.

## Proposed production endpoints

### Inventory
- `GET /api/households/{householdId}/inventory`
- `POST /api/households/{householdId}/inventory`
- `GET /api/inventory/{lotId}`
- `PATCH /api/inventory/{lotId}`
- `DELETE /api/inventory/{lotId}` (soft delete plus optional waste event)

Filters: `query`, `category`, `status`, `location`, `owner`, `favorite`, `expires_before`, `low_stock`.

### Scanning
- `POST /api/scans/medicine`
- `POST /api/scans/cabinet`
- `POST /api/scans/receipt`
- `GET /api/scans/{scanId}`
- `POST /api/scans/{scanId}/confirm`

A scan response includes `scan_id`, `status`, candidates, per-field confidence, warnings, and possible inventory matches.

### Shopping check
- `POST /api/shopping/check`

Input may include barcode, photo, or normalized product fields. Response includes exact and possible matches, household stock, nearest expiry, locations, last price, price range, and suggested action.

### Purchases and prices
- `POST /api/purchases`
- `GET /api/products/{productId}/price-history`
- `GET /api/products/{productId}/merchants`

### Reports
- `POST /api/reports/cabinet`
- `GET /api/reports/{reportId}`

Reports are private and returned through short-lived signed URLs.

## Error format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Expiry date could not be confirmed.",
    "fields": {"expiry_date": "Check the package and try again."},
    "request_id": "req_..."
  }
}
```

## Safety and limits
- Reject unsupported image formats and oversized uploads.
- Strip image metadata where possible.
- Rate-limit AI endpoints by user and household.
- Never return provider secrets or raw internal prompts.
- Do not automatically save dosage instructions extracted from an image without confirmation.
