-- ================================================================
-- BOGI 다른 사람 리뷰 보기 DB 설정
-- Supabase SQL Editor에서 실행하세요.
-- ================================================================

-- profiles.nickname 컬럼은 이미 존재합니다 (wiki_edit_setup.sql 기준).
-- 혹시 없는 환경이라면 아래 주석 해제 후 실행:
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname text;

-- ----------------------------------------------------------------
-- reviews 테이블 RLS 설정
-- 현재 상태 확인 쿼리 (실행 후 결과 보고 판단):
--   SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'reviews';
--   SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'reviews';
-- ----------------------------------------------------------------

-- RLS 활성화 (이미 활성화된 경우 무해하게 스킵됨)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 로그인한 모든 사용자가 모든 리뷰를 읽을 수 있음
DROP POLICY IF EXISTS "authenticated users can read all reviews" ON reviews;
CREATE POLICY "authenticated users can read all reviews" ON reviews
  FOR SELECT USING (auth.role() = 'authenticated');

-- 본인 리뷰만 작성
DROP POLICY IF EXISTS "users can insert own reviews" ON reviews;
CREATE POLICY "users can insert own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인 리뷰만 수정
DROP POLICY IF EXISTS "users can update own reviews" ON reviews;
CREATE POLICY "users can update own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 본인 리뷰만 삭제
DROP POLICY IF EXISTS "users can delete own reviews" ON reviews;
CREATE POLICY "users can delete own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);
