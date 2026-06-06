# 월드컵 베팅 게임 (친구 모임용)

2026 FIFA 월드컵 기간 동안 친구들끼리 가상 칩으로 즐기는 베팅 게임 웹 앱.
프로젝트 전체 명세는 [`CLAUDE .md`](./CLAUDE%20.md) 참고.

## 기술 스택

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Supabase (PostgreSQL + Realtime) — `@supabase/supabase-js`
- 호스팅: Vercel

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev                  # http://localhost:3000
```

## 환경변수

| 키 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon(공개) 키 |

## 구조 (Stage 1)

```
src/
  app/
    layout.tsx          # 헤더(대회명/보유 칩) + 반응형 탭 네비
    page.tsx            # 메인 / 조별 명단 (12조 스켈레톤)
    bet/page.tsx        # 베팅하기
    live/page.tsx       # 라이브 현황
    ranking/page.tsx    # 순위표
    settlements/page.tsx# 정산 내역
  components/
    BottomNav.tsx       # 모바일 하단 탭 / 데스크톱 상단 메뉴
    ComingSoon.tsx      # 스켈레톤 자리표시자
  lib/
    supabase.ts         # Supabase 클라이언트
    nav.ts              # 탭 정의
```

## 개발 단계

CLAUDE.md §11 참고. 현재 **Stage 1 (프로젝트 셋업)** 완료.
