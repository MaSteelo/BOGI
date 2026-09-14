// scripts/output/bgg_resolved.json에 담긴 BGG 원본 이미지를 다운로드해
// Supabase Storage(game-images 버킷)에 올리고 games.image_url을 채운다.
// BGG는 핫링크를 막기 때문에 반드시 다운로드 후 재업로드한다 (fetch_bgg_images.js와 동일 패턴).
//
// 실행 방법 (Node.js 18+ 필요, fetch 내장):
//   .env에 VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY(권장) 필요
//   node scripts/upload_new_game_images.js
//
// games UPDATE / Storage 업로드는 RLS상 관리자 권한이 필요할 수 있다.
// SUPABASE_SERVICE_ROLE_KEY가 없으면 VITE_SUPABASE_ANON_KEY로 시도하되,
// RLS에 막히면 실패로 기록된다 — 대시보드 → Project Settings → API → service_role

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESOLVED_PATH = join(__dirname, "output", "bgg_resolved.json");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const BGG_TOKEN = process.env.BGG_API_TOKEN; // 이미지 다운로드가 막힐 때만 fallback으로 사용
const BUCKET = "game-images";
const REQUEST_INTERVAL = 1000;

// DB에 아직 안 넣은 게임 — bgg_resolved.json에는 있지만 이번 처리 대상에서 제외
const EXCLUDE_NAMES = new Set(["늑대인간 마을의 축제"]);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ 환경 변수가 필요합니다.");
  console.error("   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (또는 VITE_SUPABASE_ANON_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// cf.geekdo-images.com은 xmlapi2와 별개인 이미지 CDN이라 보통 Bearer 토큰이 필요 없다.
// 혹시 막히는 경우를 대비해 401/403이면 토큰을 붙여 한 번만 더 시도한다.
async function downloadImage(imageUrl) {
  let res = await fetch(imageUrl, { headers: { "User-Agent": "BOGI-App/1.0" } });

  if ((res.status === 401 || res.status === 403) && BGG_TOKEN) {
    res = await fetch(imageUrl, {
      headers: { "User-Agent": "BOGI-App/1.0", Authorization: `Bearer ${BGG_TOKEN}` },
    });
  }

  if (!res.ok) throw new Error(`이미지 다운로드 실패: HTTP ${res.status}`);

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const ext = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType, ext };
}

// 파일명 규칙은 upload_game_image.js / fetch_bgg_images.js와 동일: `${games.id}.${ext}`
async function uploadAndUpdate(gameId, imageUrl) {
  const { buffer, contentType, ext } = await downloadImage(imageUrl);
  const filePath = `${gameId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType, upsert: true });
  if (uploadError) throw new Error(`Storage 업로드 실패: ${uploadError.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  const { error: updateError } = await supabase
    .from("games")
    .update({ image_url: publicUrl })
    .eq("id", gameId);
  if (updateError) throw new Error(`DB 업데이트 실패: ${updateError.message}`);

  return publicUrl;
}

async function main() {
  const resolved = JSON.parse(readFileSync(RESOLVED_PATH, "utf8"));

  const targets = resolved.filter(
    (r) => r.status === "resolved" && !EXCLUDE_NAMES.has(r.game.name_ko)
  );
  const excludedCount = resolved.filter((r) => EXCLUDE_NAMES.has(r.game.name_ko)).length;

  console.log(`📋 처리 대상 ${targets.length}개 (제외 ${excludedCount}개)\n`);

  const { data: dbGames, error: gErr } = await supabase
    .from("games")
    .select("id, name_ko, image_url");
  if (gErr) {
    console.error("❌ games 조회 실패:", gErr.message);
    process.exit(1);
  }
  const byNameKo = new Map(dbGames.map((g) => [g.name_ko, g]));

  let success = 0,
    failed = 0,
    skipped = 0;
  const failures = [];

  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const nameKo = r.game.name_ko;
    const label = `[${i + 1}/${targets.length}] ${nameKo}`;

    const game = byNameKo.get(nameKo);
    if (!game) {
      console.log(`${label} → ❌ DB에서 찾을 수 없음 (name_ko 불일치)`);
      failed++;
      failures.push({ name: nameKo, reason: "DB에서 게임을 찾을 수 없음 (name_ko 불일치)" });
      await sleep(REQUEST_INTERVAL);
      continue;
    }

    if (game.image_url) {
      console.log(`${label} → ⏭️  이미 image_url 있음, 건너뜀`);
      skipped++;
      await sleep(REQUEST_INTERVAL);
      continue;
    }

    if (!r.image) {
      console.log(`${label} → ❌ bgg_resolved.json에 이미지 URL 없음`);
      failed++;
      failures.push({ name: nameKo, reason: "BGG 이미지 URL 없음" });
      await sleep(REQUEST_INTERVAL);
      continue;
    }

    try {
      const publicUrl = await uploadAndUpdate(game.id, r.image);
      console.log(`${label} → ✅ ${publicUrl}`);
      success++;
    } catch (err) {
      console.log(`${label} → ❌ ${err.message}`);
      failed++;
      failures.push({ name: nameKo, reason: err.message });
    }

    await sleep(REQUEST_INTERVAL);
  }

  console.log(`\n${"─".repeat(40)}`);
  console.log(`✅ 성공 ${success}개 / ❌ 실패 ${failed}개 / ⏭️ 건너뜀 ${skipped}개`);
  if (failures.length > 0) {
    console.log("\n실패 목록:");
    failures.forEach((f) => console.log(`  - ${f.name}: ${f.reason}`));
  }
}

main().catch((err) => {
  console.error("예기치 않은 오류:", err);
  process.exit(1);
});
