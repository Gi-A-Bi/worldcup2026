# 월드컵 베팅 게임 (친구 모임용)

> 이 문서는 프로젝트 명세서입니다. Claude Code는 이 파일을 자동으로 읽어 프로젝트 맥락을 파악합니다.
> 변경사항이 있으면 이 파일을 먼저 업데이트한 뒤 작업을 진행해주세요.
>
> ⚠️ **2026 대회 형식 기준** — 이 명세서는 2026 FIFA 월드컵(48개 팀 / 12개 조 / Round of 32)을 기준으로 합니다.
> 예전 32개 팀·8개 조·16강 형식이 아닙니다.

---

## 1. 프로젝트 개요

2026 월드컵 기간 동안 친구들끼리(약 6명) 모여서 진행하는 베팅 게임 웹 앱.
링크를 공유하면 각자 기기에서 베팅하고, 실시간으로 모든 참여자의 베팅 현황·배당률·순위를 볼 수 있다.

**핵심 컨셉**: 박진감 있는 친구 모임용 베팅 게임. 실제 돈은 아니고 가상 칩.

## 2. 기술 스택

- **백엔드/DB**: Supabase (PostgreSQL + 실시간 구독)
- **프론트엔드**: Next.js + React + TypeScript + Tailwind CSS
- **호스팅**: Vercel
- **인증**: Supabase Auth 사용하지 않음. **"닉네임 + 비밀번호" 로그인** 방식. (친구들만 쓰므로 단일 공유 게임)
  - 방 코드/방 만들기 없음. 모두가 하나의 게임(rooms.code='MAIN')을 공유한다.
  - 처음 보는 닉네임 → 입력한 비밀번호로 계정 자동 생성(칩 지급). 기존 닉네임 → 비밀번호 일치 시 복귀.
  - 비밀번호는 `pgcrypto`(bcrypt) 해시로 저장하고, 로그인은 RPC `login_player`로 서버에서 검증.
  - 재접속 위해 `localStorage`에 `{ playerId, nickname }` 저장 (비밀번호는 저장 안 함).
  - 셋업: `supabase/single_game_setup.sql` (단일 게임 + 48팀 + 비밀번호 컬럼 + login_player).

## 3. 핵심 게임 규칙

### 칩 시스템
- 시작 자산: **10,000칩** (방 만들 때 모든 참여자에게 지급)
- **라운드 보너스 없음.** 시작 칩 10,000으로 대회 끝까지 진행.

### 베팅 규칙
- **베팅 한도 없음** (몰빵 가능). 단, **보유 칩을 초과하는 베팅은 불가**.
- 마감 전까지 같은 카테고리에 **추가 베팅 가능** (배당률 변동 보면서)
- **베팅 취소 불가능**
- 베팅 내역은 모든 참여자에게 **공개**

### 권한 구조
- **방장 개념 없음.** 누구나 카테고리 추가/마감/정산 가능.
- 단, 실수 방지 위해 **변경 로그(activity_log)** 필수.
- 마감·정산 같은 되돌릴 수 없는 동작은 **확인 모달**로 한 번 더 확인.

### 결과 정산 방식
- **수동 입력.** 경기 결과는 참여자가 직접 정답을 입력해 정산한다(다 같이 경기를 보므로).
- 외부 스포츠 API 자동 연동은 **하지 않는다**(향후 Phase 2 후보 — 10번 참고).

## 4. 베팅 카테고리

처음 5개로 시작. 나중에 추가 가능한 구조.

| 카테고리 | type 값 | settlement_type | multi_select | 정산 시점 |
|---|---|---|---|---|
| 우승팀 | `winner` | `parimutuel` | false | 대회 종료 후 |
| 조별리그 진출팀 | `advance` | `pool_share` | true | 조별리그 종료 후 (32팀 진출) |
| 득점왕 | `topscorer` | `parimutuel` | false | 대회 종료 후 |
| 빅매치 승무패 | `match` | `parimutuel` | false | 매치 종료 즉시 |
| 토너먼트 라운드별 승리팀 | `knockout` | `parimutuel` | false | 라운드 종료 후 |

