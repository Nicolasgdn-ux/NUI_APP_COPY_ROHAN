-- =====================================================
-- ENABLE REALTIME ON ORDERS TABLE
-- =====================================================

-- Enable realtime replication for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Verify realtime is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- This should show 'orders' in the results
