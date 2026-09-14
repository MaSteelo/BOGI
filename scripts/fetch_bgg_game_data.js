// BGG XML API2에서 게임 목록(scripts/games_to_import.json)에 대한 상세 데이터를 조회
// DB에는 바로 반영하지 않고 검토용 파일만 생성한다.
//
// 실행 방법 (Node.js 18+ 필요, fetch 내장):
//   .env에 BGG_API_TOKEN=xxx 설정 후
//   node scripts/fetch_bgg_game_data.js
//
// BGG XML API는 등록 후 발급받은 토큰을 Authorization: Bearer 헤더로 보내야 한다
// (https://boardgamegeek.com/using_the_xml_api 참고)
//
// 검색 순서: name_ko 우선 → 결과 0개면 name_en(있는 경우만) 재시도 → 둘 다 실패하면 unresolved
//
// 입력: scripts/games_to_import.json
// 출력: scripts/output/bgg_resolved.json
//       scripts/output/bgg_unresolved.json
//       scripts/output/bgg_review.md

import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_PATH = join(__dirname, "games_to_import.json");
const OUTPUT_DIR = join(__dirname, "output");

const BGG_TOKEN = process.env.BGG_API_TOKEN;

const REQUEST_INTERVAL = 2000; // 요청 간 대기 (ms)
const MAX_202_RETRIES = 5;
const MAX_CONSECUTIVE_401 = 3;
const HANGUL_RE = /[가-힣]/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
}

function stripHtml(str) {
  return str
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDescription(raw) {
  if (!raw) return null;
  let text = stripHtml(decodeEntities(raw));
  if (text.length > 300) text = text.slice(0, 300).trim() + "…";
  return text;
}

function normalizeImageUrl(url) {
  if (!url) return null;
  const u = url.trim();
  if (u.startsWith("https://")) return u;
  if (u.startsWith("http://")) return "https://" + u.slice(7);
  if (u.startsWith("//")) return "https:" + u;
  if (u.startsWith("/")) return "https://cf.geekdo-images.com" + u;
  return u;
}

// 401이 연속으로 이만큼 발생하면 토큰 문제로 보고 전체 스크립트를 중단한다
// (게임 27개를 전부 401로 헛도는 걸 방지)
let consecutive401 = 0;

// BGG는 요청이 몰리면 202(Accepted, 캐시 준비 중)를 반환한다 — 재시도 필요
// 모든 BGG 요청은 이 함수를 거친다 — Authorization 헤더를 빠뜨릴 곳이 없음
async function fetchXml(url) {
  for (let attempt = 0; attempt <= MAX_202_RETRIES; attempt++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "BOGI-App/1.0",
        Accept: "text/xml",
        Authorization: `Bearer ${BGG_TOKEN}`,
      },
    });

    if (res.status === 401) {
      consecutive401++;
      if (consecutive401 >= MAX_CONSECUTIVE_401) {
        console.error("\n인증 실패 - 토큰 확인 필요");
        process.exit(1);
      }
      throw new Error("HTTP 401");
    }

    if (res.status === 202) {
      console.log(
        `    BGG 처리 중(202) — ${REQUEST_INTERVAL / 1000}초 후 재시도 (${attempt + 1}/${MAX_202_RETRIES})`
      );
      await sleep(REQUEST_INTERVAL);
      continue;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    consecutive401 = 0;
    return res.text();
  }
  throw new Error("202 재시도 초과");
}

function parseSearchResults(xml) {
  const blocks = [
    ...xml.matchAll(/<item\s+type="boardgame"\s+id="(\d+)"[^>]*>([\s\S]*?)<\/item>/g),
  ];
  return blocks.map(([, id, body]) => {
    const nameMatch = body.match(/<name\s+type="primary"[^>]*value="([^"]*)"/);
    const yearMatch = body.match(/<yearpublished\s+value="([^"]*)"/);
    return {
      id,
      name: nameMatch ? decodeEntities(nameMatch[1]) : null,
      year: yearMatch ? yearMatch[1] : null,
    };
  });
}

async function searchBgg(query) {
  const url = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`;
  const xml = await fetchXml(url);
  return parseSearchResults(xml);
}

// 정확히 일치하는 이름을 우선 선택. 후보가 하나뿐이면 그대로 확정(ambiguous 아님).
// 후보가 여럿인데 정확히 일치하는 게 없으면 첫 번째 + 전체 후보 목록을 함께 반환.
function pickMatch(items, query) {
  const target = query.trim().toLowerCase();
  const exact = items.find((it) => it.name && it.name.trim().toLowerCase() === target);
  if (exact) return { picked: exact, candidates: items, ambiguous: false };
  if (items.length === 1) return { picked: items[0], candidates: items, ambiguous: false };
  return { picked: items[0], candidates: items, ambiguous: true };
}

function extractLinkValues(body, linkType) {
  const re = new RegExp(`<link\\s+type="${linkType}"[^>]*value="([^"]*)"`, "g");
  return [...body.matchAll(re)].map((m) => decodeEntities(m[1]));
}

