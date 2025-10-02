-- Make Images bucket public so chat participants can see shared images
UPDATE storage.buckets 
SET public = true 
WHERE id = 'Images';

-- Remove restrictive view policies and create public read
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;

CREATE POLICY "Anyone can view images in Images bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'Images');