**"조별리그 진출팀"(B안)**: 조별리그를 통과해 Round of 32에 오르는 팀을 맞히는 카테고리.
각 조 상위 2팀(24) + 3위 중 성적 좋은 8팀 = **총 32팀**이 진출한다. 여러 팀을 복수 선택해 베팅.

## 5. 정산 로직

> 두 방식 모두 **금액 기준**이며 100% 환원(수수료 없음).
> 정답이 정해진 옵션에 **아무도 베팅하지 않았다면** → 해당 카테고리 전원 베팅액을 **그대로 환불**한다(0으로 나누기 방지).

### 파리뮤추얼 (`parimutuel`) — 단일 정답
정답에 베팅한 사람들이 전체 풀을 자기 기여 비율대로 나눠 갖는다.

```
표시 배당률 = 카테고리 총 풀 / 해당 옵션 풀
내 배당금   = (카테고리 총 풀 / 정답 옵션 풀) × 내가 정답에 건 칩
순손익      = 배당금 - 내 총 베팅
```

**예시**: 우승팀 카테고리 총 풀 5,000칩. 브라질에 1,000칩 걸렸고 그중 내가 300칩.
- 브라질 우승 시 → (5000 / 1000) × 300 = **1,500칩 회수** (1,200칩 순이익)
- 표시 배당률: 5000/1000 = 5.0×

### 풀셰어 (`pool_share`) — 복수 정답 (금액 기준, ‘맞춘 개수’ 아님)
복수정답 카테고리(예: 진출팀)에 사용. **정답 팀들에 건 금액 비율**로 풀을 분배한다.

```
내 배당금 = 카테고리 총 풀 × (내가 '정답 팀들'에 건 칩 합 / 모두가 '정답 팀들'에 건 칩 합)
```

**예시**: 진출팀 카테고리 총 풀 10,000칩. 조별리그 끝나고 32팀 진출(정답).
- 내가 정답 팀들에 합쳐서 800칩, 모두가 정답 팀들에 건 합이 4,000칩
- → 10,000 × (800 / 4000) = **2,000칩**

> ⚠️ **과거 ‘점수(맞춘 개수)’ 방식은 폐기.** 금액 기준이라 '1칩씩 전부에 흩뿌리기'가 통하지 않고
> (적게 건 만큼 배당도 적음), 정확도와 베팅 금액이 함께 반영된다. 파리뮤추얼과 계산 철학도 통일됨.

### 수수료
**없음.** 100% 환원.

### 정산 안전장치 (중요)
- 한 카테고리는 **한 번만 정산.** `settlements`에 `unique(player_id, category_id)` 제약, 정산 전 `status != 'resolved'` 확인.
- 베팅·정산(칩 차감/가산)은 **원자적으로** 처리한다. 동시 베팅 시 잔액이 어긋나지 않도록 Supabase 함수(RPC) 안에서 "잔액 검사 + 차감"을 한 트랜잭션으로 수행.
- 정산은 `bets`를 집계해 계산하고, 결과를 `settlements`에 기록 + `players.chips`를 갱신.

## 6. 데이터 모델 (Supabase)

### 테이블 SQL

