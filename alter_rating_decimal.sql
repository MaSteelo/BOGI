-- reviews.total_score 컬럼을 소수점 지원 타입으로 변경
-- 이미 real/numeric 타입이면 이 SQL은 건너뛰어도 됩니다.
--
-- 현재 타입 확인 방법:
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_name = 'reviews' AND column_name = 'total_score';
--
-- data_type이 'integer'이면 아래 ALTER를 실행하세요.
-- 'real' 또는 'numeric'이면 불필요합니다.

ALTER TABLE reviews
  ALTER COLUMN total_score TYPE real USING total_score::real;
