-- Run once in the existing Supabase SQL Editor. Keeps the bucket private and all existing access policies.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='hr-documents14306') THEN
  RAISE EXCEPTION 'Run INSTALL-HR-CALENDAR-v143.06.sql first';
 END IF;
 UPDATE storage.buckets SET allowed_mime_types=NULL WHERE id='hr-documents14306';
END $$;