```sql
-- 방 (베팅 게임 단위 = 하나의 토너먼트)
create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                   -- 6자리 공유 코드
  name text not null,
  tournament_name text,                        -- 헤더에 표시되는 대회명
  initial_chips int default 10000,
  created_at timestamptz default now()
);

-- 참가자
create table players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  nickname text not null,
  chips int default 10000,                     -- 현재 보유 칩 (베팅 시 차감, 정산 시 가산)
  created_at timestamptz default now(),
  unique(room_id, nickname)
);

-- 대회 참가 팀 (조별 명단 표시 + 베팅 옵션 생성의 단일 원천)
create table teams (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  name text not null,                          -- 표시명 (예: '대한민국')
  group_label text not null,                   -- 'A' ~ 'L'
  flag_emoji text,                             -- 🇰🇷 등
  fifa_code text                               -- 'KOR' 등 (선택)
);

-- 베팅 카테고리
create table categories (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  name text not null,
  type text not null,                          -- 'winner' | 'advance' | 'topscorer' | 'match' | 'knockout' | 'custom'
  settlement_type text not null check (settlement_type in ('parimutuel', 'pool_share')),
  multi_select boolean default false,
  kickoff_at timestamptz,                      -- match 등 시각 표시용 (KST로 변환해 노출). 없으면 null
  status text default 'open' check (status in ('open', 'locked', 'resolved')),
  created_at timestamptz default now(),
  locked_at timestamptz,
  resolved_at timestamptz
);

-- 옵션 (선택지: 팀, 선수, 승/무/패 등). 팀 기반 카테고리는 teams에서 자동 생성.
create table options (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  team_id uuid references teams(id),           -- 팀 옵션이면 연결 (없으면 null)
  label text not null,
  is_correct boolean default false             -- 정산 시 정답 표시 (multi_select면 여러 개 true 가능)
);

-- 베팅 기록
create table bets (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  option_id uuid references options(id) on delete cascade,
  amount int not null check (amount > 0),
  created_at timestamptz default now()
);

-- 정산 결과
create table settlements (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  payout int not null,                         -- 정산받은 칩
  net int not null,                            -- 손익 (payout - 해당 카테고리 총베팅)
  created_at timestamptz default now(),
  unique(player_id, category_id)               -- 중복 정산 방지
);

-- 변경 로그 (누가 카테고리 만들고 마감/정산했는지 추적)
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  player_id uuid references players(id),
  action text not null,                        -- 'create_category', 'lock_category', 'resolve_category', 'bet' 등
  meta jsonb,
  created_at timestamptz default now()
);

-- 실시간 구독 활성화
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table categories;
alter publication supabase_realtime add table options;
alter publication supabase_realtime add table bets;
alter publication supabase_realtime add table settlements;
alter publication supabase_realtime add table activity_log;
```

### RLS (Row Level Security)
방 코드 기반이므로 초기엔 RLS 비활성화로 시작 → 친구만 쓰는 거니까 OK.
주의: Supabase anon 키는 브라우저에 노출되는 공개 키라, RLS를 끄면 방 코드 외엔 보호장치가 없다.
링크가 외부로 퍼지면 실시간 데이터가 보일 수 있음. 친구 한 그룹만 쓰면 문제없음.
나중에 보안 강화 필요하면 방 코드를 헤더로 받는 RLS 정책 추가.

## 7. 화면 구성 (반응형: 모바일·데스크톱 모두)

- 휴대폰: 하단 탭 4개. 큰 화면(노트북·TV): 옆/위 메뉴로 펼침.
- 친구들이 모여 볼 때를 위한 **관전 모드**(라이브 현황을 큰 화면용으로 키워 보기) — 여유 되면 추가.

### 메인 / 조별 명단
- 헤더: 대회명 + 보유 칩
- **조별 명단 보기**: 12개 조(A~L) × 4팀을 국기 이모지와 함께 표시.
  - 이 `teams` 데이터가 우승팀·진출팀 등 베팅 옵션의 원천.

### Tab 1. 베팅하기
- 카테고리별 카드 (확장형)
  - 카테고리명, 상태 뱃지(열림/마감/정산됨), 풀 사이즈
  - 옵션별 현재 **예상 배당률(마감 시 변동)** + 분포 막대그래프
  - 칩 입력 (스테퍼: −, 칩 수, +) + 베팅 버튼
- `match` 카테고리는 한국시간(KST) 킥오프 표시

### Tab 2. 라이브 현황
- LIVE 인디케이터 (Supabase Realtime 구독으로 자동 갱신)
- 카테고리별 분포 시각화 (막대그래프 + 퍼센티지)
- 누가 어디에 얼마 걸었는지 칩 형태로 표시 (`김 → BRA 2,000`)

