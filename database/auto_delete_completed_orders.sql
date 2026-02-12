-- =====================================================
-- AUTO-DELETE COMPLETED ORDERS AT END OF DAY (23:59)
-- =====================================================

-- Create a function to delete completed orders
CREATE OR REPLACE FUNCTION delete_completed_orders_daily()
RETURNS void AS $$
BEGIN
  -- Delete orders that:
  -- 1. Have status = 'completed'
  -- 2. Have is_paid = true
  -- 3. Were created today (but not in the last hour to be safe)
  DELETE FROM orders
  WHERE status = 'completed'
    AND is_paid = true
    AND created_at < (NOW() - INTERVAL '1 hour')
    AND DATE(created_at AT TIME ZONE 'Asia/Bangkok') = DATE(NOW() AT TIME ZONE 'Asia/Bangkok');
  
  RAISE NOTICE 'Deleted completed orders from today at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a cron job (requires pg_cron extension)
-- Run this once to enable the extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run at 23:59 Bangkok time every day
-- Note: pg_cron uses UTC, so 23:59 Bangkok (UTC+7) = 16:59 UTC
SELECT cron.schedule('delete_completed_orders_daily', '59 16 * * *', 'SELECT delete_completed_orders_daily()');

-- To check scheduled jobs:
-- SELECT * FROM cron.job;

-- To manually test the deletion function:
-- SELECT delete_completed_orders_daily();

-- Alternative: If pg_cron is not available, archive completed orders instead of deleting
-- Create an archive table
CREATE TABLE IF NOT EXISTS orders_archive (
  LIKE orders INCLUDING ALL
);

-- Create a function to archive instead of delete
CREATE OR REPLACE FUNCTION archive_completed_orders_daily()
RETURNS void AS $$
BEGIN
  -- Copy completed paid orders to archive
  INSERT INTO orders_archive
  SELECT * FROM orders
  WHERE status = 'completed'
    AND is_paid = true
    AND created_at < (NOW() - INTERVAL '1 hour')
    AND DATE(created_at AT TIME ZONE 'Asia/Bangkok') = DATE(NOW() AT TIME ZONE 'Asia/Bangkok');
  
  -- Delete from main table
  DELETE FROM orders
  WHERE status = 'completed'
    AND is_paid = true
    AND created_at < (NOW() - INTERVAL '1 hour')
    AND DATE(created_at AT TIME ZONE 'Asia/Bangkok') = DATE(NOW() AT TIME ZONE 'Asia/Bangkok');
  
  RAISE NOTICE 'Archived and deleted completed orders from today at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Test query: See how many completed orders would be deleted
-- SELECT COUNT(*) as completed_orders_today
-- FROM orders
-- WHERE status = 'completed'
--   AND is_paid = true
--   AND DATE(created_at AT TIME ZONE 'Asia/Bangkok') = DATE(NOW() AT TIME ZONE 'Asia/Bangkok');