function extractAlternateKoNames(body) {
  const re = /<name\s+type="alternate"[^>]*value="([^"]*)"/g;
  return [...body.matchAll(re)]
    .map((m) => decodeEntities(m[1]))
    .filter((name) => HANGUL_RE.test(name));
}

async function fetchThing(id) {
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${id}&stats=1`;
  const xml = await fetchXml(url);
  const itemMatch = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/);
  if (!itemMatch) return null;
  const body = itemMatch[1];
  const get = (re) => body.match(re)?.[1] ?? null;

  const primaryName = get(/<name\s+type="primary"[^>]*value="([^"]*)"/);
  const description = get(/<description>([\s\S]*?)<\/description>/);
  const image = get(/<image>([\s\S]*?)<\/image>/);
  const yearpublished = get(/<yearpublished\s+value="([^"]*)"/);
  const minplayers = get(/<minplayers\s+value="([^"]*)"/);
  const maxplayers = get(/<maxplayers\s+value="([^"]*)"/);
  const playingtime = get(/<playingtime\s+value="([^"]*)"/);
  const minage = get(/<minage\s+value="([^"]*)"/);
  const average = get(/<ratings>[\s\S]*?<average\s+value="([^"]*)"/);

  return {
    bgg_name: primaryName ? decodeEntities(primaryName) : null, // name type="primary" → name_en
    yearpublished: yearpublished ? Number(yearpublished) : null,
    minplayers: minplayers ? Number(minplayers) : null,
    maxplayers: maxplayers ? Number(maxplayers) : null,
    playingtime: playingtime ? Number(playingtime) : null,
    minage: minage ? Number(minage) : null,
    description: cleanDescription(description),
    image: normalizeImageUrl(image),
    average: average ? Number(average) : null,
    categories: extractLinkValues(body, "boardgamecategory"),
    mechanics: extractLinkValues(body, "boardgamemechanic"),
    altNamesKo: extractAlternateKoNames(body),
  };
}

// name_ko로 먼저 검색하고, 결과가 없으면 (name_en이 있는 경우만) name_en으로 재시도한다.
async function searchWithFallback(game) {
  console.log(`    BGG 검색 중... (한글명: ${game.name_ko})`);
  let items;
  try {
    items = await searchBgg(game.name_ko);
  } catch (err) {
    throw new Error(`한글명 검색 오류: ${err.message}`);
  }
  if (items.length > 0) return { items, query: game.name_ko, matchedBy: "name_ko" };

  if (!game.name_en) return { items: [], query: game.name_ko, matchedBy: null };

  await sleep(REQUEST_INTERVAL);
  console.log(`    한글명 검색 결과 없음 → 영문명 재시도 (${game.name_en})`);
  try {
    items = await searchBgg(game.name_en);
  } catch (err) {
    throw new Error(`영문명 검색 오류: ${err.message}`);
  }
  return { items, query: game.name_en, matchedBy: items.length > 0 ? "name_en" : null };
}

async function processGame(game, index, total) {
  const label = `[${index + 1}/${total}] ${game.name_ko}`;
  console.log(`${label}`);

  let items, query, matchedBy;
  try {
    ({ items, query, matchedBy } = await searchWithFallback(game));
  } catch (err) {
    console.log(`    검색 실패: ${err.message}`);
    return { status: "unresolved", reason: err.message, game };
  }

  if (items.length === 0) {
    console.log("    검색 결과 없음 (한글명/영문명 모두 실패)");
    return { status: "unresolved", reason: "검색 결과 없음 (한글명/영문명 모두 실패)", game };
  }

  const { picked, candidates, ambiguous } = pickMatch(items, query);
  if (ambiguous) {
    console.log(
      `    ⚠️ 정확히 일치하는 이름 없음 (후보 ${items.length}개) → 첫 번째(${picked.name}, id=${picked.id}) 선택`
    );
  } else {
    console.log(`    매칭: ${picked.name} (id=${picked.id}, ${matchedBy})`);
  }

  await sleep(REQUEST_INTERVAL);

  let detail;
  try {
    detail = await fetchThing(picked.id);
  } catch (err) {
    console.log(`    상세 조회 실패: ${err.message}`);
    return { status: "unresolved", reason: `상세 조회 오류: ${err.message}`, game, candidates };
  }

  if (!detail) {
    console.log("    상세 응답 파싱 실패");
    return { status: "unresolved", reason: "상세 응답 파싱 실패", game, candidates };
  }

  console.log(`    ✅ ${detail.bgg_name} (${detail.yearpublished ?? "?"})`);

  return {
    status: "resolved",
    game,
    bgg_id: Number(picked.id),
    bgg_name: detail.bgg_name,
    matchedBy,
    ambiguous,
    candidates: ambiguous ? candidates : undefined,
    yearpublished: detail.yearpublished,
    minplayers: detail.minplayers,
    maxplayers: detail.maxplayers,
    playingtime: detail.playingtime,
    minage: detail.minage,
    description: detail.description,
    image: detail.image,
    average: detail.average,
    categories: detail.categories,
    mechanics: detail.mechanics,
    altNamesKo: detail.altNamesKo,
  };
}

function buildReviewMarkdown(resolved, unresolved) {
  const lines = [];
  lines.push("# BGG 데이터 조회 결과 검토");
  lines.push("");
  lines.push(`생성 시각: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`## 매칭 성공 (${resolved.length}개)`);
  lines.push("");
  lines.push("| 한글명 | BGG 영문명 | BGG id | 연도 | 인원 | 시간 | 연령 | 카테고리 | 메커니즘 |");
  lines.push("|---|---|---|---|---|---|---|---|---|");
  for (const r of resolved) {
    const flag = r.ambiguous ? " ⚠️" : "";
    const players =
      r.minplayers != null && r.maxplayers != null
        ? `${r.minplayers}~${r.maxplayers}`
        : "-";
    const categories = r.categories?.length ? r.categories.join(", ") : "-";
    const mechanics = r.mechanics?.length ? r.mechanics.join(", ") : "-";
    lines.push(
      `| ${r.game.name_ko}${flag} | ${r.bgg_name ?? "-"} | ${r.bgg_id} | ${r.yearpublished ?? "-"} | ${players} | ${r.playingtime ?? "-"}분 | ${r.minage ?? "-"}세 | ${categories} | ${mechanics} |`
    );
  }

  const ambiguousRows = resolved.filter((r) => r.ambiguous);
  if (ambiguousRows.length > 0) {
    lines.push("");
    lines.push(`## ⚠️ 후보가 여러 개였던 게임 — 육안 확인 필요 (${ambiguousRows.length}개)`);
    for (const r of ambiguousRows) {
      lines.push("");
      const searchedWith = r.matchedBy === "name_en" ? r.game.name_en : r.game.name_ko;
      lines.push(`**${r.game.name_ko}** (검색어: ${searchedWith}, ${r.matchedBy}) → 선택된 id=${r.bgg_id}`);
      lines.push("");
      lines.push("| 후보 이름 | BGG id | 연도 |");
      lines.push("|---|---|---|");
      for (const c of r.candidates) {
        lines.push(`| ${c.name ?? "-"} | ${c.id} | ${c.year ?? "-"} |`);
      }
    }
  }

  lines.push("");
  lines.push(`## 미해결 (${unresolved.length}개)`);
  lines.push("");
  lines.push("| 한글명 | 영문명 | 사유 |");
  lines.push("|---|---|---|");
  for (const u of unresolved) {
    lines.push(`| ${u.game.name_ko} | ${u.game.name_en ?? "-"} | ${u.reason} |`);
  }
  lines.push("");

  return lines.join("\n");
}

