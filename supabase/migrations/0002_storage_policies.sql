-- Storage policies for photos bucket (public access, single user app)
CREATE POLICY "Allow public read" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'photos');
CREATE POLICY "Allow public insert" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Allow public update" ON storage.objects FOR UPDATE TO anon USING (bucket_id = 'photos');
CREATE POLICY "Allow public delete" ON storage.objects FOR DELETE TO anon USING (bucket_id = 'photos');