### Tab 3. 순위표
- 보유 칩 기준 랭킹 (1~6위)
- 최근 정산 손익 델타 표시 (+/−)
- **묶인 칩** 섹션: 대회 종료 후 정산되는 베팅 (예: 우승팀)
- **탈락 베팅** 섹션: 이미 결과가 확정돼 손실이 확정된 베팅

### Tab 4. 정산 내역
- 카테고리/매치별 결과 카드
  - 정답 표시, 풀 사이즈 + 배율
  - 누가 따고(녹색) 누가 잃었는지(빨강)
- 정산 대기 섹션 (아직 결과 안 나온 카테고리)

## 8. 사용자 플로우

1. **첫 진입**: 닉네임 + 비밀번호 로그인 화면 (방 만들기/코드 없음)
2. **로그인**: 닉네임 + 비밀번호 입력 → 처음이면 계정 자동 생성(`initial_chips` 지급), 기존이면 비밀번호 확인 후 복귀
3. **단일 게임**: 모두가 같은 게임(code='MAIN', 48팀 자동 세팅)을 공유
4. **메인 화면**: 참가자 + 조별 명단 + 4개 탭 진입 → 베팅 시작
5. **세션 유지**: `localStorage`에 `{ playerId, nickname }` 저장 → 다음 방문 시 자동 재접속

## 9. 디자인 방향 (월드컵 느낌)

- 팔레트: 잔디 그린 + 트로피 골드 포인트. 다크 모드(야간 경기 분위기) 권장.
- 국기 이모지(🇰🇷🇧🇷🇫🇷)로 색감 살리기, 축구공 육각 패턴·컨페티 등 모티프.
- ⚠️ **저작권/상표 주의**: FIFA 공식 로고, "월드컵" 공식 엠블럼, 공식 마스코트, 스폰서 로고는 **사용 금지**.
  반드시 **직접 만든 오리지널 축구 테마 그래픽**(공·잔디·트로피 모양)으로 분위기를 낼 것.

## 10. 아직 결정 안 된 부분 (TODO)

- [ ] 베팅 화면 카테고리 펼침: 아코디언 vs 항상 펼침
- [ ] 묶인 칩 표시: 보유 칩에서 차감 vs 별도 표시
- [ ] 방 만들기/입장 화면 세부 디자인
- [ ] 정답 입력 UI 세부 (단일선택 vs 다중 체크). 마감/정산 확인 모달 포함
- [ ] 디자인 디테일 (색상·폰트·오리지널 로고)
- [ ] (Phase 2 후보) 경기 결과 스포츠 API 자동 연동 — 지금은 수동. 자동 정산이 어긋나면 칩이 꼬이므로 v1은 수동 유지. 구조만 나중에 붙이기 쉽게.

## 11. 개발 단계별 계획

각 단계 끝마다 동작 확인 후 진행.

### Stage 1: 프로젝트 셋업
- Next.js + TypeScript + Tailwind 프로젝트 생성 (`create-next-app`)
- Supabase 프로젝트 생성 → URL/anon key를 `.env.local`에 저장
- 위 SQL로 테이블 생성 (Supabase SQL Editor)
- `@supabase/supabase-js` 설치 및 클라이언트 셋업
- 메인 + 4개 탭 기본 페이지 스켈레톤

### Stage 2: 방 만들기 + 입장 + 세션
- 방 생성 (코드 자동 생성) + 월드컵 48팀 템플릿을 `teams`에 자동 삽입
- 방 입장 (코드 + 닉네임, 공유 링크 코드 자동 입력, 같은 닉네임=복귀)
- `localStorage` 세션 저장/복원, 방 내 참가자 리스트 표시

### Stage 3: 조별 명단 + 카테고리/옵션 관리
- 조별 명단 보기 화면 (12조 × 4팀, 국기)
- 카테고리 생성 UI (월드컵 템플릿 자동 세팅 + 수정), 팀 옵션은 `teams`에서 생성
- 카테고리 상태 변경 (열림 → 마감, 확인 모달), `activity_log` 기록

