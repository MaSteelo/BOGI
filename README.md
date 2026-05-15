# BOGI — 보드게임 기록 앱

보드게임 플레이 기록을 남기고, 별점·메모·참가자를 관리하는 개인 기록 서비스.

## 기술 스택

| 구분 | 기술 |
|---|---|
| Frontend | React 18, Vite |
| Routing | React Router v6 |
| Backend / DB | Supabase (PostgreSQL + Auth) |
| 배포 | Vercel |
| 스타일 | 인라인 스타일 (style prop) |
| 폰트 | Pretendard |

## 주요 기능

- 이메일/비밀번호 회원가입 · 로그인
- 보드게임 라이브러리 (검색, 장르 필터, 정렬)
- BGG(BoardGameGeek) TOP 50 랭킹 카드
- 게임별 플레이 기록 (별점, 날짜, 참가자, 메모)
- 참가자 비공개 설정
- 기록 수정 · 삭제
- 마이페이지: 통계, 별점 분포 차트, 내 기록 목록

## 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 Supabase URL과 키 입력

# 3. 개발 서버 실행
npm run dev
```

## 환경변수

`.env` 파일에 아래 두 값을 설정합니다.
Supabase 대시보드 → Project Settings → API 에서 확인할 수 있습니다.

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> `.env` 파일은 `.gitignore`에 등록되어 있어 Git에 커밋되지 않습니다.
> Vercel 배포 시에는 대시보드 환경변수 설정으로 입력하세요.

## 빌드

```bash
npm run build   # dist/ 폴더 생성
npm run preview # 빌드 결과 로컬 미리보기
```

## Supabase DB 테이블

| 테이블 | 설명 |
|---|---|
| `profiles` | 유저 프로필 (id, nickname) |
| `games` | 보드게임 목록 (status='approved'만 표시) |
| `reviews` | 플레이 기록 (별점, 메모, 날짜, 참가자) |
| `bgg_rankings` | BoardGameGeek 랭킹 데이터 |
