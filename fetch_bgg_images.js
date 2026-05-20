#!/usr/bin/env node
// fetch_bgg_images.js
// BGG XML API에서 이미지 URL을 가져와 Supabase games 테이블에 저장합니다.
// 실행: node fetch_bgg_images.js

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── .env 파일 읽기 (dotenv 없이) ────────────────────────────────
const envFile = path.join(__dirname, '.env');
const env = {};
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1 || line.trim().startsWith('#')) return;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key) env[key] = val;
  });
}

const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ .env 파일에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── 유틸리티 ─────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function httpGet(urlStr, redirects = 5) {
  return new Promise((resolve, reject) => {
    const lib = urlStr.startsWith('https') ? https : http;
    const req = lib.get(urlStr, {
      headers: {
        'User-Agent': 'BOGI-BoardgameApp/1.0',
        'Accept': 'application/xml, text/xml',
      },
    }, (res) => {
      // 리디렉트 처리
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        const loc = res.headers.location;
        const next = loc.startsWith('/') ? new URL(urlStr).origin + loc : loc;
        res.resume();
        resolve(httpGet(next, redirects - 1));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// XML 태그 첫 번째 값 추출
function extractFirst(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

// 프로토콜 상대 URL 정규화 (//cf.geekdo-images.com/... → https://...)
function normalizeUrl(url) {
  if (!url) return null;
  if (url.startsWith('//')) return 'https:' + url;
  return url;
}

// ── BGG API ───────────────────────────────────────────────────────
async function searchBGG(name) {
  const url = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(name)}&type=boardgame`;
  const xml = await httpGet(url);
  if (!xml || xml.toLowerCase().includes('try again later')) return null;

  // 첫 번째 boardgame 항목의 ID 추출
  const m = xml.match(/<item\s+type="boardgame"\s+id="(\d+)"/);
  return m ? m[1] : null;
}

async function getBGGImage(bggId) {
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const xml = await httpGet(url);
    if (!xml) return null;
    // BGG가 큐잉 중이면 재시도
    if (xml.toLowerCase().includes('please try again')) {
      await sleep(3000);
      continue;
    }
    // <image> 우선, 없으면 <thumbnail>
    return normalizeUrl(extractFirst(xml, 'image')) ||
           normalizeUrl(extractFirst(xml, 'thumbnail'));
  }
  return null;
}

// ── 메인 ─────────────────────────────────────────────────────────
async function main() {
  console.log('📋 Supabase에서 게임 목록 조회 중...\n');

  const { data: games, error } = await supabase
    .from('games')
    .select('id, name_ko, name_en, bgg_rank, image_url')
    .order('name_ko');

  if (error) {
    console.error('❌ 게임 목록 조회 실패:', error.message);
    process.exit(1);
  }

  const targets = games.filter(g => !g.image_url && (g.name_en || g.name_ko));
  const alreadyDone = games.length - targets.length;

  console.log(`총 ${games.length}개 게임`);
  console.log(`✅ 이미 이미지 있음: ${alreadyDone}개`);
  console.log(`🔍 처리 대상: ${targets.length}개\n`);

  if (targets.length === 0) {
    console.log('모든 게임에 이미지가 있습니다!');
    return;
  }

  let updated = 0;
  let failed = 0;
  const pad = String(targets.length).length;

  for (let i = 0; i < targets.length; i++) {
    const game = targets[i];
    const searchName = game.name_en || game.name_ko;
    const label = `[${String(i + 1).padStart(pad)}/${targets.length}] ${game.name_ko}`;

    process.stdout.write(`${label} → `);

    try {
      const bggId = await searchBGG(searchName);
      if (!bggId) {
        console.log('BGG 검색 결과 없음, 건너뜀');
        failed++;
        await sleep(2000);
        continue;
      }

      await sleep(1000); // search → thing 사이 대기

      const imageUrl = await getBGGImage(bggId);
      if (!imageUrl) {
        console.log(`BGG ID ${bggId} 이미지 없음, 건너뜀`);
        failed++;
        await sleep(2000);
        continue;
      }

      const { error: updateError } = await supabase
        .from('games')
        .update({ image_url: imageUrl })
        .eq('id', game.id);

      if (updateError) {
        console.log(`DB 업데이트 실패: ${updateError.message}`);
        failed++;
      } else {
        console.log(imageUrl);
        updated++;
      }
    } catch (err) {
      console.log(`오류: ${err.message}`);
      failed++;
    }

    // BGG rate limit 준수 (마지막 항목은 대기 불필요)
    if (i < targets.length - 1) {
      await sleep(2000);
    }
  }

  console.log('\n──────────────────────────');
  console.log(`✅ 업데이트: ${updated}개`);
  console.log(`⏭  건너뜀:  ${failed}개`);
  console.log('완료!');
}

main().catch(err => {
  console.error('예기치 않은 오류:', err);
  process.exit(1);
});
