# MedCabinet AI — Testing Plan

## Test layers
- Unit tests for normalization, expiry status, stock calculations, currency formatting, and duplicate scoring
- Integration tests for Supabase CRUD, storage uploads, scan functions, reports, and RLS
- End-to-end tests for add, edit, delete, favorite, search, scan, shopping check, and PDF flows
- Manual usability and accessibility testing on representative phones

## Critical scenarios
- Add the minimum valid medicine record
- Add tablet, syrup, cream, drops, and storage-only records
- Interpret month-only and full expiry dates
- Detect expired, expiring-soon, and low-stock states at boundaries
- Recover from failed image upload or AI provider timeout
- Prevent accidental duplicate saves
- Preserve waste history after deletion
- Generate reports without leaking another household’s data
- Enforce viewer/caregiver/owner permissions

## AI evaluation
Test clear, blurred, reflective, damaged, multilingual, handwritten, and embossed packaging. Measure per-field accuracy, correction rate, duplicate-match precision, date ambiguity handling, and unsafe invented-field rate.

## Security tests
- RLS cross-household access attempts
- Unauthorized storage object access
- Secret scanning and dependency audit
- Upload type/size validation
- Rate limiting and abuse cases
- Signed-report URL expiry

## Accessibility tests
Keyboard-only operation, screen readers, focus trapping, color contrast, zoom/text scaling, reduced motion, and touch target size.

## Release criteria
No critical security or data-loss defects; all household-isolation tests pass; main user journeys pass on supported browsers/devices; AI uncertainty is surfaced; backup and rollback steps are verified.
