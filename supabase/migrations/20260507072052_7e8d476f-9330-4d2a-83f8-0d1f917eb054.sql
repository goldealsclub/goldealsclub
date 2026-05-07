
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins can upload tiktok videos') THEN
    CREATE POLICY "Admins can upload tiktok videos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'tiktok-videos' AND has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins can update tiktok videos') THEN
    CREATE POLICY "Admins can update tiktok videos"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'tiktok-videos' AND has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins can delete tiktok videos') THEN
    CREATE POLICY "Admins can delete tiktok videos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'tiktok-videos' AND has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
