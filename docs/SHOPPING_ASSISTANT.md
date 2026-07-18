# MedCabinet AI — Shopping Assistant

## Main question
“Do I already have this medicine at home?”

## Inputs
- Barcode scan
- Package photo
- Text search
- Shopping-list selection

## Result
The shopping check returns exact and possible inventory matches with product, strength, dosage form, remaining quantity, boxes, nearest expiry, storage location, owner, last purchase store, last price, and price history.

## Suggested states
- In stock
- Low stock
- Expired only
- Expiring soon
- Different strength/form owned
- Not found
- Match uncertain

## Actions
- View cabinet record
- Add to shopping list
- Mark purchased
- Save store and price
- Add as a new product
- Dismiss duplicate suggestion

## Safety
The app compares inventory identity only. It must not tell a user to substitute one medicine, strength, or formulation for another. Conflicts should prompt the user to check the package or ask a pharmacist.

## Future retailer support
Retailer links, availability, and current prices may be shown only when supplied by an authorized, timestamped source. Clearly label sponsored placements and never let sponsorship override exact product matching.
