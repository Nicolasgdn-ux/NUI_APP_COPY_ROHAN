-- =====================================================
-- FIXES FOR ORDER STATUS AND RLS POLICIES
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add missing RLS policies for public access (customers viewing/creating orders)
-- =====================================================

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Public can create orders" ON orders;
DROP POLICY IF EXISTS "Restaurant owners can manage orders" ON orders;

-- Allow anyone to view orders (needed for customer menu to show table orders)
CREATE POLICY "Anyone can view orders" 
ON orders FOR SELECT 
USING (TRUE);

-- Allow anyone to create orders (needed for customer checkout)
CREATE POLICY "Anyone can insert orders" 
ON orders FOR INSERT 
WITH CHECK (TRUE);

-- Allow anyone to update orders (needed for restaurant to mark as finished and paid)
-- In production, you'd want to restrict this to authenticated users only
CREATE POLICY "Anyone can update orders" 
ON orders FOR UPDATE 
USING (TRUE);

-- Allow anyone to delete orders (for cancel functionality)
CREATE POLICY "Anyone can delete orders" 
ON orders FOR DELETE 
USING (TRUE);


-- 2. OPTIONAL: Convert status column to ENUM for better data integrity
-- =====================================================
-- WARNING: Only run this if you want to use ENUMs instead of TEXT
-- This is more strict and prevents invalid status values

-- Step 1: Create the ENUM type
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

-- Step 2: Convert the column to use ENUM
-- ALTER TABLE orders 
-- ALTER COLUMN status TYPE order_status 
-- USING status::order_status;

-- Step 3: Set default value
-- ALTER TABLE orders 
-- ALTER COLUMN status SET DEFAULT 'pending'::order_status;


-- 3. Verify your table structure
-- =====================================================
-- Run this to see your current table definition:
-- SELECT 
--   column_name, 
--   data_type, 
--   column_default, 
--   is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'orders'
-- ORDER BY ordinal_position;


-- 4. Test if updates work
-- =====================================================
-- After running the policies above, test with this query:
-- UPDATE orders 
-- SET status = 'completed' 
-- WHERE id = 'YOUR_ORDER_ID_HERE';
-- 
-- Then check if it worked:
-- SELECT id, order_number, status FROM orders WHERE id = 'YOUR_ORDER_ID_HERE';