async function main() {
  if (!BGG_TOKEN) {
    console.error("BGG_API_TOKEN이 .env에 없습니다");
    process.exit(1);
  }

  const games = JSON.parse(readFileSync(INPUT_PATH, "utf8"));
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`📋 게임 ${games.length}개 처리 시작\n`);

  const resolved = [];
  const unresolved = [];

  for (let i = 0; i < games.length; i++) {
    const result = await processGame(games[i], i, games.length);
    if (result.status === "resolved") resolved.push(result);
    else unresolved.push(result);
    await sleep(REQUEST_INTERVAL);
  }

  writeFileSync(
    join(OUTPUT_DIR, "bgg_resolved.json"),
    JSON.stringify(resolved, null, 2)
  );
  writeFileSync(
    join(OUTPUT_DIR, "bgg_unresolved.json"),
    JSON.stringify(unresolved, null, 2)
  );
  writeFileSync(join(OUTPUT_DIR, "bgg_review.md"), buildReviewMarkdown(resolved, unresolved));

  console.log(`\n${"─".repeat(40)}`);
  console.log(`✅ 성공 ${resolved.length}개 / ❌ 실패 ${unresolved.length}개`);
  console.log(`\n결과 확인: scripts/output/bgg_review.md`);
}

main().catch((err) => {
  console.error("예기치 않은 오류:", err);
  process.exit(1);
});
