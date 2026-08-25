-- Migration: add_payment_order_soft_delete
-- Adds deleted_at column and composite index on (user_id, deleted_at) for soft delete & transaction history management

ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS payment_orders_user_id_deleted_at_idx
ON payment_orders(user_id, deleted_at);
