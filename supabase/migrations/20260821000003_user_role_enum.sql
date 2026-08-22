-- ============================================================================
-- Role enum: 'admin' -> 'super_admin', plus a new 'admin_korwil'.
--
-- Deliberately its own migration. Postgres refuses to use a newly added enum
-- value in the same transaction that adds it ("unsafe use of new value of enum
-- type"), and the Supabase SQL Editor runs a pasted batch as one transaction.
-- The policies and constraints that reference 'admin_korwil' therefore live in
-- the next migration, which must be run as a separate statement/batch.
--
-- Renaming rather than adding keeps existing admin rows valid with no backfill.
-- ============================================================================

alter type user_role rename value 'admin' to 'super_admin';
alter type user_role add value if not exists 'admin_korwil';
