# MedCabinet AI — UI and UX Guidelines

## Experience principles
- Fast enough for cupboard cleanup and shopping checks.
- Calm, trustworthy, and readable rather than clinical or alarming.
- Important status must not rely on color alone.
- Every AI result is editable before it becomes inventory data.
- Mobile-first controls with generous touch targets.

## Information hierarchy
1. Urgent: expired items and critical scan conflicts
2. Actionable: expiring soon and low stock
3. Inventory: cabinet, categories, locations, owners
4. Financial: prices, waste, and purchase history
5. Account: household, currency, reports, privacy

## Status language
Use clear labels: Expired, Expires soon, Low stock, In stock, Needs review, and Unknown. Include exact dates and quantities whenever available.

## Forms
- Require only medicine name for manual entry.
- Group package, stock, usage, storage, and purchase fields.
- Use dosage-form-aware units.
- Preserve values after validation or network failure.
- Make storage-only mode explicit.

## Scanning
Show capture guidance before the camera opens, progress during processing, the original image, per-field uncertainty, duplicate matches, and a final confirmation screen.

## Accessibility
- WCAG 2.2 AA target
- 44×44 px minimum touch targets
- Keyboard and screen-reader support for dialogs
- Visible focus states
- Text alternatives for icons
- Respect reduced-motion settings
- Support text scaling without clipped controls

## Responsive layout
Optimize for small phones first, then tablets and desktop. Bottom navigation may become a side rail on wide layouts. Dialogs should become full-height sheets on narrow screens.

## Safety copy
Use “Check the package” and “Ask a pharmacist or clinician” for uncertainty. Avoid language implying diagnosis, treatment recommendations, or guaranteed AI accuracy.
