// scripts/output/bgg_resolved.json을 읽어 games 테이블용 INSERT SQL을 생성한다.
// 이 스크립트는 SQL 파일만 만들 뿐 DB에 직접 연결하지 않는다 — 실행은 Supabase SQL Editor에서 사람이 한다.
//
// 실행 방법:
//   node scripts/generate_insert_sql.js
//
// 입력: scripts/output/bgg_resolved.json (fetch_bgg_game_data.js가 생성)
// 출력: scripts/output/insert_games.sql
//
// games 테이블 스키마:
//   name_ko text NOT NULL, name_en text, publisher text,
//   min_players int, max_players int, play_minutes int, min_age int,
//   genre ARRAY, description text, image_url text, status text, bgg_rank int
//
// - image_url은 항상 NULL로 둔다 (BGG 이미지는 핫링크가 막혀 있음, upload_game_image.js로 별도 처리)
// - genre는 games_to_import.json에 사람이 넣은 값을 쓴다 (없으면 빈 배열)
// - status는 'approved' 고정
// - name_ko 기준 WHERE NOT EXISTS로 감싸 중복 실행해도 안전

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_PATH = join(__dirname, "output", "bgg_resolved.json");
const OUTPUT_PATH = join(__dirname, "output", "insert_games.sql");

function esc(str) {
  return String(str).replace(/'/g, "''");
}

function sqlString(val) {
  if (val === null || val === undefined || val === "") return "NULL";
  return `'${esc(val)}'`;
}

function sqlNumber(val) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return "NULL";
  return Number(val);
}

function sqlArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "ARRAY[]::text[]";
  return `ARRAY[${arr.map((g) => `'${esc(g)}'`).join(", ")}]`;
}

function buildInsert(r) {
  const nameKo = r.game.name_ko;
  const nameEn = r.bgg_name ?? r.game.name_en ?? null;
  const publisher = r.game.publisher ?? null;
  const genre = r.game.genre ?? [];

  return [
    `-- ${nameKo}${r.ambiguous ? " (⚠️ BGG 후보 다수, bgg_review.md 확인)" : ""}`,
    `INSERT INTO games (name_ko, name_en, publisher, min_players, max_players, play_minutes, min_age, genre, description, image_url, status)`,
    `SELECT ${sqlString(nameKo)}, ${sqlString(nameEn)}, ${sqlString(publisher)}, ${sqlNumber(r.minplayers)}, ${sqlNumber(r.maxplayers)}, ${sqlNumber(r.playingtime)}, ${sqlNumber(r.minage)}, ${sqlArray(genre)}, ${sqlString(r.description)}, NULL, 'approved'`,
    `WHERE NOT EXISTS (SELECT 1 FROM games WHERE name_ko = ${sqlString(nameKo)});`,
  ].join("\n");
}

function main() {
  if (!existsSync(INPUT_PATH)) {
    console.error(`❌ ${INPUT_PATH} 가 없습니다. 먼저 fetch_bgg_game_data.js를 실행하세요.`);
    process.exit(1);
  }

  const resolved = JSON.parse(readFileSync(INPUT_PATH, "utf8"));

  if (resolved.length === 0) {
    console.log("생성할 게임이 없습니다 (bgg_resolved.json이 비어 있음).");
    return;
  }

  const sql = resolved.map(buildInsert).join("\n\n") + "\n";
  writeFileSync(OUTPUT_PATH, sql);

  console.log(`✅ ${resolved.length}개 게임의 INSERT문 생성 완료 → scripts/output/insert_games.sql`);
  console.log("   Supabase SQL Editor에서 검토 후 직접 실행하세요.");
}

main();
