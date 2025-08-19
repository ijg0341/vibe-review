-- Storage 버킷 정책 생성
-- session-files 버킷에 대한 정책

-- 사용자가 자신의 폴더에 업로드 가능
CREATE POLICY "Users can upload their own files" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'session-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 사용자가 자신의 파일 조회 가능
CREATE POLICY "Users can view their own files" ON storage.objects FOR SELECT USING (
  bucket_id = 'session-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 사용자가 자신의 파일 업데이트 가능
CREATE POLICY "Users can update their own files" ON storage.objects FOR UPDATE USING (
  bucket_id = 'session-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 사용자가 자신의 파일 삭제 가능
CREATE POLICY "Users can delete their own files" ON storage.objects FOR DELETE USING (
  bucket_id = 'session-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);