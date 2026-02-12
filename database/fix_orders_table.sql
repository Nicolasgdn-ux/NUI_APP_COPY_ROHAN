-- =====================================================
-- COMPLETE FIX FOR ORDERS TABLE
-- Execute this in Supabase SQL Editor AFTER deleting all data
-- =====================================================

-- 1. DROP existing constraints and policies
-- =====================================================
DROP POLICY IF EXISTS "Public can create orders" ON orders;
DROP POLICY IF EXISTS "Restaurant owners can manage orders" ON orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
DROP POLICY IF EXISTS "Anyone can insert orders" ON orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON orders;
DROP POLICY IF EXISTS "Anyone can delete orders" ON orders;


-- 2. FIX NULLABLE COLUMNS (make them NOT NULL with defaults)
-- =====================================================

-- restaurant_id should NOT be nullable
ALTER TABLE orders 
ALTER COLUMN restaurant_id SET NOT NULL;

-- order_type should NOT be nullable
ALTER TABLE orders 
ALTER COLUMN order_type SET NOT NULL;

-- status should NOT be nullable
ALTER TABLE orders 
ALTER COLUMN status SET NOT NULL;

-- subtotal should have default 0
ALTER TABLE orders 
ALTER COLUMN subtotal SET DEFAULT 0;

-- tax should have default 0
ALTER TABLE orders 
ALTER COLUMN tax SET DEFAULT 0;

-- is_paid should NOT be nullable
ALTER TABLE orders 
ALTER COLUMN is_paid SET NOT NULL;

-- created_at should NOT be nullable
ALTER TABLE orders 
ALTER COLUMN created_at SET NOT NULL;


-- 3. CREATE SEQUENCE AND TRIGGER FOR AUTO ORDER_NUMBER
-- =====================================================

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Function to generate order number automatically
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    -- Format: ORD-20260212-0001
    NEW.order_number := 'ORD-' || 
                        to_char(NEW.created_at, 'YYYYMMDD') || '-' || 
                        LPAD(nextval('order_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS set_order_number ON orders;

-- Create trigger
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();


-- 4. CREATE OR UPDATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index on restaurant_id (most common query)
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);

-- Index on table_number for table order lookups
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON orders(table_number);

-- Index on status for filtering pending/completed orders
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Index on is_paid for unpaid order queries
CREATE INDEX IF NOT EXISTS idx_orders_is_paid ON orders(is_paid);

-- Composite index for table orders (most common query in your app)
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_table_unpaid 
ON orders(restaurant_id, table_number, is_paid);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);


-- 5. ENABLE RLS AND CREATE PERMISSIVE POLICIES
-- =====================================================

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can view orders
-- (Needed for customers to see their table orders in real-time)
CREATE POLICY "enable_read_access_for_all" 
ON orders FOR SELECT 
USING (true);

-- Policy 2: Everyone can insert orders
-- (Needed for customers to place orders from menu)
CREATE POLICY "enable_insert_access_for_all" 
ON orders FOR INSERT 
WITH CHECK (true);

-- Policy 3: Everyone can update orders
-- (Needed for restaurant to mark orders as completed/paid)
CREATE POLICY "enable_update_access_for_all" 
ON orders FOR UPDATE 
USING (true);

-- Policy 4: Everyone can delete orders
-- (Needed for cancel functionality)
CREATE POLICY "enable_delete_access_for_all" 
ON orders FOR DELETE 
USING (true);

-- NOTE: In production, you should restrict these policies to:
-- - Authenticated restaurant users only for UPDATE/DELETE
-- - Public for SELECT (with filters on table_number)
-- - Public for INSERT
-- But for now, we keep it permissive for testing.


-- 6. ADD MISSING COLUMNS FROM ORIGINAL SCHEMA (OPTIONAL)
-- =====================================================
-- Uncomment these if you want the full schema from setup.sql

-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMPTZ;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();


-- 7. OPTIONAL: CONVERT STATUS TO ENUM (Better data integrity)
-- =====================================================
-- ONLY RUN THIS IF YOU WANT STRICT TYPE CHECKING
-- Uncomment to enable:

-- -- Create ENUM type
-- DO $$ 
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
--     CREATE TYPE order_status AS ENUM (
--       'pending', 
--       'accepted', 
--       'preparing', 
--       'ready', 
--       'completed', 
--       'cancelled', 
--       'rejected'
--     );
--   END IF;
-- END $$;

-- -- Drop default temporarily
-- ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;

-- -- Convert column to ENUM
-- ALTER TABLE orders 
-- ALTER COLUMN status TYPE order_status 
-- USING status::order_status;

-- -- Set default back
-- ALTER TABLE orders 
-- ALTER COLUMN status SET DEFAULT 'pending'::order_status;


-- 8. VERIFY EVERYTHING WORKS
-- =====================================================

-- Check table structure
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'orders';

-- Check RLS policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'orders';

-- Test insert (should auto-generate order_number)
-- INSERT INTO orders (restaurant_id, items, total)
-- VALUES (
--   '0ae9a027-7bf3-4732-a165-a954056c32ec',
--   '[{"name": "Test Item", "quantity": 1}]'::jsonb,
--   100
-- );

-- Check if order_number was generated
-- SELECT id, order_number, created_at FROM orders ORDER BY created_at DESC LIMIT 1;
