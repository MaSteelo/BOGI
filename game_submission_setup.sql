-- ================================================================
-- BOGI 게임 추가 신청 시스템 DB 설정
-- Supabase SQL Editor에서 실행하세요.
-- ================================================================

CREATE TABLE IF NOT EXISTS game_submissions (
  id           uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  submitted_by uuid         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name_ko      text         NOT NULL,
  name_en      text,
  publisher    text,
  min_players  int,
  max_players  int,
  play_minutes int,
  min_age      int,
  genre        text[],
  description  text,
  reason       text,
  status       text         DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   timestamptz  DEFAULT now(),
  reviewed_by  uuid         REFERENCES auth.users(id),
  reviewed_at  timestamptz
);

ALTER TABLE game_submissions ENABLE ROW LEVEL SECURITY;

-- 로그인 유저는 본인 명의로만 INSERT
DROP POLICY IF EXISTS "users can submit own games" ON game_submissions;
CREATE POLICY "users can submit own games" ON game_submissions
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

-- 본인 신청분 조회 + 관리자 전체 조회
DROP POLICY IF EXISTS "users see own submissions admins see all" ON game_submissions;
CREATE POLICY "users see own submissions admins see all" ON game_submissions
  FOR SELECT USING (
    auth.uid() = submitted_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 관리자만 승인/거절(UPDATE) 가능
DROP POLICY IF EXISTS "admins can review submissions" ON game_submissions;
CREATE POLICY "admins can review submissions" ON game_submissions
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ----------------------------------------------------------------
-- games 테이블 INSERT 정책 (RLS가 활성화된 경우에만 필요)
-- 현재 RLS 상태 확인:
--   SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'games';
-- RLS가 활성화돼 있으면 아래 주석을 해제하여 실행하세요.
-- ----------------------------------------------------------------

-- DROP POLICY IF EXISTS "admins can insert games" ON games;
-- CREATE POLICY "admins can insert games" ON games
--   FOR INSERT WITH CHECK (
--     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
--   );
