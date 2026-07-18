# MedCabinet AI — Database Schema

## Current prototype
The existing Supabase schema centers on a `medicines` table and a `medicine-photos` storage bucket. The production model should separate product identity, physical stock lots, purchases, and household membership.

## Recommended tables

### households
`id`, `name`, `home_currency`, `timezone`, `created_at`

### household_members
`household_id`, `user_id`, `role` (`owner`, `caregiver`, `member`, `viewer`), `created_at`

### profiles
`user_id`, `display_name`, `locale`, `created_at`, `updated_at`

### medicine_products
Canonical product information: `id`, `normalized_name`, `brand_name`, `manufacturer`, `strength`, `dosage_form`, `category`, `barcode`, `country_code`, `created_at`.

### inventory_lots
Physical stock: `id`, `household_id`, `product_id`, `owner_profile_id`, `boxes`, `quantity_per_box`, `remaining_quantity`, `unit`, `expiry_date`, `storage_location_id`, `photo_path`, `notes`, `favorite`, `created_at`, `updated_at`, `deleted_at`.

### dosage_plans
Optional usage estimate: `id`, `inventory_lot_id`, `amount`, `frequency_unit`, `frequency_count`, `start_date`, `end_date`.

### storage_locations
`id`, `household_id`, `name`, `parent_id`, `description`, `sort_order`.

### purchases
`id`, `household_id`, `merchant_id`, `purchased_at`, `currency`, `receipt_photo_path`, `total_amount`, `created_by`.

### purchase_items
`id`, `purchase_id`, `product_id`, `inventory_lot_id`, `quantity`, `unit_price`, `total_price`, `barcode`.

### merchants
`id`, `name`, `country_code`, `address`, `website`, `latitude`, `longitude`.

### scans
`id`, `household_id`, `scan_type`, `image_path`, `provider`, `model`, `status`, `raw_result`, `created_by`, `created_at`.

### scan_candidates
`id`, `scan_id`, `candidate_index`, `extracted_fields`, `confidence`, `matched_product_id`, `review_status`, `corrected_fields`.

### waste_events
`id`, `household_id`, `inventory_lot_id`, `product_snapshot`, `quantity_discarded`, `estimated_value`, `reason`, `created_at`.

### notifications
`id`, `household_id`, `inventory_lot_id`, `type`, `scheduled_for`, `status`, `sent_at`.

### audit_events
`id`, `household_id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at`.

## Indexes
- Unique barcode where appropriate on `medicine_products`
- `inventory_lots(household_id, expiry_date)`
- `inventory_lots(household_id, deleted_at)`
- `purchase_items(product_id)` and `purchases(household_id, purchased_at desc)`
- Trigram or full-text search on product and brand names

## RLS principles
- A signed-in user may access only households where a membership exists.
- Viewers cannot mutate data.
- Caregivers may manage inventory but not household billing or ownership.
- Storage object paths must include household ID and follow matching policies.
- Service-role access is restricted to trusted server functions.
