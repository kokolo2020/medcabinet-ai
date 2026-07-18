# AI Architecture

## Purpose
AI assists with extracting structured medicine information from package images. It is an acceleration layer, not the source of truth.

## Pipeline
1. User captures or uploads an image.
2. Client validates file type and size.
3. Image is sent through a protected server-side function.
4. The vision model extracts candidate fields.
5. Output is validated against a strict schema.
6. Confidence and warnings are attached to each field.
7. User reviews and edits the result.
8. Confirmed data is stored in Supabase.

## Candidate Fields
- Brand name
- Generic name
- Strength
- Dosage form
- Package quantity
- Manufacturer
- Barcode
- Lot or batch number
- Expiry date
- Visible warnings

## Guardrails
- Never infer a medicine identity from appearance alone when label evidence is insufficient.
- Never create dosage instructions that are not clearly visible on the package.
- Never provide diagnosis or treatment decisions.
- Mark uncertain or conflicting fields for review.
- Store the user's confirmed value separately from raw model output.

## Suggested Data Shape
```json
{
  "field": "expiry_date",
  "value": "2027-04-30",
  "confidence": 0.91,
  "source": "package_image",
  "requires_review": false
}
```

## Security
- AI credentials must never be exposed in browser code.
- Requests should be authenticated and rate-limited.
- Images should be retained only as long as required by the product policy.
- Sensitive logs must exclude full images and personal medical notes.

## Evaluation
Track field-level precision, correction rate, scan completion rate, failure reasons, latency, and cost per successful scan. Test across lighting conditions, languages, packaging types, and damaged labels.
