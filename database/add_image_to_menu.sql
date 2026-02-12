-- =====================================================
-- ADD IMAGE SUPPORT TO MENU_ITEMS
-- =====================================================

-- Add image_url column to menu_items table
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_alt_text column for accessibility
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS image_alt_text TEXT;

-- Create index on image_url for faster queries
CREATE INDEX IF NOT EXISTS idx_menu_items_image_url ON menu_items(image_url);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'menu_items' 
AND column_name IN ('image_url', 'image_alt_text')
ORDER BY ordinal_position;
