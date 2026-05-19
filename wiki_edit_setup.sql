-- ================================================================
-- BOGI 위키 편집 시스템 DB 설정
-- Supabase SQL Editor에서 순서대로 실행하세요.
-- ================================================================

-- 1. profiles 테이블에 is_admin 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 관리자 지정 예시 (이메일로 찾아서 직접 설정)
-- UPDATE profiles SET is_admin = true WHERE id = (
--   SELECT id FROM auth.users WHERE email = 'admin@example.com'
-- );


-- 2. game_edits 테이블 생성
CREATE TABLE IF NOT EXISTS game_edits (
  id           uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id      uuid         REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  proposed_by  uuid         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  field        text         NOT NULL,
  old_value    text,
  new_value    text         NOT NULL,
  status       text         DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
  reason       text,
  created_at   timestamptz  DEFAULT now(),
  reviewed_by  uuid         REFERENCES auth.users(id),
  reviewed_at  timestamptz
);


-- 3. game_edits RLS 설정
ALTER TABLE game_edits ENABLE ROW LEVEL SECURITY;

-- 로그인 유저는 본인 명의로만 INSERT 가능
DROP POLICY IF EXISTS "users can insert own edits" ON game_edits;
CREATE POLICY "users can insert own edits" ON game_edits
  FOR INSERT WITH CHECK (auth.uid() = proposed_by);

-- 본인 제안 조회 + 관리자는 전체 조회
DROP POLICY IF EXISTS "users see own edits admins see all" ON game_edits;
CREATE POLICY "users see own edits admins see all" ON game_edits
  FOR SELECT USING (
    auth.uid() = proposed_by
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 관리자만 승인/거절(UPDATE) 가능
DROP POLICY IF EXISTS "admins can review edits" ON game_edits;
CREATE POLICY "admins can review edits" ON game_edits
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );


-- 4. games 테이블 관리자 UPDATE 정책
-- games 테이블에 RLS가 이미 활성화된 경우에만 필요합니다.
-- RLS 비활성화 상태라면 이 섹션은 건너뛰어도 됩니다.
--
-- 현재 RLS 상태 확인:
--   SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'games';
--
-- RLS 활성화 + 정책 추가가 필요하다면 아래 주석 해제:

-- ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS "public can read approved games" ON games;
-- CREATE POLICY "public can read approved games" ON games
--   FOR SELECT USING (status = 'approved' OR status IS NOT NULL);

-- DROP POLICY IF EXISTS "admins can update games" ON games;
-- CREATE POLICY "admins can update games" ON games
--   FOR UPDATE USING (
--     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
--   );