### Stage 4: 베팅 기능
- 옵션 선택 → 칩 입력(잔액 검사) → 베팅 (RPC로 원자적 차감)
- 실시간 풀/배당률 계산 (`bets` 집계), Realtime 구독 갱신
- 베팅 내역 공개 표시

### Stage 5: 정산 로직
- 파리뮤추얼 / 풀셰어 계산 함수 (0 나누기 → 전원 환불)
- 정답 입력 UI(확인 모달) → 자동 계산 → `settlements` 기록 + `players.chips` 갱신 (중복 정산 방지)

### Stage 6: 순위 + 정산 내역 화면
- 보유 칩 랭킹, 최근 손익 델타
- 묶인 칩 / 탈락 베팅 계산, 결과 카드

### Stage 7: 배포 + QA
- Vercel 배포 (환경변수 설정)
- 친구 6명 테스트, 버그 수정 + 반응형 UI 다듬기

## 12. 사용자 작업 스타일 (중요)

- **완성된 파일** 위주로 작업 (스니펫이나 부분 패치보다)
- **단계별로 진행**하며 매 단계 확인 후 다음으로
- **여러 변경을 한 번에** 통합해서 진행 (점진적 반복보다)
- 실수 발견 시 **명시적으로 인정**하고 수정
- 변경은 **최소·집중적**으로 (불필요한 광범위 재작성 금지)

## 13. 참고: 사용자 배경

- 한국 초등학교 교사
- Google AppSheet, Google Apps Script, Supabase, Genspark 사용 경험
- 친구들과 월드컵 베팅하던 걸 디지털화하는 개인 프로젝트

## 14. 2026 월드컵 조 편성 (teams 템플릿 시드)

> 방 생성 시 아래 48팀을 `teams`에 삽입한다. (2026.6.11 개막 / Round of 32)

| 조 | 팀 (국기) |
|---|---|
| A | 멕시코 🇲🇽 · 남아공 🇿🇦 · 대한민국 🇰🇷 · 체코 🇨🇿 |
| B | 캐나다 🇨🇦 · 보스니아 🇧🇦 · 카타르 🇶🇦 · 스위스 🇨🇭 |
| C | 브라질 🇧🇷 · 모로코 🇲🇦 · 아이티 🇭🇹 · 스코틀랜드 🏴󠁧󠁢󠁳󠁣󠁴󠁿 |
| D | 미국 🇺🇸 · 파라과이 🇵🇾 · 호주 🇦🇺 · 튀르키예 🇹🇷 |
| E | 독일 🇩🇪 · 쿠라소 🇨🇼 · 코트디부아르 🇨🇮 · 에콰도르 🇪🇨 |
| F | 네덜란드 🇳🇱 · 일본 🇯🇵 · 스웨덴 🇸🇪 · 튀니지 🇹🇳 |
| G | 벨기에 🇧🇪 · 이집트 🇪🇬 · 이란 🇮🇷 · 뉴질랜드 🇳🇿 |
| H | 스페인 🇪🇸 · 카보베르데 🇨🇻 · 사우디아라비아 🇸🇦 · 우루과이 🇺🇾 |
| I | 프랑스 🇫🇷 · 세네갈 🇸🇳 · 이라크 🇮🇶 · 노르웨이 🇳🇴 |
| J | 아르헨티나 🇦🇷 · 알제리 🇩🇿 · 오스트리아 🇦🇹 · 요르단 🇯🇴 |
| K | 포르투갈 🇵🇹 · DR콩고 🇨🇩 · 우즈베키스탄 🇺🇿 · 콜롬비아 🇨🇴 |
| L | 잉글랜드 🏴󠁧󠁢󠁥󠁮󠁧󠁿 · 크로아티아 🇭🇷 · 가나 🇬🇭 · 파나마 🇵🇦 |

**진출 규칙**: 각 조 상위 2팀(24) + 3위 팀 중 성적 좋은 8팀 = 총 32팀이 Round of 32 진출.
