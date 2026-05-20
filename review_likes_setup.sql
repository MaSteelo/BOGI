-- ================================================================
-- BOGI 리뷰 공감(좋아요) 테이블
-- ================================================================

CREATE TABLE IF NOT EXISTS review_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)   -- 한 리뷰에 한 번만 공감
);

-- RLS 활성화
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

-- 전체 공개 (공감 수 집계용)
CREATE POLICY "anyone can view likes" ON review_likes
  FOR SELECT USING (true);

-- 로그인 유저 본인 명의로만 INSERT
CREATE POLICY "users can insert own likes" ON review_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인 것만 DELETE (공감 취소)
CREATE POLICY "users can delete own likes" ON review_likes
  FOR DELETE USING (auth.uid() = user_id);
