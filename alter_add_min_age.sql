-- 1. min_age 컬럼 추가
ALTER TABLE games ADD COLUMN IF NOT EXISTS min_age integer;

-- 2. 기존 게임 min_age UPDATE
UPDATE games SET min_age = 15 WHERE name_ko = '미스터리 파티: 늑대인간 마을의 축제';
UPDATE games SET min_age = 15 WHERE name_ko = '머더 미스터리 미니: 웬디, 어른이 되렴';
UPDATE games SET min_age = 15 WHERE name_ko = '머더 미스터리 미니: 안개가 떨어지는 고개';
UPDATE games SET min_age = 12 WHERE name_ko = 'EXIT 방 탈출 게임: 버려진 오두막';

UPDATE games SET min_age = 12 WHERE name_ko IN (
  '타임스토리즈',
  '타임스토리즈: 마시 사건',
  '타임스토리즈: 용의 예언',
  '타임스토리즈: 가면 아래에서',
  '타임스토리즈: 인듀어런스 호',
  '타임스토리즈: 에스트렐라 드라이브',
  '타임스토리즈: 신앙의 빛',
  '타임스토리즈: 해변의 형제단',
  '타임스토리즈: 마담',
  '타임스토리즈: 스위칭 기어'
);
