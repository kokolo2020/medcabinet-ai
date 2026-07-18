# MedCabinet AI — Price Comparison

## Goals
- Show what the household paid previously.
- Compare like-for-like products using per-unit pricing.
- Record where and when a medicine was purchased.
- Help avoid overpaying without presenting stale prices as current offers.

## Data model
Each price observation records product, package size, quantity, total price, currency, merchant, purchase date, source, and verification status.

## Calculations
- Unit price = total item price / normalized package quantity.
- Compare only compatible strength, form, and package units.
- Keep original currency and optionally display converted values with exchange-rate timestamp.
- Clearly distinguish receipt-confirmed, user-entered, and retailer-sourced prices.

## User experience
Show last paid price, lowest and highest observed price, per-unit comparison, merchant, date, and trend. Warn when data is old or package sizes differ.

## Rules
- Never claim a retailer currently has stock without a live inventory source.
- Never rank a different formulation as cheaper without an explicit warning.
- Exclude deleted inventory from stock counts but retain valid purchase history.
