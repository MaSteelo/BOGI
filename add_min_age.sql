-- games 테이블에 권장 연령 컬럼 추가
ALTER TABLE games ADD COLUMN IF NOT EXISTS min_age integer;

-- 관리자용 INSERT 예시 (min_age 포함)
-- INSERT INTO games (name_ko, name_en, publisher, min_players, max_players, play_minutes, genre, min_age, status)
-- VALUES ('게임 이름', 'Game Name', '출판사', 2, 4, 60, ARRAY['전략', '협력'], 12, 'approved');
