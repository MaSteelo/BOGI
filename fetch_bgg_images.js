// BGG XML API에서 이미지 URL을 가져와 Supabase games.image_url에 저장
//
// 실행 방법 (Node.js 18+ 필요):
//   VITE_SUPABASE_URL=https://xxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node fetch_bgg_images.js
//
// SUPABASE_SERVICE_ROLE_KEY: Supabase 대시보드 → Project Settings → API → service_role

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env 파일 파싱 (dotenv 없이)
function loadEnv() {
  const envPath = join(__dirname, ".env");
  if (!existsSync(envPath)) return {};
  const result = {};
  readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const eq = line.indexOf("=");
    if (eq === -1 || line.trim().startsWith("#")) return;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key) result[key] = val;
  });
  return result;
}

const env = loadEnv();
const get = (k) => process.env[k] ?? env[k] ?? "";

const SUPABASE_URL = get("VITE_SUPABASE_URL");
const SUPABASE_KEY = get("SUPABASE_SERVICE_ROLE_KEY") || get("VITE_SUPABASE_ANON_KEY");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ 환경 변수가 필요합니다.");
  console.error("   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 모든 형태의 BGG URL을 https://로 정규화
function normalizeImageUrl(url) {
  if (!url) return null;
  const u = url.trim();
  if (u.startsWith("https://")) return u;
  if (u.startsWith("http://")) return "https://" + u.slice(7);
  if (u.startsWith("//")) return "https:" + u;
  if (u.startsWith("cf.geekdo-images.com")) return "https://" + u;
  // 파일명만 있는 경우: pic1234567.jpg
  if (/^pic\d+\.\w+$/i.test(u)) return `https://cf.geekdo-images.com/${u}`;
  // 슬래시로 시작하는 경로
  if (u.startsWith("/")) return "https://cf.geekdo-images.com" + u;
  return null;
}

function isBadUrl(url) {
  if (!url) return true;
  const normalized = normalizeImageUrl(url);
  // 저장된 값이 https://로 시작하지 않으면 재처리 대상
  return !url.startsWith("https://") && !url.startsWith("http://");
}

async function fetchXml(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, {
      headers: { "User-Agent": "BOGI-App/1.0", Accept: "text/xml" },
    });
    if (res.status === 429) {
      console.log("  Rate limited — 15초 대기...");
      await sleep(15000);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }
  throw new Error("재시도 초과");
}

// BGG 검색: exact 우선, 없으면 일반 검색 첫 결과
async function searchBggId(name) {
  const base = "https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=";
  let xml = await fetchXml(base + encodeURIComponent(name) + "&exact=1");
  let m = xml.match(/<item[^>]+type="boardgame"[^>]+id="(\d+)"/);
  if (!m) {
    await sleep(1000);
    xml = await fetchXml(base + encodeURIComponent(name));
    m = xml.match(/<item[^>]+type="boardgame"[^>]+id="(\d+)"/);
  }
  return m?.[1] ?? null;
}

// BGG thing API로 <image> 태그 URL만 가져오기 (<thumbnail>은 핫링크 차단됨)
async function fetchBggImage(bggId) {
  for (let i = 0; i < 3; i++) {
    const xml = await fetchXml(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}`);
    if (xml.toLowerCase().includes("try again later")) {
      await sleep(5000);
      continue;
    }
    const img = xml.match(/<image>\s*([^\s<]+)\s*<\/image>/)?.[1];
    return normalizeImageUrl(img) ?? null;  // thumbnail은 사용하지 않음
  }
  return null;
}

async function main() {
  console.log("📋 게임 목록 조회 중...\n");

  const [{ data: games, error: gErr }, { data: rankings }] = await Promise.all([
    supabase.from("games").select("id, name_ko, name_en, bgg_rank, image_url").order("name_ko"),
    supabase.from("bgg_rankings").select("rank, name_en"),  // thumbnail 대신 name_en 사용
  ]);

  if (gErr) { console.error("❌ 게임 로드 실패:", gErr.message); process.exit(1); }

  // rank → BGG 공식 영문명 맵 (이름으로 API 검색에 사용)
  const rankToName = {};
  rankings?.forEach((r) => { if (r.name_en) rankToName[r.rank] = r.name_en; });

  // 전체 게임 재처리 (기존 URL이 thumbnail이어서 차단됐을 수 있으므로 모두 업데이트)
  const targets = games;
  console.log(`총 ${targets.length}개 전체 재처리 시작 (기존 image_url 포함)\n`);

  let updated = 0, failed = 0;
  const pad = String(targets.length).length;

  for (let i = 0; i < targets.length; i++) {
    const game = targets[i];
    const label = `[${String(i + 1).padStart(pad)}/${targets.length}] ${game.name_ko}`;

    // bgg_rank 있으면 bgg_rankings의 공식 영문명으로 검색 (더 정확함)
    // bgg_rank 없으면 games.name_en → name_ko 순으로 검색
    const searchName = (game.bgg_rank && rankToName[game.bgg_rank])
      || game.name_en
      || game.name_ko;

    process.stdout.write(`${label} → `);
    try {
      const bggId = await searchBggId(searchName);
      if (!bggId) { console.log("BGG ID 없음 ❌"); failed++; await sleep(2000); continue; }

      await sleep(1500);
      const imageUrl = await fetchBggImage(bggId);
      if (!imageUrl) { console.log(`BGG ${bggId} <image> 없음 ❌`); failed++; await sleep(2000); continue; }

      const { error } = await supabase.from("games").update({ image_url: imageUrl }).eq("id", game.id);
      if (error) {
        console.log(`DB 오류 ❌ ${error.message}`);
        failed++;
      } else {
        console.log(`✅ ${imageUrl}`);
        updated++;
      }
      await sleep(2000);
    } catch (err) {
      console.log(`오류 ❌ ${err.message}`);
      failed++;
      await sleep(2000);
    }
  }

  console.log(`\n${"─".repeat(40)}`);
  console.log(`✅ 업데이트: ${updated}개`);
  console.log(`❌ 실패:    ${failed}개`);
  console.log("완료!");
}

main().catch((err) => { console.error("예기치 않은 오류:", err); process.exit(1); });
