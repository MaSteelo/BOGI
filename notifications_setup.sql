-- ================================================================
-- BOGI 앱 내 알림 시스템 DB 설정
-- Supabase SQL Editor에서 실행하세요.
-- ================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type        text         NOT NULL
                           CHECK (type IN (
                             'edit_approved', 'edit_rejected',
                             'submission_approved', 'submission_rejected'
                           )),
  title       text         NOT NULL,
  body        text,
  related_id  uuid,        -- 해당 game_edits 또는 game_submissions id
  is_read     boolean      DEFAULT false NOT NULL,
  created_at  timestamptz  DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 본인 알림만 SELECT
DROP POLICY IF EXISTS "users read own notifications" ON notifications;
CREATE POLICY "users read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- 본인 알림 is_read UPDATE만
DROP POLICY IF EXISTS "users update own notifications" ON notifications;
CREATE POLICY "users update own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 관리자만 INSERT (승인/거절 시 알림 생성)
DROP POLICY IF EXISTS "admins can insert notifications" ON notifications;
CREATE POLICY "admins can insert notifications" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS notifications_user_id_idx    ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx  ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications (created_at DESC);
