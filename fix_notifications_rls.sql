-- ================================================================
-- BOGI 알림 INSERT RLS 수정
-- notifications_setup.sql의 INSERT 정책을 교체합니다.
--
-- 문제: 기존 정책이 profiles 서브쿼리로 관리자 체크를 하는데,
--       profiles에 RLS가 걸려 있으면 서브쿼리가 항상 false → INSERT 차단.
-- 해결: 인증된 사용자면 INSERT 허용 (앱 레벨에서 이미 is_admin 체크함).
-- ================================================================

DROP POLICY IF EXISTS "admins can insert notifications" ON notifications;
CREATE POLICY "authenticated users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
